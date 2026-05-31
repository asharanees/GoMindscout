import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import StarRating from "@/components/StarRating";
import { useGetBooking, useListReviews, getListReviewsQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar, Clock, Video, Users, Clock3, Star, MessageSquare, CheckCircle } from "lucide-react";

interface AttendanceRecord {
  id: number;
  userId: number;
  userName: string | null;
  joinedAt: string;
  leftAt: string | null;
  durationSeconds: number | null;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "N/A";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

function BookingDetailContent() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const bId = parseInt(bookingId);

  const { data: booking, isLoading: bookingLoading } = useGetBooking(bId);
  const { data: reviews, isLoading: reviewLoading } = useListReviews(
    { bookingId: bId },
    { query: { enabled: !!bId, queryKey: getListReviewsQueryKey({ bookingId: bId }) } }
  );
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);

  useEffect(() => {
    if (!bId) return;
    fetch(`/api/meetings/${bId}/attendance`)
      .then(async (res) => {
        if (res.ok) setAttendance(await res.json());
      })
      .catch(() => {})
      .finally(() => setAttendanceLoading(false));
  }, [bId]);

  if (bookingLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
          <Skeleton className="h-96 w-full" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Booking not found.</p>
        </div>
        <Footer />
      </div>
    );
  }

  const statusMap: Record<string, { label: string; color: string }> = {
    pending_payment: { label: "Pending Payment", color: "bg-yellow-100 text-yellow-800" },
    awaiting_mentor_approval: { label: "Awaiting Approval", color: "bg-orange-100 text-orange-800" },
    confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-800" },
    paid_pending_session: { label: "Paid - Awaiting Session", color: "bg-blue-100 text-blue-800" },
    paid: { label: "Paid", color: "bg-blue-100 text-blue-800" },
    scheduled: { label: "Scheduled", color: "bg-indigo-100 text-indigo-800" },
    session_completed: { label: "Session Done", color: "bg-emerald-100 text-emerald-800" },
    under_review: { label: "Under Review", color: "bg-orange-100 text-orange-800" },
    disputed: { label: "Disputed", color: "bg-rose-100 text-rose-800" },
    payout_released: { label: "Completed", color: "bg-green-100 text-green-800" },
    completed: { label: "Completed", color: "bg-green-100 text-green-800" },
    cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-800" },
    refunded: { label: "Refunded", color: "bg-gray-100 text-gray-800" },
    counter_proposed: { label: "Counter Proposed", color: "bg-purple-100 text-purple-800" },
  };
  const status = statusMap[booking.status] ?? { label: booking.status, color: "bg-gray-100 text-gray-800" };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")} className="gap-1.5" data-testid="back-btn">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-xl font-bold">Booking #{booking.id}</h1>
            <p className="text-sm text-muted-foreground">Session details and attendance</p>
          </div>
        </div>

        {/* Booking Info */}
        <Card className="p-6 mb-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage src={booking.mentorAvatarUrl ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">{(booking.mentorName || "M")[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-foreground">{booking.mentorName || "Mentor"}</p>
                <Badge className={`text-xs ${status.color}`}>{status.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{booking.packageTitle || "Session"}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                {booking.scheduledAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(booking.scheduledAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                  </span>
                )}
                {booking.scheduledAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {new Date(booking.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                <span className="font-semibold text-foreground">${Number(booking.amount).toFixed(2)}</span>
              </div>
              {booking.meetingLink && (
                <div className="mt-3 flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                  <Video className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs text-primary truncate flex-1">{booking.meetingLink}</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Attendance */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Meeting Attendance</h2>
          </div>
          {attendanceLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : attendance.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <Clock3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              No attendance data recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {attendance.map((a) => (
                <div key={a.id} className="flex items-center gap-3 border border-border rounded-lg p-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs bg-muted">{(a.userName || "U")[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{a.userName || "User"}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock3 className="h-3 w-3" />
                        Joined: {new Date(a.joinedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {a.leftAt && (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Left: {new Date(a.leftAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                      {a.durationSeconds && (
                        <span className="font-medium text-green-700">
                          Duration: {formatDuration(a.durationSeconds)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Review */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Review</h2>
          </div>
          {reviewLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : !reviews || reviews.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              No review submitted yet.
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="space-y-3 border-b border-border last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center gap-2">
                    <StarRating rating={review.rating} size="md" />
                    <span className="text-sm font-medium text-foreground">{review.rating}/5</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-muted-foreground text-xs mb-1">Punctuality</p>
                      <p className="font-semibold">{review.punctualityRating ?? "N/A"}/5</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-muted-foreground text-xs mb-1">Communication</p>
                      <p className="font-semibold">{review.communicationRating ?? "N/A"}/5</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <p className="text-muted-foreground text-xs mb-1">Value</p>
                      <p className="font-semibold">{review.valueRating ?? "N/A"}/5</p>
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-muted-foreground leading-relaxed bg-muted p-3 rounded-lg">
                      {review.comment}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">Reviewed on {new Date(review.createdAt!).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      <Footer />
    </div>
  );
}

export default function BookingDetailPage() {
  return (
    <ProtectedRoute>
      <BookingDetailContent />
    </ProtectedRoute>
  );
}
