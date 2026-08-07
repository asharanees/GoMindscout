import { Router, Request, Response } from "express";
import { db, bookingsTable, usersTable, mentorProfilesTable, packagesTable, enrollmentsTable, groupSessionsTable, coursesTable } from "@workspace/db";
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

    // Handle enrollment payments (group sessions and courses)
    const enrollmentId = session.metadata?.enrollmentId;
    if (enrollmentId) {
      const eid = parseInt(enrollmentId);
      const [enrollment] = await db.select().from(enrollmentsTable).where(eq(enrollmentsTable.id, eid)).limit(1);
      if (enrollment) {
        await db.update(enrollmentsTable).set({ status: "enrolled", stripeSessionId: session.id }).where(eq(enrollmentsTable.id, eid));
        logger.info({ enrollmentId }, "Enrollment confirmed via webhook");

        // Increment enrolled count
        if (enrollment.groupSessionId) {
          const [gs] = await db.select().from(groupSessionsTable).where(eq(groupSessionsTable.id, enrollment.groupSessionId)).limit(1);
          if (gs) {
            await db.update(groupSessionsTable).set({ enrolledCount: gs.enrolledCount + 1 }).where(eq(groupSessionsTable.id, gs.id));
          }
        }
        if (enrollment.courseId) {
          const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, enrollment.courseId)).limit(1);
          if (course) {
            await db.update(coursesTable).set({ enrolledCount: course.enrolledCount + 1 }).where(eq(coursesTable.id, course.id));
          }
        }

        createNotification({
          userId: enrollment.userId,
          type: "payment_confirmed",
          title: "Enrollment confirmed",
          message: "Your enrollment was confirmed. Check your dashboard.",
          link: "/dashboard",
        }).catch(() => {});
      }
    }

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

          await createNotification({
            userId: booking.menteeId,
            type: "payment_confirmed",
            title: "Payment confirmed",
            message: `Your payment for "${pkgTitle}" was received. Awaiting mentor approval.`,
            link: "/dashboard",
          });

          if (mentor) {
            await createNotification({
              userId: mentor.userId,
              type: "booking_created",
              title: "New paid booking",
              message: `${menteeUser?.fullName ?? "A mentee"} paid for a session: ${pkgTitle}. Needs your approval.`,
              link: "/mentor/dashboard",
              userEmail: mentorUser?.email,
              emailSubject: `New paid booking awaiting your approval - ${pkgTitle}`,
              emailHtml: paymentConfirmedMentorEmail({ mentorName: mentorUser?.fullName ?? "there", menteeName: menteeUser?.fullName ?? "A mentee", packageName: pkgTitle, proposedAt: booking.proposedAt?.toISOString() ?? null }),
            });
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
