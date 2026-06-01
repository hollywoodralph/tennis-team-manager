"use client";
import { useState, useMemo } from "react";
import { DemoNav } from "@/components/layout/DemoNav";
import { useData } from "@/contexts/DataContext";
import RouteGuard from "@/components/RouteGuard";
import { Search, Filter, ChevronRight, UserPlus, Download, Upload } from "lucide-react";
import Link from "next/link";
import { cn, stageBgClass, stageTextClass } from "@/lib/utils";

export default function RosterPage() {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const { players: allPlayers } = useData();

  const players = useMemo(() => {
    let list = allPlayers;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        (p.first_name + " " + p.last_name).toLowerCase().includes(q) ||
        (p.preferred_name || "").toLowerCase().includes(q)
      );
    }
    if (stageFilter !== "all") list = list.filter(p => p.skill_stage === stageFilter);
    if (statusFilter !== "all") list = list.filter(p => p.status === statusFilter);
    return list;
  }, [search, stageFilter, statusFilter, allPlayers]);

  return (
    <RouteGuard allowedRoles={["admin", "coach", "assistant"]}>
    <div className="min-h-screen bg-slate-50">
      <DemoNav />
      <main className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Player Roster</h1>
            <p className="text-sm text-slate-500">{players.length} players</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              <Upload className="w-3.5 h-3.5" /> Import
            </button>
            <Link href="/roster/add" className="flex items-center gap-1.5 px-3 py-2 bg-tennis-600 text-white rounded-lg text-xs font-medium hover:bg-tennis-700"
            >
              <UserPlus className="w-3.5 h-3.5" /> Add Player
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search players..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-tennis-400 outline-none"
            />
          </div>
          <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-tennis-400"
          >
            <option value="all">All stages</option>
            <option value="red">Red Ball</option>
            <option value="orange">Orange Ball</option>
            <option value="green">Green Ball</option>
            <option value="yellow">Yellow Ball</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-tennis-400"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Player Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {players.map(player => (
            <Link key={player.id} href={`/roster/${player.id}`}
              className="group bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-tennis-200 transition-all p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs",
                    player.skill_stage === "red" ? "bg-red-100 text-red-700" : 
                    player.skill_stage === "orange" ? "bg-orange-100 text-orange-700" : 
                    player.skill_stage === "green" ? "bg-green-100 text-green-700" : 
                    "bg-yellow-100 text-yellow-700"
                  )}>
                    {(player.preferred_name || player.first_name).slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{player.preferred_name || player.first_name} {player.last_name}</p>
                    <p className="text-xs text-slate-500">Age {player.age} • {player.dominant_hand === "left" ? "Left" : player.dominant_hand === "both" ? "Both" : "Right"}-handed</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-tennis-400 transition-colors" />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={cn("px-2 py-0.5 rounded-full border capitalize font-medium", stageBgClass(player.skill_stage), stageTextClass(player.skill_stage))}>
                  {player.skill_stage}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100 text-slate-600 capitalize">
                  {player.experience_level.replace("_", " ")}
                </span>
                {player.equipment?.racket && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600">🎾</span>
                )}
                {player.allergies !== "None" && (
                  <span className="px-2 py-0.5 rounded-full bg-red-50 border border-red-100 text-red-600">⚠️</span>
                )}
              </div>
              <div className="mt-3 text-xs text-slate-500">
                {player.guardians[0]?.full_name || "No guardian"}
              </div>
            </Link>
          ))}
        </div>
        {players.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-slate-500">No players found matching your filters.</p>
          </div>
        )}
      </main>
    </div>
    </RouteGuard>
  );
}
