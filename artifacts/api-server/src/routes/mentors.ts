import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, mentorProfilesTable, usersTable, categoriesTable, reviewsTable, bookingsTable } from "@workspace/db";
import { eq, and, ilike, or, gte, lte, sql, desc, asc } from "drizzle-orm";
import { requireAuth, getUserByClerkId } from "../lib/auth";

const router = Router();

function buildMentorResponse(mentor: any, user: any, category: any, avgRating: number | null, totalReviews: number, totalSessions: number) {
  return {
    id: mentor.id,
    userId: mentor.userId,
    fullName: user?.fullName ?? null,
    avatarUrl: user?.avatarUrl ?? null,
    headline: mentor.headline,
    bio: mentor.bio,
    categoryId: mentor.categoryId,
    categoryName: category?.name ?? null,
    industry: mentor.industry,
    expertiseTags: mentor.expertiseTags ?? [],
    yearsExperience: mentor.yearsExperience,
    languages: mentor.languages ?? [],
    hourlyRate: mentor.hourlyRate ? Number(mentor.hourlyRate) : null,
    introVideoUrl: mentor.introVideoUrl,
    linkedinUrl: mentor.linkedinUrl,
    calendlyUrl: mentor.calendlyUrl,
    experiences: mentor.experiences ?? null,
    honorsAwards: mentor.honorsAwards ?? null,
    publications: mentor.publications ?? null,
    certifications: mentor.certifications ?? null,
    status: mentor.status,
    isFeatured: mentor.isFeatured,
    averageRating: avgRating,
    totalReviews,
    totalSessions,
    createdAt: mentor.createdAt.toISOString(),
  };
}

async function getMentorStats(mentorId: number) {
  const [ratingRow] = await db
    .select({
      avg: sql<string>`round(avg(${reviewsTable.rating})::numeric, 1)`,
      count: sql<number>`count(*)`,
    })
    .from(reviewsTable)
    .where(eq(reviewsTable.mentorId, mentorId));

  const [sessionRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(bookingsTable)
    .where(and(eq(bookingsTable.mentorId, mentorId), eq(bookingsTable.status, "completed")));

  return {
    avgRating: ratingRow?.avg ? Number(ratingRow.avg) : null,
    totalReviews: Number(ratingRow?.count ?? 0),
    totalSessions: Number(sessionRow?.count ?? 0),
  };
}

// GET /api/mentors - search + filter
router.get("/", async (req, res) => {
  try {
    const { search, category, language, minPrice, maxPrice, sortBy, page = "1", limit = "12" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    let conditions = [eq(mentorProfilesTable.status, "approved")];

    if (category) {
      const cat = await db.select().from(categoriesTable).where(eq(categoriesTable.slug, category)).limit(1);
      if (cat[0]) conditions.push(eq(mentorProfilesTable.categoryId, cat[0].id));
    }

    if (minPrice) conditions.push(gte(mentorProfilesTable.hourlyRate, minPrice));
    if (maxPrice) conditions.push(lte(mentorProfilesTable.hourlyRate, maxPrice));

    let query = db.select().from(mentorProfilesTable).where(and(...conditions));

    const mentors = await query.offset(offset).limit(limitNum);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(mentorProfilesTable)
      .where(and(...conditions));

    const results = await Promise.all(
      mentors.map(async (mentor) => {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, mentor.userId)).limit(1);
        const [category] = mentor.categoryId
          ? await db.select().from(categoriesTable).where(eq(categoriesTable.id, mentor.categoryId)).limit(1)
          : [null];
        const stats = await getMentorStats(mentor.id);
        return buildMentorResponse(mentor, user, category, stats.avgRating, stats.totalReviews, stats.totalSessions);
      })
    );

    // Filter by language after fetch if needed
    let filtered = results;
    if (language) {
      filtered = results.filter((m) => m.languages?.some((l: string) => l.toLowerCase() === language.toLowerCase()));
    }

    res.json({ mentors: filtered, total: Number(total), page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error({ err }, "Error listing mentors");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/mentors/featured
router.get("/featured", async (req, res) => {
  try {
    const mentors = await db
      .select()
      .from(mentorProfilesTable)
      .where(and(eq(mentorProfilesTable.status, "approved"), eq(mentorProfilesTable.isFeatured, true)))
      .limit(6);

    const results = await Promise.all(
      mentors.map(async (mentor) => {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, mentor.userId)).limit(1);
        const [cat] = mentor.categoryId
          ? await db.select().from(categoriesTable).where(eq(categoriesTable.id, mentor.categoryId)).limit(1)
          : [null];
        const stats = await getMentorStats(mentor.id);
        return buildMentorResponse(mentor, user, cat, stats.avgRating, stats.totalReviews, stats.totalSessions);
      })
    );

    res.json(results);
  } catch (err) {
    req.log.error({ err }, "Error fetching featured mentors");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/mentors/me - own mentor profile
router.get("/me", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  try {
    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.userId, user.id)).limit(1);
    if (!mentor) { res.status(404).json({ error: "No mentor profile" }); return; }

    const [cat] = mentor.categoryId
      ? await db.select().from(categoriesTable).where(eq(categoriesTable.id, mentor.categoryId)).limit(1)
      : [null];
    const stats = await getMentorStats(mentor.id);
    res.json(buildMentorResponse(mentor, user, cat, stats.avgRating, stats.totalReviews, stats.totalSessions));
  } catch (err) {
    req.log.error({ err }, "Error fetching own mentor profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/mentors/me
router.patch("/me", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  try {
    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.userId, user.id)).limit(1);
    if (!mentor) { res.status(404).json({ error: "No mentor profile" }); return; }

    const { headline, bio, categoryId, industry, expertiseTags, yearsExperience, languages, hourlyRate, introVideoUrl, linkedinUrl, calendlyUrl, experiences, honorsAwards, publications, certifications } = req.body;
    const [updated] = await db
      .update(mentorProfilesTable)
      .set({ headline, bio, categoryId, industry, expertiseTags, yearsExperience, languages, hourlyRate: hourlyRate?.toString(), introVideoUrl, linkedinUrl, calendlyUrl, experiences, honorsAwards, publications, certifications })
      .where(eq(mentorProfilesTable.id, mentor.id))
      .returning();

    const [cat] = updated.categoryId
      ? await db.select().from(categoriesTable).where(eq(categoriesTable.id, updated.categoryId!)).limit(1)
      : [null];
    const stats = await getMentorStats(updated.id);
    res.json(buildMentorResponse(updated, user, cat, stats.avgRating, stats.totalReviews, stats.totalSessions));
  } catch (err) {
    req.log.error({ err }, "Error updating mentor profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/mentors - create mentor profile
router.post("/", requireAuth, async (req, res) => {
  const { userId } = getAuth(req);
  try {
    const user = await getUserByClerkId(userId!);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const { headline, bio, categoryId, industry, expertiseTags, yearsExperience, languages, hourlyRate, introVideoUrl, linkedinUrl, calendlyUrl, experiences, honorsAwards, publications, certifications } = req.body;

    const [mentor] = await db.insert(mentorProfilesTable).values({
      userId: user.id,
      headline,
      bio,
      categoryId,
      industry,
      expertiseTags: expertiseTags ?? [],
      yearsExperience,
      languages: languages ?? [],
      hourlyRate: hourlyRate?.toString(),
      introVideoUrl,
      linkedinUrl,
      calendlyUrl,
      experiences,
      honorsAwards,
      publications,
      certifications,
      status: "pending",
      isFeatured: false,
    }).returning();

    // Update user role to mentor
    await db.update(usersTable).set({ role: "mentor" }).where(eq(usersTable.id, user.id));

    res.status(201).json(buildMentorResponse(mentor, user, null, null, 0, 0));
  } catch (err) {
    req.log.error({ err }, "Error creating mentor profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/mentors/:id
router.get("/:mentorId", async (req, res) => {
  try {
    const mentorId = parseInt(req.params.mentorId);
    const [mentor] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.id, mentorId)).limit(1);
    if (!mentor) { res.status(404).json({ error: "Mentor not found" }); return; }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, mentor.userId)).limit(1);
    const [cat] = mentor.categoryId
      ? await db.select().from(categoriesTable).where(eq(categoriesTable.id, mentor.categoryId)).limit(1)
      : [null];
    const stats = await getMentorStats(mentor.id);
    res.json(buildMentorResponse(mentor, user, cat, stats.avgRating, stats.totalReviews, stats.totalSessions));
  } catch (err) {
    req.log.error({ err }, "Error fetching mentor");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
