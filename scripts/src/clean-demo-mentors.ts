import { db } from "../../lib/db/src/index";
import { eq, inArray, sql } from "drizzle-orm";
import {
  bookingsTable,
  reviewsTable,
  chatMessagesTable,
  payoutRequestsTable,
  disputesTable,
  notificationsTable,
  packagesTable,
  mentorProfilesTable,
  mentorAvailabilityTable,
  usersTable,
} from "../../lib/db/src/index";

const DEMO_CLERK_IDS = [
  "demo_mentor_1",
  "demo_mentor_2",
  "demo_mentor_3",
  "demo_mentor_4",
  "demo_mentor_5",
  "demo_mentor_6",
];

async function cleanDemoMentors() {
  console.log("Cleaning demo mentors from database...");

  // Get demo user IDs
  const demoUsers = await db
    .select()
    .from(usersTable)
    .where(inArray(usersTable.clerkId, DEMO_CLERK_IDS));

  const demoUserIds = demoUsers.map((u) => u.id);

  if (demoUserIds.length === 0) {
    console.log("  No demo mentors found in database.");
    return;
  }

  console.log(`  Found ${demoUserIds.length} demo mentors to clean up.`);

  // Get mentor profile IDs for these users
  const demoProfiles = await db
    .select()
    .from(mentorProfilesTable)
    .where(inArray(mentorProfilesTable.userId, demoUserIds));

  const demoProfileIds = demoProfiles.map((p) => p.id);

  // Delete from dependent tables first
  console.log("  Deleting dependent records...");

  // Reviews
  if (demoProfileIds.length > 0) {
    await db.delete(reviewsTable).where(inArray(reviewsTable.mentorProfileId, demoProfileIds));
    // Packages
    await db.delete(packagesTable).where(inArray(packagesTable.mentorId, demoProfileIds));
    // Availability
    await db.delete(mentorAvailabilityTable).where(inArray(mentorAvailabilityTable.mentorId, demoProfileIds));
    // Payout requests
    await db.delete(payoutRequestsTable).where(inArray(payoutRequestsTable.mentorId, demoProfileIds));
    // Disputes
    await db.delete(disputesTable).where(inArray(disputesTable.mentorId, demoProfileIds));
  }

  // Bookings referencing demo users (as either mentor or mentee)
  const allBookings = await db.select({ id: bookingsTable.id }).from(bookingsTable);
  if (allBookings.length > 0) {
    // We need to filter bookings manually since mentorId references mentor_profiles.id
    // and menteeId references users.id
    const mentorBookingIds = demoProfileIds.length > 0
      ? (await db
          .select({ id: bookingsTable.id })
          .from(bookingsTable)
          .where(inArray(bookingsTable.mentorId, demoProfileIds)))
          .map((b) => b.id)
      : [];
    const menteeBookingIds = (await db
      .select({ id: bookingsTable.id })
      .from(bookingsTable)
      .where(inArray(bookingsTable.menteeId, demoUserIds)))
      .map((b) => b.id);
    const allBookingIds = [...new Set([...mentorBookingIds, ...menteeBookingIds])];
    if (allBookingIds.length > 0) {
      await db.delete(bookingsTable).where(inArray(bookingsTable.id, allBookingIds));
    }
  }

  // Chat messages for demo users
  await db.delete(chatMessagesTable).where(inArray(chatMessagesTable.senderId, demoUserIds));

  // Notifications for demo users
  await db.delete(notificationsTable).where(inArray(notificationsTable.userId, demoUserIds));

  // Delete mentor profiles
  console.log("  Deleting mentor profiles...");
  await db.delete(mentorProfilesTable).where(inArray(mentorProfilesTable.userId, demoUserIds));

  // Delete users
  console.log("  Deleting demo users...");
  await db.delete(usersTable).where(inArray(usersTable.clerkId, DEMO_CLERK_IDS));

  console.log("  Cleaned up all demo mentors.");
}

cleanDemoMentors()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
