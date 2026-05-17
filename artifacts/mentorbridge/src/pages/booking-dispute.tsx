import { useState } from "react";
import { useParams, useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { useGetBooking, useGetDispute, useCreateDispute, getListMyBookingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const REASONS = [
  { value: "mentor_no_show", label: "Mentor did not show up" },
  { value: "mentee_no_show", label: "Mentee did not show up" },
  { value: "technical_issue", label: "Technical issues prevented the session" },
  { value: "wrong_expertise", label: "Mentor lacked advertised expertise" },
  { value: "misconduct", label: "Misconduct or inappropriate behavior" },
  { value: "other", label: "Other issue" },
];

export default function BookingDisputePage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const bId = parseInt(bookingId);

  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");

  const { data: booking, isLoading: bookingLoading } = useGetBooking(bId);
  const { data: existingDispute, isLoading: disputeLoading } = useGetDispute(bId);
  const { mutate: createDispute, isPending } = useCreateDispute();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason || !description.trim()) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }
    createDispute(
      { data: { bookingId: bId, reason: reason as any, description: description.trim() } },
      {
        onSuccess: () => {
          toast({ title: "Dispute submitted", description: "Our team will review within 2 business days." });
          queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });
          setLocation("/dashboard");
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  if (bookingLoading || disputeLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-xl mx-auto w-full px-4 py-8">
          <Skeleton className="h-64 w-full" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-xl mx-auto w-full px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")} className="gap-1.5" data-testid="back-btn">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <h1 className="text-xl font-bold">Open a Dispute</h1>
          </div>
        </div>

        {existingDispute ? (
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold text-foreground">Dispute Already Filed</h2>
            <div className="text-sm text-muted-foreground space-y-2">
              <p><span className="font-medium text-foreground">Reason:</span> {REASONS.find(r => r.value === existingDispute.reason)?.label ?? existingDispute.reason}</p>
              <p><span className="font-medium text-foreground">Description:</span> {existingDispute.description}</p>
              <p><span className="font-medium text-foreground">Status:</span> <span className="capitalize">{existingDispute.status.replace("_", " ")}</span></p>
              {existingDispute.adminDecision && (
                <p><span className="font-medium text-foreground">Admin Decision:</span> {existingDispute.adminDecision}</p>
              )}
              {existingDispute.resolutionType && (
                <p><span className="font-medium text-foreground">Resolution:</span> <span className="capitalize">{existingDispute.resolutionType.replace("_", " ")}</span></p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Filed on {new Date(existingDispute.createdAt).toLocaleDateString()}</p>
          </Card>
        ) : (
          <Card className="p-6">
            <div className="mb-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
              Disputes are reviewed within 2 business days. Please provide as much detail as possible to help our team make a fair decision.
            </div>

            {booking && (
              <div className="mb-6 text-sm">
                <p><span className="font-medium">Booking:</span> #{booking.id}</p>
                <p><span className="font-medium">Mentor:</span> {booking.mentorName}</p>
                <p><span className="font-medium">Package:</span> {booking.packageTitle}</p>
                <p><span className="font-medium">Amount:</span> ${Number(booking.amount).toFixed(2)}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="reason">Issue Type</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger id="reason" data-testid="reason-select">
                    <SelectValue placeholder="Select the issue type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Describe what happened</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please provide details about what happened during or around the session..."
                  className="min-h-[120px]"
                  data-testid="dispute-description"
                />
              </div>

              <Button type="submit" disabled={isPending || !reason || !description.trim()} className="w-full" variant="destructive" data-testid="submit-dispute-btn">
                {isPending ? "Submitting..." : "Submit Dispute"}
              </Button>
            </form>
          </Card>
        )}
      </div>
      <Footer />
    </div>
  );
}
