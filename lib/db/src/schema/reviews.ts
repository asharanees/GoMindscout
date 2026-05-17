import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { mentorProfilesTable } from "./mentor-profiles";
import { bookingsTable } from "./bookings";

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookingsTable.id).unique(),
  mentorId: integer("mentor_id").notNull().references(() => mentorProfilesTable.id),
  menteeId: integer("mentee_id").notNull().references(() => usersTable.id),
  rating: integer("rating").notNull(), // 1-5 overall
  punctualityRating: integer("punctuality_rating"), // 1-5
  communicationRating: integer("communication_rating"), // 1-5
  valueRating: integer("value_rating"), // 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({ id: true, createdAt: true });
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;
