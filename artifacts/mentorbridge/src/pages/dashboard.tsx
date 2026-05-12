import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProtectedRoute from "@/components/ProtectedRoute";
import StarRating from "@/components/StarRating";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  useGetMenteeDashboardStats,
  useListMyBookings,
  useCreateReview,
  getListMyBookingsQueryKey,
  getGetMenteeDashboardStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, CheckCircle, DollarSign, Star } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "bg-yellow-100 text-yellow-800",
  paid: "bg-blue-100 text-blue-800",
  scheduled: "bg-indigo-100 text-indigo-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-800",
};

function ReviewDialog({ booking, onClose }: { booking: any; onClose: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: createReview, isPending } = useCreateReview();

  function submit() {
    createReview(
      { data: { bookingId: booking.id, rating, comment: comment || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Review submitted!", description: "Thank you for your feedback." });
          queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMenteeDashboardStatsQueryKey() });
          onClose();
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message || "Could not submit review.", variant: "destructive" });
        },
      }
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave a Review</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="mb-2 block">Rating</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} data-testid={`star-${n}`}>
                  <Star className={`h-7 w-7 transition-colors ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="review-comment" className="mb-2 block">Comment (optional)</Label>
            <Textarea
              id="review-comment"
              placeholder="Share your experience with this mentor..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              data-testid="review-comment"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={isPending} className="bg-primary hover:bg-primary/90" data-testid="submit-review-btn">
            {isPending ? "Submitting..." : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BookingRow({ booking, onReview }: { booking: any; onReview: (b: any) => void }) {
  const statusClass = STATUS_COLORS[booking.status] ?? "bg-gray-100 text-gray-800";
  const initials = (booking.mentorName || "M").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="flex items-center gap-4 py-4 border-b border-border last:border-0">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={booking.mentorAvatarUrl ?? undefined} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground">{booking.mentorName || "Mentor"}</p>
        <p className="text-xs text-muted-foreground">{booking.packageTitle || booking.packageType || "Session"}</p>
        {booking.scheduledAt && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Calendar className="h-3 w-3" /> {new Date(booking.scheduledAt).toLocaleDateString()} at {new Date(booking.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
        {booking.meetingLink && booking.status === "scheduled" && (
          <a href={booking.meetingLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-0.5 block">Join meeting</a>
        )}
      </div>
      <div className="text-right shrink-0">
        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${statusClass}`}>
          {booking.status.replace("_", " ")}
        </span>
        <p className="text-sm font-semibold text-foreground mt-1">${Number(booking.amount).toFixed(0)}</p>
        {booking.status === "completed" && !booking.hasReview && (
          <Button size="sm" variant="outline" className="mt-2 text-xs h-7 px-2" onClick={() => onReview(booking)} data-testid="leave-review-btn">
            Leave Review
          </Button>
        )}
      </div>
    </div>
  );
}

function DashboardContent() {
  const [reviewBooking, setReviewBooking] = useState<any>(null);
  const { data: stats, isLoading: statsLoading } = useGetMenteeDashboardStats();
  const { data: bookings, isLoading: bookingsLoading } = useListMyBookings({ role: "mentee" });

  const upcoming = (bookings ?? []).filter((b: any) => ["paid", "scheduled"].includes(b.status));
  const past = (bookings ?? []).filter((b: any) => ["completed", "cancelled", "refunded"].includes(b.status));

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="bg-primary/5 border-b border-border py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground">My Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Track your sessions and learning journey</p>
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : (
            [
              { icon: <Calendar className="h-5 w-5 text-primary" />, label: "Total Bookings", value: stats?.totalBookings ?? 0 },
              { icon: <CheckCircle className="h-5 w-5 text-green-600" />, label: "Completed", value: stats?.completedSessions ?? 0 },
              { icon: <Clock className="h-5 w-5 text-blue-600" />, label: "Upcoming", value: stats?.upcomingSessions ?? 0 },
              { icon: <DollarSign className="h-5 w-5 text-amber-500" />, label: "Total Spent", value: `$${(stats?.totalSpent ?? 0).toFixed(0)}` },
            ].map(({ icon, label, value }) => (
              <Card key={label} className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">{icon}</div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-xl font-bold text-foreground">{value}</p>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Upcoming bookings */}
        <Card className="p-6">
          <h2 className="font-semibold text-foreground mb-4">Upcoming Sessions</h2>
          {bookingsLoading ? <Skeleton className="h-20" /> : upcoming.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm">No upcoming sessions</p>
              <a href="/mentors" className="text-primary text-sm hover:underline mt-1 block">Find a mentor to book a session</a>
            </div>
          ) : (
            upcoming.map((b: any) => <BookingRow key={b.id} booking={b} onReview={setReviewBooking} />)
          )}
        </Card>

        {/* Past bookings */}
        {past.length > 0 && (
          <Card className="p-6">
            <h2 className="font-semibold text-foreground mb-4">Past Sessions</h2>
            {past.map((b: any) => <BookingRow key={b.id} booking={b} onReview={setReviewBooking} />)}
          </Card>
        )}
      </div>

      {reviewBooking && <ReviewDialog booking={reviewBooking} onClose={() => setReviewBooking(null)} />}
      <Footer />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
