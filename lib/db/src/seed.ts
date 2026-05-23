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
      experiences: [
        { id: "exp_1", title: "Chief Financial Officer", company: "Payline Financial", location: "San Francisco, CA", startDate: "2019-03", endDate: "2024-06", isCurrent: false, description: "Led finance through Series A ($12M) and Series B ($45M). Built 12-person finance team from scratch." },
        { id: "exp_2", title: "VP of Finance", company: "Meridian Capital", location: "New York, NY", startDate: "2015-01", endDate: "2019-02", isCurrent: false, description: "Managed $200M AUM portfolio. Oversaw due diligence for 30+ investments." },
        { id: "exp_3", title: "Senior Financial Analyst", company: "Goldman Sachs", location: "New York, NY", startDate: "2010-07", endDate: "2014-12", isCurrent: false, description: "Coverage of fintech and payments sector. Built financial models for IPO readiness." },
      ],
      honorsAwards: [
        { id: "ha_1", title: "40 Under 40 in Finance", issuer: "Forbes", date: "2022-09", description: "Recognized for leadership in fintech finance and innovative FP&A practices." },
        { id: "ha_2", title: "CFO of the Year - Emerging Companies", issuer: "Silicon Valley Business Journal", date: "2021-11", description: "Awarded for steering two companies through successful funding rounds." },
      ],
      publications: [
        { id: "pub_1", title: "The Startup CFO Playbook", publisher: "Harvard Business Review", url: "", date: "2023-04", description: "A guide for first-time CFOs navigating early-stage company finances." },
      ],
      certifications: [
        { id: "cert_1", name: "CPA - Certified Public Accountant", issuer: "AICPA", issueDate: "2012-05", expiryDate: "", credentialId: "" },
        { id: "cert_2", name: "CFA Charterholder", issuer: "CFA Institute", issueDate: "2014-08", expiryDate: "", credentialId: "" },
      ],
      packages: [
        { title: "30-min Finance Strategy Call", type: "video_30", durationMinutes: 30, price: "125", description: "Tackle your most pressing finance question." },
        { title: "60-min CFO Advisory Session", type: "video_60", durationMinutes: 60, price: "250", description: "Deep dive into financial modeling or fundraising strategy." },
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
      experiences: [
        { id: "exp_1", title: "Engineering Director", company: "Stripe", location: "Seattle, WA", startDate: "2020-01", endDate: "", isCurrent: true, description: "Lead the Payments Platform engineering org of 200+ engineers across 4 offices." },
        { id: "exp_2", title: "Staff Engineer", company: "Google", location: "Mountain View, CA", startDate: "2016-03", endDate: "2019-12", isCurrent: false, description: "Worked on Google Cloud infrastructure. Led redesign of core storage layer." },
        { id: "exp_3", title: "Senior Software Engineer", company: "Dropbox", location: "San Francisco, CA", startDate: "2013-06", endDate: "2016-02", isCurrent: false, description: "Built sync engine features serving 500M+ users." },
      ],
      honorsAwards: [
        { id: "ha_1", title: "Top 50 Engineering Leaders", issuer: "Business Insider", date: "2023-06", description: "Recognized for building inclusive remote-first engineering culture." },
      ],
      publications: [
        { id: "pub_1", title: "Scaling Engineering Teams Without Losing Culture", publisher: "InfoQ", url: "", date: "2022-08", description: "Case study on Stripe's engineering growth from 50 to 500 engineers." },
      ],
      certifications: [
        { id: "cert_1", name: "AWS Solutions Architect - Professional", issuer: "Amazon Web Services", issueDate: "2018-03", expiryDate: "2024-03", credentialId: "AWS-SA-2018-44521" },
      ],
      packages: [
        { title: "30-min Engineering Career Check-in", type: "video_30", durationMinutes: 30, price: "150", description: "Career advice, job search, or system design review." },
        { title: "60-min Leadership Deep Dive", type: "video_60", durationMinutes: 60, price: "300", description: "Coaching on engineering leadership or technical strategy." },
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
      experiences: [
        { id: "exp_1", title: "VP of Product", company: "Notion", location: "San Francisco, CA", startDate: "2021-04", endDate: "", isCurrent: true, description: "Leading product strategy for AI features and enterprise expansion." },
        { id: "exp_2", title: "Product Lead", company: "Google", location: "Mountain View, CA", startDate: "2016-07", endDate: "2021-03", isCurrent: false, description: "Product lead for Google Drive collaboration features used by 1B+ users." },
        { id: "exp_3", title: "Associate Product Manager", company: "Microsoft", location: "Seattle, WA", startDate: "2014-06", endDate: "2016-06", isCurrent: false, description: "APM rotation across Office 365 and Azure teams." },
      ],
      honorsAwards: [
        { id: "ha_1", title: "Rising Star in Product Management", issuer: "Product Management Festival", date: "2020-10", description: "Awarded for exceptional product impact at Google within first 3 years." },
      ],
      publications: [
        { id: "pub_1", title: "Product-Led Growth in B2B SaaS", publisher: "O'Reilly Media", url: "", date: "2023-01", description: "Comprehensive guide on building products that drive their own adoption." },
        { id: "pub_2", title: "Why Most 0-to-1 Products Fail (And How to Fix It)", publisher: "First Round Review", url: "", date: "2022-05", description: "Analysis of 50 failed and successful product launches." },
      ],
      certifications: [],
      packages: [
        { title: "30-min PM Strategy Session", type: "video_30", durationMinutes: 30, price: "100", description: "Focused discussion on a product challenge or career move." },
        { title: "60-min Product Coaching", type: "video_60", durationMinutes: 60, price: "200", description: "In-depth coaching on product strategy or PM career development." },
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
      experiences: [
        { id: "exp_1", title: "Angel Investor & Advisor", company: "Independent", location: "Austin, TX", startDate: "2021-01", endDate: "", isCurrent: true, description: "Portfolio of 15 pre-seed investments. LP at two micro-funds." },
        { id: "exp_2", title: "Co-founder & CEO", company: "CloudSync (acquired)", location: "Austin, TX", startDate: "2015-03", endDate: "2020-12", isCurrent: false, description: "Built B2B SaaS for data integration. Sold to Fortune 500 acquirer in 2020." },
        { id: "exp_3", title: "Co-founder & CTO", company: "DataBridge (acquired)", location: "Austin, TX", startDate: "2012-01", endDate: "2015-02", isCurrent: false, description: "API infrastructure startup. Acquired by major cloud provider." },
      ],
      honorsAwards: [
        { id: "ha_1", title: "Founder of the Year - B2B SaaS", issuer: "SXSW", date: "2019-03", description: "Recognized for building two successful B2B SaaS exits in under a decade." },
      ],
      publications: [
        { id: "pub_1", title: "The Pre-Seed Playbook", publisher: "TechCrunch", url: "", date: "2023-02", description: "What founders should know before raising their first institutional round." },
      ],
      certifications: [],
      packages: [
        { title: "30-min Founder Office Hours", type: "video_30", durationMinutes: 30, price: "90", description: "Quick session on fundraising, pitching, or startup strategy." },
        { title: "60-min Startup Deep Dive", type: "video_60", durationMinutes: 60, price: "175", description: "Comprehensive session on your startup's biggest challenge." },
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
      experiences: [
        { id: "exp_1", title: "Chief Marketing Officer", company: "Glow Beauty Co", location: "Los Angeles, CA", startDate: "2020-02", endDate: "", isCurrent: true, description: "Scaled brand from $0 to $50M in 3 years. Built 40-person marketing team." },
        { id: "exp_2", title: "Head of Growth", company: "FashionNova", location: "Los Angeles, CA", startDate: "2017-05", endDate: "2020-01", isCurrent: false, description: "Led paid social strategy generating $200M+ annual revenue." },
        { id: "exp_3", title: "Social Media Manager", company: "BuzzFeed", location: "New York, NY", startDate: "2015-08", endDate: "2017-04", isCurrent: false, description: "Grew brand accounts to 20M+ followers across platforms." },
      ],
      honorsAwards: [
        { id: "ha_1", title: "30 Under 30 - Marketing", issuer: "Adweek", date: "2021-09", description: "Honored for innovative influencer marketing strategies in beauty." },
      ],
      publications: [
        { id: "pub_1", title: "Influencer Marketing That Actually Converts", publisher: "Marketing Land", url: "", date: "2022-11", description: "Framework for measuring true ROI of influencer partnerships." },
      ],
      certifications: [
        { id: "cert_1", name: "Google Ads Certification", issuer: "Google", issueDate: "2018-04", expiryDate: "", credentialId: "" },
        { id: "cert_2", name: "Meta Certified Media Buying Professional", issuer: "Meta", issueDate: "2019-06", expiryDate: "", credentialId: "" },
      ],
      packages: [
        { title: "30-min Marketing Strategy Call", type: "video_30", durationMinutes: 30, price: "90", description: "Quick advice on your marketing channel or brand challenge." },
        { title: "60-min Growth Strategy Session", type: "video_60", durationMinutes: 60, price: "180", description: "Full marketing audit and growth strategy for your brand." },
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
      experiences: [
        { id: "exp_1", title: "Chief Medical Officer", company: "HealthForward Systems", location: "Boston, MA", startDate: "2018-06", endDate: "", isCurrent: true, description: "Oversee clinical operations across 12 hospitals. Lead digital transformation initiatives." },
        { id: "exp_2", title: "Director of Clinical Operations", company: "Mass General Brigham", location: "Boston, MA", startDate: "2012-01", endDate: "2018-05", isCurrent: false, description: "Managed clinical operations for 3,000+ bed system. Reduced readmission rates by 22%." },
        { id: "exp_3", title: "Attending Physician - Internal Medicine", company: "Johns Hopkins Hospital", location: "Baltimore, MD", startDate: "2008-07", endDate: "2011-12", isCurrent: false, description: "Completed residency and fellowship in hospital administration." },
      ],
      honorsAwards: [
        { id: "ha_1", title: "Healthcare Leader of the Year", issuer: "Modern Healthcare", date: "2022-12", description: "Recognized for driving digital health transformation in hospital systems." },
        { id: "ha_2", title: "Distinguished Service Award", issuer: "American College of Physicians", date: "2020-04", description: "For contributions to clinical quality improvement programs." },
      ],
      publications: [
        { id: "pub_1", title: "Digital Health in Large Hospital Systems", publisher: "New England Journal of Medicine", url: "", date: "2023-03", description: "Review of EHR modernization and telehealth adoption in academic medical centers." },
        { id: "pub_2", title: "Reducing Hospital Readmissions Through Predictive Analytics", publisher: "JAMA", url: "", date: "2019-07", description: "Peer-reviewed study on AI-driven readmission risk scoring." },
      ],
      certifications: [
        { id: "cert_1", name: "Board Certified - Internal Medicine", issuer: "ABIM", issueDate: "2010-08", expiryDate: "", credentialId: "" },
        { id: "cert_2", name: "Fellow - American College of Healthcare Executives", issuer: "ACHE", issueDate: "2015-03", expiryDate: "", credentialId: "" },
      ],
      packages: [
        { title: "30-min Healthcare Career Advice", type: "video_30", durationMinutes: 30, price: "175", description: "Career guidance for healthcare professionals." },
        { title: "60-min MedTech Strategy Session", type: "video_60", durationMinutes: 60, price: "350", description: "Strategic advice on hospital sales or career transition." },
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
        experiences: m.experiences,
        honorsAwards: m.honorsAwards,
        publications: m.publications,
        certifications: m.certifications,
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
