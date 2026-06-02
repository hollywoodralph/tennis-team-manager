import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAuth, handleApiError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  playerId: z.string(),
  monthlyFee: z.number().int().min(0),
  paid: z.boolean(),
  lastPaidDate: z.string().nullable().optional(),
});

export async function GET() {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  try {
    const db = getDb();
    const records = await db.query.payments.findMany({
      where: eq(schema.payments.tenantId, user.tenantId!),
    });
    // Convert to keyed map for client convenience
    const map: Record<string, any> = {};
    for (const r of records) {
      map[r.playerId] = {
        monthlyFee: r.monthlyFee / 100,
        paid: r.paid,
        lastPaidDate: r.lastPaidDate,
      };
    }
    return NextResponse.json({ payments: map });
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
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const db = getDb();
    await db
      .update(schema.payments)
      .set({
        monthlyFee: parsed.data.monthlyFee * 100,
        paid: parsed.data.paid,
        lastPaidDate: parsed.data.paid ? (parsed.data.lastPaidDate || new Date().toISOString().split("T")[0]) : parsed.data.lastPaidDate,
        updatedAt: new Date(),
      })
      .where(eq(schema.payments.playerId, parsed.data.playerId));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
