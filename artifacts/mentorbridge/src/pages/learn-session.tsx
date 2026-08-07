import { useState } from "react";
import { useParams, Link } from "wouter";
import { useAuth } from "@clerk/react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GroupMeetingRoom from "@/components/GroupMeetingRoom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  useGetGroupSession, 
  useEnrollInGroupSession,
  getGetGroupSessionQueryKey 
} from "@workspace/api-client-react";
import { Calendar, Clock, Users, Video, ArrowLeft, CheckCircle } from "lucide-react";

export default function LearnSessionPage() {
  const { id } = useParams();
  const sessionId = Number(id);
  const { isSignedIn } = useAuth();
  const { toast } = useToast();
  
  const [meetingOpen, setMeetingOpen] = useState(false);

  const { data: session, isLoading } = useGetGroupSession(sessionId, {
    query: { enabled: !!sessionId, queryKey: getGetGroupSessionQueryKey(sessionId) }
  });

  const { mutateAsync: enrollInSession, isPending: isEnrolling } = useEnrollInGroupSession();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-4xl mx-auto px-4 py-12 w-full">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-64 w-full rounded-xl mb-8" />
          <div className="flex gap-8">
            <div className="flex-1 space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="w-80">
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold mb-2">Masterclass Not Found</h1>
          <Link href="/learn"><Button variant="outline">Browse All</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const isLive = session.status === "live";
  const isCompleted = session.status === "completed";
  const seatsLeft = session.maxSeats - session.enrolledCount;
  const isFull = seatsLeft <= 0;

  async function handleEnroll() {
    if (!isSignedIn) {
      window.location.href = `/sign-in?redirect_url=/learn/sessions/${session?.id}`;
      return;
    }
    
    try {
      const res = await enrollInSession({ sessionId });
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        toast({ title: "Enrolled successfully!", description: "Check your dashboard for details." });
        // Hard reload or invalidate to show "Enrolled"
        window.location.reload();
      }
    } catch (err: any) {
      toast({ title: "Enrollment failed", description: err.message, variant: "destructive" });
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <div className="border-b border-border bg-primary/5">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <Link href="/learn" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to learning
          </Link>
          
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-1 min-w-0">
              {session.level && <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20">{session.level}</Badge>}
              <h1 className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight mb-4 tracking-tight">{session.title}</h1>
              
              <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground">
                    {session.scheduledAt ? new Date(session.scheduledAt).toLocaleString([], { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "TBA"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground">{session.durationMinutes} mins</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground">{session.enrolledCount} / {session.maxSeats} enrolled</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto px-4 py-12 w-full grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          {session.thumbnailUrl && (
            <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-lg border border-border">
              <img src={session.thumbnailUrl} alt={session.title} className="w-full h-full object-cover" />
            </div>
          )}
          
          <div>
            <h2 className="text-2xl font-bold mb-4">About this masterclass</h2>
            <div className="prose prose-sm sm:prose-base max-w-none text-muted-foreground">
              {session.description ? (
                <p className="whitespace-pre-wrap">{session.description}</p>
              ) : (
                <p>No description provided.</p>
              )}
            </div>
          </div>

          <div className="bg-muted/30 rounded-2xl p-6 border border-border">
            <h2 className="text-xl font-bold mb-6">Meet your mentor</h2>
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                <AvatarImage src={session.mentorAvatarUrl ?? undefined} />
                <AvatarFallback className="text-lg bg-primary/10 text-primary">{session.mentorName?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Link href={`/mentors/${session.mentorId}`} className="text-lg font-bold hover:text-primary transition-colors block mb-1">
                  {session.mentorName}
                </Link>
                <p className="text-muted-foreground mb-3">{session.mentorHeadline}</p>
                <Link href={`/mentors/${session.mentorId}`}>
                  <Button variant="outline" size="sm">View Profile</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-card rounded-2xl shadow-xl border border-border p-6 flex flex-col">
            <div className="mb-6">
              <div className="text-3xl font-extrabold mb-1">
                {session.price > 0 ? `$${session.price}` : "Free"}
              </div>
              <p className="text-sm text-muted-foreground">Masterclass entry</p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center text-sm pb-3 border-b border-border">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize">{session.status}</span>
              </div>
              <div className="flex justify-between items-center text-sm pb-3 border-b border-border">
                <span className="text-muted-foreground">Availability</span>
                <span className="font-medium">{isFull ? "Sold Out" : `${seatsLeft} seats left`}</span>
              </div>
            </div>

            {session.isEnrolled ? (
              <div className="space-y-4 mt-auto">
                <div className="bg-green-50 text-green-700 p-3 rounded-lg flex items-center justify-center gap-2 font-medium text-sm border border-green-200">
                  <CheckCircle className="h-4 w-4" /> You're enrolled
                </div>
                
                {isLive ? (
                  <Button className="w-full text-lg h-14 bg-destructive hover:bg-destructive/90 animate-in fade-in zoom-in duration-300" onClick={() => setMeetingOpen(true)}>
                    <Video className="mr-2 h-5 w-5" /> Join Live Session
                  </Button>
                ) : isCompleted ? (
                  <Button className="w-full text-lg h-12" variant="outline" disabled>
                    Session Completed
                  </Button>
                ) : (
                  <Button className="w-full text-lg h-12" variant="secondary" disabled>
                    Waiting to start
                  </Button>
                )}
              </div>
            ) : (
              <Button 
                className="w-full text-lg h-14 mt-auto" 
                size="lg" 
                disabled={isFull || isCompleted || isEnrolling}
                onClick={handleEnroll}
              >
                {isEnrolling ? "Processing..." : isCompleted ? "Completed" : isFull ? "Sold Out" : "Enroll Now"}
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {session.isEnrolled && meetingOpen && (
        <GroupMeetingRoom
          sessionId={session.id}
          meetingLink={session.meetingLink || ""}
          open={meetingOpen}
          onClose={() => setMeetingOpen(false)}
        />
      )}
      
      <Footer />
    </div>
  );
}