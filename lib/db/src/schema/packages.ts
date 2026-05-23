import { pgTable, text, serial, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { mentorProfilesTable } from "./mentor-profiles";

export const packagesTable = pgTable("packages", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => mentorProfilesTable.id),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // video_30 | video_60
  durationMinutes: integer("duration_minutes"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertPackageSchema = createInsertSchema(packagesTable).omit({ id: true });
export type InsertPackage = z.infer<typeof insertPackageSchema>;
export type Package = typeof packagesTable.$inferSelect;
