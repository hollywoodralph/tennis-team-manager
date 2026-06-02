import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAuth, handleApiError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

const awardSchema = z.object({
  playerId: z.string(),
  badgeId: z.string(),
  notes: z.string().optional(),
});

export async function GET() {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  try {
    const db = getDb();
    const definitions = await db.select().from(schema.badgeDefinitions);
    const awarded = await db.query.playerBadges.findMany({
      where: eq(schema.playerBadges.tenantId, user.tenantId!),
      orderBy: [desc(schema.playerBadges.awardedAt)],
    });
    return NextResponse.json({ definitions, awarded });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  if (user.role !== "admin" && user.role !== "coach") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const parsed = awardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const db = getDb();
    const [row] = await db.insert(schema.playerBadges).values({
      tenantId: user.tenantId!,
      playerId: parsed.data.playerId,
      badgeId: parsed.data.badgeId,
      awardedBy: user.id,
      notes: parsed.data.notes,
    }).returning();
    return NextResponse.json({ badge: row }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
