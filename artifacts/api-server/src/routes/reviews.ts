import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, reviewsTable, bookingsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, getUserByClerkId } from "../lib/auth";

const router = Router();

function reviewToResponse(review: any, menteeUser?: any) {
  return {
    id: review.id,
    bookingId: review.bookingId,
    mentorId: review.mentorId,
    menteeId: review.menteeId,
    rating: review.rating,
    punctualityRating: review.punctualityRating ?? null,
    communicationRating: review.communicationRating ?? null,
    valueRating: review.valueRating ?? null,
    comment: review.comment,
    menteeName: menteeUser?.fullName ?? null,
    menteeAvatarUrl: menteeUser?.avatarUrl ?? null,
    createdAt: review.createdAt.toISOString(),
  };
}

// POST /api/reviews
router.post("/", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const { bookingId, rating, punctualityRating, communicationRating, valueRating, comment } = req.body;

  try {
    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    if (booking.menteeId !== user.id) { res.status(403).json({ error: "Not your booking" }); return; }

    const reviewableStatuses = ["session_completed", "payout_released", "completed", "under_review"];
    if (!reviewableStatuses.includes(booking.status)) {
      res.status(400).json({ error: "Session not completed yet" });
      return;
    }

    const [existing] = await db.select().from(reviewsTable).where(eq(reviewsTable.bookingId, bookingId)).limit(1);
    if (existing) { res.status(400).json({ error: "Review already submitted" }); return; }

    if (rating < 1 || rating > 5) { res.status(400).json({ error: "Rating must be 1-5" }); return; }

    const [review] = await db.insert(reviewsTable).values({
      bookingId,
      mentorId: booking.mentorId,
      menteeId: user.id,
      rating,
      punctualityRating: punctualityRating ?? null,
      communicationRating: communicationRating ?? null,
      valueRating: valueRating ?? null,
      comment: comment ?? null,
    }).returning();

    res.status(201).json(reviewToResponse(review, user));
  } catch (err) {
    req.log.error({ err }, "Error creating review");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/reviews
router.get("/", async (req, res) => {
  try {
    const { bookingId } = req.query;
    let reviews;
    if (bookingId) {
      const bId = parseInt(bookingId as string);
      reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.bookingId, bId));
    } else {
      reviews = await db.select().from(reviewsTable);
    }
    const enriched = await Promise.all(
      reviews.map(async (review) => {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, review.menteeId)).limit(1);
        return reviewToResponse(review, user);
      })
    );
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Error listing reviews");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/mentors/:mentorId/reviews
router.get("/:mentorId/reviews", async (req, res) => {
  try {
    const mentorId = parseInt(req.params.mentorId);
    const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.mentorId, mentorId));

    const enriched = await Promise.all(
      reviews.map(async (review) => {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, review.menteeId)).limit(1);
        return reviewToResponse(review, user);
      })
    );

    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Error fetching mentor reviews");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
