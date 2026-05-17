import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, bookingsTable, packagesTable, mentorProfilesTable, usersTable, reviewsTable, disputesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, getUserByClerkId } from "../lib/auth";

const router = Router();

const PLATFORM_FEE_PERCENT = 0.20; // 20% platform fee
const MENTOR_EARNING_PERCENT = 0.80; // 80% to mentor

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  const Stripe = require("stripe");
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-04-30.basil" });
}

async function checkAndAutoReleasePayouts() {
  // Auto-release payout if 48h have passed since session_completed with no dispute
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const pending = await db.select().from(bookingsTable)
    .where(and(
      eq(bookingsTable.status, "session_completed"),
      sql`${bookingsTable.sessionCompletedAt} < ${cutoff}`
    ));

  for (const booking of pending) {
    // Check no open dispute
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
    scheduledAt: booking.scheduledAt?.toISOString() ?? null,
    sessionCompletedAt: booking.sessionCompletedAt?.toISOString() ?? null,
    meetingLink: booking.meetingLink,
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
    // Trigger 48h auto-release check (lightweight)
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

// POST /api/bookings — create booking + Stripe checkout
router.post("/", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const { packageId } = req.body;

  try {
    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [pkg] = await db.select().from(packagesTable).where(eq(packagesTable.id, packageId)).limit(1);
    if (!pkg) { res.status(404).json({ error: "Package not found" }); return; }

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
            product_data: {
              name: pkg.title,
              description: `Session with mentor`,
            },
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
      // No Stripe key — auto-confirm for dev/demo
      await db.update(bookingsTable)
        .set({ status: "paid_pending_session" })
        .where(eq(bookingsTable.id, booking.id));
      booking.status = "paid_pending_session";
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
    const bookingId = parseInt(req.params.bookingId);
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    res.json(await enrichBooking(booking));
  } catch (err) {
    req.log.error({ err }, "Error fetching booking");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/bookings/:bookingId — update status (mentor marks session complete, etc.)
router.patch("/:bookingId", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  try {
    const bookingId = parseInt(req.params.bookingId);
    const { status } = req.body;

    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const updateData: any = { status };

    // When marking session_completed, set the completion timestamp for 48h window
    if (status === "session_completed") {
      updateData.sessionCompletedAt = new Date();
    }

    const [updated] = await db.update(bookingsTable).set(updateData).where(eq(bookingsTable.id, bookingId)).returning();
    if (!updated) { res.status(404).json({ error: "Booking not found" }); return; }
    res.json(await enrichBooking(updated));
  } catch (err) {
    req.log.error({ err }, "Error updating booking status");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/bookings/:bookingId/meeting-link
router.patch("/:bookingId/meeting-link", requireAuth, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.bookingId);
    const { meetingLink, scheduledAt } = req.body;
    const updateData: any = { meetingLink, status: "paid_pending_session" };
    if (scheduledAt) updateData.scheduledAt = new Date(scheduledAt);

    const [updated] = await db.update(bookingsTable).set(updateData).where(eq(bookingsTable.id, bookingId)).returning();
    if (!updated) { res.status(404).json({ error: "Booking not found" }); return; }
    res.json(await enrichBooking(updated));
  } catch (err) {
    req.log.error({ err }, "Error updating meeting link");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/bookings/:bookingId/cancel
router.post("/:bookingId/cancel", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const { note } = req.body;

  try {
    const bookingId = parseInt(req.params.bookingId);
    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.id, booking.mentorId)).limit(1);
    const isMentee = booking.menteeId === user.id;
    const isMentor = mentor?.userId === user.id;
    if (!isMentee && !isMentor) { res.status(403).json({ error: "Access denied" }); return; }

    // Only cancellable in certain states
    const cancellableStatuses = ["pending_payment", "paid_pending_session", "paid", "scheduled"];
    if (!cancellableStatuses.includes(booking.status)) {
      res.status(400).json({ error: "This booking cannot be cancelled in its current state" });
      return;
    }

    // Determine refund type based on cancellation rules
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

export default router;
