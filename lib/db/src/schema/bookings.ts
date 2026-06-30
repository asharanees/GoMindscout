import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { mentorProfilesTable } from "./mentor-profiles";
import { packagesTable } from "./packages";

// Booking status flow (Upwork-style):
// pending_payment → awaiting_mentor_approval → confirmed → session_completed → payout_released
// Mentor can counter-propose: → counter_proposed → (mentee accepts → confirmed | mentee declines → cancelled)
// Either party can reschedule after confirmed: → reschedule_proposed → (other party accepts → confirmed | cancels → cancelled)
// Mentor can reject: → cancelled
// Any paid status can go to: under_review (dispute raised) → disputed → resolved
// Legacy: paid_pending_session | paid | scheduled | completed (kept for backward compat)
export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  menteeId: integer("mentee_id").notNull().references(() => usersTable.id),
  mentorId: integer("mentor_id").notNull().references(() => mentorProfilesTable.id),
  packageId: integer("package_id").notNull().references(() => packagesTable.id),
  status: text("status").notNull().default("pending_payment"),
  // pending_payment | awaiting_mentor_approval | confirmed | counter_proposed | reschedule_proposed
  // | session_completed | under_review | disputed | payout_released | cancelled | refunded
  // legacy: paid_pending_session | paid | scheduled | completed
  proposedAt: timestamp("proposed_at", { withTimezone: true }),
  mentorProposedAt: timestamp("mentor_proposed_at", { withTimezone: true }),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  sessionCompletedAt: timestamp("session_completed_at", { withTimezone: true }),
  meetingLink: text("meeting_link"),
  // Reschedule proposal fields (either party can propose after confirmed)
  rescheduleProposedBy: text("reschedule_proposed_by"), // "mentee" | "mentor"
  rescheduleProposedAt: timestamp("reschedule_proposed_at", { withTimezone: true }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  platformFee: numeric("platform_fee", { precision: 10, scale: 2 }).notNull(),
  mentorEarning: numeric("mentor_earning", { precision: 10, scale: 2 }),
  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntent: text("stripe_payment_intent"),
  cancellationNote: text("cancellation_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;
