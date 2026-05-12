import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, mentorProfilesTable, usersTable, bookingsTable, categoriesTable, reviewsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, getUserByClerkId } from "../lib/auth";

const router = Router();

async function requireAdmin(req: any, res: any) {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return null; }
  const user = await getUserByClerkId(userId);
  if (!user || user.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return null; }
  return user;
}

function mentorToResponse(mentor: any, user: any) {
  return {
    id: mentor.id,
    userId: mentor.userId,
    fullName: user?.fullName ?? null,
    avatarUrl: user?.avatarUrl ?? null,
    headline: mentor.headline,
    bio: mentor.bio,
    categoryId: mentor.categoryId,
    categoryName: null,
    industry: mentor.industry,
    expertiseTags: mentor.expertiseTags ?? [],
    yearsExperience: mentor.yearsExperience,
    languages: mentor.languages ?? [],
    hourlyRate: mentor.hourlyRate ? Number(mentor.hourlyRate) : null,
    introVideoUrl: mentor.introVideoUrl,
    linkedinUrl: mentor.linkedinUrl,
    calendlyUrl: mentor.calendlyUrl,
    status: mentor.status,
    isFeatured: mentor.isFeatured,
    averageRating: null,
    totalReviews: 0,
    totalSessions: 0,
    createdAt: mentor.createdAt.toISOString(),
  };
}

// GET /api/admin/mentors
router.get("/mentors", requireAuth, async (req, res) => {
  const user = await requireAdmin(req, res);
  if (!user) return;

  const { status } = req.query as Record<string, string>;
  try {
    let mentors;
    if (status) {
      mentors = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.status, status));
    } else {
      mentors = await db.select().from(mentorProfilesTable);
    }

    const results = await Promise.all(
      mentors.map(async (mentor) => {
        const [u] = await db.select().from(usersTable).where(eq(usersTable.id, mentor.userId)).limit(1);
        return mentorToResponse(mentor, u);
      })
    );

    res.json(results);
  } catch (err) {
    req.log.error({ err }, "Error listing mentors (admin)");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/mentors/:mentorId/approve
router.patch("/mentors/:mentorId/approve", requireAuth, async (req, res) => {
  const user = await requireAdmin(req, res);
  if (!user) return;

  const mentorId = parseInt(req.params.mentorId);
  const { status, rejectionReason } = req.body;

  try {
    const [updated] = await db
      .update(mentorProfilesTable)
      .set({ status, rejectionReason: rejectionReason ?? null })
      .where(eq(mentorProfilesTable.id, mentorId))
      .returning();

    if (!updated) { res.status(404).json({ error: "Mentor not found" }); return; }

    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, updated.userId)).limit(1);
    res.json(mentorToResponse(updated, u));
  } catch (err) {
    req.log.error({ err }, "Error approving mentor");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/mentors/:mentorId/feature
router.patch("/mentors/:mentorId/feature", requireAuth, async (req, res) => {
  const user = await requireAdmin(req, res);
  if (!user) return;

  const mentorId = parseInt(req.params.mentorId);
  const { isFeatured } = req.body;

  try {
    const [updated] = await db
      .update(mentorProfilesTable)
      .set({ isFeatured })
      .where(eq(mentorProfilesTable.id, mentorId))
      .returning();

    if (!updated) { res.status(404).json({ error: "Mentor not found" }); return; }
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, updated.userId)).limit(1);
    res.json(mentorToResponse(updated, u));
  } catch (err) {
    req.log.error({ err }, "Error toggling feature");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/bookings
router.get("/bookings", requireAuth, async (req, res) => {
  const user = await requireAdmin(req, res);
  if (!user) return;

  try {
    const bookings = await db.select().from(bookingsTable).orderBy(sql`${bookingsTable.createdAt} DESC`);

    const enriched = await Promise.all(
      bookings.map(async (booking) => {
        const [menteeUser] = await db.select().from(usersTable).where(eq(usersTable.id, booking.menteeId)).limit(1);
        const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.id, booking.mentorId)).limit(1);
        const [mentorUser] = mentor ? await db.select().from(usersTable).where(eq(usersTable.id, mentor.userId)).limit(1) : [null];
        return {
          id: booking.id,
          menteeId: booking.menteeId,
          mentorId: booking.mentorId,
          packageId: booking.packageId,
          status: booking.status,
          scheduledAt: booking.scheduledAt?.toISOString() ?? null,
          meetingLink: booking.meetingLink,
          amount: Number(booking.amount),
          platformFee: Number(booking.platformFee),
          stripeSessionId: booking.stripeSessionId,
          createdAt: booking.createdAt.toISOString(),
          mentorName: mentorUser?.fullName ?? null,
          menteeName: menteeUser?.fullName ?? null,
          packageTitle: null,
          packageType: null,
          mentorAvatarUrl: mentorUser?.avatarUrl ?? null,
          menteeAvatarUrl: menteeUser?.avatarUrl ?? null,
          hasReview: false,
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Error listing bookings (admin)");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/stats
router.get("/stats", requireAuth, async (req, res) => {
  const user = await requireAdmin(req, res);
  if (!user) return;

  try {
    const [mentorCount] = await db.select({ count: sql<number>`count(*)` }).from(mentorProfilesTable).where(eq(mentorProfilesTable.status, "approved"));
    const [pendingCount] = await db.select({ count: sql<number>`count(*)` }).from(mentorProfilesTable).where(eq(mentorProfilesTable.status, "pending"));
    const [menteeCount] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.role, "mentee"));
    const [bookingCount] = await db.select({ count: sql<number>`count(*)` }).from(bookingsTable);
    const [completedCount] = await db.select({ count: sql<number>`count(*)` }).from(bookingsTable).where(eq(bookingsTable.status, "completed"));

    const allBookings = await db.select().from(bookingsTable).where(sql`${bookingsTable.status} != 'pending_payment' AND ${bookingsTable.status} != 'cancelled' AND ${bookingsTable.status} != 'refunded'`);
    const totalRevenue = allBookings.reduce((sum, b) => sum + Number(b.platformFee), 0);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [recentCount] = await db.select({ count: sql<number>`count(*)` }).from(bookingsTable).where(sql`${bookingsTable.createdAt} > ${sevenDaysAgo}`);

    res.json({
      totalMentors: Number(mentorCount?.count ?? 0),
      pendingMentors: Number(pendingCount?.count ?? 0),
      totalMentees: Number(menteeCount?.count ?? 0),
      totalBookings: Number(bookingCount?.count ?? 0),
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      completedSessions: Number(completedCount?.count ?? 0),
      recentBookings: Number(recentCount?.count ?? 0),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching admin stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
