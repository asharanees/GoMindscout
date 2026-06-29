import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, getOrCreateUser, getUserByClerkId } from "../lib/auth";
import { deleteUserAccount } from "../lib/account-deletion";

const router = Router();

// GET /api/users/me - get or create current user profile
router.get("/me", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  const clerkUser = (req as any).auth as any;

  try {
    // Try to get from DB, if not exists create it
    const existing = await db.select().from(usersTable).where(eq(usersTable.clerkId, userId!)).limit(1);

    // Build full name from Clerk claims (firstName + lastName, or name, or email fallback)
    const firstName = (clerkUser?.sessionClaims?.firstName as string) || "";
    const lastName = (clerkUser?.sessionClaims?.lastName as string) || "";
    const nameClaim = (clerkUser?.sessionClaims?.name as string) || "";
    const computedFullName = nameClaim || (firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || null);
    const clerkAvatar = (clerkUser?.sessionClaims?.picture as string) || null;

    if (existing.length > 0) {
      let u = existing[0];
      // Sync name/avatar from Clerk if they're missing in DB
      if ((!u.fullName && computedFullName) || (!u.avatarUrl && clerkAvatar)) {
        const [updated] = await db
          .update(usersTable)
          .set({
            ...((!u.fullName && computedFullName) ? { fullName: computedFullName } : {}),
            ...((!u.avatarUrl && clerkAvatar) ? { avatarUrl: clerkAvatar } : {}),
          })
          .where(eq(usersTable.clerkId, userId!))
          .returning();
        if (updated) u = updated;
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
    const email = (clerkUser?.sessionClaims?.email as string) || `${userId}@unknown.com`;

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
