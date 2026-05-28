import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useAdminGetStats,
  useAdminListMentors,
  useAdminApproveMentor,
  useAdminFeatureMentor,
  useAdminListBookings,
  useAdminListDisputes,
  useAdminResolveDispute,
  useAdminListPayouts,
  useAdminUpdatePayout,
  useAdminSuspendUser,
  useAdminDeleteMentor,
  useAdminDeleteUser,
  getAdminListMentorsQueryKey,
  getAdminGetStatsQueryKey,
  getAdminListDisputesQueryKey,
  getAdminListPayoutsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Users, Star, DollarSign, Calendar, CheckCircle, Clock, X, LogOut, ShieldCheck, ShieldAlert, Wallet, Trash2 } from "lucide-react";

function useAdminSession() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    fetch("/api/admin/me", { credentials: "include" })
      .then((r) => {
        if (r.ok) setAuthenticated(true);
        else { setAuthenticated(false); setLocation("/admin-login"); }
      })
      .catch(() => { setAuthenticated(false); setLocation("/admin-login"); });
  }, [setLocation]);

  return authenticated;
}

function RejectDialog({ mentor, onClose }: { mentor: any; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: approve, isPending } = useAdminApproveMentor();

  function reject() {
    approve(
      { mentorId: mentor.id, data: { status: "rejected", rejectionReason: reason } },
      {
        onSuccess: () => {
          toast({ title: "Mentor rejected" });
          queryClient.invalidateQueries({ queryKey: getAdminListMentorsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getAdminGetStatsQueryKey() });
          onClose();
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Reject Mentor Application</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">Rejecting: <strong>{mentor.fullName}</strong></p>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea id="reason" placeholder="Explain why this profile doesn't meet requirements..." value={reason} onChange={(e) => setReason(e.target.value)} data-testid="rejection-reason" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={reject} disabled={isPending} data-testid="confirm-reject-btn">
            {isPending ? "Rejecting..." : "Confirm Rejection"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResolveDisputeDialog({ dispute, onClose }: { dispute: any; onClose: () => void }) {
  const [resolutionType, setResolutionType] = useState("release_to_mentor");
  const [decision, setDecision] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: resolve, isPending } = useAdminResolveDispute();

  function submit() {
    if (!decision.trim()) { toast({ title: "Please provide a decision note", variant: "destructive" }); return; }
    resolve(
      { disputeId: dispute.id, data: { resolutionType: resolutionType as any, adminDecision: decision } },
      {
        onSuccess: () => {
          toast({ title: "Dispute resolved" });
          queryClient.invalidateQueries({ queryKey: getAdminListDisputesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getAdminGetStatsQueryKey() });
          onClose();
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Resolve Dispute #{dispute.id}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="text-sm bg-muted rounded-lg p-3 space-y-1">
            <p><span className="font-medium">Booking:</span> #{dispute.bookingId}</p>
            <p><span className="font-medium">Reason:</span> {dispute.reason.replace(/_/g, " ")}</p>
            <p><span className="font-medium">Description:</span> {dispute.description}</p>
            <p><span className="font-medium">Opened by:</span> {dispute.openerName}</p>
            {dispute.bookingAmount && <p><span className="font-medium">Amount:</span> ${dispute.bookingAmount}</p>}
          </div>
          <div className="space-y-2">
            <Label>Resolution Type</Label>
            <Select value={resolutionType} onValueChange={setResolutionType}>
              <SelectTrigger data-testid="resolution-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="release_to_mentor">Release to Mentor</SelectItem>
                <SelectItem value="full_refund">Full Refund to Mentee</SelectItem>
                <SelectItem value="partial_refund">Partial Refund</SelectItem>
                <SelectItem value="platform_credit">Platform Credit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Admin Decision Note</Label>
            <Textarea value={decision} onChange={(e) => setDecision(e.target.value)} placeholder="Explain the resolution decision..." data-testid="admin-decision-input" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={isPending} data-testid="confirm-resolve-btn">
            {isPending ? "Resolving..." : "Resolve Dispute"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MentorRow({ mentor }: { mentor: any }) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: approve, isPending: approvePending } = useAdminApproveMentor();
  const { mutate: feature, isPending: featurePending } = useAdminFeatureMentor();
  const { mutate: suspend, isPending: suspendPending } = useAdminSuspendUser();
  const { mutate: deleteMentor, isPending: deletePending } = useAdminDeleteMentor();
  const { mutate: deleteUser, isPending: deleteUserPending } = useAdminDeleteUser();

  const initials = (mentor.fullName || "M").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  function handleApprove() {
    approve({ mentorId: mentor.id, data: { status: "approved" } }, {
      onSuccess: () => {
        toast({ title: "Mentor approved!" });
        queryClient.invalidateQueries({ queryKey: getAdminListMentorsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getAdminGetStatsQueryKey() });
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  }

  function handleFeature() {
    feature({ mentorId: mentor.id, data: { isFeatured: !mentor.isFeatured } }, {
      onSuccess: () => {
        toast({ title: mentor.isFeatured ? "Removed from featured" : "Added to featured" });
        queryClient.invalidateQueries({ queryKey: getAdminListMentorsQueryKey() });
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  }

  function handleSuspend() {
    const isSuspended = mentor.status === "suspended";
    if (!confirm(isSuspended ? `Reinstate ${mentor.fullName}?` : `Suspend ${mentor.fullName}? This will prevent them from taking bookings.`)) return;
    suspend({ userId: mentor.userId, data: { suspended: !isSuspended } }, {
      onSuccess: () => {
        toast({ title: isSuspended ? "User reinstated" : "User suspended" });
        queryClient.invalidateQueries({ queryKey: getAdminListMentorsQueryKey() });
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  }

  function handleDelete() {
    if (!confirm(`Delete ${mentor.fullName}? This will permanently remove their mentor profile, packages, bookings, reviews, and all related data. This action cannot be undone.`)) return;
    deleteMentor({ mentorId: mentor.id }, {
      onSuccess: () => {
        toast({ title: "Mentor deleted", description: `${mentor.fullName} and all related data have been removed.` });
        queryClient.invalidateQueries({ queryKey: getAdminListMentorsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getAdminGetStatsQueryKey() });
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  }

  function handleDeleteUser() {
    if (!confirm(`DELETE USER ACCOUNT for ${mentor.fullName}? This will permanently remove their entire user account, mentor profile, bookings, messages, and all related data. This action cannot be undone.`)) return;
    deleteUser({ userId: mentor.userId }, {
      onSuccess: () => {
        toast({ title: "User deleted", description: `${mentor.fullName} and all associated data have been removed.` });
        queryClient.invalidateQueries({ queryKey: getAdminListMentorsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getAdminGetStatsQueryKey() });
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    suspended: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="flex items-center gap-4 py-4 border-b border-border last:border-0" data-testid="mentor-row">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={mentor.avatarUrl ?? undefined} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm text-foreground">{mentor.fullName || "Unknown"}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[mentor.status] ?? "bg-gray-100 text-gray-800"}`}>{mentor.status}</span>
          {mentor.isFeatured && <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">Featured</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{mentor.headline}</p>
        {mentor.country && <p className="text-xs text-muted-foreground">{mentor.industry}{mentor.industry && mentor.country ? " · " : ""}{mentor.country}</p>}
        {!mentor.country && mentor.industry && <p className="text-xs text-muted-foreground">{mentor.industry}</p>}
        {mentor.rejectionReason && <p className="text-xs text-destructive mt-0.5">Reason: {mentor.rejectionReason}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
        <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={handleFeature} disabled={featurePending} data-testid="feature-mentor-btn">
          <Star className={`h-3 w-3 mr-1 ${mentor.isFeatured ? "fill-amber-400 text-amber-400" : ""}`} />
          {mentor.isFeatured ? "Unfeature" : "Feature"}
        </Button>
        {mentor.status !== "approved" && (
          <Button size="sm" className="text-xs h-7 px-2 bg-green-600 hover:bg-green-700 text-white" onClick={handleApprove} disabled={approvePending} data-testid="approve-mentor-btn">
            <CheckCircle className="h-3 w-3 mr-1" /> Approve
          </Button>
        )}
        {mentor.status !== "rejected" && (
          <Button size="sm" variant="outline" className="text-xs h-7 px-2 text-destructive border-destructive/30 hover:bg-destructive hover:text-white" onClick={() => setRejectOpen(true)} data-testid="reject-mentor-btn">
            <X className="h-3 w-3 mr-1" /> Reject
          </Button>
        )}
        <Button size="sm" variant="ghost" className={`text-xs h-7 px-2 ${mentor.status === "suspended" ? "text-green-700" : "text-muted-foreground hover:text-destructive"}`} onClick={handleSuspend} disabled={suspendPending} data-testid="suspend-mentor-btn">
          {mentor.status === "suspended" ? "Reinstate" : "Suspend"}
        </Button>
        <Button size="sm" variant="ghost" className="text-xs h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleDelete} disabled={deletePending} data-testid="delete-mentor-btn">
          <Trash2 className="h-3 w-3 mr-1" /> Delete Mentor
        </Button>
        <Button size="sm" variant="ghost" className="text-xs h-7 px-2 text-red-700 hover:text-red-700 hover:bg-red-50" onClick={handleDeleteUser} disabled={deleteUserPending} data-testid="delete-user-btn">
          <Trash2 className="h-3 w-3 mr-1" /> Delete User
        </Button>
      </div>
      {rejectOpen && <RejectDialog mentor={mentor} onClose={() => setRejectOpen(false)} />}
    </div>
  );
}

const BOOKING_STATUS_COLORS: Record<string, string> = {
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

const DISPUTE_STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800",
  under_review: "bg-orange-100 text-orange-800",
  resolved: "bg-green-100 text-green-800",
};

const PAYOUT_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  paid_out: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

function AdminContent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [resolveDispute, setResolveDispute] = useState<any>(null);

  const { data: stats, isLoading: statsLoading } = useAdminGetStats();
  const { data: pendingMentors } = useAdminListMentors({ status: "pending" });
  const { data: allMentors } = useAdminListMentors();
  const { data: bookings } = useAdminListBookings();
  const { data: disputes } = useAdminListDisputes();
  const { data: payouts } = useAdminListPayouts();

  const { mutate: updatePayout } = useAdminUpdatePayout();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    toast({ title: "Logged out of admin panel" });
    setLocation("/admin-login");
  }

  function handlePayoutAction(payoutId: number, status: string) {
    updatePayout(
      { payoutId, data: { status: status as any } },
      {
        onSuccess: () => {
          toast({ title: `Payout ${status.replace("_", " ")}` });
          queryClient.invalidateQueries({ queryKey: getAdminListPayoutsQueryKey() });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  const openDisputeCount = (disputes ?? []).filter((d: any) => d.status !== "resolved").length;
  const pendingPayoutCount = (payouts ?? []).filter((p: any) => p.status === "pending").length;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="bg-primary/5 border-b border-border py-8 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            </div>
            <p className="text-muted-foreground text-sm">Manage mentors, bookings, disputes, and payouts</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1.5" data-testid="admin-logout-btn">
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </div>

      <div className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : (
            [
              { icon: <Users className="h-5 w-5 text-primary" />, label: "Active Mentors", value: stats?.totalMentors ?? 0 },
              { icon: <Clock className="h-5 w-5 text-yellow-600" />, label: "Pending Review", value: stats?.pendingMentors ?? 0 },
              { icon: <Calendar className="h-5 w-5 text-blue-600" />, label: "Total Bookings", value: stats?.totalBookings ?? 0 },
              { icon: <DollarSign className="h-5 w-5 text-green-600" />, label: "Platform Revenue", value: `$${(stats?.totalRevenue ?? 0).toFixed(0)}` },
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

        <Tabs defaultValue="pending">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="pending">
              Pending
              {pendingMentors && pendingMentors.length > 0 && (
                <span className="ml-1.5 bg-yellow-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{pendingMentors.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="all-mentors">All Mentors</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="disputes">
              Disputes
              {openDisputeCount > 0 && (
                <span className="ml-1.5 bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{openDisputeCount}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="payouts">
              Payouts
              {pendingPayoutCount > 0 && (
                <span className="ml-1.5 bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{pendingPayoutCount}</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            <Card className="p-6">
              <h2 className="font-semibold text-foreground mb-4">Pending Mentor Applications</h2>
              {!pendingMentors ? <Skeleton className="h-20" /> : pendingMentors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-500" />
                  No pending applications
                </div>
              ) : (
                pendingMentors.map((m: any) => <MentorRow key={m.id} mentor={m} />)
              )}
            </Card>
          </TabsContent>

          <TabsContent value="all-mentors" className="mt-4">
            <Card className="p-6">
              <h2 className="font-semibold text-foreground mb-4">All Mentors ({allMentors?.length ?? 0})</h2>
              {!allMentors ? <Skeleton className="h-40" /> : allMentors.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No mentors yet.</p>
              ) : (
                allMentors.map((m: any) => <MentorRow key={m.id} mentor={m} />)
              )}
            </Card>
          </TabsContent>

          <TabsContent value="bookings" className="mt-4">
            <Card className="p-6">
              <h2 className="font-semibold text-foreground mb-4">All Bookings ({bookings?.length ?? 0})</h2>
              {!bookings ? <Skeleton className="h-40" /> : bookings.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No bookings yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-2 font-medium text-muted-foreground">ID</th>
                        <th className="pb-2 font-medium text-muted-foreground">Mentee</th>
                        <th className="pb-2 font-medium text-muted-foreground">Mentor</th>
                        <th className="pb-2 font-medium text-muted-foreground">Amount</th>
                        <th className="pb-2 font-medium text-muted-foreground">Fee</th>
                        <th className="pb-2 font-medium text-muted-foreground">Status</th>
                        <th className="pb-2 font-medium text-muted-foreground">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((b: any) => (
                        <tr key={b.id} className="border-b border-border/50 last:border-0">
                          <td className="py-3 text-muted-foreground">#{b.id}</td>
                          <td className="py-3">{b.menteeName || "-"}</td>
                          <td className="py-3">{b.mentorName || "-"}</td>
                          <td className="py-3 font-medium">${Number(b.amount).toFixed(0)}</td>
                          <td className="py-3 text-green-700">${Number(b.platformFee).toFixed(0)}</td>
                          <td className="py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BOOKING_STATUS_COLORS[b.status] ?? "bg-gray-100 text-gray-800"}`}>
                              {b.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="py-3 text-muted-foreground text-xs">{new Date(b.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="disputes" className="mt-4">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="h-5 w-5 text-orange-500" />
                <h2 className="font-semibold text-foreground">Disputes ({disputes?.length ?? 0})</h2>
              </div>
              {!disputes ? <Skeleton className="h-40" /> : disputes.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No disputes filed.</p>
              ) : (
                <div className="space-y-3">
                  {disputes.map((d: any) => (
                    <div key={d.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-medium text-sm">Booking #{d.bookingId}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DISPUTE_STATUS_COLORS[d.status] ?? "bg-gray-100 text-gray-800"}`}>
                              {d.status.replace("_", " ")}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">Reason:</span> {d.reason.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{d.description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Mentee: {d.menteeName} · Mentor: {d.mentorName}
                            {d.bookingAmount && ` · $${d.bookingAmount}`}
                          </p>
                          {d.adminDecision && (
                            <p className="text-xs text-foreground mt-1 bg-muted rounded px-2 py-1">
                              Decision: {d.adminDecision} ({d.resolutionType?.replace(/_/g, " ")})
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">{new Date(d.createdAt).toLocaleDateString()}</p>
                        </div>
                        {d.status !== "resolved" && (
                          <Button size="sm" variant="outline" className="text-xs h-7 shrink-0" onClick={() => setResolveDispute(d)} data-testid="resolve-dispute-btn">
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="payouts" className="mt-4">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Wallet className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-foreground">Payout Requests ({payouts?.length ?? 0})</h2>
              </div>
              {!payouts ? <Skeleton className="h-40" /> : payouts.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No payout requests yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-2 font-medium text-muted-foreground">ID</th>
                        <th className="pb-2 font-medium text-muted-foreground">Mentor</th>
                        <th className="pb-2 font-medium text-muted-foreground">Amount</th>
                        <th className="pb-2 font-medium text-muted-foreground">Method</th>
                        <th className="pb-2 font-medium text-muted-foreground">Account Details</th>
                        <th className="pb-2 font-medium text-muted-foreground">Status</th>
                        <th className="pb-2 font-medium text-muted-foreground">Date</th>
                        <th className="pb-2 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.map((p: any) => (
                        <tr key={p.id} className="border-b border-border/50 last:border-0">
                          <td className="py-3 text-muted-foreground">#{p.id}</td>
                          <td className="py-3">{p.mentorName || "-"}</td>
                          <td className="py-3 font-medium">${Number(p.amount).toFixed(2)}</td>
                          <td className="py-3 capitalize text-muted-foreground">{p.method.replace("_", " ")}</td>
                          <td className="py-3 max-w-xs">
                            {p.accountDetails ? (
                              <div className="text-xs text-muted-foreground whitespace-pre-line bg-muted/40 rounded p-2 leading-relaxed">
                                {p.accountDetails}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Not provided</span>
                            )}
                          </td>
                          <td className="py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PAYOUT_STATUS_COLORS[p.status] ?? "bg-gray-100 text-gray-800"}`}>
                              {p.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-3 text-muted-foreground text-xs">{new Date(p.createdAt).toLocaleDateString()}</td>
                          <td className="py-3">
                            {p.status === "pending" && (
                              <div className="flex gap-1">
                                <Button size="sm" className="text-xs h-7 px-2 bg-green-600 hover:bg-green-700 text-white" onClick={() => handlePayoutAction(p.id, "approved")} data-testid="approve-payout-btn">
                                  Approve
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs h-7 px-2 text-destructive border-destructive/30 hover:bg-destructive hover:text-white" onClick={() => handlePayoutAction(p.id, "rejected")} data-testid="reject-payout-btn">
                                  Reject
                                </Button>
                              </div>
                            )}
                            {p.status === "approved" && (
                              <Button size="sm" className="text-xs h-7 px-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handlePayoutAction(p.id, "paid_out")} data-testid="mark-paid-payout-btn">
                                Mark Paid
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
      {resolveDispute && <ResolveDisputeDialog dispute={resolveDispute} onClose={() => setResolveDispute(null)} />}
    </div>
  );
}

export default function AdminPage() {
  const authenticated = useAdminSession();

  if (authenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Checking authentication...</div>
      </div>
    );
  }

  if (!authenticated) return null;
  return <AdminContent />;
}
