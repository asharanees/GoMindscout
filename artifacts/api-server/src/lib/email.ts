const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@gomindscout.com";

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    // Email sending skipped — set RESEND_API_KEY to enable
    return;
  }
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
  } catch {
    // Non-fatal — log but don't throw
  }
}

export function meetingConfirmedEmail({
  recipientName,
  otherPartyName,
  role,
  scheduledAt,
  meetingLink,
  packageName,
}: {
  recipientName: string;
  otherPartyName: string;
  role: "mentor" | "mentee";
  scheduledAt: string;
  meetingLink: string;
  packageName: string;
}): string {
  const dateStr = new Date(scheduledAt).toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const intro =
    role === "mentor"
      ? `Your session with <strong>${otherPartyName}</strong> has been confirmed.`
      : `Your mentor <strong>${otherPartyName}</strong> has confirmed your session.`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Inter, Arial, sans-serif; color: #111; max-width: 560px; margin: 0 auto; padding: 32px 16px;">
  <div style="background: #1a7a5e; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
    <h1 style="color: #fff; font-size: 22px; margin: 0;">GoMindscout — Session Confirmed</h1>
  </div>
  <p style="font-size: 16px;">Hi ${recipientName},</p>
  <p style="font-size: 15px; line-height: 1.6;">${intro}</p>
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8f9fa; border-radius: 8px; overflow: hidden;">
    <tr><td style="padding: 12px 16px; font-size: 13px; color: #666; width: 40%;">Session</td><td style="padding: 12px 16px; font-size: 14px; font-weight: 600;">${packageName}</td></tr>
    <tr style="background: #fff;"><td style="padding: 12px 16px; font-size: 13px; color: #666;">Date &amp; Time</td><td style="padding: 12px 16px; font-size: 14px; font-weight: 600;">${dateStr}</td></tr>
    <tr><td style="padding: 12px 16px; font-size: 13px; color: #666;">${role === "mentor" ? "Mentee" : "Mentor"}</td><td style="padding: 12px 16px; font-size: 14px; font-weight: 600;">${otherPartyName}</td></tr>
  </table>
  <div style="background: #e8f5f1; border: 1px solid #1a7a5e33; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
    <p style="margin: 0 0 12px; font-size: 14px; color: #444;">Your meeting room is ready:</p>
    <a href="${meetingLink}" style="display: inline-block; background: #1a7a5e; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 15px;">Join Meeting</a>
    <p style="margin: 12px 0 0; font-size: 12px; color: #888; word-break: break-all;">${meetingLink}</p>
  </div>
  <p style="font-size: 13px; color: #888; border-top: 1px solid #eee; padding-top: 16px; margin-top: 24px;">
    This link is unique to your session. Do not share it publicly.<br>
    — The GoMindscout Team
  </p>
</body>
</html>`;
}
