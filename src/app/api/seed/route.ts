// Demo data seeding — POST /api/seed
// Creates a "demo" tenant with 4 users (admin/coach/parent/assistant), groups,
// players, sessions, assessments, badges, and payments.
//
// PRODUCTION SAFETY (added 2026-06-01):
//   - In production, requires either:
//     (a) header `x-seed-secret: $SEED_SECRET` (set in env), OR
//     (b) body `{ confirm: "I understand this will seed demo data" }`
//   - In development, runs freely for convenience.
//   - Always logs the request to stderr for audit.
import { NextRequest, NextResponse } from "next/server";
import { sql, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { hashPassword } from "@/lib/auth/session";
import { BADGE_DEFINITIONS } from "@/lib/types";

export const dynamic = "force-dynamic";

const SEED_CONFIRM_PHRASE = "I understand this will seed demo data";

function checkSeedAuth(req: NextRequest, body: any): { ok: boolean; reason?: string } {
  const isProduction = process.env.NODE_ENV === "production";
  if (!isProduction) return { ok: true };

  // Option A: shared secret header
  const expected = process.env.SEED_SECRET;
  if (expected) {
    const provided = req.headers.get("x-seed-secret");
    if (provided === expected) return { ok: true };
  }

  // Option B: explicit body confirmation phrase
  if (body?.confirm === SEED_CONFIRM_PHRASE) {
    return { ok: true };
  }

  return {
    ok: false,
    reason:
      "Seeding in production requires header `x-seed-secret: $SEED_SECRET` " +
      `or body { confirm: "${SEED_CONFIRM_PHRASE}" }.`,
  };
}

const DEMO_PASSWORD = "password";

const DEMO_USERS = [
  { email: "admin@photogralph.com", fullName: "Coach Ralph", role: "admin" as const },
  { email: "coach@photogralph.com", fullName: "Coach Sarah", role: "coach" as const },
  { email: "parent@photogralph.com", fullName: "Parent Maria", role: "parent" as const },
  { email: "assistant@photogralph.com", fullName: "Assistant Tom", role: "assistant" as const },
];

const STAGE_FEE_CENTS: Record<string, number> = { red: 4000, orange: 5000, green: 6000, yellow: 7000 };

const DEMO_PLAYERS = [
  { firstName: "Emma", lastName: "Johnson", preferredName: "Emma", dob: "2016-03-15", age: 10, stage: "orange" as const, exp: "developing" as const, allergies: "None", medical: "Mild asthma, inhaler in bag" },
  { firstName: "Lucas", lastName: "Martinez", preferredName: "Lucas", dob: "2015-07-22", age: 10, stage: "green" as const, exp: "developing" as const, allergies: "Peanuts", medical: "" },
  { firstName: "Sophia", lastName: "Chen", preferredName: "Sophie", dob: "2017-11-05", age: 8, stage: "red" as const, exp: "new_beginner" as const, allergies: "None", medical: "" },
  { firstName: "Oliver", lastName: "Williams", preferredName: "Ollie", dob: "2014-04-18", age: 12, stage: "yellow" as const, exp: "intermediate" as const, allergies: "None", medical: "Wears glasses during play" },
  { firstName: "Ava", lastName: "Garcia", preferredName: "Ava", dob: "2015-09-30", age: 10, stage: "green" as const, exp: "intermediate" as const, allergies: "None", medical: "" },
  { firstName: "Noah", lastName: "Brown", preferredName: "Noah", dob: "2016-12-08", age: 9, stage: "orange" as const, exp: "beginner" as const, allergies: "Bee stings", medical: "EpiPen for bee sting allergy in bag" },
  { firstName: "Mia", lastName: "Davis", preferredName: "Mia", dob: "2017-02-14", age: 9, stage: "red" as const, exp: "beginner" as const, allergies: "None", medical: "" },
  { firstName: "James", lastName: "Wilson", preferredName: "Jamie", dob: "2014-08-03", age: 11, stage: "yellow" as const, exp: "advanced_youth" as const, allergies: "None", medical: "" },
];

const DEMO_GROUPS = [
  { name: "Tiny Stars", ageRange: "6-8", stage: "red" as const, color: "#ef4444" },
  { name: "Orange Crushers", ageRange: "8-10", stage: "orange" as const, color: "#f97316" },
  { name: "Green Machine", ageRange: "10-12", stage: "green" as const, color: "#16a34a" },
  { name: "Yellow Jackets", ageRange: "12+", stage: "yellow" as const, color: "#eab308" },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const reset = body?.reset === true;

    // Production safety gate
    const auth = checkSeedAuth(req, body);
    if (!auth.ok) {
      console.warn(`[seed] blocked in production: ${req.headers.get("x-forwarded-for") || "unknown"}`);
      return NextResponse.json({ error: auth.reason }, { status: 403 });
    }

    console.log(`[seed] running (reset=${reset}, nodeEnv=${process.env.NODE_ENV})`);
    const db = getDb();

    // Check if demo tenant already exists
    const existing = await db
      .select()
      .from(schema.tenants)
      .where(sql`${schema.tenants.slug} = 'demo'`)
      .limit(1);

    if (existing[0] && !reset) {
      return NextResponse.json({
        ok: true,
        message: "Demo data already exists. Pass {reset: true} to wipe and reseed.",
        tenantId: existing[0].id,
      });
    }

    if (reset && existing[0]) {
      // Cascade delete tenant (cascades to users, players, etc.)
      await db.delete(schema.tenants).where(eq(schema.tenants.id, existing[0].id));
    }

    // 1. Create tenant
    const [tenant] = await db.insert(schema.tenants).values({
      name: "PhotogRalph Tennis Academy (Demo)",
      slug: "demo",
    }).returning();

    // 2. Create tenant settings
    await db.insert(schema.tenantSettings).values({
      tenantId: tenant.id,
      organizationName: "PhotogRalph Tennis Academy",
      primaryColor: "#16a34a",
      locations: ["Main Court", "Court 2", "Court 3", "Indoor Facility"],
      consentPhotoText: "I consent to photos of my child being used for promotional purposes.",
      consentVideoText: "I consent to videos of my child being used for promotional purposes.",
      consentMedicalText: "I consent to emergency medical treatment if necessary.",
    });

    // 3. Create users
    const passwordHash = await hashPassword(DEMO_PASSWORD);
    const createdUsers: Record<string, any> = {};
    for (const u of DEMO_USERS) {
      const [row] = await db.insert(schema.users).values({
        tenantId: tenant.id,
        email: u.email,
        passwordHash,
        fullName: u.fullName,
        role: u.role,
      }).returning();
      createdUsers[u.role] = row;
    }

    // 4. Create groups
    const createdGroups: Record<string, any> = {};
    for (const g of DEMO_GROUPS) {
      const [row] = await db.insert(schema.groups).values({
        tenantId: tenant.id,
        name: g.name,
        ageRange: g.ageRange,
        stage: g.stage,
        capacity: 10,
        color: g.color,
        defaultCoachId: createdUsers.coach.id,
      }).returning();
      createdGroups[g.stage] = row;
    }

    // 5. Create players + guardians + payments
    const createdPlayers: any[] = [];
    for (let i = 0; i < DEMO_PLAYERS.length; i++) {
      const p = DEMO_PLAYERS[i];
      const [player] = await db.insert(schema.players).values({
        tenantId: tenant.id,
        firstName: p.firstName,
        lastName: p.lastName,
        preferredName: p.preferredName,
        dateOfBirth: p.dob,
        age: p.age,
        skillStage: p.stage,
        experienceLevel: p.exp,
        dominantHand: i === 1 || i === 4 ? "left" : "right",
        status: "active" as const,
        groupId: createdGroups[p.stage].id,
        medicalNotes: p.medical || undefined,
        allergies: p.allergies,
        photoConsent: true,
        videoConsent: i !== 6,
        participationConsent: true,
        coachNotes: "",
        shirtSize: "Youth M",
        equipment: { racket: true, shoes: i > 2, waterBottle: true } as any,
      }).returning();
      createdPlayers.push(player);

      // Primary guardian
      await db.insert(schema.guardians).values({
        playerId: player.id,
        fullName: `${p.lastName} Parent`,
        email: `${p.firstName.toLowerCase()}.parent@example.com`,
        phone: `555-01${String(i).padStart(2, "0")}`,
        relationship: "mother",
        isPrimary: true,
        isEmergencyContact: true,
      });

      // Payments
      const paid = i % 3 !== 0;
      const lastPaidDate = paid
        ? new Date(Date.now() - (i + 1) * 7 * 86400000).toISOString().split("T")[0]
        : null;
      await db.insert(schema.payments).values({
        tenantId: tenant.id,
        playerId: player.id,
        monthlyFee: STAGE_FEE_CENTS[p.stage],
        paid,
        lastPaidDate,
      });
    }

    // 6. Sessions (today + tomorrow)
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    await db.insert(schema.sessions).values([
      {
        tenantId: tenant.id,
        title: "Saturday Morning Practice",
        date: today, timeStart: "09:00", timeEnd: "10:30",
        location: "Main Court", groupId: createdGroups.orange.id,
        coachIds: [createdUsers.coach.id], capacity: 10,
        status: "scheduled", theme: "rally", stageFocus: "orange",
      },
      {
        tenantId: tenant.id,
        title: "Red Ball Fun Hour",
        date: today, timeStart: "10:30", timeEnd: "11:30",
        location: "Court 2", groupId: createdGroups.red.id,
        coachIds: [createdUsers.coach.id], capacity: 8,
        status: "scheduled", theme: "movement", stageFocus: "red",
      },
      {
        tenantId: tenant.id,
        title: "Green Group Match Play",
        date: tomorrow, timeStart: "15:00", timeEnd: "16:30",
        location: "Main Court", groupId: createdGroups.green.id,
        coachIds: [createdUsers.coach.id], capacity: 10,
        status: "scheduled", theme: "match_play", stageFocus: "green",
      },
    ]);

    // 7. Attendance records for today
    const todaySessionId = (await db
      .select({ id: schema.sessions.id })
      .from(schema.sessions)
      .where(sql`${schema.sessions.tenantId} = ${tenant.id} AND ${schema.sessions.date} = ${today}`)
      .limit(1))[0]?.id;

    if (todaySessionId) {
      await db.insert(schema.attendance).values([
        { tenantId: tenant.id, sessionId: todaySessionId, playerId: createdPlayers[0].id, status: "present", parentNotified: false, checkedInBy: createdUsers.coach.id },
        { tenantId: tenant.id, sessionId: todaySessionId, playerId: createdPlayers[5].id, status: "present", parentNotified: false, checkedInBy: createdUsers.coach.id },
      ]);
    }

    // 8. Sample assessment
    await db.insert(schema.skillAssessments).values({
      tenantId: tenant.id,
      playerId: createdPlayers[0].id,
      coachId: createdUsers.coach.id,
      date: "2025-05-10",
      overallStageRecommendation: "orange",
      notes: "Continuing to develop rally skills. Backhand still needs work.",
      items: [
        { id: "i1", skillId: "forehand", rating: 3, notes: "Good form, consistent contact", evidence: "practice" },
        { id: "i2", skillId: "backhand", rating: 2, notes: "Unsure grip, pushes ball" },
        { id: "i3", skillId: "rally_ability", rating: 3, notes: "Can sustain 5-6 shot rally" },
        { id: "i4", skillId: "listening_participation", rating: 5, notes: "Excellent listener" },
        { id: "i5", skillId: "footwork", rating: 3, notes: "Good movement" },
      ],
    });

    // 9. Badge definitions
    for (const badge of BADGE_DEFINITIONS) {
      await db.insert(schema.badgeDefinitions).values(badge);
    }

    // 10. Sample badges awarded
    await db.insert(schema.playerBadges).values([
      { tenantId: tenant.id, playerId: createdPlayers[0].id, badgeId: "first-rally", awardedBy: createdUsers.coach.id },
      { tenantId: tenant.id, playerId: createdPlayers[0].id, badgeId: "great-listener", awardedBy: createdUsers.coach.id },
      { tenantId: tenant.id, playerId: createdPlayers[0].id, badgeId: "forehand-builder", awardedBy: createdUsers.coach.id },
    ]);

    // 11. Announcements
    await db.insert(schema.announcements).values([
      { tenantId: tenant.id, title: "Summer Camp Registration Open!", content: "Registration for August tennis camp is now open. Spaces limited.", audience: "all", sentBy: createdUsers.admin.id },
      { tenantId: tenant.id, title: "Saturday Practice Location Change", content: "Saturday practice will be on Court 3 instead of Main Court.", audience: "all", sentBy: createdUsers.coach.id },
      { tenantId: tenant.id, title: "Water Bottle Reminder", content: "Please remind your child to bring a water bottle to every practice.", audience: "parent", sentBy: createdUsers.coach.id },
    ]);

    // 12. Link parent user to their child
    await db.insert(schema.playerGuardians).values({
      playerId: createdPlayers[0].id, // Emma
      userId: createdUsers.parent.id,
      relationship: "mother",
      isPrimary: true,
    });
    await db.insert(schema.playerGuardians).values({
      playerId: createdPlayers[1].id, // Lucas
      userId: createdUsers.parent.id,
      relationship: "mother",
      isPrimary: false,
    });

    return NextResponse.json({
      ok: true,
      message: "Demo data seeded",
      tenantId: tenant.id,
      credentials: { email: DEMO_USERS.map((u) => u.email), password: DEMO_PASSWORD },
    });
  } catch (e: any) {
    console.error("Seed failed:", e);
    return NextResponse.json({ error: e?.message || "Seed failed" }, { status: 500 });
  }
}
