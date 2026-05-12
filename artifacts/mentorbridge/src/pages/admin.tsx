import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  useAdminGetStats,
  useAdminListMentors,
  useAdminApproveMentor,
  useAdminFeatureMentor,
  useAdminListBookings,
  getAdminListMentorsQueryKey,
  getAdminGetStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Users, Star, DollarSign, Calendar, CheckCircle, Clock, X } from "lucide-react";

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

function MentorRow({ mentor }: { mentor: any }) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutate: approve, isPending: approvePending } = useAdminApproveMentor();
  const { mutate: feature, isPending: featurePending } = useAdminFeatureMentor();

  const initials = (mentor.fullName || "M").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  function handleApprove() {
    approve(
      { mentorId: mentor.id, data: { status: "approved" } },
      {
        onSuccess: () => {
          toast({ title: "Mentor approved!" });
          queryClient.invalidateQueries({ queryKey: getAdminListMentorsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getAdminGetStatsQueryKey() });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  function handleFeature() {
    feature(
      { mentorId: mentor.id, data: { isFeatured: !mentor.isFeatured } },
      {
        onSuccess: () => {
          toast({ title: mentor.isFeatured ? "Removed from featured" : "Added to featured" });
          queryClient.invalidateQueries({ queryKey: getAdminListMentorsQueryKey() });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    suspended: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="flex items-center gap-4 py-4 border-b border-border last:border-0">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={mentor.avatarUrl ?? undefined} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm text-foreground">{mentor.fullName || "Unknown"}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[mentor.status] ?? "bg-gray-100 text-gray-800"}`}>{mentor.status}</span>
          {mentor.isFeatured && <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">Featured</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{mentor.headline}</p>
        {mentor.industry && <p className="text-xs text-muted-foreground">{mentor.industry}</p>}
        {mentor.rejectionReason && <p className="text-xs text-destructive mt-0.5">Reason: {mentor.rejectionReason}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7 px-2"
          onClick={handleFeature}
          disabled={featurePending}
          data-testid="feature-mentor-btn"
        >
          <Star className={`h-3 w-3 mr-1 ${mentor.isFeatured ? "fill-amber-400 text-amber-400" : ""}`} />
          {mentor.isFeatured ? "Unfeature" : "Feature"}
        </Button>
        {mentor.status === "pending" && (
          <>
            <Button size="sm" className="text-xs h-7 px-2 bg-green-600 hover:bg-green-700 text-white" onClick={handleApprove} disabled={approvePending} data-testid="approve-mentor-btn">
              <CheckCircle className="h-3 w-3 mr-1" /> Approve
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-7 px-2 text-destructive border-destructive/30 hover:bg-destructive hover:text-white" onClick={() => setRejectOpen(true)} data-testid="reject-mentor-btn">
              <X className="h-3 w-3 mr-1" /> Reject
            </Button>
          </>
        )}
      </div>
      {rejectOpen && <RejectDialog mentor={mentor} onClose={() => setRejectOpen(false)} />}
    </div>
  );
}

function AdminContent() {
  const { data: stats, isLoading: statsLoading } = useAdminGetStats();
  const { data: pendingMentors } = useAdminListMentors({ status: "pending" });
  const { data: allMentors } = useAdminListMentors();
  const { data: bookings } = useAdminListBookings();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="bg-primary/5 border-b border-border py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage mentors, bookings, and platform stats</p>
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
          <TabsList>
            <TabsTrigger value="pending">Pending ({pendingMentors?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="all-mentors">All Mentors</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
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
                          <td className="py-3">{b.menteeName || "—"}</td>
                          <td className="py-3">{b.mentorName || "—"}</td>
                          <td className="py-3 font-medium">${Number(b.amount).toFixed(0)}</td>
                          <td className="py-3 text-green-700">${Number(b.platformFee).toFixed(0)}</td>
                          <td className="py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              b.status === "completed" ? "bg-green-100 text-green-800" :
                              b.status === "paid" || b.status === "scheduled" ? "bg-blue-100 text-blue-800" :
                              b.status === "cancelled" ? "bg-red-100 text-red-800" :
                              "bg-gray-100 text-gray-800"
                            }`}>{b.status}</span>
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
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute>
      <AdminContent />
    </ProtectedRoute>
  );
}
