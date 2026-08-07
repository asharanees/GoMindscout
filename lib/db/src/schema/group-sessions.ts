import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { mentorProfilesTable } from "./mentor-profiles";
import { categoriesTable } from "./categories";
import { coursesTable } from "./courses";

export const groupSessionsTable = pgTable("group_sessions", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => mentorProfilesTable.id),
  courseId: integer("course_id").references(() => coursesTable.id),
  categoryId: integer("category_id").references(() => categoriesTable.id),
  title: text("title").notNull(),
  description: text("description"),
  // price=0 means it's included in a course enrollment
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  maxSeats: integer("max_seats").notNull().default(20),
  enrolledCount: integer("enrolled_count").notNull().default(0),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  meetingLink: text("meeting_link"),
  status: text("status").notNull().default("scheduled"), // scheduled | live | completed | cancelled
  thumbnailUrl: text("thumbnail_url"),
  level: text("level"),
  sessionOrder: integer("session_order"), // position within a course
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertGroupSessionSchema = createInsertSchema(groupSessionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGroupSession = z.infer<typeof insertGroupSessionSchema>;
export type GroupSession = typeof groupSessionsTable.$inferSelect;
