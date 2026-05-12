import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-16 w-full flex-1">
        <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
        <p className="text-muted-foreground text-sm mb-10">Last updated: January 1, 2025</p>

        <div className="prose prose-sm max-w-none text-foreground space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">By accessing or using MentorBridge, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access the service. These terms apply to all users — mentees, mentors, and visitors.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. Service Description</h2>
            <p className="text-muted-foreground leading-relaxed">MentorBridge is a marketplace that facilitates connections between mentees seeking professional guidance and mentors offering expertise. MentorBridge is not a party to any mentoring relationship and does not employ mentors. Mentors are independent contractors.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">You must create an account to access most features. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate, current, and complete information when creating your account.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Payments and Fees</h2>
            <p className="text-muted-foreground leading-relaxed">MentorBridge charges a 15% platform fee on all transactions. This fee is deducted from the amount paid to the mentor. Payments are processed securely by Stripe. Prices are displayed in USD. Refunds may be issued at our discretion, typically for cancellations made more than 24 hours before a scheduled session.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Mentor Obligations</h2>
            <p className="text-muted-foreground leading-relaxed">Mentors agree to provide professional, honest guidance; respond to bookings within 24 hours; and maintain the qualifications and expertise represented in their profile. MentorBridge reserves the right to remove any mentor from the platform for violating these obligations.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Prohibited Conduct</h2>
            <p className="text-muted-foreground leading-relaxed">Users may not use MentorBridge to provide illegal advice, engage in discrimination, solicit personal contact outside the platform to avoid fees, misrepresent credentials, or engage in any activity that harms other users or MentorBridge.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">MentorBridge is not liable for the content of any mentoring session or for any outcomes resulting from mentoring advice. We do not guarantee that any mentor is licensed, certified, or qualified to provide specific professional advice including legal, financial, or medical guidance.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">Questions about these Terms should be directed to our contact page or emailed to legal@mentorbridge.com.</p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
