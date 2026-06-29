import nodemailer from "nodemailer";
import { logger } from "./logger";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_SECURE = process.env.SMTP_SECURE === "true";
const FROM_EMAIL = process.env.FROM_EMAIL || SMTP_USER || "noreply@gomindscout.com";

const transporter =
  SMTP_HOST && SMTP_USER && SMTP_PASS
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      })
    : null;

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!transporter) {
    logger.warn(
      {
        hasSmtpHost: Boolean(SMTP_HOST),
        hasSmtpUser: Boolean(SMTP_USER),
        hasSmtpPass: Boolean(SMTP_PASS),
        to,
        subject,
      },
      "Email sending skipped because SMTP is not fully configured",
    );
    return false;
  }
  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    logger.info({ to, subject }, "Email sent");
    return true;
  } catch (err) {
    logger.error({ err, to, subject }, "Email send failed");
    return false;
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
    <p style="margin: 0 0 12px; font-size: 14px; color: #444;">Your meeting room is ready:</p>
    <a href="${meetingLink}" style="display: inline-block; background: #1a7a5e; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 15px;">Join Meeting</a>
    <p style="margin: 12px 0 0; font-size: 12px; color: #888; word-break: break-all;">${meetingLink}</p>
  </div>
  <p style="font-size: 13px; color: #888; border-top: 1px solid #eee; padding-top: 16px; margin-top: 24px;">
    This link is unique to your session. Do not share it publicly.<br>
    - The GoMindscout Team
  </p>
</body>
</html>`;
}

const CTA = `display:inline-block;background:#1a7a5e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:600;font-size:15px;`;
const HDR = `background:#1a7a5e;border-radius:8px;padding:24px;margin-bottom:24px;`;
const FTR = `font-size:13px;color:#888;border-top:1px solid #eee;padding-top:16px;margin-top:24px;`;

function appUrl(path = "/"): string {
  const base = (process.env.APP_URL || "https://gomindscout.com").replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

function baseEmail(title: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:Inter,Arial,sans-serif;color:#111;max-width:560px;margin:0 auto;padding:32px 16px;">
<div style="${HDR}"><h1 style="color:#fff;font-size:22px;margin:0;">GoMindscout - ${title}</h1></div>
${body}
<p style="${FTR}">- The GoMindscout Team</p>
</body></html>`;
}

export function welcomeEmail({ recipientName }: { recipientName: string }): string {
  return baseEmail("Welcome", `
<p style="font-size:16px;">Hi ${recipientName},</p>
<p style="font-size:15px;line-height:1.6;">Welcome to GoMindscout. Your account is ready, and you can now discover mentors, request sessions, and manage your learning from your dashboard.</p>
<div style="background:#f8f9fa;border-left:3px solid #1a7a5e;border-radius:4px;padding:16px;margin:16px 0;font-size:14px;color:#444;line-height:1.6;">
  <strong>What you can do next:</strong><br>
  Browse verified mentors, compare expertise, and book the session format that fits your goals.
</div>
<p style="margin-top:20px;"><a href="${appUrl("/mentors")}" style="${CTA}">Find a Mentor</a></p>`);
}

export function accountDeletedEmail({ recipientName }: { recipientName: string }): string {
  return baseEmail("Account Deleted", `
<p style="font-size:16px;">Hi ${recipientName},</p>
<p style="font-size:15px;line-height:1.6;">This email confirms that your GoMindscout account has been deleted.</p>
<p style="font-size:14px;color:#555;line-height:1.6;">Your profile, notifications, and related account data have been removed from the platform. Some records may be retained only where required for security, legal, payment, or audit obligations.</p>
<p style="font-size:14px;color:#555;line-height:1.6;">If you did not request this deletion, please contact support immediately.</p>
<p style="margin-top:20px;"><a href="${appUrl("/contact")}" style="${CTA}">Contact Support</a></p>`);
}

export function bookingRequestEmail({ mentorName, menteeName, packageName, proposedAt }: {
  mentorName: string; menteeName: string; packageName: string; proposedAt: string | null;
}): string {
  const timeStr = proposedAt
    ? `<p style="font-size:14px;"><strong>Requested time:</strong> ${new Date(proposedAt).toLocaleString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric", hour:"2-digit", minute:"2-digit", timeZoneName:"short" })}</p>`
    : "";
  return baseEmail("New Booking Request", `
<p style="font-size:16px;">Hi ${mentorName},</p>
<p style="font-size:15px;line-height:1.6;"><strong>${menteeName}</strong> has requested a session: <strong>${packageName}</strong>.</p>
${timeStr}
<p style="margin-top:20px;"><a href="/mentor/dashboard" style="${CTA}">Review Request</a></p>
<p style="font-size:13px;color:#666;margin-top:16px;">Please approve, counter-propose, or reject from your mentor dashboard.</p>`);
}

export function bookingRejectedEmail({ menteeName, mentorName, packageName, note }: {
  menteeName: string; mentorName: string; packageName: string; note: string | null;
}): string {
  const noteStr = note ? `<p style="font-size:14px;color:#666;">Reason: ${note}</p>` : "";
  return baseEmail("Booking Not Accepted", `
<p style="font-size:16px;">Hi ${menteeName},</p>
<p style="font-size:15px;line-height:1.6;">Unfortunately, <strong>${mentorName}</strong> was unable to accept your booking for <strong>${packageName}</strong>.</p>
${noteStr}
<p style="margin-top:20px;"><a href="/mentors" style="${CTA}">Find Another Mentor</a></p>`);
}

export function counterProposedEmail({ menteeName, mentorName, packageName, proposedAt }: {
  menteeName: string; mentorName: string; packageName: string; proposedAt: string;
}): string {
  const dateStr = new Date(proposedAt).toLocaleString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric", hour:"2-digit", minute:"2-digit", timeZoneName:"short" });
  return baseEmail("New Time Proposed", `
<p style="font-size:16px;">Hi ${menteeName},</p>
<p style="font-size:15px;line-height:1.6;"><strong>${mentorName}</strong> cannot make your requested time for <strong>${packageName}</strong>, but has proposed an alternative:</p>
<div style="background:#f8f9fa;border-left:3px solid #1a7a5e;border-radius:4px;padding:16px;margin:16px 0;font-size:15px;font-weight:600;">${dateStr}</div>
<p style="margin-top:20px;"><a href="/dashboard" style="${CTA}">Accept or Decline</a></p>`);
}

export function counterDeclinedEmail({ mentorName, menteeName, packageName }: {
  mentorName: string; menteeName: string; packageName: string;
}): string {
  return baseEmail("Counter-Proposal Declined", `
<p style="font-size:16px;">Hi ${mentorName},</p>
<p style="font-size:15px;line-height:1.6;"><strong>${menteeName}</strong> declined your proposed time for <strong>${packageName}</strong>. The booking has been cancelled.</p>
<p style="margin-top:20px;"><a href="/mentor/dashboard" style="${CTA}">View Dashboard</a></p>`);
}

export function paymentConfirmedMentorEmail({ mentorName, menteeName, packageName, proposedAt }: {
  mentorName: string; menteeName: string; packageName: string; proposedAt: string | null;
}): string {
  const timeStr = proposedAt
    ? `<p style="font-size:14px;"><strong>Requested time:</strong> ${new Date(proposedAt).toLocaleString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric", hour:"2-digit", minute:"2-digit", timeZoneName:"short" })}</p>`
    : "";
  return baseEmail("New Paid Booking - Action Required", `
<p style="font-size:16px;">Hi ${mentorName},</p>
<p style="font-size:15px;line-height:1.6;"><strong>${menteeName}</strong> has paid for a session: <strong>${packageName}</strong>. Please review and approve or counter-propose.</p>
${timeStr}
<p style="margin-top:20px;"><a href="/mentor/dashboard" style="${CTA}">Review in Dashboard</a></p>`);
}

export function chatMessageEmail({ recipientName, senderName, preview, }: {
  recipientName: string; senderName: string; preview: string;
}): string {
  const safePreview = preview.length > 120 ? preview.slice(0, 120) + "…" : preview;
  return baseEmail("New Message", `
<p style="font-size:16px;">Hi ${recipientName},</p>
<p style="font-size:15px;line-height:1.6;">You have a new message from <strong>${senderName}</strong>:</p>
<div style="background:#f8f9fa;border-left:3px solid #1a7a5e;border-radius:4px;padding:16px;margin:16px 0;font-size:14px;color:#444;">${safePreview}</div>
<p style="margin-top:20px;"><a href="/dashboard" style="${CTA}">Reply in Dashboard</a></p>`);
}
