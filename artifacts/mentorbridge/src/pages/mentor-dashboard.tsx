import { useState } from "react";
import { Link } from "wouter";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useGetMentorDashboardStats,
  useListMyBookings,
  useUpdateMeetingLink,
  useUpdateBookingStatus,
  getListMyBookingsQueryKey,
  getGetMentorDashboardStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Calendar, DollarSign, CheckCircle, Star, Clock, Link2, Edit, Zap, ExternalLink, Copy } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "bg-yellow-100 text-yellow-800",
  paid: "bg-blue-100 text-blue-800",
  scheduled: "bg-indigo-100 text-indigo-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-800",
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
    const link = `https://meet.jit.si/${roomName}`;
    setMeetingLink(link);
    toast({ title: "Room generated", description: "A unique Jitsi room has been created for this session." });
  }

  function openAndFill(baseUrl: string) {
    window.open(baseUrl, "_blank", "noopener");
    toast({ title: "Opened in new tab", description: "Copy the meeting link from there and paste it below." });
  }

  function copyLink() {
    navigator.clipboard.writeText(meetingLink);
    toast({ title: "Copied to clipboard" });
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
        onError: (err: any) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      }
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Up Meeting Link</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          {/* Quick-generate section */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Quick generate</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={generateJitsiRoom}
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-center"
                data-testid="generate-jitsi-btn"
              >
                <Zap className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium text-foreground leading-tight">Jitsi</span>
                <span className="text-[10px] text-muted-foreground leading-tight">Instant, free</span>
              </button>
              <button
                type="button"
                onClick={() => openAndFill("https://meet.google.com/new")}
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-center"
                data-testid="open-google-meet-btn"
              >
                <ExternalLink className="h-5 w-5 text-blue-500" />
                <span className="text-xs font-medium text-foreground leading-tight">Google Meet</span>
                <span className="text-[10px] text-muted-foreground leading-tight">Opens new tab</span>
              </button>
              <button
                type="button"
                onClick={() => openAndFill("https://zoom.us/start/videomeeting")}
                className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-center"
                data-testid="open-zoom-btn"
              >
                <ExternalLink className="h-5 w-5 text-blue-600" />
                <span className="text-xs font-medium text-foreground leading-tight">Zoom</span>
                <span className="text-[10px] text-muted-foreground leading-tight">Opens new tab</span>
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Jitsi creates a free room instantly — no account needed. Google Meet and Zoom open in a new tab so you can copy your link.
            </p>
          </div>

          {/* Manual URL field */}
          <div>
            <Label htmlFor="meeting-link" className="mb-2 block">Meeting URL</Label>
            <div className="flex gap-2">
              <Input
                id="meeting-link"
                placeholder="https://meet.jit.si/..."
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                data-testid="meeting-link-input"
                className="flex-1"
              />
              {meetingLink && (
                <Button type="button" variant="outline" size="icon" onClick={copyLink} title="Copy link" data-testid="copy-link-btn">
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

function BookingRow({ booking, onAddLink }: { booking: any; onAddLink: (b: any) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: updateStatus } = useUpdateBookingStatus();
  const statusClass = STATUS_COLORS[booking.status] ?? "bg-gray-100 text-gray-800";
  const initials = (booking.menteeName || "M").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  function markComplete() {
    updateStatus(
      { bookingId: booking.id, data: { status: "completed" } },
      {
        onSuccess: () => {
          toast({ title: "Session marked as completed" });
          queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMentorDashboardStatsQueryKey() });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  return (
    <div className="flex items-center gap-4 py-4 border-b border-border last:border-0">
      <Avatar className="h-10 w-10 shrink-0">
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
      </div>
      <div className="text-right shrink-0 space-y-1">
        <div>
          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${statusClass}`}>
            {booking.status.replace("_", " ")}
          </span>
          <p className="text-sm font-semibold text-foreground mt-0.5">${Number(booking.amount).toFixed(0)}</p>
        </div>
        {(booking.status === "paid") && (
          <Button size="sm" variant="outline" className="text-xs h-7 px-2 gap-1" onClick={() => onAddLink(booking)} data-testid="add-meeting-link-btn">
            <Link2 className="h-3 w-3" /> Add Link
          </Button>
        )}
        {booking.status === "scheduled" && (
          <Button size="sm" variant="outline" className="text-xs h-7 px-2 gap-1 text-green-700 border-green-300 hover:bg-green-50" onClick={markComplete} data-testid="mark-complete-btn">
            <CheckCircle className="h-3 w-3" /> Complete
          </Button>
        )}
      </div>
    </div>
  );
}

function MentorDashboardContent() {
  const [linkBooking, setLinkBooking] = useState<any>(null);
  const { data: stats, isLoading: statsLoading } = useGetMentorDashboardStats();
  const { data: bookings, isLoading: bookingsLoading } = useListMyBookings({ role: "mentor" });

  const active = (bookings ?? []).filter((b: any) => ["paid", "scheduled"].includes(b.status));
  const history = (bookings ?? []).filter((b: any) => ["completed", "cancelled"].includes(b.status));

  const statusBadge = stats?.profileStatus === "approved"
    ? <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge>
    : stats?.profileStatus === "pending"
    ? <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending Review</Badge>
    : stats?.profileStatus === "rejected"
    ? <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : (
            [
              { icon: <Calendar className="h-5 w-5 text-primary" />, label: "Total Bookings", value: stats?.totalBookings ?? 0 },
              { icon: <CheckCircle className="h-5 w-5 text-green-600" />, label: "Completed", value: stats?.completedSessions ?? 0 },
              { icon: <DollarSign className="h-5 w-5 text-amber-500" />, label: "Earnings", value: `$${(stats?.totalEarnings ?? 0).toFixed(0)}` },
              {
                icon: <Star className="h-5 w-5 text-amber-400" />,
                label: "Avg Rating",
                value: stats?.averageRating != null ? `${stats.averageRating}/5` : "—",
              },
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

        {/* Active bookings */}
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

        {/* History */}
        {history.length > 0 && (
          <Card className="p-6">
            <h2 className="font-semibold text-foreground mb-4">Session History</h2>
            {history.map((b: any) => <BookingRow key={b.id} booking={b} onAddLink={setLinkBooking} />)}
          </Card>
        )}
      </div>

      {linkBooking && <MeetingLinkDialog booking={linkBooking} onClose={() => setLinkBooking(null)} />}
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
