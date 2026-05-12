import { Router } from "express";
import { db, categoriesTable, mentorProfilesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

// GET /api/categories
router.get("/", async (req, res) => {
  try {
    const categories = await db.select().from(categoriesTable);

    const withCounts = await Promise.all(
      categories.map(async (cat) => {
        const [row] = await db
          .select({ count: sql<number>`count(*)` })
          .from(mentorProfilesTable)
          .where(
            sql`${mentorProfilesTable.categoryId} = ${cat.id} AND ${mentorProfilesTable.status} = 'approved'`
          );
        return {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          icon: cat.icon,
          mentorCount: Number(row?.count ?? 0),
        };
      })
    );

    res.json(withCounts);
  } catch (err) {
    req.log.error({ err }, "Error fetching categories");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
