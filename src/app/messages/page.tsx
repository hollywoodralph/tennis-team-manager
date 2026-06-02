"use client";
import { useState, useEffect, useRef } from "react";
import { DemoNav } from "@/components/layout/DemoNav";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import RouteGuard from "@/components/RouteGuard";
import { Modal } from "@/components/Modal";
import { EmptyState } from "@/components/EmptyState";
import { MessageCircle, Send, Plus, ChevronRight, User, Clock, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatTime } from "@/lib/utils";

interface Thread {
  id: string;
  subject: string;
  playerId?: string;
  lastMessageAt: string;
}

interface Member {
  userId: string;
  fullName: string;
  role: string;
}

interface Message {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  senderName?: string;
  senderRole?: string;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { showToast } = useData();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [activeThreadDetail, setActiveThreadDetail] = useState<{ thread: any; members: Member[]; messages: Message[] } | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadThreads();
  }, []);

  useEffect(() => {
    if (activeThread) {
      loadThread(activeThread);
    }
  }, [activeThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThreadDetail?.messages.length]);

  const loadThreads = async () => {
    try {
      const res = await fetch("/api/messages", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setThreads(data.threads || []);
        if (!activeThread && data.threads?.[0]) {
          setActiveThread(data.threads[0].id);
        }
      }
    } catch (e) {
      // API not available — show empty
    }
  };

  const loadThread = async (threadId: string) => {
    try {
      const res = await fetch(`/api/messages?threadId=${threadId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setActiveThreadDetail(data);
      }
    } catch {}
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !activeThread) return;
    const body = newMessage;
    setNewMessage("");
    // Optimistic add
    setActiveThreadDetail((prev) =>
      prev
        ? {
            ...prev,
            messages: [
              ...prev.messages,
              { id: "temp-" + Date.now(), body, createdAt: new Date().toISOString(), senderId: user!.id, senderName: user!.fullName, senderRole: user!.role },
            ],
          }
        : prev
    );
    try {
      const res = await fetch("/api/messages?action=message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ threadId: activeThread, body }),
      });
      if (res.ok) {
        loadThread(activeThread);
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to send", "error");
      }
    } catch (e) {
      showToast("Failed to send (offline?)", "error");
    }
  };

  return (
    <RouteGuard>
      <div className="min-h-screen bg-slate-50">
        <DemoNav />
        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <MessageCircle className="w-6 h-6 text-tennis-600" />
                Messages
              </h1>
              <p className="text-sm text-slate-500">Direct chat with coaches, parents, and admins</p>
            </div>
            <button
              onClick={() => setNewOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-tennis-600 text-white rounded-lg text-xs font-medium hover:bg-tennis-700"
            >
              <Plus className="w-4 h-4" /> New Thread
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-4 h-[calc(100vh-220px)] min-h-[500px]">
            {/* Thread list */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
              <div className="p-3 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search threads..."
                    className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-tennis-400 outline-none"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {threads.length === 0 ? (
                  <div className="p-6">
                    <EmptyState
                      icon={MessageCircle}
                      title="No conversations yet"
                      description="Start a thread with a coach, parent, or admin."
                      variant="subtle"
                    />
                  </div>
                ) : (
                  <div>
                    {threads
                      .filter((t) => !search || t.subject.toLowerCase().includes(search.toLowerCase()))
                      .map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setActiveThread(t.id)}
                          className={cn(
                            "w-full text-left px-3 py-2.5 border-b border-slate-50 hover:bg-slate-50 transition-colors flex items-center gap-2",
                            activeThread === t.id && "bg-tennis-50"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-sm font-medium truncate", activeThread === t.id ? "text-tennis-700" : "text-slate-800")}>
                              {t.subject}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {formatDate(t.lastMessageAt)} · {formatTime(t.lastMessageAt)}
                            </p>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Active thread */}
            <div className="md:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
              {!activeThreadDetail ? (
                <div className="flex-1 flex items-center justify-center">
                  <EmptyState
                    icon={MessageCircle}
                    title="Select a conversation"
                    description="Or start a new thread to begin chatting."
                    variant="default"
                  />
                </div>
              ) : (
                <>
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold text-slate-800">{activeThreadDetail.thread.subject}</h2>
                      <p className="text-xs text-slate-500">
                        {activeThreadDetail.members.length} participants
                      </p>
                    </div>
                    <div className="flex -space-x-2">
                      {activeThreadDetail.members.slice(0, 3).map((m) => (
                        <div
                          key={m.userId}
                          className="w-7 h-7 rounded-full bg-gradient-to-br from-tennis-400 to-tennis-600 flex items-center justify-center text-white text-xs font-bold border-2 border-white"
                          title={m.fullName}
                        >
                          {m.fullName?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "?"}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
                    {activeThreadDetail.messages.map((msg) => {
                      const isMe = msg.senderId === user?.id;
                      return (
                        <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                          <div className={cn("max-w-[75%]", isMe ? "items-end" : "items-start")}>
                            {!isMe && (
                              <p className="text-[11px] text-slate-500 mb-0.5 ml-1">
                                {msg.senderName} <span className="text-slate-400 capitalize">({msg.senderRole})</span>
                              </p>
                            )}
                            <div
                              className={cn(
                                "px-3.5 py-2 rounded-2xl text-sm",
                                isMe
                                  ? "bg-tennis-600 text-white rounded-br-sm"
                                  : "bg-white border border-slate-100 text-slate-800 rounded-bl-sm"
                              )}
                            >
                              {msg.body}
                            </div>
                            <p className={cn("text-[10px] text-slate-400 mt-0.5", isMe ? "mr-1" : "ml-1")}>
                              {formatTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-3 border-t border-slate-100 flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSend()}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-tennis-400 outline-none"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!newMessage.trim()}
                      className="px-4 py-2 bg-tennis-600 text-white rounded-lg text-sm font-medium hover:bg-tennis-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      <Send className="w-4 h-4" /> Send
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </RouteGuard>
  );
}
