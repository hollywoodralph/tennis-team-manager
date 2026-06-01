"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DemoNav } from "@/components/layout/DemoNav";
import { useData } from "@/contexts/DataContext";
import RouteGuard from "@/components/RouteGuard";
import { STAGE_INFO } from "@/lib/types";
import { formatTime, cn } from "@/lib/utils";
import { MapPin, ChevronLeft, ChevronRight } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Date helpers                                                      */
/* ------------------------------------------------------------------ */

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sun, 1 = Mon ...
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function addDays(d: Date, days: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + days);
  return date;
}

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* ------------------------------------------------------------------ */
/*  CalendarPage                                                      */
/* ------------------------------------------------------------------ */

export default function CalendarPage() {
  const { sessions } = useData();
  const router = useRouter();

  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const today = new Date();

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const monthYearLabel = useMemo(() => {
    const start = weekDays[0];
    const end = weekDays[6];
    const sameMonth = start.getMonth() === end.getMonth();
    const sameYear = start.getFullYear() === end.getFullYear();
    const fmt = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (sameMonth && sameYear) return fmt(start);
    if (sameYear) {
      return `${start.toLocaleDateString("en-US", { month: "long" })} – ${end.toLocaleDateString("en-US", { month: "long" })} ${start.getFullYear()}`;
    }
    return `${fmt(start)} – ${fmt(end)}`;
  }, [weekDays]);

  const sessionsByDay = useMemo(() => {
    const map = new Map<string, typeof sessions>();
    for (const s of sessions) {
      const list = map.get(s.date) || [];
      list.push(s);
      map.set(s.date, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.time_start.localeCompare(b.time_start));
    }
    return map;
  }, [sessions]);

  const goPrev = () => setWeekStart((prev) => addDays(prev, -7));
  const goNext = () => setWeekStart((prev) => addDays(prev, 7));
  const goToday = () => setWeekStart(getMonday(new Date()));

  return (
    <RouteGuard allowedRoles={["admin", "coach", "assistant", "parent"]}>
    <div className="min-h-screen bg-slate-50">
      <DemoNav />
      <main className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Calendar</h1>
            <p className="text-sm text-slate-500">{monthYearLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goPrev}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 bg-white"
            >
              <ChevronLeft className="w-4 h-4" /> Previous Week
            </button>
            <button
              onClick={goToday}
              className="px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 bg-white"
            >
              Today
            </button>
            <button
              onClick={goNext}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 bg-white"
            >
              Next Week <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2 h-[calc(100vh-12rem)]">
          {weekDays.map((day, idx) => {
            const iso = toISODate(day);
            const daySessions = sessionsByDay.get(iso) || [];
            const isToday = isSameDay(day, today);

            return (
              <div
                key={iso}
                className={cn(
                  "flex flex-col rounded-xl border overflow-hidden",
                  isToday
                    ? "bg-tennis-50/40 border-tennis-200"
                    : "bg-white border-slate-100"
                )}
              >
                {/* Day header */}
                <div
                  className={cn(
                    "px-3 py-2 text-center border-b",
                    isToday
                      ? "border-tennis-200 bg-tennis-50"
                      : "border-slate-100 bg-slate-50/50"
                  )}
                >
                  <p className="text-xs font-medium text-slate-500 uppercase">
                    {DAY_NAMES[idx]}
                  </p>
                  <p
                    className={cn(
                      "text-lg font-bold",
                      isToday ? "text-tennis-700" : "text-slate-800"
                    )}
                  >
                    {day.getDate()}
                  </p>
                </div>

                {/* Sessions list */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {daySessions.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center mt-4">
                      No sessions
                    </p>
                  ) : (
                    daySessions.map((session) => {
                      const stage = session.stage_focus;
                      const stageColor = stage
                        ? STAGE_INFO[stage]?.color
                        : undefined;

                      return (
                        <button
                          key={session.id}
                          onClick={() => router.push("/sessions")}
                          className={cn(
                            "w-full text-left rounded-lg border border-slate-100 bg-white p-3 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-1"
                          )}
                          style={
                            stageColor
                              ? {
                                  borderLeftWidth: "3px",
                                  borderLeftColor: stageColor,
                                }
                              : undefined
                          }
                        >
                          <span className="text-[10px] font-medium text-slate-500">
                            {formatTime(session.time_start)} –{" "}
                            {formatTime(session.time_end)}
                          </span>
                          <span className="text-sm font-semibold text-slate-800 leading-tight">
                            {session.title}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {stage && (
                              <span
                                className="inline-block w-2 h-2 rounded-full"
                                style={{ backgroundColor: stageColor }}
                              />
                            )}
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {session.location}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
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
