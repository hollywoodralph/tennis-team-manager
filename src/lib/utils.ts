import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatTime(isoOrTime: string) {
  // Accepts "HH:MM" or ISO string
  if (isoOrTime.includes("T")) {
    return new Date(isoOrTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  const [h, m] = isoOrTime.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function stageColor(stage: string) {
  switch (stage) {
    case "red": return "#ef4444";
    case "orange": return "#f97316";
    case "green": return "#16a34a";
    case "yellow": return "#eab308";
    default: return "#64748b";
  }
}

export function stageBgClass(stage: string) {
  switch (stage) {
    case "red": return "bg-red-50 border-red-200";
    case "orange": return "bg-orange-50 border-orange-200";
    case "green": return "bg-green-50 border-green-200";
    case "yellow": return "bg-yellow-50 border-yellow-200";
    default: return "bg-slate-50 border-slate-200";
  }
}

export function stageTextClass(stage: string) {
  switch (stage) {
    case "red": return "text-red-700";
    case "orange": return "text-orange-700";
    case "green": return "text-green-700";
    case "yellow": return "text-yellow-700";
    default: return "text-slate-600";
  }
}

export function experienceLabel(level: string) {
  const labels: Record<string, string> = {
    new_beginner: "New Beginner",
    beginner: "Beginner",
    developing: "Developing",
    intermediate: "Intermediate",
    advanced_youth: "Advanced Youth",
  };
  return labels[level] || level;
}

export function attendanceBadgeColor(status: string) {
  switch (status) {
    case "present": return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "absent": return "bg-red-100 text-red-700 border-red-200";
    case "late": return "bg-amber-100 text-amber-700 border-amber-200";
    case "excused": return "bg-blue-100 text-blue-700 border-blue-200";
    case "makeup_needed": return "bg-purple-100 text-purple-700 border-purple-200";
    default: return "bg-slate-100 text-slate-700 border-slate-200";
  }
}
