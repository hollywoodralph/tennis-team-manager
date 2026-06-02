import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, gte, desc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAuth, handleApiError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

const sessionSchema = z.object({
  title: z.string().min(1),
  date: z.string(),
  timeStart: z.string(),
  timeEnd: z.string(),
  location: z.string(),
  groupId: z.string().optional().nullable(),
  coachIds: z.array(z.string()).default([]),
  capacity: z.number().int().default(20),
  notes: z.string().optional(),
  equipmentNeeded: z.array(z.string()).default([]),
  theme: z.string().optional(),
  stageFocus: z.enum(["red", "orange", "green", "yellow"]).optional(),
  status: z.enum(["scheduled", "confirmed", "cancelled", "rescheduled", "completed"]).default("scheduled"),
});

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const upcoming = searchParams.get("upcoming") === "1";
    const groupId = searchParams.get("groupId");

    let where = eq(schema.sessions.tenantId, user.tenantId!);
    if (date) where = and(where, eq(schema.sessions.date, date))!;
    if (upcoming) where = and(where, gte(schema.sessions.date, new Date().toISOString().split("T")[0]))!;
    if (groupId) where = and(where, eq(schema.sessions.groupId, groupId))!;

    const sessions = await db.query.sessions.findMany({
      where,
      orderBy: [schema.sessions.date, schema.sessions.timeStart],
    });
    return NextResponse.json({ sessions });
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
    const parsed = sessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const db = getDb();
    const [session] = await db.insert(schema.sessions).values({
      tenantId: user.tenantId!,
      ...parsed.data,
    }).returning();
    return NextResponse.json({ session }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
