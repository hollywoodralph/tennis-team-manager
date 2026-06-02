// Streaming AI Practice Plan Generator
// Uses Server-Sent Events so the coach sees sections appear as the model writes them.
// Output events:
//   { type: "status", stage: "thinking" | "warmup" | "main" | "games" | "cooldown" | "saving" | "done", message: "..." }
//   { type: "section", name: "warmup" | "mainDrills" | "games" | "cooldown", items: [...] }
//   { type: "meta", title, equipmentList, safetyNotes, parentTakeaway }
//   { type: "done", plan: {...} }
//   { type: "error", error: "..." }
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { requireAuth } from "@/lib/api/helpers";
import { ollamaChatStream } from "@/lib/ai/ollama";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const generateSchema = z.object({
  stage: z.enum(["red", "orange", "green", "yellow"]),
  ageRange: z.string().default("8-10"),
  durationMinutes: z.number().int().min(15).max(240).default(60),
  numPlayers: z.number().int().min(1).max(40).default(8),
  courts: z.number().int().min(1).max(10).default(1),
  theme: z.string().default("fundamentals"),
  energyLevel: z.enum(["low", "medium", "high"]).default("medium"),
  title: z.string().optional(),
  savePlan: z.boolean().default(true),
  // Optional refinement hint (free text from coach)
  refinement: z.string().optional(),
  // Optional previous plan (when refining) — passed back so the model has context
  previousPlan: z.object({
    title: z.string(),
    warmup: z.array(z.any()).optional(),
    mainDrills: z.array(z.any()).optional(),
    games: z.array(z.any()).optional(),
    cooldown: z.array(z.any()).optional(),
    equipmentList: z.array(z.string()).optional(),
    safetyNotes: z.string().optional(),
    parentTakeaway: z.string().optional(),
  }).optional(),
});

const STAGE_INFO: Record<string, string> = {
  red: "Ages 6-8. Focus on fun, coordination, basic contact, listening, simple rally, movement. Use red balls, mini nets, small courts.",
  orange: "Ages 8-10. Building rally skills, cooperative rallying, controlled strokes, court positioning, basic serve motion.",
  green: "Ages 10-12. Consistent rally, tactical awareness, directional control, point play, developing match skills.",
  yellow: "Ages 12+. Full-court play, serve consistency, match rules, scoring, strategy, mental toughness.",
};

const THEME_INFO: Record<string, string> = {
  fundamentals: "Core fundamentals: ready position, grip, forehand/backhand, footwork",
  serve: "Serve development: toss, contact point, full motion, placement",
  rally: "Rally skills: consistency, depth, direction, pace control",
  match_play: "Match play: scoring, tactics, pressure management, court coverage",
  movement: "Movement and footwork: split step, recovery, court coverage",
  volleys: "Net play: volleys, overheads, approach shots, transition game",
  doubles: "Doubles strategy: formations, communication, poaching, net play",
};

// Parse JSON incrementally: as soon as a section object is complete, emit it.
// We use a brace-counting scanner that tracks string state and emits the smallest
// unit (section array) as soon as it parses.
type ItemObj = { name: string; duration: number; description: string; coachingPoints: string[] };

interface PlanSoFar {
  title: string;
  warmup: ItemObj[];
  mainDrills: ItemObj[];
  games: ItemObj[];
  cooldown: ItemObj[];
  equipmentList: string[];
  safetyNotes: string;
  parentTakeaway: string;
}

function tryParseSectionItems(json: string, key: string): ItemObj[] | null {
  // Find `"key": [` then walk to the matching `]` at depth 0
  const needle = `"${key}":[`;
  const startIdx = json.indexOf(needle);
  if (startIdx === -1) return null;
  let i = startIdx + needle.length - 1; // point at the `[`
  let depth = 0;
  let inString = false;
  let escape = false;
  let endIdx = -1;
  for (; i < json.length; i++) {
    const c = json[i];
    if (escape) { escape = false; continue; }
    if (c === "\\") { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === "[") depth++;
    else if (c === "]") { depth--; if (depth === 0) { endIdx = i; break; } }
  }
  if (endIdx === -1) return null;
  const slice = json.slice(startIdx + needle.length - 1, endIdx + 1);
  try {
    return JSON.parse(slice);
  } catch {
    return null;
  }
}

function tryParseStringField(json: string, key: string): string | null {
  const re = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`);
  const m = json.match(re);
  return m ? m[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\") : null;
}

function tryParseEquipmentList(json: string): string[] | null {
  const re = /"equipmentList"\s*:\s*\[([\s\S]*?)\]/;
  const m = json.match(re);
  if (!m) return null;
  try {
    return JSON.parse("[" + m[1] + "]");
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  // Auth
  let user: any = process.env.ALLOW_DEV_PLAN === "1" ? {
    id: "dev-user", email: "dev@local", fullName: "Dev User",
    role: "admin", tenantId: "dev-tenant",
  } : null;
  if (!user) {
    user = await requireAuth() as any;
    if (user instanceof NextResponse) return user;
  }
  if (process.env.ALLOW_DEV_PLAN !== "1" && user && (user.role === "parent" || user.role === "viewer")) {
    return new Response("Not allowed", { status: 403 });
  }

  const body = await req.json();
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.message }), { status: 400 });
  }
  const { stage, ageRange, durationMinutes, numPlayers, courts, theme, energyLevel, title, savePlan, refinement, previousPlan } = parsed.data;

  const warmupMin = Math.round(durationMinutes * 0.15);
  const mainMin = Math.round(durationMinutes * 0.5);
  const gamesMin = Math.round(durationMinutes * 0.25);
  const cooldownMin = durationMinutes - warmupMin - mainMin - gamesMin;

  const stageInfo = STAGE_INFO[stage];
  const themeInfo = THEME_INFO[theme] || THEME_INFO.fundamentals;

  const systemPrompt = `You are an expert youth tennis coach with 20+ years of experience developing players ages 6-14.
You design fun, engaging, age-appropriate practice sessions that focus on fundamentals while keeping kids moving and motivated.
Your plans are specific, actionable, and include real coaching cues.
IMPORTANT: Output your JSON directly. No markdown. No prose before or after.`;

  let userPrompt = `Design a ${durationMinutes}-minute tennis practice plan for ${numPlayers} players on ${courts} court(s).
STAGE: ${stage} - ${stageInfo}
THEME: ${theme} - ${themeInfo}
ENERGY LEVEL: ${energyLevel}
AGE RANGE: ${ageRange}
TIME BUDGET:
- Warm-up: ${warmupMin} minutes
- Main drills: ${mainMin} minutes
- Games: ${gamesMin} minutes
- Cool-down: ${cooldownMin} minutes
Return ONLY valid JSON in this exact structure:
{
  "title": "creative descriptive title",
  "warmup": [{"name":"...","duration":5,"description":"...","coachingPoints":["...","..."]}],
  "mainDrills": [...],
  "games": [...],
  "cooldown": [...],
  "equipmentList": ["..."],
  "safetyNotes": "1-2 sentences",
  "parentTakeaway": "1-2 sentences"
}
Requirements: 2-4 drills per section, durations add up to time budget, age-appropriate, real specific drills, short imperative coaching cues.`;

  if (refinement) {
    if (previousPlan) {
      userPrompt += `\n\nThe coach is asking for a REFINED version of this previous plan:\n\`\`\`json\n${JSON.stringify(previousPlan, null, 2)}\n\`\`\`\n\nREFINEMENT INSTRUCTIONS from coach: ${refinement}\n\nApply these changes to produce an improved plan. Keep the same JSON structure. You can keep, modify, add, or remove drills as the refinement requires.`;
    } else {
      userPrompt += `\n\nREFINEMENT INSTRUCTIONS from coach: ${refinement}\nApply these changes to the plan while keeping the rest of the structure.`;
    }
  }

  // Set up SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {}
      };

      try {
        send({ type: "status", stage: "thinking", message: "AI coach is designing your plan..." });

        let accumulated = "";
        const emitted = { warmup: false, mainDrills: false, games: false, cooldown: false, equipment: false, safety: false, takeaway: false, title: false };

        for await (const chunk of ollamaChatStream([
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ], { temperature: 0.2, maxTokens: 6000 })) {
          accumulated += chunk;

          // Try to extract each section as soon as it's complete
          if (!emitted.title) {
            const t = tryParseStringField(accumulated, "title");
            if (t) { emitted.title = true; send({ type: "meta", field: "title", value: t }); }
          }
          if (!emitted.warmup) {
            const items = tryParseSectionItems(accumulated, "warmup");
            if (items && items.length > 0) {
              emitted.warmup = true;
              send({ type: "status", stage: "warmup", message: `Warm-up designed (${items.length} drills)` });
              send({ type: "section", name: "warmup", items });
            }
          }
          if (!emitted.mainDrills) {
            const items = tryParseSectionItems(accumulated, "mainDrills");
            if (items && items.length > 0) {
              emitted.mainDrills = true;
              send({ type: "status", stage: "main", message: `Main drills ready (${items.length} drills)` });
              send({ type: "section", name: "mainDrills", items });
            }
          }
          if (!emitted.games) {
            const items = tryParseSectionItems(accumulated, "games");
            if (items && items.length > 0) {
              emitted.games = true;
              send({ type: "status", stage: "games", message: `Games added (${items.length} games)` });
              send({ type: "section", name: "games", items });
            }
          }
          if (!emitted.cooldown) {
            const items = tryParseSectionItems(accumulated, "cooldown");
            if (items && items.length > 0) {
              emitted.cooldown = true;
              send({ type: "status", stage: "cooldown", message: `Cool-down complete (${items.length} drills)` });
              send({ type: "section", name: "cooldown", items });
            }
          }
          if (!emitted.equipment) {
            const items = tryParseEquipmentList(accumulated);
            if (items && items.length > 0) {
              emitted.equipment = true;
              send({ type: "meta", field: "equipmentList", value: items });
            }
          }
          if (!emitted.safety) {
            const v = tryParseStringField(accumulated, "safetyNotes");
            if (v) { emitted.safety = true; send({ type: "meta", field: "safetyNotes", value: v }); }
          }
          if (!emitted.takeaway) {
            const v = tryParseStringField(accumulated, "parentTakeaway");
            if (v) { emitted.takeaway = true; send({ type: "meta", field: "parentTakeaway", value: v }); }
          }
        }

        // Final parse of whole response for the saved plan
        let planJson: any = null;
        try {
          // Find balanced outer braces
          const start = accumulated.indexOf("{");
          if (start !== -1) {
            let depth = 0, inS = false, esc = false, end = -1;
            for (let i = start; i < accumulated.length; i++) {
              const c = accumulated[i];
              if (esc) { esc = false; continue; }
              if (c === "\\") { esc = true; continue; }
              if (c === '"') { inS = !inS; continue; }
              if (inS) continue;
              if (c === "{") depth++;
              else if (c === "}") { depth--; if (depth === 0) { end = i; break; } }
            }
            if (end !== -1) {
              planJson = JSON.parse(accumulated.slice(start, end + 1));
            }
          }
        } catch (e) {
          // ignore — we'll fall back to assembled data
        }

        if (!planJson) {
          // Reassemble from emitted events
          // (the client already has all sections; just send done with raw text)
          send({ type: "error", error: "AI output was incomplete. Try again with a shorter duration or simpler theme." });
          controller.close();
          return;
        }

        const finalTitle = title || planJson.title;

        // Save
        if (savePlan && process.env.ALLOW_DEV_PLAN !== "1") {
          try {
            send({ type: "status", stage: "saving", message: "Saving to your library..." });
            const db = getDb();
            const [row] = await db.insert(schema.practicePlans).values({
              tenantId: user.tenantId!,
              title: finalTitle,
              stage,
              ageRange,
              durationMinutes,
              numPlayers,
              courts,
              theme,
              energyLevel,
              warmup: planJson.warmup || [],
              mainDrills: planJson.mainDrills || [],
              games: planJson.games || [],
              cooldown: planJson.cooldown || [],
              equipmentList: planJson.equipmentList || [],
              safetyNotes: planJson.safetyNotes,
              parentTakeaway: planJson.parentTakeaway,
              generatedBy: "ollama-cloud",
              createdBy: user.id,
            }).returning();
            send({ type: "done", plan: { ...row, generatedBy: "ollama-cloud" }, model: process.env.OLLAMA_MODEL || "minimax-m3:cloud" });
          } catch (e: any) {
            send({ type: "done", plan: { ...planJson, title: finalTitle, stage, durationMinutes, generatedBy: "ollama-cloud" }, model: process.env.OLLAMA_MODEL || "minimax-m3:cloud", saveError: e.message });
          }
        } else {
          send({ type: "done", plan: { ...planJson, title: finalTitle, stage, durationMinutes, generatedBy: "ollama-cloud" }, model: process.env.OLLAMA_MODEL || "minimax-m3:cloud" });
        }

        controller.close();
      } catch (e: any) {
        send({ type: "error", error: e.message || "Generation failed" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
