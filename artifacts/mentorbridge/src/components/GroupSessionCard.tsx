import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Calendar, Clock, Users, ArrowRight } from "lucide-react";
import type { GroupSession } from "@workspace/api-client-react";

export default function GroupSessionCard({ session }: { session: GroupSession }) {
  const isLive = session.status === "live";
  const seatsLeft = session.maxSeats - session.enrolledCount;
  const isFull = seatsLeft <= 0;
  const fillPercentage = Math.min(100, Math.round((session.enrolledCount / session.maxSeats) * 100));
  
  const initials = (session.mentorName || "M")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Link href={`/learn/sessions/${session.id}`} className="group block h-full">
      <Card className="h-full flex flex-col overflow-hidden hover-elevate transition-all border-border/50 hover:border-primary/20 hover:shadow-md">
        {session.thumbnailUrl && (
          <div className="aspect-[16/9] w-full overflow-hidden bg-muted relative">
            <img src={session.thumbnailUrl} alt={session.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            {isLive && (
              <div className="absolute top-3 left-3 bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 animate-in fade-in">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Live Now
              </div>
            )}
          </div>
        )}
        
        <div className="p-5 flex-1 flex flex-col">
          {!session.thumbnailUrl && isLive && (
            <div className="mb-3 bg-destructive/10 text-destructive w-fit px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
              Live Now
            </div>
          )}
          
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-bold text-lg text-foreground leading-tight group-hover:text-primary transition-colors">
              {session.title}
            </h3>
            {session.level && (
              <Badge variant="outline" className="shrink-0 bg-primary/5 text-primary border-primary/20">
                {session.level}
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
            {session.description || "Join this live masterclass."}
          </p>
          
          <div className="flex flex-col gap-2 mb-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {session.scheduledAt ? new Date(session.scheduledAt).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "TBA"}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {session.durationMinutes} minutes
            </div>
          </div>
          
          <div className="flex items-center gap-3 pt-4 border-t border-border mt-auto mb-4">
            <Avatar className="h-8 w-8">
              <AvatarImage src={session.mentorAvatarUrl ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{session.mentorName}</p>
              <p className="text-[10px] text-muted-foreground truncate">{session.mentorHeadline}</p>
            </div>
          </div>
          
          <div className="space-y-2 mt-auto">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> 
                {isFull ? (
                  <span className="text-destructive">Sold out</span>
                ) : (
                  <span>{seatsLeft} seat{seatsLeft !== 1 ? 's' : ''} left</span>
                )}
              </span>
              <span className="font-bold text-base text-foreground">
                {session.price > 0 ? `$${session.price}` : "Free"}
              </span>
            </div>
            <Progress value={fillPercentage} className="h-1.5" />
          </div>
        </div>
      </Card>
    </Link>
  );
}