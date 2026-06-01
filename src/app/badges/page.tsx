"use client";
import { useState } from "react";
import { DemoNav } from "@/components/layout/DemoNav";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import RouteGuard from "@/components/RouteGuard";
import { BADGE_DEFINITIONS } from "@/lib/types";
import { Award, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BadgesPage() {
  const { user } = useAuth();
  const { players, playerBadges, awardBadge } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [selectedBadge, setSelectedBadge] = useState("");
  const [notes, setNotes] = useState("");

  const canAward = user?.role === "admin" || user?.role === "coach";

  const openModal = () => {
    setSelectedPlayer("");
    setSelectedBadge("");
    setNotes("");
    setIsOpen(true);
  };

  const handleAward = () => {
    if (!selectedPlayer || !selectedBadge || !user?.id) return;
    awardBadge({
      player_id: selectedPlayer,
      badge_id: selectedBadge,
      awarded_by: user.id,
      notes: notes.trim() || undefined,
    });
    setIsOpen(false);
  };

  const recentBadges = [...playerBadges].sort(
    (a, b) => new Date(b.awarded_at).getTime() - new Date(a.awarded_at).getTime()
  );

 return (
    <RouteGuard>
   <div className="min-h-screen bg-slate-50">
      <DemoNav />
      <main className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Badges & Achievements</h1>
            <p className="text-sm text-slate-500 mb-6">Awarded by coaches to motivate and recognize progress</p>
          </div>
          {canAward && (
            <button
              onClick={openModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-tennis-600 text-white rounded-lg text-xs font-medium hover:bg-tennis-700"
            >
              <Award className="w-4 h-4" /> Award Badge
            </button>
          )}
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {BADGE_DEFINITIONS.map((badge) => {
            const awarded = playerBadges.filter((pb) => pb.badge_id === badge.id);
            return (
              <div key={badge.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2"
                  style={{ backgroundColor: badge.color + "20" }}
                >
                  <Award className="w-6 h-6" style={{ color: badge.color }} />
                </div>
                <p className="text-sm font-semibold text-center text-slate-800">{badge.name}</p>
                <p className="text-xs text-center text-slate-500 mt-1">{badge.description}</p>
                <p className="text-[10px] text-center text-slate-400 mt-2">
                  Awarded {awarded.length} time{awarded.length !== 1 ? "s" : ""}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Recently Awarded</h3>
          <div className="divide-y divide-slate-50">
            {recentBadges.length === 0 && (
              <p className="text-xs text-slate-500 py-2">No badges awarded yet.</p>
            )}
            {recentBadges.map((pb) => {
              const badge = BADGE_DEFINITIONS.find((b) => b.id === pb.badge_id);
              const player = players.find((p) => p.id === pb.player_id);
              return (
                <div key={pb.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: badge?.color + "20" }}
                    >
                      <Award className="w-3 h-3" style={{ color: badge?.color }} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-700">
                        <b>{badge?.name}</b> → {player?.preferred_name || player?.first_name} {player?.last_name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Awarded {pb.awarded_at.split("T")[0]}
                        {pb.notes ? ` • ${pb.notes}` : ""}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Award Badge Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">Award Badge</h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Player *</label>
                <select
                  value={selectedPlayer}
                  onChange={(e) => setSelectedPlayer(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-tennis-400"
                >
                  <option value="">Select a player</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.preferred_name || p.first_name} {p.last_name} ({p.skill_stage})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Badge *</label>
                <select
                  value={selectedBadge}
                  onChange={(e) => setSelectedBadge(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-tennis-400"
                >
                  <option value="">Select a badge</option>
                  {BADGE_DEFINITIONS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-tennis-400"
                  placeholder="Optional notes about why this badge was awarded"
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
                  onClick={handleAward}
                  disabled={!selectedPlayer || !selectedBadge}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-medium text-white",
                    !selectedPlayer || !selectedBadge
                      ? "bg-slate-300 cursor-not-allowed"
                      : "bg-tennis-600 hover:bg-tennis-700"
                  )}
                >
                  Award
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
