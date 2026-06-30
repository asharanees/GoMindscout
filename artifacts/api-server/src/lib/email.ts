import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.SMTP_HOST) {
    console.log(`[email] Would send to ${to}: ${subject}`);
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? "noreply@gomindscout.com",
      to,
      subject,
      html,
    });
  } catch (err) {
    console.warn("Email send failed:", err);
  }
}

function appUrl(path = "/"): string {
  const base = (process.env.APP_URL || "https://gomindscout.com").replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

const CTA = `display:inline-block;background:#1a7a5e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:600;font-size:15px;`;
const HDR = `background:#1a7a5e;border-radius:8px;padding:24px;margin-bottom:24px;`;
const FTR = `font-size:13px;color:#888;border-top:1px solid #eee;padding-top:16px;margin-top:24px;`;

function baseEmail(title: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:Inter,Arial,sans-serif;color:#111;max-width:560px;margin:0 auto;padding:32px 16px;">
<div style="${HDR}"><h1 style="color:#fff;font-size:22px;margin:0;">GoMindscout - ${title}</h1></div>
${body}
<p style="${FTR}">- The GoMindscout Team</p>
</body></html>`;
}

export function meetingConfirmedEmail({
  recipientName,
  otherPartyName,
  role,
  scheduledAt,
  packageName,
}: {
  recipientName: string;
  otherPartyName: string;
  role: "mentor" | "mentee";
  scheduledAt: string;
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

  const dashboardLink = role === "mentor" ? appUrl("/mentor/dashboard") : appUrl("/dashboard");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: Inter, Arial, sans-serif; color: #111; max-width: 560px; margin: 0 auto; padding: 32px 16px;">
  <div style="background: #1a7a5e; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
    <h1 style="color: #fff; font-size: 22px; margin: 0;">GoMindscout - Session Confirmed</h1>
  </div>
  <p style="font-size: 16px;">Hi ${recipientName},</p>
  <p style="font-size: 15px; line-height: 1.6;">${intro}</p>
  <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8f9fa; border-radius: 8px; overflow: hidden;">
    <tr><td style="padding: 12px 16px; font-size: 13px; color: #666; width: 40%;">Session</td><td style="padding: 12px 16px; font-size: 14px; font-weight: 600;">${packageName}</td></tr>
    <tr style="background: #fff;"><td style="padding: 12px 16px; font-size: 13px; color: #666;">Date &amp; Time</td><td style="padding: 12px 16px; font-size: 14px; font-weight: 600;">${dateStr}</td></tr>
    <tr><td style="padding: 12px 16px; font-size: 13px; color: #666;">${role === "mentor" ? "Mentee" : "Mentor"}</td><td style="padding: 12px 16px; font-size: 14px; font-weight: 600;">${otherPartyName}</td></tr>
  </table>
  <div style="background: #e8f5f1; border: 1px solid #1a7a5e33; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
    <p style="margin: 0 0 12px; font-size: 14px; color: #444;">Your meeting room will be available on your dashboard at session time:</p>
    <a href="${dashboardLink}" style="${CTA}">Go to Dashboard</a>
    <p style="margin: 12px 0 0; font-size: 12px; color: #888;">The meeting room opens inside the platform — it cannot be shared or accessed externally.</p>
  </div>
  <p style="font-size: 13px; color: #888; border-top: 1px solid #eee; padding-top: 16px; margin-top: 24px;">
    For security, all sessions happen exclusively within GoMindscout.<br>
    - The GoMindscout Team
  </p>
</body>
</html>`;
}

export function welcomeEmail({ recipientName }: { recipientName: string }): string {
  return baseEmail("Welcome!", `<p style="font-size:15px;">Hi ${recipientName},</p>
<p style="font-size:15px;line-height:1.6;">Welcome to GoMindscout! You're now connected to a network of expert mentors ready to help you grow.</p>
<p style="text-align:center;margin:24px 0;"><a href="${appUrl("/mentors")}" style="${CTA}">Find Your Mentor</a></p>
<p style="font-size:13px;color:#888;">Browse mentors, book a session, and start your journey today.</p>`);
}

export function bookingRequestEmail({
  mentorName,
  menteeName,
  packageName,
  proposedAt,
}: {
  mentorName: string;
  menteeName: string;
  packageName: string;
  proposedAt: string | null;
}): string {
  const timeStr = proposedAt
    ? new Date(proposedAt).toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" })
    : "TBD";
  return baseEmail("New Booking Request", `<p style="font-size:15px;">Hi ${mentorName},</p>
<p style="font-size:15px;line-height:1.6;"><strong>${menteeName}</strong> has requested a session with you.</p>
<table style="width:100%;border-collapse:collapse;margin:20px 0;background:#f8f9fa;border-radius:8px;overflow:hidden;">
  <tr><td style="padding:12px 16px;font-size:13px;color:#666;width:40%;">Package</td><td style="padding:12px 16px;font-size:14px;font-weight:600;">${packageName}</td></tr>
  <tr style="background:#fff;"><td style="padding:12px 16px;font-size:13px;color:#666;">Proposed Time</td><td style="padding:12px 16px;font-size:14px;font-weight:600;">${timeStr}</td></tr>
</table>
<p style="text-align:center;margin:24px 0;"><a href="${appUrl("/mentor/dashboard")}" style="${CTA}">Review Request</a></p>`);
}

export function bookingRejectedEmail({
  menteeName,
  mentorName,
  packageName,
  note,
}: {
  menteeName: string;
  mentorName: string;
  packageName: string;
  note: string | null;
}): string {
  return baseEmail("Booking Not Accepted", `<p style="font-size:15px;">Hi ${menteeName},</p>
<p style="font-size:15px;line-height:1.6;"><strong>${mentorName}</strong> was unable to accept your booking for <strong>${packageName}</strong>.${note ? `<br><em>${note}</em>` : ""}</p>
<p style="text-align:center;margin:24px 0;"><a href="${appUrl("/mentors")}" style="${CTA}">Find Another Mentor</a></p>`);
}

export function counterProposedEmail({
  menteeName,
  mentorName,
  packageName,
  proposedAt,
}: {
  menteeName: string;
  mentorName: string;
  packageName: string;
  proposedAt: string;
}): string {
  const timeStr = new Date(proposedAt).toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
  return baseEmail("Mentor Proposed a New Time", `<p style="font-size:15px;">Hi ${menteeName},</p>
<p style="font-size:15px;line-height:1.6;"><strong>${mentorName}</strong> has suggested a different time for your <strong>${packageName}</strong> session:</p>
<p style="font-size:18px;font-weight:700;text-align:center;margin:20px 0;color:#1a7a5e;">${timeStr}</p>
<p style="text-align:center;margin:24px 0;"><a href="${appUrl("/dashboard")}" style="${CTA}">Accept or Decline</a></p>`);
}

export function counterDeclinedEmail({
  mentorName,
  menteeName,
  packageName,
}: {
  mentorName: string;
  menteeName: string;
  packageName: string;
}): string {
  return baseEmail("Counter-Proposal Declined", `<p style="font-size:15px;">Hi ${mentorName},</p>
<p style="font-size:15px;line-height:1.6;"><strong>${menteeName}</strong> has declined your proposed time for <strong>${packageName}</strong>.</p>
<p style="text-align:center;margin:24px 0;"><a href="${appUrl("/mentor/dashboard")}" style="${CTA}">View Dashboard</a></p>`);
}

export function rescheduleProposedEmail({
  recipientName,
  proposerName,
  packageName,
  proposedAt,
  recipientRole,
}: {
  recipientName: string;
  proposerName: string;
  packageName: string;
  proposedAt: string;
  recipientRole: "mentor" | "mentee";
}): string {
  const timeStr = new Date(proposedAt).toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
  const dashLink = appUrl(recipientRole === "mentor" ? "/mentor/dashboard" : "/dashboard");
  return baseEmail("Reschedule Requested", `<p style="font-size:15px;">Hi ${recipientName},</p>
<p style="font-size:15px;line-height:1.6;"><strong>${proposerName}</strong> has requested to reschedule your <strong>${packageName}</strong> session to:</p>
<p style="font-size:18px;font-weight:700;text-align:center;margin:20px 0;color:#1a7a5e;">${timeStr}</p>
<p style="text-align:center;margin:24px 0;"><a href="${dashLink}" style="${CTA}">Accept or Cancel</a></p>`);
}

export function accountDeletedEmail({ recipientName }: { recipientName: string }): string {
  return baseEmail("Account Deleted", `<p style="font-size:15px;">Hi ${recipientName},</p>
<p style="font-size:15px;line-height:1.6;">Your GoMindscout account and all associated data have been permanently deleted as requested.</p>
<p style="font-size:13px;color:#888;">If this was a mistake or you'd like to return, you're always welcome to create a new account at any time.</p>`);
}

export function chatMessageEmail({
  recipientName,
  senderName,
  preview,
}: {
  recipientName: string;
  senderName: string;
  preview: string;
}): string {
  return baseEmail("New Message", `<p style="font-size:15px;">Hi ${recipientName},</p>
<p style="font-size:15px;line-height:1.6;">You have a new message from <strong>${senderName}</strong>:</p>
<div style="background:#f8f9fa;border-left:4px solid #1a7a5e;border-radius:4px;padding:12px 16px;margin:16px 0;">
  <p style="margin:0;font-size:14px;color:#333;">${preview}</p>
</div>
<p style="text-align:center;margin:24px 0;"><a href="${appUrl("/dashboard")}" style="${CTA}">View Message</a></p>`);
}

export function paymentConfirmedMentorEmail({
  mentorName,
  menteeName,
  packageName,
  amount,
}: {
  mentorName: string;
  menteeName: string;
  packageName: string;
  amount: string;
}): string {
  return baseEmail("Payment Received", `<p style="font-size:15px;">Hi ${mentorName},</p>
<p style="font-size:15px;line-height:1.6;"><strong>${menteeName}</strong> has paid for your <strong>${packageName}</strong> session.</p>
<table style="width:100%;border-collapse:collapse;margin:20px 0;background:#f8f9fa;border-radius:8px;overflow:hidden;">
  <tr><td style="padding:12px 16px;font-size:13px;color:#666;width:40%;">Amount</td><td style="padding:12px 16px;font-size:14px;font-weight:600;">$${amount}</td></tr>
</table>
<p style="text-align:center;margin:24px 0;"><a href="${appUrl("/mentor/dashboard")}" style="${CTA}">View Dashboard</a></p>`);
}
