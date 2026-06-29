import { db, notificationsTable } from "@workspace/db";
import { sendEmail } from "./email";
import { logger } from "./logger";

export type NotificationType =
  | "booking_created"
  | "payment_confirmed"
  | "booking_approved"
  | "booking_rejected"
  | "counter_proposed"
  | "counter_accepted"
  | "counter_declined"
  | "session_confirmed"
  | "chat_message";

interface CreateNotificationInput {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  userEmail?: string;
  emailSubject?: string;
  emailHtml?: string;
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    await db.insert(notificationsTable).values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
      isRead: false,
    });
    if (input.userEmail && input.emailSubject && input.emailHtml) {
      const sent = await sendEmail(input.userEmail, input.emailSubject, input.emailHtml);
      if (!sent) {
        logger.warn(
          {
            userId: input.userId,
            type: input.type,
            to: input.userEmail,
            subject: input.emailSubject,
          },
          "Notification email was not sent",
        );
      }
    }
  } catch (err) {
    logger.error({ err }, "Failed to create notification");
  }
}
