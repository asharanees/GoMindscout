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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateMentorProfile, useCreatePackage, useListCategories, useUpdateMe, useSetMyAvailability } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Plus, Trash2, Briefcase, Award, BookOpen, ShieldCheck } from "lucide-react";

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const DAY_LABELS: Record<number, string> = { 0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat" };

interface DayState { dayOfWeek: number; isActive: boolean; startTime: string; endTime: string; }

function defaultDays(): DayState[] {
  return DAY_ORDER.map((d) => ({ dayOfWeek: d, isActive: d >= 1 && d <= 5, startTime: "09:00", endTime: "17:00" }));
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function OnboardingContent() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const { data: categories } = useListCategories();
  const { mutate: createProfile, isPending: profilePending } = useCreateMentorProfile();
  const { mutate: createPackage } = useCreatePackage();
  const { mutate: updateMe } = useUpdateMe();
  const { mutate: setAvailability } = useSetMyAvailability();

  const [days, setDays] = useState<DayState[]>(defaultDays());
  const [timezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);

  function toggleDay(dow: number) {
    setDays((prev) => prev.map((d) => d.dayOfWeek === dow ? { ...d, isActive: !d.isActive } : d));
  }
  function updateTime(dow: number, field: "startTime" | "endTime", value: string) {
    setDays((prev) => prev.map((d) => d.dayOfWeek === dow ? { ...d, [field]: value } : d));
  }

  const [form, setForm] = useState({
    fullName: "",
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

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const tags = form.expertiseTags.split(",").map((t) => t.trim()).filter(Boolean);
    const langs = form.languages.split(",").map((l) => l.trim()).filter(Boolean);
    const bioWords = form.bio.trim().split(/\s+/).filter(Boolean).length;

    if (!form.fullName.trim()) {
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

    // Save name to user record first
    if (form.fullName.trim()) {
      updateMe({ data: { fullName: form.fullName.trim() } } as any);
    }

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
          experiences: experiences.length > 0 ? experiences : undefined,
          honorsAwards: honorsAwards.length > 0 ? honorsAwards : undefined,
          publications: publications.length > 0 ? publications : undefined,
          certifications: certifications.length > 0 ? certifications : undefined,
        } as any,
      },
      {
        onSuccess: () => {
          // Create default packages
          const defaultPackages = [
            { title: "30-min Intro Call", description: "A quick intro session to discuss your goals and how I can help.", type: "video_30", durationMinutes: 30, price: form.hourlyRate ? parseFloat(form.hourlyRate) / 2 : 75 },
            { title: "60-min Deep Dive", description: "An in-depth session to tackle your specific challenge.", type: "video_60", durationMinutes: 60, price: form.hourlyRate ? parseFloat(form.hourlyRate) : 150 },
          ];
          defaultPackages.forEach((pkg) => {
            createPackage({ data: { ...pkg, price: pkg.price } as any });
          });

          // Save availability
          const activeDays = days.filter((d) => d.isActive);
          if (activeDays.length > 0) {
            setAvailability({
              data: {
                availability: activeDays.map((d) => ({
                  dayOfWeek: d.dayOfWeek,
                  startTime: d.startTime,
                  endTime: d.endTime,
                  isActive: true,
                })),
                timezone,
              } as any,
            });
          }

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
              Your mentor profile is now under review. Our team will approve it within 1-2 business days. You'll receive a notification once you're live.
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
        {/* ── BASIC PROFILE ── */}
        <Card className="p-6 space-y-5">
          <h2 className="font-semibold text-foreground">Your Professional Profile</h2>

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name <span className="text-destructive">*</span></Label>
            <Input id="fullName" placeholder="e.g. Jane Smith" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} data-testid="fullname-input" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="headline">Professional Headline <span className="text-destructive">*</span></Label>
            <Input id="headline" placeholder="e.g. Senior Product Manager at Google | 10 years in fintech" value={form.headline} onChange={(e) => update("headline", e.target.value)} data-testid="headline-input" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio <span className="text-destructive">*</span></Label>
            <Textarea id="bio" placeholder="Tell potential mentees about your background, what you've built, and how you can help..." rows={5} value={form.bio} onChange={(e) => update("bio", e.target.value)} data-testid="bio-input" />
            <p className="text-xs text-muted-foreground text-right">{form.bio.trim().split(/\s+/).filter(Boolean).length} / 500 words</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">Industry <span className="text-destructive">*</span></Label>
              <Input id="industry" placeholder="e.g. Fintech, Healthcare" value={form.industry} onChange={(e) => update("industry", e.target.value)} data-testid="industry-input" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
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
            <Label htmlFor="expertise">Expertise Tags <span className="text-destructive">*</span></Label>
            <Input id="expertise" placeholder="Comma-separated: e.g. Product Strategy, GTM, Fundraising" value={form.expertiseTags} onChange={(e) => update("expertiseTags", e.target.value)} data-testid="expertise-input" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="years">Years of Experience <span className="text-destructive">*</span></Label>
              <Input id="years" type="number" min="0" placeholder="e.g. 10" value={form.yearsExperience} onChange={(e) => update("yearsExperience", e.target.value)} data-testid="years-input" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate">Hourly Rate (USD) <span className="text-destructive">*</span></Label>
              <Input id="rate" type="number" min="0" placeholder="e.g. 200" value={form.hourlyRate} onChange={(e) => update("hourlyRate", e.target.value)} data-testid="rate-input" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="languages">Languages Spoken <span className="text-destructive">*</span></Label>
            <Input id="languages" placeholder="Comma-separated: e.g. English, Spanish" value={form.languages} onChange={(e) => update("languages", e.target.value)} data-testid="languages-input" />
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
            <Label htmlFor="linkedin">LinkedIn URL</Label>
            <Input id="linkedin" type="url" placeholder="https://linkedin.com/in/yourprofile" value={form.linkedinUrl} onChange={(e) => update("linkedinUrl", e.target.value)} data-testid="linkedin-input" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="video">Intro Video URL</Label>
            <Input id="video" type="url" placeholder="https://youtube.com/watch?v=..." value={form.introVideoUrl} onChange={(e) => update("introVideoUrl", e.target.value)} data-testid="video-input" />
          </div>

        </Card>

        {/* ── AVAILABILITY ── */}
        <Card className="p-6 space-y-5">
          <div>
            <h2 className="font-semibold text-foreground">Availability</h2>
            <p className="text-xs text-muted-foreground mt-1">Set your weekly availability so mentees can book slots. You can update this anytime from your profile.</p>
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
          <p className="text-xs text-muted-foreground">Timezone: <strong>{timezone}</strong> (detected from your browser)</p>
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
