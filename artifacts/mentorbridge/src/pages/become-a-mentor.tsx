import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@clerk/react";
import { DollarSign, Clock, Globe, Star, CheckCircle } from "lucide-react";

export default function BecomeAMentorPage() {
  const { isSignedIn } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <section className="bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-24 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4 leading-tight">
            Share Your Expertise.<br /><span className="text-primary">Earn on Your Terms.</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
            MentorBridge connects you with ambitious professionals who need exactly what you've spent years building. Set your own schedule, prices, and working style.
          </p>
          <Link href={isSignedIn ? "/mentor/onboarding" : "/sign-up"}>
            <Button size="lg" className="bg-primary hover:bg-primary/90 font-semibold px-8" data-testid="apply-mentor-btn">
              Apply to Become a Mentor
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-3">Free to apply. We review all applications within 48 hours.</p>
        </div>
      </section>

      <section className="py-16 px-4 max-w-5xl mx-auto w-full">
        <h2 className="text-2xl font-bold text-foreground text-center mb-10">Why Mentors Love MentorBridge</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: <DollarSign className="h-6 w-6 text-primary" />, title: "You Set the Price", desc: "Choose your hourly rate and create packages that work for your schedule and expertise level." },
            { icon: <Clock className="h-6 w-6 text-primary" />, title: "Total Flexibility", desc: "Work from anywhere, on any schedule. Accept only the sessions that fit your availability." },
            { icon: <Globe className="h-6 w-6 text-primary" />, title: "Global Reach", desc: "Connect with mentees from over 35 countries who are specifically looking for your expertise." },
            { icon: <Star className="h-6 w-6 text-primary" />, title: "Build Your Brand", desc: "Grow your reputation through verified reviews and a professional profile that showcases your work." },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="text-center p-6 bg-white rounded-xl border border-border shadow-xs">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">{icon}</div>
              <h3 className="font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 px-4 bg-muted/40">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-10">How It Works for Mentors</h2>
          <div className="space-y-6">
            {[
              { step: "1", title: "Apply & Get Approved", desc: "Fill out your profile — your background, expertise, and rates. Our team reviews every application within 48 hours. We approve mentors who have genuine expertise and a professional track record." },
              { step: "2", title: "Set Up Your Packages", desc: "Create session packages: 30-min calls, 60-min deep dives, or async email advice. We suggest starting prices based on your industry, but you're always in control." },
              { step: "3", title: "Get Booked & Earn", desc: "Once approved and live, mentees can find and book you directly. You'll receive payment for every completed session, minus a 15% platform fee that covers operations and marketing." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-5 bg-white rounded-xl p-6 border border-border shadow-xs">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold shrink-0">{step}</div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 max-w-4xl mx-auto w-full">
        <h2 className="text-2xl font-bold text-foreground text-center mb-10">Who We're Looking For</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            "3+ years in your field at a recognized organization",
            "Genuine expertise in a specific, teachable area",
            "Professional communication skills",
            "Track record of results, not just titles",
            "Commitment to being responsive and reliable",
            "A genuine desire to help others succeed",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <span className="text-sm text-foreground">{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 px-4 bg-primary text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Start sharing your expertise today</h2>
          <p className="text-white/80 mb-8">Applications take 10 minutes. Most mentors are live within 48 hours of applying.</p>
          <Link href={isSignedIn ? "/mentor/onboarding" : "/sign-up"}>
            <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold" data-testid="cta-apply-btn">
              Apply Now — It's Free
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
