import { useEffect, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  useGetMyMentorProfile,
  useUpdateMyMentorProfile,
  useUpdateMe,
  useListCategories,
  useListMentorPackages,
  useCreatePackage,
  useUpdatePackage,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

function EditContent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: mentor, isLoading } = useGetMyMentorProfile();
  const { data: categories } = useListCategories();
  const { mutate: updateProfile, isPending } = useUpdateMyMentorProfile();
  const { mutate: updateMe } = useUpdateMe();
  const { data: packages } = useListMentorPackages(mentor?.id ?? 0, { query: { enabled: !!mentor?.id } });
  const { mutate: createPkg } = useCreatePackage();
  const { mutate: updatePkg } = useUpdatePackage();

  const [fullName, setFullName] = useState("");
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

  useEffect(() => {
    if (mentor) {
      if (mentor.fullName) setFullName(mentor.fullName);
      setForm({
        headline: mentor.headline ?? "",
        bio: mentor.bio ?? "",
        industry: mentor.industry ?? "",
        categoryId: mentor.categoryId ? String(mentor.categoryId) : "",
        expertiseTags: (mentor.expertiseTags ?? []).join(", "),
        yearsExperience: mentor.yearsExperience ? String(mentor.yearsExperience) : "",
        languages: (mentor.languages ?? []).join(", "),
        hourlyRate: mentor.hourlyRate ? String(mentor.hourlyRate) : "",
        introVideoUrl: mentor.introVideoUrl ?? "",
        linkedinUrl: mentor.linkedinUrl ?? "",
        calendlyUrl: mentor.calendlyUrl ?? "",
      });
    }
  }, [mentor]);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    const tags = form.expertiseTags.split(",").map((t) => t.trim()).filter(Boolean);
    const langs = form.languages.split(",").map((l) => l.trim()).filter(Boolean);

    // Update display name
    if (fullName.trim()) {
      updateMe({ data: { fullName: fullName.trim() } } as any);
    }

    updateProfile(
      {
        data: {
          headline: form.headline,
          bio: form.bio || undefined,
          industry: form.industry || undefined,
          categoryId: form.categoryId ? parseInt(form.categoryId) : undefined,
          expertiseTags: tags,
          yearsExperience: form.yearsExperience ? parseInt(form.yearsExperience) : undefined,
          languages: langs,
          hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : undefined,
          introVideoUrl: form.introVideoUrl || undefined,
          linkedinUrl: form.linkedinUrl || undefined,
          calendlyUrl: form.calendlyUrl || undefined,
        } as any,
      },
      {
        onSuccess: () => {
          toast({ title: "Profile updated!" });
          setLocation("/mentor/dashboard");
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err.message || "Update failed.", variant: "destructive" });
        },
      }
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-12 w-full space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!mentor) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">No mentor profile found.</p>
            <Button onClick={() => setLocation("/mentor/onboarding")} className="bg-primary hover:bg-primary/90">Create Profile</Button>
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
          <h1 className="text-2xl font-bold text-foreground">Edit Mentor Profile</h1>
          <p className="text-muted-foreground text-sm mt-1">Keep your profile up to date to attract more mentees</p>
        </div>
      </div>

      <form onSubmit={save} className="flex-1 max-w-2xl mx-auto px-4 py-8 w-full space-y-6">
        <Card className="p-6 space-y-5">
          <h2 className="font-semibold text-foreground">Professional Profile</h2>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              placeholder="Your full name as shown on your profile"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              data-testid="edit-fullname"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="headline">Headline <span className="text-destructive">*</span></Label>
            <Input id="headline" value={form.headline} onChange={(e) => update("headline", e.target.value)} data-testid="edit-headline" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" rows={5} value={form.bio} onChange={(e) => update("bio", e.target.value)} data-testid="edit-bio" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" value={form.industry} onChange={(e) => update("industry", e.target.value)} data-testid="edit-industry" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.categoryId} onValueChange={(v) => update("categoryId", v)}>
                <SelectTrigger data-testid="edit-category">
                  <SelectValue placeholder="Select category" />
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
            <Label>Expertise Tags</Label>
            <Input placeholder="Comma-separated tags" value={form.expertiseTags} onChange={(e) => update("expertiseTags", e.target.value)} data-testid="edit-tags" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Years of Experience</Label>
              <Input type="number" min="0" value={form.yearsExperience} onChange={(e) => update("yearsExperience", e.target.value)} data-testid="edit-years" />
            </div>
            <div className="space-y-2">
              <Label>Hourly Rate ($)</Label>
              <Input type="number" min="0" value={form.hourlyRate} onChange={(e) => update("hourlyRate", e.target.value)} data-testid="edit-rate" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Languages</Label>
            <Input placeholder="Comma-separated: e.g. English, Spanish" value={form.languages} onChange={(e) => update("languages", e.target.value)} data-testid="edit-languages" />
          </div>
        </Card>

        <Card className="p-6 space-y-5">
          <h2 className="font-semibold text-foreground">Links & Media</h2>

          <div className="space-y-2">
            <Label>LinkedIn URL</Label>
            <Input type="url" placeholder="https://linkedin.com/in/..." value={form.linkedinUrl} onChange={(e) => update("linkedinUrl", e.target.value)} data-testid="edit-linkedin" />
          </div>

          <div className="space-y-2">
            <Label>Intro Video (YouTube)</Label>
            <Input type="url" placeholder="https://youtube.com/watch?v=..." value={form.introVideoUrl} onChange={(e) => update("introVideoUrl", e.target.value)} data-testid="edit-video" />
          </div>

          <div className="space-y-2">
            <Label>Calendly URL</Label>
            <Input type="url" placeholder="https://calendly.com/..." value={form.calendlyUrl} onChange={(e) => update("calendlyUrl", e.target.value)} data-testid="edit-calendly" />
          </div>
        </Card>

        {/* Packages */}
        {packages && packages.length > 0 && (
          <Card className="p-6">
            <h2 className="font-semibold text-foreground mb-4">Your Packages</h2>
            <div className="space-y-3">
              {packages.map((pkg: any) => (
                <div key={pkg.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium text-sm text-foreground">{pkg.title}</p>
                    <p className="text-xs text-muted-foreground">{pkg.type} · ${Number(pkg.price).toFixed(0)}</p>
                  </div>
                  <Badge variant={pkg.isActive ? "secondary" : "outline"} className="text-xs">
                    {pkg.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setLocation("/mentor/dashboard")}>Cancel</Button>
          <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90" disabled={isPending} data-testid="save-profile-btn">
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>

      <Footer />
    </div>
  );
}

export default function MentorProfileEditPage() {
  return (
    <ProtectedRoute>
      <EditContent />
    </ProtectedRoute>
  );
}
