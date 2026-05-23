import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export default function PaymentCancelPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center">
          <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <XCircle className="h-10 w-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Payment Cancelled</h1>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            No worries - your booking wasn't completed and you haven't been charged. You can try again whenever you're ready.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/mentors">
              <Button className="w-full bg-primary hover:bg-primary/90" data-testid="browse-mentors-btn">Browse Mentors</Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full">Back to Home</Button>
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
