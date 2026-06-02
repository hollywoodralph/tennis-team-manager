// Auth: JWT-based session cookies with httpOnly + bcrypt password hashing
import "server-only";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { UserRole } from "@/contexts/AuthContext";

const COOKIE_NAME = "tennis_session";
const TTL_DAYS = 7;
const TTL = `${TTL_DAYS}d`;

function getSecret(): string {
  const fromEnv = process.env.AUTH_SECRET;
  if (fromEnv && fromEnv.length >= 32) return fromEnv;
  return "dev-secret-change-me-in-production-please-this-is-not-secure";
}

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(getSecret());
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  tenantId: string | null;
  childIds?: string[];
}

export interface SessionToken {
  sub: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
  fullName: string;
  exp: number;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function signSessionToken(user: AuthUser): Promise<string> {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    fullName: user.fullName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TTL)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionToken | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as SessionToken;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const c = await cookies();
  c.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * TTL_DAYS,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const c = await cookies();
  const token = c.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;

  let childIds: string[] | undefined;
  if (payload.role === "parent") {
    try {
      const db = getDb();
      const links = await db
        .select({ playerId: schema.playerGuardians.playerId })
        .from(schema.playerGuardians)
        .where(eq(schema.playerGuardians.userId, payload.sub));
      childIds = links.map((l) => l.playerId);
    } catch (err) {
      childIds = [];
    }
  }

  return {
    id: payload.sub,
    email: payload.email,
    fullName: payload.fullName,
    role: payload.role,
    tenantId: payload.tenantId,
    childIds,
  };
}

export async function findUserByEmail(email: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email.toLowerCase().trim()))
    .limit(1);
  return rows[0] ?? null;
}

export async function createUser(opts: {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  tenantId: string | null;
}) {
  const db = getDb();
  const passwordHash = await hashPassword(opts.password);
  const [user] = await db
    .insert(schema.users)
    .values({
      email: opts.email.toLowerCase().trim(),
      passwordHash,
      fullName: opts.fullName,
      role: opts.role,
      tenantId: opts.tenantId,
    })
    .returning();
  return user;
}
