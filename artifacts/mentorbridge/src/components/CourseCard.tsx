import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Users, ArrowRight } from "lucide-react";
import type { Course } from "@workspace/api-client-react";

export default function CourseCard({ course }: { course: Course }) {
  const seatsLeft = course.maxSeats - course.enrolledCount;
  const isFull = seatsLeft <= 0;
  const fillPercentage = Math.min(100, Math.round((course.enrolledCount / course.maxSeats) * 100));
  
  const initials = (course.mentorName || "M")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Link href={`/learn/courses/${course.id}`} className="group block h-full">
      <Card className="h-full flex flex-col overflow-hidden hover-elevate transition-all border-border/50 hover:border-secondary/30 hover:shadow-md">
        {course.thumbnailUrl && (
          <div className="aspect-[16/9] w-full overflow-hidden bg-muted relative">
            <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute top-3 right-3 bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
              Course
            </div>
          </div>
        )}
        
        <div className="p-5 flex-1 flex flex-col">
          {!course.thumbnailUrl && (
            <div className="mb-3 bg-secondary/10 text-secondary w-fit px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">
              Course
            </div>
          )}
          
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-bold text-lg text-foreground leading-tight group-hover:text-secondary transition-colors">
              {course.title}
            </h3>
            {course.level && (
              <Badge variant="outline" className="shrink-0 bg-secondary/5 text-secondary border-secondary/20">
                {course.level}
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
            {course.description || "Join this structured course program."}
          </p>
          
          <div className="flex flex-col gap-2 mb-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <BookOpen className="h-3.5 w-3.5" />
              {course.totalSessions} Sessions
            </div>
          </div>
          
          <div className="flex items-center gap-3 pt-4 border-t border-border mt-auto mb-4">
            <Avatar className="h-8 w-8">
              <AvatarImage src={course.mentorAvatarUrl ?? undefined} />
              <AvatarFallback className="bg-secondary/10 text-secondary text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{course.mentorName}</p>
              <p className="text-[10px] text-muted-foreground truncate">{course.mentorHeadline}</p>
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
                {course.price > 0 ? `$${course.price}` : "Free"}
              </span>
            </div>
            <Progress value={fillPercentage} className="h-1.5 bg-secondary/10" />
          </div>
        </div>
      </Card>
    </Link>
  );
}