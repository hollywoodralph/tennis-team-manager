import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAuth, handleApiError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

const planItemSchema = z.object({
  name: z.string(),
  duration: z.number(),
  description: z.string(),
  coachingPoints: z.array(z.string()).default([]),
});

const createPlanSchema = z.object({
  title: z.string().min(1),
  stage: z.enum(["red", "orange", "green", "yellow"]),
  ageRange: z.string().optional(),
  durationMinutes: z.number().int().min(15).max(240),
  numPlayers: z.number().int().default(8),
  courts: z.number().int().default(1),
  theme: z.string().optional(),
  energyLevel: z.enum(["low", "medium", "high"]).default("medium"),
  warmup: z.array(planItemSchema).default([]),
  mainDrills: z.array(planItemSchema).default([]),
  games: z.array(planItemSchema).default([]),
  cooldown: z.array(planItemSchema).default([]),
  equipmentList: z.array(z.string()).default([]),
  safetyNotes: z.string().optional(),
  parentTakeaway: z.string().optional(),
  generatedBy: z.string().default("manual"),
});

export async function GET() {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  try {
    const db = getDb();
    const plans = await db.query.practicePlans.findMany({
      where: eq(schema.practicePlans.tenantId, user.tenantId!),
      orderBy: [desc(schema.practicePlans.createdAt)],
    });
    return NextResponse.json({ plans });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  if (user.role === "parent" || user.role === "viewer") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const parsed = createPlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const db = getDb();
    const [row] = await db.insert(schema.practicePlans).values({
      tenantId: user.tenantId!,
      ...parsed.data,
      createdBy: user.id,
    }).returning();
    return NextResponse.json({ plan: row }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
