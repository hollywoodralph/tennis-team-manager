import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAuth, handleApiError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

const assessmentSchema = z.object({
  playerId: z.string(),
  date: z.string(),
  overallStageRecommendation: z.enum(["red", "orange", "green", "yellow"]).optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    skillId: z.string(),
    rating: z.number().min(0).max(5),
    notes: z.string().optional(),
    evidence: z.string().optional(),
    recommendedDrill: z.string().optional(),
  })).min(1),
});

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get("playerId");
    let where = eq(schema.skillAssessments.tenantId, user.tenantId!);
    if (playerId) where = and(where, eq(schema.skillAssessments.playerId, playerId))!;
    const items = await db.query.skillAssessments.findMany({
      where,
      orderBy: [desc(schema.skillAssessments.date)],
    });
    return NextResponse.json({ assessments: items });
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
    const parsed = assessmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const db = getDb();
    const [row] = await db.insert(schema.skillAssessments).values({
      tenantId: user.tenantId!,
      playerId: parsed.data.playerId,
      coachId: user.id,
      date: parsed.data.date,
      overallStageRecommendation: parsed.data.overallStageRecommendation,
      notes: parsed.data.notes,
      items: parsed.data.items.map((it, i) => ({ ...it, id: `item-${Date.now()}-${i}` })),
    }).returning();
    return NextResponse.json({ assessment: row }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
