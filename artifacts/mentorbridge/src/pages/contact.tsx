import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, MessageSquare, HelpCircle } from "lucide-react";

export default function ContactPage() {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // In production, this would send to a real API endpoint
    setSent(true);
    toast({ title: "Message sent!", description: "We'll get back to you within 1 business day." });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="bg-primary/5 border-b border-border py-12 px-4 text-center">
        <div className="max-w-xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-2">Contact Us</h1>
          <p className="text-muted-foreground">Have a question or need help? We typically respond within one business day.</p>
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto px-4 py-12 w-full">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="space-y-5">
            {[
              { icon: <Mail className="h-5 w-5 text-primary" />, title: "Email Us", desc: "support@gomindscout.com", sub: "For general questions" },
              { icon: <MessageSquare className="h-5 w-5 text-primary" />, title: "Mentor Support", desc: "support@gomindscout.com", sub: "For mentor-specific issues" },
              { icon: <HelpCircle className="h-5 w-5 text-primary" />, title: "Response Time", desc: "Within 1 business day", sub: "Mon-Fri, 9am-6pm EST" },
            ].map(({ icon, title, desc, sub }) => (
              <Card key={title} className="p-4 flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">{icon}</div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{title}</p>
                  <p className="text-sm text-primary">{desc}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
              </Card>
            ))}
          </div>

          <div className="md:col-span-2">
            <Card className="p-6">
              {sent ? (
                <div className="text-center py-8">
                  <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <Mail className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">Message Sent!</h2>
                  <p className="text-muted-foreground text-sm">We'll get back to you at {form.email} within one business day.</p>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <h2 className="font-semibold text-foreground mb-4">Send a Message</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="contact-name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="contact-email" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input id="subject" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} data-testid="contact-subject" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea id="message" rows={5} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} data-testid="contact-message" />
                  </div>
                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90" data-testid="contact-submit">Send Message</Button>
                </form>
              )}
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
