import { clerkClient } from "@clerk/express";
import {
  bookingsTable,
  chatMessagesTable,
  db,
  disputesTable,
  meetingAttendanceTable,
  mentorAvailabilityTable,
  mentorProfilesTable,
  notificationsTable,
  packagesTable,
  payoutRequestsTable,
  reviewsTable,
  usersTable,
} from "@workspace/db";
import { eq, inArray, or } from "drizzle-orm";
import { accountDeletedEmail, sendEmail } from "./email";
import { logger } from "./logger";

type DeleteAccountInput = {
  user: typeof usersTable.$inferSelect;
  deleteClerkUser?: boolean;
};

async function deleteClerkAccount(clerkId: string): Promise<void> {
  const clientOrFactory = clerkClient as any;
  const client = typeof clientOrFactory === "function" ? await clientOrFactory() : clientOrFactory;

  try {
    await client.users.deleteUser(clerkId);
  } catch (err: any) {
    const status = err?.status || err?.statusCode;
    if (status === 404) return;
    throw err;
  }
}

export async function deleteUserAccount({ user, deleteClerkUser = true }: DeleteAccountInput): Promise<void> {
  const [mentorProfile] = await db
    .select()
    .from(mentorProfilesTable)
    .where(eq(mentorProfilesTable.userId, user.id))
    .limit(1);
  const mentorId = mentorProfile?.id;

  const userBookings = await db
    .select({ id: bookingsTable.id })
    .from(bookingsTable)
    .where(or(eq(bookingsTable.menteeId, user.id), mentorId ? eq(bookingsTable.mentorId, mentorId) : undefined));
  const bookingIds = userBookings.map((booking: { id: number }) => booking.id);

  if (bookingIds.length > 0) {
    await db.delete(chatMessagesTable).where(inArray(chatMessagesTable.bookingId, bookingIds));
    await db.delete(meetingAttendanceTable).where(inArray(meetingAttendanceTable.bookingId, bookingIds));
    await db.delete(disputesTable).where(inArray(disputesTable.bookingId, bookingIds));
    await db.delete(reviewsTable).where(inArray(reviewsTable.bookingId, bookingIds));
    await db.delete(bookingsTable).where(inArray(bookingsTable.id, bookingIds));
  }

  await db.delete(chatMessagesTable).where(eq(chatMessagesTable.senderId, user.id));
  await db.delete(meetingAttendanceTable).where(eq(meetingAttendanceTable.userId, user.id));
  await db.delete(disputesTable).where(eq(disputesTable.openedByUserId, user.id));
  await db.delete(reviewsTable).where(eq(reviewsTable.menteeId, user.id));
  await db.delete(notificationsTable).where(eq(notificationsTable.userId, user.id));

  if (mentorId) {
    await db.delete(reviewsTable).where(eq(reviewsTable.mentorId, mentorId));
    await db.delete(payoutRequestsTable).where(eq(payoutRequestsTable.mentorId, mentorId));
    await db.delete(packagesTable).where(eq(packagesTable.mentorId, mentorId));
    await db.delete(mentorAvailabilityTable).where(eq(mentorAvailabilityTable.mentorId, mentorId));
    await db.delete(mentorProfilesTable).where(eq(mentorProfilesTable.id, mentorId));
  }

  await db.delete(usersTable).where(eq(usersTable.id, user.id));

  if (user.email) {
    const deletionEmailSent = await sendEmail(
      user.email,
      "Your GoMindscout account has been deleted",
      accountDeletedEmail({ recipientName: user.fullName?.trim() || "there" }),
    );
    if (!deletionEmailSent) {
      logger.warn({ userId: user.id, email: user.email }, "Account deletion email was not sent");
    }
  }

  if (deleteClerkUser) {
    await deleteClerkAccount(user.clerkId);
    logger.info({ userId: user.id, clerkId: user.clerkId }, "Deleted Clerk user account");
  }
}
