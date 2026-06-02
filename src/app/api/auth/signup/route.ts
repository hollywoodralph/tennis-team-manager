import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { hashPassword, signSessionToken, setSessionCookie } from "@/lib/auth/session";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  role: z.enum(["admin", "coach", "parent", "assistant"]).default("parent"),
  organizationName: z.string().optional(), // If creating a new tenant
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const { email, password, fullName, role, organizationName } = parsed.data;

    const db = getDb();
    const existing = await db
      .select()
      .from(schema.users)
      .where(sql`${schema.users.email} = ${email.toLowerCase().trim()}`)
      .limit(1);
    if (existing[0]) {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }

    // Create tenant if not provided (for first-time coaches/admins)
    let tenantId: string | null = null;
    if (role !== "parent" || organizationName) {
      const slug = (organizationName || fullName + "'s Academy")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80) + "-" + Math.random().toString(36).slice(2, 6);
      const [tenant] = await db
        .insert(schema.tenants)
        .values({ name: organizationName || `${fullName}'s Academy`, slug })
        .returning();
      tenantId = tenant.id;
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(schema.users)
      .values({
        email: email.toLowerCase().trim(),
        passwordHash,
        fullName,
        role,
        tenantId,
      })
      .returning();

    // Seed default tenant settings
    if (tenantId) {
      await db.insert(schema.tenantSettings).values({
        tenantId,
        organizationName: organizationName || `${fullName}'s Academy`,
        locations: ["Main Court"],
      });
    }

    const token = await signSessionToken({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as any,
      tenantId: user.tenantId,
    });
    await setSessionCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        tenantId: user.tenantId,
      },
    });
  } catch (err: any) {
    console.error("Signup error:", err);
    return NextResponse.json({ error: err.message || "Signup failed" }, { status: 500 });
  }
}
