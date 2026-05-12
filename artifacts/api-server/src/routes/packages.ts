import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, packagesTable, mentorProfilesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, getUserByClerkId } from "../lib/auth";

const router = Router();

function packageToResponse(p: any) {
  return {
    id: p.id,
    mentorId: p.mentorId,
    title: p.title,
    description: p.description,
    type: p.type,
    durationMinutes: p.durationMinutes,
    price: Number(p.price),
    isActive: p.isActive,
  };
}

// GET /api/mentors/:mentorId/packages
router.get("/:mentorId/packages", async (req, res) => {
  try {
    const mentorId = parseInt(req.params.mentorId);
    const packages = await db
      .select()
      .from(packagesTable)
      .where(and(eq(packagesTable.mentorId, mentorId), eq(packagesTable.isActive, true)));
    res.json(packages.map(packageToResponse));
  } catch (err) {
    req.log.error({ err }, "Error listing mentor packages");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/packages — create package for own mentor profile
router.post("/", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  try {
    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [mentor] = await db
      .select()
      .from(mentorProfilesTable)
      .where(eq(mentorProfilesTable.userId, user.id))
      .limit(1);
    if (!mentor) { res.status(404).json({ error: "No mentor profile" }); return; }

    const { title, description, type, durationMinutes, price } = req.body;
    const [pkg] = await db.insert(packagesTable).values({
      mentorId: mentor.id,
      title,
      description,
      type,
      durationMinutes,
      price: price.toString(),
      isActive: true,
    }).returning();

    res.status(201).json(packageToResponse(pkg));
  } catch (err) {
    req.log.error({ err }, "Error creating package");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/packages/:packageId
router.patch("/:packageId", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  try {
    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const packageId = parseInt(req.params.packageId);
    const { title, description, price, isActive } = req.body;

    const [updated] = await db
      .update(packagesTable)
      .set({ title, description, price: price?.toString(), isActive })
      .where(eq(packagesTable.id, packageId))
      .returning();

    if (!updated) { res.status(404).json({ error: "Package not found" }); return; }
    res.json(packageToResponse(updated));
  } catch (err) {
    req.log.error({ err }, "Error updating package");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/packages/:packageId
router.delete("/:packageId", requireAuth, async (req, res) => {
  try {
    const packageId = parseInt(req.params.packageId);
    await db.update(packagesTable).set({ isActive: false }).where(eq(packagesTable.id, packageId));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting package");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
