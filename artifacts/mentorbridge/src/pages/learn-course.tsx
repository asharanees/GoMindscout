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
  useGetCourse, 
  useEnrollInCourse,
  getGetCourseQueryKey 
} from "@workspace/api-client-react";
import { Calendar, Clock, Users, BookOpen, Video, ArrowLeft, CheckCircle, Lock } from "lucide-react";

export default function LearnCoursePage() {
  const { id } = useParams();
  const courseId = Number(id);
  const { isSignedIn } = useAuth();
  const { toast } = useToast();
  
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

  const { data: course, isLoading } = useGetCourse(courseId, {
    query: { enabled: !!courseId, queryKey: getGetCourseQueryKey(courseId) }
  });

  const { mutateAsync: enrollInCourse, isPending: isEnrolling } = useEnrollInCourse();

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

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold mb-2">Course Not Found</h1>
          <Link href="/learn"><Button variant="outline">Browse All</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const seatsLeft = course.maxSeats - course.enrolledCount;
  const isFull = seatsLeft <= 0;
  const isArchived = course.status === "archived";

  async function handleEnroll() {
    if (!isSignedIn) {
      window.location.href = `/sign-in?redirect_url=/learn/courses/${course?.id}`;
      return;
    }
    
    try {
      const res = await enrollInCourse({ courseId });
      if (res.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        toast({ title: "Enrolled successfully!", description: "Check your dashboard for details." });
        window.location.reload();
      }
    } catch (err: any) {
      toast({ title: "Enrollment failed", description: err.message, variant: "destructive" });
    }
  }

  const activeMeetingLink = activeSessionId ? course.sessions?.find(s => s.id === activeSessionId)?.meetingLink : "";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <div className="border-b border-border bg-secondary/5">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <Link href="/learn" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to learning
          </Link>
          
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-secondary text-secondary-foreground hover:bg-secondary/90">Course</Badge>
                {course.level && <Badge variant="outline" className="text-secondary border-secondary/30">{course.level}</Badge>}
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold text-foreground leading-tight mb-4 tracking-tight">{course.title}</h1>
              
              <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mb-6">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-secondary" />
                  <span className="font-medium text-foreground">{course.totalSessions} Sessions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-secondary" />
                  <span className="font-medium text-foreground">{course.enrolledCount} / {course.maxSeats} enrolled</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-5xl mx-auto px-4 py-12 w-full grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-12">
          {course.thumbnailUrl && (
            <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-lg border border-border">
              <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
            </div>
          )}
          
          <div>
            <h2 className="text-2xl font-bold mb-4">About this course</h2>
            <div className="prose prose-sm sm:prose-base max-w-none text-muted-foreground">
              {course.description ? (
                <p className="whitespace-pre-wrap">{course.description}</p>
              ) : (
                <p>No description provided.</p>
              )}
            </div>
          </div>

          <div className="bg-muted/30 rounded-2xl p-6 border border-border">
            <h2 className="text-xl font-bold mb-6">Meet your mentor</h2>
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 border-2 border-secondary/20">
                <AvatarImage src={course.mentorAvatarUrl ?? undefined} />
                <AvatarFallback className="text-lg bg-secondary/10 text-secondary">{course.mentorName?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Link href={`/mentors/${course.mentorId}`} className="text-lg font-bold hover:text-secondary transition-colors block mb-1">
                  {course.mentorName}
                </Link>
                <p className="text-muted-foreground mb-3">{course.mentorHeadline}</p>
                <Link href={`/mentors/${course.mentorId}`}>
                  <Button variant="outline" size="sm">View Profile</Button>
                </Link>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-6">Course Curriculum</h2>
            <div className="space-y-4">
              {(course.sessions ?? []).length === 0 ? (
                <p className="text-muted-foreground">Curriculum is being finalized.</p>
              ) : (
                (course.sessions ?? []).map((session, index) => (
                  <div key={session.id} className="border border-border rounded-xl p-5 hover-elevate transition-all bg-card flex flex-col sm:flex-row gap-4">
                    <div className="h-12 w-12 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center font-bold text-xl shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg mb-1 truncate">{session.title}</h3>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mb-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {session.scheduledAt ? new Date(session.scheduledAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "TBA"}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {session.durationMinutes} mins
                        </div>
                        <div className="flex items-center gap-1.5 capitalize font-medium text-foreground">
                          Status: <span className={session.status === "live" ? "text-destructive" : session.status === "completed" ? "text-green-600" : ""}>{session.status}</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{session.description}</p>
                    </div>
                    
                    {course.isEnrolled ? (
                      <div className="flex flex-col justify-center shrink-0">
                        {session.status === "live" ? (
                          <Button size="sm" className="bg-destructive hover:bg-destructive/90" onClick={() => setActiveSessionId(session.id)}>
                            <Video className="h-4 w-4 mr-1.5" /> Join Live
                          </Button>
                        ) : session.status === "completed" ? (
                          <Button size="sm" variant="outline" disabled className="text-green-600 border-green-200 bg-green-50">
                            <CheckCircle className="h-4 w-4 mr-1.5" /> Completed
                          </Button>
                        ) : (
                          <Button size="sm" variant="secondary" disabled>
                            Upcoming
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col justify-center shrink-0">
                        <Button size="sm" variant="outline" disabled>
                          <Lock className="h-4 w-4 mr-1.5 text-muted-foreground" /> Locked
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-card rounded-2xl shadow-xl border border-border p-6 flex flex-col">
            <div className="mb-6">
              <div className="text-3xl font-extrabold mb-1">
                {course.price > 0 ? `$${course.price}` : "Free"}
              </div>
              <p className="text-sm text-muted-foreground">Full course access</p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center text-sm pb-3 border-b border-border">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize">{course.status}</span>
              </div>
              <div className="flex justify-between items-center text-sm pb-3 border-b border-border">
                <span className="text-muted-foreground">Availability</span>
                <span className="font-medium">{isFull ? "Sold Out" : `${seatsLeft} seats left`}</span>
              </div>
            </div>

            {course.isEnrolled ? (
              <div className="bg-green-50 text-green-700 p-4 rounded-xl flex flex-col items-center justify-center gap-2 font-medium text-sm border border-green-200 text-center">
                <CheckCircle className="h-6 w-6 mb-1" /> 
                <span className="text-lg">You're enrolled</span>
                <p className="text-xs text-green-700/80 font-normal">Check the curriculum to join live sessions</p>
              </div>
            ) : (
              <Button 
                className="w-full text-lg h-14 mt-auto bg-secondary hover:bg-secondary/90 text-secondary-foreground" 
                size="lg" 
                disabled={isFull || isArchived || isEnrolling}
                onClick={handleEnroll}
              >
                {isEnrolling ? "Processing..." : isArchived ? "Archived" : isFull ? "Sold Out" : "Enroll in Course"}
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {activeSessionId && (
        <GroupMeetingRoom
          sessionId={activeSessionId}
          meetingLink={activeMeetingLink || ""}
          open={!!activeSessionId}
          onClose={() => setActiveSessionId(null)}
        />
      )}
      
      <Footer />
    </div>
  );
}