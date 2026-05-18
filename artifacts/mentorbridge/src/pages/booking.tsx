import { useRoute, useSearch } from "wouter";
import { useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreateBooking,
  useGetMentorSlots,
  useGetMentor,
  useListMentorPackages,
  getGetMentorSlotsQueryKey,
  getGetMentorQueryKey,
  getListMentorPackagesQueryKey,
} from "@workspace/api-client-react";
import { Calendar, Clock, ShieldCheck, ChevronLeft, CheckCircle } from "lucide-react";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function toDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDisplayDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return `${DAY_NAMES[date.getUTCDay()]}, ${MONTH_NAMES[m - 1]} ${d}, ${y}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function buildDateRange(daysAhead = 14): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: daysAhead }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i + 1); // start tomorrow
    return toDateString(d);
  });
}

interface Slot {
  start: string;
  end: string;
  available: boolean;
}

function SlotPicker({
  mentorId,
  durationMinutes,
  onSelect,
}: {
  mentorId: number;
  durationMinutes: number;
  onSelect: (slot: Slot) => void;
}) {
  const dates = useMemo(() => buildDateRange(14), []);
  const [selectedDate, setSelectedDate] = useState<string>(dates[0]);

  const { data: slots, isLoading } = useGetMentorSlots(
    mentorId,
    { date: selectedDate, durationMinutes },
    {
      query: {
        enabled: !!mentorId && !!selectedDate,
        queryKey: getGetMentorSlotsQueryKey(mentorId, { date: selectedDate, durationMinutes }),
      },
    }
  );

  return (
    <div className="space-y-4">
      {/* Date strip */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-2 w-max">
          {dates.map((d) => {
            const [, m, day] = d.split("-").map(Number);
            const dateObj = new Date(Date.UTC(parseInt(d.split("-")[0]), m - 1, parseInt(d.split("-")[2])));
            const isSelected = d === selectedDate;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDate(d)}
                data-testid={`date-btn-${d}`}
                className={`flex flex-col items-center min-w-[52px] rounded-xl px-2 py-2.5 text-xs font-medium border transition-colors ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-primary/5"
                }`}
              >
                <span className="text-[10px] uppercase tracking-wide opacity-75">{DAY_NAMES[dateObj.getUTCDay()]}</span>
                <span className="text-lg font-bold leading-tight">{day}</span>
                <span className="text-[10px] opacity-75">{MONTH_NAMES[m - 1]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slots */}
      <div>
        <p className="text-xs text-muted-foreground mb-3">
          Available times for <strong>{formatDisplayDate(selectedDate)}</strong>
        </p>
        {isLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 rounded-lg" />)}
          </div>
        ) : !slots || slots.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-xl">
            <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            No available slots on this date
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {(slots as Slot[]).map((slot) => (
              <button
                key={slot.start}
                type="button"
                onClick={() => onSelect(slot)}
                data-testid={`slot-btn-${slot.start}`}
                className="py-2 px-1 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:border-primary hover:bg-primary/5 transition-colors"
              >
                {formatTime(slot.start)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BookingContent() {
  const [, params] = useRoute("/book/:packageId");
  const search = useSearch();
  const packageId = parseInt(params?.packageId ?? "0");
  const mentorId = parseInt(new URLSearchParams(search).get("mentorId") ?? "0");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"pick-slot" | "confirm">("pick-slot");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: mentor } = useGetMentor(mentorId, {
    query: { enabled: !!mentorId, queryKey: getGetMentorQueryKey(mentorId) },
  });
  const { data: packages } = useListMentorPackages(mentorId, {
    query: { enabled: !!mentorId, queryKey: getListMentorPackagesQueryKey(mentorId) },
  });
  const pkg = (packages ?? []).find((p: any) => p.id === packageId);
  const durationMinutes = pkg?.durationMinutes ?? 60;

  const { mutate: createBooking } = useCreateBooking();

  function handleSelectSlot(slot: Slot) {
    setSelectedSlot(slot);
    setStep("confirm");
  }

  function handleBook() {
    if (!selectedSlot) return;
    setLoading(true);
    createBooking(
      { data: { packageId, proposedAt: selectedSlot.start } },
      {
        onSuccess: (res: any) => {
          if (res.checkoutUrl && !res.checkoutUrl.includes("/payment/success")) {
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
      <div className="flex-1 max-w-2xl mx-auto px-4 py-8 w-full">

        {/* Header */}
        <div className="mb-6">
          {mentor && (
            <div className="flex items-center gap-3 mb-1">
              <p className="text-sm text-muted-foreground">Booking with <strong className="text-foreground">{mentor.fullName || mentor.headline || "Mentor"}</strong></p>
            </div>
          )}
          {pkg && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{pkg.title}</span>
              {pkg.durationMinutes && <span>· {pkg.durationMinutes} min</span>}
              <span>· <strong className="text-foreground">${Number(pkg.price).toFixed(0)}</strong></span>
            </div>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className={`flex items-center gap-1.5 text-xs font-medium ${step === "pick-slot" ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === "pick-slot" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {step === "confirm" ? <CheckCircle className="h-3 w-3" /> : "1"}
            </div>
            Choose Time
          </div>
          <div className="h-px flex-1 bg-border" />
          <div className={`flex items-center gap-1.5 text-xs font-medium ${step === "confirm" ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step === "confirm" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>2</div>
            Confirm & Pay
          </div>
        </div>

        {step === "pick-slot" ? (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">Select a Time</h2>
            </div>
            {mentorId ? (
              <SlotPicker mentorId={mentorId} durationMinutes={durationMinutes} onSelect={handleSelectSlot} />
            ) : (
              <p className="text-sm text-muted-foreground">No mentor selected. Please go back and choose a package.</p>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setStep("pick-slot")}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="back-to-slots-btn"
            >
              <ChevronLeft className="h-4 w-4" /> Back to time selection
            </button>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold text-foreground text-sm">Secure Payment</p>
                  <p className="text-xs text-muted-foreground">Powered by Stripe — your card details are never stored</p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                {mentor && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mentor</span>
                    <span className="font-medium text-foreground">{mentor.fullName || mentor.headline || "Mentor"}</span>
                  </div>
                )}
                {pkg && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Package</span>
                    <span className="font-medium text-foreground">{pkg.title}</span>
                  </div>
                )}
                {selectedSlot && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Proposed time</span>
                    <span className="font-medium text-foreground">
                      {new Date(selectedSlot.start).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}{" "}
                      at {formatTime(selectedSlot.start)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-3">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-bold text-foreground">${pkg ? Number(pkg.price).toFixed(2) : "—"}</span>
                </div>
                <p className="text-xs text-muted-foreground">Includes 20% platform fee. 80% goes to your mentor.</p>
              </div>
            </Card>

            <Card className="p-4 bg-amber-50 border-amber-200">
              <div className="flex gap-2.5 text-sm">
                <Calendar className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800 mb-0.5">What happens next?</p>
                  <ul className="space-y-0.5 text-amber-700 text-xs">
                    <li>Your mentor reviews your proposed time</li>
                    <li>They can approve, counter-propose, or reject</li>
                    <li>Meeting room is generated only on confirmation</li>
                  </ul>
                </div>
              </div>
            </Card>

            <Button
              className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90"
              onClick={handleBook}
              disabled={loading || !selectedSlot}
              data-testid="confirm-pay-btn"
            >
              {loading ? "Redirecting to payment..." : "Confirm & Pay"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              By booking, you agree to our{" "}
              <a href="/terms" className="underline hover:text-primary">Terms of Service</a>.
              Full refund if cancelled 24h before the session.
            </p>
          </div>
        )}
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
