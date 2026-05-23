import { Link, useLocation } from "wouter";
import { useAuth, useUser } from "@clerk/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGetMe } from "@workspace/api-client-react";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import NotificationPanel from "@/components/NotificationPanel";

export default function Navbar() {
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  const { data: me } = useGetMe({ query: { enabled: !!isSignedIn } });

  const displayName = me?.fullName || user?.fullName || user?.firstName || null;

  const initials = (displayName || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isMentor = me?.role === "mentor" || me?.role === "admin";
  const isAdmin = me?.role === "admin";

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-border shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2" data-testid="nav-logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="32" rx="8" fill="hsl(var(--primary))"/>
              <circle cx="16" cy="16" r="8" stroke="white" strokeWidth="1.5" fill="none"/>
              <circle cx="16" cy="16" r="2.5" fill="white"/>
              <line x1="16" y1="8" x2="16" y2="11" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="16" y1="21" x2="16" y2="24" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="8" y1="16" x2="11" y2="16" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="21" y1="16" x2="24" y2="16" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              <polygon points="16,10 17.2,14.8 16,13.5 14.8,14.8" fill="hsl(var(--primary))" stroke="white" strokeWidth="0.5"/>
            </svg>
            <span className="font-bold text-lg text-foreground tracking-tight">GoMindscout</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/mentors" className={`text-sm font-medium transition-colors hover:text-primary ${location === "/mentors" ? "text-primary" : "text-muted-foreground"}`} data-testid="nav-mentors">
              Find Mentors
            </Link>
            <Link href="/how-it-works" className={`text-sm font-medium transition-colors hover:text-primary ${location === "/how-it-works" ? "text-primary" : "text-muted-foreground"}`} data-testid="nav-how-it-works">
              How It Works
            </Link>
            <Link href="/become-a-mentor" className={`text-sm font-medium transition-colors hover:text-primary ${location === "/become-a-mentor" ? "text-primary" : "text-muted-foreground"}`} data-testid="nav-become-mentor">
              Become a Mentor
            </Link>
          </div>

          {/* Auth buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isSignedIn && <NotificationPanel />}
            {isSignedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2" data-testid="nav-user-menu">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.imageUrl} />
                      <AvatarFallback className="bg-primary text-white text-xs font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground">{displayName || "Account"}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" data-testid="nav-dashboard-link">My Bookings</Link>
                  </DropdownMenuItem>
                  {isMentor && (
                    <DropdownMenuItem asChild>
                      <Link href="/mentor/dashboard" data-testid="nav-mentor-dashboard-link">Mentor Dashboard</Link>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin" data-testid="nav-admin-link">Admin Panel</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="text-destructive" data-testid="nav-signout">
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/sign-in">
                  <Button variant="ghost" size="sm" data-testid="nav-signin">Sign In</Button>
                </Link>
                <Link href="/sign-up">
                  <Button size="sm" className="bg-primary hover:bg-primary/90" data-testid="nav-signup">Get Started</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button className="md:hidden p-2 rounded-md" onClick={() => setMobileOpen(!mobileOpen)} data-testid="nav-mobile-toggle">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border py-3 space-y-1">
            <Link href="/mentors" className="block px-3 py-2 text-sm font-medium hover:bg-muted rounded-md" onClick={() => setMobileOpen(false)}>Find Mentors</Link>
            <Link href="/how-it-works" className="block px-3 py-2 text-sm font-medium hover:bg-muted rounded-md" onClick={() => setMobileOpen(false)}>How It Works</Link>
            <Link href="/become-a-mentor" className="block px-3 py-2 text-sm font-medium hover:bg-muted rounded-md" onClick={() => setMobileOpen(false)}>Become a Mentor</Link>
            {isSignedIn ? (
              <>
                <Link href="/dashboard" className="block px-3 py-2 text-sm font-medium hover:bg-muted rounded-md" onClick={() => setMobileOpen(false)}>My Bookings</Link>
                {isMentor && <Link href="/mentor/dashboard" className="block px-3 py-2 text-sm font-medium hover:bg-muted rounded-md" onClick={() => setMobileOpen(false)}>Mentor Dashboard</Link>}
                <button onClick={() => { signOut(); setMobileOpen(false); }} className="block w-full text-left px-3 py-2 text-sm font-medium text-destructive hover:bg-muted rounded-md">Sign Out</button>
              </>
            ) : (
              <div className="flex gap-2 px-3 pt-2">
                <Link href="/sign-in" onClick={() => setMobileOpen(false)}><Button variant="outline" size="sm" className="w-full">Sign In</Button></Link>
                <Link href="/sign-up" onClick={() => setMobileOpen(false)}><Button size="sm" className="w-full">Get Started</Button></Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
