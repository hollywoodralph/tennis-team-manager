import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { requireAuth, handleApiError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const stage = searchParams.get("stage");
    const status = searchParams.get("status");

    let where = eq(schema.players.tenantId, user.tenantId!);
    if (stage) where = and(where, eq(schema.players.skillStage, stage as any))!;
    if (status) where = and(where, eq(schema.players.status, status as any))!;

    const players = await db.query.players.findMany({
      where,
      orderBy: [desc(schema.players.createdAt)],
    });
    return NextResponse.json({ players });
  } catch (e) {
    return handleApiError(e);
  }
}

const playerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  preferredName: z.string().optional(),
  dateOfBirth: z.string(),
  age: z.number().int(),
  skillStage: z.enum(["red", "orange", "green", "yellow"]),
  experienceLevel: z.string().default("new_beginner"),
  dominantHand: z.enum(["right", "left", "both"]).default("right"),
  status: z.enum(["active", "paused", "archived"]).default("active"),
  groupId: z.string().optional().nullable(),
  medicalNotes: z.string().optional(),
  allergies: z.string().optional(),
  photoConsent: z.boolean().default(false),
  videoConsent: z.boolean().default(false),
  participationConsent: z.boolean().default(false),
  coachNotes: z.string().default(""),
  shirtSize: z.string().optional(),
  equipment: z.object({
    racket: z.boolean().optional(),
    shoes: z.boolean().optional(),
    water_bottle: z.boolean().optional(),
  }).default({}),
  guardians: z.array(z.object({
    fullName: z.string(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    relationship: z.string().optional(),
    isPrimary: z.boolean().default(false),
    isEmergencyContact: z.boolean().default(false),
  })).default([]),
});

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  if (user.role === "parent" || user.role === "viewer") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const parsed = playerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const db = getDb();
    const [player] = await db.insert(schema.players).values({
      tenantId: user.tenantId!,
      ...parsed.data,
    }).returning();

    if (parsed.data.guardians.length > 0) {
      await db.insert(schema.guardians).values(
        parsed.data.guardians.map((g) => ({ ...g, playerId: player.id }))
      );
    }

    // Auto-create payment record
    const stageFeeCents: Record<string, number> = { red: 4000, orange: 5000, green: 6000, yellow: 7000 };
    await db.insert(schema.payments).values({
      tenantId: user.tenantId!,
      playerId: player.id,
      monthlyFee: stageFeeCents[parsed.data.skillStage] || 5000,
      paid: false,
    });

    return NextResponse.json({ player }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
