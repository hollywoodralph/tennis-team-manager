import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, desc, or, inArray } from "drizzle-orm";
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

export async function GET(req: NextRequest) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get("threadId");

    if (threadId) {
      // Fetch single thread + its messages
      const [thread] = await db
        .select()
        .from(schema.messageThreads)
        .where(eq(schema.messageThreads.id, threadId))
        .limit(1);
      if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
        })
        .from(schema.messages)
        .leftJoin(schema.users, eq(schema.messages.senderId, schema.users.id))
        .where(eq(schema.messages.threadId, threadId))
        .orderBy(schema.messages.createdAt);

      return NextResponse.json({ thread, members, messages: msgs });
    }

    // List threads the user is a member of
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

    return NextResponse.json({ threads });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  try {
    const body = await req.json();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "message") {
      const parsed = messageSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });
      const db = getDb();
      const [msg] = await db.insert(schema.messages).values({
        threadId: parsed.data.threadId,
        senderId: user.id,
        body: parsed.data.body,
      }).returning();
      await db.update(schema.messageThreads)
        .set({ lastMessageAt: new Date() })
        .where(eq(schema.messageThreads.id, parsed.data.threadId));
      return NextResponse.json({ message: msg }, { status: 201 });
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
