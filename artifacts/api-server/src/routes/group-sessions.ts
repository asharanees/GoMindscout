import { Router } from "express";
import { getAuth } from "@clerk/express";
import {
  db,
  groupSessionsTable,
  enrollmentsTable,
  mentorProfilesTable,
  usersTable,
  categoriesTable,
} from "@workspace/db";
import { eq, and, isNull, sql, desc } from "drizzle-orm";
import { requireAuth, getUserByClerkId } from "../lib/auth";
import { createMeetingRoom, createMeetingToken } from "../lib/meeting";
import { createNotification } from "../lib/notifications";
import { logger } from "../lib/logger";

const router = Router();

const PLATFORM_FEE_PERCENT = 0.20;
const MENTOR_EARNING_PERCENT = 0.80;

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  const Stripe = require("stripe");
  return new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-04-30.basil" });
}

async function enrichSession(session: any, currentUserId?: number) {
  const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.id, session.mentorId)).limit(1);
  const [mentorUser] = mentor ? await db.select().from(usersTable).where(eq(usersTable.id, mentor.userId)).limit(1) : [null];
  const [category] = session.categoryId
    ? await db.select().from(categoriesTable).where(eq(categoriesTable.id, session.categoryId)).limit(1)
    : [null];

  let isEnrolled = false;
  if (currentUserId) {
    const [enrollment] = await db
      .select()
      .from(enrollmentsTable)
      .where(
        and(
          eq(enrollmentsTable.userId, currentUserId),
          eq(enrollmentsTable.groupSessionId, session.id),
          sql`${enrollmentsTable.status} != 'cancelled'`
        )
      )
      .limit(1);
    if (enrollment) isEnrolled = true;

    // Also check course enrollment if this session belongs to a course
    if (!isEnrolled && session.courseId) {
      const [courseEnrollment] = await db
        .select()
        .from(enrollmentsTable)
        .where(
          and(
            eq(enrollmentsTable.userId, currentUserId),
            eq(enrollmentsTable.courseId, session.courseId),
            sql`${enrollmentsTable.status} != 'cancelled'`
          )
        )
        .limit(1);
      if (courseEnrollment) isEnrolled = true;
    }
  }

  return {
    id: session.id,
    mentorId: session.mentorId,
    courseId: session.courseId ?? null,
    categoryId: session.categoryId ?? null,
    categoryName: category?.name ?? null,
    title: session.title,
    description: session.description ?? null,
    price: Number(session.price),
    maxSeats: session.maxSeats,
    enrolledCount: session.enrolledCount,
    scheduledAt: session.scheduledAt?.toISOString() ?? null,
    durationMinutes: session.durationMinutes,
    meetingLink: session.meetingLink ?? null,
    status: session.status,
    thumbnailUrl: session.thumbnailUrl ?? null,
    level: session.level ?? null,
    sessionOrder: session.sessionOrder ?? null,
    isMasterclass: session.courseId === null,
    mentorName: mentorUser?.fullName ?? null,
    mentorAvatarUrl: mentorUser?.avatarUrl ?? null,
    mentorHeadline: mentor?.headline ?? null,
    isEnrolled,
    createdAt: session.createdAt.toISOString(),
  };
}

// GET /api/group-sessions
router.get("/", async (req, res) => {
  try {
    const {
      mentorId,
      categoryId,
      isMasterclass,
      status,
      page = "1",
      limit = "20",
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions: any[] = [];
    if (mentorId) conditions.push(eq(groupSessionsTable.mentorId, parseInt(mentorId)));
    if (categoryId) conditions.push(eq(groupSessionsTable.categoryId, parseInt(categoryId)));
    if (isMasterclass === "true") conditions.push(isNull(groupSessionsTable.courseId));
    if (status) conditions.push(eq(groupSessionsTable.status, status));
    else conditions.push(sql`${groupSessionsTable.status} != 'cancelled'`);

    const { userId: clerkId } = getAuth(req);
    let currentUserId: number | undefined;
    if (clerkId) {
      const user = await getUserByClerkId(clerkId);
      currentUserId = user?.id;
    }

    const sessions = await db
      .select()
      .from(groupSessionsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(groupSessionsTable.scheduledAt))
      .limit(limitNum)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(groupSessionsTable)
      .where(conditions.length ? and(...conditions) : undefined);

    const enriched = await Promise.all(sessions.map((s) => enrichSession(s, currentUserId)));

    res.json({ sessions: enriched, total: Number(count), page: pageNum, limit: limitNum });
  } catch (err) {
    logger.error({ err }, "Error listing group sessions");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/group-sessions
router.post("/", requireAuth, async (req, res) => {
  try {
    const { userId: clerkId } = getAuth(req);
    const user = await getUserByClerkId(clerkId!);
    if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.userId, user.id)).limit(1);
    if (!mentor) { res.status(403).json({ error: "Mentor profile required" }); return; }
    if (mentor.status !== "approved") { res.status(403).json({ error: "Mentor must be approved" }); return; }

    const {
      courseId, categoryId, title, description, price = 0,
      maxSeats = 20, scheduledAt, durationMinutes = 60,
      thumbnailUrl, level, sessionOrder,
    } = req.body;

    if (!title) { res.status(400).json({ error: "title is required" }); return; }

    const [session] = await db
      .insert(groupSessionsTable)
      .values({
        mentorId: mentor.id,
        courseId: courseId ?? null,
        categoryId: categoryId ?? null,
        title,
        description: description ?? null,
        price: String(price),
        maxSeats,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        durationMinutes,
        thumbnailUrl: thumbnailUrl ?? null,
        level: level ?? null,
        sessionOrder: sessionOrder ?? null,
      })
      .returning();

    res.status(201).json(await enrichSession(session));
  } catch (err: any) {
    logger.error({ err }, "Error creating group session");
    res.status(500).json({ error: "Internal server error", detail: process.env.NODE_ENV !== "production" ? String(err?.message ?? err) : undefined });
  }
});

// GET /api/group-sessions/my
router.get("/my", requireAuth, async (req, res) => {
  try {
    const { userId: clerkId } = getAuth(req);
    const user = await getUserByClerkId(clerkId!);
    if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.userId, user.id)).limit(1);
    if (!mentor) { res.status(404).json({ error: "No mentor profile" }); return; }

    const sessions = await db
      .select()
      .from(groupSessionsTable)
      .where(eq(groupSessionsTable.mentorId, mentor.id))
      .orderBy(desc(groupSessionsTable.createdAt));

    const enriched = await Promise.all(sessions.map((s) => enrichSession(s, user.id)));
    res.json(enriched);
  } catch (err) {
    logger.error({ err }, "Error listing own group sessions");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/group-sessions/:sessionId
router.get("/:sessionId", async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId as string);
    const [session] = await db.select().from(groupSessionsTable).where(eq(groupSessionsTable.id, sessionId)).limit(1);
    if (!session) { res.status(404).json({ error: "Not found" }); return; }

    const { userId: clerkId } = getAuth(req);
    let currentUserId: number | undefined;
    if (clerkId) {
      const user = await getUserByClerkId(clerkId);
      currentUserId = user?.id;
    }

    res.json(await enrichSession(session, currentUserId));
  } catch (err) {
    logger.error({ err }, "Error getting group session");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/group-sessions/:sessionId
router.patch("/:sessionId", requireAuth, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId as string);
    const { userId: clerkId } = getAuth(req);
    const user = await getUserByClerkId(clerkId!);
    if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [session] = await db.select().from(groupSessionsTable).where(eq(groupSessionsTable.id, sessionId)).limit(1);
    if (!session) { res.status(404).json({ error: "Not found" }); return; }

    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.userId, user.id)).limit(1);
    if (!mentor || mentor.id !== session.mentorId) { res.status(403).json({ error: "Forbidden" }); return; }

    const { title, description, price, maxSeats, scheduledAt, durationMinutes, thumbnailUrl, level, status } = req.body;

    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = String(price);
    if (maxSeats !== undefined) updates.maxSeats = maxSeats;
    if (scheduledAt !== undefined) updates.scheduledAt = new Date(scheduledAt);
    if (durationMinutes !== undefined) updates.durationMinutes = durationMinutes;
    if (thumbnailUrl !== undefined) updates.thumbnailUrl = thumbnailUrl;
    if (level !== undefined) updates.level = level;
    if (status !== undefined) updates.status = status;

    const [updated] = await db.update(groupSessionsTable).set(updates).where(eq(groupSessionsTable.id, sessionId)).returning();
    res.json(await enrichSession(updated, user.id));
  } catch (err) {
    logger.error({ err }, "Error updating group session");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/group-sessions/:sessionId
router.delete("/:sessionId", requireAuth, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId as string);
    const { userId: clerkId } = getAuth(req);
    const user = await getUserByClerkId(clerkId!);
    if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [session] = await db.select().from(groupSessionsTable).where(eq(groupSessionsTable.id, sessionId)).limit(1);
    if (!session) { res.status(404).json({ error: "Not found" }); return; }

    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.userId, user.id)).limit(1);
    if (!mentor || mentor.id !== session.mentorId) { res.status(403).json({ error: "Forbidden" }); return; }

    await db.delete(groupSessionsTable).where(eq(groupSessionsTable.id, sessionId));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Error deleting group session");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/group-sessions/:sessionId/enroll
router.post("/:sessionId/enroll", requireAuth, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId as string);
    const { userId: clerkId } = getAuth(req);
    const user = await getUserByClerkId(clerkId!);
    if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [session] = await db.select().from(groupSessionsTable).where(eq(groupSessionsTable.id, sessionId)).limit(1);
    if (!session) { res.status(404).json({ error: "Session not found" }); return; }
    if (session.status === "cancelled" || session.status === "completed") {
      res.status(400).json({ error: "Session is not open for enrollment" });
      return;
    }
    if (session.enrolledCount >= session.maxSeats) {
      res.status(400).json({ error: "Session is full" });
      return;
    }

    // Check already enrolled
    const [existing] = await db
      .select()
      .from(enrollmentsTable)
      .where(
        and(
          eq(enrollmentsTable.userId, user.id),
          eq(enrollmentsTable.groupSessionId, sessionId),
          sql`${enrollmentsTable.status} != 'cancelled'`
        )
      )
      .limit(1);
    if (existing) { res.status(400).json({ error: "Already enrolled" }); return; }

    const price = Number(session.price);
    const platformFee = parseFloat((price * PLATFORM_FEE_PERCENT).toFixed(2));
    const mentorEarning = parseFloat((price * MENTOR_EARNING_PERCENT).toFixed(2));

    const stripe = getStripe();
    if (!stripe || price === 0) {
      // Auto-confirm (free session or no Stripe)
      const [enrollment] = await db
        .insert(enrollmentsTable)
        .values({
          userId: user.id,
          groupSessionId: sessionId,
          status: "enrolled",
          amount: String(price),
          platformFee: String(platformFee),
          mentorEarning: String(mentorEarning),
        })
        .returning();

      await db.update(groupSessionsTable).set({ enrolledCount: session.enrolledCount + 1 }).where(eq(groupSessionsTable.id, sessionId));

      res.status(201).json({
        enrollment: {
          id: enrollment.id,
          userId: enrollment.userId,
          groupSessionId: enrollment.groupSessionId ?? null,
          courseId: enrollment.courseId ?? null,
          status: enrollment.status,
          amount: Number(enrollment.amount),
          platformFee: Number(enrollment.platformFee),
          mentorEarning: enrollment.mentorEarning ? Number(enrollment.mentorEarning) : null,
          stripeSessionId: null,
          userName: user.fullName ?? null,
          userAvatarUrl: user.avatarUrl ?? null,
          sessionTitle: session.title,
          courseTitle: null,
          scheduledAt: session.scheduledAt?.toISOString() ?? null,
          createdAt: enrollment.createdAt.toISOString(),
        },
        checkoutUrl: "/dashboard",
      });
      return;
    }

    // Create pending enrollment first
    const [enrollment] = await db
      .insert(enrollmentsTable)
      .values({
        userId: user.id,
        groupSessionId: sessionId,
        status: "pending_payment",
        amount: String(price),
        platformFee: String(platformFee),
        mentorEarning: String(mentorEarning),
      })
      .returning();

    const origin = `${req.protocol}://${req.headers.host}`;
    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: session.title, description: `Group session — ${session.durationMinutes} min` },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/dashboard?enrolled=true`,
      cancel_url: `${origin}/learn/sessions/${sessionId}`,
      metadata: { enrollmentId: String(enrollment.id), type: "group_session" },
    });

    await db.update(enrollmentsTable).set({ stripeSessionId: stripeSession.id }).where(eq(enrollmentsTable.id, enrollment.id));

    res.status(201).json({
      enrollment: {
        id: enrollment.id,
        userId: enrollment.userId,
        groupSessionId: enrollment.groupSessionId ?? null,
        courseId: enrollment.courseId ?? null,
        status: enrollment.status,
        amount: Number(enrollment.amount),
        platformFee: Number(enrollment.platformFee),
        mentorEarning: enrollment.mentorEarning ? Number(enrollment.mentorEarning) : null,
        stripeSessionId: stripeSession.id,
        userName: user.fullName ?? null,
        userAvatarUrl: user.avatarUrl ?? null,
        sessionTitle: session.title,
        courseTitle: null,
        scheduledAt: session.scheduledAt?.toISOString() ?? null,
        createdAt: enrollment.createdAt.toISOString(),
      },
      checkoutUrl: stripeSession.url,
    });
  } catch (err) {
    logger.error({ err }, "Error enrolling in group session");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/group-sessions/:sessionId/enrollments
router.get("/:sessionId/enrollments", requireAuth, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId as string);
    const { userId: clerkId } = getAuth(req);
    const user = await getUserByClerkId(clerkId!);
    if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [session] = await db.select().from(groupSessionsTable).where(eq(groupSessionsTable.id, sessionId)).limit(1);
    if (!session) { res.status(404).json({ error: "Not found" }); return; }

    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.userId, user.id)).limit(1);
    if (!mentor || mentor.id !== session.mentorId) { res.status(403).json({ error: "Forbidden" }); return; }

    const enrollments = await db
      .select()
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.groupSessionId, sessionId));

    const enriched = await Promise.all(
      enrollments.map(async (e) => {
        const [enrollUser] = await db.select().from(usersTable).where(eq(usersTable.id, e.userId)).limit(1);
        return {
          id: e.id,
          userId: e.userId,
          groupSessionId: e.groupSessionId ?? null,
          courseId: e.courseId ?? null,
          status: e.status,
          amount: Number(e.amount),
          platformFee: Number(e.platformFee),
          mentorEarning: e.mentorEarning ? Number(e.mentorEarning) : null,
          stripeSessionId: e.stripeSessionId ?? null,
          userName: enrollUser?.fullName ?? null,
          userAvatarUrl: enrollUser?.avatarUrl ?? null,
          sessionTitle: session.title,
          courseTitle: null,
          scheduledAt: session.scheduledAt?.toISOString() ?? null,
          createdAt: e.createdAt.toISOString(),
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    logger.error({ err }, "Error listing enrollments");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/group-sessions/:sessionId/start
router.post("/:sessionId/start", requireAuth, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId as string);
    const { userId: clerkId } = getAuth(req);
    const user = await getUserByClerkId(clerkId!);
    if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [session] = await db.select().from(groupSessionsTable).where(eq(groupSessionsTable.id, sessionId)).limit(1);
    if (!session) { res.status(404).json({ error: "Not found" }); return; }

    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.userId, user.id)).limit(1);
    if (!mentor || mentor.id !== session.mentorId) { res.status(403).json({ error: "Forbidden" }); return; }

    // Reuse existing meeting link or create new one
    let meetingLink = session.meetingLink;
    if (!meetingLink) {
      meetingLink = await createMeetingRoom(sessionId);
    }

    const [updated] = await db
      .update(groupSessionsTable)
      .set({ meetingLink, status: "live" })
      .where(eq(groupSessionsTable.id, sessionId))
      .returning();

    // Notify all enrolled users
    const enrollments = await db
      .select()
      .from(enrollmentsTable)
      .where(and(eq(enrollmentsTable.groupSessionId, sessionId), eq(enrollmentsTable.status, "enrolled")));

    for (const enrollment of enrollments) {
      createNotification({
        userId: enrollment.userId,
        type: "booking_created",
        title: "Live session started",
        message: `"${session.title}" is now live! Join now.`,
        link: `/learn/sessions/${sessionId}`,
      }).catch(() => {});
    }

    res.json({ meetingLink: updated.meetingLink });
  } catch (err) {
    logger.error({ err }, "Error starting group session");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/group-sessions/:sessionId/token
router.get("/:sessionId/token", requireAuth, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId as string);
    const { userId: clerkId } = getAuth(req);
    const user = await getUserByClerkId(clerkId!);
    if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [session] = await db.select().from(groupSessionsTable).where(eq(groupSessionsTable.id, sessionId)).limit(1);
    if (!session) { res.status(404).json({ error: "Not found" }); return; }
    if (!session.meetingLink) { res.status(400).json({ error: "Session not started yet" }); return; }

    // Check if user is the mentor
    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.userId, user.id)).limit(1);
    const isMentor = mentor && mentor.id === session.mentorId;

    if (!isMentor) {
      // Check enrollment
      const [enrollment] = await db
        .select()
        .from(enrollmentsTable)
        .where(
          and(
            eq(enrollmentsTable.userId, user.id),
            eq(enrollmentsTable.groupSessionId, sessionId),
            sql`${enrollmentsTable.status} != 'cancelled' AND ${enrollmentsTable.status} != 'pending_payment'`
          )
        )
        .limit(1);

      let hasCourseEnrollment = false;
      if (!enrollment && session.courseId) {
        const [ce] = await db
          .select()
          .from(enrollmentsTable)
          .where(
            and(
              eq(enrollmentsTable.userId, user.id),
              eq(enrollmentsTable.courseId, session.courseId),
              sql`${enrollmentsTable.status} != 'cancelled' AND ${enrollmentsTable.status} != 'pending_payment'`
            )
          )
          .limit(1);
        hasCourseEnrollment = !!ce;
      }

      if (!enrollment && !hasCourseEnrollment) {
        res.status(403).json({ error: "Not enrolled in this session" });
        return;
      }
    }

    const token = await createMeetingToken(
      session.meetingLink,
      user.fullName || user.email || "Participant",
      String(user.id),
      !!isMentor
    );

    res.json({ token, meetingLink: session.meetingLink, isOwner: !!isMentor });
  } catch (err) {
    logger.error({ err }, "Error getting group session token");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/group-sessions/:sessionId/complete
router.post("/:sessionId/complete", requireAuth, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId as string);
    const { userId: clerkId } = getAuth(req);
    const user = await getUserByClerkId(clerkId!);
    if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [session] = await db.select().from(groupSessionsTable).where(eq(groupSessionsTable.id, sessionId)).limit(1);
    if (!session) { res.status(404).json({ error: "Not found" }); return; }

    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.userId, user.id)).limit(1);
    if (!mentor || mentor.id !== session.mentorId) { res.status(403).json({ error: "Forbidden" }); return; }

    const [updated] = await db
      .update(groupSessionsTable)
      .set({ status: "completed" })
      .where(eq(groupSessionsTable.id, sessionId))
      .returning();

    // Mark all active enrollments as completed
    await db
      .update(enrollmentsTable)
      .set({ status: "completed" })
      .where(and(eq(enrollmentsTable.groupSessionId, sessionId), eq(enrollmentsTable.status, "enrolled")));

    res.json(await enrichSession(updated, user.id));
  } catch (err) {
    logger.error({ err }, "Error completing group session");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
