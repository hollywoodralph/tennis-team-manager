import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAuth, handleApiError } from "@/lib/api/helpers";

export const dynamic = "force-dynamic";

const announcementSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  audience: z.enum(["all", "group", "parent", "coach"]).default("all"),
  groupId: z.string().optional().nullable(),
});

export async function GET() {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  try {
    const db = getDb();
    const items = await db.query.announcements.findMany({
      where: eq(schema.announcements.tenantId, user.tenantId!),
      orderBy: [desc(schema.announcements.sentAt)],
    });
    return NextResponse.json({ announcements: items });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  if (user instanceof NextResponse) return user;
  if (user.role === "parent" || user.role === "viewer") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const parsed = announcementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.message }, { status: 400 });
    }
    const db = getDb();
    const [row] = await db.insert(schema.announcements).values({
      tenantId: user.tenantId!,
      ...parsed.data,
      sentBy: user.id,
    }).returning();
    return NextResponse.json({ announcement: row }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
