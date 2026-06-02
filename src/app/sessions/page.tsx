"use client";
import { useState, useMemo, useEffect } from "react";
import { DemoNav } from "@/components/layout/DemoNav";
import { useData } from "@/contexts/DataContext";
import RouteGuard from "@/components/RouteGuard";
import { Clock, MapPin, Users, Plus, X } from "lucide-react";
import { cn, formatDate, formatTime, stageBgClass, stageTextClass } from "@/lib/utils";
import { Session, AttendanceRecord, SkillStage } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function isToday(dateIso: string) {
  return dateIso === new Date().toISOString().split("T")[0];
}

/* ------------------------------------------------------------------ */
/*  NewSessionModal                                                   */
/* ------------------------------------------------------------------ */

function NewSessionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addSession, groups, settings } = useData();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [timeStart, setTimeStart] = useState("");
  const [timeEnd, setTimeEnd] = useState("");
  const [location, setLocation] = useState("");
  const [groupId, setGroupId] = useState("");
  const [theme, setTheme] = useState("");
  const [stageFocus, setStageFocus] = useState<SkillStage | "">("");
  const [notes, setNotes] = useState("");
  const [capacity, setCapacity] = useState<number | "">("");

  const reset = () => {
    setTitle("");
    setDate("");
    setTimeStart("");
    setTimeEnd("");
    setLocation("");
    setGroupId("");
    setTheme("");
    setStageFocus("");
    setNotes("");
    setCapacity("");
  };

  useEffect(() => {
    if (open) reset();
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !timeStart || !timeEnd || !location || !groupId) return;

    addSession({
      title,
      date,
      time_start: timeStart,
      time_end: timeEnd,
      location,
      group_id: groupId,
      coach_ids: [],
      capacity: typeof capacity === "number" ? capacity : 20,
      status: "scheduled",
      theme: theme || undefined,
      stage_focus: stageFocus || undefined,
      notes: notes || undefined,
    });

    reset();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">Schedule Session</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tennis-500"
              placeholder="e.g. Red Ball Fundamentals"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tennis-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Capacity</label>
              <input
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tennis-500"
                placeholder="20"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
              <input
                type="time"
                required
                value={timeStart}
                onChange={(e) => setTimeStart(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tennis-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
              <input
                type="time"
                required
                value={timeEnd}
                onChange={(e) => setTimeEnd(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tennis-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
              <select
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tennis-500 bg-white"
              >
                <option value="">Select location</option>
                {settings.locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Group</label>
              <select
                required
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tennis-500 bg-white"
              >
                <option value="">Select group</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Theme</label>
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tennis-500"
                placeholder="e.g. Groundstrokes"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Stage Focus</label>
              <select
                value={stageFocus}
                onChange={(e) => setStageFocus(e.target.value as SkillStage)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tennis-500 bg-white"
              >
                <option value="">Select stage</option>
                <option value="red">Red</option>
                <option value="orange">Orange</option>
                <option value="green">Green</option>
                <option value="yellow">Yellow</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tennis-500"
              placeholder="Optional session notes..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 border border-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-tennis-600 text-white hover:bg-tennis-700"
            >
              Create Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TakeAttendanceModal                                               */
/* ------------------------------------------------------------------ */

function TakeAttendanceModal({
  session,
  open,
  onClose,
}: {
  session: Session | null;
  open: boolean;
  onClose: () => void;
}) {
  const { players, attendance, saveAttendance } = useData();

  const groupPlayers = useMemo(() => {
    if (!session) return [];
    return players.filter((p) => p.group_id === session.group_id && p.status === "active");
  }, [players, session]);

  const existing = useMemo(() => {
    if (!session) return new Map<string, AttendanceRecord>();
    return new Map(
      attendance
        .filter((a) => a.session_id === session.id)
        .map((a) => [a.player_id, a])
    );
  }, [attendance, session]);

  const [records, setRecords] = useState<Map<string, AttendanceRecord["status"]>>(new Map());

  useEffect(() => {
    if (!open || !session) return;
    const next = new Map<string, AttendanceRecord["status"]>();
    existing.forEach((rec, playerId) => {
      next.set(playerId, rec.status);
    });
    setRecords(next);
  }, [open, session?.id]);

  if (!open || !session) return null;

  const toggleStatus = (playerId: string, status: AttendanceRecord["status"]) => {
    setRecords((prev) => {
      const next = new Map(prev);
      next.set(playerId, status);
      return next;
    });
  };

  const handleSave = () => {
    const payload = groupPlayers.map((p) => ({
      player_id: p.id,
      status: records.get(p.id) || "present",
      parent_notified: false,
    }));
    saveAttendance(session.id, payload);
    onClose();
  };

  const statuses: AttendanceRecord["status"][] = ["present", "absent", "late", "excused"];

  const statusLabel: Record<string, string> = {
    present: "Present",
    absent: "Absent",
    late: "Late",
    excused: "Excused",
  };

  const statusBtnClass = (active: boolean, status: AttendanceRecord["status"]) => {
    const base = "px-2.5 py-1 rounded-md text-xs font-medium border transition-colors";
    if (!active) return `${base} bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100`;
    switch (status) {
      case "present":
        return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
      case "absent":
        return `${base} bg-red-50 text-red-700 border-red-200`;
      case "late":
        return `${base} bg-amber-50 text-amber-700 border-amber-200`;
      case "excused":
        return `${base} bg-blue-50 text-blue-700 border-blue-200`;
      default:
        return `${base} bg-slate-50 text-slate-500 border-slate-200`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Take Attendance</h2>
            <p className="text-xs text-slate-500">
              {session.title} • {formatDate(session.date)}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-2">
          {groupPlayers.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-6">No active players in this group.</p>
          )}
          {groupPlayers.map((player) => {
            const current = records.get(player.id) || "present";
            return (
              <div
                key={player.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600">
                    {player.first_name[0]}
                    {player.last_name[0]}
                  </div>
                  <span className="text-sm font-medium text-slate-800">
                    {player.first_name} {player.last_name}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {statuses.map((s) => (
                    <button
                      key={s}
                      onClick={() => toggleStatus(player.id, s)}
                      className={statusBtnClass(current === s, s)}
                    >
                      {statusLabel[s]}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 border border-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-tennis-600 text-white hover:bg-tennis-700"
          >
            Save Attendance
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SessionsPage                                                      */
/* ------------------------------------------------------------------ */

export default function SessionsPage() {
  const { sessions, players, attendance, groups } = useData();
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [attendanceSession, setAttendanceSession] = useState<Session | null>(null);

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => a.date.localeCompare(b.date)),
    [sessions]
  );

  const getAttendanceForSession = (sessionId: string) => {
    return attendance.filter((a) => a.session_id === sessionId);
  };

  const getGroupName = (groupId?: string) => {
    if (!groupId) return "";
    return groups.find((g) => g.id === groupId)?.name || "";
  };

  return (
    <RouteGuard>
    <div className="min-h-screen bg-slate-50">
      <DemoNav />
      <main className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Practice Sessions</h1>
            <p className="text-sm text-slate-500">{sessions.length} sessions scheduled</p>
          </div>
          <button
            onClick={() => setNewModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-tennis-600 text-white rounded-lg text-xs font-medium hover:bg-tennis-700"
          >
            <Plus className="w-4 h-4" /> Schedule Session
          </button>
        </div>

        {/* Session Cards */}
        <div className="space-y-3">
          {sortedSessions.map((session) => {
            const att = getAttendanceForSession(session.id);
            const present = att.filter((a) => a.status === "present" || a.status === "late").length;
            const total = players.filter((p) => p.group_id === session.group_id && p.status === "active").length;
            const today = isToday(session.date);
            return (
              <div
                key={session.id}
                className={cn(
                  "bg-white rounded-xl border shadow-sm p-4 md:p-5",
                  today ? "border-tennis-300 ring-1 ring-tennis-100" : "border-slate-100"
                )}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0",
                        session.status === "completed"
                          ? "bg-emerald-50 text-emerald-700"
                          : today
                          ? "bg-tennis-50 text-tennis-700"
                          : "bg-slate-50 text-slate-700"
                      )}
                    >
                      <span className="text-[10px] font-bold uppercase">
                        {new Date(session.date).toLocaleDateString("en-US", { month: "short" })}
                      </span>
                      <span className="text-lg font-bold leading-none">
                        {new Date(session.date).getDate()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-800">{session.title}</h3>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize",
                            session.status === "scheduled"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : session.status === "completed"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : session.status === "cancelled"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          )}
                        >
                          {session.status}
                        </span>
                        {session.stage_focus && (
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-medium border",
                              stageBgClass(session.stage_focus),
                              stageTextClass(session.stage_focus)
                            )}
                          >
                            {session.stage_focus}
                          </span>
                        )}
                        {today && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-tennis-100 text-tennis-700 border border-tennis-200">
                            Today
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatTime(session.time_start)} – {formatTime(session.time_end)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {session.location}
                        </span>
                        {session.theme && <span className="capitalize">Theme: {session.theme}</span>}
                        {getGroupName(session.group_id) && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {getGroupName(session.group_id)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-700">
                        {present}/{total}
                      </p>
                      <p className="text-xs text-slate-500">attending</p>
                    </div>
                    <button
                      onClick={() => setAttendanceSession(session)}
                      className="px-3 py-1.5 bg-tennis-50 text-tennis-700 text-xs font-medium rounded-lg border border-tennis-100 hover:bg-tennis-100 transition-colors"
                    >
                      Take Attendance
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <NewSessionModal open={newModalOpen} onClose={() => setNewModalOpen(false)} />
      <TakeAttendanceModal
        session={attendanceSession}
        open={!!attendanceSession}
        onClose={() => setAttendanceSession(null)}
      />
    </div>
    </RouteGuard>
  );
}
