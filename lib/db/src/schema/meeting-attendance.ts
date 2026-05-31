import { pgTable, integer, timestamp, text, serial } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { bookingsTable } from "./bookings";

export const meetingAttendanceTable = pgTable("meeting_attendance", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookingsTable.id),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  userName: text("user_name"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  leftAt: timestamp("left_at", { withTimezone: true }),
  durationSeconds: integer("duration_seconds"),
});

export type MeetingAttendance = typeof meetingAttendanceTable.$inferSelect;
export type InsertMeetingAttendance = typeof meetingAttendanceTable.$inferInsert;
