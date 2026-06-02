"use client";
import { useAuth } from "@/contexts/AuthContext";
import { DemoNav } from "@/components/layout/DemoNav";
import RouteGuard from "@/components/RouteGuard";
import { useData } from "@/contexts/DataContext";
import { STAGE_INFO } from "@/lib/types";
import type { SkillStage } from "@/lib/types";
import {
  Users,
  CalendarDays,
  ClipboardCheck,
  TrendingUp,
  Award,
  Bell,
  ChevronRight,
  UserPlus,
  ListChecks,
  FileText,
  Megaphone,
  BarChart3,
  CircleDot,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { cn, formatTime, stageBgClass, stageTextClass } from "@/lib/utils";

function QuickAction({ icon: Icon, label, href, color }: any) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-tennis-200 transition-all text-center"
    >
      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-xs font-medium text-slate-700 leading-tight">{label}</span>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { players, sessions, attendance, assessments, announcements, groups } = useData();

  const todayISO = new Date().toISOString().split("T")[0];
  const todaySessions = sessions.filter((s) => s.date === todayISO);
  const upcoming = sessions.filter((s) => s.date >= todayISO);
  const latestAnnouncements = announcements.slice(0, 3);

  const total_players = players.length;
  const active_players = players.filter((p) => p.status === "active").length;
  const today_sessions = todaySessions.length;
  const attendance_rate =
    attendance.length > 0
      ? Math.round(
          (attendance.filter((a) => a.status === "present" || a.status === "late").length /
            attendance.length) *
            100
        )
      : 0;
  const recent_assessments = assessments.length;

  const stage_distribution: Record<SkillStage, number> = { red: 0, orange: 0, green: 0, yellow: 0 };
  players.forEach((p) => {
    if (p.skill_stage in stage_distribution) {
      stage_distribution[p.skill_stage] = (stage_distribution[p.skill_stage] || 0) + 1;
    }
  });

  const needs_attention = players
    .filter((p) => p.status !== "active" || !!p.medical_notes || !!p.allergies)
    .slice(0, 3);

  const isParent = user?.role === "parent" || user?.role === "viewer";

  return (
    <RouteGuard>
    <div className="min-h-screen bg-slate-50">
      <DemoNav />
      <main className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
            <p className="text-sm text-slate-500">Hello, {user?.fullName} 👋</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/communication"
              className="relative p-2 bg-white rounded-full shadow-sm border text-slate-600 hover:text-tennis-600"
            >
              <Bell className="w-5 h-5" />
              {latestAnnouncements.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full">
                  {latestAnnouncements.length}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        {!isParent && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatCard
              icon={Users}
              label="Players"
              value={total_players.toString()}
              sub={`${active_players} active`}
              color="bg-blue-100 text-blue-600"
            />
            <StatCard
              icon={CalendarDays}
              label="Today"
              value={today_sessions.toString()}
              sub="sessions scheduled"
              color="bg-tennis-100 text-tennis-600"
            />
            <StatCard
              icon={ClipboardCheck}
              label="Attendance"
              value={`${attendance_rate}%`}
              sub={`${attendance.length} records`}
              color="bg-emerald-100 text-emerald-600"
            />
            <StatCard
              icon={TrendingUp}
              label="Assessments"
              value={recent_assessments.toString()}
              sub="total recorded"
              color="bg-amber-100 text-amber-600"
            />
          </div>
        )}

        {/* Quick Actions */}
        {!isParent && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide">Quick Actions</h2>
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
              <QuickAction icon={UserPlus} label="Add Player" href="/roster/add" color="bg-blue-50 text-blue-600" />
              <QuickAction icon={ListChecks} label="Take Attendance" href="/sessions" color="bg-tennis-50 text-tennis-600" />
              <QuickAction icon={FileText} label="Practice Plan" href="/practice-plans" color="bg-purple-50 text-purple-600" />
              <QuickAction icon={Megaphone} label="Announcement" href="/communication" color="bg-amber-50 text-amber-600" />
              <QuickAction icon={BarChart3} label="Assessment" href="/assessments" color="bg-rose-50 text-rose-600" />
              <QuickAction icon={Award} label="Award Badge" href="/badges" color="bg-yellow-50 text-yellow-600" />
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* Left: sessions + stage dist */}
          <div className="md:col-span-2 space-y-4">
            {/* Today's Sessions */}
            <Card title="Today's Practice" icon={CalendarDays} href="/sessions" actionLabel="All sessions →">
              {todaySessions.length === 0 ? (
                <EmptyState message="No practice scheduled today" submessage="Schedule a session to get started" />
              ) : (
                <div className="divide-y divide-slate-100">
                  {todaySessions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-tennis-50 flex flex-col items-center justify-center text-tennis-700 font-bold text-sm shrink-0">
                          {formatTime(s.time_start)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 text-sm">{s.title}</p>
                          <p className="text-xs text-slate-500">
                            {s.location} • {groups.find((g) => g.id === s.group_id)?.name || s.stage_focus}
                          </p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium border",
                          stageBgClass(s.stage_focus || ""),
                          stageTextClass(s.stage_focus || "")
                        )}
                      >
                        {s.stage_focus}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Stage Distribution */}
            {!isParent && (
              <Card title="Skill Stage Distribution" icon={CircleDot}>
                <div className="flex items-end justify-around h-28 px-4">
                  {(Object.keys(stage_distribution) as SkillStage[]).map((stage) => {
                    const count = stage_distribution[stage];
                    const pct = players.length ? (count / players.length) * 100 : 0;
                    return (
                      <div key={stage} className="flex flex-col items-center gap-2">
                        <div className="text-xs font-bold" style={{ color: STAGE_INFO[stage]?.color }}>
                          {count}
                        </div>
                        <div
                          className="w-10 rounded-t-lg transition-all"
                          style={{
                            height: `${Math.max(pct, 10)}%`,
                            backgroundColor: STAGE_INFO[stage]?.color,
                          }}
                        />
                        <div className="text-xs font-medium capitalize" style={{ color: STAGE_INFO[stage]?.color }}>
                          {stage}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>

          {/* Right: announcements + attention */}
          <div className="space-y-4">
            <Card title="Announcements" icon={Bell} href="/communication" actionLabel="New →">
              {latestAnnouncements.length === 0 && (
                <p className="text-xs text-slate-500 py-2">No announcements yet.</p>
              )}
              {latestAnnouncements.map((a) => (
                <div key={a.id} className="py-2 border-b border-slate-50 last:border-0">
                  <p className="text-sm font-medium text-slate-800">{a.title}</p>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{a.content}</p>
                </div>
              ))}
            </Card>

            <Card title="Needs Attention" icon={TrendingUp}>
              <div className="space-y-2 py-1">
                {needs_attention.length === 0 && (
                  <p className="text-xs text-slate-500 py-2">No players need attention right now. 🎉</p>
                )}
                {needs_attention.map((p) => {
                  let label = "";
                  let tag = "";
                  if (p.status !== "active") {
                    label = `${p.preferred_name || p.first_name} ${p.last_name}`;
                    tag = "status";
                  } else if (p.medical_notes) {
                    label = `${p.preferred_name || p.first_name} ${p.last_name}`;
                    tag = "medical";
                  } else if (p.allergies) {
                    label = `${p.preferred_name || p.first_name} ${p.last_name}`;
                    tag = "allergy";
                  } else {
                    label = `${p.preferred_name || p.first_name} ${p.last_name}`;
                    tag = "note";
                  }
                  return (
                    <AttentionRow
                      key={p.id}
                      label={label}
                      sublabel={
                        p.status !== "active"
                          ? `Status: ${p.status}`
                          : p.medical_notes
                          ? `Medical: ${p.medical_notes.slice(0, 40)}${p.medical_notes.length > 40 ? "..." : ""}`
                          : p.allergies
                          ? `Allergy: ${p.allergies}`
                          : "Needs review"
                      }
                      tag={tag}
                    />
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
    </RouteGuard>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: any) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xl font-bold text-slate-800">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
          {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function Card({ children, title, icon: Icon, href, actionLabel }: any) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-slate-400" />}
          <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        </div>
        {href && actionLabel && (
          <Link href={href} className="text-xs font-medium text-tennis-600 hover:underline flex items-center gap-0.5">
            {actionLabel} <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      <div className="px-4 py-2">{children}</div>
    </div>
  );
}

function EmptyState({ message, submessage }: any) {
  return (
    <div className="py-8 text-center">
      <p className="text-sm text-slate-500 font-medium">{message}</p>
      {submessage && <p className="text-xs text-slate-400 mt-1">{submessage}</p>}
    </div>
  );
}

function AttentionRow({ label, sublabel, tag }: any) {
  const tagColors: Record<string, string> = {
    skill: "bg-blue-100 text-blue-700",
    attendance: "bg-amber-100 text-amber-700",
    wellbeing: "bg-rose-100 text-rose-700",
    status: "bg-slate-100 text-slate-700",
    medical: "bg-red-100 text-red-700",
    allergy: "bg-orange-100 text-orange-700",
    note: "bg-slate-100 text-slate-600",
  };
  return (
    <div className="flex items-center justify-between py-1.5">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-500">{sublabel}</p>
      </div>
      <span
        className={cn(
          "px-2 py-0.5 rounded text-[10px] font-medium",
          tagColors[tag] || "bg-slate-100 text-slate-600"
        )}
      >
        {tag}
      </span>
    </div>
  );
}
