import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAuth, handleApiError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

const attendanceSchema = z.object({
  sessionId: z.string(),
  records: z.array(z.object({
    playerId: z.string(),
    status: z.enum(["present", "absent", "late", "excused", "makeup_needed"]),
    notes: z.string().optional(),
    parentNotified: z.boolean().default(false),
  })),
});

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const playerId = searchParams.get("playerId");
    let where = eq(schema.attendance.tenantId, user.tenantId!);
    if (sessionId) where = and(where, eq(schema.attendance.sessionId, sessionId))!;
    if (playerId) where = and(where, eq(schema.attendance.playerId, playerId))!;
    const records = await db.query.attendance.findMany({ where });
    return NextResponse.json({ records });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  try {
    const body = await req.json();
    const parsed = attendanceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const db = getDb();

    // Delete existing records for this session, then insert new ones
    await db.delete(schema.attendance).where(eq(schema.attendance.sessionId, parsed.data.sessionId));

    const records = parsed.data.records.map((r) => ({
      tenantId: user.tenantId!,
      sessionId: parsed.data.sessionId,
      playerId: r.playerId,
      status: r.status,
      notes: r.notes,
      parentNotified: r.parentNotified,
      checkedInBy: user.id,
    }));
    const inserted = await db.insert(schema.attendance).values(records).returning();
    return NextResponse.json({ records: inserted }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
