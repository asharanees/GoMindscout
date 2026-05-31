import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProtectedRoute from "@/components/ProtectedRoute";
import ChatDrawer from "@/components/ChatDrawer";
import MeetingRoom from "@/components/MeetingRoom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useGetMentorDashboardStats,
  useListMyBookings,
  useUpdateMeetingLink,
  useUpdateBookingStatus,
  useGetMentorPayouts,
  useRequestPayout,
  useApproveBooking,
  useRejectBooking,
  useCounterProposeBooking,
  useDeleteMyMentorProfile,
  getListMyBookingsQueryKey,
  getGetMentorDashboardStatsQueryKey,
  getGetMentorPayoutsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar, DollarSign, CheckCircle, Star, Clock, Edit, MessageSquare,
  Wallet, ArrowDownToLine, Video, Copy, ExternalLink, ThumbsUp, ThumbsDown, RotateCcw, Trash2,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "bg-yellow-100 text-yellow-800",
  awaiting_mentor_approval: "bg-orange-100 text-orange-800",
  confirmed: "bg-blue-100 text-blue-800",
  counter_proposed: "bg-purple-100 text-purple-800",
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
  awaiting_mentor_approval: "Awaiting Your Approval",
  confirmed: "Confirmed",
  counter_proposed: "Counter-Proposed",
  paid_pending_session: "Paid - Awaiting Session",
  session_completed: "Session Done",
  under_review: "Under Review",
  disputed: "Disputed",
  payout_released: "Payout Released",
  cancelled: "Cancelled",
  refunded: "Refunded",
  paid: "Paid",
  scheduled: "Scheduled",
  completed: "Completed",
};

const PAYOUT_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  paid_out: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

function ScheduleSessionDialog({ booking, onClose }: { booking: any; onClose: () => void }) {
  const [scheduledAt, setScheduledAt] = useState(
    booking.scheduledAt ? new Date(booking.scheduledAt).toISOString().slice(0, 16) : ""
  );
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: updateLink, isPending } = useUpdateMeetingLink();

  function submit() {
    if (!scheduledAt) {
      toast({ title: "Please select a date and time", variant: "destructive" }); return;
    }
    updateLink(
      { bookingId: booking.id, data: { scheduledAt: new Date(scheduledAt).toISOString() } },
      {
        onSuccess: () => {
          toast({
            title: "Session scheduled!",
            description: "A meeting room has been created and both you and your mentee have been notified.",
          });
          queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMentorDashboardStatsQueryKey() });
          onClose();
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Schedule Session</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Platform will auto-generate a meeting room</p>
            <p>Once you confirm the time, a unique video meeting link is created and shared in your dashboard.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="scheduled-at">Session Date & Time</Label>
            <Input
              id="scheduled-at"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              data-testid="scheduled-at-input"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Mentee: <strong>{booking.menteeName || "Your mentee"}</strong> &mdash; {booking.packageTitle || "Session"}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={isPending || !scheduledAt} data-testid="schedule-session-btn">
            {isPending ? "Generating room..." : "Confirm & Generate Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CounterProposeDialog({ booking, onClose }: { booking: any; onClose: () => void }) {
  const [proposedAt, setProposedAt] = useState("");
  const [note, setNote] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: counterPropose, isPending } = useCounterProposeBooking();

  function submit() {
    if (!proposedAt) { toast({ title: "Please select a time", variant: "destructive" }); return; }
    counterPropose(
      { bookingId: booking.id, data: { proposedAt: new Date(proposedAt).toISOString(), note: note || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Counter-proposal sent", description: "The mentee will be notified to accept or decline." });
          queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });
          onClose();
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Propose Alternative Time</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          {booking.proposedAt && (
            <div className="bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground">
              Mentee proposed:{" "}
              <strong className="text-foreground">
                {new Date(booking.proposedAt).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </strong>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="counter-time">Your Proposed Time</Label>
            <Input
              id="counter-time"
              type="datetime-local"
              value={proposedAt}
              onChange={(e) => setProposedAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              data-testid="counter-propose-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="counter-note">Note to mentee (optional)</Label>
            <Textarea
              id="counter-note"
              placeholder="Let them know why you'd prefer a different time..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              data-testid="counter-propose-note"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={isPending || !proposedAt} data-testid="send-counter-propose-btn">
            {isPending ? "Sending..." : "Send Counter-Proposal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({ booking, onClose }: { booking: any; onClose: () => void }) {
  const [note, setNote] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: rejectBooking, isPending } = useRejectBooking();

  function submit() {
    rejectBooking(
      { bookingId: booking.id, data: { note: note || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Booking rejected", description: "The mentee has been notified." });
          queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMentorDashboardStatsQueryKey() });
          onClose();
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Reject Booking</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">The booking will be cancelled and the mentee notified. Refund will be issued per policy.</p>
          <div className="space-y-2">
            <Label htmlFor="reject-note">Reason (optional)</Label>
            <Textarea
              id="reject-note"
              placeholder="Let the mentee know why..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              data-testid="reject-note-input"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={isPending} data-testid="confirm-reject-btn">
            {isPending ? "Rejecting..." : "Reject Booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApprovalRow({ booking }: { booking: any }) {
  const [counterOpen, setCounterOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: approveBooking, isPending: approving } = useApproveBooking();
  const initials = (booking.menteeName || "M").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  function handleApprove() {
    approveBooking(
      { bookingId: booking.id },
      {
        onSuccess: () => {
          toast({ title: "Booking approved!", description: "Meeting room generated." });
          queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMentorDashboardStatsQueryKey() });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  return (
    <div className="py-4 border-b border-border last:border-0" data-testid="approval-row">
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9 shrink-0 mt-0.5">
          <AvatarImage src={booking.menteeAvatarUrl ?? undefined} />
          <AvatarFallback className="bg-muted text-xs font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground">{booking.menteeName || "Mentee"}</p>
          <p className="text-xs text-muted-foreground">{booking.packageTitle || "Session"} · ${Number(booking.amount).toFixed(0)}</p>
          {booking.proposedAt ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Calendar className="h-3 w-3" />
              Proposed:{" "}
              {new Date(booking.proposedAt).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">No time proposed - you can suggest one</p>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-3 ml-12">
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 bg-green-600 hover:bg-green-700"
          onClick={handleApprove}
          disabled={approving}
          data-testid="approve-booking-btn"
        >
          <ThumbsUp className="h-3 w-3" /> Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50"
          onClick={() => setCounterOpen(true)}
          data-testid="counter-propose-btn"
        >
          <RotateCcw className="h-3 w-3" /> Counter-Propose
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1.5 border-red-300 text-red-600 hover:bg-red-50"
          onClick={() => setRejectOpen(true)}
          data-testid="reject-booking-btn"
        >
          <ThumbsDown className="h-3 w-3" /> Reject
        </Button>
      </div>
      {counterOpen && <CounterProposeDialog booking={booking} onClose={() => setCounterOpen(false)} />}
      {rejectOpen && <RejectDialog booking={booking} onClose={() => setRejectOpen(false)} />}
    </div>
  );
}

const ACCOUNT_DETAIL_FIELDS: Record<string, { label: string; placeholder: string; fields: { key: string; label: string; placeholder: string }[] }> = {
  bank_transfer: {
    label: "Bank Transfer Details",
    placeholder: "",
    fields: [
      { key: "accountHolder", label: "Account Holder Name", placeholder: "Full legal name" },
      { key: "bankName", label: "Bank Name", placeholder: "e.g. Chase, Barclays" },
      { key: "accountNumber", label: "Account Number / IBAN", placeholder: "Account or IBAN number" },
      { key: "routingSwift", label: "Routing / SWIFT / Sort Code", placeholder: "Routing or SWIFT code" },
      { key: "country", label: "Bank Country", placeholder: "e.g. United States" },
    ],
  },
  payoneer: {
    label: "Payoneer Details",
    placeholder: "",
    fields: [
      { key: "payoneerEmail", label: "Payoneer Email / Account ID", placeholder: "email@example.com or account ID" },
    ],
  },
  wise: {
    label: "Wise Details",
    placeholder: "",
    fields: [
      { key: "wiseEmail", label: "Wise Email / Account ID", placeholder: "email@example.com or account ID" },
    ],
  },
  manual: {
    label: "Payment Instructions",
    placeholder: "",
    fields: [
      { key: "notes", label: "Notes / Instructions", placeholder: "Describe how you'd like to receive payment" },
    ],
  },
};

function PayoutRequestDialog({ balance, onClose }: { balance: number; onClose: () => void }) {
  const [amount, setAmount] = useState(balance.toFixed(2));
  const [method, setMethod] = useState("bank_transfer");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: requestPayout, isPending } = useRequestPayout();

  const methodConfig = ACCOUNT_DETAIL_FIELDS[method];

  function setField(key: string, value: string) {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  }

  function submit() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || amt > balance) {
      toast({ title: "Invalid amount", variant: "destructive" }); return;
    }
    const missing = methodConfig.fields.find((f) => !fieldValues[f.key]?.trim());
    if (missing) {
      toast({ title: `Please fill in: ${missing.label}`, variant: "destructive" }); return;
    }
    const accountDetails = methodConfig.fields
      .map((f) => `${f.label}: ${fieldValues[f.key]?.trim()}`)
      .join("\n");

    requestPayout(
      { data: { amount: amt, method: method as any, accountDetails } },
      {
        onSuccess: () => {
          toast({ title: "Payout requested!", description: "Admin will review within 2 business days." });
          queryClient.invalidateQueries({ queryKey: getGetMentorPayoutsQueryKey() });
          onClose();
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Request Payout</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">Available balance: <strong className="text-foreground">${balance.toFixed(2)}</strong></p>
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input type="number" min="1" max={balance} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="payout-amount-input" />
          </div>
          <div className="space-y-2">
            <Label>Payout Method</Label>
            <Select value={method} onValueChange={(v) => { setMethod(v); setFieldValues({}); }}>
              <SelectTrigger data-testid="payout-method-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="payoneer">Payoneer</SelectItem>
                <SelectItem value="wise">Wise</SelectItem>
                <SelectItem value="manual">Manual / Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="border-t pt-3 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{methodConfig.label}</p>
            {methodConfig.fields.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label className="text-sm">{f.label}</Label>
                <Input
                  placeholder={f.placeholder}
                  value={fieldValues[f.key] ?? ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  data-testid={`payout-field-${f.key}`}
                />
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={isPending} data-testid="submit-payout-btn">
            {isPending ? "Requesting..." : "Request Payout"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BookingRow({ booking, onAddLink, onChat, onMeeting }: { booking: any; onAddLink: (b: any) => void; onChat?: (bookingId: number) => void; onMeeting?: (b: any) => void }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: updateStatus, isPending } = useUpdateBookingStatus();
  const statusClass = STATUS_COLORS[booking.status] ?? "bg-gray-100 text-gray-800";
  const statusLabel = STATUS_LABELS[booking.status] ?? booking.status.replace(/_/g, " ");
  const initials = (booking.menteeName || "M").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  function markSessionComplete() {
    updateStatus(
      { bookingId: booking.id, data: { status: "session_completed" } },
      {
        onSuccess: () => {
          toast({ title: "Session marked complete", description: "Payout will be released automatically after 48 hours if no dispute is raised." });
          queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMentorDashboardStatsQueryKey() });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  const canSchedule = ["paid", "scheduled", "paid_pending_session"].includes(booking.status) && !booking.meetingLink;
  const canReschedule = ["paid", "scheduled", "paid_pending_session"].includes(booking.status) && !!booking.meetingLink;
  const canComplete = ["confirmed", "paid_pending_session", "scheduled", "paid"].includes(booking.status) && !!booking.meetingLink;
  const canChat = !["pending_payment", "awaiting_mentor_approval", "cancelled", "refunded"].includes(booking.status);

  return (
    <div className="py-4 border-b border-border last:border-0 space-y-3" data-testid="mentor-booking-row">
      <div className="flex items-start gap-4">
        <Avatar className="h-10 w-10 shrink-0 mt-0.5">
          <AvatarImage src={booking.menteeAvatarUrl ?? undefined} />
          <AvatarFallback className="bg-muted text-xs font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground">{booking.menteeName || "Mentee"}</p>
          <p className="text-xs text-muted-foreground">{booking.packageTitle || "Session"}</p>
          {booking.scheduledAt && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Calendar className="h-3 w-3" />
              {new Date(booking.scheduledAt).toLocaleDateString()} at {new Date(booking.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
          {booking.hasDispute && <p className="text-xs text-orange-600 mt-0.5 font-medium">Dispute raised - under review</p>}
          {booking.mentorEarning && ["session_completed", "payout_released"].includes(booking.status) && (
            <p className="text-xs text-green-700 mt-0.5">Earning: ${Number(booking.mentorEarning).toFixed(2)}</p>
          )}
        </div>
        <div className="text-right shrink-0 space-y-1.5">
          <div>
            <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${statusClass}`}>{statusLabel}</span>
            <p className="text-sm font-semibold text-foreground mt-0.5">${Number(booking.amount).toFixed(0)}</p>
          </div>
          <div className="flex flex-col gap-1 items-end">
            {canSchedule && (
              <Button size="sm" className="text-xs h-7 px-2 gap-1" onClick={() => onAddLink(booking)} data-testid="schedule-session-btn">
                <Video className="h-3 w-3" /> Schedule Session
              </Button>
            )}
            {canReschedule && (
              <Button size="sm" variant="outline" className="text-xs h-7 px-2 gap-1" onClick={() => onAddLink(booking)} data-testid="reschedule-btn">
                <Calendar className="h-3 w-3" /> Reschedule
              </Button>
            )}
            {canComplete && (
              <Button size="sm" variant="outline" className="text-xs h-7 px-2 gap-1 text-green-700 border-green-300 hover:bg-green-50" onClick={markSessionComplete} disabled={isPending} data-testid="mark-complete-btn">
                <CheckCircle className="h-3 w-3" /> Complete
              </Button>
            )}
            {canChat && onChat && (
              <Button size="sm" variant="ghost" className="text-xs h-7 px-2 gap-1 text-muted-foreground" onClick={() => onChat(booking.id)} data-testid="chat-btn">
                <MessageSquare className="h-3 w-3" /> Chat
              </Button>
            )}
          </div>
        </div>
      </div>
      {booking.meetingLink && (
        <div className="ml-14 flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
          <Video className="h-4 w-4 text-primary shrink-0" />
          <button
            type="button"
            onClick={() => onMeeting?.(booking)}
            className="text-xs text-primary font-medium hover:underline truncate flex-1 text-left"
            data-testid="join-meeting-btn"
          >
            Join Meeting Room
          </button>
          <button
            type="button"
            onClick={() => { navigator.clipboard.writeText(booking.meetingLink); }}
            className="text-muted-foreground hover:text-foreground"
            data-testid="copy-meeting-link-btn"
            title="Copy link"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <a href={booking.meetingLink} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" title="Open in new tab">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}

function DeleteMentorProfileDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { mutate: deleteProfile, isPending } = useDeleteMyMentorProfile();

  function handleDelete() {
    deleteProfile(undefined, {
      onSuccess: () => {
        toast({ title: "Profile deleted", description: "Your mentor profile has been removed. You can create a new one anytime." });
        setLocation("/dashboard");
        onClose();
      },
      onError: (err: any) => toast({ title: "Error", description: err.message || "Could not delete mentor profile.", variant: "destructive" }),
    });
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-destructive">Delete Mentor Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">This will permanently delete your mentor profile, all packages, availability, reviews, and related booking data. Your account will remain as a mentee. This action cannot be undone.</p>
          <p className="text-sm font-medium text-foreground">Are you sure you want to proceed?</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="delete-mentor-cancel">Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending} data-testid="delete-mentor-confirm">
            {isPending ? "Deleting..." : "Delete Profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MentorDashboardContent() {
  const [linkBooking, setLinkBooking] = useState<any>(null);
  const [chatBookingId, setChatBookingId] = useState<number | null>(null);
  const [meetingBooking, setMeetingBooking] = useState<any>(null);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { data: stats, isLoading: statsLoading } = useGetMentorDashboardStats();
  const { data: bookings, isLoading: bookingsLoading } = useListMyBookings({ role: "mentor" });
  const { data: payoutInfo, isLoading: payoutsLoading } = useGetMentorPayouts();

  const awaitingApproval = (bookings ?? []).filter((b: any) => b.status === "awaiting_mentor_approval");
  const active = (bookings ?? []).filter((b: any) => ["confirmed", "paid_pending_session", "paid", "scheduled"].includes(b.status));
  const inProgress = (bookings ?? []).filter((b: any) => ["session_completed", "under_review", "disputed"].includes(b.status));
  const history = (bookings ?? []).filter((b: any) => ["payout_released", "completed", "cancelled", "refunded", "counter_proposed"].includes(b.status));

  const statusBadge = stats?.profileStatus === "approved"
    ? <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge>
    : stats?.profileStatus === "pending"
    ? <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending Review</Badge>
    : stats?.profileStatus === "rejected"
    ? <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>
    : stats?.profileStatus === "suspended"
    ? <Badge className="bg-gray-100 text-gray-800 border-gray-200">Suspended</Badge>
    : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="bg-primary/5 border-b border-border py-8 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-foreground">Mentor Dashboard</h1>
              {statusBadge}
            </div>
            <p className="text-muted-foreground text-sm">Manage your sessions and track earnings</p>
          </div>
          <Link href="/mentor/profile/edit">
            <Button variant="outline" size="sm" className="gap-1.5" data-testid="edit-profile-btn">
              <Edit className="h-3.5 w-3.5" /> Edit Profile
            </Button>
          </Link>
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
              { icon: <DollarSign className="h-5 w-5 text-amber-500" />, label: "Total Earnings", value: `$${(stats?.totalEarnings ?? 0).toFixed(0)}` },
              { icon: <Star className="h-5 w-5 text-amber-400" />, label: "Avg Rating", value: stats?.averageRating != null ? `${stats.averageRating}/5` : "-" },
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

        {/* Earnings & Payout */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">Earnings & Payouts</h2>
            </div>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setPayoutOpen(true)}
              disabled={!payoutInfo || payoutInfo.withdrawableBalance <= 0}
              data-testid="request-payout-btn"
            >
              <ArrowDownToLine className="h-3.5 w-3.5" /> Request Payout
            </Button>
          </div>

          {payoutsLoading ? <Skeleton className="h-16" /> : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-xs text-green-700 font-medium">Available to withdraw</p>
                  <p className="text-2xl font-bold text-green-800">${(payoutInfo?.withdrawableBalance ?? 0).toFixed(2)}</p>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-xs text-muted-foreground font-medium">Pending payout</p>
                  <p className="text-2xl font-bold text-foreground">${(payoutInfo?.pendingBalance ?? 0).toFixed(2)}</p>
                </div>
              </div>

              {payoutInfo?.requests && payoutInfo.requests.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2">Payout History</h3>
                  <div className="space-y-2">
                    {payoutInfo.requests.slice(0, 5).map((req: any) => (
                      <div key={req.id} className="flex items-center justify-between text-sm border rounded-lg px-3 py-2">
                        <div>
                          <span className="font-medium">${Number(req.amount).toFixed(2)}</span>
                          <span className="text-muted-foreground ml-2 text-xs capitalize">{req.method.replace("_", " ")}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {req.adminNote && <span className="text-xs text-muted-foreground">{req.adminNote}</span>}
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PAYOUT_STATUS_COLORS[req.status] ?? "bg-gray-100 text-gray-800"}`}>
                            {req.status.replace("_", " ")}
                          </span>
                          <span className="text-xs text-muted-foreground">{new Date(req.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Awaiting Approval */}
        {(bookingsLoading || awaitingApproval.length > 0) && (
          <Card className="p-6 border-orange-200 bg-orange-50/30">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-5 w-5 text-orange-600" />
              <h2 className="font-semibold text-foreground">Awaiting Your Approval</h2>
              {awaitingApproval.length > 0 && (
                <span className="ml-auto text-xs font-semibold bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">
                  {awaitingApproval.length}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-4">Review and approve, counter-propose, or reject new booking requests.</p>
            {bookingsLoading ? <Skeleton className="h-20" /> : (
              awaitingApproval.map((b: any) => <ApprovalRow key={b.id} booking={b} />)
            )}
          </Card>
        )}

        {/* Active sessions */}
        <Card className="p-6">
          <h2 className="font-semibold text-foreground mb-4">Active Sessions</h2>
          {bookingsLoading ? <Skeleton className="h-20" /> : active.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Clock className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              No active sessions right now
            </div>
          ) : (
            active.map((b: any) => <BookingRow key={b.id} booking={b} onAddLink={setLinkBooking} onChat={setChatBookingId} onMeeting={setMeetingBooking} />)
          )}
        </Card>

        {/* Awaiting 48h window */}
        {inProgress.length > 0 && (
          <Card className="p-6">
            <h2 className="font-semibold text-foreground mb-1">Awaiting Payout Release</h2>
            <p className="text-xs text-muted-foreground mb-4">Payout auto-releases 48h after session completion if no dispute is raised.</p>
            {inProgress.map((b: any) => <BookingRow key={b.id} booking={b} onAddLink={setLinkBooking} onChat={setChatBookingId} onMeeting={setMeetingBooking} />)}
          </Card>
        )}

        {/* History */}
        {history.length > 0 && (
          <Card className="p-6">
            <h2 className="font-semibold text-foreground mb-4">Session History</h2>
            {history.map((b: any) => <BookingRow key={b.id} booking={b} onAddLink={setLinkBooking} onChat={setChatBookingId} onMeeting={setMeetingBooking} />)}
          </Card>
        )}
      </div>

      {linkBooking && <ScheduleSessionDialog booking={linkBooking} onClose={() => setLinkBooking(null)} />}
      {chatBookingId && <ChatDrawer bookingId={chatBookingId} onClose={() => setChatBookingId(null)} />}
      {meetingBooking && (
        <MeetingRoom
          bookingId={meetingBooking.id}
          meetingLink={meetingBooking.meetingLink}
          open={!!meetingBooking}
          onClose={() => setMeetingBooking(null)}
        />
      )}
      {payoutOpen && <PayoutRequestDialog balance={payoutInfo?.withdrawableBalance ?? 0} onClose={() => setPayoutOpen(false)} />}
      {showDeleteDialog && <DeleteMentorProfileDialog onClose={() => setShowDeleteDialog(false)} />}

      <div className="flex-1 max-w-5xl mx-auto px-4 pb-8 w-full">
        <Card className="p-6 border-destructive/20">
          <h2 className="font-semibold text-foreground mb-1">Mentor Profile Settings</h2>
          <p className="text-xs text-muted-foreground mb-4">Manage your mentor profile and data.</p>
          <Button
            variant="outline"
            className="text-destructive border-destructive/30 hover:bg-destructive hover:text-white gap-2"
            onClick={() => setShowDeleteDialog(true)}
            data-testid="delete-mentor-profile-btn"
          >
            <Trash2 className="h-4 w-4" /> Delete My Mentor Profile
          </Button>
        </Card>
      </div>

      <Footer />
    </div>
  );
}

export default function MentorDashboardPage() {
  return (
    <ProtectedRoute>
      <MentorDashboardContent />
    </ProtectedRoute>
  );
}
