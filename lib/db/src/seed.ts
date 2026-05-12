import { db, categoriesTable, usersTable, mentorProfilesTable, packagesTable } from "./index";
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

  const cats = await db.select().from(categoriesTable);
  const catMap: Record<string, number> = {};
  for (const c of cats) catMap[c.slug] = c.id;

  const mentors = [
    {
      clerkId: "demo_mentor_1", email: "sarah.chen@demo.com", fullName: "Sarah Chen",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
      headline: "Former CFO at Series B fintech | 15 years in financial leadership",
      bio: "I spent 15 years in finance, culminating in serving as CFO at two fintech companies through their Series A and B rounds. I advise founders and finance leaders on fundraising, financial modeling, and building world-class finance teams.",
      industry: "Fintech", categorySlug: "finance",
      expertiseTags: ["Financial Modeling", "Fundraising", "CFO Coaching", "FP&A", "M&A"],
      yearsExperience: 15, languages: ["English", "Mandarin"], hourlyRate: "250",
      isFeatured: true,
      packages: [
        { title: "30-min Finance Strategy Call", type: "video_30", durationMinutes: 30, price: "125", description: "Tackle your most pressing finance question." },
        { title: "60-min CFO Advisory Session", type: "video_60", durationMinutes: 60, price: "250", description: "Deep dive into financial modeling or fundraising strategy." },
        { title: "Email Advice", type: "email", price: "75", description: "Written guidance within 48 hours." },
      ],
    },
    {
      clerkId: "demo_mentor_2", email: "marcus.johnson@demo.com", fullName: "Marcus Johnson",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=marcus",
      headline: "Engineering Director at Stripe | Built teams from 5 to 200+ engineers",
      bio: "12 years building and scaling engineering organizations at high-growth startups and FAANG companies. Passionate about engineering culture, technical hiring, and helping engineers transition into leadership.",
      industry: "Technology", categorySlug: "technology",
      expertiseTags: ["Engineering Leadership", "System Design", "Technical Hiring", "Career Growth", "Remote Teams"],
      yearsExperience: 12, languages: ["English"], hourlyRate: "300",
      isFeatured: true,
      packages: [
        { title: "30-min Engineering Career Check-in", type: "video_30", durationMinutes: 30, price: "150", description: "Career advice, job search, or system design review." },
        { title: "60-min Leadership Deep Dive", type: "video_60", durationMinutes: 60, price: "300", description: "Coaching on engineering leadership or technical strategy." },
        { title: "Resume & LinkedIn Review", type: "email", price: "100", description: "Written feedback on your engineering profile." },
      ],
    },
    {
      clerkId: "demo_mentor_3", email: "priya.patel@demo.com", fullName: "Priya Patel",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=priya",
      headline: "VP of Product at Notion | Ex-Google PM | Product strategy expert",
      bio: "10 years building beloved products at consumer and B2B companies. Specializing in 0-to-1 product development, product-led growth, and helping PMs break into senior leadership.",
      industry: "Product", categorySlug: "entrepreneurship",
      expertiseTags: ["Product Strategy", "Product-Led Growth", "Career Coaching", "0-to-1", "User Research"],
      yearsExperience: 10, languages: ["English", "Hindi"], hourlyRate: "200",
      isFeatured: true,
      packages: [
        { title: "30-min PM Strategy Session", type: "video_30", durationMinutes: 30, price: "100", description: "Focused discussion on a product challenge or career move." },
        { title: "60-min Product Coaching", type: "video_60", durationMinutes: 60, price: "200", description: "In-depth coaching on product strategy or PM career development." },
        { title: "Portfolio & Resume Review", type: "email", price: "80", description: "Detailed written feedback on your PM portfolio." },
      ],
    },
    {
      clerkId: "demo_mentor_4", email: "james.okafor@demo.com", fullName: "James Okafor",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=james",
      headline: "Startup founder & angel investor | 2 exits | Pre-seed to Series A specialist",
      bio: "Built and sold two startups in B2B SaaS. Now invest at pre-seed and advise 15+ founders annually. Know exactly what investors look for at each stage.",
      industry: "Venture & Startups", categorySlug: "entrepreneurship",
      expertiseTags: ["Fundraising", "Pitch Deck", "B2B SaaS", "Early Traction", "Co-founder Search"],
      yearsExperience: 11, languages: ["English"], hourlyRate: "175",
      isFeatured: false,
      packages: [
        { title: "30-min Founder Office Hours", type: "video_30", durationMinutes: 30, price: "90", description: "Quick session on fundraising, pitching, or startup strategy." },
        { title: "60-min Startup Deep Dive", type: "video_60", durationMinutes: 60, price: "175", description: "Comprehensive session on your startup's biggest challenge." },
        { title: "Pitch Deck Review", type: "email", price: "150", description: "Detailed written feedback on your pitch deck." },
      ],
    },
    {
      clerkId: "demo_mentor_5", email: "elena.vasquez@demo.com", fullName: "Elena Vasquez",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=elena",
      headline: "CMO at DTC brand | 0-to-$50M revenue | Paid social & brand building",
      bio: "Built marketing engines at three direct-to-consumer brands, most recently scaling revenue from $0 to $50M in 3 years. Specializing in paid social, influencer marketing, and brand storytelling.",
      industry: "E-commerce & DTC", categorySlug: "marketing",
      expertiseTags: ["Paid Social", "Brand Building", "DTC Marketing", "Influencer Strategy", "Creative Direction"],
      yearsExperience: 9, languages: ["English", "Spanish"], hourlyRate: "180",
      isFeatured: true,
      packages: [
        { title: "30-min Marketing Strategy Call", type: "video_30", durationMinutes: 30, price: "90", description: "Quick advice on your marketing channel or brand challenge." },
        { title: "60-min Growth Strategy Session", type: "video_60", durationMinutes: 60, price: "180", description: "Full marketing audit and growth strategy for your brand." },
        { title: "Marketing Plan Review", type: "email", price: "75", description: "Written feedback on your marketing plan or campaign." },
      ],
    },
    {
      clerkId: "demo_mentor_6", email: "dr.james.osei@demo.com", fullName: "Dr. James Osei",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=jamesosei",
      headline: "Healthcare executive & MD | Hospital administration | MedTech strategy",
      bio: "Both a practicing physician and healthcare administrator who has led operations at three hospital systems. Now consult for MedTech startups navigating hospital sales, clinical validation, and regulatory strategy.",
      industry: "Healthcare", categorySlug: "healthcare",
      expertiseTags: ["Healthcare Leadership", "Hospital Administration", "MedTech Strategy", "Clinical Operations"],
      yearsExperience: 18, languages: ["English", "French"], hourlyRate: "350",
      isFeatured: true,
      packages: [
        { title: "30-min Healthcare Career Advice", type: "video_30", durationMinutes: 30, price: "175", description: "Career guidance for healthcare professionals." },
        { title: "60-min MedTech Strategy Session", type: "video_60", durationMinutes: 60, price: "350", description: "Strategic advice on hospital sales or career transition." },
        { title: "Written Consultation", type: "email", price: "125", description: "Detailed written guidance on your healthcare challenge." },
      ],
    },
  ];

  for (const m of mentors) {
    let [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, m.clerkId)).limit(1);
    if (!user) {
      [user] = await db.insert(usersTable).values({ clerkId: m.clerkId, email: m.email, fullName: m.fullName, avatarUrl: m.avatarUrl, role: "mentor" }).returning();
      console.log(`  Created user: ${m.fullName}`);
    }

    const [existingProfile] = await db.select().from(mentorProfilesTable).where(eq(mentorProfilesTable.userId, user.id)).limit(1);
    if (!existingProfile) {
      const [profile] = await db.insert(mentorProfilesTable).values({
        userId: user.id, headline: m.headline, bio: m.bio, industry: m.industry,
        categoryId: catMap[m.categorySlug], expertiseTags: m.expertiseTags,
        yearsExperience: m.yearsExperience, languages: m.languages, hourlyRate: m.hourlyRate,
        status: "approved", isFeatured: m.isFeatured,
      }).returning();
      for (const pkg of m.packages) {
        await db.insert(packagesTable).values({ mentorId: profile.id, ...pkg, isActive: true });
      }
      console.log(`  Created mentor: ${m.fullName} with ${m.packages.length} packages`);
    }
  }

  console.log("Seed completed!");
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
