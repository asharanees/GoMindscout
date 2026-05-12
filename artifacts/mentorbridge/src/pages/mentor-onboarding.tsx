import { useState } from "react";
import { useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateMentorProfile, useCreatePackage, useListCategories } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle } from "lucide-react";

function OnboardingContent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const { data: categories } = useListCategories();
  const { mutate: createProfile, isPending: profilePending } = useCreateMentorProfile();
  const { mutate: createPackage } = useCreatePackage();

  const [form, setForm] = useState({
    headline: "",
    bio: "",
    industry: "",
    categoryId: "",
    expertiseTags: "",
    yearsExperience: "",
    languages: "",
    hourlyRate: "",
    introVideoUrl: "",
    linkedinUrl: "",
    calendlyUrl: "",
  });

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.headline.trim()) {
      toast({ title: "Headline required", description: "Please add a professional headline.", variant: "destructive" });
      return;
    }

    const tags = form.expertiseTags.split(",").map((t) => t.trim()).filter(Boolean);
    const langs = form.languages.split(",").map((l) => l.trim()).filter(Boolean);

    createProfile(
      {
        data: {
          headline: form.headline,
          bio: form.bio || undefined,
          industry: form.industry || undefined,
          categoryId: form.categoryId ? parseInt(form.categoryId) : undefined,
          expertiseTags: tags,
          yearsExperience: form.yearsExperience ? parseInt(form.yearsExperience) : undefined,
          languages: langs.length > 0 ? langs : ["English"],
          hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : undefined,
          introVideoUrl: form.introVideoUrl || undefined,
          linkedinUrl: form.linkedinUrl || undefined,
          calendlyUrl: form.calendlyUrl || undefined,
        } as any,
      },
      {
        onSuccess: () => {
          // Create default packages
          const defaultPackages = [
            { title: "30-min Intro Call", description: "A quick intro session to discuss your goals and how I can help.", type: "video_30", durationMinutes: 30, price: form.hourlyRate ? parseFloat(form.hourlyRate) / 2 : 75 },
            { title: "60-min Deep Dive", description: "An in-depth session to tackle your specific challenge.", type: "video_60", durationMinutes: 60, price: form.hourlyRate ? parseFloat(form.hourlyRate) : 150 },
            { title: "Email Advice", description: "Send me a detailed question and I'll give you thorough written guidance.", type: "email", price: 49 },
          ];

          defaultPackages.forEach((pkg) => {
            createPackage({ data: { ...pkg, price: pkg.price } as any });
          });

          setSubmitted(true);
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message || "Failed to create profile.", variant: "destructive" });
        },
      }
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-md text-center">
            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">Profile Submitted!</h1>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Your mentor profile is now under review. Our team will approve it within 1–2 business days. You'll receive a notification once you're live.
            </p>
            <Button onClick={() => setLocation("/mentor/dashboard")} className="bg-primary hover:bg-primary/90" data-testid="go-to-mentor-dashboard">
              Go to Mentor Dashboard
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="bg-primary/5 border-b border-border py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground">Become a Mentor</h1>
          <p className="text-muted-foreground text-sm mt-1">Share your expertise and help others grow professionally</p>
        </div>
      </div>

      <form onSubmit={submit} className="flex-1 max-w-2xl mx-auto px-4 py-8 w-full space-y-6">
        <Card className="p-6 space-y-5">
          <h2 className="font-semibold text-foreground">Your Professional Profile</h2>

          <div className="space-y-2">
            <Label htmlFor="headline">Professional Headline <span className="text-destructive">*</span></Label>
            <Input id="headline" placeholder="e.g. Senior Product Manager at Google | 10 years in fintech" value={form.headline} onChange={(e) => update("headline", e.target.value)} data-testid="headline-input" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" placeholder="Tell potential mentees about your background, what you've built, and how you can help..." rows={5} value={form.bio} onChange={(e) => update("bio", e.target.value)} data-testid="bio-input" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" placeholder="e.g. Fintech, Healthcare" value={form.industry} onChange={(e) => update("industry", e.target.value)} data-testid="industry-input" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={form.categoryId} onValueChange={(v) => update("categoryId", v)}>
                <SelectTrigger id="category" data-testid="category-select">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {(categories ?? []).map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expertise">Expertise Tags</Label>
            <Input id="expertise" placeholder="Comma-separated: e.g. Product Strategy, GTM, Fundraising" value={form.expertiseTags} onChange={(e) => update("expertiseTags", e.target.value)} data-testid="expertise-input" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="years">Years of Experience</Label>
              <Input id="years" type="number" min="0" placeholder="e.g. 10" value={form.yearsExperience} onChange={(e) => update("yearsExperience", e.target.value)} data-testid="years-input" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate">Hourly Rate (USD)</Label>
              <Input id="rate" type="number" min="0" placeholder="e.g. 200" value={form.hourlyRate} onChange={(e) => update("hourlyRate", e.target.value)} data-testid="rate-input" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="languages">Languages Spoken</Label>
            <Input id="languages" placeholder="Comma-separated: e.g. English, Spanish" value={form.languages} onChange={(e) => update("languages", e.target.value)} data-testid="languages-input" />
          </div>
        </Card>

        <Card className="p-6 space-y-5">
          <h2 className="font-semibold text-foreground">Links & Media</h2>

          <div className="space-y-2">
            <Label htmlFor="linkedin">LinkedIn URL</Label>
            <Input id="linkedin" type="url" placeholder="https://linkedin.com/in/yourprofile" value={form.linkedinUrl} onChange={(e) => update("linkedinUrl", e.target.value)} data-testid="linkedin-input" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="video">Intro Video URL (YouTube)</Label>
            <Input id="video" type="url" placeholder="https://youtube.com/watch?v=..." value={form.introVideoUrl} onChange={(e) => update("introVideoUrl", e.target.value)} data-testid="video-input" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="calendly">Calendly URL (optional)</Label>
            <Input id="calendly" type="url" placeholder="https://calendly.com/yourname" value={form.calendlyUrl} onChange={(e) => update("calendlyUrl", e.target.value)} data-testid="calendly-input" />
          </div>
        </Card>

        <Button type="submit" className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90" disabled={profilePending} data-testid="submit-profile-btn">
          {profilePending ? "Submitting..." : "Submit Profile for Review"}
        </Button>
      </form>

      <Footer />
    </div>
  );
}

export default function MentorOnboardingPage() {
  return (
    <ProtectedRoute>
      <OnboardingContent />
    </ProtectedRoute>
  );
}
