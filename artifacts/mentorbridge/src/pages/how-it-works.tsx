import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Search, CreditCard, Video, Star, CheckCircle } from "lucide-react";

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <section className="bg-primary/5 border-b border-border py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-4">How MentorBridge Works</h1>
          <p className="text-xl text-muted-foreground">Get expert guidance in four simple steps. No subscriptions, no commitments — just real advice when you need it.</p>
        </div>
      </section>

      <section className="py-20 px-4 max-w-4xl mx-auto w-full">
        <div className="space-y-16">
          {[
            {
              step: "01",
              icon: <Search className="h-7 w-7 text-primary" />,
              title: "Find Your Expert",
              desc: "Browse hundreds of verified mentors filtered by industry, role, language, and price. Every mentor has a full profile with their background, expertise, and verified reviews from real mentees.",
              points: ["Search by job title, company, or skill", "Filter by language and price range", "Read full bios and verified reviews", "Watch intro videos to find the right fit"],
            },
            {
              step: "02",
              icon: <CreditCard className="h-7 w-7 text-primary" />,
              title: "Book & Pay Securely",
              desc: "Choose a session package that suits your needs and pay securely via Stripe. No hidden fees — the price you see is the price you pay.",
              points: ["30-min intro calls for quick questions", "60-min deep dives for complex challenges", "Async email advice for written guidance", "100% secure payment via Stripe"],
            },
            {
              step: "03",
              icon: <Video className="h-7 w-7 text-primary" />,
              title: "Have Your Session",
              desc: "Your mentor will send you a meeting link within 24 hours. Show up, ask your real questions, and get candid advice from someone who's actually been in your shoes.",
              points: ["Video calls via your mentor's preferred platform", "Async email for flexibility", "Mentors are prepared and professional", "Sessions run on time, every time"],
            },
            {
              step: "04",
              icon: <Star className="h-7 w-7 text-primary" />,
              title: "Leave a Review",
              desc: "After your session, leave an honest review to help other professionals find the right mentor. Your feedback helps build a community of quality and trust.",
              points: ["Star rating + written review", "Reviews are permanent and verified", "Helps surface the best mentors", "Builds accountability in the community"],
            },
          ].map(({ step, icon, title, desc, points }) => (
            <div key={step} className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-5xl font-black text-primary/15">{step}</span>
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">{icon}</div>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3">{title}</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">{desc}</p>
              </div>
              <div className="bg-muted/40 rounded-2xl p-6 border border-border">
                <ul className="space-y-3">
                  {points.map((p) => (
                    <li key={p} className="flex items-start gap-3">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-sm text-foreground">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 px-4 bg-primary text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-white/80 mb-8">Your first session could change the trajectory of your career.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/mentors"><Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold">Find a Mentor</Button></Link>
            <Link href="/become-a-mentor"><Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10">Become a Mentor</Button></Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
