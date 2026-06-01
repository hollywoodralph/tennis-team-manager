"use client";
import { DemoNav } from "@/components/layout/DemoNav";
import RouteGuard from "@/components/RouteGuard";
import { STAGE_INFO } from "@/lib/mockData";
import { Trophy, Target, CheckCircle, TrendingUp } from "lucide-react";
import { stageBgClass, stageTextClass } from "@/lib/utils";

const pathwayDetails = {
  red:   { goals: ["Fun and enjoyment", "Basic coordination", "Ball tracking", "Listening to coach"], skills: ["Catch and throw", "Simple rally off wall", "Movement games", "Basic groundstroke contact"], drills: ["Cone island footwork", "Mini-net rally challenge", "Red-light green-light"], frequency: "2x per week", parent_tips: ["Play catch at home", "Balance exercises", "Praise effort over results"] },
  orange:{ goals: ["Controlled strokes", "Cooperative rally", "Court positioning", "Basic serve motion"], skills: ["Ready position", "Forehand direction", "Backhand control", "Serve toss", "Rally 6+ shots"], drills: ["Bounce-hit rally", "Partner toss forehand", "Target zones"], frequency: "2-3x per week", parent_tips: ["Practice against wall", "Encourage serving motion", "Watch tennis together"] },
  green: { goals: ["Consistent rally", "Tactical awareness", "Point play", "Directional control"], skills: ["Rally 12+ shots", "Volley", "Serve consistency", "Match rules", "Basic strategy"], drills: ["Rally record challenge", "Serve toss ladder", "Volley wall"], frequency: "3x per week", parent_tips: ["Play mini-matches", "Discuss strategy", "Maintain equipment"] },
  yellow:{ goals: ["Full-court readiness", "Match play", "Scoring", "Strategy"], skills: ["Serve consistency", "Groundstroke depth", "Net play", "Singles and doubles", "Sportsmanship"], drills: ["Team sportsmanship game", "Match play simulation", "Conditioned games"], frequency: "3-4x per week", parent_tips: ["Support during matches", "Focus on improvement", "Encourage fitness"] },
};

export default function PathwayPage() {
  return (
    <RouteGuard>
    <div className="min-h-screen bg-slate-50">
      <DemoNav />
      <main className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Tennis Development Pathway</h1>
          <p className="text-sm text-slate-500 mt-1">From Red Ball to Yellow Ball — a progressive journey for young players</p>
        </div>

        <div className="space-y-4">
          {(["red", "orange", "green", "yellow"] as const).map((stage, i) => {
            const info = STAGE_INFO[stage];
            const details = pathwayDetails[stage];
            return (
              <div key={stage} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 flex items-center gap-3" style={{ backgroundColor: info.color + "10" }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0" style={{ backgroundColor: info.color }}>
                    {i + 1}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold" style={{ color: info.color }}>{info.name}</h2>
                    <p className="text-xs text-slate-500">{info.description}</p>
                  </div>
                </div>
                <div className="p-5 grid md:grid-cols-2 gap-5">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4" style={{ color: info.color }} />
                      <h3 className="text-sm font-semibold text-slate-700">Goals</h3>
                    </div>
                    <ul className="space-y-1">
                      {details.goals.map(g => <li key={g} className="text-xs text-slate-600 flex items-start gap-1.5"><CheckCircle className="w-3 h-3 mt-0.5 shrink-0" style={{ color: info.color }} />{g}</li>)}
                    </ul>
                    <div className="flex items-center gap-2 mt-4 mb-2">
                      <Trophy className="w-4 h-4" style={{ color: info.color }} />
                      <h3 className="text-sm font-semibold text-slate-700">Key Skills</h3>
                    </div>
                    <ul className="space-y-1">
                      {details.skills.map(s => <li key={s} className="text-xs text-slate-600 flex items-start gap-1.5"><TrendingUp className="w-3 h-3 mt-0.5 shrink-0" style={{ color: info.color }} />{s}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4" style={{ color: info.color }} />
                      <h3 className="text-sm font-semibold text-slate-700">Recommended Drills</h3>
                    </div>
                    <ul className="space-y-1">
                      {details.drills.map(d => <li key={d} className="text-xs text-slate-600">• {d}</li>)}
                    </ul>
                    <p className="text-xs text-slate-500 mt-3"><b className="text-slate-700">Frequency:</b> {details.frequency}</p>
                    <div className="mt-3 p-3 rounded-lg border border-slate-100 bg-slate-50">
                      <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">📝 Parent Tips</p>
                      <ul className="space-y-0.5">
                        {details.parent_tips.map(t => <li key={t} className="text-xs text-slate-600">• {t}</li>)}
                      </ul>
                    </div>
                  </div>
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