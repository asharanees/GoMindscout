import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MentorCard from "@/components/MentorCard";
import { useListCategories, useGetFeaturedMentors } from "@workspace/api-client-react";
import { Search, ArrowRight, CheckCircle, Calendar, MessageSquare, Star } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const CATEGORY_ICONS: Record<string, string> = {
  finance: "💼",
  technology: "💻",
  leadership: "🎯",
  marketing: "📈",
  healthcare: "🏥",
  law: "⚖️",
  education: "🎓",
  entrepreneurship: "🚀",
  design: "🎨",
};

export default function Home() {
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();
  const { data: categories, isLoading: catLoading } = useListCategories();
  const { data: featuredMentors, isLoading: mentorsLoading } = useGetFeaturedMentors();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLocation(`/mentors${search ? `?search=${encodeURIComponent(search)}` : ""}`);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary/5 via-background to-secondary/10 py-24 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(188_72%_28%/_0.08),_transparent_70%)]" />
        <div className="max-w-4xl mx-auto text-center relative">
          <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10" variant="outline">
            Trusted by 2,000+ professionals
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight">
            Find Your Industry Expert.<br />
            <span className="text-primary">Get Real Advice.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Connect 1-on-1 with experienced professionals who've navigated the exact challenges you're facing. Real people. Real insights. Real progress.
          </p>

          <form onSubmit={handleSearch} className="mt-10 flex items-center gap-2 max-w-xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10 h-12 text-base border-border shadow-sm"
                placeholder="Search by role, skill, or industry..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="hero-search"
              />
            </div>
            <Button type="submit" size="lg" className="h-12 px-6 shrink-0" data-testid="hero-search-btn">
              Search
            </Button>
          </form>

          <div className="mt-8 flex flex-wrap gap-2 justify-center text-sm text-muted-foreground">
            {["CFO", "Product Manager", "Career Coach", "Engineering Manager", "Startup Founder"].map((tag) => (
              <button
                key={tag}
                onClick={() => { setSearch(tag); setLocation(`/mentors?search=${encodeURIComponent(tag)}`); }}
                className="px-3 py-1 rounded-full bg-white border border-border hover:border-primary hover:text-primary transition-colors cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-border bg-white py-6">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-3 gap-8 text-center">
          {[
            { value: "500+", label: "Expert Mentors" },
            { value: "2,000+", label: "Sessions Completed" },
            { value: "4.9", label: "Average Rating" },
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="text-2xl font-bold text-primary">{value}</div>
              <div className="text-sm text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Category grid */}
      <section className="py-16 px-4 max-w-7xl mx-auto w-full">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Browse by Expertise</h2>
          <p className="text-muted-foreground mt-2">Find mentors across every major industry</p>
        </div>
        {catLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {(categories ?? []).map((cat) => (
              <Link key={cat.id} href={`/mentors?category=${cat.slug}`} data-testid={`category-${cat.slug}`}>
                <div className="group rounded-xl border border-border bg-white p-5 hover:border-primary hover:shadow-md transition-all duration-200 cursor-pointer text-center">
                  <div className="text-3xl mb-2">{CATEGORY_ICONS[cat.slug] ?? "🔷"}</div>
                  <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{cat.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{cat.mentorCount} mentor{cat.mentorCount !== 1 ? "s" : ""}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="py-16 px-4 bg-muted/40">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">How MentorBridge Works</h2>
            <p className="text-muted-foreground mt-2">Get expert guidance in three simple steps</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { icon: <Search className="h-6 w-6" />, step: "1", title: "Find Your Expert", desc: "Browse verified mentors by industry, role, or skill. Filter by language, price, and availability." },
              { icon: <Calendar className="h-6 w-6" />, step: "2", title: "Book a Session", desc: "Choose a package that fits your needs — 30 min call, 60 min deep-dive, or async email advice." },
              { icon: <MessageSquare className="h-6 w-6" />, step: "3", title: "Get Real Guidance", desc: "Meet with your mentor, get actionable advice, and leave with a clear path forward." },
            ].map(({ icon, step, title, desc }) => (
              <div key={step} className="flex flex-col items-center text-center">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 relative">
                  {icon}
                  <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">{step}</span>
                </div>
                <h3 className="font-bold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured mentors */}
      {(featuredMentors && featuredMentors.length > 0) && (
        <section className="py-16 px-4 max-w-7xl mx-auto w-full">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Featured Mentors</h2>
              <p className="text-muted-foreground mt-1">Handpicked experts ready to help</p>
            </div>
            <Link href="/mentors">
              <Button variant="outline" size="sm" className="gap-1.5">View All <ArrowRight className="h-3.5 w-3.5" /></Button>
            </Link>
          </div>
          {mentorsLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {(featuredMentors ?? []).map((mentor) => (
                <MentorCard key={mentor.id} mentor={mentor} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Testimonials */}
      <section className="py-16 px-4 bg-primary/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-10">What Our Community Says</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              { name: "Sarah K.", role: "Product Manager at Stripe", text: "I had been stuck in my career for two years. One session with my MentorBridge mentor changed everything — I got promoted 3 months later.", rating: 5 },
              { name: "Marcus T.", role: "Startup Founder", text: "Finding a seasoned CFO mentor who would give me real, unfiltered advice seemed impossible. MentorBridge made it happen in 10 minutes.", rating: 5 },
              { name: "Priya R.", role: "Software Engineer", text: "My mentor helped me negotiate a 40% salary increase at my next job. The ROI on one session was incredible.", rating: 5 },
              { name: "James L.", role: "Marketing Director", text: "The quality of mentors here is exceptional. Everyone I've worked with has had real, deep expertise — not just consulting speak.", rating: 5 },
            ].map(({ name, role, text, rating }) => (
              <div key={name} className="bg-white rounded-xl p-6 shadow-xs border border-border">
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-foreground leading-relaxed mb-4">"{text}"</p>
                <div>
                  <p className="font-semibold text-sm text-foreground">{name}</p>
                  <p className="text-xs text-muted-foreground">{role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-primary text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to accelerate your career?</h2>
          <p className="text-white/80 mb-8 text-lg">Join thousands of professionals who've unlocked real advice from real experts.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/mentors">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold w-full sm:w-auto" data-testid="cta-find-mentor">
                Find a Mentor
              </Button>
            </Link>
            <Link href="/become-a-mentor">
              <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 w-full sm:w-auto" data-testid="cta-become-mentor">
                Become a Mentor
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
