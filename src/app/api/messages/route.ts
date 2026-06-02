import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, desc, or, inArray, sql, ne, isNull } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAuth, handleApiError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

const threadSchema = z.object({
  subject: z.string().min(1),
  playerId: z.string().optional().nullable(),
  memberIds: z.array(z.string()).default([]), // user IDs
});

const messageSchema = z.object({
  threadId: z.string(),
  body: z.string().min(1),
});

const reactSchema = z.object({
  messageId: z.string(),
  emoji: z.string().min(1).max(8),
});

const markReadSchema = z.object({
  threadId: z.string(),
});

// DEV-ONLY bypass: when ALLOW_DEV_AUTH=1, accept a `X-Dev-User` header as the user
// without requiring a real session. Used for testing the messages UI without
// setting up a real backend. NEVER enable in production.
function devUserFromRequest(req: NextRequest) {
  if (process.env.ALLOW_DEV_AUTH !== "1") return null;
  const devId = req.headers.get("x-dev-user") || "dev-user";
  return {
    id: devId,
    email: `${devId}@dev.local`,
    fullName: devId === "dev-coach" ? "Coach Ralph" : devId === "dev-parent" ? "Parent Mia" : "Dev User",
    role: devId === "dev-coach" ? "coach" as const : devId === "dev-parent" ? "parent" as const : "admin" as const,
    tenantId: "dev-tenant",
    childIds: [] as string[],
  };
}

export async function GET(req: NextRequest) {
  const devUser = devUserFromRequest(req);
  const user = devUser ?? (await requireAuth() as any);
  if (!devUser && user instanceof NextResponse) return user;
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get("threadId");
    const contacts = searchParams.get("contacts");

    // List contacts (users in same tenant, excluding self) — for "New Thread" picker
    if (contacts === "1") {
      const list = await db
        .select({
          id: schema.users.id,
          fullName: schema.users.fullName,
          email: schema.users.email,
          role: schema.users.role,
        })
        .from(schema.users)
        .where(
          user.tenantId
            ? and(
                eq(schema.users.tenantId, user.tenantId),
                ne(schema.users.id, user.id)
              )
            : ne(schema.users.id, user.id)
        )
        .orderBy(schema.users.fullName)
        .limit(200);
      return NextResponse.json({ contacts: list });
    }

    if (threadId) {
      // Fetch single thread + its messages + members
      const [thread] = await db
        .select()
        .from(schema.messageThreads)
        .where(eq(schema.messageThreads.id, threadId))
        .limit(1);
      if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

      // Confirm the user is a member
      const myMembership = await db
        .select()
        .from(schema.messageThreadMembers)
        .where(
          and(
            eq(schema.messageThreadMembers.threadId, threadId),
            eq(schema.messageThreadMembers.userId, user.id)
          )
        )
        .limit(1);
      if (myMembership.length === 0) {
        return NextResponse.json({ error: "Not a member of this thread" }, { status: 403 });
      }

      const members = await db
        .select({
          userId: schema.messageThreadMembers.userId,
          fullName: schema.users.fullName,
          role: schema.users.role,
        })
        .from(schema.messageThreadMembers)
        .leftJoin(schema.users, eq(schema.messageThreadMembers.userId, schema.users.id))
        .where(eq(schema.messageThreadMembers.threadId, threadId));

      const msgs = await db
        .select({
          id: schema.messages.id,
          body: schema.messages.body,
          createdAt: schema.messages.createdAt,
          senderId: schema.messages.senderId,
          senderName: schema.users.fullName,
          senderRole: schema.users.role,
          readBy: schema.messages.readBy,
          reactions: schema.messages.reactions,
        })
        .from(schema.messages)
        .leftJoin(schema.users, eq(schema.messages.senderId, schema.users.id))
        .where(eq(schema.messages.threadId, threadId))
        .orderBy(schema.messages.createdAt);

      return NextResponse.json({ thread, members, messages: msgs });
    }

    // List threads the user is a member of, with last message preview + unread count
    const myMemberships = await db
      .select({ threadId: schema.messageThreadMembers.threadId })
      .from(schema.messageThreadMembers)
      .where(eq(schema.messageThreadMembers.userId, user.id));

    const threadIds = myMemberships.map((m) => m.threadId);
    if (threadIds.length === 0) return NextResponse.json({ threads: [] });

    const threads = await db
      .select()
      .from(schema.messageThreads)
      .where(inArray(schema.messageThreads.id, threadIds))
      .orderBy(desc(schema.messageThreads.lastMessageAt));

    // Last message per thread (one query, then map)
    const allMessages = await db
      .select({
        threadId: schema.messages.threadId,
        body: schema.messages.body,
        createdAt: schema.messages.createdAt,
        senderId: schema.messages.senderId,
        readBy: schema.messages.readBy,
        senderName: schema.users.fullName,
      })
      .from(schema.messages)
      .leftJoin(schema.users, eq(schema.messages.senderId, schema.users.id))
      .where(inArray(schema.messages.threadId, threadIds))
      .orderBy(desc(schema.messages.createdAt));

    const lastByThread: Record<string, { body: string; createdAt: string; senderName: string | null; senderId: string }> = {};
    for (const m of allMessages) {
      if (!lastByThread[m.threadId]) {
        lastByThread[m.threadId] = {
          body: m.body,
          createdAt: m.createdAt as unknown as string,
          senderName: m.senderName,
          senderId: m.senderId,
        };
      }
    }

    // Unread count per thread (messages where current user is NOT in readBy, excluding own messages)
    const unreadRows = await db
      .select({
        threadId: schema.messages.threadId,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(schema.messages)
      .where(
        and(
          inArray(schema.messages.threadId, threadIds),
          ne(schema.messages.senderId, user.id),
          // NOT (readBy @> ARRAY[$userId]) — use a NOT EXISTS
          sql`NOT (${schema.messages.readBy} @> ARRAY[${user.id}]::uuid[])`
        )
      )
      .groupBy(schema.messages.threadId);

    const unreadByThread: Record<string, number> = {};
    for (const r of unreadRows) unreadByThread[r.threadId] = r.count;

    // Members per thread (so the list can show participant count)
    const allMembers = await db
      .select({
        threadId: schema.messageThreadMembers.threadId,
        userId: schema.messageThreadMembers.userId,
        fullName: schema.users.fullName,
        role: schema.users.role,
      })
      .from(schema.messageThreadMembers)
      .leftJoin(schema.users, eq(schema.messageThreadMembers.userId, schema.users.id))
      .where(inArray(schema.messageThreadMembers.threadId, threadIds));

    const membersByThread: Record<string, any[]> = {};
    for (const m of allMembers) {
      if (!membersByThread[m.threadId]) membersByThread[m.threadId] = [];
      membersByThread[m.threadId].push({
        userId: m.userId,
        fullName: m.fullName,
        role: m.role,
      });
    }

    const enriched = threads.map((t) => ({
      ...t,
      lastMessage: lastByThread[t.id] || null,
      unreadCount: unreadByThread[t.id] || 0,
      members: membersByThread[t.id] || [],
    }));

    return NextResponse.json({ threads: enriched });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  const devUser = devUserFromRequest(req);
  const user = devUser ?? (await requireAuth() as any);
  if (!devUser && user instanceof NextResponse) return user;
  try {
    const body = await req.json();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "message") {
      const parsed = messageSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
      const db = getDb();
      // Verify membership
      const member = await db
        .select()
        .from(schema.messageThreadMembers)
        .where(
          and(
            eq(schema.messageThreadMembers.threadId, parsed.data.threadId),
            eq(schema.messageThreadMembers.userId, user.id)
          )
        )
        .limit(1);
      if (member.length === 0) {
        return NextResponse.json({ error: "Not a member of this thread" }, { status: 403 });
      }
      const [msg] = await db.insert(schema.messages).values({
        threadId: parsed.data.threadId,
        senderId: user.id,
        body: parsed.data.body,
        readBy: [user.id], // sender has read it
      }).returning();
      await db.update(schema.messageThreads)
        .set({ lastMessageAt: new Date() })
        .where(eq(schema.messageThreads.id, parsed.data.threadId));
      return NextResponse.json({ message: msg }, { status: 201 });
    }

    if (action === "react") {
      const parsed = reactSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
      const db = getDb();
      // Verify membership
      const msg = await db
        .select()
        .from(schema.messages)
        .where(eq(schema.messages.id, parsed.data.messageId))
        .limit(1);
      if (msg.length === 0) return NextResponse.json({ error: "Message not found" }, { status: 404 });
      const member = await db
        .select()
        .from(schema.messageThreadMembers)
        .where(
          and(
            eq(schema.messageThreadMembers.threadId, msg[0].threadId),
            eq(schema.messageThreadMembers.userId, user.id)
          )
        )
        .limit(1);
      if (member.length === 0) {
        return NextResponse.json({ error: "Not a member of this thread" }, { status: 403 });
      }
      const current = (msg[0].reactions || {}) as Record<string, string[]>;
      const list = current[parsed.data.emoji] || [];
      let next: Record<string, string[]>;
      if (list.includes(user.id)) {
        // Remove
        const filtered = list.filter((u) => u !== user.id);
        if (filtered.length === 0) {
          const { [parsed.data.emoji]: _drop, ...rest } = current;
          next = rest;
        } else {
          next = { ...current, [parsed.data.emoji]: filtered };
        }
      } else {
        next = { ...current, [parsed.data.emoji]: [...list, user.id] };
      }
      await db.update(schema.messages)
        .set({ reactions: next })
        .where(eq(schema.messages.id, parsed.data.messageId));
      return NextResponse.json({ reactions: next });
    }

    if (action === "read") {
      const parsed = markReadSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
      const db = getDb();
      // Verify membership
      const member = await db
        .select()
        .from(schema.messageThreadMembers)
        .where(
          and(
            eq(schema.messageThreadMembers.threadId, parsed.data.threadId),
            eq(schema.messageThreadMembers.userId, user.id)
          )
        )
        .limit(1);
      if (member.length === 0) {
        return NextResponse.json({ error: "Not a member of this thread" }, { status: 403 });
      }
      // Add user.id to readBy of all messages in this thread that are NOT from them
      await db
        .update(schema.messages)
        .set({
          readBy: sql`COALESCE(${schema.messages.readBy}, '[]'::jsonb) || ${JSON.stringify([user.id])}::jsonb`,
        })
        .where(
          and(
            eq(schema.messages.threadId, parsed.data.threadId),
            ne(schema.messages.senderId, user.id)
          )
        );
      return NextResponse.json({ ok: true });
    }

    // Create new thread
    const parsed = threadSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    const db = getDb();
    const [thread] = await db.insert(schema.messageThreads).values({
      tenantId: user.tenantId!,
      subject: parsed.data.subject,
      playerId: parsed.data.playerId,
    }).returning();

    // Add the creator + members
    const memberIds = Array.from(new Set([user.id, ...parsed.data.memberIds]));
    if (memberIds.length > 0) {
      await db.insert(schema.messageThreadMembers).values(
        memberIds.map((uid) => ({ threadId: thread.id, userId: uid }))
      );
    }

    return NextResponse.json({ thread }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
