"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { DemoNav } from "@/components/layout/DemoNav";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import RouteGuard from "@/components/RouteGuard";
import { Sparkles, Loader2, ArrowLeft, Save, RefreshCw, Clock, Users, Trophy, Zap, CircleDot, Wand2, ClipboardCopy, Printer, Check, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const STAGE_INFO: Record<string, { name: string; ball: string; color: string; bg: string; }> = {
  red: { name: "Red Ball", ball: "🔴", color: "text-red-700", bg: "bg-red-50 border-red-300" },
  orange: { name: "Orange Ball", ball: "🟠", color: "text-orange-700", bg: "bg-orange-50 border-orange-300" },
  green: { name: "Green Ball", ball: "🟢", color: "text-tennis-700", bg: "bg-tennis-50 border-tennis-300" },
  yellow: { name: "Yellow Ball", ball: "🟡", color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-300" },
};

const THEMES = [
  { id: "fundamentals", label: "Fundamentals", desc: "Grip, ready position, footwork" },
  { id: "serve", label: "Serve", desc: "Toss, contact, full motion" },
  { id: "rally", label: "Rally", desc: "Consistency, depth, direction" },
  { id: "match_play", label: "Match Play", desc: "Scoring, tactics, pressure" },
  { id: "movement", label: "Movement", desc: "Footwork, recovery, coverage" },
  { id: "volleys", label: "Volleys", desc: "Net play, transitions" },
  { id: "doubles", label: "Doubles", desc: "Formations, communication" },
];

interface PlanItem {
  name: string;
  duration: number;
  description: string;
  coachingPoints: string[];
}

interface PlanResult {
  id?: string;
  title: string;
  warmup: PlanItem[];
  mainDrills: PlanItem[];
  games: PlanItem[];
  cooldown: PlanItem[];
  equipmentList: string[];
  safetyNotes?: string;
  parentTakeaway?: string;
  generatedBy?: string;
  stage?: string;
  durationMinutes?: number;
}

export default function NewPracticePlanPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useData();

  const [stage, setStage] = useState<"red" | "orange" | "green" | "yellow">("orange");
  const [theme, setTheme] = useState("fundamentals");
  const [ageRange, setAgeRange] = useState("8-10");
  const [numPlayers, setNumPlayers] = useState(8);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [courts, setCourts] = useState(1);
  const [energyLevel, setEnergyLevel] = useState<"low" | "medium" | "high">("medium");
  const [title, setTitle] = useState("");

  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [error, setError] = useState("");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [streamedPlan, setStreamedPlan] = useState<PlanResult | null>(null);
  const [statusStage, setStatusStage] = useState<"idle"|"thinking"|"warmup"|"main"|"games"|"cooldown"|"saving"|"done">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null);
  const [streamError, setStreamError] = useState("");
  const [refining, setRefining] = useState(false);
  const [refinementText, setRefinementText] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // If a coach creates a new plan while logged out (no DB), block
  const canGenerate = !!user;

  useEffect(() => {
    if (!loading) {
      setElapsedSec(0);
      return;
    }
    const t = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);

  const cancelStream = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setStatusStage("idle");
    setStatusMessage("");
    showToast("Generation cancelled", "info");
  };

  const openRefineModal = () => {
    if (!plan) return;
    setRefinementText("");
    setRefining(true);
  };

  const submitRefine = () => {
    if (!refinementText.trim() || !plan) return;
    const text = refinementText.trim();
    setRefining(false);
    setRefinementText("");
    generateStream({ refinement: text, previousPlan: plan });
  };

  const generateStream = async (opts: { refinement?: string; previousPlan?: PlanResult } = {}) => {
    if (!canGenerate) {
      setError("You need to be signed in to generate practice plans. Sign in or sign up first.");
      return;
    }
    setLoading(true);
    setError("");
    setStreamError("");
    setPlan(null);
    setStreamedPlan({ title: "", warmup: [], mainDrills: [], games: [], cooldown: [], equipmentList: [], safetyNotes: "", parentTakeaway: "" } as PlanResult);
    setStatusStage("thinking");
    setStatusMessage(opts.refinement ? "Refining your plan..." : "AI coach is designing your plan...");
    setSavedPlanId(null);
    setRefining(false);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/practice-plans/generate-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          stage, theme, ageRange, numPlayers, durationMinutes, courts, energyLevel,
          title: title.trim() || undefined,
          savePlan: true,
          refinement: opts.refinement,
          previousPlan: opts.previousPlan,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl;
        while ((nl = buffer.indexOf("\n\n")) !== -1) {
          const block = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 2);
          // Each event is `data: <json>\n\n`
          const line = block.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          let evt: any;
          try { evt = JSON.parse(line.slice(6)); } catch { continue; }
          if (evt.type === "status") {
            setStatusStage(evt.stage);
            setStatusMessage(evt.message || "");
          } else if (evt.type === "section") {
            setStreamedPlan((prev) => ({ ...(prev || {} as PlanResult), [evt.name]: evt.items } as PlanResult));
          } else if (evt.type === "meta") {
            setStreamedPlan((prev) => ({ ...(prev || {} as PlanResult), [evt.field]: evt.value } as PlanResult));
          } else if (evt.type === "done") {
            setStatusStage("done");
            setStatusMessage("Done!");
            setPlan(evt.plan);
            setSavedPlanId(evt.plan?.id || null);
            showToast(evt.plan?.id ? "Plan generated and saved!" : "Plan generated!", "success");
          } else if (evt.type === "error") {
            setStreamError(evt.error || "Generation failed");
          }
        }
      }
    } catch (e: any) {
      if (e.name === "AbortError") return; // already handled by cancelStream
      setStreamError(e.message || "Generation failed");
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  return (
    <RouteGuard allowedRoles={["admin", "coach", "assistant"]}>
      <div className="min-h-screen bg-slate-50">
        <DemoNav />
        <main className="p-4 md:p-6 max-w-5xl mx-auto no-print">
          <Link href="/practice-plans" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-tennis-600 mb-3">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to plans
          </Link>
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-6 h-6 text-tennis-600" />
              <h1 className="text-2xl font-bold text-slate-800">AI Practice Plan Generator</h1>
            </div>
            <p className="text-sm text-slate-500">
              Powered by <span className="font-semibold text-tennis-700">minimax-m3:cloud</span> via Ollama Cloud. Designs a complete 4-section practice session in seconds, streamed live.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            {/* Form */}
            <div className="lg:col-span-1 space-y-3 no-print">
              <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
                <h2 className="text-sm font-semibold text-slate-700 mb-3">Session Details</h2>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Stage (ball color)</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(["red", "orange", "green", "yellow"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => setStage(s)}
                          className={cn(
                            "p-2 rounded-lg border-2 text-xs font-medium transition-all flex items-center gap-1.5",
                            stage === s ? STAGE_INFO[s].bg + " " + STAGE_INFO[s].color : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                          )}
                        >
                          <span className="text-base">{STAGE_INFO[s].ball}</span> {STAGE_INFO[s].name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Theme</label>
                    <select
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-tennis-400 outline-none bg-white"
                    >
                      {THEMES.map((t) => (
                        <option key={t.id} value={t.id}>{t.label} — {t.desc}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Age range</label>
                      <input
                        type="text"
                        value={ageRange}
                        onChange={(e) => setAgeRange(e.target.value)}
                        placeholder="8-10"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-tennis-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Players</label>
                      <input
                        type="number"
                        min={1}
                        max={40}
                        value={numPlayers}
                        onChange={(e) => setNumPlayers(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-tennis-400 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Duration (min)</label>
                      <input
                        type="number"
                        min={15}
                        max={240}
                        step={5}
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-tennis-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Courts</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={courts}
                        onChange={(e) => setCourts(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-tennis-400 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Energy level</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["low", "medium", "high"] as const).map((e) => (
                        <button
                          key={e}
                          onClick={() => setEnergyLevel(e)}
                          className={cn(
                            "p-2 rounded-lg border text-xs font-medium capitalize transition-all",
                            energyLevel === e
                              ? "bg-tennis-50 border-tennis-400 text-tennis-700"
                              : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                          )}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Title (optional)</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Auto-generated if blank"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-tennis-400 outline-none"
                    />
                  </div>

                  <div className="pt-2 space-y-2">
                    <button
                      onClick={() => generateStream()}
                      disabled={loading || !canGenerate}
                      className={cn(
                        "w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all",
                        loading || !canGenerate
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-tennis-600 to-emerald-600 text-white hover:shadow-lg hover:scale-[1.02]"
                      )}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating... {elapsedSec}s
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Generate Plan
                        </>
                      )}
                    </button>
                    {loading && (
                      <button
                        onClick={cancelStream}
                        className="w-full py-2 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" /> Cancel
                      </button>
                    )}
                    {plan && !loading && (
                      <button
                        onClick={() => generateStream()}
                        className="w-full py-2 rounded-lg text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Result */}
            <div className="lg:col-span-2">
              {(error || streamError) && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 text-sm">
                  {error || streamError}
                </div>
              )}

              {!plan && !loading && !streamedPlan && !streamError && (
                <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
                  <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-slate-700 mb-1">Your plan will appear here</h3>
                  <p className="text-xs text-slate-500">
                    Fill in the details and hit <span className="font-semibold text-tennis-600">Generate Plan</span> to create a 4-section session in seconds.
                  </p>
                </div>
              )}

              {/* Streaming state: progress chips + live cards */}
              {loading && streamedPlan && (
                <div className="space-y-3" role="status" aria-live="polite">
                  <ProgressChips stage={statusStage} />
                  <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                    {streamedPlan.title && (
                      <div className="px-5 py-3 border-b-2 border-tennis-200 bg-tennis-50/50">
                        <p className="text-[10px] text-tennis-700 font-semibold uppercase tracking-wide">Plan Title</p>
                        <h2 className="text-lg font-bold text-slate-800">{streamedPlan.title}</h2>
                      </div>
                    )}
                    <div className="p-4 space-y-4">
                      {streamedPlan.warmup.length > 0 && (
                        <Section title="Warm-up" color="amber" icon={Zap} minutes={streamedPlan.warmup} />
                      )}
                      {streamedPlan.mainDrills.length > 0 && (
                        <Section title="Main Drills" color="tennis" icon={CircleDot} minutes={streamedPlan.mainDrills} />
                      )}
                      {streamedPlan.games.length > 0 && (
                        <Section title="Games" color="blue" icon={Trophy} minutes={streamedPlan.games} />
                      )}
                      {streamedPlan.cooldown.length > 0 && (
                        <Section title="Cool-down" color="slate" icon={Clock} minutes={streamedPlan.cooldown} />
                      )}
                      {streamedPlan.warmup.length === 0 && streamedPlan.mainDrills.length === 0 && streamedPlan.games.length === 0 && streamedPlan.cooldown.length === 0 && (
                        <div className="py-8 text-center text-xs text-slate-400">
                          <Loader2 className="w-5 h-5 animate-spin inline mr-1.5" />
                          Waiting for first section...
                        </div>
                      )}
                    </div>
                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                      <span>{statusMessage || "AI is writing..."}</span>
                      <span className="font-mono">{elapsedSec}s elapsed</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Final plan display */}
              {plan && (
                <PlanDisplay
                  plan={plan}
                  stage={stage}
                  onSave={() => showToast(savedPlanId ? "Plan already saved! View it in /practice-plans" : "Plan saved!", "info")}
                  onRefine={openRefineModal}
                />
              )}
            </div>
          </div>
        </main>

        {/* Refine modal */}
        {refining && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setRefining(false)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 animate-in zoom-in-95 duration-150">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-violet-600" /> Refine with AI
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Tell the AI what to change. The current plan is sent as context.</p>
                </div>
                <button onClick={() => setRefining(false)} className="p-1 hover:bg-slate-100 rounded">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
              <textarea
                value={refinementText}
                onChange={(e) => setRefinementText(e.target.value)}
                placeholder="e.g. Make the warm-up more dynamic, add a 2-minute water break, replace the serve drill with shadow swings, shorten the games to 5 minutes each..."
                className="w-full h-32 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-400 outline-none resize-none"
                autoFocus
              />
              <div className="flex flex-wrap gap-1.5 mt-2 mb-3">
                {["Make it more dynamic", "Add a water break", "Shorter games", "More footwork drills"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRefinementText((t) => t ? `${t}, ${s.toLowerCase()}` : s)}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded-full text-[10px] text-slate-700"
                  >
                    + {s}
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setRefining(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={submitRefine}
                  disabled={!refinementText.trim()}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:shadow rounded-lg disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Wand2 className="w-3.5 h-3.5" /> Refine Plan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RouteGuard>
  );
}

function PlanDisplay({ plan, stage, onSave, onRefine }: { plan: PlanResult; stage: string; onSave: () => void; onRefine: () => void }) {
  const [copiedMd, setCopiedMd] = useState(false);

  const md = planToMarkdown(plan);

  const copyAsMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(md);
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 1500);
    } catch {
      // Fallback: use a temp textarea
      const ta = document.createElement("textarea");
      ta.value = md;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); setCopiedMd(true); setTimeout(() => setCopiedMd(false), 1500); } catch {}
      document.body.removeChild(ta);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden print:shadow-none print:border-0">
      <div className={cn("px-5 py-4 border-b-4", STAGE_INFO[plan.stage || stage]?.bg)}>
        <div className="flex items-center gap-2 mb-1">
          {plan.generatedBy === "ollama-cloud" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/80 backdrop-blur text-tennis-700 text-[10px] font-semibold">
              <Sparkles className="w-3 h-3" /> AI Generated
            </span>
          )}
          <span className="text-[10px] text-slate-500 font-medium">
            {plan.durationMinutes} min · {STAGE_INFO[plan.stage || stage]?.name || stage}
          </span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">{plan.title}</h2>
      </div>

      <div className="p-5 space-y-5">
        <Section title="Warm-up" color="amber" icon={Zap} minutes={plan.warmup} />
        <Section title="Main Drills" color="tennis" icon={CircleDot} minutes={plan.mainDrills} />
        <Section title="Games" color="blue" icon={Trophy} minutes={plan.games} />
        <Section title="Cool-down" color="slate" icon={Clock} minutes={plan.cooldown} />

        {plan.equipmentList && plan.equipmentList.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Equipment</h3>
            <div className="flex flex-wrap gap-1.5">
              {plan.equipmentList.map((e, i) => (
                <span key={i} className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600">
                  {e}
                </span>
              ))}
            </div>
          </div>
        )}

        {plan.safetyNotes && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-amber-800 mb-0.5">Safety Notes</p>
            <p className="text-xs text-amber-700">{plan.safetyNotes}</p>
          </div>
        )}

        {plan.parentTakeaway && (
          <div className="bg-tennis-50 border border-tennis-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-tennis-800 mb-0.5">Parent Takeaway</p>
            <p className="text-xs text-tennis-700">{plan.parentTakeaway}</p>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 no-print">
          <button
            onClick={onSave}
            className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" /> Already saved
          </button>
          <button
            onClick={onRefine}
            className="px-3 py-1.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-lg text-xs font-medium hover:shadow flex items-center gap-1.5"
          >
            <Wand2 className="w-3.5 h-3.5" /> Refine with AI
          </button>
          <button
            onClick={copyAsMarkdown}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 flex items-center gap-1.5"
          >
            {copiedMd ? <><Check className="w-3.5 h-3.5 text-tennis-600" /> Copied!</> : <><ClipboardCopy className="w-3.5 h-3.5" /> Copy as Markdown</>}
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" /> Print / PDF
          </button>
          <Link
            href="/practice-plans"
            className="px-3 py-1.5 bg-tennis-600 text-white rounded-lg text-xs font-medium hover:bg-tennis-700 flex items-center gap-1.5"
          >
            View All Plans →
          </Link>
        </div>
      </div>
    </div>
  );
}

// Serialize a plan to a clean Markdown document (for clipboard or print-to-PDF)
function planToMarkdown(p: PlanResult): string {
  const lines: string[] = [];
  lines.push(`# ${p.title}`);
  lines.push("");
  if (p.stage) lines.push(`**Stage:** ${p.stage}  `);
  if (p.durationMinutes) lines.push(`**Duration:** ${p.durationMinutes} min`);
  lines.push("");

  const writeSection = (heading: string, items: PlanItem[]) => {
    if (!items || items.length === 0) return;
    lines.push(`## ${heading}`);
    lines.push("");
    for (const it of items) {
      lines.push(`### ${it.name}  (${it.duration} min)`);
      lines.push(it.description);
      if (it.coachingPoints && it.coachingPoints.length > 0) {
        for (const cp of it.coachingPoints) lines.push(`- ${cp}`);
      }
      lines.push("");
    }
  };
  writeSection("Warm-up", p.warmup);
  writeSection("Main Drills", p.mainDrills);
  writeSection("Games", p.games);
  writeSection("Cool-down", p.cooldown);

  if (p.equipmentList && p.equipmentList.length > 0) {
    lines.push("## Equipment");
    lines.push(p.equipmentList.map((e) => `- ${e}`).join("\n"));
    lines.push("");
  }
  if (p.safetyNotes) {
    lines.push("## Safety Notes");
    lines.push(p.safetyNotes);
    lines.push("");
  }
  if (p.parentTakeaway) {
    lines.push("## Parent Takeaway");
    lines.push(p.parentTakeaway);
    lines.push("");
  }
  return lines.join("\n");
}

function Section({ title, color, icon: Icon, minutes }: { title: string; color: string; icon: any; minutes: PlanItem[] }) {
  const total = minutes.reduce((s, m) => s + (m.duration || 0), 0);
  const colorMap: Record<string, string> = {
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    tennis: "bg-tennis-50 text-tennis-700 border-tennis-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className={cn("text-sm font-semibold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border", colorMap[color])}>
          <Icon className="w-3.5 h-3.5" /> {title}
        </h3>
        <span className="text-xs text-slate-500">{total} min</span>
      </div>
      <div className="space-y-2">
        {minutes.map((item, i) => (
          <div
            key={i}
            className="bg-slate-50 rounded-lg p-3 border border-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-slate-800">{item.name}</p>
              <span className="text-xs text-slate-500 shrink-0">{item.duration} min</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">{item.description}</p>
            {item.coachingPoints && item.coachingPoints.length > 0 && (
              <ul className="mt-2 space-y-0.5">
                {item.coachingPoints.map((cp, j) => (
                  <li key={j} className="text-[11px] text-slate-500 flex items-start gap-1">
                    <span className="text-tennis-500">•</span> {cp}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// 5-stage progress indicator. Active stage pulses; done stages get a checkmark.
const PROGRESS_STAGES: { id: string; label: string }[] = [
  { id: "thinking", label: "Thinking" },
  { id: "warmup", label: "Warm-up" },
  { id: "main", label: "Main" },
  { id: "games", label: "Games" },
  { id: "cooldown", label: "Cool-down" },
];

function ProgressChips({ stage }: { stage: string }) {
  const order: Record<string, number> = { thinking: 0, warmup: 1, main: 2, games: 3, cooldown: 4, saving: 5, done: 5 };
  const currentIdx = order[stage] ?? 0;
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 flex items-center gap-1.5 flex-wrap">
      {PROGRESS_STAGES.map((s, i) => {
        const isDone = i < currentIdx || stage === "done";
        const isActive = i === currentIdx && stage !== "done";
        return (
          <div key={s.id} className="flex items-center gap-1.5">
            <div
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all",
                isDone && "bg-tennis-50 text-tennis-700 border-tennis-300",
                isActive && "bg-tennis-100 text-tennis-800 border-tennis-400 ring-2 ring-tennis-300 animate-pulse",
                !isDone && !isActive && "bg-slate-50 text-slate-400 border-slate-200"
              )}
            >
              {isDone ? (
                <Check className="w-3 h-3" />
              ) : isActive ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <span className="w-3 h-3 inline-block rounded-full border-2 border-current opacity-50" />
              )}
              {s.label}
            </div>
            {i < PROGRESS_STAGES.length - 1 && (
              <span className={cn("w-2 h-px", isDone ? "bg-tennis-300" : "bg-slate-200")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
