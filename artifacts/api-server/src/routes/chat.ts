import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, chatMessagesTable, bookingsTable, usersTable, mentorProfilesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
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

// GET /api/chat/:bookingId
router.get("/:bookingId", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const bookingId = parseInt(req.params.bookingId);

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

    const enriched = await Promise.all(
      messages.map(async (msg) => {
        const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, msg.senderId)).limit(1);
        return messageToResponse(msg, sender);
      })
    );

    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Error fetching chat messages");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/chat/:bookingId
router.post("/:bookingId", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const bookingId = parseInt(req.params.bookingId);
  const { content } = req.body;

  if (!content?.trim()) {
    res.status(400).json({ error: "Message content required" });
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

    // Block chat on pending_payment bookings
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
      createNotification({
        userId: otherUserId,
        type: "chat_message",
        title: `New message from ${user.fullName ?? "someone"}`,
        message: content.trim().length > 80 ? content.trim().slice(0, 80) + "…" : content.trim(),
        link: "/dashboard",
        userEmail: otherUser?.email,
        emailSubject: `New message from ${user.fullName ?? "someone"} on GoMindscout`,
        emailHtml: chatMessageEmail({ recipientName: otherUser?.fullName ?? "there", senderName: user.fullName ?? "Someone", preview: content.trim() }),
      }).catch(() => {});
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
