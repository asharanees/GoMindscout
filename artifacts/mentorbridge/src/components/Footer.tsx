import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-foreground text-background/80 py-12 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="32" height="32" rx="8" fill="hsl(var(--primary))"/>
                <circle cx="16" cy="16" r="8" stroke="white" strokeWidth="1.5" fill="none"/>
                <circle cx="16" cy="16" r="2.5" fill="white"/>
                <line x1="16" y1="8" x2="16" y2="11" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="16" y1="21" x2="16" y2="24" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="8" y1="16" x2="11" y2="16" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="21" y1="16" x2="24" y2="16" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <polygon points="16,10 17.2,14.8 16,13.5 14.8,14.8" fill="hsl(var(--primary))" stroke="white" strokeWidth="0.5"/>
              </svg>
              <span className="font-bold text-base text-white">GoMindscout</span>
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
