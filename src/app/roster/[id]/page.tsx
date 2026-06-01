"use client";
import { DemoNav } from "@/components/layout/DemoNav";
import { useData } from "@/contexts/DataContext";
import { notFound } from "next/navigation";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Phone, Mail, AlertTriangle, Award, ClipboardList } from "lucide-react";
import Link from "next/link";
import { cn, stageBgClass, stageTextClass, formatDate } from "@/lib/utils";

export default function PlayerProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { players, attendance, sessions } = useData();
  const player = players.find(p => p.id === id);
  if (!player) return notFound();
  const playerAttendance = attendance.filter(a => a.player_id === id);
  const isAdminOrCoach = user?.role === "admin" || user?.role === "coach";
  return (
    <div className="min-h-screen bg-slate-50"><DemoNav />
      <main className="p-4 md:p-6 max-w-4xl mx-auto">
        <Link href="/roster" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-tennis-600 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to roster
        </Link>
        {/* Profile Header */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-4">
          <div className="flex items-start gap-4">
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold", stageBgClass(player.skill_stage), stageTextClass(player.skill_stage))}>
              {(player.preferred_name || player.first_name).slice(0, 2)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-800">{player.preferred_name || player.first_name} {player.last_name}</h1>
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border", stageBgClass(player.skill_stage), stageTextClass(player.skill_stage))}>{player.skill_stage}</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100 text-xs text-slate-600 capitalize">{player.status}</span>
              </div>
              <p className="text-sm text-slate-500 mt-1">Age {player.age} • Born {formatDate(player.date_of_birth)} • {player.dominant_hand === "left" ? "Left" : "Right"}-handed</p>
              <p className="text-sm text-slate-500 mt-1">{player.experience_level.replace("_", " ")}</p>
            </div>
          </div>
        </div>
        {/* Info Grid */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Parent/Guardians</h3>
            {player.guardians.map(g => (
              <div key={g.id} className="flex items-start gap-2 py-2 border-b border-slate-50 last:border-0">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{g.full_name} <span className="text-xs text-slate-400">({g.relationship})</span></p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{g.email}</span>
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{g.phone}</span>
                  </div>
                  {g.is_emergency_contact && <span className="inline-block mt-1 px-2 py-0.5 bg-red-50 text-red-600 text-[10px] rounded-full font-medium">Emergency Contact</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Medical & Safety</h3>
            {player.allergies !== "None" && (
              <div className="flex items-center gap-2 mb-2 p-2 bg-red-50 rounded-lg text-red-700 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="font-medium">Allergy: {player.allergies}</span>
              </div>
            )}
            {player.medical_notes && <p className="text-sm text-slate-600 mb-2">{player.medical_notes}</p>}
            <div className="flex flex-wrap gap-2 mt-2">
              {player.photo_consent && <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">📷 Photo OK</span>}
              {player.video_consent && <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">🎥 Video OK</span>}
              {player.participation_consent && <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs rounded-full">✓ Participation OK</span>}
            </div>
          </div>
        </div>
        {/* Attendance */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Attendance History</h3>
          {playerAttendance.length === 0 ? <p className="text-sm text-slate-500">No attendance records yet.</p> : (
            <div className="divide-y divide-slate-50">
              {playerAttendance.map(a => (
                <div key={a.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">{sessions.find(s => s.id === a.session_id)?.title || a.session_id}</span>
                  </div>
                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border capitalize",
                    a.status==="present" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                    a.status==="absent" ? "bg-red-100 text-red-700 border-red-200" :
                    a.status==="late" ? "bg-amber-100 text-amber-700 border-amber-200" :
                    "bg-slate-100 text-slate-700 border-slate-200")}>{a.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {isAdminOrCoach && player.coach_notes && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Coach Notes</h3>
            <p className="text-sm text-slate-600">{player.coach_notes}</p>
          </div>
        )}
      </main>
    </div>
  );
}
