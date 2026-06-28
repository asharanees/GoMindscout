import { Router } from "express";
import { db, categoriesTable, mentorProfilesTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

const DEFAULT_CATEGORIES = [
  { name: "Finance & Accounting", slug: "finance", description: "CFOs, finance directors, accountants, investment professionals", icon: "briefcase" },
  { name: "Technology & Engineering", slug: "technology", description: "Software engineers, CTOs, architects, engineering managers", icon: "monitor" },
  { name: "Leadership & Management", slug: "leadership", description: "Executives, team leads, organizational development", icon: "target" },
  { name: "Marketing & Growth", slug: "marketing", description: "CMOs, growth hackers, brand strategists, demand gen", icon: "trending-up" },
  { name: "Healthcare & Medicine", slug: "healthcare", description: "Doctors, nurses, healthcare administrators, MedTech", icon: "hospital" },
  { name: "Law & Compliance", slug: "law", description: "Attorneys, compliance officers, legal counsel", icon: "scale" },
  { name: "Education & Academia", slug: "education", description: "Professors, curriculum designers, EdTech leaders", icon: "graduation-cap" },
  { name: "Entrepreneurship", slug: "entrepreneurship", description: "Startup founders, VCs, product managers, operators", icon: "rocket" },
] as const;

// GET /api/categories
router.get("/", async (req, res) => {
  try {
    let categories = await db.select().from(categoriesTable);

    if (categories.length === 0) {
      await db.insert(categoriesTable).values(DEFAULT_CATEGORIES);
      categories = await db.select().from(categoriesTable);
    }

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
