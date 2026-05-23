import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Search,
  ArrowRight,
  Compass,
  Sparkles,
  Video,
  TrendingUp,
  ShieldCheck,
  DollarSign,
  Lock,
  CloudOff,
  CalendarDays,
  Quote,
} from "lucide-react";
import { useState } from "react";
import heroImage from "@/assets/hero-mentorship.png";

export default function Home() {
  const [search, setSearch] = useState("");
  const [, setLocation] = useLocation();

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

      {/* ─────────────────── WHY WE BUILT ─────────────────── */}
      <section className="py-20 sm:py-24 px-4 bg-background">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Why we built GoMindscout
          </h2>

          <Quote
            className="mx-auto mt-8 h-10 w-10 text-primary"
            strokeWidth={2.5}
          />

          <p className="mt-6 text-base sm:text-lg text-foreground/80 leading-relaxed italic">
            "We've all been stuck at a crossroads - in a career, on an idea, or
            trying to break into a field where we don't know a soul. The advice
            that changes lives rarely comes from a course or a blog post; it
            comes from a 30-minute conversation with someone who's already
            walked the road. We built GoMindscout to make those conversations
            possible - for anyone, at any stage, in any field."
          </p>

          <p className="mt-6 text-sm font-semibold text-foreground">
            The GoMindscout Founders
          </p>
        </div>
      </section>

      {/* ─────────────── PRICING & ASSURANCE ─────────────── */}
      <section className="py-16 sm:py-20 px-4 bg-muted/40 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Pay per session. Cancel anytime.
            </h2>
            <p className="mt-3 text-muted-foreground">
              No subscriptions, no lock-ins, no surprise charges.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: <DollarSign className="h-5 w-5" />,
                title: "Mentor-set pricing",
                desc: "Mentor-set pricing, frontiers and online.",
              },
              {
                icon: <Lock className="h-5 w-5" />,
                title: "Secure checkout",
                desc: "Pay safely through Stripe. Funds released when the session is delivered.",
              },
              {
                icon: <CloudOff className="h-5 w-5" />,
                title: "No subscriptions",
                desc: "Book one session or many. No monthly fees to use the platform.",
              },
              {
                icon: <CalendarDays className="h-5 w-5" />,
                title: "Calendar",
                desc: "Pick a time that fits your schedule and your mentor's availability.",
              },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl bg-white border border-border p-6 hover:border-primary/40 hover:shadow-md transition-all duration-200"
              >
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  {icon}
                </div>
                <h3 className="font-semibold text-foreground text-sm">{title}</h3>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <Link href="/mentors">
              <Button size="lg" className="gap-1.5" data-testid="pricing-cta">
                Browse Mentors <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
