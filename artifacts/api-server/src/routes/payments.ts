import { Router, Request, Response } from "express";
import { db, bookingsTable, usersTable, mentorProfilesTable, packagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { createNotification } from "../lib/notifications";
import { paymentConfirmedMentorEmail } from "../lib/email";

const router = Router();

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  const Stripe = require("stripe");
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-04-30.basil" });
}

// POST /api/payments/webhook - Stripe webhook (raw body already set in app.ts)
router.post("/webhook", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = getStripe();

  if (!webhookSecret || !stripe) {
    res.json({ received: true });
    return;
  }

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    logger.error({ err }, "Stripe webhook signature verification failed");
    res.status(400).send("Webhook Error");
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const bookingId = session.metadata?.bookingId;
    if (bookingId) {
      const bid = parseInt(bookingId);
      await db
        .update(bookingsTable)
        .set({ status: "awaiting_mentor_approval", stripeSessionId: session.id })
        .where(eq(bookingsTable.id, bid));
      logger.info({ bookingId }, "Booking marked as awaiting_mentor_approval via webhook");

      try {
        const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bid)).limit(1);
        if (booking) {
          const [menteeUser] = await db.select().from(usersTable).where(eq(usersTable.id, booking.menteeId)).limit(1);
          const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.id, booking.mentorId)).limit(1);
          const [mentorUser] = mentor ? await db.select().from(usersTable).where(eq(usersTable.id, mentor.userId)).limit(1) : [null];
          const [pkg] = await db.select().from(packagesTable).where(eq(packagesTable.id, booking.packageId)).limit(1);
          const pkgTitle = pkg?.title ?? "Mentorship Session";

          createNotification({
            userId: booking.menteeId,
            type: "payment_confirmed",
            title: "Payment confirmed",
            message: `Your payment for "${pkgTitle}" was received. Awaiting mentor approval.`,
            link: "/dashboard",
          }).catch(() => {});

          if (mentor) {
            createNotification({
              userId: mentor.userId,
              type: "booking_created",
              title: "New paid booking",
              message: `${menteeUser?.fullName ?? "A mentee"} paid for a session: ${pkgTitle}. Needs your approval.`,
              link: "/mentor/dashboard",
              userEmail: mentorUser?.email,
              emailSubject: `New paid booking awaiting your approval - ${pkgTitle}`,
              emailHtml: paymentConfirmedMentorEmail({ mentorName: mentorUser?.fullName ?? "there", menteeName: menteeUser?.fullName ?? "A mentee", packageName: pkgTitle, proposedAt: booking.proposedAt?.toISOString() ?? null }),
            }).catch(() => {});
          }
        }
      } catch (notifErr) {
        logger.error({ notifErr }, "Failed to send payment notifications");
      }
    }
  }

  res.json({ received: true });
});

export default router;
