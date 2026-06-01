"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type UserRole = "admin" | "coach" | "parent" | "assistant" | "viewer";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  phone?: string;
  // For parents, which children they can access
  child_ids?: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isDevMode: boolean;
  login: (email: string, password: string, mode?: "live" | "demo") => Promise<{ error?: string }>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType>(undefined as any);

const DEMO_USERS: Record<string, AuthUser> = {
  "admin@photogralph.com": {
    id: "admin-1",
    email: "admin@photogralph.com",
    full_name: "Coach Ralph",
    role: "admin",
  },
  "coach@photogralph.com": {
    id: "coach-1",
    email: "coach@photogralph.com",
    full_name: "Coach Sarah",
    role: "coach",
  },
  "parent@photogralph.com": {
    id: "parent-1",
    email: "parent@photogralph.com",
    full_name: "Parent Maria",
    role: "parent",
    child_ids: ["player-1", "player-2"],
  },
  "assistant@photogralph.com": {
    id: "assistant-1",
    email: "assistant@photogralph.com",
    full_name: "Assistant Tom",
    role: "assistant",
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(true);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("tennis_auth_user") : null;
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {}
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, mode?: "live" | "demo") => {
    const lowerEmail = email.toLowerCase().trim();
    if (mode === "demo" || isDevMode) {
      const demoUser = DEMO_USERS[lowerEmail];
      if (demoUser) {
        const safeUser = { ...demoUser };
        setUser(safeUser);
        setIsDevMode(true);
        localStorage.setItem("tennis_auth_user", JSON.stringify(safeUser));
        return {};
      }
      // Allow any email in demo with a default user
      const fallback: AuthUser = {
        id: `user-${Date.now()}`,
        email: lowerEmail,
        full_name: lowerEmail.split("@")[0] || "User",
        role: "parent",
        child_ids: ["player-1"],
      };
      setUser(fallback);
      setIsDevMode(true);
      localStorage.setItem("tennis_auth_user", JSON.stringify(fallback));
      return {};
    }
    // In a real app, this would call Supabase auth
    return { error: "Supabase auth not configured. Use demo mode." };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("tennis_auth_user");
  };

  const switchRole = (role: UserRole) => {
    if (user) {
      const updated = { ...user, role };
      setUser(updated);
      localStorage.setItem("tennis_auth_user", JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isDevMode, login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
