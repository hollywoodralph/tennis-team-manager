"use client";
import { useState } from "react";
import { DemoNav } from "@/components/layout/DemoNav";
import { useData } from "@/contexts/DataContext";
import RouteGuard from "@/components/RouteGuard";
import { STAGE_INFO } from "@/lib/types";
import { Users, Plus, X } from "lucide-react";

export default function GroupsPage() {
  const { groups, addGroup, deleteGroup, players } = useData();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [stage, setStage] = useState<"red" | "orange" | "green" | "yellow">("red");
  const [capacity, setCapacity] = useState(8);
  const [notes, setNotes] = useState("");

  function handleAdd() {
    if (!name.trim() || !ageRange.trim()) return;
    addGroup({ name: name.trim(), age_range: ageRange.trim(), stage, capacity, notes: notes.trim(), color: STAGE_INFO[stage].color });
    setModalOpen(false);
    setName(""); setAgeRange(""); setStage("red"); setCapacity(8); setNotes("");
  }

  return (
    <RouteGuard>
    <div className="min-h-screen bg-slate-50">
      <DemoNav />
      <main className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Groups & Classes</h1>
            <p className="text-sm text-slate-500">{groups.length} groups • {players.filter(p => p.status === "active").length} active players</p>
          </div>
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 px-3 py-2 bg-tennis-600 text-white rounded-lg text-xs font-medium hover:bg-tennis-700">
            <Plus className="w-4 h-4" /> Add Group
          </button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {groups.map(g => {
            const info = STAGE_INFO[g.stage];
            const groupPlayers = players.filter(p => p.group_id === g.id && p.status === "active");
            return (
              <div key={g.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 relative group">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => deleteGroup(g.id)} className="p-1 rounded hover:bg-red-50 text-red-500"><X className="w-3.5 h-3.5" /></button>
                </div>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold mb-2" style={{ backgroundColor: g.color }}>
                  {g.name.slice(0,1)}
                </div>
                <h3 className="font-semibold text-slate-800 text-sm">{g.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{g.age_range} years • {info.name}</p>
                <p className="text-xs text-slate-400 mt-1">Capacity: {groupPlayers.length}/{g.capacity}</p>
                {g.notes && <p className="text-xs text-slate-400 mt-1">{g.notes}</p>}
              </div>
            );
          })}
        </div>
      </main>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Create New Group</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600">Group Name *</label>
                <input className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Tiny Stars" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Age Range *</label>
                <input className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={ageRange} onChange={e => setAgeRange(e.target.value)} placeholder="e.g. 6-8" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Stage</label>
                <select className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={stage} onChange={e => setStage(e.target.value as any)}>
                  <option value="red">Red Ball</option>
                  <option value="orange">Orange Ball</option>
                  <option value="green">Green Ball</option>
                  <option value="yellow">Yellow Ball</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Capacity</label>
                <input type="number" className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={capacity} onChange={e => setCapacity(Number(e.target.value))} min={1} max={50} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">Notes</label>
                <textarea className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModalOpen(false)} className="flex-1 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200">Cancel</button>
              <button onClick={handleAdd} className="flex-1 px-3 py-2 bg-tennis-600 text-white rounded-lg text-sm font-medium hover:bg-tennis-700">Create Group</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </RouteGuard>
  );
}
