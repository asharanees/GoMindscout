import { pgTable, text, serial, integer, numeric, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { categoriesTable } from "./categories";

export const mentorProfilesTable = pgTable("mentor_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  categoryId: integer("category_id").references(() => categoriesTable.id),
  headline: text("headline").notNull(),
  bio: text("bio"),
  industry: text("industry"),
  country: text("country"),
  expertiseTags: text("expertise_tags").array().notNull().default([]),
  yearsExperience: integer("years_experience"),
  languages: text("languages").array().notNull().default([]),
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }),
  currency: text("currency").notNull().default("USD"),
  introVideoUrl: text("intro_video_url"),
  linkedinUrl: text("linkedin_url"),
  calendlyUrl: text("calendly_url"),
  experiences: jsonb("experiences"),
  honorsAwards: jsonb("honors_awards"),
  publications: jsonb("publications"),
  certifications: jsonb("certifications"),
  status: text("status").notNull().default("pending"), // pending | approved | rejected | suspended
  isFeatured: boolean("is_featured").notNull().default(false),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMentorProfileSchema = createInsertSchema(mentorProfilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMentorProfile = z.infer<typeof insertMentorProfileSchema>;
export type MentorProfile = typeof mentorProfilesTable.$inferSelect;
