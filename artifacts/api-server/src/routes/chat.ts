import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, chatMessagesTable, bookingsTable, usersTable, mentorProfilesTable, notificationsTable } from "@workspace/db";
import { eq, asc, and } from "drizzle-orm";
import { requireAuth, getUserByClerkId } from "../lib/auth";
import { createNotification } from "../lib/notifications";
import { chatMessageEmail } from "../lib/email";

const router = Router();

const CONTACT_LEAK_PATTERNS = [
  /\b[\w._%+-]+@[\w.-]+\.[a-z]{2,}\b/i,
  /(\+?\d[\d\s\-().]{7,}\d)/,
  /wa\.me\//i,
  /whatsapp/i,
  /paypal\.me/i,
  /venmo/i,
  /cashapp/i,
  /zelle/i,
];

function detectLeakage(content: string): boolean {
  return CONTACT_LEAK_PATTERNS.some((p) => p.test(content));
}

function messageToResponse(msg: any, sender: any) {
  return {
    id: msg.id,
    bookingId: msg.bookingId,
    senderId: msg.senderId,
    senderName: sender?.fullName ?? null,
    senderAvatarUrl: sender?.avatarUrl ?? null,
    content: msg.content,
    isFlagged: msg.isFlagged,
    flagReason: msg.flagReason ?? null,
    createdAt: msg.createdAt.toISOString(),
  };
}

// GET /api/chat/unread-counts — returns { [bookingId]: unreadCount } for current user
router.get("/unread-counts", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  try {
    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const unreadNotifs = await db
      .select()
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId, user.id),
          eq(notificationsTable.type, "chat_message" as any),
          eq(notificationsTable.isRead, false),
        )
      );

    const counts: Record<number, number> = {};
    for (const notif of unreadNotifs) {
      if (notif.link) {
        const match = notif.link.match(/\/bookings\/(\d+)/);
        if (match) {
          const bookingId = parseInt(match[1]);
          counts[bookingId] = (counts[bookingId] ?? 0) + 1;
        }
      }
    }

    res.json(counts);
  } catch (err) {
    req.log.error({ err }, "Error fetching chat unread counts");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/chat/:bookingId
router.get("/:bookingId", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const bookingId = parseInt(Array.isArray(req.params.bookingId) ? req.params.bookingId[0] : req.params.bookingId);

  try {
    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

    // Check access: must be mentee or mentor of this booking
    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.id, booking.mentorId)).limit(1);
    const isMentee = booking.menteeId === user.id;
    const isMentor = mentor?.userId === user.id;
    if (!isMentee && !isMentor) { res.status(403).json({ error: "Access denied" }); return; }

    const messages = await db.select().from(chatMessagesTable)
      .where(eq(chatMessagesTable.bookingId, bookingId))
      .orderBy(asc(chatMessagesTable.createdAt));

    const senderIds = [...new Set(messages.map((m) => m.senderId))];
    const senders = await Promise.all(
      senderIds.map((id) => db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1).then(([u]) => u))
    );
    const senderMap = Object.fromEntries(senders.filter(Boolean).map((u) => [u!.id, u]));

    res.json(messages.map((m) => messageToResponse(m, senderMap[m.senderId])));
  } catch (err) {
    req.log.error({ err }, "Error fetching chat messages");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/chat/:bookingId
router.post("/:bookingId", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const bookingId = parseInt(Array.isArray(req.params.bookingId) ? req.params.bookingId[0] : req.params.bookingId);
  const { content } = req.body;

  if (!content || typeof content !== "string" || !content.trim()) {
    res.status(400).json({ error: "Message content is required" });
    return;
  }

  try {
    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.id, booking.mentorId)).limit(1);
    const isMentee = booking.menteeId === user.id;
    const isMentor = mentor?.userId === user.id;
    if (!isMentee && !isMentor) { res.status(403).json({ error: "Access denied" }); return; }

    if (booking.status === "pending_payment") {
      res.status(400).json({ error: "Chat is not available until payment is confirmed." });
      return;
    }

    const isFlagged = detectLeakage(content);
    const flagReason = isFlagged ? "Possible contact/payment information detected" : null;

    const [msg] = await db.insert(chatMessagesTable).values({
      bookingId,
      senderId: user.id,
      content: content.trim(),
      isFlagged,
      flagReason,
    }).returning();

    // Notify the other party
    const otherUserId = isMentee ? (mentor?.userId ?? null) : booking.menteeId;
    if (otherUserId) {
      const [otherUser] = await db.select().from(usersTable).where(eq(usersTable.id, otherUserId)).limit(1);
      await createNotification({
        userId: otherUserId,
        type: "chat_message",
        title: `New message from ${user.fullName ?? "someone"}`,
        message: content.trim().length > 80 ? content.trim().slice(0, 80) + "…" : content.trim(),
        link: `/bookings/${bookingId}`,
        userEmail: otherUser?.email,
        emailSubject: `New message from ${user.fullName ?? "someone"} on GoMindscout`,
        emailHtml: chatMessageEmail({ recipientName: otherUser?.fullName ?? "there", senderName: user.fullName ?? "Someone", preview: content.trim() }),
      });
    }

    res.status(201).json({
      ...messageToResponse(msg, user),
      warning: isFlagged
        ? "Please keep communication and payments on-platform for your protection."
        : null,
    });
  } catch (err) {
    req.log.error({ err }, "Error sending chat message");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
