import { useRoute } from "wouter";
import { useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  useListMentorPackages,
  useGetMentor,
  useCreateBooking,
} from "@workspace/api-client-react";
import { Clock, Video, Mail, ShieldCheck, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

function BookingContent() {
  const [, params] = useRoute("/book/:packageId");
  const packageId = parseInt(params?.packageId ?? "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // We need to find the package — we'll load it from a mentor lookup. Since we don't have a direct getPackage hook,
  // we'll store packageId in URL and the server will handle it.
  const { mutate: createBooking } = useCreateBooking();

  // We'll render a confirmation without needing full package data (server resolves it)
  async function handleBook() {
    setLoading(true);
    createBooking(
      { data: { packageId } },
      {
        onSuccess: (res: any) => {
          if (res.checkoutUrl) {
            window.location.href = res.checkoutUrl;
          } else {
            setLocation(`/payment/success?bookingId=${res.booking?.id}`);
          }
        },
        onError: (err: any) => {
          toast({ title: "Booking failed", description: err.message || "Please try again.", variant: "destructive" });
          setLoading(false);
        },
      }
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-2xl mx-auto px-4 py-12 w-full">
        <h1 className="text-2xl font-bold text-foreground mb-2">Confirm Your Booking</h1>
        <p className="text-muted-foreground mb-8">Review your session details before proceeding to payment.</p>

        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold text-foreground text-sm">Secure Payment</p>
              <p className="text-xs text-muted-foreground">Powered by Stripe — your card details are never stored</p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Session package</span>
              <span className="font-medium text-foreground">Package #{packageId}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>15% platform fee included</span>
              <span>Securely processed</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 mb-6 bg-amber-50 border-amber-200">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-800 mb-1">What happens after payment?</p>
              <ul className="space-y-1 text-amber-700">
                <li>Your mentor will receive a notification</li>
                <li>They'll add a meeting link within 24 hours</li>
                <li>You'll be able to see it in your dashboard</li>
              </ul>
            </div>
          </div>
        </Card>

        <Button
          className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90"
          onClick={handleBook}
          disabled={loading}
          data-testid="confirm-pay-btn"
        >
          {loading ? "Redirecting to payment..." : "Confirm & Pay"}
        </Button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          By booking, you agree to our{" "}
          <a href="/terms" className="underline hover:text-primary">Terms of Service</a>.
          Full refund if cancelled 24h before the session.
        </p>
      </div>
      <Footer />
    </div>
  );
}

export default function BookingPage() {
  return (
    <ProtectedRoute>
      <BookingContent />
    </ProtectedRoute>
  );
}
