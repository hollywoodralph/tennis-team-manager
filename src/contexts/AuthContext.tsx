"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export type UserRole = "admin" | "coach" | "parent" | "assistant" | "viewer";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  tenantId: string | null;
  childIds?: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (opts: { email: string; password: string; fullName: string; role: UserRole; organizationName?: string }) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>(undefined as any);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from /api/auth/me on mount (or dev user if bypass is enabled)
  useEffect(() => {
    const devMode = process.env.NEXT_PUBLIC_ALLOW_DEV_AUTH === "1";
    if (devMode) {
      // Pick which dev user to be (coach or parent), based on a query param so the same
      // browser can switch roles for testing. Defaults to coach.
      const params = new URLSearchParams(window.location.search);
      const who = params.get("as") || "coach";
      const devUser: AuthUser = {
        id: `dev-${who}`,
        email: `${who}@dev.local`,
        fullName: who === "coach" ? "Coach Ralph" : who === "parent" ? "Parent Mia" : "Dev Admin",
        role: who as any,
        tenantId: "dev-tenant",
        childIds: who === "parent" ? ["dev-player-1"] : [],
      };
      setUser(devUser);
      setIsLoading(false);
      return;
    }
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user ?? null);
      })
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || "Login failed" };
    setUser(data.user);
    return {};
  }, []);

  const signup = useCallback(async (opts: { email: string; password: string; fullName: string; role: UserRole; organizationName?: string }) => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(opts),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || "Signup failed" };
    setUser(data.user);
    return {};
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
