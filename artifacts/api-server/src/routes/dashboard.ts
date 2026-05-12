import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, bookingsTable, mentorProfilesTable, reviewsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, getUserByClerkId } from "../lib/auth";

const router = Router();

// GET /api/dashboard/mentee-stats
router.get("/mentee-stats", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  try {
    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const bookings = await db.select().from(bookingsTable).where(eq(bookingsTable.menteeId, user.id));
    const totalBookings = bookings.length;
    const completedSessions = bookings.filter(b => b.status === "completed").length;
    const upcomingSessions = bookings.filter(b => b.status === "scheduled" || b.status === "paid").length;
    const totalSpent = bookings
      .filter(b => b.status !== "pending_payment" && b.status !== "cancelled" && b.status !== "refunded")
      .reduce((sum, b) => sum + Number(b.amount), 0);

    // Count bookings that are completed but have no review
    const completedBookingIds = bookings.filter(b => b.status === "completed").map(b => b.id);
    let pendingReviews = 0;
    for (const bid of completedBookingIds) {
      const [review] = await db.select().from(reviewsTable).where(eq(reviewsTable.bookingId, bid)).limit(1);
      if (!review) pendingReviews++;
    }

    res.json({ totalBookings, completedSessions, upcomingSessions, totalSpent: Math.round(totalSpent * 100) / 100, pendingReviews });
  } catch (err) {
    req.log.error({ err }, "Error fetching mentee stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/dashboard/mentor-stats
router.get("/mentor-stats", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  try {
    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.userId, user.id)).limit(1);
    if (!mentor) {
      res.json({ totalBookings: 0, completedSessions: 0, upcomingSessions: 0, totalEarnings: 0, averageRating: null, totalReviews: 0, profileStatus: "none" });
      return;
    }

    const bookings = await db.select().from(bookingsTable).where(eq(bookingsTable.mentorId, mentor.id));
    const completedSessions = bookings.filter(b => b.status === "completed").length;
    const upcomingSessions = bookings.filter(b => b.status === "scheduled" || b.status === "paid").length;
    const totalEarnings = bookings
      .filter(b => b.status === "completed")
      .reduce((sum, b) => sum + (Number(b.amount) - Number(b.platformFee)), 0);

    const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.mentorId, mentor.id));
    const avgRating = reviews.length > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : null;

    res.json({
      totalBookings: bookings.length,
      completedSessions,
      upcomingSessions,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      averageRating: avgRating,
      totalReviews: reviews.length,
      profileStatus: mentor.status,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching mentor stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
