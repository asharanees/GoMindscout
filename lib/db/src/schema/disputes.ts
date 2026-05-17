import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { bookingsTable } from "./bookings";

export const disputesTable = pgTable("disputes", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookingsTable.id),
  openedByUserId: integer("opened_by_user_id").notNull().references(() => usersTable.id),
  reason: text("reason").notNull(),
  // mentor_no_show | mentee_no_show | technical_issue | wrong_expertise | misconduct | other
  description: text("description").notNull(),
  evidenceUrl: text("evidence_url"),
  status: text("status").notNull().default("open"), // open | under_review | resolved
  adminDecision: text("admin_decision"),
  resolutionType: text("resolution_type"),
  // full_refund | partial_refund | release_to_mentor | platform_credit
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDisputeSchema = createInsertSchema(disputesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDispute = z.infer<typeof insertDisputeSchema>;
export type Dispute = typeof disputesTable.$inferSelect;
