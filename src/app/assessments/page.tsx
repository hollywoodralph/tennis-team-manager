"use client";
import { DemoNav } from "@/components/layout/DemoNav";
import { useData } from "@/contexts/DataContext";
import RouteGuard from "@/components/RouteGuard";
import { SKILL_DEFINITIONS, STAGE_INFO } from "@/lib/types";
import { ClipboardList, Star, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn, stageBgClass, stageTextClass } from "@/lib/utils";

export default function AssessmentsPage() {
  const { assessments, players } = useData();

  return (
    <RouteGuard allowedRoles={["admin", "coach", "assistant", "parent"]}>
    <div className="min-h-screen bg-slate-50">
      <DemoNav />
      <main className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Skill Assessments</h1>
            <p className="text-sm text-slate-500">Track player development with 16-point rubric</p>
          </div>
          <Link href="/assessments/new" className="px-3 py-2 bg-tennis-600 text-white rounded-lg text-xs font-medium hover:bg-tennis-700"
          >New Assessment</Link>
        </div>

        {/* Skill definitions */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Assessment Skills (1–5 scale)</h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
            {SKILL_DEFINITIONS.map(skill => (
              <div key={skill.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                <ClipboardList className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-slate-700">{skill.name}</p>
                  <p className="text-[10px] text-slate-500">{skill.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Assessments */}
        <div className="space-y-3">
          {assessments.map(a => {
            const player = players.find(p => p.id === a.player_id);
            const avg = a.items.reduce((s, i) => s + i.rating, 0) / (a.items.length || 1);
            return (
              <div key={a.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs",
                      player?.skill_stage === "red" ? "bg-red-100 text-red-700" :
                      player?.skill_stage === "orange" ? "bg-orange-100 text-orange-700" :
                      player?.skill_stage === "green" ? "bg-green-100 text-green-700" :
                      "bg-yellow-100 text-yellow-700"
                    )}>
                      {(player?.preferred_name || player?.first_name || "?").slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{player?.preferred_name || player?.first_name} {player?.last_name}</p>
                      <p className="text-xs text-slate-500">Assessed {a.date} • Avg {avg.toFixed(1)}/5</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {a.overall_stage_recommendation && (
                      <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border", stageBgClass(a.overall_stage_recommendation), stageTextClass(a.overall_stage_recommendation))}>
                        Rec: {a.overall_stage_recommendation}
                      </span>
                    )}
                    <Link href={`/assessments/${a.id}`} className="text-slate-300 hover:text-tennis-600"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {a.items.slice(0, 5).map(item => {
                    const skill = SKILL_DEFINITIONS.find(s => s.id === item.skill_id);
                    return (
                      <span key={item.id} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs"
                      >
                        <span className="text-slate-600">{skill?.name}</span>
                        <span className="font-bold text-slate-800">{item.rating}</span>
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      </span>
                    );
                  })}
                  {a.items.length > 5 && <span className="px-2 py-1 text-[10px] text-slate-400">+{a.items.length - 5} more</span>}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
    </RouteGuard>
  );
}
