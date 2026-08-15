import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  useListMyGroupSessions,
  useListMyCourses,
  useCreateGroupSession,
  useCreateCourse,
  useStartGroupSession,
  useCompleteGroupSession,
  useUpdateCourse,
  useGetMe,
  useUpdateMe,
  getListMyBookingsQueryKey,
  getGetMentorDashboardStatsQueryKey,
  getGetMentorPayoutsQueryKey,
  getListMyGroupSessionsQueryKey,
  getListMyCoursesQueryKey,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar, DollarSign, CheckCircle, Star, Clock, Edit, MessageSquare,
  Wallet, ArrowDownToLine, Video, Copy, ExternalLink, ThumbsUp, ThumbsDown, RotateCcw, Trash2, BookOpen, PlusCircle, ListVideo,
} from "lucide-react";

import GroupMeetingRoom from "@/components/GroupMeetingRoom";

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
  awaiting_mentor_approval: "Awaiting Your Approval",
  confirmed: "Confirmed",
  counter_proposed: "Counter-Proposed",
  reschedule_proposed: "Reschedule Requested",
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
    if (!scheduledAt) { toast({ title: "Please select a date and time", variant: "destructive" }); return; }
    updateLink(
      { bookingId: booking.id, data: { scheduledAt: new Date(scheduledAt).toISOString() } },
      {
        onSuccess: () => {
          toast({ title: "Session scheduled!", description: "A meeting room has been created. Both parties can join from their dashboard." });
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
        <DialogHeader><DialogTitle>Schedule Session</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Platform will auto-generate a secure meeting room</p>
            <p>Once you confirm the time, a unique video room is created. Participants join only through their dashboard — no external links.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="scheduled-at">Session Date &amp; Time</Label>
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
            {isPending ? "Generating room..." : "Confirm & Generate Room"}
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
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to propose reschedule");
      }
      toast({ title: "Reschedule proposed!", description: "The mentee will be notified to accept or cancel." });
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
          <p className="text-xs text-muted-foreground">The mentee must accept the new time. If they cancel instead, the booking will be cancelled.</p>
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
  const [, setLocation] = useLocation();
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
          toast({ title: "Booking approved!", description: "Meeting room generated. Both parties can join from their dashboard." });
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
          <button type="button" onClick={() => setLocation(`/bookings/${booking.id}`)} className="font-medium text-sm text-foreground hover:text-primary hover:underline text-left">
            {booking.menteeName || "Mentee"}
          </button>
          <p className="text-xs text-muted-foreground">{booking.packageTitle || "Session"} · ${Number(booking.amount).toFixed(0)}</p>
          {booking.proposedAt ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Calendar className="h-3 w-3" />
              Proposed:{" "}
              {new Date(booking.proposedAt).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">No time proposed — you can suggest one</p>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-3 ml-12">
        <Button size="sm" className="h-8 text-xs gap-1.5 bg-green-600 hover:bg-green-700" onClick={handleApprove} disabled={approving} data-testid="approve-booking-btn">
          <ThumbsUp className="h-3 w-3" /> Approve
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50" onClick={() => setCounterOpen(true)} data-testid="counter-propose-btn">
          <RotateCcw className="h-3 w-3" /> Counter-Propose
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-red-300 text-red-600 hover:bg-red-50" onClick={() => setRejectOpen(true)} data-testid="reject-booking-btn">
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
    label: "Bank Transfer Details", placeholder: "",
    fields: [
      { key: "accountHolder", label: "Account Holder Name", placeholder: "Full legal name" },
      { key: "bankName", label: "Bank Name", placeholder: "e.g. Chase, Barclays" },
      { key: "accountNumber", label: "Account Number / IBAN", placeholder: "Account or IBAN number" },
      { key: "routingSwift", label: "Routing / SWIFT / Sort Code", placeholder: "Routing or SWIFT code" },
      { key: "country", label: "Bank Country", placeholder: "e.g. United States" },
    ],
  },
  payoneer: { label: "Payoneer Details", placeholder: "", fields: [{ key: "payoneerEmail", label: "Payoneer Email / Account ID", placeholder: "email@example.com or account ID" }] },
  wise: { label: "Wise Details", placeholder: "", fields: [{ key: "wiseEmail", label: "Wise Email / Account ID", placeholder: "email@example.com or account ID" }] },
  manual: { label: "Payment Instructions", placeholder: "", fields: [{ key: "notes", label: "Notes / Instructions", placeholder: "Describe how you'd like to receive payment" }] },
};

function PayoutRequestDialog({ balance, onClose }: { balance: number; onClose: () => void }) {
  const [amount, setAmount] = useState(balance.toFixed(2));
  const [method, setMethod] = useState("bank_transfer");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: requestPayout, isPending } = useRequestPayout();
  const methodConfig = ACCOUNT_DETAIL_FIELDS[method];

  function setField(key: string, value: string) { setFieldValues((prev) => ({ ...prev, [key]: value })); }

  function submit() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || amt > balance) { toast({ title: "Invalid amount", variant: "destructive" }); return; }
    const missing = methodConfig.fields.find((f) => !fieldValues[f.key]?.trim());
    if (missing) { toast({ title: `Please fill in: ${missing.label}`, variant: "destructive" }); return; }
    const accountDetails = methodConfig.fields.map((f) => `${f.label}: ${fieldValues[f.key]?.trim()}`).join("\n");
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
              <SelectTrigger data-testid="payout-method-select"><SelectValue /></SelectTrigger>
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
                <Input placeholder={f.placeholder} value={fieldValues[f.key] ?? ""} onChange={(e) => setField(f.key, e.target.value)} data-testid={`payout-field-${f.key}`} />
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={isPending} data-testid="submit-payout-btn">{isPending ? "Requesting..." : "Request Payout"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BookingRow({ booking, onAddLink, onChat, onMeeting, chatUnread = {} }: { booking: any; onAddLink: (b: any) => void; onChat?: (bookingId: number) => void; onMeeting?: (b: any) => void; chatUnread?: Record<number, number> }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: updateStatus, isPending } = useUpdateBookingStatus();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [acceptingReschedule, setAcceptingReschedule] = useState(false);
  const statusClass = STATUS_COLORS[booking.status] ?? "bg-gray-100 text-gray-800";
  const statusLabel = STATUS_LABELS[booking.status] ?? booking.status.replace(/_/g, " ");
  const initials = (booking.menteeName || "M").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const meetingStarted = booking.hasMeetingRoom && booking.scheduledAt && new Date(booking.scheduledAt) <= new Date();
  const canSchedule = ["paid", "scheduled", "paid_pending_session"].includes(booking.status) && !booking.hasMeetingRoom;
  const canReschedule = ["confirmed", "paid_pending_session", "paid", "scheduled"].includes(booking.status) && booking.hasMeetingRoom && !meetingStarted;
  const canComplete = ["confirmed", "paid_pending_session", "scheduled", "paid"].includes(booking.status) && booking.hasMeetingRoom;
  const canChat = !["pending_payment", "awaiting_mentor_approval", "cancelled", "refunded"].includes(booking.status);
  const isReschedulePendingFromMentee = booking.status === "reschedule_proposed" && booking.rescheduleProposedBy === "mentee";

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

  async function handleAcceptReschedule() {
    setAcceptingReschedule(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/accept-reschedule`, { method: "POST" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      toast({ title: "Reschedule accepted!", description: "New meeting room generated." });
      queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAcceptingReschedule(false);
    }
  }

  async function handleCancelReschedule() {
    if (!confirm("This will cancel the booking. Are you sure?")) return;
    try {
      const res = await fetch(`/api/bookings/${booking.id}/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: "Mentor cancelled after reschedule request" }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      toast({ title: "Booking cancelled" });
      queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  }

  return (
    <div className="py-4 border-b border-border last:border-0 space-y-3" data-testid="mentor-booking-row">
      <div className="flex items-start gap-4">
        <Avatar className="h-10 w-10 shrink-0 mt-0.5">
          <AvatarImage src={booking.menteeAvatarUrl ?? undefined} />
          <AvatarFallback className="bg-muted text-xs font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <button type="button" onClick={() => setLocation(`/bookings/${booking.id}`)} className="font-medium text-sm text-foreground hover:text-primary hover:underline text-left">
            {booking.menteeName || "Mentee"}
          </button>
          <p className="text-xs text-muted-foreground">{booking.packageTitle || "Session"}</p>
          {booking.scheduledAt && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Calendar className="h-3 w-3" />
              {new Date(booking.scheduledAt).toLocaleDateString()} at {new Date(booking.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
          {booking.hasDispute && (
            <div className="mt-1 text-xs rounded px-2 py-1 bg-orange-50 border border-orange-200">
              <p className="font-medium text-orange-700">
                {booking.disputeStatus === "resolved" ? "⚖️ Dispute resolved" : "⚠️ Dispute under review"}
              </p>
              {booking.disputeReason && <p className="text-orange-600 mt-0.5">Reason: {booking.disputeReason}</p>}
              {booking.disputeStatus === "resolved" && booking.disputeAdminDecision && (
                <p className="text-orange-600 mt-0.5">
                  Outcome: {booking.disputeResolutionType === "release_to_mentor" ? "Payment released to you" : "Refund issued to mentee"} — {booking.disputeAdminDecision}
                </p>
              )}
            </div>
          )}
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
              <Button size="sm" variant="outline" className="text-xs h-7 px-2 gap-1" onClick={() => setRescheduleOpen(true)} data-testid="reschedule-btn">
                <Calendar className="h-3 w-3" /> Propose New Time
              </Button>
            )}
            {canComplete && (
              <Button size="sm" variant="outline" className="text-xs h-7 px-2 gap-1 text-green-700 border-green-300 hover:bg-green-50" onClick={markSessionComplete} disabled={isPending} data-testid="mark-complete-btn">
                <CheckCircle className="h-3 w-3" /> Complete
              </Button>
            )}
            {canChat && onChat && (
              <Button size="sm" variant="ghost" className="text-xs h-7 px-2 gap-1 text-muted-foreground relative" onClick={() => onChat(booking.id)} data-testid="chat-btn">
                <span className="relative">
                  <MessageSquare className="h-3 w-3" />
                  {(chatUnread[booking.id] ?? 0) > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-destructive" />
                  )}
                </span>
                Chat
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Join meeting room button (platform-only, no external link or copy) */}
      {booking.hasMeetingRoom && !isReschedulePendingFromMentee && (
        <div className="ml-14 flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
          <Video className="h-4 w-4 text-primary shrink-0" />
          <button
            type="button"
            onClick={() => onMeeting?.(booking)}
            className="text-xs text-primary font-medium hover:underline flex-1 text-left"
            data-testid="join-meeting-btn"
          >
            Join Meeting Room
          </button>
          <span className="text-xs text-muted-foreground">Platform only</span>
        </div>
      )}

      {/* Reschedule proposal from mentee — mentor must accept or cancel */}
      {isReschedulePendingFromMentee && booking.rescheduleProposedAt && (
        <div className="ml-14 bg-amber-50 border border-amber-200 rounded-lg px-3 py-3">
          <p className="text-xs font-semibold text-amber-800 mb-1">Mentee requested to reschedule:</p>
          <p className="text-sm font-medium text-amber-900 mb-2">
            {new Date(booking.rescheduleProposedAt).toLocaleString([], { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700" onClick={handleAcceptReschedule} disabled={acceptingReschedule} data-testid="accept-reschedule-btn">
              <ThumbsUp className="h-3 w-3" /> Accept New Time
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-red-300 text-red-600 hover:bg-red-50" onClick={handleCancelReschedule} data-testid="cancel-reschedule-btn">
              <ThumbsDown className="h-3 w-3" /> Cancel Booking
            </Button>
          </div>
        </div>
      )}

      {rescheduleOpen && <ProposeRescheduleDialog booking={booking} onClose={() => setRescheduleOpen(false)} />}
    </div>
  );
}

function DeleteMentorProfileDialog({ onClose }: { onClose: () => void }) {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { mutate: deleteProfile, isPending } = useDeleteMyMentorProfile();

  function handleDelete() {
    deleteProfile(undefined, {
      onSuccess: () => {
        toast({ title: "Mentor profile deleted" });
        signOut();
        setLocation("/");
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Delete Mentor Profile</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground py-2">This will permanently delete your mentor profile, packages, and all associated data. This action cannot be undone.</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending} data-testid="confirm-delete-mentor-btn">
            {isPending ? "Deleting..." : "Delete Profile"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateMasterclassDialog({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [maxSeats, setMaxSeats] = useState("");
  const [duration, setDuration] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [level, setLevel] = useState("All Levels");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: createGroupSession, isPending } = useCreateGroupSession();

  function submit() {
    if (!title || !duration || !scheduledAt) {
      toast({ title: "Please fill all required fields", variant: "destructive" }); return;
    }
    createGroupSession(
      { data: {
        title,
        description,
        price: Number(price) || 0,
        maxSeats: Number(maxSeats) || 50,
        durationMinutes: Number(duration),
        scheduledAt: new Date(scheduledAt).toISOString(),
        level
      }},
      {
        onSuccess: () => {
          toast({ title: "Masterclass created!" });
          queryClient.invalidateQueries({ queryKey: getListMyGroupSessionsQueryKey() });
          onClose();
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
      }
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Masterclass</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Advanced Product Strategy" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What will they learn?" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Price ($)</Label>
              <Input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 50" />
            </div>
            <div className="space-y-2">
              <Label>Max Seats</Label>
              <Input type="number" min="1" value={maxSeats} onChange={e => setMaxSeats(e.target.value)} placeholder="e.g. 30" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Duration (mins) *</Label>
              <Input type="number" min="15" value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 60" />
            </div>
            <div className="space-y-2">
              <Label>Level</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Levels">All Levels</SelectItem>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Schedule Date & Time *</Label>
            <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={isPending}>{isPending ? "Creating..." : "Create Masterclass"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateCourseDialog({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [maxSeats, setMaxSeats] = useState("");
  const [level, setLevel] = useState("All Levels");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: createCourse, isPending } = useCreateCourse();

  function submit() {
    if (!title) {
      toast({ title: "Title is required", variant: "destructive" }); return;
    }
    createCourse(
      { data: {
        title,
        description,
        price: Number(price) || 0,
        maxSeats: Number(maxSeats) || 50,
        level
      }},
      {
        onSuccess: () => {
          toast({ title: "Course created!" });
          queryClient.invalidateQueries({ queryKey: getListMyCoursesQueryKey() });
          onClose();
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
      }
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New Course</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 4-Week UX Research Bootcamp" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Course details..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Total Price ($)</Label>
              <Input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 299" />
            </div>
            <div className="space-y-2">
              <Label>Max Seats</Label>
              <Input type="number" min="1" value={maxSeats} onChange={e => setMaxSeats(e.target.value)} placeholder="e.g. 20" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Level</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All Levels">All Levels</SelectItem>
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={isPending}>{isPending ? "Creating..." : "Create Course"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManageCourseSessionsDialog({ course, onClose }: { course: any; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: allSessions } = useListMyGroupSessions();
  const courseSessions = (allSessions ?? []).filter((s: any) => s.courseId === course.id);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState("60");
  const [description, setDescription] = useState("");

  const { mutate: createSession, isPending } = useCreateGroupSession();
  const { mutate: updateCourse } = useUpdateCourse();

  function handleAdd() {
    if (!title || !scheduledAt || !duration) {
      toast({ title: "Title, date/time and duration are required", variant: "destructive" });
      return;
    }
    createSession(
      {
        data: {
          courseId: course.id,
          title,
          description,
          scheduledAt: new Date(scheduledAt).toISOString(),
          durationMinutes: Number(duration),
          price: 0,
          maxSeats: course.maxSeats ?? 20,
        },
      },
      {
        onSuccess: () => {
          const newTotal = courseSessions.length + 1;
          updateCourse(
            { courseId: course.id, data: { totalSessions: newTotal } },
            {
              onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: getListMyGroupSessionsQueryKey() });
                queryClient.invalidateQueries({ queryKey: getListMyCoursesQueryKey() });
              },
            }
          );
          toast({ title: "Session added!" });
          setTitle("");
          setScheduledAt("");
          setDuration("60");
          setDescription("");
          setShowForm(false);
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  const STATUS_BADGE: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-700",
    live: "bg-green-100 text-green-700",
    completed: "bg-gray-100 text-gray-600",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="truncate">Sessions — {course.title}</DialogTitle>
        </DialogHeader>

        {/* Existing sessions */}
        <div className="space-y-2">
          {courseSessions.length === 0 && !showForm && (
            <p className="text-sm text-muted-foreground text-center py-4">No sessions yet. Add your first one below.</p>
          )}
          {courseSessions
            .slice()
            .sort((a: any, b: any) => new Date(a.scheduledAt ?? 0).getTime() - new Date(b.scheduledAt ?? 0).getTime())
            .map((s: any, idx: number) => (
              <div key={s.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{s.title}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                    {s.scheduledAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(s.scheduledAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    )}
                    {s.durationMinutes && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {s.durationMinutes} min
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize shrink-0 ${STATUS_BADGE[s.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {s.status}
                </span>
              </div>
            ))}
        </div>

        {/* Add session form */}
        {showForm ? (
          <div className="border border-border rounded-lg p-4 space-y-3 bg-muted/20">
            <p className="text-sm font-semibold text-foreground">New Session</p>
            <div className="space-y-1.5">
              <Label className="text-xs">Title *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Week 1 — Foundations" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="What will be covered?" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Date & Time *</Label>
                <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Duration (mins) *</Label>
                <Input type="number" min="15" value={duration} onChange={e => setDuration(e.target.value)} placeholder="60" />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={handleAdd} disabled={isPending} className="flex-1">
                {isPending ? "Adding…" : "Add Session"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="w-full gap-2" onClick={() => setShowForm(true)}>
            <PlusCircle className="h-4 w-4" /> Add Session
          </Button>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const IANA_TIMEZONES: string[] = (() => {
  try {
    const tzList = (Intl as any).supportedValuesOf("timeZone") as string[];
    // Intl.supportedValuesOf omits "UTC" in some runtimes; always include it at top, deduplicated.
    return ["UTC", ...tzList.filter((tz) => tz !== "UTC")];
  } catch {
    return ["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Tokyo", "Asia/Shanghai", "Asia/Kolkata", "Australia/Sydney"];
  }
})();

function TimezoneSelector() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useGetMe();
  const { mutate: updateMe, isPending } = useUpdateMe();
  const [timezone, setTimezone] = useState<string>("");

  useEffect(() => {
    if (me?.timezone && !timezone) setTimezone(me.timezone);
  }, [me?.timezone]);

  function handleSave() {
    if (!timezone) return;
    updateMe(
      { data: { timezone } },
      {
        onSuccess: () => {
          toast({ title: "Timezone saved", description: `Emails will now use ${timezone.replace(/_/g, " ")}.` });
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        },
        onError: (err: any) => toast({ title: "Error saving timezone", description: err.message, variant: "destructive" }),
      }
    );
  }

  return (
    <div className="mb-5 pb-5 border-b border-border space-y-2">
      <Label htmlFor="tz-select" className="text-sm font-medium">Timezone</Label>
      <p className="text-xs text-muted-foreground">Booking confirmation emails will show times in this timezone.</p>
      <div className="flex gap-2 items-center">
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger id="tz-select" className="flex-1" data-testid="timezone-select">
            <SelectValue placeholder="Select your timezone…" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {IANA_TIMEZONES.map((tz) => (
              <SelectItem key={tz} value={tz}>{tz.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isPending || !timezone || timezone === me?.timezone}
          data-testid="save-timezone-btn"
        >
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

function MentorDashboardContent() {
  const [activeTab, setActiveTab] = useState("1on1");
  const [linkBooking, setLinkBooking] = useState<any>(null);
  const [chatBookingId, setChatBookingId] = useState<number | null>(null);
  const [meetingBooking, setMeetingBooking] = useState<any>(null);
  const [activeGroupSessionId, setActiveGroupSessionId] = useState<number | null>(null);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [chatUnread, setChatUnread] = useState<Record<number, number>>({});
  const [createMasterclassOpen, setCreateMasterclassOpen] = useState(false);
  const [createCourseOpen, setCreateCourseOpen] = useState(false);
  const [managingCourse, setManagingCourse] = useState<any>(null);
  const { data: stats, isLoading: statsLoading } = useGetMentorDashboardStats();
  const { data: bookings, isLoading: bookingsLoading } = useListMyBookings({ role: "mentor" });
  const { data: payoutInfo, isLoading: payoutsLoading } = useGetMentorPayouts();

  const { data: myGroupSessionsData, isLoading: groupSessionsLoading } = useListMyGroupSessions();
  const { data: myCoursesData, isLoading: coursesLoading } = useListMyCourses();

  const myGroupSessions = myGroupSessionsData ?? [];
  const myCourses = myCoursesData ?? [];

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { mutate: startGroupSession, isPending: startingGroupSession } = useStartGroupSession();
  const { mutate: completeGroupSession, isPending: completingGroupSession } = useCompleteGroupSession();

  useEffect(() => {
    let cancelled = false;
    async function fetchUnread() {
      try {
        const res = await fetch("/api/chat/unread-counts");
        if (res.ok && !cancelled) setChatUnread(await res.json());
      } catch {}
    }
    fetchUnread();
    const id = setInterval(fetchUnread, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  function handleStartGroupSession(sessionId: number) {
    startGroupSession({ sessionId }, {
      onSuccess: () => {
        toast({ title: "Session started!" });
        queryClient.invalidateQueries({ queryKey: getListMyGroupSessionsQueryKey() });
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  }

  function handleCompleteGroupSession(sessionId: number) {
    completeGroupSession({ sessionId }, {
      onSuccess: () => {
        toast({ title: "Session marked complete" });
        queryClient.invalidateQueries({ queryKey: getListMyGroupSessionsQueryKey() });
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  }

  const awaitingApproval = (bookings ?? []).filter((b: any) => b.status === "awaiting_mentor_approval");
  const active = (bookings ?? []).filter((b: any) => ["confirmed", "paid_pending_session", "paid", "scheduled", "reschedule_proposed"].includes(b.status));
  const inProgress = (bookings ?? []).filter((b: any) => b.status === "session_completed");
  const history = (bookings ?? []).filter((b: any) => ["payout_released", "completed", "cancelled", "refunded", "under_review", "disputed"].includes(b.status));


  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="bg-primary/5 border-b border-border py-8 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mentor Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your sessions and earnings</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/mentor/profile/edit"><Edit className="h-4 w-4 mr-1.5" />Edit Profile</Link>
            </Button>
            <Button size="sm" onClick={() => setPayoutOpen(true)} data-testid="request-payout-btn">
              <Wallet className="h-4 w-4 mr-1.5" />Request Payout
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : (
            [
              { icon: <Calendar className="h-5 w-5 text-primary" />, label: "Total Sessions", value: (payoutInfo?.totalSessions ?? 0) },
              { icon: <CheckCircle className="h-5 w-5 text-green-600" />, label: "Completed", value: payoutInfo?.completedSessions ?? 0 },
              { icon: <DollarSign className="h-5 w-5 text-amber-500" />, label: "Total Earned", value: `$${(payoutInfo?.totalEarned ?? 0).toFixed(0)}` },
              { icon: <ArrowDownToLine className="h-5 w-5 text-blue-600" />, label: "Withdrawable", value: `$${(payoutInfo?.withdrawableBalance ?? 0).toFixed(0)}` },
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-between items-center mb-6">
            <TabsList className="grid w-[400px] grid-cols-2">
              <TabsTrigger value="1on1" data-testid="tab-1on1">1-on-1 Bookings</TabsTrigger>
              <TabsTrigger value="group" data-testid="tab-group">Group Classes</TabsTrigger>
            </TabsList>
            
            {activeTab === "group" && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCreateMasterclassOpen(true)} data-testid="create-masterclass-btn">
                  <PlusCircle className="h-4 w-4" /> New Masterclass
                </Button>
                <Button size="sm" className="gap-1.5" onClick={() => setCreateCourseOpen(true)} data-testid="create-course-btn">
                  <PlusCircle className="h-4 w-4" /> New Course
                </Button>
              </div>
            )}
          </div>

          <TabsContent value="1on1" className="space-y-8 mt-0 focus-visible:outline-none focus-visible:ring-0">
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
          </TabsContent>
          
          <TabsContent value="group" className="space-y-8 mt-0 focus-visible:outline-none focus-visible:ring-0">
            <Card className="p-6">
              <h2 className="font-semibold text-foreground mb-4">My Group Sessions</h2>
              {groupSessionsLoading ? <Skeleton className="h-20" /> : myGroupSessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Video className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                  No group sessions created
                </div>
              ) : (
                <div className="space-y-0">
                  {myGroupSessions.map((session: any) => (
                    <div key={session.id} className="py-4 border-b border-border last:border-0 flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <Link href={`/learn/sessions/${session.id}`} className="font-medium text-sm text-foreground hover:text-primary hover:underline block truncate">
                          {session.title}
                        </Link>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="capitalize text-primary/80 font-medium px-2 py-0.5 bg-primary/10 rounded">{session.status}</span>
                          <span>{session.enrolledCount} / {session.maxSeats} enrolled</span>
                          {session.scheduledAt && (
                            <span>{new Date(session.scheduledAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 items-end shrink-0">
                        {session.status === "scheduled" && (
                          <Button size="sm" onClick={() => handleStartGroupSession(session.id)} disabled={startingGroupSession} className="text-xs h-7 gap-1">
                            <Video className="h-3 w-3" /> Start Live
                          </Button>
                        )}
                        {session.status === "live" && (
                          <>
                            <Button size="sm" variant="destructive" onClick={() => setActiveGroupSessionId(session.id)} className="text-xs h-7 gap-1">
                              <Video className="h-3 w-3" /> Join Room
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleCompleteGroupSession(session.id)} disabled={completingGroupSession} className="text-xs h-7 gap-1">
                              <CheckCircle className="h-3 w-3" /> Complete
                            </Button>
                          </>
                        )}
                        {session.status === "completed" && (
                          <span className="text-xs text-green-600 font-medium">Completed</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="font-semibold text-foreground mb-4">My Courses</h2>
              {coursesLoading ? <Skeleton className="h-20" /> : myCourses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                  No courses created
                </div>
              ) : (
                <div className="space-y-0">
                  {myCourses.map((course: any) => (
                    <div key={course.id} className="py-4 border-b border-border last:border-0 flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <Link href={`/learn/courses/${course.id}`} className="font-medium text-sm text-foreground hover:text-primary hover:underline block truncate">
                          {course.title}
                        </Link>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="capitalize font-medium">{course.status}</span>
                          <span>{course.enrolledCount} / {course.maxSeats} enrolled</span>
                          <span>{course.totalSessions} Sessions</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 items-end shrink-0">
                        <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => setManagingCourse(course)}>
                          <ListVideo className="h-3 w-3" /> Sessions
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {linkBooking && <ScheduleSessionDialog booking={linkBooking} onClose={() => setLinkBooking(null)} />}
      {chatBookingId && <ChatDrawer bookingId={chatBookingId} onClose={() => setChatBookingId(null)} />}
      {meetingBooking && (
        <MeetingRoom
          bookingId={meetingBooking.id}
          open={!!meetingBooking}
          onClose={() => setMeetingBooking(null)}
        />
      )}
      {payoutOpen && <PayoutRequestDialog balance={payoutInfo?.withdrawableBalance ?? 0} onClose={() => setPayoutOpen(false)} />}
      {showDeleteDialog && <DeleteMentorProfileDialog onClose={() => setShowDeleteDialog(false)} />}
      {activeGroupSessionId && (
        <GroupMeetingRoom
          sessionId={activeGroupSessionId}
          meetingLink=""
          open={!!activeGroupSessionId}
          onClose={() => setActiveGroupSessionId(null)}
        />
      )}
      {createMasterclassOpen && <CreateMasterclassDialog onClose={() => setCreateMasterclassOpen(false)} />}
      {createCourseOpen && <CreateCourseDialog onClose={() => setCreateCourseOpen(false)} />}
      {managingCourse && (
        <ManageCourseSessionsDialog
          course={managingCourse}
          onClose={() => setManagingCourse(null)}
        />
      )}

      <div className="flex-1 max-w-5xl mx-auto px-4 pb-8 w-full">
        <Card className="p-6 border-destructive/20">
          <h2 className="font-semibold text-foreground mb-1">Mentor Profile Settings</h2>
          <p className="text-xs text-muted-foreground mb-4">Manage your mentor profile and data.</p>
          <TimezoneSelector />
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
