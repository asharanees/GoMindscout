import { db, categoriesTable } from "./index";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  const categories = [
    { name: "Finance & Accounting", slug: "finance", description: "CFOs, finance directors, accountants", icon: "💼" },
    { name: "Technology & Engineering", slug: "technology", description: "Software engineers, CTOs, architects", icon: "💻" },
    { name: "Leadership & Management", slug: "leadership", description: "Executives, team leads, org dev", icon: "🎯" },
    { name: "Marketing & Growth", slug: "marketing", description: "CMOs, growth hackers, brand strategists", icon: "📈" },
    { name: "Healthcare & Medicine", slug: "healthcare", description: "Doctors, nurses, healthcare admins", icon: "🏥" },
    { name: "Law & Compliance", slug: "law", description: "Attorneys, compliance officers, legal counsel", icon: "⚖️" },
    { name: "Education & Academia", slug: "education", description: "Professors, curriculum designers, EdTech", icon: "🎓" },
    { name: "Entrepreneurship", slug: "entrepreneurship", description: "Founders, VCs, product managers", icon: "🚀" },
  ];

  for (const cat of categories) {
    const existing = await db.select().from(categoriesTable).where(eq(categoriesTable.slug, cat.slug)).limit(1);
    if (existing.length === 0) {
      await db.insert(categoriesTable).values(cat);
      console.log(`  Created: ${cat.name}`);
    }
  }

  console.log("Seed completed!");
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
