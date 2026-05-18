import { Router } from "express";
import { getAuth } from "@clerk/express";
import {
  db,
  mentorAvailabilityTable,
  mentorProfilesTable,
  bookingsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, getUserByClerkId } from "../lib/auth";

const router = Router();

// GET /api/mentors/:mentorId/availability
router.get("/:mentorId/availability", async (req, res) => {
  try {
    const mentorId = parseInt(req.params.mentorId);
    if (isNaN(mentorId)) {
      res.status(400).json({ error: "Invalid mentor ID" });
      return;
    }

    const rows = await db
      .select()
      .from(mentorAvailabilityTable)
      .where(
        and(
          eq(mentorAvailabilityTable.mentorId, mentorId),
          eq(mentorAvailabilityTable.isActive, true)
        )
      )
      .orderBy(mentorAvailabilityTable.dayOfWeek);

    res.json(
      rows.map((r) => ({
        id: r.id,
        mentorId: r.mentorId,
        dayOfWeek: r.dayOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
        timezone: r.timezone,
        isActive: r.isActive,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error fetching mentor availability");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/mentors/me/availability  — replaces the mentor's full schedule
router.put("/me/availability", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  try {
    const user = await getUserByClerkId(userId!);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [mentor] = await db
      .select()
      .from(mentorProfilesTable)
      .where(eq(mentorProfilesTable.userId, user.id))
      .limit(1);
    if (!mentor) {
      res.status(403).json({ error: "Only mentors can set availability" });
      return;
    }

    const { availability } = req.body as {
      availability: Array<{
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        timezone: string;
        isActive: boolean;
      }>;
    };

    if (!Array.isArray(availability)) {
      res.status(400).json({ error: "availability must be an array" });
      return;
    }

    // Delete all existing rows then insert fresh
    await db
      .delete(mentorAvailabilityTable)
      .where(eq(mentorAvailabilityTable.mentorId, mentor.id));

    let rows: typeof mentorAvailabilityTable.$inferSelect[] = [];
    if (availability.length > 0) {
      rows = await db
        .insert(mentorAvailabilityTable)
        .values(
          availability.map((a) => ({
            mentorId: mentor.id,
            dayOfWeek: a.dayOfWeek,
            startTime: a.startTime,
            endTime: a.endTime,
            timezone: a.timezone ?? "UTC",
            isActive: a.isActive ?? true,
          }))
        )
        .returning();
    }

    res.json(
      rows.map((r) => ({
        id: r.id,
        mentorId: r.mentorId,
        dayOfWeek: r.dayOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
        timezone: r.timezone,
        isActive: r.isActive,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error setting mentor availability");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/mentors/:mentorId/slots?date=YYYY-MM-DD&durationMinutes=60
router.get("/:mentorId/slots", async (req, res) => {
  try {
    const mentorId = parseInt(req.params.mentorId);
    if (isNaN(mentorId)) {
      res.status(400).json({ error: "Invalid mentor ID" });
      return;
    }

    const { date, durationMinutes: durStr } = req.query as Record<
      string,
      string
    >;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: "date is required (YYYY-MM-DD)" });
      return;
    }

    const durationMinutes = durStr ? parseInt(durStr) : 60;
    if (isNaN(durationMinutes) || durationMinutes < 15) {
      res.status(400).json({ error: "durationMinutes must be >= 15" });
      return;
    }

    // Parse the requested date
    const [year, month, day] = date.split("-").map(Number);
    const requestedDate = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = requestedDate.getUTCDay(); // 0=Sun

    // Get mentor's availability windows for this day
    const windows = await db
      .select()
      .from(mentorAvailabilityTable)
      .where(
        and(
          eq(mentorAvailabilityTable.mentorId, mentorId),
          eq(mentorAvailabilityTable.dayOfWeek, dayOfWeek),
          eq(mentorAvailabilityTable.isActive, true)
        )
      );

    if (windows.length === 0) {
      res.json([]);
      return;
    }

    // Get all confirmed/awaiting bookings for that mentor on that date
    const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const dayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));

    const existingBookings = await db
      .select({
        scheduledAt: bookingsTable.scheduledAt,
        status: bookingsTable.status,
      })
      .from(bookingsTable)
      .where(eq(bookingsTable.mentorId, mentorId));

    // Build set of busy minutes (as minutes from midnight UTC)
    const busySlots = new Set<number>();
    for (const b of existingBookings) {
      if (!b.scheduledAt) continue;
      const bDate = new Date(b.scheduledAt);
      if (bDate < dayStart || bDate > dayEnd) continue;
      if (
        ["cancelled", "refunded", "payout_released"].includes(b.status ?? "")
      )
        continue;
      const bMinutes =
        bDate.getUTCHours() * 60 + bDate.getUTCMinutes();
      // Mark the booked slot's duration as busy
      for (let m = bMinutes; m < bMinutes + durationMinutes; m++) {
        busySlots.add(m);
      }
    }

    // Generate candidate slots from each availability window
    const slots: Array<{ start: string; end: string; available: boolean }> = [];
    const nowMs = Date.now();

    for (const window of windows) {
      const [sh, sm] = window.startTime.split(":").map(Number);
      const [eh, em] = window.endTime.split(":").map(Number);
      const windowStart = sh * 60 + sm;
      const windowEnd = eh * 60 + em;

      for (
        let slotStart = windowStart;
        slotStart + durationMinutes <= windowEnd;
        slotStart += durationMinutes
      ) {
        const slotEnd = slotStart + durationMinutes;
        const start = new Date(
          Date.UTC(year, month - 1, day, Math.floor(slotStart / 60), slotStart % 60)
        ).toISOString();
        const end = new Date(
          Date.UTC(year, month - 1, day, Math.floor(slotEnd / 60), slotEnd % 60)
        ).toISOString();

        // Don't return past slots
        if (new Date(start).getTime() <= nowMs) continue;

        // Check if any minute in the slot is busy
        let busy = false;
        for (let m = slotStart; m < slotStart + durationMinutes; m++) {
          if (busySlots.has(m)) { busy = true; break; }
        }

        slots.push({ start, end, available: !busy });
      }
    }

    // Return only available slots
    res.json(slots.filter((s) => s.available));
  } catch (err) {
    req.log.error({ err }, "Error fetching mentor slots");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
