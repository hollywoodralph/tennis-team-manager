// Shared API helpers: auth gate, JSON helpers, error responses
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, AuthUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function requireAuth(): Promise<AuthUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return user;
}

export async function requireTenant(): Promise<AuthUser | NextResponse> {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!user.tenantId) {
    return NextResponse.json({ error: "No tenant context" }, { status: 403 });
  }
  return user;
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(e: any) {
  console.error("API error:", e);
  return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 });
}
