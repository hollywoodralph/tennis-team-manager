"use client";
import { useState } from "react";
import { DemoNav } from "@/components/layout/DemoNav";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import RouteGuard from "@/components/RouteGuard";
import {
 HeartHandshake,
  CalendarDays,
  FileText,
  Award,
  AlertTriangle,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { cn, stageBgClass, stageTextClass, formatDate } from "@/lib/utils";
import { BADGE_DEFINITIONS } from "@/lib/types";

export default function ParentPortalPage() {
  const { user } = useAuth();
  const { players, progressReports, playerBadges, sessions, updatePlayer } = useData();
  const childIds = user?.childIds || ["player-1"];
  const children = players.filter((p) => childIds.includes(p.id));

  const [activeChildId, setActiveChildId] = useState(childIds[0] || "");

  if (children.length === 0)
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">No child data available.</p>
      </div>
    );

  const activeChild = children.find((p) => p.id === activeChildId) || children[0];
  const reports = progressReports.filter((r) => r.player_id === activeChild.id);
  const badges = playerBadges.filter((pb) => pb.player_id === activeChild.id);
  const childSessions = sessions.filter((s) => s.group_id === activeChild.group_id);

  const toggleConsent = (field: "photo_consent" | "video_consent" | "participation_consent") => {
    if (!activeChild) return;
    updatePlayer(activeChild.id, { [field]: !activeChild[field] });
  };

  return (
    <RouteGuard allowedRoles={["parent", "admin", "coach"]} requireParentChild>
    <div className="min-h-screen bg-slate-50">
      <DemoNav />
      <main className="p-4 md:p-6 max-w-3xl mx-auto">
        {/* Child Tabs */}
        {children.length > 1 && (
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => setActiveChildId(child.id)}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap border",
                  activeChildId === child.id
                    ? "bg-tennis-600 text-white border-tennis-600"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                )}
              >
                {child.preferred_name || child.first_name} {child.last_name}
              </button>
            ))}
          </div>
        )}

        {/* Profile */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold",
                stageBgClass(activeChild.skill_stage),
                stageTextClass(activeChild.skill_stage)
              )}
            >
              {(activeChild.preferred_name || activeChild.first_name).slice(0, 2)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                {activeChild.preferred_name || activeChild.first_name} {activeChild.last_name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-medium border",
                    stageBgClass(activeChild.skill_stage),
                    stageTextClass(activeChild.skill_stage)
                  )}
                >
                  {activeChild.skill_stage}
                </span>
                <span className="text-xs text-slate-500">Age {activeChild.age}</span>
                <span className="text-xs text-slate-400">• {activeChild.status}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          {/* Upcoming Sessions */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="w-4 h-4 text-tennis-500" />
              <h3 className="text-sm font-semibold text-slate-700">Upcoming Sessions</h3>
            </div>
            {childSessions.length === 0 ? (
              <p className="text-xs text-slate-500">No upcoming sessions.</p>
            ) : (
              <div className="space-y-2">
                {childSessions
                  .filter((s) => s.date >= new Date().toISOString().split("T")[0])
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .slice(0, 3)
                  .map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-1 text-xs">
                      <span className="text-slate-700">{s.title}</span>
                      <span className="text-slate-400">{formatDate(s.date)} • {s.time_start}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Badges */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-slate-700">Badges</h3>
            </div>
            <div className="flex flex-wrap gap-1">
              {badges.map((b) => {
                const def = BADGE_DEFINITIONS.find((d) => d.id === b.badge_id);
                return (
                  <span
                    key={b.id}
                    className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] rounded-full border border-amber-100"
                  >
                    🏅 {def?.name || b.badge_id}
                  </span>
                );
              })}
              {badges.length === 0 && <p className="text-xs text-slate-500">No badges yet.</p>}
            </div>
          </div>
        </div>

        {/* Progress Reports */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-slate-700">Progress Reports</h3>
          </div>
          {reports.length === 0 ? (
            <p className="text-xs text-slate-500">No reports yet.</p>
          ) : (
            <div className="space-y-2">
              {reports.map((r) => (
                <div key={r.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50">
                  <p className="text-sm font-medium text-slate-800">{r.title}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatDate(r.period_start)} – {formatDate(r.period_end)}
                  </p>
                  <p className="text-xs text-slate-600 mt-2 line-clamp-2">{r.coach_comments}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Consent Editing */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <h3 className="text-sm font-semibold text-slate-700">Consent Status</h3>
          </div>
          <div className="space-y-2 text-xs">
            <ConsentToggle
              label="Photo Consent"
              enabled={activeChild.photo_consent}
              onToggle={() => toggleConsent("photo_consent")}
            />
            <ConsentToggle
              label="Video Consent"
              enabled={activeChild.video_consent}
              onToggle={() => toggleConsent("video_consent")}
            />
            <ConsentToggle
              label="Participation Consent"
              enabled={activeChild.participation_consent}
              onToggle={() => toggleConsent("participation_consent")}
            />
          </div>
        </div>
      </main>
    </div>
    </RouteGuard>
  );
}

function ConsentToggle({
  label,
  enabled,
  onToggle,
}: {
  label: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        {enabled ? (
          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
        ) : (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        )}
        <span className={cn("text-slate-700", enabled ? "" : "text-slate-500")}>{label}</span>
      </div>
      <button
        onClick={onToggle}
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors",
          enabled
            ? "bg-green-50 text-green-700 hover:bg-green-100"
            : "bg-slate-50 text-slate-600 hover:bg-slate-100"
        )}
      >
        {enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
        {enabled ? "Granted" : "Revoked"}
      </button>
    </div>
  );
}
