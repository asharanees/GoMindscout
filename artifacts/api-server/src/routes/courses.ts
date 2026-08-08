import { Router } from "express";
import { getAuth } from "@clerk/express";
import {
  db,
  coursesTable,
  groupSessionsTable,
  enrollmentsTable,
  mentorProfilesTable,
  usersTable,
  categoriesTable,
} from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth, getUserByClerkId } from "../lib/auth";
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

async function enrichSession(session: any) {
  return {
    id: session.id,
    mentorId: session.mentorId,
    courseId: session.courseId ?? null,
    categoryId: session.categoryId ?? null,
    categoryName: null,
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
    mentorName: null,
    mentorAvatarUrl: null,
    mentorHeadline: null,
    isEnrolled: false,
    createdAt: session.createdAt.toISOString(),
  };
}

async function enrichCourse(course: any, currentUserId?: number) {
  const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.id, course.mentorId)).limit(1);
  const [mentorUser] = mentor ? await db.select().from(usersTable).where(eq(usersTable.id, mentor.userId)).limit(1) : [null];
  const [category] = course.categoryId
    ? await db.select().from(categoriesTable).where(eq(categoriesTable.id, course.categoryId)).limit(1)
    : [null];

  // Load sessions belonging to this course
  const sessions = await db
    .select()
    .from(groupSessionsTable)
    .where(eq(groupSessionsTable.courseId, course.id))
    .orderBy(groupSessionsTable.sessionOrder);

  const enrichedSessions = await Promise.all(sessions.map(enrichSession));

  let isEnrolled = false;
  if (currentUserId) {
    const [enrollment] = await db
      .select()
      .from(enrollmentsTable)
      .where(
        and(
          eq(enrollmentsTable.userId, currentUserId),
          eq(enrollmentsTable.courseId, course.id),
          sql`${enrollmentsTable.status} != 'cancelled'`
        )
      )
      .limit(1);
    isEnrolled = !!enrollment;
  }

  return {
    id: course.id,
    mentorId: course.mentorId,
    categoryId: course.categoryId ?? null,
    categoryName: category?.name ?? null,
    title: course.title,
    description: course.description ?? null,
    price: Number(course.price),
    maxSeats: course.maxSeats,
    enrolledCount: course.enrolledCount,
    status: course.status,
    thumbnailUrl: course.thumbnailUrl ?? null,
    level: course.level ?? null,
    totalSessions: course.totalSessions,
    sessions: enrichedSessions,
    mentorName: mentorUser?.fullName ?? null,
    mentorAvatarUrl: mentorUser?.avatarUrl ?? null,
    mentorHeadline: mentor?.headline ?? null,
    isEnrolled,
    createdAt: course.createdAt.toISOString(),
  };
}

// GET /api/courses
router.get("/", async (req, res) => {
  try {
    const { mentorId, categoryId, page = "1", limit = "20" } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const conditions: any[] = [eq(coursesTable.status, "published")];
    if (mentorId) conditions.push(eq(coursesTable.mentorId, parseInt(mentorId)));
    if (categoryId) conditions.push(eq(coursesTable.categoryId, parseInt(categoryId)));

    const { userId: clerkId } = getAuth(req);
    let currentUserId: number | undefined;
    if (clerkId) {
      const user = await getUserByClerkId(clerkId);
      currentUserId = user?.id;
    }

    const courses = await db
      .select()
      .from(coursesTable)
      .where(and(...conditions))
      .orderBy(desc(coursesTable.createdAt))
      .limit(limitNum)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(coursesTable)
      .where(and(...conditions));

    const enriched = await Promise.all(courses.map((c) => enrichCourse(c, currentUserId)));

    res.json({ courses: enriched, total: Number(count), page: pageNum, limit: limitNum });
  } catch (err) {
    logger.error({ err }, "Error listing courses");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/courses
router.post("/", requireAuth, async (req, res) => {
  try {
    const { userId: clerkId } = getAuth(req);
    const user = await getUserByClerkId(clerkId!);
    if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.userId, user.id)).limit(1);
    if (!mentor) { res.status(403).json({ error: "Mentor profile required" }); return; }
    if (mentor.status !== "approved") { res.status(403).json({ error: "Mentor must be approved" }); return; }

    const { categoryId, title, description, price, maxSeats = 20, thumbnailUrl, level } = req.body;
    if (!title) { res.status(400).json({ error: "title is required" }); return; }
    if (price === undefined || price === null) { res.status(400).json({ error: "price is required" }); return; }

    const [course] = await db
      .insert(coursesTable)
      .values({
        mentorId: mentor.id,
        categoryId: categoryId ?? null,
        title,
        description: description ?? null,
        price: String(price),
        maxSeats,
        thumbnailUrl: thumbnailUrl ?? null,
        level: level ?? null,
      })
      .returning();

    res.status(201).json(await enrichCourse(course, user.id));
  } catch (err: any) {
    logger.error({ err }, "Error creating course");
    res.status(500).json({ error: "Internal server error", detail: process.env.NODE_ENV !== "production" ? String(err?.message ?? err) : undefined });
  }
});

// GET /api/courses/my
router.get("/my", requireAuth, async (req, res) => {
  try {
    const { userId: clerkId } = getAuth(req);
    const user = await getUserByClerkId(clerkId!);
    if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.userId, user.id)).limit(1);
    if (!mentor) { res.status(404).json({ error: "No mentor profile" }); return; }

    const courses = await db
      .select()
      .from(coursesTable)
      .where(eq(coursesTable.mentorId, mentor.id))
      .orderBy(desc(coursesTable.createdAt));

    const enriched = await Promise.all(courses.map((c) => enrichCourse(c, user.id)));
    res.json(enriched);
  } catch (err) {
    logger.error({ err }, "Error listing own courses");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/courses/:courseId
router.get("/:courseId", async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId as string);
    const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
    if (!course) { res.status(404).json({ error: "Not found" }); return; }

    const { userId: clerkId } = getAuth(req);
    let currentUserId: number | undefined;
    if (clerkId) {
      const user = await getUserByClerkId(clerkId);
      currentUserId = user?.id;
    }

    res.json(await enrichCourse(course, currentUserId));
  } catch (err) {
    logger.error({ err }, "Error getting course");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/courses/:courseId
router.patch("/:courseId", requireAuth, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId as string);
    const { userId: clerkId } = getAuth(req);
    const user = await getUserByClerkId(clerkId!);
    if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
    if (!course) { res.status(404).json({ error: "Not found" }); return; }

    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.userId, user.id)).limit(1);
    if (!mentor || mentor.id !== course.mentorId) { res.status(403).json({ error: "Forbidden" }); return; }

    const { title, description, price, maxSeats, thumbnailUrl, level, status } = req.body;
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = String(price);
    if (maxSeats !== undefined) updates.maxSeats = maxSeats;
    if (thumbnailUrl !== undefined) updates.thumbnailUrl = thumbnailUrl;
    if (level !== undefined) updates.level = level;
    if (status !== undefined) updates.status = status;

    // Update totalSessions count from sessions table
    const [{ sessionCount }] = await db
      .select({ sessionCount: sql<number>`count(*)` })
      .from(groupSessionsTable)
      .where(eq(groupSessionsTable.courseId, courseId));
    if (sessionCount !== undefined) updates.totalSessions = Number(sessionCount) || 1;

    const [updated] = await db.update(coursesTable).set(updates).where(eq(coursesTable.id, courseId)).returning();
    res.json(await enrichCourse(updated, user.id));
  } catch (err) {
    logger.error({ err }, "Error updating course");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/courses/:courseId
router.delete("/:courseId", requireAuth, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId as string);
    const { userId: clerkId } = getAuth(req);
    const user = await getUserByClerkId(clerkId!);
    if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
    if (!course) { res.status(404).json({ error: "Not found" }); return; }

    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.userId, user.id)).limit(1);
    if (!mentor || mentor.id !== course.mentorId) { res.status(403).json({ error: "Forbidden" }); return; }

    await db.delete(coursesTable).where(eq(coursesTable.id, courseId));
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, "Error deleting course");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/courses/:courseId/enroll
router.post("/:courseId/enroll", requireAuth, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId as string);
    const { userId: clerkId } = getAuth(req);
    const user = await getUserByClerkId(clerkId!);
    if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
    if (!course) { res.status(404).json({ error: "Course not found" }); return; }
    if (course.status !== "published") { res.status(400).json({ error: "Course is not published" }); return; }
    if (course.enrolledCount >= course.maxSeats) { res.status(400).json({ error: "Course is full" }); return; }

    // Check already enrolled
    const [existing] = await db
      .select()
      .from(enrollmentsTable)
      .where(
        and(
          eq(enrollmentsTable.userId, user.id),
          eq(enrollmentsTable.courseId, courseId),
          sql`${enrollmentsTable.status} != 'cancelled'`
        )
      )
      .limit(1);
    if (existing) { res.status(400).json({ error: "Already enrolled" }); return; }

    const price = Number(course.price);
    const platformFee = parseFloat((price * PLATFORM_FEE_PERCENT).toFixed(2));
    const mentorEarning = parseFloat((price * MENTOR_EARNING_PERCENT).toFixed(2));

    const stripe = getStripe();
    if (!stripe || price === 0) {
      const [enrollment] = await db
        .insert(enrollmentsTable)
        .values({
          userId: user.id,
          courseId,
          status: "enrolled",
          amount: String(price),
          platformFee: String(platformFee),
          mentorEarning: String(mentorEarning),
        })
        .returning();

      await db.update(coursesTable).set({ enrolledCount: course.enrolledCount + 1 }).where(eq(coursesTable.id, courseId));

      res.status(201).json({
        enrollment: {
          id: enrollment.id,
          userId: enrollment.userId,
          groupSessionId: null,
          courseId: enrollment.courseId ?? null,
          status: enrollment.status,
          amount: Number(enrollment.amount),
          platformFee: Number(enrollment.platformFee),
          mentorEarning: enrollment.mentorEarning ? Number(enrollment.mentorEarning) : null,
          stripeSessionId: null,
          userName: user.fullName ?? null,
          userAvatarUrl: user.avatarUrl ?? null,
          sessionTitle: null,
          courseTitle: course.title,
          scheduledAt: null,
          createdAt: enrollment.createdAt.toISOString(),
        },
        checkoutUrl: "/dashboard",
      });
      return;
    }

    const [enrollment] = await db
      .insert(enrollmentsTable)
      .values({
        userId: user.id,
        courseId,
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
            product_data: { name: course.title, description: `Full course — ${course.totalSessions} sessions` },
            unit_amount: Math.round(price * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/dashboard?enrolled=true`,
      cancel_url: `${origin}/learn/courses/${courseId}`,
      metadata: { enrollmentId: String(enrollment.id), type: "course" },
    });

    await db.update(enrollmentsTable).set({ stripeSessionId: stripeSession.id }).where(eq(enrollmentsTable.id, enrollment.id));

    res.status(201).json({
      enrollment: {
        id: enrollment.id,
        userId: enrollment.userId,
        groupSessionId: null,
        courseId: enrollment.courseId ?? null,
        status: enrollment.status,
        amount: Number(enrollment.amount),
        platformFee: Number(enrollment.platformFee),
        mentorEarning: enrollment.mentorEarning ? Number(enrollment.mentorEarning) : null,
        stripeSessionId: stripeSession.id,
        userName: user.fullName ?? null,
        userAvatarUrl: user.avatarUrl ?? null,
        sessionTitle: null,
        courseTitle: course.title,
        scheduledAt: null,
        createdAt: enrollment.createdAt.toISOString(),
      },
      checkoutUrl: stripeSession.url,
    });
  } catch (err) {
    logger.error({ err }, "Error enrolling in course");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/courses/:courseId/enrollments
router.get("/:courseId/enrollments", requireAuth, async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId as string);
    const { userId: clerkId } = getAuth(req);
    const user = await getUserByClerkId(clerkId!);
    if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, courseId)).limit(1);
    if (!course) { res.status(404).json({ error: "Not found" }); return; }

    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.userId, user.id)).limit(1);
    if (!mentor || mentor.id !== course.mentorId) { res.status(403).json({ error: "Forbidden" }); return; }

    const enrollments = await db
      .select()
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.courseId, courseId));

    const enriched = await Promise.all(
      enrollments.map(async (e) => {
        const [enrollUser] = await db.select().from(usersTable).where(eq(usersTable.id, e.userId)).limit(1);
        return {
          id: e.id,
          userId: e.userId,
          groupSessionId: null,
          courseId: e.courseId ?? null,
          status: e.status,
          amount: Number(e.amount),
          platformFee: Number(e.platformFee),
          mentorEarning: e.mentorEarning ? Number(e.mentorEarning) : null,
          stripeSessionId: e.stripeSessionId ?? null,
          userName: enrollUser?.fullName ?? null,
          userAvatarUrl: enrollUser?.avatarUrl ?? null,
          sessionTitle: null,
          courseTitle: course.title,
          scheduledAt: null,
          createdAt: e.createdAt.toISOString(),
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    logger.error({ err }, "Error listing course enrollments");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
