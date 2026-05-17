import { useState } from "react";
import { Link, useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useGetMentorDashboardStats,
  useListMyBookings,
  useUpdateMeetingLink,
  useUpdateBookingStatus,
  useGetMentorPayouts,
  useRequestPayout,
  getListMyBookingsQueryKey,
  getGetMentorDashboardStatsQueryKey,
  getGetMentorPayoutsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Calendar, DollarSign, CheckCircle, Star, Clock, Link2, Edit, Zap, ExternalLink, Copy, MessageSquare, Wallet, ArrowDownToLine } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "bg-yellow-100 text-yellow-800",
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
  paid_pending_session: "Paid — Awaiting Session",
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

function MeetingLinkDialog({ booking, onClose }: { booking: any; onClose: () => void }) {
  const [meetingLink, setMeetingLink] = useState(booking.meetingLink || "");
  const [scheduledAt, setScheduledAt] = useState(
    booking.scheduledAt ? new Date(booking.scheduledAt).toISOString().slice(0, 16) : ""
  );
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: updateLink, isPending } = useUpdateMeetingLink();

  function generateJitsiRoom() {
    const roomName = `mentorbridge-${booking.id}-${Math.random().toString(36).slice(2, 7)}`;
    setMeetingLink(`https://meet.jit.si/${roomName}`);
    toast({ title: "Jitsi room generated" });
  }

  function openAndFill(url: string) {
    window.open(url, "_blank", "noopener");
    toast({ title: "Opened in new tab", description: "Copy the meeting link and paste it below." });
  }

  function submit() {
    updateLink(
      { bookingId: booking.id, data: { meetingLink, scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined } },
      {
        onSuccess: () => {
          toast({ title: "Meeting link saved!" });
          queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });
          onClose();
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Set Up Meeting Link</DialogTitle></DialogHeader>
        <div className="space-y-5 py-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Quick generate</p>
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={generateJitsiRoom} className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-center" data-testid="generate-jitsi-btn">
                <Zap className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">Jitsi</span>
                <span className="text-[10px] text-muted-foreground">Instant, free</span>
              </button>
              <button type="button" onClick={() => openAndFill("https://meet.google.com/new")} className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-center" data-testid="open-google-meet-btn">
                <ExternalLink className="h-5 w-5 text-blue-500" />
                <span className="text-xs font-medium">Google Meet</span>
                <span className="text-[10px] text-muted-foreground">Opens new tab</span>
              </button>
              <button type="button" onClick={() => openAndFill("https://zoom.us/start/videomeeting")} className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-center" data-testid="open-zoom-btn">
                <ExternalLink className="h-5 w-5 text-blue-600" />
                <span className="text-xs font-medium">Zoom</span>
                <span className="text-[10px] text-muted-foreground">Opens new tab</span>
              </button>
            </div>
          </div>
          <div>
            <Label htmlFor="meeting-link" className="mb-2 block">Meeting URL</Label>
            <div className="flex gap-2">
              <Input id="meeting-link" placeholder="https://meet.jit.si/..." value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} data-testid="meeting-link-input" className="flex-1" />
              {meetingLink && (
                <Button type="button" variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(meetingLink); toast({ title: "Copied" }); }} data-testid="copy-link-btn">
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="scheduled-at" className="mb-2 block">Schedule Time (optional)</Label>
            <Input id="scheduled-at" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} data-testid="scheduled-at-input" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={isPending || !meetingLink} className="bg-primary hover:bg-primary/90" data-testid="save-meeting-link-btn">
            {isPending ? "Saving..." : "Save Link"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayoutRequestDialog({ balance, onClose }: { balance: number; onClose: () => void }) {
  const [amount, setAmount] = useState(balance.toFixed(2));
  const [method, setMethod] = useState("bank_transfer");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: requestPayout, isPending } = useRequestPayout();

  function submit() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || amt > balance) {
      toast({ title: "Invalid amount", variant: "destructive" }); return;
    }
    requestPayout(
      { data: { amount: amt, method: method as any } },
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
      <DialogContent>
        <DialogHeader><DialogTitle>Request Payout</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">Available balance: <strong className="text-foreground">${balance.toFixed(2)}</strong></p>
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input type="number" min="1" max={balance} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="payout-amount-input" />
          </div>
          <div className="space-y-2">
            <Label>Payout Method</Label>
            <Select value={method} onValueChange={setMethod}>
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

function BookingRow({ booking, onAddLink }: { booking: any; onAddLink: (b: any) => void }) {
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

  const canSetLink = ["paid_pending_session", "paid", "scheduled"].includes(booking.status);
  const canComplete = ["paid_pending_session", "scheduled", "paid"].includes(booking.status);
  const canChat = !["pending_payment", "cancelled", "refunded"].includes(booking.status);

  return (
    <div className="flex items-start gap-4 py-4 border-b border-border last:border-0" data-testid="mentor-booking-row">
      <Avatar className="h-10 w-10 shrink-0 mt-0.5">
        <AvatarImage src={booking.menteeAvatarUrl ?? undefined} />
        <AvatarFallback className="bg-muted text-xs font-semibold">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground">{booking.menteeName || "Mentee"}</p>
        <p className="text-xs text-muted-foreground">{booking.packageTitle || "Session"}</p>
        {booking.scheduledAt && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Calendar className="h-3 w-3" /> {new Date(booking.scheduledAt).toLocaleDateString()}
          </p>
        )}
        {booking.hasDispute && <p className="text-xs text-orange-600 mt-0.5 font-medium">Dispute raised — under review</p>}
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
          {canSetLink && (
            <Button size="sm" variant="outline" className="text-xs h-7 px-2 gap-1" onClick={() => onAddLink(booking)} data-testid="add-meeting-link-btn">
              <Link2 className="h-3 w-3" /> {booking.meetingLink ? "Edit Link" : "Add Link"}
            </Button>
          )}
          {canComplete && (
            <Button size="sm" variant="outline" className="text-xs h-7 px-2 gap-1 text-green-700 border-green-300 hover:bg-green-50" onClick={markSessionComplete} disabled={isPending} data-testid="mark-complete-btn">
              <CheckCircle className="h-3 w-3" /> Complete
            </Button>
          )}
          {canChat && (
            <Button size="sm" variant="ghost" className="text-xs h-7 px-2 gap-1 text-muted-foreground" onClick={() => setLocation(`/bookings/${booking.id}/chat`)} data-testid="chat-btn">
              <MessageSquare className="h-3 w-3" /> Chat
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function MentorDashboardContent() {
  const [linkBooking, setLinkBooking] = useState<any>(null);
  const [payoutOpen, setPayoutOpen] = useState(false);
  const { data: stats, isLoading: statsLoading } = useGetMentorDashboardStats();
  const { data: bookings, isLoading: bookingsLoading } = useListMyBookings({ role: "mentor" });
  const { data: payoutInfo, isLoading: payoutsLoading } = useGetMentorPayouts();

  const active = (bookings ?? []).filter((b: any) => ["paid_pending_session", "paid", "scheduled"].includes(b.status));
  const inProgress = (bookings ?? []).filter((b: any) => ["session_completed", "under_review", "disputed"].includes(b.status));
  const history = (bookings ?? []).filter((b: any) => ["payout_released", "completed", "cancelled", "refunded"].includes(b.status));

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
              { icon: <Star className="h-5 w-5 text-amber-400" />, label: "Avg Rating", value: stats?.averageRating != null ? `${stats.averageRating}/5` : "—" },
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

        {/* Active sessions */}
        <Card className="p-6">
          <h2 className="font-semibold text-foreground mb-4">Active Sessions</h2>
          {bookingsLoading ? <Skeleton className="h-20" /> : active.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Clock className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
              No active sessions right now
            </div>
          ) : (
            active.map((b: any) => <BookingRow key={b.id} booking={b} onAddLink={setLinkBooking} />)
          )}
        </Card>

        {/* Awaiting 48h window */}
        {inProgress.length > 0 && (
          <Card className="p-6">
            <h2 className="font-semibold text-foreground mb-1">Awaiting Payout Release</h2>
            <p className="text-xs text-muted-foreground mb-4">Payout auto-releases 48h after session completion if no dispute is raised.</p>
            {inProgress.map((b: any) => <BookingRow key={b.id} booking={b} onAddLink={setLinkBooking} />)}
          </Card>
        )}

        {/* History */}
        {history.length > 0 && (
          <Card className="p-6">
            <h2 className="font-semibold text-foreground mb-4">Session History</h2>
            {history.map((b: any) => <BookingRow key={b.id} booking={b} onAddLink={setLinkBooking} />)}
          </Card>
        )}
      </div>

      {linkBooking && <MeetingLinkDialog booking={linkBooking} onClose={() => setLinkBooking(null)} />}
      {payoutOpen && <PayoutRequestDialog balance={payoutInfo?.withdrawableBalance ?? 0} onClose={() => setPayoutOpen(false)} />}
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
