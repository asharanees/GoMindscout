import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-16 w-full flex-1">
        <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-10">Last updated: January 1, 2025</p>

        <div className="prose prose-sm max-w-none text-foreground space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed">We collect information you provide when creating an account (name, email, profile photo), when creating a mentor profile (bio, expertise, rates), and during transactions (booking details, but not card numbers — those are handled by Stripe). We also collect usage data like pages visited and features used.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">We use your information to operate the platform (match mentees with mentors, process payments, send booking confirmations), improve the service, communicate about your account, and ensure platform safety and integrity.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Information Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">We share your name and profile information with mentors or mentees as part of the booking process. We do not sell your personal data to third parties. We share data with service providers (Stripe for payments, Clerk for authentication) strictly to operate the platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Mentor Profiles</h2>
            <p className="text-muted-foreground leading-relaxed">Mentor profiles — including your name, photo, bio, and expertise — are publicly visible on the platform. You control what information appears in your profile.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">We use industry-standard encryption to protect data in transit. Payment information is handled entirely by Stripe and is never stored on our servers. We regularly review and update our security practices.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">You have the right to access, correct, or delete your personal data. You can update your account information at any time. To request data deletion, contact us at admin@gomindscout.com.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">We use essential cookies for authentication and session management. We do not use advertising or tracking cookies. You can control cookie settings through your browser.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">Privacy questions can be directed to admin@gomindscout.com or through our contact page.</p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
