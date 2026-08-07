import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, enrollmentsTable, groupSessionsTable, coursesTable } from "@workspace/db";
import { eq, and, or, isNotNull } from "drizzle-orm";
import { requireAuth, getUserByClerkId } from "../lib/auth";
import { logger } from "../lib/logger";

const router = Router();

// GET /api/enrollments/my
router.get("/my", requireAuth, async (req, res) => {
  try {
    const { userId: clerkId } = getAuth(req);
    const user = await getUserByClerkId(clerkId!);
    if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

    const enrollments = await db
      .select()
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.userId, user.id))
      .orderBy(enrollmentsTable.createdAt);

    const enriched = await Promise.all(
      enrollments.map(async (e) => {
        let sessionTitle: string | null = null;
        let scheduledAt: string | null = null;
        let courseTitle: string | null = null;

        if (e.groupSessionId) {
          const [session] = await db.select().from(groupSessionsTable).where(eq(groupSessionsTable.id, e.groupSessionId)).limit(1);
          sessionTitle = session?.title ?? null;
          scheduledAt = session?.scheduledAt?.toISOString() ?? null;
        }
        if (e.courseId) {
          const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, e.courseId)).limit(1);
          courseTitle = course?.title ?? null;
        }

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
          userName: null,
          userAvatarUrl: null,
          sessionTitle,
          courseTitle,
          scheduledAt,
          createdAt: e.createdAt.toISOString(),
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    logger.error({ err }, "Error listing user enrollments");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
