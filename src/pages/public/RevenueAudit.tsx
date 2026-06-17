import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import curveLogo from "@/assets/curve-sports-logo.png.asset.json";

type FormState = {
  org_name: string;
  contact_name: string;
  email: string;
  phone: string;
  role: string;
  city_state: string;
  totalPlayers: string;
  avgFeePerPlayer: string;
  currentRetentionPct: string;
  apparelRevenue: string;
  sponsorshipRevenue: string;
  campsClinicsRevenue: string;
  apparelToggle: boolean;
  sponsorshipToggle: boolean;
  retentionToggle: boolean;
  campsToggle: boolean;
  website: string; // honeypot
};

const initial: FormState = {
  org_name: "",
  contact_name: "",
  email: "",
  phone: "",
  role: "",
  city_state: "",
  totalPlayers: "",
  avgFeePerPlayer: "",
  currentRetentionPct: "",
  apparelRevenue: "",
  sponsorshipRevenue: "",
  campsClinicsRevenue: "",
  apparelToggle: true,
  sponsorshipToggle: true,
  retentionToggle: true,
  campsToggle: true,
  website: "",
};

export default function RevenueAudit() {
  const [form, setForm] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.org_name.trim() || !form.contact_name.trim() || !form.email.trim() || !form.phone.trim()) {
      toast({ title: "Missing info", description: "Please fill in org name, your name, email, and phone.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-revenue-audit", {
        body: {
          org_name: form.org_name,
          contact_name: form.contact_name,
          email: form.email,
          phone: form.phone,
          role: form.role,
          city_state: form.city_state,
          website: form.website,
          inputs: {
            totalPlayers: Number(form.totalPlayers) || 0,
            avgFeePerPlayer: Number(form.avgFeePerPlayer) || 0,
            currentRetentionPct: Number(form.currentRetentionPct) || 0,
            apparelRevenue: Number(form.apparelRevenue) || 0,
            sponsorshipRevenue: Number(form.sponsorshipRevenue) || 0,
            campsClinicsRevenue: Number(form.campsClinicsRevenue) || 0,
            apparelToggle: form.apparelToggle,
            sponsorshipToggle: form.sponsorshipToggle,
            retentionToggle: form.retentionToggle,
            campsToggle: form.campsToggle,
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.reportToken) {
        navigate(`/revenue-audit/report/${data.reportToken}`);
      } else {
        toast({ title: "Thanks!", description: "We received your submission." });
      }
    } catch (err: any) {
      toast({ title: "Submission failed", description: err?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-center">
          <img src={curveLogo.url} alt="Curve Sports" className="h-12 w-auto" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10 text-center">
          <div className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium uppercase tracking-wide mb-4">
            Free Revenue Audit
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            See your untapped revenue in 2 minutes.
          </h1>
          <p className="text-lg text-slate-600 max-w-xl mx-auto">
            Tell us about your organization and we'll show you exactly where the dollars are sitting — and how to capture them.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-8">
          {/* Honeypot */}
          <div className="hidden" aria-hidden>
            <Label htmlFor="website">Website</Label>
            <Input id="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} />
          </div>

          <section className="bg-slate-50 rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-lg">About your organization</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Organization name *">
                <Input value={form.org_name} onChange={(e) => set("org_name", e.target.value)} required />
              </Field>
              <Field label="City, State">
                <Input value={form.city_state} onChange={(e) => set("city_state", e.target.value)} />
              </Field>
              <Field label="Your name *">
                <Input value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} required />
              </Field>
              <Field label="Your role">
                <Input value={form.role} onChange={(e) => set("role", e.target.value)} />
              </Field>
              <Field label="Email *">
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
              </Field>
              <Field label="Phone *">
                <Input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} required />
              </Field>
            </div>
          </section>

          <section className="bg-slate-50 rounded-xl p-6 space-y-4">
            <h2 className="font-semibold text-lg">Your numbers</h2>
            <p className="text-sm text-slate-600">Best estimates are fine. We'll do the math.</p>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Total players">
                <Input type="number" min="0" value={form.totalPlayers} onChange={(e) => set("totalPlayers", e.target.value)} placeholder="600" />
              </Field>
              <Field label="Average annual fee per player ($)">
                <Input type="number" min="0" value={form.avgFeePerPlayer} onChange={(e) => set("avgFeePerPlayer", e.target.value)} placeholder="1200" />
              </Field>
              <Field label="Current year-over-year retention (%)">
                <Input type="number" min="0" max="100" value={form.currentRetentionPct} onChange={(e) => set("currentRetentionPct", e.target.value)} placeholder="70" />
              </Field>
              <Field label="Annual apparel revenue ($)">
                <Input type="number" min="0" value={form.apparelRevenue} onChange={(e) => set("apparelRevenue", e.target.value)} placeholder="0" />
              </Field>
              <Field label="Annual sponsorship revenue ($)">
                <Input type="number" min="0" value={form.sponsorshipRevenue} onChange={(e) => set("sponsorshipRevenue", e.target.value)} placeholder="0" />
              </Field>
              <Field label="Annual camps & clinics revenue ($)">
                <Input type="number" min="0" value={form.campsClinicsRevenue} onChange={(e) => set("campsClinicsRevenue", e.target.value)} placeholder="0" />
              </Field>
            </div>
          </section>

          <section className="bg-slate-50 rounded-xl p-6 space-y-3">
            <h2 className="font-semibold text-lg">Which revenue streams would you actually pursue?</h2>
            <p className="text-sm text-slate-600">Toggle off anything that isn't realistic for you — we'll skip it in your report.</p>
            <ToggleRow label="Improve retention and referrals" checked={form.retentionToggle} onChange={(v) => set("retentionToggle", v)} />
            <ToggleRow label="Capture apparel wallet share" checked={form.apparelToggle} onChange={(v) => set("apparelToggle", v)} />
            <ToggleRow label="Unlock sponsorship value" checked={form.sponsorshipToggle} onChange={(v) => set("sponsorshipToggle", v)} />
            <ToggleRow label="Events - Data Days, Camps, Tournaments, Showcases" checked={form.campsToggle} onChange={(v) => set("campsToggle", v)} />
          </section>

          <Button type="submit" disabled={submitting} className="w-full h-14 text-base bg-emerald-600 hover:bg-emerald-700">
            {submitting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Building your report…</>) : "See my revenue opportunity"}
          </Button>

          <p className="text-xs text-center text-slate-500">
            We'll email you a copy of your report and a Curve team member may reach out to walk through it.
          </p>
        </form>
      </main>

      <footer className="border-t border-slate-100 mt-12">
        <div className="max-w-4xl mx-auto px-6 py-6 text-sm text-slate-500 text-center">
          © {new Date().getFullYear()} Curve Sports
        </div>
      </footer>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-sm font-medium mb-1.5 block">{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
