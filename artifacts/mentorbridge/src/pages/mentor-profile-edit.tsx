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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  useGetMyMentorProfile,
  useUpdateMyMentorProfile,
  useUpdateMe,
  useListCategories,
  useListMentorPackages,
  getListMentorPackagesQueryKey,
  useCreatePackage,
  useUpdatePackage,
  useGetMentorAvailability,
  useSetMyAvailability,
  getGetMentorAvailabilityQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Briefcase, Award, BookOpen, ShieldCheck } from "lucide-react";

// ── Availability Editor ──

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const DAY_LABELS: Record<number, string> = { 0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat" };

interface DayState {
  dayOfWeek: number;
  isActive: boolean;
  startTime: string;
  endTime: string;
}

function defaultDays(): DayState[] {
  return DAY_ORDER.map((d) => ({
    dayOfWeek: d,
    isActive: d >= 1 && d <= 5,
    startTime: "09:00",
    endTime: "17:00",
  }));
}

function AvailabilitySection({ mentorId }: { mentorId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [days, setDays] = useState<DayState[]>(defaultDays());
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [synced, setSynced] = useState(false);

  const { data: availability, isLoading } = useGetMentorAvailability(mentorId, {
    query: { enabled: !!mentorId, queryKey: getGetMentorAvailabilityQueryKey(mentorId) },
  });
  const { mutate: setAvailability, isPending: saving } = useSetMyAvailability();

  useEffect(() => {
    if (availability && !synced) {
      setSynced(true);
      if (availability.length > 0 && availability[0].timezone) {
        setTimezone(availability[0].timezone);
      }
      setDays(
        DAY_ORDER.map((d) => {
          const existing = availability.find((a) => a.dayOfWeek === d);
          return existing
            ? { dayOfWeek: d, isActive: existing.isActive, startTime: existing.startTime, endTime: existing.endTime }
            : { dayOfWeek: d, isActive: false, startTime: "09:00", endTime: "17:00" };
        })
      );
    }
  }, [availability, synced]);

  function toggleDay(dow: number) {
    setDays((prev) => prev.map((d) => d.dayOfWeek === dow ? { ...d, isActive: !d.isActive } : d));
  }

  function updateTime(dow: number, field: "startTime" | "endTime", value: string) {
    setDays((prev) => prev.map((d) => d.dayOfWeek === dow ? { ...d, [field]: value } : d));
  }

  function save() {
    const activeDays = days.filter((d) => d.isActive);
    setAvailability(
      {
        data: {
          availability: activeDays.map((d) => ({
            dayOfWeek: d.dayOfWeek,
            startTime: d.startTime,
            endTime: d.endTime,
            isActive: true,
          })),
          timezone,
        } as any,
      },
      {
        onSuccess: () => {
          toast({ title: "Availability saved!", description: "Mentees will see your available slots when booking." });
          queryClient.invalidateQueries({ queryKey: getGetMentorAvailabilityQueryKey(mentorId) });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  if (isLoading) return <Skeleton className="h-48 rounded-xl" />;

  return (
    <Card className="p-6 space-y-5">
      <div>
        <h2 className="font-semibold text-foreground">Availability</h2>
        <p className="text-xs text-muted-foreground mt-1">Set the days and times you're available for sessions. Mentees will see open slots when booking.</p>
      </div>

      <div className="space-y-3">
        {days.map((day) => (
          <div key={day.dayOfWeek} className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => toggleDay(day.dayOfWeek)}
              data-testid={`toggle-day-${day.dayOfWeek}`}
              className={`min-w-[48px] text-xs font-semibold py-1.5 px-2 rounded-lg border transition-colors ${
                day.isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              {DAY_LABELS[day.dayOfWeek]}
            </button>
            {day.isActive ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  type="time"
                  value={day.startTime}
                  onChange={(e) => updateTime(day.dayOfWeek, "startTime", e.target.value)}
                  className="h-8 text-sm w-32"
                  data-testid={`start-time-${day.dayOfWeek}`}
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={day.endTime}
                  onChange={(e) => updateTime(day.dayOfWeek, "endTime", e.target.value)}
                  className="h-8 text-sm w-32"
                  data-testid={`end-time-${day.dayOfWeek}`}
                />
              </div>
            ) : (
              <span className="text-xs text-muted-foreground flex-1">Unavailable</span>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Timezone</Label>
        <Input
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          placeholder="e.g. America/New_York"
          className="h-8 text-sm"
          data-testid="timezone-input"
        />
        <p className="text-xs text-muted-foreground">Use IANA timezone names (e.g. America/New_York, Europe/London)</p>
      </div>

      <Button
        type="button"
        onClick={save}
        disabled={saving}
        variant="outline"
        className="w-full"
        data-testid="save-availability-btn"
      >
        {saving ? "Saving availability..." : "Save Availability"}
      </Button>
    </Card>
  );
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function EditContent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: mentor, isLoading } = useGetMyMentorProfile();
  const { data: categories, isLoading: categoriesLoading, isError: categoriesError } = useListCategories();
  const { mutate: updateProfile, isPending } = useUpdateMyMentorProfile();
  const { mutate: updateMe } = useUpdateMe();
  const { data: packages } = useListMentorPackages(mentor?.id ?? 0, { query: { enabled: !!mentor?.id, queryKey: getListMentorPackagesQueryKey(mentor?.id ?? 0) } });
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
  });

  // ── Experience ──
  const [experiences, setExperiences] = useState<Array<{ id: string; title: string; company: string; location: string; startDate: string; endDate: string; isCurrent: boolean; description: string }>>([]);
  function addExperience() {
    setExperiences((prev) => [...prev, { id: uid(), title: "", company: "", location: "", startDate: "", endDate: "", isCurrent: false, description: "" }]);
  }
  function removeExperience(id: string) {
    setExperiences((prev) => prev.filter((e) => e.id !== id));
  }
  function updateExperience(id: string, key: string, value: any) {
    setExperiences((prev) => prev.map((e) => e.id === id ? { ...e, [key]: value } : e));
  }

  // ── Honors & Awards ──
  const [honorsAwards, setHonorsAwards] = useState<Array<{ id: string; title: string; issuer: string; date: string; description: string }>>([]);
  function addHonor() {
    setHonorsAwards((prev) => [...prev, { id: uid(), title: "", issuer: "", date: "", description: "" }]);
  }
  function removeHonor(id: string) {
    setHonorsAwards((prev) => prev.filter((h) => h.id !== id));
  }
  function updateHonor(id: string, key: string, value: string) {
    setHonorsAwards((prev) => prev.map((h) => h.id === id ? { ...h, [key]: value } : h));
  }

  // ── Publications ──
  const [publications, setPublications] = useState<Array<{ id: string; title: string; publisher: string; url: string; date: string; description: string }>>([]);
  function addPublication() {
    setPublications((prev) => [...prev, { id: uid(), title: "", publisher: "", url: "", date: "", description: "" }]);
  }
  function removePublication(id: string) {
    setPublications((prev) => prev.filter((p) => p.id !== id));
  }
  function updatePublication(id: string, key: string, value: string) {
    setPublications((prev) => prev.map((p) => p.id === id ? { ...p, [key]: value } : p));
  }

  // ── Certifications ──
  const [certifications, setCertifications] = useState<Array<{ id: string; name: string; issuer: string; issueDate: string; expiryDate: string; credentialId: string }>>([]);
  function addCert() {
    setCertifications((prev) => [...prev, { id: uid(), name: "", issuer: "", issueDate: "", expiryDate: "", credentialId: "" }]);
  }
  function removeCert(id: string) {
    setCertifications((prev) => prev.filter((c) => c.id !== id));
  }
  function updateCert(id: string, key: string, value: string) {
    setCertifications((prev) => prev.map((c) => c.id === id ? { ...c, [key]: value } : c));
  }

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
      });
      setExperiences((mentor.experiences ?? []).map((e: any) => ({ ...e, id: e.id || uid() })));
      setHonorsAwards((mentor.honorsAwards ?? []).map((h: any) => ({ ...h, id: h.id || uid() })));
      setPublications((mentor.publications ?? []).map((p: any) => ({ ...p, id: p.id || uid() })));
      setCertifications((mentor.certifications ?? []).map((c: any) => ({ ...c, id: c.id || uid() })));
    }
  }, [mentor]);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    const tags = form.expertiseTags.split(",").map((t) => t.trim()).filter(Boolean);
    const langs = form.languages.split(",").map((l) => l.trim()).filter(Boolean);
    const bioWords = form.bio.trim().split(/\s+/).filter(Boolean).length;

    if (!fullName.trim()) {
      toast({ title: "Full name required", description: "Please enter your full name.", variant: "destructive" });
      return;
    }
    if (!form.headline.trim()) {
      toast({ title: "Headline required", description: "Please add a professional headline.", variant: "destructive" });
      return;
    }
    if (!form.bio.trim()) {
      toast({ title: "Bio required", description: "Please tell potential mentees about your background.", variant: "destructive" });
      return;
    }
    if (bioWords > 500) {
      toast({ title: "Bio too long", description: `Your bio is ${bioWords} words. Please keep it under 500 words.`, variant: "destructive" });
      return;
    }
    if (!form.industry.trim()) {
      toast({ title: "Industry required", description: "Please enter your industry.", variant: "destructive" });
      return;
    }
    if (!form.categoryId) {
      toast({ title: "Category required", description: "Please select a category.", variant: "destructive" });
      return;
    }
    if (tags.length === 0) {
      toast({ title: "Expertise tags required", description: "Please add at least one expertise tag.", variant: "destructive" });
      return;
    }
    if (!form.yearsExperience || parseInt(form.yearsExperience) < 0) {
      toast({ title: "Years of experience required", description: "Please enter your years of experience.", variant: "destructive" });
      return;
    }
    if (!form.hourlyRate || parseFloat(form.hourlyRate) <= 0) {
      toast({ title: "Hourly rate required", description: "Please enter your hourly rate.", variant: "destructive" });
      return;
    }
    if (langs.length === 0) {
      toast({ title: "Languages required", description: "Please enter at least one language you speak.", variant: "destructive" });
      return;
    }

    updateMe({ data: { fullName: fullName.trim() } } as any);

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
          experiences: experiences.length > 0 ? experiences : undefined,
          honorsAwards: honorsAwards.length > 0 ? honorsAwards : undefined,
          publications: publications.length > 0 ? publications : undefined,
          certifications: certifications.length > 0 ? certifications : undefined,
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
        {/* ── BASIC PROFILE ── */}
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
            <Label htmlFor="bio">Bio <span className="text-destructive">*</span></Label>
            <Textarea id="bio" rows={5} value={form.bio} onChange={(e) => update("bio", e.target.value)} data-testid="edit-bio" maxLength={3000} />
            <p className="text-xs text-muted-foreground text-right">{form.bio.trim().split(/\s+/).filter(Boolean).length} / 500 words</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">Industry <span className="text-destructive">*</span></Label>
              <Input id="industry" value={form.industry} onChange={(e) => update("industry", e.target.value)} data-testid="edit-industry" />
            </div>
            <div className="space-y-2">
              <Label>Category <span className="text-destructive">*</span></Label>
              <Select value={form.categoryId} onValueChange={(v) => update("categoryId", v)}>
                <SelectTrigger data-testid="edit-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesLoading ? (
                    <SelectItem value="__loading" disabled>Loading categories...</SelectItem>
                  ) : categoriesError ? (
                    <SelectItem value="__error" disabled>Categories unavailable</SelectItem>
                  ) : categories && categories.length > 0 ? (
                    categories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__empty" disabled>No categories available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Expertise Tags <span className="text-destructive">*</span></Label>
            <Input placeholder="Comma-separated tags" value={form.expertiseTags} onChange={(e) => update("expertiseTags", e.target.value)} data-testid="edit-tags" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Years of Experience <span className="text-destructive">*</span></Label>
              <Input type="number" min="0" value={form.yearsExperience} onChange={(e) => update("yearsExperience", e.target.value)} data-testid="edit-years" />
            </div>
            <div className="space-y-2">
              <Label>Hourly Rate ($) <span className="text-destructive">*</span></Label>
              <Input type="number" min="0" value={form.hourlyRate} onChange={(e) => update("hourlyRate", e.target.value)} data-testid="edit-rate" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Languages <span className="text-destructive">*</span></Label>
            <Input placeholder="Comma-separated: e.g. English, Spanish" value={form.languages} onChange={(e) => update("languages", e.target.value)} data-testid="edit-languages" />
          </div>
        </Card>

        {/* ── EXPERIENCE ── */}
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">Experience</h2>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addExperience} className="gap-1">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          {experiences.length === 0 && <p className="text-sm text-muted-foreground">Add your work history to build credibility.</p>}
          <div className="space-y-4">
            {experiences.map((exp) => (
              <div key={exp.id} className="rounded-xl border border-border p-4 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Position</span>
                  <button type="button" onClick={() => removeExperience(exp.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Title</Label>
                    <Input value={exp.title} onChange={(e) => updateExperience(exp.id, "title", e.target.value)} placeholder="e.g. VP of Product" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Company</Label>
                    <Input value={exp.company} onChange={(e) => updateExperience(exp.id, "company", e.target.value)} placeholder="e.g. Google" className="h-9" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Location</Label>
                    <Input value={exp.location} onChange={(e) => updateExperience(exp.id, "location", e.target.value)} placeholder="e.g. San Francisco, CA" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Start Date</Label>
                    <Input type="month" value={exp.startDate} onChange={(e) => updateExperience(exp.id, "startDate", e.target.value)} className="h-9" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">End Date</Label>
                    <Input type="month" value={exp.endDate} onChange={(e) => updateExperience(exp.id, "endDate", e.target.value)} disabled={exp.isCurrent} className="h-9" />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <Checkbox id={`current-${exp.id}`} checked={exp.isCurrent} onCheckedChange={(v) => updateExperience(exp.id, "isCurrent", !!v)} />
                    <Label htmlFor={`current-${exp.id}`} className="text-xs cursor-pointer">I currently work here</Label>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Summary</Label>
                  <Textarea value={exp.description} onChange={(e) => updateExperience(exp.id, "description", e.target.value)} placeholder="Brief overview of your role and achievements..." rows={2} className="text-sm" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── HONORS & AWARDS ── */}
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">Honors & Awards</h2>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addHonor} className="gap-1">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          {honorsAwards.length === 0 && <p className="text-sm text-muted-foreground">Add recognitions that show your impact.</p>}
          <div className="space-y-4">
            {honorsAwards.map((h) => (
              <div key={h.id} className="rounded-xl border border-border p-4 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Award</span>
                  <button type="button" onClick={() => removeHonor(h.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Title</Label>
                    <Input value={h.title} onChange={(e) => updateHonor(h.id, "title", e.target.value)} placeholder="e.g. 40 Under 40" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Issuer</Label>
                    <Input value={h.issuer} onChange={(e) => updateHonor(h.id, "issuer", e.target.value)} placeholder="e.g. Forbes" className="h-9" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Date</Label>
                    <Input type="month" value={h.date} onChange={(e) => updateHonor(h.id, "date", e.target.value)} className="h-9" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Textarea value={h.description} onChange={(e) => updateHonor(h.id, "description", e.target.value)} placeholder="What was this award for?" rows={2} className="text-sm" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── PUBLICATIONS ── */}
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">Publications</h2>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addPublication} className="gap-1">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          {publications.length === 0 && <p className="text-sm text-muted-foreground">Add articles, papers, or books you've authored.</p>}
          <div className="space-y-4">
            {publications.map((p) => (
              <div key={p.id} className="rounded-xl border border-border p-4 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Publication</span>
                  <button type="button" onClick={() => removePublication(p.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Title</Label>
                    <Input value={p.title} onChange={(e) => updatePublication(p.id, "title", e.target.value)} placeholder="e.g. The Product Manager's Playbook" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Publisher</Label>
                    <Input value={p.publisher} onChange={(e) => updatePublication(p.id, "publisher", e.target.value)} placeholder="e.g. Harvard Business Review" className="h-9" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">URL</Label>
                    <Input type="url" value={p.url} onChange={(e) => updatePublication(p.id, "url", e.target.value)} placeholder="https://..." className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Date</Label>
                    <Input type="month" value={p.date} onChange={(e) => updatePublication(p.id, "date", e.target.value)} className="h-9" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Textarea value={p.description} onChange={(e) => updatePublication(p.id, "description", e.target.value)} placeholder="Brief summary..." rows={2} className="text-sm" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── CERTIFICATIONS ── */}
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-foreground">Certifications</h2>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addCert} className="gap-1">
              <Plus className="h-4 w-4" /> Add
            </Button>
          </div>
          {certifications.length === 0 && <p className="text-sm text-muted-foreground">Add credentials that validate your expertise.</p>}
          <div className="space-y-4">
            {certifications.map((c) => (
              <div key={c.id} className="rounded-xl border border-border p-4 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Certification</span>
                  <button type="button" onClick={() => removeCert(c.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input value={c.name} onChange={(e) => updateCert(c.id, "name", e.target.value)} placeholder="e.g. AWS Solutions Architect" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Issuing Organization</Label>
                    <Input value={c.issuer} onChange={(e) => updateCert(c.id, "issuer", e.target.value)} placeholder="e.g. Amazon Web Services" className="h-9" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Issue Date</Label>
                    <Input type="month" value={c.issueDate} onChange={(e) => updateCert(c.id, "issueDate", e.target.value)} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Expiry Date</Label>
                    <Input type="month" value={c.expiryDate} onChange={(e) => updateCert(c.id, "expiryDate", e.target.value)} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Credential ID</Label>
                    <Input value={c.credentialId} onChange={(e) => updateCert(c.id, "credentialId", e.target.value)} placeholder="Optional" className="h-9" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── LINKS & MEDIA ── */}
        <Card className="p-6 space-y-5">
          <h2 className="font-semibold text-foreground">Links & Media</h2>

          <div className="space-y-2">
            <Label>LinkedIn URL</Label>
            <Input type="url" placeholder="https://linkedin.com/in/..." value={form.linkedinUrl} onChange={(e) => update("linkedinUrl", e.target.value)} data-testid="edit-linkedin" />
          </div>

          <div className="space-y-2">
            <Label>Intro Video URL</Label>
            <Input type="url" placeholder="https://youtube.com/watch?v=..." value={form.introVideoUrl} onChange={(e) => update("introVideoUrl", e.target.value)} data-testid="edit-video" />
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

        {/* Availability */}
        {mentor?.id && <AvailabilitySection mentorId={mentor.id} />}

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
