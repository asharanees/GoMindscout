import { db, categoriesTable, usersTable, mentorProfilesTable, packagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  // Seed categories
  const categories = [
    { name: "Finance & Accounting", slug: "finance", description: "CFOs, finance directors, accountants, investment professionals", icon: "💼" },
    { name: "Technology & Engineering", slug: "technology", description: "Software engineers, CTOs, architects, engineering managers", icon: "💻" },
    { name: "Leadership & Management", slug: "leadership", description: "Executives, team leads, organizational development", icon: "🎯" },
    { name: "Marketing & Growth", slug: "marketing", description: "CMOs, growth hackers, brand strategists, demand gen", icon: "📈" },
    { name: "Healthcare & Medicine", slug: "healthcare", description: "Doctors, nurses, healthcare administrators, MedTech", icon: "🏥" },
    { name: "Law & Compliance", slug: "law", description: "Attorneys, compliance officers, legal counsel", icon: "⚖️" },
    { name: "Education & Academia", slug: "education", description: "Professors, curriculum designers, EdTech leaders", icon: "🎓" },
    { name: "Entrepreneurship", slug: "entrepreneurship", description: "Startup founders, VCs, product managers, operators", icon: "🚀" },
  ];

  for (const cat of categories) {
    const existing = await db.select().from(categoriesTable).where(eq(categoriesTable.slug, cat.slug)).limit(1);
    if (existing.length === 0) {
      await db.insert(categoriesTable).values(cat);
      console.log(`  Created category: ${cat.name}`);
    } else {
      console.log(`  Skipped category: ${cat.name} (exists)`);
    }
  }

  // Get category IDs
  const cats = await db.select().from(categoriesTable);
  const catMap: Record<string, number> = {};
  for (const c of cats) catMap[c.slug] = c.id;

  // Seed demo mentors
  const mentors = [
    {
      clerkId: "demo_mentor_1",
      email: "sarah.chen@demo.com",
      fullName: "Sarah Chen",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah&backgroundColor=b6e3f4",
      role: "mentor" as const,
      profile: {
        headline: "Former CFO at Series B fintech | 15 years in financial leadership",
        bio: "I spent 15 years in finance, culminating in serving as CFO at two fintech companies through their Series A and B rounds. I now advise founders and finance leaders on fundraising, financial modeling, and building world-class finance teams. I've been through IPO prep, M&A, and everything in between.",
        industry: "Fintech",
        categorySlug: "finance",
        expertiseTags: ["Financial Modeling", "Fundraising", "CFO Coaching", "FP&A", "M&A"],
        yearsExperience: 15,
        languages: ["English", "Mandarin"],
        hourlyRate: "250",
        linkedinUrl: "https://linkedin.com",
        isFeatured: true,
      },
      packages: [
        { title: "30-min Finance Strategy Call", type: "video_30", durationMinutes: 30, price: "125", description: "Quick session to tackle your most pressing finance question." },
        { title: "60-min CFO Advisory Session", type: "video_60", durationMinutes: 60, price: "250", description: "Deep dive into financial modeling, fundraising strategy, or team building." },
        { title: "Email Advice", type: "email", price: "75", description: "Written guidance on your finance question, with a detailed response within 48 hours." },
      ],
    },
    {
      clerkId: "demo_mentor_2",
      email: "marcus.johnson@demo.com",
      fullName: "Marcus Johnson",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=marcus&backgroundColor=c0aede",
      role: "mentor" as const,
      profile: {
        headline: "Engineering Director at Stripe | Built teams from 5 to 200+ engineers",
        bio: "I've spent 12 years building and scaling engineering organizations at high-growth startups and FAANG companies. I'm passionate about engineering culture, technical hiring, and helping engineers transition into leadership. I've interviewed 1,000+ engineers and built the hiring process at three companies from scratch.",
        industry: "Technology",
        categorySlug: "technology",
        expertiseTags: ["Engineering Leadership", "System Design", "Technical Hiring", "Career Growth", "Remote Teams"],
        yearsExperience: 12,
        languages: ["English"],
        hourlyRate: "300",
        linkedinUrl: "https://linkedin.com",
        isFeatured: true,
      },
      packages: [
        { title: "30-min Engineering Career Check-in", type: "video_30", durationMinutes: 30, price: "150", description: "Career advice, job search strategy, or system design review." },
        { title: "60-min Leadership Deep Dive", type: "video_60", durationMinutes: 60, price: "300", description: "Detailed coaching on engineering leadership, team building, or technical strategy." },
        { title: "Resume & LinkedIn Review", type: "email", price: "100", description: "Written feedback on your engineering resume and LinkedIn profile." },
      ],
    },
    {
      clerkId: "demo_mentor_3",
      email: "priya.patel@demo.com",
      fullName: "Priya Patel",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=priya&backgroundColor=d1d4f9",
      role: "mentor" as const,
      profile: {
        headline: "VP of Product at Notion | Ex-Google PM | Product strategy & frameworks",
        bio: "10 years building beloved products at consumer and B2B companies. I specialize in 0-to-1 product development, product-led growth, and helping PMs break into senior leadership. At Google I led the launch of three major features with 100M+ users. Now at Notion, I run the core product team.",
        industry: "Product",
        categorySlug: "entrepreneurship",
        expertiseTags: ["Product Strategy", "Product-Led Growth", "Career Coaching", "0-to-1", "User Research"],
        yearsExperience: 10,
        languages: ["English", "Hindi"],
        hourlyRate: "200",
        linkedinUrl: "https://linkedin.com",
        isFeatured: true,
      },
      packages: [
        { title: "30-min PM Strategy Session", type: "video_30", durationMinutes: 30, price: "100", description: "Focused discussion on a product challenge or career move." },
        { title: "60-min Product Coaching", type: "video_60", durationMinutes: 60, price: "200", description: "In-depth coaching on product strategy, roadmaps, or PM career development." },
        { title: "Portfolio & Resume Review", type: "email", price: "80", description: "Detailed written feedback on your PM portfolio and career narrative." },
      ],
    },
    {
      clerkId: "demo_mentor_4",
      email: "james.okafor@demo.com",
      fullName: "James Okafor",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=james&backgroundColor=ffdfbf",
      role: "mentor" as const,
      profile: {
        headline: "Startup founder & angel investor | 2 exits | Pre-seed to Series A specialist",
        bio: "I've built and sold two startups in the B2B SaaS space, and now I invest at pre-seed and advise 15+ founders annually. I know exactly what investors look for at each stage, how to build a founding team, and how to navigate the hardest parts of early startup life — including when to pivot and when to push through.",
        industry: "Venture & Startups",
        categorySlug: "entrepreneurship",
        expertiseTags: ["Fundraising", "Pitch Deck", "Co-founder Search", "B2B SaaS", "Early Traction"],
        yearsExperience: 11,
        languages: ["English", "Yoruba"],
        hourlyRate: "175",
        linkedinUrl: "https://linkedin.com",
        isFeatured: false,
      },
      packages: [
        { title: "30-min Founder Office Hours", type: "video_30", durationMinutes: 30, price: "90", description: "Quick session on fundraising, pitching, or startup strategy." },
        { title: "60-min Startup Deep Dive", type: "video_60", durationMinutes: 60, price: "175", description: "Comprehensive session on your startup's biggest challenge." },
        { title: "Pitch Deck Review", type: "email", price: "150", description: "Detailed written feedback on your pitch deck, from a former founder and current angel." },
      ],
    },
    {
      clerkId: "demo_mentor_5",
      email: "elena.vasquez@demo.com",
      fullName: "Elena Vasquez",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=elena&backgroundColor=c0aede",
      role: "mentor" as const,
      profile: {
        headline: "CMO at DTC brand | 0-to-$50M revenue | Paid social & brand building expert",
        bio: "I've built marketing engines at three direct-to-consumer brands, most recently scaling revenue from $0 to $50M in 3 years. I specialize in paid social, influencer marketing, and brand storytelling for consumer products. I also have deep experience hiring and managing creative teams.",
        industry: "E-commerce & DTC",
        categorySlug: "marketing",
        expertiseTags: ["Paid Social", "Brand Building", "DTC Marketing", "Influencer Strategy", "Creative Direction"],
        yearsExperience: 9,
        languages: ["English", "Spanish"],
        hourlyRate: "180",
        linkedinUrl: "https://linkedin.com",
        isFeatured: false,
      },
      packages: [
        { title: "30-min Marketing Strategy Call", type: "video_30", durationMinutes: 30, price: "90", description: "Quick advice on your marketing channel, creative, or brand challenge." },
        { title: "60-min Growth Strategy Session", type: "video_60", durationMinutes: 60, price: "180", description: "Full marketing audit and growth strategy for your brand." },
        { title: "Marketing Plan Review", type: "email", price: "75", description: "Written feedback on your marketing plan, ad strategy, or campaign approach." },
      ],
    },
    {
      clerkId: "demo_mentor_6",
      email: "dr.james.osei@demo.com",
      fullName: "Dr. James Osei",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=jamesosei&backgroundColor=b6e3f4",
      role: "mentor" as const,
      profile: {
        headline: "Healthcare executive & MD | Hospital administration | MedTech strategy",
        bio: "I'm both a practicing physician and a healthcare administrator who has led operations at three hospital systems. I now consult for MedTech startups navigating hospital sales cycles, clinical validation, and regulatory strategy. I help doctors who want to transition into healthcare leadership or entrepreneurship.",
        industry: "Healthcare",
        categorySlug: "healthcare",
        expertiseTags: ["Healthcare Leadership", "Hospital Administration", "MedTech Strategy", "Clinical Operations", "Career Transition"],
        yearsExperience: 18,
        languages: ["English", "French"],
        hourlyRate: "350",
        linkedinUrl: "https://linkedin.com",
        isFeatured: true,
      },
      packages: [
        { title: "30-min Healthcare Career Advice", type: "video_30", durationMinutes: 30, price: "175", description: "Career guidance for healthcare professionals looking to grow." },
        { title: "60-min MedTech Strategy Session", type: "video_60", durationMinutes: 60, price: "350", description: "Strategic advice on hospital sales, clinical validation, or career transition." },
        { title: "Written Consultation", type: "email", price: "125", description: "Detailed written guidance on your healthcare or MedTech challenge." },
      ],
    },
  ];

  for (const m of mentors) {
    // Create or get user
    let existingUsers = await db.select().from(usersTable).where(eq(usersTable.clerkId, m.clerkId)).limit(1);
    let user = existingUsers[0];

    if (!user) {
      const [created] = await db.insert(usersTable).values({
        clerkId: m.clerkId,
        email: m.email,
        fullName: m.fullName,
        avatarUrl: m.avatarUrl,
        role: m.role,
      }).returning();
      user = created;
      console.log(`  Created user: ${m.fullName}`);
    } else {
      console.log(`  Skipped user: ${m.fullName} (exists)`);
    }

    // Create mentor profile if not exists
    const existingProfiles = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.userId, user.id)).limit(1);
    let profile = existingProfiles[0];

    if (!profile) {
      const [created] = await db.insert(mentorProfilesTable).values({
        userId: user.id,
        headline: m.profile.headline,
        bio: m.profile.bio,
        industry: m.profile.industry,
        categoryId: catMap[m.profile.categorySlug],
        expertiseTags: m.profile.expertiseTags,
        yearsExperience: m.profile.yearsExperience,
        languages: m.profile.languages,
        hourlyRate: m.profile.hourlyRate,
        linkedinUrl: m.profile.linkedinUrl,
        status: "approved",
        isFeatured: m.profile.isFeatured,
      }).returning();
      profile = created;
      console.log(`  Created mentor profile: ${m.fullName}`);

      // Create packages
      for (const pkg of m.packages) {
        await db.insert(packagesTable).values({
          mentorId: profile.id,
          title: pkg.title,
          type: pkg.type,
          durationMinutes: pkg.durationMinutes ?? null,
          price: pkg.price,
          description: pkg.description,
          isActive: true,
        });
      }
      console.log(`  Created ${m.packages.length} packages for ${m.fullName}`);
    } else {
      console.log(`  Skipped mentor profile: ${m.fullName} (exists)`);
    }
  }

  console.log("\nSeed completed!");
}

seed().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
