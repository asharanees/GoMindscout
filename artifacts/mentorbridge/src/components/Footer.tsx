import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-foreground text-background/80 py-12 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <img
                src="/go-mind-scout-logo.png"
                alt="GoMindscout"
                className="h-10 w-auto object-contain brightness-0 invert"
              />
            </div>
            <p className="text-sm text-background/60 leading-relaxed">
              Connecting ambitious professionals with real industry experts worldwide.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white text-sm mb-3">Platform</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/mentors" className="hover:text-white transition-colors">Find Mentors</Link></li>
              <li><Link href="/become-a-mentor" className="hover:text-white transition-colors">Become a Mentor</Link></li>
              <li><Link href="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white text-sm mb-3">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white text-sm mb-3">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 mt-10 pt-6 text-sm text-background/50 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>© {new Date().getFullYear()} GoMindscout. All rights reserved.</span>
          <span>Connecting expertise across industries and borders.</span>
        </div>
      </div>
    </footer>
  );
}
