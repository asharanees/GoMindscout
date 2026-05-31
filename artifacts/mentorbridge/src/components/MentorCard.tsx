import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import StarRating from "./StarRating";

interface MentorCardProps {
  mentor: {
    id: number;
    fullName?: string | null;
    avatarUrl?: string | null;
    headline: string;
    categoryName?: string | null;
    expertiseTags?: string[];
    hourlyRate?: number | null;
    currency?: string | null;
    averageRating?: number | null;
    totalReviews?: number;
    totalSessions?: number;
    languages?: string[];
  };
}

export default function MentorCard({ mentor }: MentorCardProps) {
  const initials = (mentor.fullName || "M").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Card className="p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col gap-4" data-testid="mentor-card">
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 shrink-0">
          <AvatarImage src={mentor.avatarUrl ?? undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground text-sm leading-tight truncate">{mentor.fullName || "Mentor"}</p>
          <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2 leading-tight">{mentor.headline}</p>
        </div>
      </div>

      {mentor.categoryName && (
        <Badge variant="secondary" className="self-start text-xs font-medium">{mentor.categoryName}</Badge>
      )}

      {mentor.expertiseTags && mentor.expertiseTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {mentor.expertiseTags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs py-0">{tag}</Badge>
          ))}
          {mentor.expertiseTags.length > 3 && (
            <Badge variant="outline" className="text-xs py-0 text-muted-foreground">+{mentor.expertiseTags.length - 3}</Badge>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
        <div className="flex flex-col gap-0.5">
          {mentor.averageRating != null ? (
            <div className="flex items-center gap-1.5">
              <StarRating rating={mentor.averageRating} />
              <span className="text-xs text-muted-foreground">{mentor.averageRating.toFixed(1)} ({mentor.totalReviews})</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">New mentor</span>
          )}
          {mentor.hourlyRate != null && (
            <span className="text-sm font-bold text-foreground">{mentor.currency ?? "$"}{mentor.hourlyRate}<span className="text-xs font-normal text-muted-foreground">/hr</span></span>
          )}
        </div>
        <Link href={`/mentors/${mentor.id}`}>
          <Button size="sm" variant="outline" className="text-primary border-primary/30 hover:bg-primary hover:text-white" data-testid="view-mentor-btn">View Profile</Button>
        </Link>
      </div>
    </Card>
  );
}
