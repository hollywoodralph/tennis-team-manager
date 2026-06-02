// AI Practice Plan Generator
// Uses Ollama Cloud to produce a complete practice plan from a few inputs.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAuth, handleApiError } from "@/lib/api/helpers";
import { ollamaChatJSON } from "@/lib/ai/ollama";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min for AI generation

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

export async function POST(req: NextRequest) {
  // DEV-ONLY bypass: when ALLOW_DEV_PLAN=1, accept any caller as a "coach"
  // without a DB session. Used for testing the AI generator without
  // setting up a real backend. NEVER enable in production.
  let user: any = process.env.ALLOW_DEV_PLAN === "1" ? {
    id: "dev-user",
    email: "dev@local",
    fullName: "Dev User",
    role: "admin",
    tenantId: "dev-tenant",
  } : null;
  if (!user) {
    user = await requireAuth() as any;
    if (user instanceof NextResponse) return user;
  }
  if (process.env.ALLOW_DEV_PLAN !== "1" && user && (user.role === "parent" || user.role === "viewer")) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const { stage, ageRange, durationMinutes, numPlayers, courts, theme, energyLevel, title, savePlan } = parsed.data;

    // Calculate time budget per section
    const warmupMin = Math.round(durationMinutes * 0.15);
    const mainMin = Math.round(durationMinutes * 0.5);
    const gamesMin = Math.round(durationMinutes * 0.25);
    const cooldownMin = durationMinutes - warmupMin - mainMin - gamesMin;

    const stageInfo = STAGE_INFO[stage];
    const themeInfo = THEME_INFO[theme] || THEME_INFO.fundamentals;

    const systemPrompt = `You are an expert youth tennis coach with 20+ years of experience developing players ages 6-14. You design fun, engaging, age-appropriate practice sessions that focus on fundamentals while keeping kids moving and motivated. Your plans are specific, actionable, and include real coaching cues.

IMPORTANT: Output your JSON directly in the assistant message content. Do NOT wrap it in a "thinking" block or prefix it with analysis. Return ONLY the JSON object, with no prose before or after it.`;

    const userPrompt = `Design a ${durationMinutes}-minute tennis practice plan for ${numPlayers} players on ${courts} court(s).

STAGE: ${stage} - ${stageInfo}
THEME: ${theme} - ${themeInfo}
ENERGY LEVEL: ${energyLevel}
AGE RANGE: ${ageRange}

TIME BUDGET:
- Warm-up: ${warmupMin} minutes
- Main drills: ${mainMin} minutes
- Games: ${gamesMin} minutes
- Cool-down: ${cooldownMin} minutes

Return ONLY valid JSON in this exact structure (no markdown, no extra text):
{
  "title": "creative descriptive title (e.g. 'Rally Builders: Orange Ball Mastery')",
  "warmup": [
    {"name": "drill name", "duration": minutes, "description": "what the drill is", "coachingPoints": ["specific cue 1", "specific cue 2"]}
  ],
  "mainDrills": [...],
  "games": [...],
  "cooldown": [...],
  "equipmentList": ["specific item 1", "specific item 2"],
  "safetyNotes": "1-2 sentences about hydration, court awareness, etc.",
  "parentTakeaway": "1-2 sentences on what the kid should take home from this session"
}

Requirements:
- Each section should have 2-4 drills
- Each drill duration must add up correctly (warmup = ${warmupMin}min, main = ${mainMin}min, games = ${gamesMin}min, cooldown = ${cooldownMin}min)
- Drills must be age-appropriate for ${ageRange} and match ${stage} ball stage
- Use real, specific drills (not generic "do some forehands")
- Coaching points should be short imperatives ("Watch the ball", "Split step early", "Bend knees")
- Equipment list should only contain items the ${ageRange} kids can actually use`;

    const plan = await ollamaChatJSON<{
      title: string;
      warmup: any[];
      mainDrills: any[];
      games: any[];
      cooldown: any[];
      equipmentList: string[];
      safetyNotes: string;
      parentTakeaway: string;
    }>([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ], { temperature: 0.2, maxTokens: 6000 });

    const finalTitle = title || plan.title;

    if (savePlan && process.env.ALLOW_DEV_PLAN !== "1") {
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
        warmup: plan.warmup,
        mainDrills: plan.mainDrills,
        games: plan.games,
        cooldown: plan.cooldown,
        equipmentList: plan.equipmentList || [],
        safetyNotes: plan.safetyNotes,
        parentTakeaway: plan.parentTakeaway,
        generatedBy: "ollama-cloud",
        createdBy: user.id,
      }).returning();
      return NextResponse.json({ plan: row });
    }

    return NextResponse.json({ plan: { ...plan, title: finalTitle } });
  } catch (e: any) {
    console.error("Plan generation failed:", e);
    return NextResponse.json({ error: e?.message || "Plan generation failed" }, { status: 500 });
  }
}
