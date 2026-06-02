"use client";
import { DemoNav } from "@/components/layout/DemoNav";
import { useData } from "@/contexts/DataContext";
import RouteGuard from "@/components/RouteGuard";
import { EmptyState } from "@/components/EmptyState";
import { SKILL_DEFINITIONS } from "@/lib/types";
import { ClipboardList, Star, ChevronRight, Plus, TrendingUp } from "lucide-react";
import Link from "next/link";
import { cn, stageBgClass, stageTextClass, initials } from "@/lib/utils";

const STAGE_AVATAR: Record<string, string> = {
  red: "bg-red-100 text-red-700",
  orange: "bg-orange-100 text-orange-700",
  green: "bg-tennis-100 text-tennis-700",
  yellow: "bg-yellow-100 text-yellow-700",
};

export default function AssessmentsPage() {
  const { assessments, players } = useData();

  const recentAverage =
    assessments.length > 0
      ? assessments
          .map((a) => a.items.reduce((s, i) => s + i.rating, 0) / (a.items.length || 1))
          .reduce((s, v) => s + v, 0) / assessments.length
      : 0;

  return (
    <RouteGuard allowedRoles={["admin", "coach", "assistant", "parent"]}>
      <div className="min-h-screen bg-slate-50">
        <DemoNav />
        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Skill Assessments</h1>
              <p className="text-sm text-slate-500">
                Track player development across 16 skills using a 1–5 rubric
              </p>
            </div>
            <Link
              href="/assessments/new"
              className="flex items-center gap-1.5 px-3 py-2 bg-tennis-600 text-white rounded-lg text-xs font-medium hover:bg-tennis-700 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> New Assessment
            </Link>
          </div>

          {/* Quick stats */}
          {assessments.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Total</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{assessments.length}</p>
                <p className="text-[11px] text-slate-400">assessments recorded</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Avg Score</p>
                <p className="text-2xl font-bold text-tennis-600 mt-1">{recentAverage.toFixed(1)}<span className="text-sm text-slate-400">/5</span></p>
                <p className="text-[11px] text-slate-400">across all assessments</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                <p className="text-xs text-slate-500 uppercase font-semibold tracking-wide">Players</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">
                  {new Set(assessments.map((a) => a.player_id)).size}
                </p>
                <p className="text-[11px] text-slate-400">with at least one</p>
              </div>
            </div>
          )}

          {/* Skill definitions */}
          <details className="bg-white rounded-xl border border-slate-100 shadow-sm mb-4 group">
            <summary className="cursor-pointer p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-700">The 16-skill rubric</h3>
                <p className="text-xs text-slate-500 mt-0.5">Click to see all skills and categories</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform" />
            </summary>
            <div className="px-4 pb-4">
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                {SKILL_DEFINITIONS.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <ClipboardList className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-slate-700">{skill.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {skill.category} • {skill.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </details>

          {/* Recent Assessments */}
          {assessments.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No assessments yet"
              description="Record your first assessment to start tracking player development over time."
              action={
                <Link
                  href="/assessments/new"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-tennis-600 text-white rounded-lg text-sm font-medium hover:bg-tennis-700"
                >
                  <Plus className="w-4 h-4" /> First Assessment
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {assessments.map((a) => {
                const player = players.find((p) => p.id === a.player_id);
                const avg = a.items.reduce((s, i) => s + i.rating, 0) / (a.items.length || 1);
                return (
                  <div
                    key={a.id}
                    className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm",
                            STAGE_AVATAR[player?.skill_stage || ""] || "bg-slate-100 text-slate-600"
                          )}
                        >
                          {initials((player?.preferred_name || player?.first_name || "?") + " " + (player?.last_name || ""))}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 text-sm">
                            {player?.preferred_name || player?.first_name} {player?.last_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {a.date} • Avg {avg.toFixed(1)}/5
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {a.overall_stage_recommendation && (
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize",
                              stageBgClass(a.overall_stage_recommendation),
                              stageTextClass(a.overall_stage_recommendation)
                            )}
                          >
                            Rec: {a.overall_stage_recommendation}
                          </span>
                        )}
                        <Link
                          href={`/assessments/${a.id}`}
                          className="text-slate-300 hover:text-tennis-600 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {a.items.slice(0, 6).map((item) => {
                        const skill = SKILL_DEFINITIONS.find((s) => s.id === item.skill_id);
                        return (
                          <span
                            key={item.id}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-100 rounded-md text-xs"
                          >
                            <span className="text-slate-600">{skill?.name}</span>
                            <span className="font-bold text-slate-800">{item.rating}</span>
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          </span>
                        );
                      })}
                      {a.items.length > 6 && (
                        <span className="px-2 py-1 text-[10px] text-slate-400">
                          +{a.items.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </RouteGuard>
  );
}
