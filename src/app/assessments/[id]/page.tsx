"use client";
import { DemoNav } from "@/components/layout/DemoNav";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import RouteGuard from "@/components/RouteGuard";
import { notFound } from "next/navigation";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SKILL_DEFINITIONS, STAGE_INFO } from "@/lib/types";
import { ArrowLeft, Star, Trash2, ClipboardList, Calendar, User } from "lucide-react";
import { cn, stageBgClass, stageTextClass, formatDate } from "@/lib/utils";

export default function AssessmentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { assessments, players, deleteAssessment } = useData();
  const { user } = useAuth();

  const assessment = assessments.find(a => a.id === id);
  if (!assessment) return notFound();

  const player = players.find(p => p.id === assessment.player_id);
  const isAdminOrCoach = user?.role === "admin" || user?.role === "coach";

  const handleDelete = () => {
    if (typeof window !== "undefined" && !window.confirm("Delete this assessment? This cannot be undone.")) return;
    deleteAssessment(assessment.id);
    router.push("/assessments");
  };

 return (
    <RouteGuard allowedRoles={["admin", "coach", "assistant", "parent"]}>
   <div className="min-h-screen bg-slate-50">
      <DemoNav />
      <main className="p-4 md:p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Link href="/assessments" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-tennis-600">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Assessments
          </Link>
          {isAdminOrCoach && (
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 border border-red-200"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-4">
          <div className="flex items-start gap-4">
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold", stageBgClass(player?.skill_stage || "red"), stageTextClass(player?.skill_stage || "red"))}>
              {(player?.preferred_name || player?.first_name || "?").slice(0, 2)}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">
                  {player?.preferred_name || player?.first_name} {player?.last_name}
                </h1>
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border", stageBgClass(player?.skill_stage || "red"), stageTextClass(player?.skill_stage || "red"))}>
                  {player?.skill_stage || "unknown"}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {assessment.date}</span>
                {assessment.overall_stage_recommendation && (
                  <span className="flex items-center gap-1">
                    Overall Rec:
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border", stageBgClass(assessment.overall_stage_recommendation), stageTextClass(assessment.overall_stage_recommendation))}>
                      {assessment.overall_stage_recommendation}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Skills breakdown */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mb-4">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Skill Breakdown</h2>
          <div className="divide-y divide-slate-50">
            {SKILL_DEFINITIONS.map(skill => {
              const item = assessment.items.find(i => i.skill_id === skill.id);
              const rating = item?.rating ?? 0;
              return (
                <div key={skill.id} className="py-4">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{skill.name}</p>
                      <p className="text-[11px] text-slate-500">{skill.category} • {skill.description}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={cn(
                            "w-4 h-4",
                            star <= rating ? "text-amber-400 fill-amber-400" : "text-slate-200"
                          )}
                        />
                      ))}
                      <span className="ml-1 text-xs font-semibold text-slate-700">{rating}/5</span>
                    </div>
                  </div>
                  {item?.notes && (
                    <p className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-2">{item.notes}</p>
                  )}
                  {item?.recommended_drill && (
                    <p className="mt-1 text-xs text-tennis-600">🎯 {item.recommended_drill}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Coach notes */}
        {assessment.notes && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mb-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-2">Coach Notes</h2>
            <p className="text-sm text-slate-600">{assessment.notes}</p>
          </div>
        )}
      </main>
    </div>
    </RouteGuard>
  );
}
