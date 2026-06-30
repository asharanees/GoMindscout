import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, bookingsTable, packagesTable, mentorProfilesTable, usersTable, reviewsTable, disputesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, getUserByClerkId } from "../lib/auth";
import { createMeetingRoom, deleteMeetingRoom } from "../lib/meeting";
import {
  sendEmail, meetingConfirmedEmail, bookingRequestEmail, bookingRejectedEmail,
  counterProposedEmail, counterDeclinedEmail, paymentConfirmedMentorEmail,
  rescheduleProposedEmail,
} from "../lib/email";
import { createNotification } from "../lib/notifications";

const router = Router();

const PLATFORM_FEE_PERCENT = 0.20;
const MENTOR_EARNING_PERCENT = 0.80;

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  const Stripe = require("stripe");
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-04-30.basil" });
}

async function checkAndAutoReleasePayouts() {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const pending = await db.select().from(bookingsTable)
    .where(and(
      eq(bookingsTable.status, "session_completed"),
      sql`${bookingsTable.sessionCompletedAt} < ${cutoff}`
    ));

  for (const booking of pending) {
    const [dispute] = await db.select().from(disputesTable)
      .where(and(eq(disputesTable.bookingId, booking.id), sql`${disputesTable.status} != 'resolved'`))
      .limit(1);
    if (!dispute) {
      await db.update(bookingsTable)
        .set({ status: "payout_released" })
        .where(eq(bookingsTable.id, booking.id));
    }
  }
}

async function enrichBooking(booking: any) {
  const [menteeUser] = await db.select().from(usersTable).where(eq(usersTable.id, booking.menteeId)).limit(1);
  const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.id, booking.mentorId)).limit(1);
  const [mentorUser] = mentor ? await db.select().from(usersTable).where(eq(usersTable.id, mentor.userId)).limit(1) : [null];
  const [pkg] = await db.select().from(packagesTable).where(eq(packagesTable.id, booking.packageId)).limit(1);
  const [review] = await db.select().from(reviewsTable).where(eq(reviewsTable.bookingId, booking.id)).limit(1);
  const [dispute] = await db.select().from(disputesTable).where(eq(disputesTable.bookingId, booking.id)).limit(1);

  return {
    id: booking.id,
    menteeId: booking.menteeId,
    mentorId: booking.mentorId,
    packageId: booking.packageId,
    status: booking.status,
    proposedAt: booking.proposedAt?.toISOString() ?? null,
    mentorProposedAt: booking.mentorProposedAt?.toISOString() ?? null,
    scheduledAt: booking.scheduledAt?.toISOString() ?? null,
    sessionCompletedAt: booking.sessionCompletedAt?.toISOString() ?? null,
    // Never expose the raw meeting room URL to the frontend
    hasMeetingRoom: !!booking.meetingLink,
    rescheduleProposedBy: booking.rescheduleProposedBy ?? null,
    rescheduleProposedAt: booking.rescheduleProposedAt?.toISOString() ?? null,
    amount: Number(booking.amount),
    platformFee: Number(booking.platformFee),
    mentorEarning: booking.mentorEarning ? Number(booking.mentorEarning) : null,
    cancellationNote: booking.cancellationNote ?? null,
    stripeSessionId: booking.stripeSessionId,
    createdAt: booking.createdAt.toISOString(),
    mentorName: mentorUser?.fullName ?? null,
    menteeName: menteeUser?.fullName ?? null,
    packageTitle: pkg?.title ?? null,
    packageType: pkg?.type ?? null,
    packageDurationMinutes: pkg?.durationMinutes ?? null,
    mentorAvatarUrl: mentorUser?.avatarUrl ?? null,
    menteeAvatarUrl: menteeUser?.avatarUrl ?? null,
    hasReview: !!review,
    hasDispute: !!dispute,
  };
}

// GET /api/bookings
router.get("/", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const { role, status } = req.query as Record<string, string>;

  try {
    checkAndAutoReleasePayouts().catch(() => {});

    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    let conditions: any[] = [];

    if (role === "mentor") {
      const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.userId, user.id)).limit(1);
      if (!mentor) { res.json([]); return; }
      conditions.push(eq(bookingsTable.mentorId, mentor.id));
    } else {
      conditions.push(eq(bookingsTable.menteeId, user.id));
    }

    if (status) conditions.push(eq(bookingsTable.status, status));

    const bookings = await db.select().from(bookingsTable).where(and(...conditions)).orderBy(sql`${bookingsTable.createdAt} DESC`);
    const enriched = await Promise.all(bookings.map(enrichBooking));
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Error listing bookings");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/bookings - create booking + Stripe checkout
router.post("/", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const { packageId, proposedAt } = req.body;

  try {
    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [pkg] = await db.select().from(packagesTable).where(eq(packagesTable.id, packageId)).limit(1);
    if (!pkg) { res.status(404).json({ error: "Package not found" }); return; }
    if (pkg.type === "email") { res.status(400).json({ error: "Email packages are not supported" }); return; }

    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.id, pkg.mentorId)).limit(1);
    if (!mentor || mentor.status !== "approved") { res.status(400).json({ error: "Mentor not available" }); return; }

    const amount = Number(pkg.price);
    const platformFee = Math.round(amount * PLATFORM_FEE_PERCENT * 100) / 100;
    const mentorEarning = Math.round(amount * MENTOR_EARNING_PERCENT * 100) / 100;

    const appUrl = process.env.APP_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`;

    const [booking] = await db.insert(bookingsTable).values({
      menteeId: user.id,
      mentorId: mentor.id,
      packageId: pkg.id,
      status: "pending_payment",
      proposedAt: proposedAt ? new Date(proposedAt) : undefined,
      amount: amount.toString(),
      platformFee: platformFee.toString(),
      mentorEarning: mentorEarning.toString(),
    }).returning();

    let checkoutUrl = `${appUrl}/payment/success?bookingId=${booking.id}`;

    const stripe = getStripe();
    if (stripe) {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: { name: pkg.title, description: `Session with mentor` },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        }],
        mode: "payment",
        success_url: `${appUrl}/payment/success?bookingId=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/payment/cancel?bookingId=${booking.id}`,
        metadata: { bookingId: booking.id.toString() },
      });

      await db.update(bookingsTable).set({ stripeSessionId: session.id }).where(eq(bookingsTable.id, booking.id));
      checkoutUrl = session.url!;
    } else {
      await db.update(bookingsTable)
        .set({ status: "awaiting_mentor_approval" })
        .where(eq(bookingsTable.id, booking.id));
      booking.status = "awaiting_mentor_approval";

      const [mentorUser] = await db.select().from(usersTable).where(eq(usersTable.id, mentor.userId)).limit(1);
      await createNotification({
        userId: mentor.userId,
        type: "booking_created",
        title: "New booking request",
        message: `${user.fullName || "A mentee"} requested a session: ${pkg.title}`,
        link: "/mentor/dashboard",
        userEmail: mentorUser?.email,
        emailSubject: `New booking request - ${pkg.title}`,
        emailHtml: bookingRequestEmail({ mentorName: mentorUser?.fullName ?? "there", menteeName: user.fullName ?? "A mentee", packageName: pkg.title, proposedAt: proposedAt ?? null }),
      });
      await createNotification({
        userId: user.id,
        type: "booking_created",
        title: "Booking submitted",
        message: `Your session request for "${pkg.title}" is awaiting mentor approval.`,
        link: "/dashboard",
      });
    }

    const enriched = await enrichBooking(booking);
    res.status(201).json({ booking: enriched, checkoutUrl });
  } catch (err) {
    req.log.error({ err }, "Error creating booking");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/bookings/:bookingId
router.get("/:bookingId", requireAuth, async (req, res) => {
  try {
    const bookingId = parseInt(Array.isArray(req.params.bookingId) ? req.params.bookingId[0] : req.params.bookingId);
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    res.json(await enrichBooking(booking));
  } catch (err) {
    req.log.error({ err }, "Error fetching booking");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/bookings/:bookingId - update status
router.patch("/:bookingId", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  try {
    const bookingId = parseInt(Array.isArray(req.params.bookingId) ? req.params.bookingId[0] : req.params.bookingId);
    const { status } = req.body;

    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [existing] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!existing) { res.status(404).json({ error: "Booking not found" }); return; }

    const updateData: any = { status };

    if (status === "session_completed") {
      updateData.sessionCompletedAt = new Date();
      // Expire/delete the meeting room since session is done
      if (existing.meetingLink) {
        deleteMeetingRoom(existing.meetingLink).catch(() => {});
      }
    }

    const [updated] = await db.update(bookingsTable).set(updateData).where(eq(bookingsTable.id, bookingId)).returning();
    if (!updated) { res.status(404).json({ error: "Booking not found" }); return; }
    res.json(await enrichBooking(updated));
  } catch (err) {
    req.log.error({ err }, "Error updating booking status");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/bookings/:bookingId/meeting-link - mentor sets time, platform generates meeting room
router.patch("/:bookingId/meeting-link", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  try {
    const bookingId = parseInt(Array.isArray(req.params.bookingId) ? req.params.bookingId[0] : req.params.bookingId);
    const { scheduledAt } = req.body;

    if (!scheduledAt) { res.status(400).json({ error: "scheduledAt is required" }); return; }

    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.id, booking.mentorId)).limit(1);
    if (!mentor || mentor.userId !== user.id) {
      res.status(403).json({ error: "Only the mentor can schedule this session" }); return;
    }

    // Delete old room if rescheduling
    if (booking.meetingLink) deleteMeetingRoom(booking.meetingLink).catch(() => {});

    const [pkg] = await db.select().from(packagesTable).where(eq(packagesTable.id, booking.packageId)).limit(1);
    const scheduledDate = new Date(scheduledAt);
    const meetingLink = await createMeetingRoom(bookingId, scheduledDate, pkg?.durationMinutes);

    const [updated] = await db.update(bookingsTable)
      .set({ meetingLink, scheduledAt: scheduledDate, status: "paid_pending_session" })
      .where(eq(bookingsTable.id, bookingId))
      .returning();
    if (!updated) { res.status(404).json({ error: "Booking not found" }); return; }

    const [menteeUser] = await db.select().from(usersTable).where(eq(usersTable.id, booking.menteeId)).limit(1);
    const [mentorUser] = await db.select().from(usersTable).where(eq(usersTable.id, mentor.userId)).limit(1);
    const packageName = pkg?.title ?? "Mentorship Session";
    const scheduledAtIso = scheduledDate.toISOString();

    if (menteeUser?.email) {
      await sendEmail(menteeUser.email, "Your GoMindscout session is confirmed - join via dashboard",
        meetingConfirmedEmail({ recipientName: menteeUser?.fullName ?? "there", otherPartyName: mentorUser?.fullName ?? "Your mentor", role: "mentee", scheduledAt: scheduledAtIso, packageName })
      );
    }
    if (mentorUser?.email) {
      await sendEmail(mentorUser.email, "Session confirmed - GoMindscout",
        meetingConfirmedEmail({ recipientName: mentorUser?.fullName ?? "there", otherPartyName: menteeUser?.fullName ?? "Your mentee", role: "mentor", scheduledAt: scheduledAtIso, packageName })
      );
    }

    await createNotification({
      userId: booking.menteeId,
      type: "session_confirmed",
      title: "Session scheduled!",
      message: `Your session "${packageName}" with ${mentorUser?.fullName ?? "your mentor"} has been scheduled.`,
      link: "/dashboard",
    });

    res.json(await enrichBooking(updated));
  } catch (err) {
    req.log.error({ err }, "Error scheduling session");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/bookings/:bookingId/cancel
router.post("/:bookingId/cancel", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const { note } = req.body;

  try {
    const bookingId = parseInt(Array.isArray(req.params.bookingId) ? req.params.bookingId[0] : req.params.bookingId);
    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.id, booking.mentorId)).limit(1);
    const isMentee = booking.menteeId === user.id;
    const isMentor = mentor?.userId === user.id;
    if (!isMentee && !isMentor) { res.status(403).json({ error: "Access denied" }); return; }

    const cancellableStatuses = ["pending_payment", "paid_pending_session", "paid", "scheduled", "reschedule_proposed"];
    if (!cancellableStatuses.includes(booking.status)) {
      res.status(400).json({ error: "This booking cannot be cancelled in its current state" }); return;
    }

    let refundNote = note ?? "";
    if (isMentor) {
      refundNote = `Mentor cancelled. ${note ?? ""}`.trim();
    } else if (booking.scheduledAt) {
      const hoursUntil = (new Date(booking.scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntil > 24) {
        refundNote = `Cancelled >24h before session. Full refund applies. ${note ?? ""}`.trim();
      } else {
        refundNote = `Cancelled <24h before session. 50% refund applies. ${note ?? ""}`.trim();
      }
    }

    // Delete meeting room on cancellation
    if (booking.meetingLink) deleteMeetingRoom(booking.meetingLink).catch(() => {});

    const [updated] = await db.update(bookingsTable)
      .set({ status: "cancelled", cancellationNote: refundNote })
      .where(eq(bookingsTable.id, bookingId))
      .returning();

    res.json(await enrichBooking(updated));
  } catch (err) {
    req.log.error({ err }, "Error cancelling booking");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/bookings/:bookingId/approve - mentor approves, generates meeting room
router.post("/:bookingId/approve", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  try {
    const bookingId = parseInt(Array.isArray(req.params.bookingId) ? req.params.bookingId[0] : req.params.bookingId);
    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.id, booking.mentorId)).limit(1);
    if (!mentor || mentor.userId !== user.id) { res.status(403).json({ error: "Only the mentor can approve this booking" }); return; }

    if (booking.status !== "awaiting_mentor_approval") {
      res.status(400).json({ error: "Booking is not awaiting approval" }); return;
    }

    const [pkg] = await db.select().from(packagesTable).where(eq(packagesTable.id, booking.packageId)).limit(1);
    const scheduledAt = booking.proposedAt ?? null;
    const meetingLink = await createMeetingRoom(bookingId, scheduledAt, pkg?.durationMinutes);

    const [updated] = await db.update(bookingsTable)
      .set({ status: "confirmed", meetingLink, scheduledAt: scheduledAt ?? undefined })
      .where(eq(bookingsTable.id, bookingId))
      .returning();

    const [menteeUser] = await db.select().from(usersTable).where(eq(usersTable.id, booking.menteeId)).limit(1);
    const [mentorUser] = await db.select().from(usersTable).where(eq(usersTable.id, mentor.userId)).limit(1);
    const packageName = pkg?.title ?? "Mentorship Session";
    const scheduledAtIso = scheduledAt?.toISOString() ?? new Date().toISOString();

    if (menteeUser?.email) {
      await sendEmail(menteeUser.email, "Your GoMindscout session is confirmed",
        meetingConfirmedEmail({ recipientName: menteeUser?.fullName ?? "there", otherPartyName: mentorUser?.fullName ?? "Your mentor", role: "mentee", scheduledAt: scheduledAtIso, packageName })
      );
    }
    if (mentorUser?.email) {
      await sendEmail(mentorUser.email, "Session confirmed - GoMindscout",
        meetingConfirmedEmail({ recipientName: mentorUser?.fullName ?? "there", otherPartyName: menteeUser?.fullName ?? "Your mentee", role: "mentor", scheduledAt: scheduledAtIso, packageName })
      );
    }

    await createNotification({
      userId: booking.menteeId,
      type: "booking_approved",
      title: "Session confirmed!",
      message: `${mentorUser?.fullName ?? "Your mentor"} approved your booking for "${packageName}". Join via your dashboard.`,
      link: "/dashboard",
    });

    res.json(await enrichBooking(updated));
  } catch (err) {
    req.log.error({ err }, "Error approving booking");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/bookings/:bookingId/reject - mentor rejects booking
router.post("/:bookingId/reject", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const { note } = req.body;
  try {
    const bookingId = parseInt(Array.isArray(req.params.bookingId) ? req.params.bookingId[0] : req.params.bookingId);
    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.id, booking.mentorId)).limit(1);
    if (!mentor || mentor.userId !== user.id) { res.status(403).json({ error: "Only the mentor can reject this booking" }); return; }

    if (booking.status !== "awaiting_mentor_approval") {
      res.status(400).json({ error: "Booking is not awaiting approval" }); return;
    }

    const [updated] = await db.update(bookingsTable)
      .set({ status: "cancelled", cancellationNote: note ? `Mentor rejected: ${note}` : "Mentor rejected this booking" })
      .where(eq(bookingsTable.id, bookingId))
      .returning();

    const [menteeUserR] = await db.select().from(usersTable).where(eq(usersTable.id, booking.menteeId)).limit(1);
    const [mentorUserR] = await db.select().from(usersTable).where(eq(usersTable.id, mentor.userId)).limit(1);
    const [pkgR] = await db.select().from(packagesTable).where(eq(packagesTable.id, booking.packageId)).limit(1);
    await createNotification({
      userId: booking.menteeId,
      type: "booking_rejected",
      title: "Booking not accepted",
      message: `${mentorUserR?.fullName ?? "Your mentor"} was unable to accept your booking for "${pkgR?.title ?? "the session"}"${note ? `: ${note}` : "."}`,
      link: "/mentors",
      userEmail: menteeUserR?.email,
      emailSubject: "Your GoMindscout booking was not accepted",
      emailHtml: bookingRejectedEmail({ menteeName: menteeUserR?.fullName ?? "there", mentorName: mentorUserR?.fullName ?? "Your mentor", packageName: pkgR?.title ?? "the session", note: note ?? null }),
    });

    res.json(await enrichBooking(updated));
  } catch (err) {
    req.log.error({ err }, "Error rejecting booking");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/bookings/:bookingId/counter-propose - mentor suggests a different time (pre-confirmation)
router.post("/:bookingId/counter-propose", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const { proposedAt } = req.body;
  try {
    const bookingId = parseInt(Array.isArray(req.params.bookingId) ? req.params.bookingId[0] : req.params.bookingId);
    if (!proposedAt) { res.status(400).json({ error: "proposedAt is required" }); return; }

    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.id, booking.mentorId)).limit(1);
    if (!mentor || mentor.userId !== user.id) { res.status(403).json({ error: "Only the mentor can counter-propose" }); return; }

    if (booking.status !== "awaiting_mentor_approval") {
      res.status(400).json({ error: "Booking is not awaiting approval" }); return;
    }

    const [updated] = await db.update(bookingsTable)
      .set({ status: "counter_proposed", mentorProposedAt: new Date(proposedAt) })
      .where(eq(bookingsTable.id, bookingId))
      .returning();

    const [menteeUserCP] = await db.select().from(usersTable).where(eq(usersTable.id, booking.menteeId)).limit(1);
    const [mentorUserCP] = await db.select().from(usersTable).where(eq(usersTable.id, mentor.userId)).limit(1);
    const [pkgCP] = await db.select().from(packagesTable).where(eq(packagesTable.id, booking.packageId)).limit(1);
    await createNotification({
      userId: booking.menteeId,
      type: "counter_proposed",
      title: "Mentor proposed a new time",
      message: `${mentorUserCP?.fullName ?? "Your mentor"} suggested a different time for "${pkgCP?.title ?? "the session"}".`,
      link: "/dashboard",
      userEmail: menteeUserCP?.email,
      emailSubject: "Your mentor proposed a new session time - GoMindscout",
      emailHtml: counterProposedEmail({ menteeName: menteeUserCP?.fullName ?? "there", mentorName: mentorUserCP?.fullName ?? "Your mentor", packageName: pkgCP?.title ?? "the session", proposedAt }),
    });

    res.json(await enrichBooking(updated));
  } catch (err) {
    req.log.error({ err }, "Error counter-proposing booking");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/bookings/:bookingId/accept-counter - mentee accepts mentor's counter-proposal
router.post("/:bookingId/accept-counter", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  try {
    const bookingId = parseInt(Array.isArray(req.params.bookingId) ? req.params.bookingId[0] : req.params.bookingId);
    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

    if (booking.menteeId !== user.id) { res.status(403).json({ error: "Only the mentee can accept a counter-proposal" }); return; }
    if (booking.status !== "counter_proposed") { res.status(400).json({ error: "No counter-proposal to accept" }); return; }

    const [pkg] = await db.select().from(packagesTable).where(eq(packagesTable.id, booking.packageId)).limit(1);
    const scheduledAt = booking.mentorProposedAt ?? null;
    const meetingLink = await createMeetingRoom(bookingId, scheduledAt, pkg?.durationMinutes);

    const [updated] = await db.update(bookingsTable)
      .set({ status: "confirmed", scheduledAt: scheduledAt ?? undefined, meetingLink })
      .where(eq(bookingsTable.id, bookingId))
      .returning();

    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.id, booking.mentorId)).limit(1);
    const [menteeUser] = await db.select().from(usersTable).where(eq(usersTable.id, booking.menteeId)).limit(1);
    const [mentorUser] = mentor ? await db.select().from(usersTable).where(eq(usersTable.id, mentor.userId)).limit(1) : [null];
    const packageName = pkg?.title ?? "Mentorship Session";
    const scheduledAtIso = (scheduledAt ?? new Date()).toISOString();

    if (menteeUser?.email) {
      await sendEmail(menteeUser.email, "Your GoMindscout session is confirmed",
        meetingConfirmedEmail({ recipientName: menteeUser?.fullName ?? "there", otherPartyName: mentorUser?.fullName ?? "Your mentor", role: "mentee", scheduledAt: scheduledAtIso, packageName })
      );
    }
    if (mentorUser?.email) {
      await sendEmail(mentorUser.email, "Session confirmed - GoMindscout",
        meetingConfirmedEmail({ recipientName: mentorUser?.fullName ?? "there", otherPartyName: menteeUser?.fullName ?? "Your mentee", role: "mentor", scheduledAt: scheduledAtIso, packageName })
      );
    }

    if (mentor) {
      await createNotification({
        userId: mentor.userId,
        type: "counter_accepted",
        title: "Counter-proposal accepted",
        message: `${menteeUser?.fullName ?? "Your mentee"} accepted your proposed time for "${packageName}".`,
        link: "/mentor/dashboard",
      });
    }

    res.json(await enrichBooking(updated));
  } catch (err) {
    req.log.error({ err }, "Error accepting counter-proposal");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/bookings/:bookingId/decline-counter - mentee declines mentor's counter-proposal
router.post("/:bookingId/decline-counter", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  try {
    const bookingId = parseInt(Array.isArray(req.params.bookingId) ? req.params.bookingId[0] : req.params.bookingId);
    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

    if (booking.menteeId !== user.id) { res.status(403).json({ error: "Only the mentee can decline a counter-proposal" }); return; }
    if (booking.status !== "counter_proposed") { res.status(400).json({ error: "No counter-proposal to decline" }); return; }

    const [updated] = await db.update(bookingsTable)
      .set({ status: "cancelled", cancellationNote: "Mentee declined mentor's counter-proposal" })
      .where(eq(bookingsTable.id, bookingId))
      .returning();

    const [mentorDC] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.id, booking.mentorId)).limit(1);
    const [mentorUserDC] = mentorDC ? await db.select().from(usersTable).where(eq(usersTable.id, mentorDC.userId)).limit(1) : [null];
    const [menteeUserDC] = await db.select().from(usersTable).where(eq(usersTable.id, booking.menteeId)).limit(1);
    const [pkgDC] = await db.select().from(packagesTable).where(eq(packagesTable.id, booking.packageId)).limit(1);
    if (mentorDC) {
      await createNotification({
        userId: mentorDC.userId,
        type: "counter_declined",
        title: "Counter-proposal declined",
        message: `${menteeUserDC?.fullName ?? "Your mentee"} declined your proposed time for "${pkgDC?.title ?? "the session"}".`,
        link: "/mentor/dashboard",
        userEmail: mentorUserDC?.email,
        emailSubject: "Your counter-proposal was declined - GoMindscout",
        emailHtml: counterDeclinedEmail({ mentorName: mentorUserDC?.fullName ?? "there", menteeName: menteeUserDC?.fullName ?? "Your mentee", packageName: pkgDC?.title ?? "the session" }),
      });
    }

    res.json(await enrichBooking(updated));
  } catch (err) {
    req.log.error({ err }, "Error declining counter-proposal");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/bookings/:bookingId/propose-reschedule
// Either party can propose a new time after booking is confirmed
router.post("/:bookingId/propose-reschedule", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const { proposedAt } = req.body;
  try {
    const bookingId = parseInt(Array.isArray(req.params.bookingId) ? req.params.bookingId[0] : req.params.bookingId);
    if (!proposedAt) { res.status(400).json({ error: "proposedAt is required" }); return; }

    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.id, booking.mentorId)).limit(1);
    const isMentee = booking.menteeId === user.id;
    const isMentor = mentor?.userId === user.id;

    if (!isMentee && !isMentor) { res.status(403).json({ error: "Access denied" }); return; }

    const reschedulableStatuses = ["confirmed", "paid_pending_session", "paid", "scheduled"];
    if (!reschedulableStatuses.includes(booking.status)) {
      res.status(400).json({ error: "Reschedule is only available for confirmed bookings" }); return;
    }

    const proposedByRole = isMentor ? "mentor" : "mentee";

    const [updated] = await db.update(bookingsTable)
      .set({
        status: "reschedule_proposed",
        rescheduleProposedBy: proposedByRole,
        rescheduleProposedAt: new Date(proposedAt),
      })
      .where(eq(bookingsTable.id, bookingId))
      .returning();

    // Notify the other party
    const [menteeUser] = await db.select().from(usersTable).where(eq(usersTable.id, booking.menteeId)).limit(1);
    const [mentorUser] = mentor ? await db.select().from(usersTable).where(eq(usersTable.id, mentor.userId)).limit(1) : [null];
    const [pkg] = await db.select().from(packagesTable).where(eq(packagesTable.id, booking.packageId)).limit(1);
    const packageName = pkg?.title ?? "the session";

    if (isMentor && menteeUser) {
      await createNotification({
        userId: booking.menteeId,
        type: "reschedule_proposed",
        title: "Mentor requested to reschedule",
        message: `${mentorUser?.fullName ?? "Your mentor"} proposed a new time for "${packageName}".`,
        link: "/dashboard",
        userEmail: menteeUser.email,
        emailSubject: "Reschedule request - GoMindscout",
        emailHtml: rescheduleProposedEmail({ recipientName: menteeUser.fullName ?? "there", proposerName: mentorUser?.fullName ?? "Your mentor", packageName, proposedAt, recipientRole: "mentee" }),
      });
    } else if (isMentee && mentor) {
      await createNotification({
        userId: mentor.userId,
        type: "reschedule_proposed",
        title: "Mentee requested to reschedule",
        message: `${menteeUser?.fullName ?? "Your mentee"} proposed a new time for "${packageName}".`,
        link: "/mentor/dashboard",
        userEmail: mentorUser?.email,
        emailSubject: "Reschedule request - GoMindscout",
        emailHtml: rescheduleProposedEmail({ recipientName: mentorUser?.fullName ?? "there", proposerName: menteeUser?.fullName ?? "Your mentee", packageName, proposedAt, recipientRole: "mentor" }),
      });
    }

    res.json(await enrichBooking(updated));
  } catch (err) {
    req.log.error({ err }, "Error proposing reschedule");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/bookings/:bookingId/accept-reschedule
// The OTHER party (not the one who proposed) accepts the new time
router.post("/:bookingId/accept-reschedule", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  try {
    const bookingId = parseInt(Array.isArray(req.params.bookingId) ? req.params.bookingId[0] : req.params.bookingId);
    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

    if (booking.status !== "reschedule_proposed") {
      res.status(400).json({ error: "No reschedule proposal to accept" }); return;
    }

    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.id, booking.mentorId)).limit(1);
    const isMentee = booking.menteeId === user.id;
    const isMentor = mentor?.userId === user.id;

    if (!isMentee && !isMentor) { res.status(403).json({ error: "Access denied" }); return; }

    // Only the OTHER party can accept
    if ((booking.rescheduleProposedBy === "mentee" && isMentee) ||
        (booking.rescheduleProposedBy === "mentor" && isMentor)) {
      res.status(403).json({ error: "You cannot accept your own reschedule proposal" }); return;
    }

    // Delete old meeting room — will regenerate with new timing
    if (booking.meetingLink) deleteMeetingRoom(booking.meetingLink).catch(() => {});

    const newScheduledAt = booking.rescheduleProposedAt ?? new Date();
    const [pkg] = await db.select().from(packagesTable).where(eq(packagesTable.id, booking.packageId)).limit(1);
    const meetingLink = await createMeetingRoom(bookingId, newScheduledAt, pkg?.durationMinutes);

    const [updated] = await db.update(bookingsTable)
      .set({
        status: "confirmed",
        scheduledAt: newScheduledAt,
        meetingLink,
        rescheduleProposedBy: null,
        rescheduleProposedAt: null,
      })
      .where(eq(bookingsTable.id, bookingId))
      .returning();

    const [menteeUser] = await db.select().from(usersTable).where(eq(usersTable.id, booking.menteeId)).limit(1);
    const [mentorUser] = mentor ? await db.select().from(usersTable).where(eq(usersTable.id, mentor.userId)).limit(1) : [null];
    const packageName = pkg?.title ?? "Mentorship Session";
    const scheduledAtIso = newScheduledAt.toISOString();

    if (menteeUser?.email) {
      await sendEmail(menteeUser.email, "Session rescheduled and confirmed - GoMindscout",
        meetingConfirmedEmail({ recipientName: menteeUser?.fullName ?? "there", otherPartyName: mentorUser?.fullName ?? "Your mentor", role: "mentee", scheduledAt: scheduledAtIso, packageName })
      );
    }
    if (mentorUser?.email) {
      await sendEmail(mentorUser.email, "Session rescheduled and confirmed - GoMindscout",
        meetingConfirmedEmail({ recipientName: mentorUser?.fullName ?? "there", otherPartyName: menteeUser?.fullName ?? "Your mentee", role: "mentor", scheduledAt: scheduledAtIso, packageName })
      );
    }

    // Notify the proposer that their reschedule was accepted
    const proposerUserId = booking.rescheduleProposedBy === "mentee" ? booking.menteeId : (mentor?.userId ?? booking.menteeId);
    const accepterName = isMentor ? (mentorUser?.fullName ?? "Your mentor") : (menteeUser?.fullName ?? "Your mentee");
    await createNotification({
      userId: proposerUserId,
      type: "reschedule_accepted",
      title: "Reschedule accepted",
      message: `${accepterName} accepted the new time for "${packageName}".`,
      link: booking.rescheduleProposedBy === "mentee" ? "/dashboard" : "/mentor/dashboard",
    });

    res.json(await enrichBooking(updated));
  } catch (err) {
    req.log.error({ err }, "Error accepting reschedule");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
