"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  Player, Group, Session, AttendanceRecord, SkillAssessment,
  Announcement, PlayerBadge, Badge, ProgressReport, AppSettings,
} from "@/lib/types";
import {
  DEMO_PLAYERS, DEMO_GROUPS, DEMO_SESSIONS, DEMO_ATTENDANCE,
  DEMO_ASSESSMENTS, DEMO_ANNOUNCEMENTS, DEMO_PLAYER_BADGES,
  DEMO_PROGRESS_REPORTS, BADGE_DEFINITIONS,
} from "@/lib/mockData";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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
}

export interface DataActions {
  /* Players */
  addPlayer: (player: Omit<Player, "id" | "created_at" | "updated_at">) => Player;
  updatePlayer: (id: string, patch: Partial<Player>) => void;
  deletePlayer: (id: string) => void;
  /* Sessions */
  addSession: (session: Omit<Session, "id" | "created_at">) => Session;
  updateSession: (id: string, patch: Partial<Session>) => void;
  deleteSession: (id: string) => void;
  /* Attendance */
  saveAttendance: (records: Omit<AttendanceRecord, "id" | "created_at">[]) => void;
  /* Assessments */
  addAssessment: (assessment: Omit<SkillAssessment, "id" | "created_at">) => SkillAssessment;
  deleteAssessment: (id: string) => void;
  /* Announcements */
  addAnnouncement: (announcement: Omit<Announcement, "id" | "sent_at" | "read_count">) => Announcement;
  /* Badges */
  awardBadge: (badge: Omit<PlayerBadge, "id" | "awarded_at">) => PlayerBadge;
  /* Settings */
  updateSettings: (patch: Partial<AppSettings>) => void;
  /* Reports */
  addProgressReport: (report: Omit<ProgressReport, "id" | "created_at">) => ProgressReport;
  /* Groups */
  addGroup: (group: Omit<Group, "id">) => Group;
  deleteGroup: (id: string) => void;
  /* Reset */
  resetToDefaults: () => void;
}

interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastCtx {
  toasts: ToastMessage[];
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  removeToast: (id: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const LS_KEY = "tennis_data_v1";

function genId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function getTodayIso() {
  return new Date().toISOString().split("T")[0];
}

function getNowIso() {
  return new Date().toISOString();
}

const DEFAULT_SETTINGS: AppSettings = {
  organization_name: "PhotogRalph Tennis Academy",
  primary_color: "#16a34a",
  locations: ["Main Court", "Court 2", "Court 3", "Indoor Facility"],
  consent_photo_text: "I consent to photos of my child being used for promotional purposes.",
  consent_video_text: "I consent to videos of my child being used for promotional purposes.",
  consent_medical_text: "I consent to emergency medical treatment if necessary.",
};

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
};

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
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(state: DataState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

/* ------------------------------------------------------------------ */
/*  Contexts                                                           */
/* ------------------------------------------------------------------ */

const DataContext = createContext<DataState & DataActions & ToastCtx | null>(null);

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be inside DataProvider");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DataState>(loadState);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  /* Persist on every change */
  useEffect(() => {
    saveState(state);
  }, [state]);

  /* Toast helpers */
  const showToast = useCallback((message: string, type: ToastMessage["type"] = "info") => {
    const id = genId("toast");
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /* --- Players --- */
  const addPlayer = useCallback((player: Omit<Player, "id" | "created_at" | "updated_at">) => {
    const newPlayer: Player = {
      ...player,
      id: genId("player"),
      created_at: getNowIso(),
      updated_at: getNowIso(),
    } as Player;
    setState((prev) => ({ ...prev, players: [...prev.players, newPlayer] }));
    showToast(`${newPlayer.first_name} ${newPlayer.last_name} added to roster`, "success");
    return newPlayer;
  }, [showToast]);

  const updatePlayer = useCallback((id: string, patch: Partial<Player>) => {
    setState((prev) => ({
      ...prev,
      players: prev.players.map((p) => (p.id === id ? { ...p, ...patch, updated_at: getNowIso() } : p)),
    }));
    showToast("Player updated", "success");
  }, [showToast]);

  const deletePlayer = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      players: prev.players.filter((p) => p.id !== id),
      attendance: prev.attendance.filter((a) => a.player_id !== id),
      assessments: prev.assessments.filter((a) => a.player_id !== id),
      playerBadges: prev.playerBadges.filter((b) => b.player_id !== id),
      progressReports: prev.progressReports.filter((r) => r.player_id !== id),
    }));
    showToast("Player removed from roster", "info");
  }, [showToast]);

  /* --- Sessions --- */
  const addSession = useCallback((session: Omit<Session, "id" | "created_at">) => {
    const newSession: Session = {
      ...session,
      id: genId("sess"),
      created_at: getNowIso(),
    } as Session;
    setState((prev) => ({ ...prev, sessions: [...prev.sessions, newSession] }));
    showToast(`Session "${newSession.title}" scheduled`, "success");
    return newSession;
  }, [showToast]);

  const updateSession = useCallback((id: string, patch: Partial<Session>) => {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
    showToast("Session updated", "success");
  }, [showToast]);

  const deleteSession = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((s) => s.id !== id),
      attendance: prev.attendance.filter((a) => a.session_id !== id),
    }));
    showToast("Session deleted", "info");
  }, [showToast]);

  /* --- Attendance --- */
  const saveAttendance = useCallback((records: Omit<AttendanceRecord, "id" | "created_at">[]) => {
    setState((prev) => {
      const withoutExisting = prev.attendance.filter(
        (a) => !records.some((r) => r.session_id === a.session_id && r.player_id === a.player_id)
      );
      const newRecords: AttendanceRecord[] = records.map((r) => ({
        ...r,
        id: genId("att"),
        created_at: getNowIso(),
      }));
      return { ...prev, attendance: [...withoutExisting, ...newRecords] };
    });
    showToast("Attendance saved", "success");
  }, [showToast]);

  /* --- Assessments --- */
  const addAssessment = useCallback((assessment: Omit<SkillAssessment, "id" | "created_at">) => {
    const newAssessment: SkillAssessment = {
      ...assessment,
      id: genId("assess"),
      created_at: getNowIso(),
    } as SkillAssessment;
    setState((prev) => ({ ...prev, assessments: [...prev.assessments, newAssessment] }));
    showToast("Assessment recorded", "success");
    return newAssessment;
  }, [showToast]);

  const deleteAssessment = useCallback((id: string) => {
    setState((prev) => ({ ...prev, assessments: prev.assessments.filter((a) => a.id !== id) }));
    showToast("Assessment deleted", "info");
  }, [showToast]);

  /* --- Announcements --- */
  const addAnnouncement = useCallback((announcement: Omit<Announcement, "id" | "sent_at" | "read_count">) => {
    const newAnn: Announcement = {
      ...announcement,
      id: genId("ann"),
      sent_at: getNowIso(),
      read_count: 0,
    };
    setState((prev) => ({ ...prev, announcements: [newAnn, ...prev.announcements] }));
    showToast("Announcement sent", "success");
    return newAnn;
  }, [showToast]);

  /* --- Badges --- */
  const awardBadge = useCallback((badge: Omit<PlayerBadge, "id" | "awarded_at">) => {
    const newBadge: PlayerBadge = {
      ...badge,
      id: genId("pb"),
      awarded_at: getNowIso(),
    };
    setState((prev) => ({ ...prev, playerBadges: [...prev.playerBadges, newBadge] }));
    const def = BADGE_DEFINITIONS.find((b) => b.id === badge.badge_id);
    showToast(`${def?.name ?? "Badge"} awarded!`, "success");
    return newBadge;
  }, [showToast]);

  /* --- Settings --- */
  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
    showToast("Settings saved", "success");
  }, [showToast]);

  /* --- Reports --- */
  const addProgressReport = useCallback((report: Omit<ProgressReport, "id" | "created_at">) => {
    const newReport: ProgressReport = {
      ...report,
      id: genId("report"),
      created_at: getNowIso(),
    };
    setState((prev) => ({ ...prev, progressReports: [...prev.progressReports, newReport] }));
    showToast("Progress report created", "success");
    return newReport;
  }, [showToast]);

  /* --- Groups --- */
  const addGroup = useCallback((group: Omit<Group, "id">) => {
    const newGroup: Group = { ...group, id: genId("group") };
    setState((prev) => ({ ...prev, groups: [...prev.groups, newGroup] }));
    showToast(`Group "${newGroup.name}" created`, "success");
    return newGroup;
  }, [showToast]);

  const deleteGroup = useCallback((id: string) => {
    setState((prev) => ({ ...prev, groups: prev.groups.filter((g) => g.id !== id) }));
    showToast("Group deleted", "info");
  }, [showToast]);

  /* --- Reset --- */
  const resetToDefaults = useCallback(() => {
    setState(DEFAULT_STATE);
    showToast("All data reset to defaults", "info");
  }, [showToast]);

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
    resetToDefaults,
    toasts, showToast, removeToast,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-white font-medium text-sm flex items-center gap-2 animate-in slide-in-from-bottom-2 ${
              t.type === "success" ? "bg-green-600" : t.type === "error" ? "bg-red-600" : "bg-slate-700"
            }`}
          >
            {t.type === "success" ? "✅" : t.type === "error" ? "❌" : "ℹ️"}
            {t.message}
            <button onClick={() => removeToast(t.id)} className="ml-2 opacity-70 hover:opacity-100">×</button>
          </div>
        ))}
      </div>
    </DataContext.Provider>
  );
}

