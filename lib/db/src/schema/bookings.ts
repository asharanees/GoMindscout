import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { mentorProfilesTable } from "./mentor-profiles";
import { packagesTable } from "./packages";

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  menteeId: integer("mentee_id").notNull().references(() => usersTable.id),
  mentorId: integer("mentor_id").notNull().references(() => mentorProfilesTable.id),
  packageId: integer("package_id").notNull().references(() => packagesTable.id),
  status: text("status").notNull().default("pending_payment"), // pending_payment | paid | scheduled | completed | cancelled | refunded
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  meetingLink: text("meeting_link"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  platformFee: numeric("platform_fee", { precision: 10, scale: 2 }).notNull(),
  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntent: text("stripe_payment_intent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;
