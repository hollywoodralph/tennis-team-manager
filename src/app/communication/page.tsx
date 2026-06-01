"use client";
import { useState } from "react";
import { DemoNav } from "@/components/layout/DemoNav";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import RouteGuard from "@/components/RouteGuard";
import { Megaphone, Plus, BookTemplate, X } from "lucide-react";
import { cn } from "@/lib/utils";

const TEMPLATES: Record<string, { title: string; content: string; audience: "all" | "group" | "parent" | "coach" }> = {
  "Practice reminder": {
    title: "Practice Reminder",
    content: "Just a friendly reminder that practice is on tomorrow. Please bring your racket, water bottle, and enthusiasm!",
    audience: "all",
  },
  "Weather delay": {
    title: "Weather Delay",
    content: "Due to inclement weather, today's practice will be delayed by 30 minutes. We will monitor conditions and update you if anything changes.",
    audience: "all",
  },
  "Equipment reminder": {
    title: "Equipment Reminder",
    content: "Please ensure your child brings the required equipment: racket, water bottle, and appropriate shoes. We have spare equipment if needed.",
    audience: "parent",
  },
  "Registration open": {
    title: "Registration Open",
    content: "Registration for the upcoming term is now open! Secure your spot early as spaces are limited.",
    audience: "all",
  },
  "Stage promotion": {
    title: "Stage Promotion",
    content: "Congratulations! Several players have been recommended to move up to the next stage based on recent assessments. Coaches will reach out individually with details.",
    audience: "parent",
  },
};

export default function CommunicationPage() {
  const { user } = useAuth();
  const { announcements, groups, addAnnouncement } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState<"all" | "group" | "parent" | "coach">("all");
  const [groupId, setGroupId] = useState("");

  const canSend = user?.role === "admin" || user?.role === "coach";

  const openModal = () => {
    setTitle("");
    setContent("");
    setAudience("all");
    setGroupId("");
    setIsOpen(true);
  };

  const applyTemplate = (key: string) => {
    const t = TEMPLATES[key];
    if (t) {
      setTitle(t.title);
      setContent(t.content);
      setAudience(t.audience);
    }
    setIsOpen(true);
  };

  const handleSend = () => {
    if (!title.trim() || !content.trim()) return;
    if (!user?.id) return;
    addAnnouncement({
      title: title.trim(),
      content: content.trim(),
      audience,
      group_id: audience === "group" ? groupId || undefined : undefined,
      sent_by: user.id,
    });
    setIsOpen(false);
  };

 return (
    <RouteGuard>
   <div className="min-h-screen bg-slate-50">
      <DemoNav />
      <main className="p-4 md:p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Communication Center</h1>
            <p className="text-sm text-slate-500">Announcements and parent messages</p>
          </div>
          {canSend && (
            <button
              onClick={openModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-tennis-600 text-white rounded-lg text-xs font-medium hover:bg-tennis-700"
            >
              <Plus className="w-4 h-4" /> New Announcement
            </button>
          )}
        </div>

        {/* Templates */}
        {canSend && (
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <BookTemplate className="w-4 h-4 text-tennis-500" />
              <h3 className="text-sm font-semibold text-slate-700">Quick Templates</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.keys(TEMPLATES).map((t) => (
                <button
                  key={t}
                  onClick={() => applyTemplate(t)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-600 hover:bg-slate-100"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Announcements */}
        <div className="space-y-3">
          {announcements.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-8 text-center">
              <p className="text-sm text-slate-500">No announcements yet.</p>
            </div>
          )}
          {announcements.map((a) => (
            <div key={a.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-tennis-50 flex items-center justify-center shrink-0">
                  <Megaphone className="w-4 h-4 text-tennis-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-slate-800 text-sm">{a.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 whitespace-pre-line">{a.content}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                    <span className="capitalize">Audience: {a.audience}</span>
                    {a.group_id && (
                      <span>Group: {groups.find((g) => g.id === a.group_id)?.name || a.group_id}</span>
                    )}
                    <span>Sent {a.sent_at.split("T")[0]}</span>
                    <span>Read by {a.read_count ?? 0} parents</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* New Announcement Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-800">New Announcement</h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-tennis-400"
                  placeholder="Announcement title"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Content *</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-tennis-400"
                  placeholder="What do you want to communicate?"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Audience *</label>
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-tennis-400"
                >
                  <option value="all">All</option>
                  <option value="group">Specific Group</option>
                  <option value="parent">Parents</option>
                  <option value="coach">Coaches</option>
                </select>
              </div>
              {audience === "group" && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Group</label>
                  <select
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-tennis-400"
                  >
                    <option value="">Select a group</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={!title.trim() || !content.trim()}
                  className={cn(
                    "px-3 py-2 rounded-lg text-xs font-medium text-white",
                    !title.trim() || !content.trim()
                      ? "bg-slate-300 cursor-not-allowed"
                      : "bg-tennis-600 hover:bg-tennis-700"
                  )}
                >
                  Send
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
