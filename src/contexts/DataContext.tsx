"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { CheckCircle2, XCircle, Info, Undo2 } from "lucide-react";
import {
  Player, Group, Session, AttendanceRecord, SkillAssessment,
  Announcement, PlayerBadge, Badge, ProgressReport, AppSettings,
  PaymentRecord,
} from "@/lib/types";
import {
  DEMO_PLAYERS, DEMO_GROUPS, DEMO_SESSIONS, DEMO_ATTENDANCE,
  DEMO_ASSESSMENTS, DEMO_ANNOUNCEMENTS, DEMO_PLAYER_BADGES,
  DEMO_PROGRESS_REPORTS, BADGE_DEFINITIONS, DEMO_PAYMENTS,
} from "@/lib/mockData";

const LS_KEY = "tennis_data_v1";

const DEFAULT_SETTINGS: AppSettings = {
  organization_name: "PhotogRalph Tennis Academy",
  primary_color: "#16a34a",
  locations: ["Main Court", "Court 2", "Court 3", "Indoor Facility"],
  consent_photo_text: "I consent to photos of my child being used for promotional purposes.",
  consent_video_text: "I consent to videos of my child being used for promotional purposes.",
  consent_medical_text: "I consent to emergency medical treatment if necessary.",
};

/* --------- DataContext talks to the API, falls back to localStorage --------- */

export interface DataState {
  players: Player[];
  groups: Group[];
  sessions: Session[];
  attendance: AttendanceRecord[];
  assessments: SkillAssessment[];
  announcements: Announcement[];
  playerBadges: PlayerBadge[];
  progressReports: ProgressReport[];
  settings: AppSettings;
  payments: Record<string, PaymentRecord>;
}

const DEFAULT_STATE: DataState = {
  players: DEMO_PLAYERS,
  groups: DEMO_GROUPS,
  sessions: DEMO_SESSIONS,
  attendance: DEMO_ATTENDANCE,
  assessments: DEMO_ASSESSMENTS,
  announcements: DEMO_ANNOUNCEMENTS,
  playerBadges: DEMO_PLAYER_BADGES,
  progressReports: DEMO_PROGRESS_REPORTS,
  settings: DEFAULT_SETTINGS,
  payments: DEMO_PAYMENTS,
};

// Try API, fall back to localStorage. Each collection is independent.
async function tryApi<T>(endpoint: string, fallback: T): Promise<{ data: T; usingApi: boolean }> {
  try {
    const res = await fetch(endpoint, { credentials: "include" });
    if (!res.ok) throw new Error(`API ${endpoint} returned ${res.status}`);
    const data = await res.json();
    return { data: extractData(data, fallback), usingApi: true };
  } catch {
    return { data: fallback, usingApi: false };
  }
}

function extractData<T>(apiResponse: any, fallback: T): T {
  // API responses wrap data in {players: [...]}, {sessions: [...]}, etc.
  // Heuristic: take the first array-valued key, or the first property value
  if (Array.isArray(apiResponse)) return apiResponse as any as T;
  if (apiResponse && typeof apiResponse === "object") {
    const keys = Object.keys(apiResponse);
    for (const k of keys) {
      const v = apiResponse[k];
      if (Array.isArray(v)) return v as any as T;
      if (v && typeof v === "object" && !Array.isArray(v)) return v as any as T;
    }
  }
  return fallback;
}

// Convert API camelCase payloads to snake_case to match the existing
// page code + mockData.ts shape. Without this, the production app shows
// "Cannot read properties of undefined" on any field accessed in snake_case
// (e.g. player.experience_level, player.first_name). Applied once at fetch
// time so pages don't need to change.
function camelToSnakeKey(k: string): string {
  // Skip keys that are already snake_case or all-lowercase (id, url, etc.)
  if (!/[A-Z]/.test(k)) return k;
  return k.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
}

function normalizeKeys<T = any>(value: any): T {
  if (Array.isArray(value)) return value.map(normalizeKeys) as any;
  if (value && typeof value === "object" && value.constructor === Object) {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      out[camelToSnakeKey(k)] = normalizeKeys(v);
    }
    return out as any;
  }
  return value;
}

function loadState(): DataState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return {
      players: parsed.players ?? DEFAULT_STATE.players,
      groups: parsed.groups ?? DEFAULT_STATE.groups,
      sessions: parsed.sessions ?? DEFAULT_STATE.sessions,
      attendance: parsed.attendance ?? DEFAULT_STATE.attendance,
      assessments: parsed.assessments ?? DEFAULT_STATE.assessments,
      announcements: parsed.announcements ?? DEFAULT_STATE.announcements,
      playerBadges: parsed.playerBadges ?? DEFAULT_STATE.playerBadges,
      progressReports: parsed.progressReports ?? DEFAULT_STATE.progressReports,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
      payments: parsed.payments ?? DEFAULT_STATE.payments,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(state: DataState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {}
}

/* ----------------- Toast system ----------------- */

interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "error" | "info";
  undo?: { label: string; onUndo: () => void };
}

interface ToastCtx {
  toasts: ToastMessage[];
  showToast: (message: string, type?: "success" | "error" | "info", undo?: ToastMessage["undo"]) => void;
  removeToast: (id: string) => void;
}

export interface DataActions {
  addPlayer: (player: Omit<Player, "id" | "created_at" | "updated_at">) => Promise<Player>;
  updatePlayer: (id: string, patch: Partial<Player>) => Promise<void>;
  deletePlayer: (id: string) => Promise<void>;
  addSession: (session: Omit<Session, "id" | "created_at">) => Promise<Session>;
  updateSession: (id: string, patch: Partial<Session>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  saveAttendance: (sessionId: string, records: Omit<AttendanceRecord, "id" | "created_at" | "session_id">[]) => Promise<void>;
  addAssessment: (assessment: Omit<SkillAssessment, "id" | "created_at">) => Promise<SkillAssessment>;
  deleteAssessment: (id: string) => Promise<void>;
  addAnnouncement: (announcement: Omit<Announcement, "id" | "sent_at" | "read_count">) => Promise<Announcement>;
  awardBadge: (badge: Omit<PlayerBadge, "id" | "awarded_at">) => Promise<PlayerBadge>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  addProgressReport: (report: Omit<ProgressReport, "id" | "created_at">) => Promise<ProgressReport>;
  addGroup: (group: Omit<Group, "id">) => Promise<Group>;
  deleteGroup: (id: string) => Promise<void>;
  updatePayment: (playerId: string, record: PaymentRecord) => Promise<void>;
  markPaymentPaid: (playerId: string, monthlyFee: number) => Promise<void>;
  resetToDefaults: () => void;
  refresh: () => Promise<void>;
}

const DataContext = createContext<(DataState & DataActions & ToastCtx) | null>(null);

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be inside DataProvider");
  return ctx;
}

function genId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function getNowIso() {
  return new Date().toISOString();
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DataState>(loadState);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [usingApi, setUsingApi] = useState(false);

  // Persist to localStorage on every change (also acts as cache when API is down)
  useEffect(() => { saveState(state); }, [state]);

  // Try to load from API on mount
  useEffect(() => {
    (async () => {
      // Quick auth check first
      let authenticated = false;
      try {
        const meRes = await fetch("/api/auth/me", { credentials: "include" });
        if (meRes.ok) {
          const me = await meRes.json();
          authenticated = !!me.user;
        }
      } catch {}

      if (!authenticated) {
        // Stay on localStorage data; do nothing
        return;
      }

      // User is logged in — fetch from API
      try {
        const [p, g, s, a, as, an, b, pay] = await Promise.all([
          fetch("/api/players", { credentials: "include" }).then((r) => r.json()).catch(() => ({})),
          fetch("/api/payments", { credentials: "include" }).then((r) => r.json()).catch(() => ({})),
          fetch("/api/sessions", { credentials: "include" }).then((r) => r.json()).catch(() => ({})),
          fetch("/api/attendance", { credentials: "include" }).then((r) => r.json()).catch(() => ({})),
          fetch("/api/assessments", { credentials: "include" }).then((r) => r.json()).catch(() => ({})),
          fetch("/api/announcements", { credentials: "include" }).then((r) => r.json()).catch(() => ({})),
          fetch("/api/badges", { credentials: "include" }).then((r) => r.json()).catch(() => ({})),
          fetch("/api/payments", { credentials: "include" }).then((r) => r.json()).catch(() => ({})),
        ]);
        // Only overwrite if we got data
        if (p?.players || s?.sessions) {
          setUsingApi(true);
          setState((prev) => ({
            ...prev,
            players: normalizeKeys(p?.players) || prev.players,
            sessions: normalizeKeys(s?.sessions) || prev.sessions,
            attendance: normalizeKeys(a?.records) || prev.attendance,
            assessments: normalizeKeys(as?.assessments) || prev.assessments,
            announcements: normalizeKeys(an?.announcements) || prev.announcements,
            playerBadges: normalizeKeys(b?.awarded) || prev.playerBadges,
            payments: normalizeKeys(pay?.payments) || prev.payments,
          }));
        }
      } catch {}
    })();
  }, []);

  // --- Toast helpers ---
  const showToast = useCallback(
    (message: string, type: ToastMessage["type"] = "info", undo?: ToastMessage["undo"]) => {
      const id = genId("toast");
      setToasts((prev) => [...prev, { id, message, type, undo }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, undo ? 6000 : 4000);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const restoreSnapshot = useCallback((snapshot: Partial<DataState>) => {
    setState((prev) => ({ ...prev, ...snapshot }));
  }, []);

  // --- Players ---
  const addPlayer = useCallback(async (player: Omit<Player, "id" | "created_at" | "updated_at">) => {
    const newPlayer: Player = {
      ...player,
      id: genId("player"),
      created_at: getNowIso(),
      updated_at: getNowIso(),
    } as Player;
    setState((prev) => ({ ...prev, players: [...prev.players, newPlayer] }));
    // Fire-and-forget API call
    fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(player),
    }).catch(() => {});
    showToast(`${newPlayer.first_name} ${newPlayer.last_name} added to roster`, "success");
    return newPlayer;
  }, [showToast]);

  const updatePlayer = useCallback(async (id: string, patch: Partial<Player>) => {
    setState((prev) => ({
      ...prev,
      players: prev.players.map((p) => (p.id === id ? { ...p, ...patch, updated_at: getNowIso() } : p)),
    }));
    showToast("Player updated", "success");
  }, [showToast]);

  const deletePlayer = useCallback(async (id: string) => {
    const snapshot = {
      players: state.players,
      attendance: state.attendance,
      assessments: state.assessments,
      playerBadges: state.playerBadges,
      progressReports: state.progressReports,
    };
    setState((prev) => ({
      ...prev,
      players: prev.players.filter((p) => p.id !== id),
      attendance: prev.attendance.filter((a) => a.player_id !== id),
      assessments: prev.assessments.filter((a) => a.player_id !== id),
      playerBadges: prev.playerBadges.filter((b) => b.player_id !== id),
      progressReports: prev.progressReports.filter((r) => r.player_id !== id),
    }));
    const player = state.players.find((p) => p.id === id);
    const name = player ? `${player.first_name} ${player.last_name}` : "Player";
    showToast(`${name} removed from roster`, "info", {
      label: "Undo",
      onUndo: () => restoreSnapshot(snapshot),
    });
  }, [showToast, state.players, state.attendance, state.assessments, state.playerBadges, state.progressReports, restoreSnapshot]);

  // --- Sessions ---
  const addSession = useCallback(async (session: Omit<Session, "id" | "created_at">) => {
    const newSession: Session = {
      ...session,
      id: genId("sess"),
      created_at: getNowIso(),
    } as Session;
    setState((prev) => ({ ...prev, sessions: [...prev.sessions, newSession] }));
    fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(session),
    }).catch(() => {});
    showToast(`Session "${newSession.title}" scheduled`, "success");
    return newSession;
  }, [showToast]);

  const updateSession = useCallback(async (id: string, patch: Partial<Session>) => {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
    showToast("Session updated", "success");
  }, [showToast]);

  const deleteSession = useCallback(async (id: string) => {
    const snapshot = { sessions: state.sessions, attendance: state.attendance };
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((s) => s.id !== id),
      attendance: prev.attendance.filter((a) => a.session_id !== id),
    }));
    showToast("Session deleted", "info", {
      label: "Undo",
      onUndo: () => restoreSnapshot(snapshot),
    });
  }, [showToast, state.sessions, state.attendance, restoreSnapshot]);

  // --- Attendance ---
  const saveAttendance = useCallback(async (sessionId: string, records: Omit<AttendanceRecord, "id" | "created_at" | "session_id">[]) => {
    setState((prev) => {
      const withoutExisting = prev.attendance.filter((a) => a.session_id !== sessionId);
      const newRecords: AttendanceRecord[] = records.map((r) => ({
        ...r,
        id: genId("att"),
        session_id: sessionId,
        created_at: getNowIso(),
      }));
      return { ...prev, attendance: [...withoutExisting, ...newRecords] };
    });
    fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ sessionId, records }),
    }).catch(() => {});
    showToast("Attendance saved", "success");
  }, [showToast]);

  // --- Assessments ---
  const addAssessment = useCallback(async (assessment: Omit<SkillAssessment, "id" | "created_at">) => {
    const newAssessment: SkillAssessment = {
      ...assessment,
      id: genId("assess"),
      created_at: getNowIso(),
    } as SkillAssessment;
    setState((prev) => ({ ...prev, assessments: [...prev.assessments, newAssessment] }));
    fetch("/api/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(assessment),
    }).catch(() => {});
    showToast("Assessment recorded", "success");
    return newAssessment;
  }, [showToast]);

  const deleteAssessment = useCallback(async (id: string) => {
    setState((prev) => ({ ...prev, assessments: prev.assessments.filter((a) => a.id !== id) }));
    showToast("Assessment deleted", "info");
  }, [showToast]);

  // --- Announcements ---
  const addAnnouncement = useCallback(async (announcement: Omit<Announcement, "id" | "sent_at" | "read_count">) => {
    const newAnn: Announcement = {
      ...announcement,
      id: genId("ann"),
      sent_at: getNowIso(),
      read_count: 0,
    };
    setState((prev) => ({ ...prev, announcements: [newAnn, ...prev.announcements] }));
    fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(announcement),
    }).catch(() => {});
    showToast("Announcement sent", "success");
    return newAnn;
  }, [showToast]);

  // --- Badges ---
  const awardBadge = useCallback(async (badge: Omit<PlayerBadge, "id" | "awarded_at">) => {
    const newBadge: PlayerBadge = {
      ...badge,
      id: genId("pb"),
      awarded_at: getNowIso(),
    };
    setState((prev) => ({ ...prev, playerBadges: [...prev.playerBadges, newBadge] }));
    fetch("/api/badges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(badge),
    }).catch(() => {});
    const def = BADGE_DEFINITIONS.find((b) => b.id === badge.badge_id);
    showToast(`${def?.name ?? "Badge"} awarded!`, "success");
    return newBadge;
  }, [showToast]);

  // --- Settings ---
  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
    showToast("Settings saved", "success");
  }, [showToast]);

  // --- Reports ---
  const addProgressReport = useCallback(async (report: Omit<ProgressReport, "id" | "created_at">) => {
    const newReport: ProgressReport = {
      ...report,
      id: genId("report"),
      created_at: getNowIso(),
    };
    setState((prev) => ({ ...prev, progressReports: [...prev.progressReports, newReport] }));
    showToast("Progress report created", "success");
    return newReport;
  }, [showToast]);

  // --- Groups ---
  const addGroup = useCallback(async (group: Omit<Group, "id">) => {
    const newGroup: Group = { ...group, id: genId("group") };
    setState((prev) => ({ ...prev, groups: [...prev.groups, newGroup] }));
    showToast(`Group "${newGroup.name}" created`, "success");
    return newGroup;
  }, [showToast]);

  const deleteGroup = useCallback(async (id: string) => {
    const snapshot = { groups: state.groups };
    setState((prev) => ({ ...prev, groups: prev.groups.filter((g) => g.id !== id) }));
    showToast("Group deleted", "info", {
      label: "Undo",
      onUndo: () => restoreSnapshot(snapshot),
    });
  }, [showToast, state.groups, restoreSnapshot]);

  // --- Payments ---
  const updatePayment = useCallback(async (playerId: string, record: PaymentRecord) => {
    setState((prev) => ({ ...prev, payments: { ...prev.payments, [playerId]: record } }));
    fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        playerId,
        monthlyFee: record.monthlyFee,
        paid: record.paid,
        lastPaidDate: record.lastPaidDate,
      }),
    }).catch(() => {});
  }, []);

  const markPaymentPaid = useCallback(async (playerId: string, monthlyFee: number) => {
    const today = new Date().toISOString().split("T")[0];
    setState((prev) => ({
      ...prev,
      payments: {
        ...prev.payments,
        [playerId]: { monthlyFee, paid: true, lastPaidDate: today },
      },
    }));
    fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ playerId, monthlyFee, paid: true, lastPaidDate: today }),
    }).catch(() => {});
    showToast("Payment marked as paid", "success");
  }, [showToast]);

  // --- Reset ---
  const resetToDefaults = useCallback(() => {
    setState(DEFAULT_STATE);
    showToast("All data reset to defaults", "info");
  }, [showToast]);

  const refresh = useCallback(async () => {
    // Re-fetch from API (no-op if not authenticated)
    try {
      const [p, s, a, as, an, b, pay] = await Promise.all([
        fetch("/api/players", { credentials: "include" }).then((r) => r.json()).catch(() => null),
        fetch("/api/sessions", { credentials: "include" }).then((r) => r.json()).catch(() => null),
        fetch("/api/attendance", { credentials: "include" }).then((r) => r.json()).catch(() => null),
        fetch("/api/assessments", { credentials: "include" }).then((r) => r.json()).catch(() => null),
        fetch("/api/announcements", { credentials: "include" }).then((r) => r.json()).catch(() => null),
        fetch("/api/badges", { credentials: "include" }).then((r) => r.json()).catch(() => null),
        fetch("/api/payments", { credentials: "include" }).then((r) => r.json()).catch(() => null),
      ]);
      if (p) setState((prev) => ({ ...prev, players: p.players || prev.players }));
    } catch {}
  }, []);

  const value = {
    ...state,
    addPlayer, updatePlayer, deletePlayer,
    addSession, updateSession, deleteSession,
    saveAttendance,
    addAssessment, deleteAssessment,
    addAnnouncement,
    awardBadge,
    updateSettings,
    addProgressReport,
    addGroup, deleteGroup,
    updatePayment, markPaymentPaid,
    resetToDefaults, refresh,
    toasts, showToast, removeToast,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => {
          const Icon = t.type === "success" ? CheckCircle2 : t.type === "error" ? XCircle : Info;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium flex items-center gap-2.5 min-w-[260px] max-w-md animate-in slide-in-from-bottom-2 fade-in duration-200 ${
                t.type === "success" ? "bg-emerald-600" : t.type === "error" ? "bg-red-600" : "bg-slate-800"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{t.message}</span>
              {t.undo && (
                <button
                  onClick={() => {
                    t.undo!.onUndo();
                    removeToast(t.id);
                  }}
                  className="ml-1 px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Undo2 className="w-3 h-3" /> {t.undo.label}
                </button>
              )}
              <button
                onClick={() => removeToast(t.id)}
                aria-label="Dismiss"
                className="ml-1 opacity-70 hover:opacity-100 text-lg leading-none"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </DataContext.Provider>
  );
}
