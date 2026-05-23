import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Heart, Globe, Shield, Zap } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <section className="bg-primary/5 border-b border-border py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">About GoMindscout</h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            We believe the best advice comes from people who've actually been there. GoMindscout connects ambitious professionals with the industry experts who can help them navigate real challenges.
          </p>
        </div>
      </section>

      <section className="py-16 px-4 max-w-4xl mx-auto w-full">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Our Mission</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The professional world has always run on relationships and access. People with the right networks get the right opportunities. GoMindscout was built to democratize that access - to give every professional, regardless of where they started, a direct line to the experience and wisdom they need.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              We're not a jobs board or a coaching app. We're a bridge - between where you are and where you want to be, built from real human connection.
            </p>
          </div>
          <div className="bg-muted/40 rounded-2xl p-8 border border-border">
            <div className="grid grid-cols-2 gap-6 text-center">
              {[
                { value: "500+", label: "Expert Mentors" },
                { value: "2,000+", label: "Sessions Completed" },
                { value: "35+", label: "Countries" },
                { value: "4.9/5", label: "Average Rating" },
              ].map(({ value, label }) => (
                <div key={label}>
                  <p className="text-2xl font-bold text-primary">{value}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-10">Our Values</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              { icon: <Heart className="h-6 w-6 text-primary" />, title: "Human First", desc: "Every interaction on GoMindscout is built around genuine human connection, not transactional exchanges." },
              { icon: <Shield className="h-6 w-6 text-primary" />, title: "Quality Over Quantity", desc: "Every mentor on our platform is reviewed by our team. We'd rather have 500 great mentors than 5,000 mediocre ones." },
              { icon: <Globe className="h-6 w-6 text-primary" />, title: "Global Access", desc: "Whether you're in New York or Nairobi, you deserve access to world-class expertise." },
              { icon: <Zap className="h-6 w-6 text-primary" />, title: "Real Results", desc: "We measure success in promotions earned, businesses launched, and problems solved - not sessions booked." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex gap-4 bg-white rounded-xl p-5 border border-border shadow-xs">
                <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">{icon}</div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-primary text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Ready to find your mentor?</h2>
          <p className="text-white/80 mb-8">Join thousands of professionals already getting real advice from real experts.</p>
          <Link href="/mentors"><Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold">Find a Mentor</Button></Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
