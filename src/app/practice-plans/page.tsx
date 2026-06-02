"use client";
import { useState } from "react";
import { DemoNav } from "@/components/layout/DemoNav";
import { useData } from "@/contexts/DataContext";
import RouteGuard from "@/components/RouteGuard";
import { DEMO_DRILLS, STAGE_INFO } from "@/lib/mockData";
import { Sparkles, Clock, Users, Target, Plus, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { cn, stageBgClass, stageTextClass } from "@/lib/utils";
import type { SkillStage } from "@/lib/types";

export default function PracticePlansPage() {
  const { sessions, addSession, showToast } = useData();
  const [selectedStage, setSelectedStage] = useState("all");
  const [themeFilter, setThemeFilter] = useState("all");

  const [isOpen, setIsOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  const [title, setTitle] = useState("");
  const [stage, setStage] = useState<SkillStage>("red");
  const [theme, setTheme] = useState("");
  const [duration, setDuration] = useState(60);
  const [courts, setCourts] = useState(1);
  const [energy, setEnergy] = useState<"low" | "medium" | "high">("medium");
  const [equipment, setEquipment] = useState("");
  const [safety, setSafety] = useState("");

  const [aiStage, setAiStage] = useState<SkillStage>("orange");
  const [aiTheme, setAiTheme] = useState("rally");

  const drills = DEMO_DRILLS.filter((d) => {
    if (selectedStage !== "all" && d.stage !== selectedStage) return false;
    if (themeFilter !== "all" && d.category !== themeFilter) return false;
    return true;
  });

  const openModal = () => {
    setTitle("");
    setStage("red");
    setTheme("");
    setDuration(60);
    setCourts(1);
    setEnergy("medium");
    setEquipment("");
    setSafety("");
    setIsOpen(true);
  };

  const handleAddPlan = () => {
    if (!title.trim()) return;
    const today = new Date().toISOString().split("T")[0];
    addSession({
      title: title.trim(),
      date: today,
      time_start: "09:00",
      time_end: "10:00",
      location: "Main Court",
      group_id: "",
      coach_ids: [],
      capacity: 10,
      status: "scheduled",
      theme: theme.trim() || undefined,
      stage_focus: stage,
      notes: `Duration: ${duration}min | Courts: ${courts} | Energy: ${energy}${safety ? ` | Safety: ${safety}` : ""}`,
      equipment_needed: equipment
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean),
    });
    setIsOpen(false);
  };

  const handleAiGenerate = async () => {
    setAiGenerating(true);
    await new Promise((res) => setTimeout(res, 2000));
    const stageDrills = DEMO_DRILLS.filter((d) => d.stage === aiStage && d.category === aiTheme);
    const picks = stageDrills.length
      ? stageDrills.sort(() => Math.random() - 0.5).slice(0, Math.min(4, stageDrills.length))
      : DEMO_DRILLS.filter((d) => d.stage === aiStage).sort(() => Math.random() - 0.5).slice(0, 4);
    const planTitle = `${STAGE_INFO[aiStage].name} ${aiTheme.charAt(0).toUpperCase() + aiTheme.slice(1)} Plan`;
    const today = new Date().toISOString().split("T")[0];
    addSession({
      title: planTitle,
      date: today,
      time_start: "09:00",
      time_end: "10:00",
      location: "Main Court",
      group_id: "",
      coach_ids: [],
      capacity: 10,
      status: "scheduled",
      theme: aiTheme,
      stage_focus: aiStage,
      notes: `AI-generated plan with ${picks.length} drills: ${picks.map((d) => d.name).join(", ")}`,
      equipment_needed: Array.from(new Set(picks.flatMap((d) => d.equipment))),
    });
    showToast("AI plan generated!", "success");
    setAiGenerating(false);
    setAiOpen(false);
  };

 return (
    <RouteGuard>
   <div className="min-h-screen bg-slate-50">
      <DemoNav />
      <main className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Practice Plans</h1>
            <p className="text-sm text-slate-500">Build sessions with drills and games</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/practice-plans/new"
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-tennis-600 to-emerald-600 text-white rounded-lg text-xs font-medium hover:shadow-lg"
            >
              <Sparkles className="w-4 h-4" /> Generate with AI
            </Link>
            <button
              onClick={openModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-tennis-600 text-white rounded-lg text-xs font-medium hover:bg-tennis-700"
            >
              <Plus className="w-4 h-4" /> New Plan
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-tennis-400"
          >
            <option value="all">All stages</option>
            <option value="red">Red Ball</option>
            <option value="orange">Orange Ball</option>
            <option value="green">Green Ball</option>
            <option value="yellow">Yellow Ball</option>
          </select>
          <select
            value={themeFilter}
            onChange={(e) => setThemeFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-tennis-400"
          >
            <option value="all">All themes</option>
            <option value="movement">Movement</option>
            <option value="strokes">Strokes</option>
            <option value="rally">Rally</option>
            <option value="tactical">Tactical</option>
            <option value="games">Games</option>
          </select>
        </div>

        {/* Planned sessions */}
        {sessions.filter((s) => s.theme || s.stage_focus).length > 0 && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Planned Sessions</h3>
            <div className="divide-y divide-slate-50">
              {sessions
                .filter((s) => s.theme || s.stage_focus)
                .map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-medium border",
                          stageBgClass(s.stage_focus || ""),
                          stageTextClass(s.stage_focus || "")
                        )}
                      >
                        {s.stage_focus}
                      </span>
                      <span className="text-sm text-slate-700">{s.title}</span>
                    </div>
                    <span className="text-xs text-slate-400">{s.date}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* AI Practice Builder Preview */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <h3 className="text-sm font-semibold text-slate-700">AI Practice Builder</h3>
          </div>
          <p className="text-xs text-slate-500 mb-2">Generate a complete practice plan based on age, stage, duration, and theme.</p>
          <button
            onClick={() => setAiOpen(true)}
            className="px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-lg border border-purple-100 hover:bg-purple-100 transition-colors"
          >
            ✨ Generate AI Plan
          </button>
        </div>

        {/* Drill Library */}
        <div className="grid md:grid-cols-2 gap-3">
          {drills.map((drill) => (
            <div
              key={drill.id}
              className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-slate-800 text-sm">{drill.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{drill.description}</p>
                </div>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ml-2",
                    stageBgClass(drill.stage),
                    stageTextClass(drill.stage)
                  )}
                >
                  {drill.stage}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />{drill.duration_minutes} min
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />{drill.min_players}-{drill.max_players} players
                </span>
                <span className="flex items-center gap-1">
                  <Target className="w-3 h-3" />{drill.category}
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-50">
                <p className="text-[10px] font-medium text-slate-400 uppercase mb-1">Equipment</p>
                <div className="flex flex-wrap gap-1">
                  {drill.equipment.map((e) => (
                    <span
                      key={e}
                      className="px-2 py-0.5 bg-slate-50 text-slate-600 text-[10px] rounded-full border border-slate-100"
                    >
                      {e}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-50">
                <p className="text-[10px] font-medium text-slate-400 uppercase mb-1">Instructions</p>
                <ul className="space-y-0.5">
                  {drill.instructions.map((inst, i) => (
                    <li key={i} className="text-xs text-slate-600 flex items-start gap-1">
                      <span className="text-tennis-400 mt-0.5">•</span>{inst}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* New Plan Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">New Practice Plan</h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-tennis-400"
                  placeholder="e.g. Saturday Rally Focus"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Stage</label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value as SkillStage)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-tennis-400"
                  >
                    <option value="red">Red</option>
                    <option value="orange">Orange</option>
                    <option value="green">Green</option>
                    <option value="yellow">Yellow</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Theme</label>
                  <input
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-tennis-400"
                    placeholder="e.g. rally"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Duration (min)</label>
                  <input
                    type="number"
                    min={10}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-tennis-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Courts</label>
                  <input
                    type="number"
                    min={1}
                    value={courts}
                    onChange={(e) => setCourts(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-tennis-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Energy</label>
                  <select
                    value={energy}
                    onChange={(e) => setEnergy(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-tennis-400"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Equipment (comma-separated)</label>
                <textarea
                  value={equipment}
                  onChange={(e) => setEquipment(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-tennis-400"
                  placeholder="cones, orange balls, mini nets"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Safety Notes</label>
                <textarea
                  value={safety}
                  onChange={(e) => setSafety(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-tennis-400"
                  placeholder="Any safety reminders..."
                />
              </div>
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPlan}
                  disabled={!title.trim()}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-medium text-white",
                    !title.trim() ? "bg-slate-300 cursor-not-allowed" : "bg-tennis-600 hover:bg-tennis-700"
                  )}
                >
                  Add Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Generate Modal */}
      {aiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">Generate AI Plan</h2>
              <button onClick={() => setAiOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Stage</label>
                <select
                  value={aiStage}
                  onChange={(e) => setAiStage(e.target.value as SkillStage)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-tennis-400"
                >
                  <option value="red">Red Ball</option>
                  <option value="orange">Orange Ball</option>
                  <option value="green">Green Ball</option>
                  <option value="yellow">Yellow Ball</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Theme / Focus</label>
                <select
                  value={aiTheme}
                  onChange={(e) => setAiTheme(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-tennis-400"
                >
                  <option value="movement">Movement</option>
                  <option value="strokes">Strokes</option>
                  <option value="rally">Rally</option>
                  <option value="tactical">Tactical</option>
                  <option value="games">Games</option>
                </select>
              </div>
              {aiGenerating && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-purple-600 rounded-full animate-spin" />
                  Generating...
                </div>
              )}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setAiOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                  disabled={aiGenerating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAiGenerate}
                  disabled={aiGenerating}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-medium text-white bg-purple-600 hover:bg-purple-700",
                    aiGenerating && "opacity-60 cursor-not-allowed"
                  )}
                >
                  Generate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </RouteGuard>
  );
}
