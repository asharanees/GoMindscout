import { Router } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, getOrCreateUser, getUserByClerkId } from "../lib/auth";
import { deleteUserAccount } from "../lib/account-deletion";
import { logger } from "../lib/logger";
import { sendEmail, welcomeEmail } from "../lib/email";

const router = Router();

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

async function getClerkProfile(userId: string, sessionClaims: any) {
  const profile = {
    email: firstString(
      sessionClaims?.email,
      sessionClaims?.emailAddress,
      sessionClaims?.email_address,
      sessionClaims?.primaryEmailAddress,
      sessionClaims?.primary_email_address,
    ),
    fullName: firstString(
      sessionClaims?.name,
      sessionClaims?.fullName,
      sessionClaims?.full_name,
      [sessionClaims?.firstName, sessionClaims?.lastName].filter(Boolean).join(" "),
      [sessionClaims?.first_name, sessionClaims?.last_name].filter(Boolean).join(" "),
    ),
    avatarUrl: firstString(sessionClaims?.picture, sessionClaims?.imageUrl, sessionClaims?.image_url),
  };

  if (profile.email) return profile;

  try {
    const clientOrFactory = clerkClient as any;
    const client = typeof clientOrFactory === "function" ? await clientOrFactory() : clientOrFactory;
    const clerkUser = await client.users.getUser(userId);
    const primaryEmail =
      clerkUser.emailAddresses?.find((email: any) => email.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
      clerkUser.emailAddresses?.[0]?.emailAddress ??
      null;

    return {
      email: primaryEmail,
      fullName: profile.fullName || firstString(clerkUser.fullName, [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ")),
      avatarUrl: profile.avatarUrl || firstString(clerkUser.imageUrl, clerkUser.profileImageUrl),
    };
  } catch (err) {
    logger.warn({ err, clerkId: userId }, "Unable to fetch Clerk user profile for local user sync");
    return profile;
  }
}

// GET /api/users/me - get or create current user profile
router.get("/me", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const clerkUser = (req as any).auth as any;

  try {
    const clerkProfile = await getClerkProfile(userId!, clerkUser?.sessionClaims);
    // Try to get from DB, if not exists create it
    const existing = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId!)).limit(1);

    const computedFullName = clerkProfile.fullName;
    const clerkAvatar = clerkProfile.avatarUrl;

    if (existing.length > 0) {
      let u = existing[0];
      const shouldUpdateEmail = Boolean(clerkProfile.email && u.email.endsWith("@unknown.com"));
      // Sync profile data from Clerk if local values are missing or placeholder data was used.
      if (shouldUpdateEmail || (!u.fullName && computedFullName) || (!u.avatarUrl && clerkAvatar)) {
        const [updated] = await db
          .update(usersTable)
          .set({
            ...(shouldUpdateEmail ? { email: clerkProfile.email } : {}),
            ...((!u.fullName && computedFullName) ? { fullName: computedFullName } : {}),
            ...((!u.avatarUrl && clerkAvatar) ? { avatarUrl: clerkAvatar } : {}),
          })
          .where(eq(usersTable.clerkId, userId!))
          .returning();
        if (updated) u = updated;
        if (shouldUpdateEmail && clerkProfile.email) {
          const sent = await sendEmail(
            clerkProfile.email,
            "Welcome to GoMindscout",
            welcomeEmail({ recipientName: computedFullName || "there" }),
          );
          if (!sent) {
            logger.warn({ userId: u.id, clerkId: userId, email: clerkProfile.email }, "Welcome email was not sent after repairing placeholder email");
          }
        }
      }
      res.json({
        id: u.id,
        clerkId: u.clerkId,
        email: u.email,
        fullName: u.fullName,
        avatarUrl: u.avatarUrl,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
      });
      return;
    }

    // Create new user - we'll get email from Clerk token claims
    const email = clerkProfile.email || `${userId}@unknown.com`;

    const user = await getOrCreateUser(userId!, email, computedFullName ?? undefined, clerkAvatar ?? undefined);
    res.json({
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching/creating user");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/users/me
router.patch("/me", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const { fullName, avatarUrl } = req.body;

  try {
    const [updated] = await db
      .update(usersTable)
      .set({ fullName, avatarUrl })
      .where(eq(usersTable.clerkId, userId!))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      id: updated.id,
      clerkId: updated.clerkId,
      email: updated.email,
      fullName: updated.fullName,
      avatarUrl: updated.avatarUrl,
      role: updated.role,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error updating user");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/users/me - delete account and all data
router.delete("/me", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  try {
    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    await deleteUserAccount({ user });
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting user account");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
