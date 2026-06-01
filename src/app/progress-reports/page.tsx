"use client";
import { useState } from "react";
import { DemoNav } from "@/components/layout/DemoNav";
import { useData } from "@/contexts/DataContext";
import RouteGuard from "@/components/RouteGuard";
import { STAGE_INFO } from "@/lib/types";
import { FileText, Printer, Plus, Star, TrendingUp } from "lucide-react";

export default function ProgressReportsPage() {
  const { progressReports, players, addProgressReport } = useData();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <RouteGuard>
    <div className="min-h-screen bg-slate-50">
      <DemoNav />
      <main className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Progress Reports</h1>
            <p className="text-sm text-slate-500">Parent-friendly reports on player development</p>
          </div>
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 px-3 py-2 bg-tennis-600 text-white rounded-lg text-xs font-medium hover:bg-tennis-700">
            <Plus className="w-4 h-4" /> Generate Report
          </button>
        </div>

        {progressReports.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No progress reports yet. Click "Generate Report" to create one.</p>
          </div>
        )}

        {progressReports.map(report => {
          const player = players.find(p => p.id === report.player_id);
          const info = STAGE_INFO[report.current_stage];
          return (
            <div key={report.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 mb-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm" style={{ backgroundColor: info.color + "20", color: info.color }}>
                    {(player?.preferred_name || player?.first_name || "?").slice(0, 2)}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">{player?.preferred_name || player?.first_name} {player?.last_name}</h2>
                    <p className="text-xs text-slate-500">{report.title} • {report.period_start} – {report.period_end}</p>
                  </div>
                </div>
                <button className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 text-slate-600 text-xs rounded-lg border border-slate-100 hover:bg-slate-100">
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-semibold text-slate-700">Strengths</h3>
                  </div>
                  <ul className="space-y-1">
                    {report.strengths.map(s => <li key={s} className="text-xs text-slate-600">• {s}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-tennis-500" />
                    <h3 className="text-sm font-semibold text-slate-700">Skills to Practice</h3>
                  </div>
                  <ul className="space-y-1">
                    {report.skills_to_practice.map(s => <li key={s} className="text-xs text-slate-600">• {s}</li>)}
                  </ul>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-tennis-50 border border-tennis-100">
                <p className="text-xs font-medium text-tennis-800 mb-1">Coach Comments</p>
                <p className="text-sm text-tennis-900">{report.coach_comments}</p>
              </div>

              <div className="flex gap-2 mt-4 text-[10px]">
                <span className="px-2 py-0.5 bg-slate-50 rounded-full text-slate-500 border">Attendance: {report.attendance_summary}</span>
                {report.next_milestone && <span className="px-2 py-0.5 bg-slate-50 rounded-full text-slate-500 border">Next: {report.next_milestone}</span>}
              </div>
            </div>
          );
        })}
      </main>

      {/* Placeholder modal — full report builder is Phase 4 */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Generate Report</h2>
            <p className="text-sm text-slate-500 mb-4">Full report builder coming in Phase 4. For now, reports can be created programmatically.</p>
            <button onClick={() => setModalOpen(false)} className="w-full px-3 py-2 bg-tennis-600 text-white rounded-lg text-sm font-medium hover:bg-tennis-700">Close</button>
          </div>
        </div>
      )}
    </div>
    </RouteGuard>
  );
}
