"use client";
import { useState, useMemo } from "react";
import { DemoNav } from "@/components/layout/DemoNav";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import RouteGuard from "@/components/RouteGuard";
import { useRouter } from "next/navigation";
import { SKILL_DEFINITIONS, STAGE_INFO } from "@/lib/types";
import type { SkillStage, SkillAssessmentItem } from "@/lib/types";
import { ArrowLeft, Star, Save } from "lucide-react";
import Link from "next/link";
import { cn, stageBgClass, stageTextClass } from "@/lib/utils";

function getTodayIso() {
  return new Date().toISOString().split("T")[0];
}

function emptyItems(): SkillAssessmentItem[] {
  return SKILL_DEFINITIONS.map((skill, idx) => ({
    id: `item-${idx}`,
    assessment_id: "",
    skill_id: skill.id,
    rating: 0,
    notes: "",
    recommended_drill: "",
  }));
}

export default function NewAssessmentPage() {
  const router = useRouter();
  const { players, addAssessment } = useData();
  const { user } = useAuth();

  const activePlayers = useMemo(() => players.filter(p => p.status === "active"), [players]);

  const [playerId, setPlayerId] = useState("");
  const [date, setDate] = useState(getTodayIso());
  const [overallStage, setOverallStage] = useState<SkillStage | "">("");
  const [coachNotes, setCoachNotes] = useState("");
  const [items, setItems] = useState<SkillAssessmentItem[]>(emptyItems);

  const selectedPlayer = useMemo(() => players.find(p => p.id === playerId), [players, playerId]);

  const setRating = (skillId: string, rating: number) => {
    setItems(prev => prev.map(item => item.skill_id === skillId ? { ...item, rating } : item));
  };

  const setNotes = (skillId: string, notes: string) => {
    setItems(prev => prev.map(item => item.skill_id === skillId ? { ...item, notes } : item));
  };

  const isValid = playerId && date && items.some(i => i.rating > 0);

  const handleSave = () => {
    if (!playerId || !date) return;
    const scoredItems = items.filter(i => i.rating > 0).map(i => ({
      ...i,
      assessment_id: "temp", // replaced by addAssessment if needed
    }));
    if (scoredItems.length === 0) return;
    addAssessment({
      player_id: playerId,
      coach_id: user?.id || "coach-1",
      date,
      overall_stage_recommendation: overallStage || undefined,
      notes: coachNotes || undefined,
      items: scoredItems,
    });
    router.push("/assessments");
  };

 return (
    <RouteGuard allowedRoles={["admin", "coach"]}>
   <div className="min-h-screen bg-slate-50">
      <DemoNav />
      <main className="p-4 md:p-6 max-w-4xl mx-auto">
        <Link href="/assessments" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-tennis-600 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Assessments
        </Link>
        <h1 className="text-2xl font-bold text-slate-800 mb-6">New Skill Assessment</h1>

        <div className="space-y-6">
          {/* Header card */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">Player *</label>
                <select
                  value={playerId}
                  onChange={e => setPlayerId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-tennis-400 outline-none"
                >
                  <option value="">Select player…</option>
                  {activePlayers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.preferred_name || p.first_name} {p.last_name} ({p.skill_stage})
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">Date *</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-tennis-400 outline-none"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">Overall Stage Recommendation</label>
                <select
                  value={overallStage}
                  onChange={e => setOverallStage(e.target.value as SkillStage)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-tennis-400 outline-none"
                >
                  <option value="">None</option>
                  <option value="red">Red Ball</option>
                  <option value="orange">Orange Ball</option>
                  <option value="green">Green Ball</option>
                  <option value="yellow">Yellow Ball</option>
                </select>
              </div>
            </div>
          </div>

          {/* Skill rows */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Skills (1–5 stars)</h2>
            <div className="space-y-4">
              {SKILL_DEFINITIONS.map(skill => {
                const item = items.find(i => i.skill_id === skill.id)!;
                return (
                  <div key={skill.id} className="border-b border-slate-50 last:border-0 pb-4 last:pb-0">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">{skill.name}</p>
                        <p className="text-[11px] text-slate-500">{skill.category} • {skill.description}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(skill.id, star)}
                            className="p-1 focus:outline-none"
                            aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                          >
                            <Star
                              className={cn(
                                "w-5 h-5 transition-colors",
                                star <= item.rating ? "text-amber-400 fill-amber-400" : "text-slate-200"
                              )}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Notes (optional)"
                        value={item.notes || ""}
                        onChange={e => setNotes(skill.id, e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-tennis-400 outline-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coach notes */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Coach Notes</h2>
            <textarea
              rows={4}
              value={coachNotes}
              onChange={e => setCoachNotes(e.target.value)}
              placeholder="Overall observations, recommendations…"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-tennis-400 outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Link href="/assessments" className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</Link>
            <button
              onClick={handleSave}
              disabled={!isValid}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2",
                isValid
                  ? "bg-tennis-600 text-white hover:bg-tennis-700"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              )}
            >
              <Save className="w-4 h-4" /> Save Assessment
            </button>
          </div>
        </div>
      </main>
    </div>
    </RouteGuard>
  );
}
