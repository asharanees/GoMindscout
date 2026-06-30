import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProtectedRoute from "@/components/ProtectedRoute";
import ChatDrawer from "@/components/ChatDrawer";
import MeetingRoom from "@/components/MeetingRoom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useGetMenteeDashboardStats,
  useListMyBookings,
  useCreateReview,
  useCancelBooking,
  useAcceptCounterProposal,
  useDeclineCounterProposal,
  useDeleteMe,
  getListMyBookingsQueryKey,
  getGetMenteeDashboardStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, CheckCircle, DollarSign, Star, MessageSquare, ShieldAlert, XCircle, ThumbsUp, ThumbsDown, Trash2, Video, RotateCcw } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "bg-yellow-100 text-yellow-800",
  awaiting_mentor_approval: "bg-orange-100 text-orange-800",
  confirmed: "bg-blue-100 text-blue-800",
  counter_proposed: "bg-purple-100 text-purple-800",
  reschedule_proposed: "bg-amber-100 text-amber-800",
  paid_pending_session: "bg-blue-100 text-blue-800",
  session_completed: "bg-emerald-100 text-emerald-800",
  under_review: "bg-orange-100 text-orange-800",
  disputed: "bg-rose-100 text-rose-800",
  payout_released: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-800",
  paid: "bg-blue-100 text-blue-800",
  scheduled: "bg-indigo-100 text-indigo-800",
  completed: "bg-green-100 text-green-800",
};

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Pending Payment",
  awaiting_mentor_approval: "Awaiting Mentor Approval",
  confirmed: "Confirmed",
  counter_proposed: "Mentor Proposed New Time",
  reschedule_proposed: "Reschedule Pending",
  paid_pending_session: "Paid - Awaiting Session",
  session_completed: "Session Done",
  under_review: "Under Review",
  disputed: "Disputed",
  payout_released: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  paid: "Paid",
  scheduled: "Scheduled",
  completed: "Completed",
};

const ACTIVE_STATUSES = ["awaiting_mentor_approval", "confirmed", "counter_proposed", "reschedule_proposed", "paid_pending_session", "paid", "scheduled"];
const DONE_STATUSES = ["session_completed", "payout_released", "completed", "cancelled", "refunded", "under_review", "disputed"];
const REVIEWABLE_STATUSES = ["session_completed", "payout_released", "completed", "under_review"];

function StarPicker({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)}>
            <Star className={`h-5 w-5 transition-colors ${n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

function ReviewDialog({ booking, onClose }: { booking: any; onClose: () => void }) {
  const [rating, setRating] = useState(5);
  const [punctuality, setPunctuality] = useState(5);
  const [communication, setCommunication] = useState(5);
  const [value, setValue] = useState(5);
  const [comment, setComment] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: createReview, isPending } = useCreateReview();

  function submit() {
    createReview(
      {
        data: {
          bookingId: booking.id,
          rating,
          punctualityRating: punctuality,
          communicationRating: communication,
          valueRating: value,
          comment: comment || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Review submitted!", description: "Thank you for your feedback." });
          queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMenteeDashboardStatsQueryKey() });
          onClose();
        },
        onError: (err: any) => toast({ title: "Error", description: err.message || "Could not submit review.", variant: "destructive" }),
      }
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Leave a Review</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label className="mb-2 block">Overall Rating</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} data-testid={`star-${n}`}>
                  <Star className={`h-7 w-7 transition-colors ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <StarPicker label="Punctuality" value={punctuality} onChange={setPunctuality} />
            <StarPicker label="Communication" value={communication} onChange={setCommunication} />
            <StarPicker label="Value" value={value} onChange={setValue} />
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

function ProposeRescheduleDialog({ booking, onClose }: { booking: any; onClose: () => void }) {
  const [proposedAt, setProposedAt] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!proposedAt) { toast({ title: "Please select a new time", variant: "destructive" }); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/propose-reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposedAt: new Date(proposedAt).toISOString() }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed"); }
      toast({ title: "Reschedule proposed!", description: "Your mentor will be notified to accept or cancel." });
      queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Propose New Meeting Time</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          {booking.scheduledAt && (
            <div className="bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground">
              Current time:{" "}
              <strong className="text-foreground">
                {new Date(booking.scheduledAt).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </strong>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="reschedule-time">New Proposed Time</Label>
            <Input
              id="reschedule-time"
              type="datetime-local"
              value={proposedAt}
              onChange={(e) => setProposedAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              data-testid="reschedule-time-input"
            />
          </div>
          <p className="text-xs text-muted-foreground">Your mentor must accept the new time. If they cancel, the booking will be cancelled.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Back</Button>
          <Button onClick={submit} disabled={loading || !proposedAt} data-testid="send-reschedule-btn">
            {loading ? "Sending..." : "Send Proposal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CounterProposalCard({ booking }: { booking: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: acceptCounter, isPending: accepting } = useAcceptCounterProposal();
  const { mutate: declineCounter, isPending: declining } = useDeclineCounterProposal();
  const initials = (booking.mentorName || "M").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  function handleAccept() {
    acceptCounter(
      { bookingId: booking.id },
      {
        onSuccess: () => {
          toast({ title: "Counter-proposal accepted!", description: "Meeting room generated. Join from your dashboard." });
          queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMenteeDashboardStatsQueryKey() });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  function handleDecline() {
    if (!confirm("Declining will cancel this booking. Are you sure?")) return;
    declineCounter(
      { bookingId: booking.id },
      {
        onSuccess: () => {
          toast({ title: "Counter-proposal declined", description: "The booking has been cancelled." });
          queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMenteeDashboardStatsQueryKey() });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  return (
    <div className="py-4 border-b border-border last:border-0" data-testid="counter-proposal-row">
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9 shrink-0 mt-0.5">
          <AvatarImage src={booking.mentorAvatarUrl ?? undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground">{booking.mentorName || "Mentor"}</p>
          <p className="text-xs text-muted-foreground">{booking.packageTitle || "Session"} · ${Number(booking.amount).toFixed(0)}</p>
          {booking.proposedAt && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Your proposed time:{" "}
              {new Date(booking.proposedAt).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
          {booking.mentorProposedAt && (
            <div className="mt-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
              <p className="text-xs font-semibold text-purple-800 mb-0.5">Mentor's counter-proposal:</p>
              <p className="text-sm font-medium text-purple-900">
                {new Date(booking.mentorProposedAt).toLocaleString([], { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-3 ml-12">
        <Button size="sm" className="h-8 text-xs gap-1.5 bg-green-600 hover:bg-green-700" onClick={handleAccept} disabled={accepting || declining} data-testid="accept-counter-btn">
          <ThumbsUp className="h-3 w-3" /> Accept New Time
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-red-300 text-red-600 hover:bg-red-50" onClick={handleDecline} disabled={accepting || declining} data-testid="decline-counter-btn">
          <ThumbsDown className="h-3 w-3" /> Decline
        </Button>
      </div>
    </div>
  );
}

function RescheduleProposalCard({ booking }: { booking: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [accepting, setAccepting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const initials = (booking.mentorName || "M").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  // Only show this card when mentor proposed and mentee must respond
  if (booking.rescheduleProposedBy !== "mentor") return null;

  async function handleAccept() {
    setAccepting(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/accept-reschedule`, { method: "POST" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      toast({ title: "Reschedule accepted!", description: "New meeting room generated." });
      queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setAccepting(false); }
  }

  async function handleCancel() {
    if (!confirm("This will cancel the booking. Are you sure?")) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "Mentee cancelled after reschedule request" }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      toast({ title: "Booking cancelled" });
      queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setCancelling(false); }
  }

  return (
    <div className="py-4 border-b border-border last:border-0" data-testid="reschedule-proposal-row">
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9 shrink-0 mt-0.5">
          <AvatarImage src={booking.mentorAvatarUrl ?? undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground">{booking.mentorName || "Mentor"}</p>
          <p className="text-xs text-muted-foreground">{booking.packageTitle || "Session"} · ${Number(booking.amount).toFixed(0)}</p>
          {booking.rescheduleProposedAt && (
            <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <p className="text-xs font-semibold text-amber-800 mb-0.5">Mentor wants to reschedule to:</p>
              <p className="text-sm font-medium text-amber-900">
                {new Date(booking.rescheduleProposedAt).toLocaleString([], { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-3 ml-12">
        <Button size="sm" className="h-8 text-xs gap-1.5 bg-green-600 hover:bg-green-700" onClick={handleAccept} disabled={accepting || cancelling} data-testid="accept-reschedule-btn">
          <ThumbsUp className="h-3 w-3" /> Accept New Time
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-red-300 text-red-600 hover:bg-red-50" onClick={handleCancel} disabled={accepting || cancelling} data-testid="cancel-booking-btn">
          <ThumbsDown className="h-3 w-3" /> Cancel Booking
        </Button>
      </div>
    </div>
  );
}

function BookingRow({ booking, onReview, onChat, onMeeting }: { booking: any; onReview: (b: any) => void; onChat: (bookingId: number) => void; onMeeting?: (b: any) => void }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: cancelBooking, isPending: cancelling } = useCancelBooking();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const statusClass = STATUS_COLORS[booking.status] ?? "bg-gray-100 text-gray-800";
  const statusLabel = STATUS_LABELS[booking.status] ?? booking.status.replace(/_/g, " ");
  const initials = (booking.mentorName || "M").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const canReview = REVIEWABLE_STATUSES.includes(booking.status) && !booking.hasReview;
  const canChat = !["pending_payment", "awaiting_mentor_approval", "counter_proposed", "cancelled", "refunded"].includes(booking.status);
  const canDispute = ["confirmed", "paid_pending_session", "session_completed", "paid", "scheduled", "completed"].includes(booking.status) && !booking.hasDispute;
  const canCancel = ["awaiting_mentor_approval", "confirmed", "paid_pending_session", "pending_payment", "paid", "scheduled"].includes(booking.status);
  const canJoin = booking.hasMeetingRoom && canChat && onMeeting;
  const canProposeReschedule = ["confirmed", "paid_pending_session", "paid", "scheduled"].includes(booking.status) && booking.hasMeetingRoom;

  function handleCancel() {
    if (!confirm("Are you sure you want to cancel this booking? Refund policy applies.")) return;
    cancelBooking(
      { bookingId: booking.id, data: {} },
      {
        onSuccess: () => {
          toast({ title: "Booking cancelled", description: "Refund will be processed per policy." });
          queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMenteeDashboardStatsQueryKey() });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  return (
    <div className="flex items-start gap-4 py-4 border-b border-border last:border-0" data-testid="booking-row">
      <Avatar className="h-10 w-10 shrink-0 mt-0.5">
        <AvatarImage src={booking.mentorAvatarUrl ?? undefined} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <button type="button" onClick={() => setLocation(`/bookings/${booking.id}`)} className="font-medium text-sm text-foreground hover:text-primary hover:underline text-left">
          {booking.mentorName || "Mentor"}
        </button>
        <p className="text-xs text-muted-foreground">{booking.packageTitle || booking.packageType || "Session"}</p>
        {booking.proposedAt && !booking.scheduledAt && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Clock className="h-3 w-3" /> Proposed: {new Date(booking.proposedAt).toLocaleDateString()} at {new Date(booking.proposedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
        {booking.scheduledAt && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Calendar className="h-3 w-3" /> {new Date(booking.scheduledAt).toLocaleDateString()} at {new Date(booking.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
        {canJoin && (
          <button
            type="button"
            onClick={() => onMeeting!(booking)}
            className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary border border-primary/20 rounded px-2 py-1 hover:bg-primary/20 transition-colors"
            data-testid="join-meeting-btn"
          >
            <Video className="h-3 w-3" /> Join Meeting Room
          </button>
        )}
        {booking.hasDispute && <p className="text-xs text-orange-600 mt-0.5 font-medium">Dispute filed - under review</p>}
        {booking.cancellationNote && <p className="text-xs text-muted-foreground mt-0.5 italic">{booking.cancellationNote}</p>}
      </div>
      <div className="text-right shrink-0 space-y-1.5">
        <div>
          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${statusClass}`}>{statusLabel}</span>
          <p className="text-sm font-semibold text-foreground mt-1">${Number(booking.amount).toFixed(0)}</p>
        </div>
        <div className="flex flex-col gap-1 items-end">
          {canProposeReschedule && (
            <Button size="sm" variant="outline" className="text-xs h-7 px-2 gap-1" onClick={() => setRescheduleOpen(true)} data-testid="propose-reschedule-btn">
              <RotateCcw className="h-3 w-3" /> Reschedule
            </Button>
          )}
          {canChat && (
            <Button size="sm" variant="outline" className="text-xs h-7 px-2 gap-1" onClick={() => onChat(booking.id)} data-testid="chat-btn">
              <MessageSquare className="h-3 w-3" /> Chat
            </Button>
          )}
          {canReview && (
            <Button size="sm" variant="outline" className="text-xs h-7 px-2 gap-1" onClick={() => onReview(booking)} data-testid="leave-review-btn">
              <Star className="h-3 w-3" /> Review
            </Button>
          )}
          {canDispute && (
            <Button size="sm" variant="outline" className="text-xs h-7 px-2 gap-1 text-destructive border-destructive/30 hover:bg-destructive hover:text-white" onClick={() => setLocation(`/bookings/${booking.id}/dispute`)} data-testid="dispute-btn">
              <ShieldAlert className="h-3 w-3" /> Dispute
            </Button>
          )}
          {canCancel && (
            <Button size="sm" variant="ghost" className="text-xs h-7 px-2 gap-1 text-muted-foreground hover:text-destructive" onClick={handleCancel} disabled={cancelling} data-testid="cancel-btn">
              <XCircle className="h-3 w-3" /> Cancel
            </Button>
          )}
        </div>
      </div>
      {rescheduleOpen && <ProposeRescheduleDialog booking={booking} onClose={() => setRescheduleOpen(false)} />}
    </div>
  );
}

function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { mutate: deleteAccount, isPending } = useDeleteMe();

  function handleDelete() {
    deleteAccount(undefined, {
      onSuccess: () => {
        toast({ title: "Account deleted", description: "Your account and all data have been removed." });
        signOut();
        setLocation("/");
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Delete Account</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground py-2">This will permanently delete your account, bookings, and all associated data. This action cannot be undone.</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending} data-testid="confirm-delete-account-btn">
            {isPending ? "Deleting..." : "Delete Account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DashboardContent() {
  const [reviewBooking, setReviewBooking] = useState<any>(null);
  const [chatBookingId, setChatBookingId] = useState<number | null>(null);
  const [meetingBooking, setMeetingBooking] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { data: stats, isLoading: statsLoading } = useGetMenteeDashboardStats();
  const { data: bookings, isLoading: bookingsLoading } = useListMyBookings({ role: "mentee" });

  const counterProposed = (bookings ?? []).filter((b: any) => b.status === "counter_proposed");
  const reschedulePendingFromMentor = (bookings ?? []).filter((b: any) => b.status === "reschedule_proposed" && b.rescheduleProposedBy === "mentor");
  const upcoming = (bookings ?? []).filter((b: any) => ACTIVE_STATUSES.includes(b.status) && b.status !== "counter_proposed" && !(b.status === "reschedule_proposed" && b.rescheduleProposedBy === "mentor"));
  const inProgress = (bookings ?? []).filter((b: any) => ["session_completed", "under_review", "disputed"].includes(b.status));
  const past = (bookings ?? []).filter((b: any) => ["payout_released", "completed", "cancelled", "refunded"].includes(b.status));

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

        {/* Counter-proposals that need action */}
        {counterProposed.length > 0 && (
          <Card className="p-6 border-purple-200 bg-purple-50/30">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-5 w-5 text-purple-600" />
              <h2 className="font-semibold text-foreground">Mentor Proposed New Times</h2>
              <span className="ml-auto text-xs font-semibold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">{counterProposed.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Your mentor suggested different times. Review and accept or decline.</p>
            {counterProposed.map((b: any) => <CounterProposalCard key={b.id} booking={b} />)}
          </Card>
        )}

        {/* Reschedule proposals from mentor */}
        {reschedulePendingFromMentor.length > 0 && (
          <Card className="p-6 border-amber-200 bg-amber-50/30">
            <div className="flex items-center gap-2 mb-1">
              <RotateCcw className="h-5 w-5 text-amber-600" />
              <h2 className="font-semibold text-foreground">Mentor Requested to Reschedule</h2>
              <span className="ml-auto text-xs font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{reschedulePendingFromMentor.length}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Your mentor proposed a new meeting time. Accept or cancel the booking.</p>
            {reschedulePendingFromMentor.map((b: any) => <RescheduleProposalCard key={b.id} booking={b} />)}
          </Card>
        )}

        <Card className="p-6">
          <h2 className="font-semibold text-foreground mb-4">Upcoming Sessions</h2>
          {bookingsLoading ? <Skeleton className="h-20" /> : upcoming.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm">No upcoming sessions</p>
              <a href="/mentors" className="text-primary text-sm hover:underline mt-1 block">Find a mentor to book a session</a>
            </div>
          ) : (
            upcoming.map((b: any) => <BookingRow key={b.id} booking={b} onReview={setReviewBooking} onChat={setChatBookingId} onMeeting={setMeetingBooking} />)
          )}
        </Card>

        {inProgress.length > 0 && (
          <Card className="p-6">
            <h2 className="font-semibold text-foreground mb-1">Awaiting Confirmation</h2>
            <p className="text-xs text-muted-foreground mb-4">Sessions completed — payout releases to mentor after 48h if no dispute is raised.</p>
            {inProgress.map((b: any) => <BookingRow key={b.id} booking={b} onReview={setReviewBooking} onChat={setChatBookingId} onMeeting={setMeetingBooking} />)}
          </Card>
        )}

        {past.length > 0 && (
          <Card className="p-6">
            <h2 className="font-semibold text-foreground mb-4">Past Sessions</h2>
            {past.map((b: any) => <BookingRow key={b.id} booking={b} onReview={setReviewBooking} onChat={setChatBookingId} onMeeting={setMeetingBooking} />)}
          </Card>
        )}
      </div>

      {reviewBooking && <ReviewDialog booking={reviewBooking} onClose={() => setReviewBooking(null)} />}
      {chatBookingId && <ChatDrawer bookingId={chatBookingId} onClose={() => setChatBookingId(null)} />}
      {meetingBooking && (
        <MeetingRoom
          bookingId={meetingBooking.id}
          open={!!meetingBooking}
          onClose={() => setMeetingBooking(null)}
        />
      )}
      {showDeleteDialog && <DeleteAccountDialog onClose={() => setShowDeleteDialog(false)} />}

      <div className="flex-1 max-w-5xl mx-auto px-4 pb-8 w-full">
        <Card className="p-6 border-destructive/20">
          <h2 className="font-semibold text-foreground mb-1">Account Settings</h2>
          <p className="text-xs text-muted-foreground mb-4">Manage your account and data.</p>
          <Button
            variant="outline"
            className="text-destructive border-destructive/30 hover:bg-destructive hover:text-white gap-2"
            onClick={() => setShowDeleteDialog(true)}
            data-testid="delete-account-btn"
          >
            <Trash2 className="h-4 w-4" /> Delete My Account
          </Button>
        </Card>
      </div>

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
