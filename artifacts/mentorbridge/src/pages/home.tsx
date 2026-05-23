import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useListCategories } from "@workspace/api-client-react";
import {
  Search,
  ArrowRight,
  Compass,
  Sparkles,
  Video,
  TrendingUp,
  ShieldCheck,
  Users,
  Wallet,
  Heart,
  Briefcase,
  Code2,
  Palette,
  Megaphone,
  LineChart,
  Cpu,
  Quote,
} from "lucide-react";
import { useState } from "react";
import heroImage from "@/assets/hero-mentorship.png";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  technology: <Code2 className="h-5 w-5" />,
  finance: <LineChart className="h-5 w-5" />,
  leadership: <Users className="h-5 w-5" />,
  marketing: <Megaphone className="h-5 w-5" />,
  design: <Palette className="h-5 w-5" />,
  entrepreneurship: <Briefcase className="h-5 w-5" />,
  education: <Sparkles className="h-5 w-5" />,
  healthcare: <Heart className="h-5 w-5" />,
  law: <ShieldCheck className="h-5 w-5" />,
};

export default function Home() {
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();
  const { data: categories, isLoading: catLoading } = useListCategories();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLocation(`/mentors${search ? `?search=${encodeURIComponent(search)}` : ""}`);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* ───────────────────────── HERO ───────────────────────── */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/8 via-background to-secondary/10" />
        <div
          className="absolute -top-32 -right-32 -z-10 h-[480px] w-[480px] rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.18), transparent 70%)" }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Copy */}
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary border border-primary/15">
                <Sparkles className="h-3.5 w-3.5" />
                1-on-1 mentorship, no fluff
              </span>

              <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.05]">
                Unlock Your Potential <br />
                with <span className="text-primary">1-on-1 Mentorship</span>
              </h1>

              <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
                Work with real industry experts to learn new skills, accelerate
                your career, or build your startup - on your schedule, at your pace.
              </p>

              <form onSubmit={handleSearch} className="mt-8 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-10 h-12 text-base bg-white shadow-sm"
                    placeholder="Try 'product manager' or 'startup fundraising'"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    data-testid="hero-search"
                  />
                </div>
                <Button type="submit" size="lg" className="h-12 px-5 shrink-0" data-testid="hero-search-btn">
                  Search
                </Button>
              </form>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link href="/mentors">
                  <Button size="lg" className="w-full sm:w-auto gap-1.5" data-testid="hero-browse">
                    Browse Mentors <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/become-a-mentor">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto" data-testid="hero-become">
                    Become a Mentor
                  </Button>
                </Link>
              </div>

              <p className="mt-5 text-xs text-muted-foreground flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Vetted experts · No lock-ins · Cancel anytime
              </p>
            </div>

            {/* Image */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 to-secondary/30 rounded-3xl blur-2xl opacity-60" />
              <div className="relative rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5">
                <img
                  src={heroImage}
                  alt="A mentor and mentee in a 1-on-1 conversation"
                  className="w-full h-auto object-cover aspect-[4/3]"
                  data-testid="hero-image"
                />
              </div>

              {/* Floating credibility chip */}
              <div className="hidden sm:flex absolute -bottom-5 -left-5 bg-white rounded-2xl shadow-lg border border-border px-4 py-3 items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Hand-vetted experts</p>
                  <p className="text-[11px] text-muted-foreground">Every mentor is interviewed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────── BENEFITS ─────────────────────── */}
      <section className="py-16 sm:py-20 px-4 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Mentorship, designed for real progress
          </h2>
          <p className="mt-3 text-muted-foreground">
            A focused way to get unstuck - without the noise of generic courses
            or one-size-fits-all advice.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              icon: <Users className="h-5 w-5" />,
              title: "Vetted experts",
              desc: "Engineers, designers, founders and operators from companies you actually recognise.",
            },
            {
              icon: <Wallet className="h-5 w-5" />,
              title: "Flexible plans",
              desc: "Quick Q&A, deep-dive calls, or ongoing monthly mentorship - only pay for what you need.",
            },
            {
              icon: <ShieldCheck className="h-5 w-5" />,
              title: "No lock-ins",
              desc: "Try a session, switch mentors, or pause anytime. No hidden fees, no auto-renewals you forget about.",
            },
            {
              icon: <TrendingUp className="h-5 w-5" />,
              title: "Built for outcomes",
              desc: "Walk away with clear next steps after every call - not vague pep talks.",
            },
          ].map(({ icon, title, desc }) => (
            <div
              key={title}
              className="group rounded-2xl bg-white border border-border p-6 hover:border-primary/40 hover:shadow-md transition-all duration-200"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                {icon}
              </div>
              <h3 className="font-semibold text-foreground">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ────────────────────── HOW IT WORKS ────────────────────── */}
      <section className="py-16 sm:py-20 px-4 bg-muted/40 border-y border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs uppercase tracking-[0.18em] font-semibold text-primary">
              How it works
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Discover → Start → Meet → Grow
            </h2>
            <p className="mt-3 text-muted-foreground">
              Four simple steps from browsing mentors to making real progress.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {[
              {
                icon: <Compass className="h-5 w-5" />,
                step: "01",
                title: "Discover",
                desc: "Browse a curated network of experts - engineers, designers, founders and managers.",
              },
              {
                icon: <Sparkles className="h-5 w-5" />,
                step: "02",
                title: "Start",
                desc: "Choose a plan that fits - quick Q&A, regular calls or project-based mentorship.",
              },
              {
                icon: <Video className="h-5 w-5" />,
                step: "03",
                title: "Meet",
                desc: "Connect via chat and 1-on-1 calls to get personalised, actionable guidance.",
              },
              {
                icon: <TrendingUp className="h-5 w-5" />,
                step: "04",
                title: "Grow",
                desc: "Stay accountable with ongoing feedback and clear next steps after every session.",
              },
            ].map(({ icon, step, title, desc }) => (
              <div
                key={step}
                className="relative rounded-2xl bg-white border border-border p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                    {icon}
                  </div>
                  <span className="text-xs font-bold text-muted-foreground tracking-widest">
                    {step}
                  </span>
                </div>
                <h3 className="font-semibold text-foreground text-lg">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────── CATEGORIES ──────────────────── */}
      <section className="py-16 sm:py-20 px-4 max-w-7xl mx-auto w-full">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
          <div>
            <span className="text-xs uppercase tracking-[0.18em] font-semibold text-primary">
              Browse expertise
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Mentors across every major industry
            </h2>
          </div>
          <Link href="/mentors">
            <Button variant="ghost" className="gap-1.5 text-primary hover:text-primary">
              See all <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {catLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {(categories ?? []).map((cat) => (
              <Link
                key={cat.id}
                href={`/mentors?category=${cat.slug}`}
                data-testid={`category-${cat.slug}`}
              >
                <div className="group rounded-2xl border border-border bg-white p-5 hover:border-primary/40 hover:shadow-md transition-all duration-200 cursor-pointer flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {CATEGORY_ICONS[cat.slug] ?? <Cpu className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {cat.mentorCount} mentor{cat.mentorCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ─────────────────── FOUNDER'S VISION ─────────────────── */}
      <section className="py-16 sm:py-24 px-4 bg-gradient-to-br from-primary/5 via-background to-secondary/10 border-y border-border">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs uppercase tracking-[0.18em] font-semibold text-primary">
              Our vision
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Why we built GoMindscout
            </h2>
          </div>

          <div className="relative rounded-3xl bg-white border border-border p-8 sm:p-12 shadow-sm">
            <Quote className="absolute -top-5 left-8 h-10 w-10 text-primary bg-white rounded-full p-2 border border-border" />

            <div className="space-y-5 text-foreground text-base sm:text-lg leading-relaxed">
              <p>
                We've all felt it - stuck at a crossroads in our career, sitting
                on an idea we don't know how to ship, or trying to break into an
                industry where we don't know a single person on the inside.
              </p>
              <p>
                The advice that actually changes lives almost never comes from a
                course or a blog post. It comes from a 30-minute conversation
                with someone who's already walked the road you're about to walk.
              </p>
              <p>
                GoMindscout exists to make those conversations possible - at any
                stage, in any field, for anyone with the ambition to ask. No
                gatekeepers. No fluff. Just real people sharing real experience,
                one session at a time.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-border flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                GM
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">The GoMindscout Founders</p>
                <p className="text-xs text-muted-foreground">Building the mentorship layer for ambitious people</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── PRICING & ASSURANCE ─────────────── */}
      <section className="py-16 sm:py-20 px-4 max-w-6xl mx-auto w-full">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-xs uppercase tracking-[0.18em] font-semibold text-primary">
              Simple, transparent
            </span>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Pay per session. Cancel anytime.
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Every mentor sets their own packages - from quick async advice to
              full deep-dive calls. You only pay for what you book. No monthly
              fees, no surprise charges.
            </p>
            <div className="mt-6">
              <Link href="/mentors">
                <Button size="lg" className="gap-1.5" data-testid="pricing-cta">
                  Browse Mentors <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            {[
              {
                icon: <ShieldCheck className="h-5 w-5" />,
                title: "Mentor-set pricing",
                desc: "Every package is priced by the mentor - see the full cost before you book.",
              },
              {
                icon: <Wallet className="h-5 w-5" />,
                title: "Secure checkout",
                desc: "Pay safely through Stripe. Funds are only released when the session is delivered.",
              },
              {
                icon: <Sparkles className="h-5 w-5" />,
                title: "No subscriptions",
                desc: "Book a single session, a few, or many. There's no monthly fee to use the platform.",
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex gap-4 rounded-2xl bg-white border border-border p-5">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  {icon}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────── FINAL CTA ────────────────────── */}
      <section className="py-16 sm:py-20 px-4">
        <div className="max-w-5xl mx-auto rounded-3xl bg-foreground text-background p-10 sm:p-14 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background:
                "radial-gradient(circle at 20% 20%, hsl(var(--primary) / 0.6), transparent 50%), radial-gradient(circle at 80% 80%, hsl(var(--secondary) / 0.6), transparent 50%)",
            }}
          />
          <div className="relative text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Ready to talk to someone who's been there?
            </h2>
            <p className="mt-4 text-base sm:text-lg text-background/70">
              Find a mentor, book a session, and get unstuck this week.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/mentors">
                <Button
                  size="lg"
                  className="bg-white text-foreground hover:bg-white/90 font-semibold w-full sm:w-auto"
                  data-testid="cta-find-mentor"
                >
                  Find a Mentor
                </Button>
              </Link>
              <Link href="/become-a-mentor">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 w-full sm:w-auto"
                  data-testid="cta-become-mentor"
                >
                  Become a Mentor
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
