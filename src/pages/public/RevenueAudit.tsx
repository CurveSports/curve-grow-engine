import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import {
  Loader2,
  ArrowRight,
  DollarSign,
  Handshake,
  Shirt,
  Users,
  GraduationCap,
  CalendarDays,
  Wallet,
  Check,
} from "lucide-react";
import curveLogo from "@/assets/curve-sports-logo.png.asset.json";

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------

type EngineKey =
  | "pricing"
  | "sponsorships"
  | "apparel"
  | "retention"
  | "training"
  | "events"
  | "wallet";

const ENGINES: Array<{
  key: EngineKey;
  name: string;
  icon: any;
  thesis: string;
  doToday: string;
  spendLabel?: string;
}> = [
  {
    key: "pricing",
    name: "Pricing",
    icon: DollarSign,
    thesis: "Right-size fees to the value you actually deliver — without losing players.",
    doToday: "We do this today",
  },
  {
    key: "sponsorships",
    name: "Sponsorships",
    icon: Handshake,
    thesis: "Turn your reach into real local & regional sponsor revenue.",
    doToday: "We have sponsors today",
  },
  {
    key: "apparel",
    name: "Apparel & Hard Goods",
    icon: Shirt,
    thesis: "Bring uniforms, fan gear, and equipment in-house instead of sending margin to outside vendors.",
    doToday: "We sell apparel today",
  },
  {
    key: "retention",
    name: "Retention & Referrals",
    icon: Users,
    thesis: "Keep more families season-to-season and turn them into your best recruiters.",
    doToday: "We have a referral program",
  },
  {
    key: "training",
    name: "Training / Player Development",
    icon: GraduationCap,
    thesis: "Capture private training, skills work, and player development that's leaving the building today.",
    doToday: "We offer training today",
  },
  {
    key: "events",
    name: "Events",
    icon: CalendarDays,
    thesis: "Data Days, Camps, Tournaments, Showcases — your facility & brand as a revenue engine.",
    doToday: "We run events today",
  },
  {
    key: "wallet",
    name: "Share of Wallet",
    icon: Wallet,
    thesis: "The meta-engine: capture more of the $15k a travel family already spends each year.",
    doToday: "",
  },
];

type EngineState = {
  active: boolean; // doing this today
  revenue: string;
  maturity: number; // 1-5
};

type FormState = {
  org_name: string;
  contact_name: string;
  email: string;
  phone: string;
  role: string;
  city_state: string;
  sport: string;
  num_teams: string;
  totalPlayers: string;
  avgFeePerPlayer: string;
  currentRetentionPct: string;
  outsideSpendPerFamily: number; // share-of-wallet slider
  engines: Record<EngineKey, EngineState>;
  priorities: EngineKey[]; // top 3
  website: string; // honeypot
};

const initialEngines = (): Record<EngineKey, EngineState> =>
  ENGINES.reduce((acc, e) => {
    acc[e.key] = { active: true, revenue: "", maturity: 2 };
    return acc;
  }, {} as Record<EngineKey, EngineState>);

const initial: FormState = {
  org_name: "",
  contact_name: "",
  email: "",
  phone: "",
  role: "",
  city_state: "",
  sport: "",
  num_teams: "",
  totalPlayers: "",
  avgFeePerPlayer: "",
  currentRetentionPct: "",
  outsideSpendPerFamily: 15000,
  engines: initialEngines(),
  priorities: [],
  website: "",
};

const fmtUSD = (n: number) =>
  "$" + Math.round(Math.max(0, n)).toLocaleString("en-US");

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RevenueAudit() {
  const [form, setForm] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const setEngine = (key: EngineKey, patch: Partial<EngineState>) =>
    setForm((f) => ({
      ...f,
      engines: { ...f.engines, [key]: { ...f.engines[key], ...patch } },
    }));

  const togglePriority = (key: EngineKey) =>
    setForm((f) => {
      const exists = f.priorities.includes(key);
      if (exists) return { ...f, priorities: f.priorities.filter((k) => k !== key) };
      if (f.priorities.length >= 3) return f;
      return { ...f, priorities: [...f.priorities, key] };
    });

  // Live opportunity estimate
  const liveOpportunity = useMemo(() => estimateOpportunity(form), [form]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.org_name.trim() ||
      !form.contact_name.trim() ||
      !form.email.trim() ||
      !form.phone.trim()
    ) {
      toast({
        title: "Missing info",
        description: "Please fill in org name, your name, email, and phone.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const enginesPayload: Record<string, any> = {};
      for (const e of ENGINES) {
        enginesPayload[e.key] = {
          active: form.engines[e.key].active,
          revenue: Number(form.engines[e.key].revenue) || 0,
          maturity: form.engines[e.key].maturity,
        };
      }

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
            // legacy fields the existing function understands
            totalPlayers: Number(form.totalPlayers) || 0,
            avgFeePerPlayer: Number(form.avgFeePerPlayer) || 0,
            currentRetentionPct: Number(form.currentRetentionPct) || 0,
            apparelRevenue: Number(form.engines.apparel.revenue) || 0,
            sponsorshipRevenue: Number(form.engines.sponsorships.revenue) || 0,
            campsClinicsRevenue: Number(form.engines.events.revenue) || 0,
            apparelToggle: form.engines.apparel.active,
            sponsorshipToggle: form.engines.sponsorships.active,
            retentionToggle: form.engines.retention.active,
            campsToggle: form.engines.events.active,
            // extended fields
            sport: form.sport,
            numTeams: Number(form.num_teams) || 0,
            outsideSpendPerFamily: form.outsideSpendPerFamily,
            engines: enginesPayload,
            priorities: form.priorities,
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
      toast({
        title: "Submission failed",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Smooth-scroll anchors
  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "";
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans antialiased">
      {/* ============== NAV ============== */}
      <header className="sticky top-0 z-40 backdrop-blur bg-[#0a0a0a]/80 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="#top" className="flex items-center gap-3">
            <img src={curveLogo.url} alt="Curve Sports" className="h-8 w-auto" />
          </a>
          <nav className="hidden md:flex items-center gap-7 text-sm text-white/70">
            <a href="#thesis" className="hover:text-white transition">Thesis</a>
            <a href="#engines" className="hover:text-white transition">7 Engines</a>
            <a href="#process" className="hover:text-white transition">Process</a>
            <a href="#audit" className="hover:text-white transition">Audit</a>
          </nav>
          <a
            href="#audit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#c5ff3d] text-black text-sm font-semibold hover:bg-[#b8f229] transition"
          >
            Start my audit <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      <main id="top">
        {/* ============== ACT 1: HERO ============== */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-[#c5ff3d]/10 blur-[120px]" />
            <div className="absolute top-1/3 -right-40 w-[520px] h-[520px] rounded-full bg-emerald-500/10 blur-[140px]" />
          </div>
          <div className="relative max-w-6xl mx-auto px-6 pt-20 md:pt-28 pb-20 md:pb-32 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs uppercase tracking-[0.18em] text-white/70 mb-6"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#c5ff3d]" />
                Free Revenue Audit
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.05 }}
                className="font-display text-4xl md:text-6xl leading-[1.05] tracking-tight font-bold"
                style={{ fontFamily: "'Archivo Black', 'Oswald', sans-serif" }}
              >
                Your families already spend
                <span className="block text-[#c5ff3d]">$15,000 a year.</span>
                <span className="block text-white/80 text-2xl md:text-3xl font-normal mt-4 leading-snug" style={{ fontFamily: "Inter, sans-serif" }}>
                  How much of it stays inside your club?
                </span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="mt-6 text-white/70 text-lg max-w-lg leading-relaxed"
              >
                Curve Sports is a Growth Partner for youth sports organizations. We don't charge your families more — we help you capture more of what they already spend.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="mt-10 flex flex-wrap items-center gap-4"
              >
                <a
                  href="#audit"
                  className="inline-flex items-center gap-2 px-7 py-4 rounded-full bg-[#c5ff3d] text-black font-semibold hover:bg-[#b8f229] transition text-base"
                >
                  Start my audit <ArrowRight className="w-4 h-4" />
                </a>
                <a href="#engines" className="text-sm text-white/60 hover:text-white">
                  See the 7 engines →
                </a>
              </motion.div>
            </div>

            {/* Share of wallet ring */}
            <div className="flex justify-center md:justify-end">
              <ShareOfWalletRing capturedPct={12} />
            </div>
          </div>
        </section>

        {/* ============== ACT 1.5: THESIS ============== */}
        <section id="thesis" className="border-t border-white/5 py-20 md:py-28">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-3xl mb-14">
              <div className="text-xs uppercase tracking-[0.18em] text-[#c5ff3d] mb-3">The Share-of-Wallet Thesis</div>
              <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight leading-tight" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
                It's not about charging more.<br />
                <span className="text-white/60">It's about keeping more in-house.</span>
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {[
                {
                  k: "01",
                  t: "Parents already pay.",
                  d: "Roughly $15,000 a year per travel family — fees, uniforms, training, travel, tournaments, hotels, gear.",
                },
                {
                  k: "02",
                  t: "Most of it leaves.",
                  d: "Outside vendors, distant tournaments, third-party trainers. Your brand fronts the experience; someone else collects the margin.",
                },
                {
                  k: "03",
                  t: "We bring it home.",
                  d: "Every dollar recaptured compounds into retention, referrals, and a healthier, more independent organization.",
                },
              ].map((c) => (
                <motion.div
                  key={c.k}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5 }}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-7 hover:bg-white/[0.04] transition"
                >
                  <div className="text-xs text-[#c5ff3d] tracking-widest mb-4">{c.k}</div>
                  <div className="font-display text-xl font-bold mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>{c.t}</div>
                  <p className="text-white/60 text-sm leading-relaxed">{c.d}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ============== ACT 1.6: ENGINES ============== */}
        <section id="engines" className="border-t border-white/5 py-20 md:py-28 bg-gradient-to-b from-[#0a0a0a] to-[#0d0d0d]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-3xl mb-14">
              <div className="text-xs uppercase tracking-[0.18em] text-[#c5ff3d] mb-3">The Curve System</div>
              <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight leading-tight" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
                Seven engines.<br />
                <span className="text-white/60">One Growth Partner.</span>
              </h2>
              <p className="mt-5 text-white/60 text-lg max-w-2xl">
                We diagnose, build, and operate the seven revenue engines that move youth sports organizations from surviving on fees to thriving on a balanced portfolio of income.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ENGINES.map((e, i) => {
                const Icon = e.icon;
                return (
                  <motion.div
                    key={e.key}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.4, delay: (i % 3) * 0.06 }}
                    className="group rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:border-[#c5ff3d]/40 hover:bg-white/[0.04] transition"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-[#c5ff3d]/10 border border-[#c5ff3d]/20 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-[#c5ff3d]" />
                      </div>
                      <div className="text-xs text-white/40 tracking-widest">0{i + 1}</div>
                    </div>
                    <div className="font-display text-lg font-bold mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>{e.name}</div>
                    <p className="text-sm text-white/60 leading-relaxed">{e.thesis}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============== ACT 1.7: PROCESS ============== */}
        <section id="process" className="border-t border-white/5 py-20 md:py-28">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-3xl mb-14">
              <div className="text-xs uppercase tracking-[0.18em] text-[#c5ff3d] mb-3">How We Partner</div>
              <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight leading-tight" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
                Consultative. Embedded.<br />
                <span className="text-white/60">Accountable to your numbers.</span>
              </h2>
            </div>
            <div className="grid md:grid-cols-4 gap-5">
              {[
                { n: "01", t: "Audit", d: "We map your current revenue, retention, and share-of-wallet against benchmarks." },
                { n: "02", t: "Diagnose", d: "We identify which of the 7 engines unlock the most value, fastest, for your org." },
                { n: "03", t: "Build", d: "We design and stand up the playbooks, partnerships, and systems with you." },
                { n: "04", t: "Operate", d: "We stay on the field with you — measuring, iterating, and compounding the wins." },
              ].map((s) => (
                <motion.div
                  key={s.n}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.4 }}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
                >
                  <div className="text-[#c5ff3d] text-sm font-mono mb-3">{s.n}</div>
                  <div className="font-display text-lg font-bold mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>{s.t}</div>
                  <p className="text-white/60 text-sm leading-relaxed">{s.d}</p>
                </motion.div>
              ))}
            </div>
            <div className="mt-12 text-center">
              <a
                href="#audit"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-full bg-[#c5ff3d] text-black font-semibold hover:bg-[#b8f229] transition"
              >
                Start the audit <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>

        {/* ============== ACT 2: AUDIT ============== */}
        <section id="audit" className="border-t border-white/5 py-20 md:py-28 bg-[#0d0d0d]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="max-w-3xl mb-12">
              <div className="text-xs uppercase tracking-[0.18em] text-[#c5ff3d] mb-3">Act 2 — The Audit</div>
              <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight leading-tight" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
                Tell us about your engines.<br />
                <span className="text-white/60">We'll show you the map.</span>
              </h2>
              <p className="mt-5 text-white/60">
                Best estimates are fine. The more honest your inputs, the sharper your report.
              </p>
            </div>

            <form onSubmit={onSubmit} className="grid lg:grid-cols-[1fr_320px] gap-8">
              <div className="space-y-8">
                {/* Honeypot */}
                <div className="hidden" aria-hidden>
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} />
                </div>

                {/* About */}
                <FormCard step="01" title="About your organization">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Organization name *"><DarkInput value={form.org_name} onChange={(e) => set("org_name", e.target.value)} required /></Field>
                    <Field label="City, State"><DarkInput value={form.city_state} onChange={(e) => set("city_state", e.target.value)} /></Field>
                    <Field label="Your name *"><DarkInput value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} required /></Field>
                    <Field label="Your role"><DarkInput value={form.role} onChange={(e) => set("role", e.target.value)} /></Field>
                    <Field label="Email *"><DarkInput type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required /></Field>
                    <Field label="Phone *"><DarkInput type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} required /></Field>
                    <Field label="Primary sport"><DarkInput value={form.sport} onChange={(e) => set("sport", e.target.value)} /></Field>
                    <Field label="Number of teams"><DarkInput type="number" min="0" value={form.num_teams} onChange={(e) => set("num_teams", e.target.value)} /></Field>
                  </div>
                </FormCard>

                {/* Base numbers */}
                <FormCard step="02" title="The base">
                  <div className="grid md:grid-cols-3 gap-4">
                    <Field label="Total players"><DarkInput type="number" min="0" value={form.totalPlayers} onChange={(e) => set("totalPlayers", e.target.value)} /></Field>
                    <Field label="Avg annual fee per player ($)"><DarkInput type="number" min="0" value={form.avgFeePerPlayer} onChange={(e) => set("avgFeePerPlayer", e.target.value)} /></Field>
                    <Field label="Current YoY retention (%)"><DarkInput type="number" min="0" max="100" value={form.currentRetentionPct} onChange={(e) => set("currentRetentionPct", e.target.value)} /></Field>
                  </div>
                </FormCard>

                {/* Share of wallet slider */}
                <FormCard step="03" title="Share of wallet">
                  <p className="text-sm text-white/60 mb-6">
                    Estimate how much an average travel family in your org spends per year across <em>everything</em> — fees, uniforms, training, travel, hotels, food, gear, tournaments.
                  </p>
                  <div className="rounded-xl bg-black/30 border border-white/10 p-6">
                    <div className="flex items-baseline justify-between mb-4">
                      <div className="text-sm text-white/60">Outside + in-house spend / family / year</div>
                      <div className="font-display text-3xl text-[#c5ff3d] font-bold tabular-nums" style={{ fontFamily: "'Oswald', sans-serif" }}>
                        {fmtUSD(form.outsideSpendPerFamily)}
                      </div>
                    </div>
                    <Slider
                      min={5000}
                      max={25000}
                      step={500}
                      value={[form.outsideSpendPerFamily]}
                      onValueChange={(v) => set("outsideSpendPerFamily", v[0])}
                    />
                    <div className="flex justify-between text-xs text-white/40 mt-2">
                      <span>$5,000</span>
                      <span>Industry avg ≈ $15,000</span>
                      <span>$25,000</span>
                    </div>
                  </div>
                </FormCard>

                {/* The 7 engines */}
                <FormCard step="04" title="The 7 engines — current state">
                  <p className="text-sm text-white/60 mb-5">
                    For each engine: are you doing it today, how much revenue does it bring, and how mature is it?
                  </p>
                  <div className="space-y-3">
                    {ENGINES.map((e) => {
                      const st = form.engines[e.key];
                      const Icon = e.icon;
                      return (
                        <div key={e.key} className="rounded-xl border border-white/10 bg-black/20 p-5">
                          <div className="flex items-start gap-4">
                            <div className="w-9 h-9 rounded-lg bg-[#c5ff3d]/10 border border-[#c5ff3d]/20 flex items-center justify-center shrink-0">
                              <Icon className="w-4 h-4 text-[#c5ff3d]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-4 mb-1">
                                <div className="font-semibold">{e.name}</div>
                                <label className="flex items-center gap-2 text-xs text-white/60">
                                  Active
                                  <Switch
                                    checked={st.active}
                                    onCheckedChange={(v) => setEngine(e.key, { active: v })}
                                  />
                                </label>
                              </div>
                              <p className="text-xs text-white/50 mb-4">{e.thesis}</p>

                              {e.key !== "wallet" && (
                                <div className="grid md:grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-xs text-white/60 mb-1.5 block">Annual revenue ($)</Label>
                                    <DarkInput
                                      type="number"
                                      min="0"
                                      value={st.revenue}
                                      onChange={(ev) => setEngine(e.key, { revenue: ev.target.value })}
                                      disabled={!st.active}
                                      placeholder="0"
                                    />
                                  </div>
                                  <div>
                                    <div className="flex justify-between mb-1.5">
                                      <Label className="text-xs text-white/60">Maturity</Label>
                                      <span className="text-xs text-white/40">{maturityLabel(st.maturity)}</span>
                                    </div>
                                    <Slider
                                      min={1}
                                      max={5}
                                      step={1}
                                      value={[st.maturity]}
                                      onValueChange={(v) => setEngine(e.key, { maturity: v[0] })}
                                      disabled={!st.active}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </FormCard>

                {/* Priorities */}
                <FormCard step="05" title="Pick your top 3 priorities">
                  <p className="text-sm text-white/60 mb-5">
                    Which engines do you most want to move on first? ({form.priorities.length}/3 selected)
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {ENGINES.map((e) => {
                      const selected = form.priorities.includes(e.key);
                      const disabled = !selected && form.priorities.length >= 3;
                      return (
                        <button
                          type="button"
                          key={e.key}
                          onClick={() => togglePriority(e.key)}
                          disabled={disabled}
                          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border text-left text-sm transition ${
                            selected
                              ? "border-[#c5ff3d] bg-[#c5ff3d]/10 text-white"
                              : disabled
                              ? "border-white/5 bg-white/[0.02] text-white/30 cursor-not-allowed"
                              : "border-white/10 bg-white/[0.02] text-white/80 hover:border-white/30"
                          }`}
                        >
                          <span>{e.name}</span>
                          {selected && <Check className="w-4 h-4 text-[#c5ff3d]" />}
                        </button>
                      );
                    })}
                  </div>
                </FormCard>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-14 text-base bg-[#c5ff3d] text-black hover:bg-[#b8f229] font-semibold"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Building your revenue map…</>
                  ) : (
                    <>Reveal my revenue map <ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
                <p className="text-xs text-center text-white/40">
                  We'll email you a copy of your report and a Curve team member may reach out to walk through it.
                </p>
              </div>

              {/* Sticky live opportunity panel */}
              <aside className="hidden lg:block">
                <div className="sticky top-24 rounded-2xl border border-[#c5ff3d]/30 bg-gradient-to-b from-[#c5ff3d]/5 to-transparent p-6">
                  <div className="text-xs uppercase tracking-widest text-[#c5ff3d] mb-3">Live Estimate</div>
                  <div className="text-sm text-white/60 mb-1">Annual revenue opportunity</div>
                  <div className="font-display text-4xl font-bold text-[#c5ff3d] tabular-nums" style={{ fontFamily: "'Oswald', sans-serif" }}>
                    {fmtUSD(liveOpportunity.total)}
                  </div>
                  <div className="mt-5 space-y-2">
                    {liveOpportunity.lines.map((l) => (
                      <div key={l.key} className="flex items-center justify-between text-xs">
                        <span className="text-white/60">{l.label}</span>
                        <span className="text-white/80 tabular-nums">{fmtUSD(l.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 pt-5 border-t border-white/10 text-xs text-white/40 leading-relaxed">
                    Updates as you fill in the audit. Final report uses sharper math.
                  </div>
                </div>
              </aside>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-white/40">
          <div>© {new Date().getFullYear()} Curve Sports</div>
          <a href="https://www.curvesports.com" className="hover:text-white">curvesports.com</a>
        </div>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FormCard({ step, title, children }: { step: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-[#c5ff3d] text-xs font-mono">{step}</span>
        <h3 className="font-display text-xl font-bold" style={{ fontFamily: "'Oswald', sans-serif" }}>{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-medium text-white/60 mb-1.5 block uppercase tracking-wider">{label}</Label>
      {children}
    </div>
  );
}

function DarkInput(props: React.ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      className="bg-black/40 border-white/10 text-white placeholder:text-white/30 focus-visible:border-[#c5ff3d] focus-visible:ring-[#c5ff3d]/20"
    />
  );
}

function ShareOfWalletRing({ capturedPct }: { capturedPct: number }) {
  const size = 320;
  const r = 130;
  const c = 2 * Math.PI * r;
  const dash = (capturedPct / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={28} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#c5ff3d"
          strokeWidth={28}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          initial={{ strokeDasharray: `0 ${c}` }}
          animate={{ strokeDasharray: `${dash} ${c - dash}` }}
          transition={{ duration: 1.4, ease: "easeOut", delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        <div className="text-xs uppercase tracking-widest text-white/50 mb-2">Typical club captures</div>
        <div className="font-display text-6xl font-bold text-[#c5ff3d]" style={{ fontFamily: "'Archivo Black', sans-serif" }}>~12%</div>
        <div className="text-sm text-white/60 mt-2">of every family's $15k spend</div>
        <div className="text-xs text-white/40 mt-4">The other 88% leaves the building.</div>
      </div>
    </div>
  );
}

function maturityLabel(n: number) {
  return ["Nonexistent", "Ad hoc", "Defined", "Operating", "Optimized"][n - 1] ?? "";
}

// ---------------------------------------------------------------------------
// Live (client-side) opportunity estimator — rough mirror of server logic
// ---------------------------------------------------------------------------

function estimateOpportunity(f: FormState) {
  const players = Number(f.totalPlayers) || 0;
  const fee = Number(f.avgFeePerPlayer) || 0;
  const retention = Math.min(100, Number(f.currentRetentionPct) || 0);

  const lines: Array<{ key: string; label: string; amount: number }> = [];

  if (f.engines.pricing.active && players && fee) {
    const lift = players * fee * 0.05 * 0.98 - players * fee * 0;
    lines.push({ key: "pricing", label: "Pricing", amount: players * fee * 0.05 * 0.98 });
  }
  if (f.engines.retention.active && players && fee) {
    const target = Math.min(95, retention + 5);
    const extra = players * Math.max(0, (target - retention) / 100);
    lines.push({ key: "retention", label: "Retention & Referrals", amount: extra * fee });
  }
  if (f.engines.apparel.active && players) {
    const potential = players * 120 * 0.3;
    lines.push({ key: "apparel", label: "Apparel & Hard Goods", amount: Math.max(0, potential - (Number(f.engines.apparel.revenue) || 0)) });
  }
  if (f.engines.sponsorships.active && players) {
    const potential = players * 50;
    lines.push({ key: "sponsorships", label: "Sponsorships", amount: Math.max(0, potential - (Number(f.engines.sponsorships.revenue) || 0)) });
  }
  if (f.engines.events.active && players) {
    const potential = players * 40;
    lines.push({ key: "events", label: "Events", amount: Math.max(0, potential - (Number(f.engines.events.revenue) || 0)) });
  }
  if (f.engines.training.active && players) {
    const potential = players * 60;
    lines.push({ key: "training", label: "Training / Player Dev", amount: Math.max(0, potential - (Number(f.engines.training.revenue) || 0)) });
  }
  if (f.engines.wallet.active && players) {
    // Capture an additional 3% of outside spend per family
    const wallet = players * f.outsideSpendPerFamily * 0.03;
    lines.push({ key: "wallet", label: "Share of Wallet", amount: wallet });
  }

  const total = lines.reduce((s, l) => s + l.amount, 0);
  return { total, lines: lines.filter((l) => l.amount > 0) };
}
