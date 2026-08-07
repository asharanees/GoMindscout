import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { mentorProfilesTable } from "./mentor-profiles";
import { categoriesTable } from "./categories";

export const coursesTable = pgTable("courses", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => mentorProfilesTable.id),
  categoryId: integer("category_id").references(() => categoriesTable.id),
  title: text("title").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  maxSeats: integer("max_seats").notNull().default(20),
  enrolledCount: integer("enrolled_count").notNull().default(0),
  status: text("status").notNull().default("draft"), // draft | published | archived
  thumbnailUrl: text("thumbnail_url"),
  level: text("level"), // beginner | intermediate | advanced
  totalSessions: integer("total_sessions").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCourseSchema = createInsertSchema(coursesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof coursesTable.$inferSelect;
