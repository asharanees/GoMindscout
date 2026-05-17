import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { mentorProfilesTable } from "./mentor-profiles";

export const payoutRequestsTable = pgTable("payout_requests", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => mentorProfilesTable.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  method: text("method").notNull().default("bank_transfer"),
  // bank_transfer | payoneer | wise | manual
  status: text("status").notNull().default("pending"),
  // pending | approved | paid_out | rejected
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPayoutRequestSchema = createInsertSchema(payoutRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPayoutRequest = z.infer<typeof insertPayoutRequestSchema>;
export type PayoutRequest = typeof payoutRequestsTable.$inferSelect;
