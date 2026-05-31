import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, bookingsTable, usersTable, meetingAttendanceTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, getUserByClerkId } from "../lib/auth";
import { createMeetingToken } from "../lib/meeting";

const router = Router();

// POST /api/meetings/:bookingId/token
router.post("/:bookingId/token", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const clerkId = typeof userId === "string" ? userId : null;
  try {
    const bookingId = parseInt(req.params.bookingId);
    const user = clerkId ? await getUserByClerkId(clerkId) : null;
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    if (booking.menteeId !== user.id && booking.mentorId !== user.id) {
      res.status(403).json({ error: "Not your booking" });
      return;
    }

    if (!booking.meetingLink) {
      res.status(400).json({ error: "No meeting link for this booking" });
      return;
    }

    const token = await createMeetingToken(booking.meetingLink, user.fullName || user.email || "User", String(user.id));
    res.json({ token, meetingLink: booking.meetingLink });
  } catch (err) {
    req.log.error({ err }, "Error creating meeting token");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/meetings/:bookingId/join
router.post("/:bookingId/join", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const clerkId = typeof userId === "string" ? userId : null;
  try {
    const bookingId = parseInt(req.params.bookingId);
    const user = clerkId ? await getUserByClerkId(clerkId) : null;
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    if (booking.menteeId !== user.id && booking.mentorId !== user.id) {
      res.status(403).json({ error: "Not your booking" });
      return;
    }

    // Check if there's an existing open session for this user
    const [existing] = await db.select().from(meetingAttendanceTable)
      .where(and(
        eq(meetingAttendanceTable.bookingId, bookingId),
        eq(meetingAttendanceTable.userId, user.id),
      ))
      .orderBy(meetingAttendanceTable.id)
      .limit(1);

    if (existing && !existing.leftAt) {
      // Already joined, return existing
      res.json({ attendanceId: existing.id, joinedAt: existing.joinedAt.toISOString() });
      return;
    }

    const [record] = await db.insert(meetingAttendanceTable).values({
      bookingId,
      userId: user.id,
      userName: user.fullName || user.email || "User",
    }).returning();

    res.json({ attendanceId: record.id, joinedAt: record.joinedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Error logging meeting join");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/meetings/:bookingId/leave
router.post("/:bookingId/leave", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const clerkId = typeof userId === "string" ? userId : null;
  try {
    const bookingId = parseInt(req.params.bookingId);
    const user = clerkId ? await getUserByClerkId(clerkId) : null;
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    if (booking.menteeId !== user.id && booking.mentorId !== user.id) {
      res.status(403).json({ error: "Not your booking" });
      return;
    }

    const [attendance] = await db.select().from(meetingAttendanceTable)
      .where(and(
        eq(meetingAttendanceTable.bookingId, bookingId),
        eq(meetingAttendanceTable.userId, user.id),
      ))
      .orderBy(meetingAttendanceTable.id)
      .limit(1);

    if (!attendance) {
      res.status(404).json({ error: "No attendance record found" });
      return;
    }

    const leftAt = new Date();
    const durationSeconds = attendance.joinedAt
      ? Math.round((leftAt.getTime() - attendance.joinedAt.getTime()) / 1000)
      : null;

    const [updated] = await db.update(meetingAttendanceTable)
      .set({ leftAt, durationSeconds })
      .where(eq(meetingAttendanceTable.id, attendance.id))
      .returning();

    res.json({
      attendanceId: updated.id,
      joinedAt: updated.joinedAt.toISOString(),
      leftAt: updated.leftAt?.toISOString(),
      durationSeconds: updated.durationSeconds,
    });
  } catch (err) {
    req.log.error({ err }, "Error logging meeting leave");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/meetings/:bookingId/attendance
router.get("/:bookingId/attendance", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const clerkId = typeof userId === "string" ? userId : null;
  try {
    const bookingId = parseInt(req.params.bookingId);
    const user = clerkId ? await getUserByClerkId(clerkId) : null;
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    if (booking.menteeId !== user.id && booking.mentorId !== user.id) {
      res.status(403).json({ error: "Not your booking" });
      return;
    }

    const attendance = await db.select().from(meetingAttendanceTable)
      .where(eq(meetingAttendanceTable.bookingId, bookingId));

    res.json(attendance.map((a) => ({
      id: a.id,
      userId: a.userId,
      userName: a.userName,
      joinedAt: a.joinedAt.toISOString(),
      leftAt: a.leftAt?.toISOString() ?? null,
      durationSeconds: a.durationSeconds ?? null,
    })));
  } catch (err) {
    req.log.error({ err }, "Error fetching meeting attendance");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
