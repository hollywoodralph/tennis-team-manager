"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { DemoNav } from "@/components/layout/DemoNav";
import { useAuth } from "@/contexts/AuthContext";
import { useData } from "@/contexts/DataContext";
import RouteGuard from "@/components/RouteGuard";
import { Modal } from "@/components/Modal";
import { EmptyState } from "@/components/EmptyState";
import { MessageCircle, Send, Plus, ChevronRight, Search, X, Check, CheckCheck, Loader2 } from "lucide-react";
import { cn, formatDate, formatTime } from "@/lib/utils";

interface Thread {
  id: string;
  subject: string;
  playerId?: string;
  lastMessageAt: string;
  lastMessage?: { body: string; createdAt: string; senderName: string | null; senderId: string } | null;
  unreadCount?: number;
  members?: Member[];
}

interface Member {
  userId: string;
  fullName: string;
  role: string;
}

interface Reaction {
  [emoji: string]: string[];
}

interface Message {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  senderName?: string;
  senderRole?: string;
  readBy?: string[];
  reactions?: Reaction;
}

interface Contact {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

const REACTION_EMOJIS = ["👍", "❤️", "👀", "✅", "👏", "🎾"];

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
  const [sending, setSending] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [newMemberIds, setNewMemberIds] = useState<string[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [newMessagesToast, setNewMessagesToast] = useState<string | null>(null);

  // Polling for new messages
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const documentVisible = useRef(true);
  const lastMessageCountRef = useRef(0);

  useEffect(() => {
    loadThreads();
    // Track document visibility for smart polling
    const onVis = () => { documentVisible.current = !document.hidden; };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Smart polling: every 5s when focused, every 15s when hidden
  useEffect(() => {
    const tick = () => {
      const interval = documentVisible.current ? 5000 : 15000;
      // Re-arm
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(() => {
        if (documentVisible.current) {
          loadThreads({ silent: true });
          if (activeThread) loadThread(activeThread, true);
        }
      }, interval);
    };
    tick();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [activeThread, documentVisible.current]);

  useEffect(() => {
    if (activeThread) {
      loadThread(activeThread);
    }
  }, [activeThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThreadDetail?.messages.length]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (!activeThreadDetail) return;
    const newCount = activeThreadDetail.messages.length;
    if (newCount > lastMessageCountRef.current && lastMessageCountRef.current > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    lastMessageCountRef.current = newCount;
  }, [activeThreadDetail?.messages.length]);

  const loadThreads = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/messages", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const newThreads: Thread[] = data.threads || [];
        // Detect new messages in inactive threads
        if (silent && threads.length > 0) {
          for (const nt of newThreads) {
            const old = threads.find((t) => t.id === nt.id);
            const oldCount = (old as any)?._knownCount ?? 0;
            const newCount = (nt.unreadCount || 0);
            if (newCount > oldCount && nt.id !== activeThread) {
              setNewMessagesToast(`New message in "${nt.subject}"`);
              setTimeout(() => setNewMessagesToast(null), 3000);
            }
          }
        }
        setThreads(newThreads);
        if (!activeThread && newThreads[0]) {
          setActiveThread(newThreads[0].id);
        }
      }
    } catch (e) {
      // API not available — show empty
    } finally {
      if (!silent) setLoading(false);
    }
  }, [activeThread, threads]);

  const loadThread = async (threadId: string, silent = false) => {
    try {
      const res = await fetch(`/api/messages?threadId=${threadId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setActiveThreadDetail(data);
        // Mark as read when opened
        if (!silent) {
          fetch("/api/messages?action=read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ threadId }),
          }).then(() => loadThreads({ silent: true })).catch(() => {});
        }
      }
    } catch {}
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !activeThread) return;
    const body = newMessage;
    setNewMessage("");
    setSending(true);
    // Optimistic add
    const tempId = "temp-" + Date.now();
    setActiveThreadDetail((prev) =>
      prev
        ? {
            ...prev,
            messages: [
              ...prev.messages,
              { id: tempId, body, createdAt: new Date().toISOString(), senderId: user!.id, senderName: user!.fullName, senderRole: user!.role, readBy: [user!.id], reactions: {} },
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
        loadThread(activeThread, true);
        loadThreads({ silent: true });
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to send", "error");
      }
    } catch (e) {
      showToast("Failed to send (offline?)", "error");
    } finally {
      setSending(false);
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    // Optimistic update
    setActiveThreadDetail((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        messages: prev.messages.map((m) => {
          if (m.id !== messageId) return m;
          const reactions = { ...(m.reactions || {}) };
          const list = reactions[emoji] || [];
          if (list.includes(user!.id)) {
            const filtered = list.filter((u) => u !== user!.id);
            if (filtered.length === 0) delete reactions[emoji];
            else reactions[emoji] = filtered;
          } else {
            reactions[emoji] = [...list, user!.id];
          }
          return { ...m, reactions };
        }),
      };
    });
    try {
      await fetch("/api/messages?action=react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messageId, emoji }),
      });
    } catch {
      // revert on error
      loadThread(activeThread!, true);
    }
  };

  const openNewThread = async () => {
    setNewOpen(true);
    setNewSubject("");
    setNewMemberIds([]);
    setContactSearch("");
    if (contacts.length === 0) {
      try {
        const res = await fetch("/api/messages?contacts=1", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setContacts(data.contacts || []);
        }
      } catch {}
    }
  };

  const createThread = async () => {
    if (!newSubject.trim() || newMemberIds.length === 0) {
      showToast("Add a subject and at least one participant", "error");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subject: newSubject.trim(), memberIds: newMemberIds }),
      });
      if (res.ok) {
        const data = await res.json();
        showToast("Thread created", "success");
        setNewOpen(false);
        await loadThreads();
        setActiveThread(data.thread.id);
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to create", "error");
      }
    } finally {
      setCreating(false);
    }
  };

  const totalUnread = threads.reduce((s, t) => s + (t.unreadCount || 0), 0);

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
                {totalUnread > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-red-500 text-white text-xs font-bold animate-in zoom-in">
                    {totalUnread}
                  </span>
                )}
              </h1>
              <p className="text-sm text-slate-500">Direct chat with coaches, parents, and admins</p>
            </div>
            <button
              onClick={openNewThread}
              className="flex items-center gap-1.5 px-3 py-2 bg-tennis-600 text-white rounded-lg text-xs font-medium hover:bg-tennis-700"
            >
              <Plus className="w-4 h-4" /> New Thread
            </button>
          </div>

          {newMessagesToast && (
            <div className="mb-3 px-4 py-2 bg-tennis-100 border border-tennis-300 text-tennis-800 rounded-lg text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top">
              <MessageCircle className="w-4 h-4" /> {newMessagesToast}
            </div>
          )}

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
                {loading && threads.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Loading...
                  </div>
                ) : threads.length === 0 ? (
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
                            "w-full text-left px-3 py-2.5 border-b border-slate-50 hover:bg-slate-50 transition-colors flex items-start gap-2",
                            activeThread === t.id && "bg-tennis-50"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className={cn(
                                "text-sm truncate flex-1",
                                t.unreadCount ? "font-bold text-slate-900" : "font-medium text-slate-800",
                                activeThread === t.id && !t.unreadCount && "text-tennis-700"
                              )}>
                                {t.subject}
                              </p>
                              {t.unreadCount ? (
                                <span className="shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-tennis-600 text-white text-[10px] font-bold">
                                  {t.unreadCount}
                                </span>
                              ) : null}
                            </div>
                            {t.lastMessage ? (
                              <p className={cn(
                                "text-[11px] truncate mt-0.5",
                                t.unreadCount ? "text-slate-700 font-medium" : "text-slate-500"
                              )}>
                                <span className="font-semibold">{t.lastMessage.senderName?.split(" ")[0] || "?"}:</span> {t.lastMessage.body}
                              </p>
                            ) : (
                              <p className="text-[11px] text-slate-400 mt-0.5">No messages yet</p>
                            )}
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {formatDate(t.lastMessageAt)} · {formatTime(t.lastMessageAt)}
                            </p>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-1" />
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
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-tennis-50/50 to-transparent">
                    <div>
                      <h2 className="font-semibold text-slate-800">{activeThreadDetail.thread.subject}</h2>
                      <p className="text-xs text-slate-500">
                        {activeThreadDetail.members.length} participants
                      </p>
                    </div>
                    <div className="flex -space-x-2">
                      {activeThreadDetail.members.slice(0, 5).map((m) => (
                        <div
                          key={m.userId}
                          className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white",
                            m.role === "coach" ? "bg-gradient-to-br from-tennis-400 to-tennis-600" :
                            m.role === "parent" ? "bg-gradient-to-br from-blue-400 to-blue-600" :
                            m.role === "admin" ? "bg-gradient-to-br from-rose-400 to-rose-600" :
                            "bg-gradient-to-br from-slate-400 to-slate-600"
                          )}
                          title={`${m.fullName} (${m.role})`}
                        >
                          {m.fullName?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "?"}
                        </div>
                      ))}
                      {activeThreadDetail.members.length > 5 && (
                        <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-slate-600 text-xs font-bold">
                          +{activeThreadDetail.members.length - 5}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
                    {activeThreadDetail.messages.length === 0 ? (
                      <div className="text-center text-xs text-slate-400 py-8">
                        No messages yet. Send the first one!
                      </div>
                    ) : (
                      activeThreadDetail.messages.map((msg, i) => {
                        const isMe = msg.senderId === user?.id;
                        const prev = i > 0 ? activeThreadDetail.messages[i - 1] : null;
                        const showSender = !isMe && (!prev || prev.senderId !== msg.senderId);
                        return (
                          <MessageBubble
                            key={msg.id}
                            msg={msg}
                            isMe={isMe}
                            showSender={showSender}
                            currentUserId={user?.id || ""}
                            onReact={handleReact}
                          />
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-3 border-t border-slate-100 flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-tennis-400 outline-none"
                      disabled={sending}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!newMessage.trim() || sending}
                      className="px-4 py-2 bg-tennis-600 text-white rounded-lg text-sm font-medium hover:bg-tennis-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>

        {/* New Thread Modal */}
        <Modal
          open={newOpen}
          onClose={() => setNewOpen(false)}
          title="New Thread"
          subtitle="Start a conversation with coaches, parents, or admins"
          size="lg"
          footer={
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setNewOpen(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={createThread}
                disabled={creating || !newSubject.trim() || newMemberIds.length === 0}
                className="px-3 py-1.5 text-xs font-medium text-white bg-tennis-600 hover:bg-tennis-700 rounded-lg disabled:opacity-50 flex items-center gap-1.5"
              >
                {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Create Thread
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Subject</label>
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="e.g. About Mia's serve progress"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-tennis-400 outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Participants ({newMemberIds.length} selected)
              </label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Search contacts..."
                  className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-tennis-400 outline-none"
                />
              </div>
              <div className="border border-slate-200 rounded-lg max-h-64 overflow-y-auto">
                {contacts.length === 0 ? (
                  <div className="p-4 text-xs text-slate-400 text-center">No contacts found</div>
                ) : (
                  contacts
                    .filter((c) => !contactSearch || c.fullName.toLowerCase().includes(contactSearch.toLowerCase()) || c.email.toLowerCase().includes(contactSearch.toLowerCase()))
                    .map((c) => {
                      const selected = newMemberIds.includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setNewMemberIds((prev) =>
                              prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                            );
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 border-b border-slate-50 last:border-0",
                            selected && "bg-tennis-50"
                          )}
                        >
                          <div className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold",
                            c.role === "coach" ? "bg-gradient-to-br from-tennis-400 to-tennis-600" :
                            c.role === "parent" ? "bg-gradient-to-br from-blue-400 to-blue-600" :
                            c.role === "admin" ? "bg-gradient-to-br from-rose-400 to-rose-600" :
                            "bg-gradient-to-br from-slate-400 to-slate-600"
                          )}>
                            {c.fullName?.split(" ").map((n) => n[0]).join("").slice(0, 2) || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{c.fullName}</p>
                            <p className="text-[11px] text-slate-500 truncate">{c.email}</p>
                          </div>
                          <span className="text-[10px] uppercase font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{c.role}</span>
                          {selected && <Check className="w-4 h-4 text-tennis-600" />}
                        </button>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </RouteGuard>
  );
}

function MessageBubble({
  msg,
  isMe,
  showSender,
  currentUserId,
  onReact,
}: {
  msg: Message;
  isMe: boolean;
  showSender: boolean;
  currentUserId: string;
  onReact: (messageId: string, emoji: string) => void;
}) {
  const [showReactions, setShowReactions] = useState(false);
  const reactions = msg.reactions || {};
  const reactionEntries = Object.entries(reactions).filter(([_, users]) => users.length > 0);

  return (
    <div
      className={cn("flex flex-col group", isMe ? "items-end" : "items-start")}
      onMouseLeave={() => setShowReactions(false)}
    >
      {!isMe && showSender && (
        <p className="text-[11px] text-slate-500 mb-0.5 ml-1">
          {msg.senderName} <span className="text-slate-400 capitalize">({msg.senderRole})</span>
        </p>
      )}
      <div className="flex items-end gap-1.5 max-w-[80%]">
        {!isMe && (
          <button
            onClick={() => setShowReactions((v) => !v)}
            className={cn(
              "opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100",
              showReactions && "opacity-100"
            )}
            title="React"
          >
            <span className="text-base">😊</span>
          </button>
        )}
        <div
          className={cn(
            "px-3.5 py-2 rounded-2xl text-sm break-words",
            isMe
              ? "bg-tennis-600 text-white rounded-br-sm"
              : "bg-white border border-slate-100 text-slate-800 rounded-bl-sm"
          )}
        >
          {msg.body}
        </div>
        {isMe && (
          <button
            onClick={() => setShowReactions((v) => !v)}
            className={cn(
              "opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100",
              showReactions && "opacity-100"
            )}
            title="React"
          >
            <span className="text-base">😊</span>
          </button>
        )}
      </div>

      {/* Existing reactions */}
      {reactionEntries.length > 0 && (
        <div className={cn("flex gap-1 mt-1 flex-wrap", isMe ? "justify-end" : "justify-start")}>
          {reactionEntries.map(([emoji, users]) => {
            const mine = users.includes(currentUserId);
            return (
              <button
                key={emoji}
                onClick={() => onReact(msg.id, emoji)}
                className={cn(
                  "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] border transition-colors",
                  mine
                    ? "bg-tennis-100 border-tennis-300 text-tennis-800"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                )}
              >
                <span className="text-sm leading-none">{emoji}</span>
                <span className="font-semibold">{users.length}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Emoji picker */}
      {showReactions && (
        <div className={cn("mt-1 px-2 py-1 bg-white border border-slate-200 rounded-full shadow-lg flex gap-1 animate-in zoom-in-95", isMe ? "self-end" : "self-start")}>
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => { onReact(msg.id, emoji); setShowReactions(false); }}
              className="hover:scale-125 transition-transform text-base px-1"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className={cn("flex items-center gap-1 mt-0.5", isMe ? "mr-1" : "ml-1")}>
        <p className="text-[10px] text-slate-400">{formatTime(msg.createdAt)}</p>
        {isMe && (
          <span title={msg.readBy && msg.readBy.length > 1 ? "Read" : "Sent"}>
            {(msg.readBy && msg.readBy.length > 1) ? (
              <CheckCheck className="w-3 h-3 text-tennis-500" />
            ) : (
              <Check className="w-3 h-3 text-slate-300" />
            )}
          </span>
        )}
      </div>
    </div>
  );
}
