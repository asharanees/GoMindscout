import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { mentorProfilesTable } from "./mentor-profiles";

// dayOfWeek: 0=Sunday, 1=Monday, ..., 6=Saturday
// startTime / endTime: "HH:MM" in 24-hour format (mentor's local timezone)
export const mentorAvailabilityTable = pgTable("mentor_availability", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => mentorProfilesTable.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  timezone: text("timezone").notNull().default("UTC"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMentorAvailabilitySchema = createInsertSchema(mentorAvailabilityTable).omit({ id: true, createdAt: true });
export type InsertMentorAvailability = z.infer<typeof insertMentorAvailabilitySchema>;
export type MentorAvailability = typeof mentorAvailabilityTable.$inferSelect;
