import { Router } from "express";
import { db, mentorProfilesTable, usersTable, bookingsTable, reviewsTable, disputesTable, payoutRequestsTable, packagesTable, mentorAvailabilityTable, chatMessagesTable, notificationsTable } from "@workspace/db";
import { eq, sql, or } from "drizzle-orm";
import { requireAdminSession } from "../middlewares/requireAdminSession";
import { sendEmail } from "../lib/email";

const router = Router();
router.use(requireAdminSession);

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
    country: mentor.country ?? null,
    expertiseTags: mentor.expertiseTags ?? [],
    yearsExperience: mentor.yearsExperience,
    languages: mentor.languages ?? [],
    hourlyRate: mentor.hourlyRate ? Number(mentor.hourlyRate) : null,
    introVideoUrl: mentor.introVideoUrl,
    linkedinUrl: mentor.linkedinUrl,
    calendlyUrl: mentor.calendlyUrl,
    status: mentor.status,
    rejectionReason: mentor.rejectionReason ?? null,
    isFeatured: mentor.isFeatured,
    averageRating: null,
    totalReviews: 0,
    totalSessions: 0,
    createdAt: mentor.createdAt.toISOString(),
  };
}

function payoutToResponse(p: any, mentorUser?: any) {
  return {
    id: p.id,
    mentorId: p.mentorId,
    mentorName: mentorUser?.fullName ?? null,
    amount: Number(p.amount),
    method: p.method,
    status: p.status,
    adminNote: p.adminNote ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function disputeToResponse(d: any, booking?: any, opener?: any, menteeUser?: any, mentorUser?: any) {
  return {
    id: d.id,
    bookingId: d.bookingId,
    openedByUserId: d.openedByUserId,
    openerName: opener?.fullName ?? null,
    reason: d.reason,
    description: d.description,
    evidenceUrl: d.evidenceUrl ?? null,
    status: d.status,
    adminDecision: d.adminDecision ?? null,
    resolutionType: d.resolutionType ?? null,
    bookingAmount: booking ? Number(booking.amount) : null,
    menteeName: menteeUser?.fullName ?? null,
    mentorName: mentorUser?.fullName ?? null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

// POST /api/admin/test-email
router.post("/test-email", async (req, res) => {
  const to = typeof req.body?.to === "string" ? req.body.to.trim() : "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    res.status(400).json({ error: "A valid recipient email is required" });
    return;
  }

  try {
    const sent = await sendEmail(
      to,
      "GoMindscout SMTP test email",
      `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:Inter,Arial,sans-serif;color:#111;max-width:560px;margin:0 auto;padding:32px 16px;">
        <div style="background:#1a7a5e;border-radius:8px;padding:24px;margin-bottom:24px;">
          <h1 style="color:#fff;font-size:22px;margin:0;">GoMindscout - SMTP Test</h1>
        </div>
        <p style="font-size:16px;">This is a test email from your GoMindscout admin panel.</p>
        <p style="font-size:14px;color:#555;line-height:1.6;">If you received this, SMTP is configured and the application can send transactional emails.</p>
        <p style="font-size:13px;color:#888;border-top:1px solid #eee;padding-top:16px;margin-top:24px;">- The GoMindscout Team</p>
      </body></html>`,
    );

    if (!sent) {
      res.status(502).json({ error: "Email was not sent. Check app logs for SMTP configuration or delivery errors." });
      return;
    }

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Error sending admin test email");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/mentors
router.get("/mentors", async (req, res) => {
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
router.patch("/mentors/:mentorId/approve", async (req, res) => {
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
router.patch("/mentors/:mentorId/feature", async (req, res) => {
  const mentorId = parseInt(req.params.mentorId);
  const { isFeatured } = req.body;
  try {
    const [updated] = await db.update(mentorProfilesTable).set({ isFeatured }).where(eq(mentorProfilesTable.id, mentorId)).returning();
    if (!updated) { res.status(404).json({ error: "Mentor not found" }); return; }
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, updated.userId)).limit(1);
    res.json(mentorToResponse(updated, u));
  } catch (err) {
    req.log.error({ err }, "Error toggling feature");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/users/:userId/suspend
router.patch("/users/:userId/suspend", async (req, res) => {
  const userId = parseInt(req.params.userId);
  const { suspended } = req.body;
  try {
    // Suspend user's mentor profile if they have one
    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.userId, userId)).limit(1);
    if (mentor) {
      await db.update(mentorProfilesTable)
        .set({ status: suspended ? "suspended" : "approved" })
        .where(eq(mentorProfilesTable.id, mentor.id));
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json({
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      fullName: user.fullName ?? null,
      avatarUrl: user.avatarUrl ?? null,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error suspending user");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/admin/mentors/:mentorId - hard delete a mentor and all related data
router.delete("/mentors/:mentorId", async (req, res) => {
  const mentorId = parseInt(req.params.mentorId);
  try {
    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.id, mentorId)).limit(1);
    if (!mentor) { res.status(404).json({ error: "Mentor not found" }); return; }

    // Delete dependent records in dependency order
    // Delete chat messages for bookings with this mentor first (FK constraint)
    const mentorBookings = await db.select({ id: bookingsTable.id }).from(bookingsTable).where(eq(bookingsTable.mentorId, mentorId));
    if (mentorBookings.length > 0) {
      const bookingIds = mentorBookings.map(b => b.id);
      await db.delete(chatMessagesTable).where(sql`${chatMessagesTable.bookingId} in ${bookingIds}`);
    }
    await db.delete(reviewsTable).where(eq(reviewsTable.mentorId, mentorId));
    await db.delete(payoutRequestsTable).where(eq(payoutRequestsTable.mentorId, mentorId));
    await db.delete(bookingsTable).where(eq(bookingsTable.mentorId, mentorId));
    await db.delete(packagesTable).where(eq(packagesTable.mentorId, mentorId));
    await db.delete(mentorAvailabilityTable).where(eq(mentorAvailabilityTable.mentorId, mentorId));

    // Delete mentor profile
    await db.delete(mentorProfilesTable).where(eq(mentorProfilesTable.id, mentorId));

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting mentor (admin)");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/admin/users/:userId - hard delete a user and all associated data
router.delete("/users/:userId", async (req, res) => {
  const userId = parseInt(req.params.userId);
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [mentorProfile] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.userId, userId)).limit(1);
    const mentorId = mentorProfile?.id;

    // Delete chat messages for bookings this user is involved in (FK constraint)
    const userBookings = await db.select({ id: bookingsTable.id }).from(bookingsTable).where(
      or(eq(bookingsTable.menteeId, userId), mentorId ? eq(bookingsTable.mentorId, mentorId) : undefined)
    );
    if (userBookings.length > 0) {
      const bookingIds = userBookings.map(b => b.id);
      await db.delete(chatMessagesTable).where(sql`${chatMessagesTable.bookingId} in ${bookingIds}`);
    }

    if (mentorId) {
      await db.delete(reviewsTable).where(eq(reviewsTable.mentorId, mentorId));
      await db.delete(payoutRequestsTable).where(eq(payoutRequestsTable.mentorId, mentorId));
      await db.delete(packagesTable).where(eq(packagesTable.mentorId, mentorId));
      await db.delete(mentorAvailabilityTable).where(eq(mentorAvailabilityTable.mentorId, mentorId));
    }

    await db.delete(bookingsTable).where(eq(bookingsTable.menteeId, userId));
    if (mentorId) {
      await db.delete(bookingsTable).where(eq(bookingsTable.mentorId, mentorId));
    }
    await db.delete(disputesTable).where(eq(disputesTable.openedByUserId, userId));
    await db.delete(notificationsTable).where(eq(notificationsTable.userId, userId));

    if (mentorId) {
      await db.delete(mentorProfilesTable).where(eq(mentorProfilesTable.id, mentorId));
    }

    await db.delete(usersTable).where(eq(usersTable.id, userId));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting user (admin)");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/bookings
router.get("/bookings", async (req, res) => {
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
          sessionCompletedAt: booking.sessionCompletedAt?.toISOString() ?? null,
          meetingLink: booking.meetingLink,
          amount: Number(booking.amount),
          platformFee: Number(booking.platformFee),
          mentorEarning: booking.mentorEarning ? Number(booking.mentorEarning) : null,
          stripeSessionId: booking.stripeSessionId,
          createdAt: booking.createdAt.toISOString(),
          mentorName: mentorUser?.fullName ?? null,
          menteeName: menteeUser?.fullName || menteeUser?.email?.split("@")[0] || "-",
          menteeEmail: menteeUser?.email || null,
          mentorAvatarUrl: mentorUser?.avatarUrl ?? null,
          menteeAvatarUrl: menteeUser?.avatarUrl ?? null,
          hasReview: false,
          hasDispute: false,
        };
      })
    );
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Error listing bookings (admin)");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/disputes
router.get("/disputes", async (req, res) => {
  try {
    const disputes = await db.select().from(disputesTable).orderBy(sql`${disputesTable.createdAt} DESC`);
    const enriched = await Promise.all(
      disputes.map(async (d) => {
        const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, d.bookingId)).limit(1);
        const [opener] = await db.select().from(usersTable).where(eq(usersTable.id, d.openedByUserId)).limit(1);
        const menteeUser = booking ? await db.select().from(usersTable).where(eq(usersTable.id, booking.menteeId)).limit(1).then(r => r[0]) : null;
        const mentor = booking ? await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.id, booking.mentorId)).limit(1).then(r => r[0]) : null;
        const mentorUser = mentor ? await db.select().from(usersTable).where(eq(usersTable.id, mentor.userId)).limit(1).then(r => r[0]) : null;
        return disputeToResponse(d, booking, opener, menteeUser, mentorUser);
      })
    );
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Error listing disputes (admin)");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/disputes/:disputeId/resolve
router.patch("/disputes/:disputeId/resolve", async (req, res) => {
  const disputeId = parseInt(req.params.disputeId);
  const { resolutionType, adminDecision } = req.body;
  try {
    const [updated] = await db.update(disputesTable)
      .set({ status: "resolved", resolutionType, adminDecision, updatedAt: new Date() })
      .where(eq(disputesTable.id, disputeId))
      .returning();
    if (!updated) { res.status(404).json({ error: "Dispute not found" }); return; }

    // Update booking status based on resolution
    if (resolutionType === "release_to_mentor") {
      await db.update(bookingsTable).set({ status: "payout_released" }).where(eq(bookingsTable.id, updated.bookingId));
    } else {
      // Refund paths
      await db.update(bookingsTable).set({ status: "refunded" }).where(eq(bookingsTable.id, updated.bookingId));
    }

    const [opener] = await db.select().from(usersTable).where(eq(usersTable.id, updated.openedByUserId)).limit(1);
    res.json(disputeToResponse(updated, null, opener));
  } catch (err) {
    req.log.error({ err }, "Error resolving dispute");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/payouts
router.get("/payouts", async (req, res) => {
  try {
    const payouts = await db.select().from(payoutRequestsTable).orderBy(sql`${payoutRequestsTable.createdAt} DESC`);
    const enriched = await Promise.all(
      payouts.map(async (p) => {
        const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.id, p.mentorId)).limit(1);
        const [mentorUser] = mentor ? await db.select().from(usersTable).where(eq(usersTable.id, mentor.userId)).limit(1) : [null];
        return payoutToResponse(p, mentorUser);
      })
    );
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Error listing payouts (admin)");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/admin/payouts/:payoutId
router.patch("/payouts/:payoutId", async (req, res) => {
  const payoutId = parseInt(req.params.payoutId);
  const { status, adminNote } = req.body;
  try {
    const [updated] = await db.update(payoutRequestsTable)
      .set({ status, adminNote: adminNote ?? null, updatedAt: new Date() })
      .where(eq(payoutRequestsTable.id, payoutId))
      .returning();
    if (!updated) { res.status(404).json({ error: "Payout not found" }); return; }
    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.id, updated.mentorId)).limit(1);
    const [mentorUser] = mentor ? await db.select().from(usersTable).where(eq(usersTable.id, mentor.userId)).limit(1) : [null];
    res.json(payoutToResponse(updated, mentorUser));
  } catch (err) {
    req.log.error({ err }, "Error updating payout");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/users/:userId
router.get("/users/:userId", async (req, res) => {
  const userId = parseInt(req.params.userId);
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [mentorProfile] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.userId, userId)).limit(1);
    const mentorId = mentorProfile?.id;

    const userBookings = await db.select().from(bookingsTable).where(
      or(eq(bookingsTable.menteeId, userId), mentorId ? eq(bookingsTable.mentorId, mentorId) : undefined)
    ).orderBy(sql`${bookingsTable.createdAt} DESC`);

    const enrichedBookings = await Promise.all(
      userBookings.map(async (booking) => {
        const [mentee] = await db.select().from(usersTable).where(eq(usersTable.id, booking.menteeId)).limit(1);
        const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.id, booking.mentorId)).limit(1);
        const [mentorUser] = mentor ? await db.select().from(usersTable).where(eq(usersTable.id, mentor.userId)).limit(1) : [null];
        return {
          id: booking.id,
          status: booking.status,
          amount: Number(booking.amount),
          platformFee: Number(booking.platformFee),
          mentorEarning: booking.mentorEarning ? Number(booking.mentorEarning) : null,
          createdAt: booking.createdAt.toISOString(),
          menteeName: mentee?.fullName || mentee?.email?.split("@")[0] || "-",
          mentorName: mentorUser?.fullName || "-",
        };
      })
    );

    const reviews = mentorId ? await db.select().from(reviewsTable).where(eq(reviewsTable.mentorId, mentorId)) : [];
    const avgRating = reviews.length > 0
      ? Math.round((reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length) * 10) / 10
      : null;

    const totalSpent = userBookings
      .filter(b => b.menteeId === userId && !["pending_payment", "cancelled", "refunded"].includes(b.status))
      .reduce((sum, b) => sum + Number(b.amount), 0);

    const totalEarned = mentorId
      ? userBookings
          .filter(b => b.mentorId === mentorId && b.status === "completed")
          .reduce((sum, b) => sum + (b.mentorEarning ? Number(b.mentorEarning) : 0), 0)
      : 0;

    const payouts = mentorId
      ? await db.select().from(payoutRequestsTable).where(eq(payoutRequestsTable.mentorId, mentorId)).orderBy(sql`${payoutRequestsTable.createdAt} DESC`)
      : [];

    res.json({
      user: {
        id: user.id,
        fullName: user.fullName || null,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl ?? null,
        createdAt: user.createdAt.toISOString(),
      },
      mentorProfile: mentorProfile ? {
        id: mentorProfile.id,
        headline: mentorProfile.headline,
        status: mentorProfile.status,
        hourlyRate: mentorProfile.hourlyRate ? Number(mentorProfile.hourlyRate) : null,
        bio: mentorProfile.bio,
        industry: mentorProfile.industry,
        isFeatured: mentorProfile.isFeatured,
        totalReviews: reviews.length,
        averageRating: avgRating,
      } : null,
      bookings: enrichedBookings,
      totalSpent: Math.round(totalSpent * 100) / 100,
      totalEarned: Math.round(totalEarned * 100) / 100,
      payouts: payouts.map(p => ({
        id: p.id,
        amount: Number(p.amount),
        status: p.status,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching user details (admin)");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/stats
router.get("/stats", async (req, res) => {
  try {
    const [mentorCount] = await db.select({ count: sql<number>`count(*)` }).from(mentorProfilesTable).where(eq(mentorProfilesTable.status, "approved"));
    const [pendingCount] = await db.select({ count: sql<number>`count(*)` }).from(mentorProfilesTable).where(eq(mentorProfilesTable.status, "pending"));
    const [menteeCount] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.role, "mentee"));
    const [bookingCount] = await db.select({ count: sql<number>`count(*)` }).from(bookingsTable);
    const [disputeCount] = await db.select({ count: sql<number>`count(*)` }).from(disputesTable).where(sql`${disputesTable.status} != 'resolved'`);
    const [pendingPayoutCount] = await db.select({ count: sql<number>`count(*)` }).from(payoutRequestsTable).where(eq(payoutRequestsTable.status, "pending"));

    const allBookings = await db.select().from(bookingsTable).where(
      sql`${bookingsTable.status} NOT IN ('pending_payment', 'cancelled', 'refunded')`
    );
    const totalRevenue = allBookings.reduce((sum, b) => sum + Number(b.platformFee), 0);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [recentCount] = await db.select({ count: sql<number>`count(*)` }).from(bookingsTable).where(sql`${bookingsTable.createdAt} > ${sevenDaysAgo}`);

    const [completedCount] = await db.select({ count: sql<number>`count(*)` }).from(bookingsTable).where(
      sql`${bookingsTable.status} IN ('session_completed', 'payout_released', 'completed')`
    );

    res.json({
      totalMentors: Number(mentorCount?.count ?? 0),
      pendingMentors: Number(pendingCount?.count ?? 0),
      totalMentees: Number(menteeCount?.count ?? 0),
      totalBookings: Number(bookingCount?.count ?? 0),
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      completedSessions: Number(completedCount?.count ?? 0),
      recentBookings: Number(recentCount?.count ?? 0),
      openDisputes: Number(disputeCount?.count ?? 0),
      pendingPayouts: Number(pendingPayoutCount?.count ?? 0),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching admin stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
