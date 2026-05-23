import { useRoute, Link } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StarRating from "@/components/StarRating";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  useGetMentor,
  useListMentorPackages,
  useListMentorReviews,
  getGetMentorQueryKey,
  getListMentorPackagesQueryKey,
  getListMentorReviewsQueryKey,
} from "@workspace/api-client-react";
import { Globe, Linkedin, Clock, Video, Mail, CheckCircle } from "lucide-react";

function PackageCard({ pkg, mentorId }: { pkg: any; mentorId: number }) {
  const typeIcon = pkg.type === "email" ? <Mail className="h-4 w-4" /> : <Video className="h-4 w-4" />;
  const typeLabel = pkg.type === "video_30" ? "30-min Video Call" : pkg.type === "video_60" ? "60-min Video Call" : "Email Advice";

  return (
    <Card className="p-5 flex flex-col gap-3 hover:shadow-md transition-shadow" data-testid="package-card">
      <div className="flex items-center gap-2 text-primary">
        {typeIcon}
        <span className="text-xs font-semibold uppercase tracking-wide">{typeLabel}</span>
      </div>
      <div>
        <h3 className="font-semibold text-foreground">{pkg.title}</h3>
        {pkg.description && <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{pkg.description}</p>}
      </div>
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
        <div>
          <span className="text-xl font-bold text-foreground">${Number(pkg.price).toFixed(0)}</span>
          {pkg.durationMinutes && (
            <span className="text-xs text-muted-foreground ml-1.5 flex items-center gap-0.5 inline-flex">
              <Clock className="h-3 w-3" /> {pkg.durationMinutes} min
            </span>
          )}
        </div>
        <Link href={`/book/${pkg.id}?mentorId=${mentorId}`}>
          <Button size="sm" className="bg-primary hover:bg-primary/90" data-testid="book-now-btn">Book Now</Button>
        </Link>
      </div>
    </Card>
  );
}

function YouTubeEmbed({ url }: { url: string }) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (!match) return null;
  return (
    <div className="relative rounded-xl overflow-hidden aspect-video bg-black">
      <iframe
        src={`https://www.youtube.com/embed/${match[1]}`}
        className="w-full h-full"
        allowFullScreen
        title="Intro video"
      />
    </div>
  );
}

export default function MentorProfilePage() {
  const [, params] = useRoute("/mentors/:id");
  const mentorId = parseInt(params?.id ?? "0");

  const { data: mentor, isLoading } = useGetMentor(mentorId, {
    query: { enabled: !!mentorId, queryKey: getGetMentorQueryKey(mentorId) },
  });
  const { data: packages } = useListMentorPackages(mentorId, {
    query: { enabled: !!mentorId, queryKey: getListMentorPackagesQueryKey(mentorId) },
  });
  const { data: reviews } = useListMentorReviews(mentorId, {
    query: { enabled: !!mentorId, queryKey: getListMentorReviewsQueryKey(mentorId) },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-12 w-full space-y-6">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!mentor) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-muted-foreground">Mentor not found.</div>
        <Footer />
      </div>
    );
  }

  const initials = (mentor.fullName || "M").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-10 w-full">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <Card className="p-6">
              <div className="flex items-start gap-5">
                <Avatar className="h-20 w-20 shrink-0">
                  <AvatarImage src={mentor.avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-bold text-foreground">{mentor.fullName || "Mentor"}</h1>
                  <p className="text-muted-foreground mt-1 leading-snug">{mentor.headline}</p>

                  {mentor.averageRating != null && (
                    <div className="flex items-center gap-2 mt-3">
                      <StarRating rating={mentor.averageRating} size="md" showValue />
                      <span className="text-sm text-muted-foreground">({mentor.totalReviews} review{mentor.totalReviews !== 1 ? "s" : ""})</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-sm text-muted-foreground">{mentor.totalSessions} session{mentor.totalSessions !== 1 ? "s" : ""}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mt-4">
                    {mentor.categoryName && <Badge variant="secondary">{mentor.categoryName}</Badge>}
                    {mentor.industry && <Badge variant="outline">{mentor.industry}</Badge>}
                    {mentor.yearsExperience && <Badge variant="outline">{mentor.yearsExperience}+ years exp.</Badge>}
                  </div>

                  <div className="flex gap-3 mt-4">
                    {mentor.linkedinUrl && (
                      <a href={mentor.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors">
                        <Linkedin className="h-5 w-5" />
                      </a>
                    )}
                    {mentor.languages && mentor.languages.length > 0 && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Globe className="h-4 w-4" />
                        {mentor.languages.join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Bio */}
            {mentor.bio && (
              <Card className="p-6">
                <h2 className="font-semibold text-foreground mb-3">About</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{mentor.bio}</p>
              </Card>
            )}

            {/* Expertise */}
            {mentor.expertiseTags && mentor.expertiseTags.length > 0 && (
              <Card className="p-6">
                <h2 className="font-semibold text-foreground mb-3">Areas of Expertise</h2>
                <div className="flex flex-wrap gap-2">
                  {mentor.expertiseTags.map((tag: string) => (
                    <div key={tag} className="flex items-center gap-1.5 bg-primary/5 border border-primary/20 rounded-full px-3 py-1 text-sm text-primary">
                      <CheckCircle className="h-3.5 w-3.5" />
                      {tag}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Intro video */}
            {mentor.introVideoUrl && (
              <Card className="p-6">
                <h2 className="font-semibold text-foreground mb-3">Introduction</h2>
                <YouTubeEmbed url={mentor.introVideoUrl} />
              </Card>
            )}

            {/* Reviews */}
            {reviews && reviews.length > 0 && (
              <Card className="p-6">
                <h2 className="font-semibold text-foreground mb-4">Reviews ({reviews.length})</h2>
                <div className="space-y-4">
                  {reviews.map((review: any) => (
                    <div key={review.id} className="border-b border-border last:border-0 pb-4 last:pb-0">
                      <div className="flex items-center gap-3 mb-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={review.menteeAvatarUrl ?? undefined} />
                          <AvatarFallback className="text-xs bg-muted">{(review.menteeName || "U")[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">{review.menteeName || "Anonymous"}</p>
                          <StarRating rating={review.rating} size="sm" />
                        </div>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {review.comment && <p className="text-sm text-muted-foreground leading-relaxed ml-11">{review.comment}</p>}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Right column - packages */}
          <div className="space-y-4">
            <h2 className="font-semibold text-foreground text-lg">Book a Session</h2>
            {packages && packages.length > 0 ? (
              packages.map((pkg: any) => (
                <PackageCard key={pkg.id} pkg={pkg} mentorId={mentorId} />
              ))
            ) : (
              <Card className="p-6 text-center text-muted-foreground text-sm">
                No packages available yet.
              </Card>
            )}

            {mentor.hourlyRate && (
              <div className="text-center mt-4 p-4 bg-muted/40 rounded-xl">
                <p className="text-sm text-muted-foreground">Base hourly rate</p>
                <p className="text-xl font-bold text-foreground">${mentor.hourlyRate}/hr</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
