import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, getUserByClerkId } from "../lib/auth";

const router = Router();

// GET /api/notifications
router.get("/", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  try {
    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const notifications = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, user.id))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);

    res.json(notifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link ?? null,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Error fetching notifications");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/notifications/read-all
router.post("/read-all", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  try {
    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.userId, user.id), eq(notificationsTable.isRead, false)));

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Error marking all notifications read");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/notifications/:notificationId/read
router.patch("/:notificationId/read", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  try {
    const notificationId = parseInt(req.params.notificationId);
    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [updated] = await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.id, notificationId), eq(notificationsTable.userId, user.id)))
      .returning();

    if (!updated) { res.status(404).json({ error: "Notification not found" }); return; }

    res.json({
      id: updated.id,
      userId: updated.userId,
      type: updated.type,
      title: updated.title,
      message: updated.message,
      link: updated.link ?? null,
      isRead: updated.isRead,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error marking notification read");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
