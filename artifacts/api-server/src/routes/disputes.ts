import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, disputesTable, bookingsTable, usersTable, mentorProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, getUserByClerkId } from "../lib/auth";

const router = Router();

function disputeToResponse(dispute: any, opener?: any) {
  return {
    id: dispute.id,
    bookingId: dispute.bookingId,
    openedByUserId: dispute.openedByUserId,
    openerName: opener?.fullName ?? null,
    reason: dispute.reason,
    description: dispute.description,
    evidenceUrl: dispute.evidenceUrl ?? null,
    status: dispute.status,
    adminDecision: dispute.adminDecision ?? null,
    resolutionType: dispute.resolutionType ?? null,
    createdAt: dispute.createdAt.toISOString(),
    updatedAt: dispute.updatedAt.toISOString(),
  };
}

// POST /api/disputes - open a dispute
router.post("/", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const { bookingId, reason, description, evidenceUrl } = req.body;

  if (!bookingId || !reason || !description) {
    res.status(400).json({ error: "bookingId, reason, and description are required" });
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

    // Can only dispute paid sessions
    const disputeableStatuses = ["paid_pending_session", "session_completed", "paid", "scheduled", "completed"];
    if (!disputeableStatuses.includes(booking.status)) {
      res.status(400).json({ error: "This booking cannot be disputed in its current status" });
      return;
    }

    const existing = await db.select().from(disputesTable).where(eq(disputesTable.bookingId, bookingId)).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "A dispute already exists for this booking" });
      return;
    }

    const [dispute] = await db.insert(disputesTable).values({
      bookingId,
      openedByUserId: user.id,
      reason,
      description,
      evidenceUrl: evidenceUrl ?? null,
      status: "open",
    }).returning();

    // Update booking status to under_review
    await db.update(bookingsTable).set({ status: "under_review" }).where(eq(bookingsTable.id, bookingId));

    res.status(201).json(disputeToResponse(dispute, user));
  } catch (err) {
    req.log.error({ err }, "Error creating dispute");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/disputes/:bookingId - get dispute for a booking
router.get("/:bookingId", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const bookingId = parseInt(Array.isArray(req.params.bookingId) ? req.params.bookingId[0] : req.params.bookingId);

  try {
    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.id, booking.mentorId)).limit(1);
    const isMentee = booking.menteeId === user.id;
    const isMentor = mentor?.userId === user.id;
    if (!isMentee && !isMentor) { res.status(403).json({ error: "Access denied" }); return; }

    const [dispute] = await db.select().from(disputesTable).where(eq(disputesTable.bookingId, bookingId)).limit(1);
    if (!dispute) { res.status(404).json({ error: "No dispute found" }); return; }

    const [opener] = await db.select().from(usersTable).where(eq(usersTable.id, dispute.openedByUserId)).limit(1);
    res.json(disputeToResponse(dispute, opener));
  } catch (err) {
    req.log.error({ err }, "Error fetching dispute");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
