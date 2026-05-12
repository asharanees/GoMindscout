import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Calendar, ArrowRight } from "lucide-react";

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center">
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Booking Confirmed!</h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            Your session has been booked and payment processed. Your mentor will add a meeting link within 24 hours.
          </p>

          <Card className="p-5 mb-6 text-left bg-muted/40">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-foreground text-sm">What's next?</p>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  <li>1. Your mentor is notified</li>
                  <li>2. They'll add your meeting link shortly</li>
                  <li>3. Check your dashboard for updates</li>
                  <li>4. Attend your session and get real advice</li>
                </ul>
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-3">
            <Link href="/dashboard">
              <Button className="w-full bg-primary hover:bg-primary/90 gap-2" data-testid="go-to-dashboard">
                Go to My Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/mentors">
              <Button variant="outline" className="w-full">Browse More Mentors</Button>
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
