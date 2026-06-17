import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
// Engines (display + priority picker only — math is driven by flat numbers below)
// ---------------------------------------------------------------------------

type EngineKey =
  | "pricing"
  | "sponsorships"
  | "apparel"
  | "retention"
  | "training"
  | "events"
  | "wallet";

const ENGINES: Array<{ key: EngineKey; name: string; icon: any; thesis: string }> = [
  { key: "pricing", name: "Pricing", icon: DollarSign, thesis: "Right-size fees to the value you actually deliver — without losing players." },
  { key: "sponsorships", name: "Sponsorships", icon: Handshake, thesis: "Turn your reach into real local & regional sponsor revenue." },
  { key: "apparel", name: "Apparel & Hard Goods", icon: Shirt, thesis: "Secure the best uniform, fan gear, and equipment deals, ensuring your margins are strong and parents aren't overpaying" },
  { key: "retention", name: "Retention & Referrals", icon: Users, thesis: "Keep more families season-to-season and turn them into your best recruiters." },
  { key: "training", name: "Training / Player Development", icon: GraduationCap, thesis: "Capture private training, skills work, and player development that's leaving the ecosystem today." },
  { key: "events", name: "Events", icon: CalendarDays, thesis: "Data Days, Camps, Tournaments, Showcases — your brand as a revenue engine." },
  { key: "wallet", name: "Share of Wallet & Overall Spend", icon: Wallet, thesis: "The meta-engine: capture more share of wallet - while decreasing the amount of money families are spending overall" },
];

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

type MarketType = "small" | "mid" | "major";

type FormState = {
  // Step 1 — org
  org_name: string;
  contact_name: string;
  email: string;
  phone: string;
  role: string;
  city_state: string;
  sport: string;
  // Step 2 — the base
  totalPlayers: string;
  numTeams: string;
  totalAnnualRevenue: string;
  outsideSpendPerFamily: number;
  marketType: MarketType;
  // Step 3 — priorities (required, gates Step 4)
  priorities: EngineKey[];
  // Step 4 — engine-specific diagnostics (only used if the engine is picked)
  avgFeePerPlayer: string;
  lastFeeRaiseYear: string;
  numSponsors: string;
  sponsorshipRevenue: string;
  parentApparelSpendPerPlayer: string;
  apparelRevenue: string;
  currentRetentionPct: string;
  trainingRevenue: string;
  eventsRevenue: string;
  // honeypot
  website: string;
};

const initial: FormState = {
  org_name: "",
  contact_name: "",
  email: "",
  phone: "",
  role: "",
  city_state: "",
  sport: "",
  totalPlayers: "",
  numTeams: "",
  totalAnnualRevenue: "",
  outsideSpendPerFamily: 15000,
  marketType: "mid",
  priorities: [],
  avgFeePerPlayer: "",
  lastFeeRaiseYear: "",
  numSponsors: "",
  sponsorshipRevenue: "",
  parentApparelSpendPerPlayer: "600",
  apparelRevenue: "",
  currentRetentionPct: "",
  trainingRevenue: "",
  eventsRevenue: "",
  website: "",
};

const fmtUSD = (n: number) =>
  "$" + Math.round(Math.max(0, n)).toLocaleString("en-US");

const MARKET_MULT: Record<MarketType, number> = {
  small: 0.8,
  mid: 1.0,
  major: 1.3,
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RevenueAudit() {
  const [form, setForm] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const togglePriority = (key: EngineKey) =>
    setForm((f) => {
      const exists = f.priorities.includes(key);
      if (exists) return { ...f, priorities: f.priorities.filter((k) => k !== key) };
      if (f.priorities.length >= 3) return f;
      return { ...f, priorities: [...f.priorities, key] };
    });

  const live = useMemo(() => estimateWallet(form), [form]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.org_name.trim() || !form.contact_name.trim() || !form.email.trim() || !form.phone.trim()) {
      toast({
        title: "Missing info",
        description: "Please fill in org name, your name, email, and phone.",
        variant: "destructive",
      });
      return;
    }
    if (form.priorities.length === 0) {
      toast({
        title: "Pick your engines",
        description: "Select up to 3 engines you most want to grow.",
        variant: "destructive",
      });
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
            totalAnnualRevenue: Number(form.totalAnnualRevenue) || 0,
            outsideSpendPerFamily: form.outsideSpendPerFamily,
            marketType: form.marketType,
            sport: form.sport,
            numTeams: Number(form.numTeams) || 0,
            priorities: form.priorities,
            // engine diagnostics (only meaningful for picked engines)
            avgFeePerPlayer: Number(form.avgFeePerPlayer) || 0,
            lastFeeRaiseYear: form.lastFeeRaiseYear,
            numSponsors: Number(form.numSponsors) || 0,
            sponsorshipRevenue: Number(form.sponsorshipRevenue) || 0,
            parentApparelSpendPerPlayer: Number(form.parentApparelSpendPerPlayer) || 600,
            apparelRevenue: Number(form.apparelRevenue) || 0,
            currentRetentionPct: Number(form.currentRetentionPct) || 0,
            trainingRevenue: Number(form.trainingRevenue) || 0,
            eventsRevenue: Number(form.eventsRevenue) || 0,
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

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
    return () => { document.documentElement.style.scrollBehavior = ""; };
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
          <a href="#audit" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#c5ff3d] text-black text-sm font-semibold hover:bg-[#b8f229] transition">
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
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs uppercase tracking-[0.18em] text-white/70 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c5ff3d]" />
                Free Revenue Audit
              </motion.div>
              <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.05 }}
                className="font-display text-4xl md:text-6xl leading-[1.05] tracking-tight font-bold"
                style={{ fontFamily: "'Archivo Black', 'Oswald', sans-serif" }}>
                Your families already spend
                <span className="block text-[#c5ff3d]">$15,000 a year.</span>
                <span className="block text-white/80 text-2xl md:text-3xl font-normal mt-4 leading-snug" style={{ fontFamily: "Inter, sans-serif" }}>
                  How much of it stays inside your club?
                </span>
              </motion.h1>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.2 }}
                className="mt-6 text-white/70 text-lg max-w-lg leading-relaxed">
                Curve Sports is a Growth Partner for youth sports organizations. We don't charge your families more — we help you capture more of what they already spend.
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.35 }}
                className="mt-10 flex flex-wrap items-center gap-4">
                <a href="#audit" className="inline-flex items-center gap-2 px-7 py-4 rounded-full bg-[#c5ff3d] text-black font-semibold hover:bg-[#b8f229] transition text-base">
                  Start my audit <ArrowRight className="w-4 h-4" />
                </a>
                <a href="#engines" className="text-sm text-white/60 hover:text-white">See the 7 engines →</a>
              </motion.div>
            </div>
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
                <span className="text-white/60 text-2xl md:text-3xl font-normal mt-4 leading-snug" style={{ fontFamily: "Inter, sans-serif" }}>
                  What if you could decrease total parent spend and increase your share of wallet?
                </span>
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {[
                { k: "01", t: "Families are already spending", d: "Roughly $15,000 a year per travel family — fees, uniforms, training, travel, tournaments, hotels, hard goods." },
                { k: "02", t: "Most of it leaves.", d: "Outside vendors, distant tournaments, third-party trainers. Your brand fronts the experience; someone else collects the margin." },
                { k: "03", t: "We bring it home.", d: "Every dollar recaptured and every dollar saved for parents compounds into retention, referrals, and a healthier, more independent organization." },
              ].map((c) => (
                <motion.div key={c.k} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5 }}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-7 hover:bg-white/[0.04] transition">
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
                  <motion.div key={e.key} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.4, delay: (i % 3) * 0.06 }}
                    className="group rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:border-[#c5ff3d]/40 hover:bg-white/[0.04] transition">
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
                <motion.div key={s.n} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.4 }}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                  <div className="text-[#c5ff3d] text-sm font-mono mb-3">{s.n}</div>
                  <div className="font-display text-lg font-bold mb-2" style={{ fontFamily: "'Oswald', sans-serif" }}>{s.t}</div>
                  <p className="text-white/60 text-sm leading-relaxed">{s.d}</p>
                </motion.div>
              ))}
            </div>
            <div className="mt-12 text-center">
              <a href="#audit" className="inline-flex items-center gap-2 px-7 py-4 rounded-full bg-[#c5ff3d] text-black font-semibold hover:bg-[#b8f229] transition">
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
                Four short steps.<br />
                <span className="text-white/60">A live revenue leak report.</span>
              </h2>
              <p className="mt-5 text-white/60">
                Best estimates are fine — the more honest your inputs, the sharper the leak. The number on the right updates as you type.
              </p>
            </div>

            <form onSubmit={onSubmit} className="grid lg:grid-cols-[1fr_320px] gap-8">
              <div className="space-y-8">
                {/* Honeypot */}
                <div className="hidden" aria-hidden>
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website", e.target.value)} />
                </div>

                {/* Step 1 — About */}
                <FormCard step="01" title="About your organization">
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Organization name *"><DarkInput value={form.org_name} onChange={(e) => set("org_name", e.target.value)} required /></Field>
                    <Field label="City, State"><DarkInput value={form.city_state} onChange={(e) => set("city_state", e.target.value)} /></Field>
                    <Field label="Your name *"><DarkInput value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} required /></Field>
                    <Field label="Your role"><DarkInput value={form.role} onChange={(e) => set("role", e.target.value)} /></Field>
                    <Field label="Email *"><DarkInput type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required /></Field>
                    <Field label="Phone *"><DarkInput type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} required /></Field>
                    <Field label="Primary sport"><DarkInput value={form.sport} onChange={(e) => set("sport", e.target.value)} /></Field>
                    <Field label="Number of teams"><DarkInput type="number" min="0" value={form.numTeams} onChange={(e) => set("numTeams", e.target.value)} /></Field>
                  </div>
                </FormCard>

                {/* Step 2 — Share-of-wallet base */}
                <FormCard step="02" title="Your share-of-wallet baseline">
                  <p className="text-sm text-white/60 mb-5">
                    Just the high-level numbers — we use these to estimate how much of your families' spend you capture today.
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Field label="Total players"><DarkInput type="number" min="0" value={form.totalPlayers} onChange={(e) => set("totalPlayers", e.target.value)} /></Field>
                    <Field label="Approximate total annual revenue ($)">
                      <DarkInput type="number" min="0" value={form.totalAnnualRevenue} onChange={(e) => set("totalAnnualRevenue", e.target.value)} placeholder="Dues, apparel, sponsorships, events — everything that comes through the club" />
                    </Field>
                    <Field label="Market type">
                      <MarketPicker value={form.marketType} onChange={(v) => set("marketType", v)} />
                    </Field>
                  </div>

                  <div className="mt-6 rounded-xl bg-black/30 border border-white/10 p-6">
                    <div className="flex items-baseline justify-between mb-4">
                      <div className="text-sm text-white/60">Est. total youth-sports spend / family / year</div>
                      <div className="font-display text-3xl text-[#c5ff3d] font-bold tabular-nums" style={{ fontFamily: "'Oswald', sans-serif" }}>
                        {fmtUSD(form.outsideSpendPerFamily)}
                      </div>
                    </div>
                    <Slider min={5000} max={25000} step={500} value={[form.outsideSpendPerFamily]} onValueChange={(v) => set("outsideSpendPerFamily", v[0])} />
                    <div className="flex justify-between text-xs text-white/40 mt-2">
                      <span>$5,000</span>
                      <span>Industry avg ≈ $15,000</span>
                      <span>$25,000</span>
                    </div>
                  </div>
                </FormCard>

                {/* Step 3 — Pick top 3 engines (gates Step 4) */}
                <FormCard step="03" title="Pick the 3 engines you most want to grow *">
                  <p className="text-sm text-white/60 mb-5">
                    We'll ask one quick diagnostic question for each engine you select. ({form.priorities.length}/3 selected)
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {ENGINES.map((e) => {
                      const selected = form.priorities.includes(e.key);
                      const disabled = !selected && form.priorities.length >= 3;
                      return (
                        <button type="button" key={e.key} onClick={() => togglePriority(e.key)} disabled={disabled}
                          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border text-left text-sm transition ${
                            selected ? "border-[#c5ff3d] bg-[#c5ff3d]/10 text-white"
                              : disabled ? "border-white/5 bg-white/[0.02] text-white/30 cursor-not-allowed"
                              : "border-white/10 bg-white/[0.02] text-white/80 hover:border-white/30"
                          }`}>
                          <span>{e.name}</span>
                          {selected && <Check className="w-4 h-4 text-[#c5ff3d]" />}
                        </button>
                      );
                    })}
                  </div>
                </FormCard>

                {/* Step 4 — Diagnostic questions for the 3 picked engines */}
                {form.priorities.length > 0 && (
                  <FormCard step="04" title="Quick diagnostic on the engines you picked">
                    <p className="text-sm text-white/60 mb-5">
                      One question per engine — best estimates are fine. We use these to size the directional opportunity in your report.
                    </p>
                    <div className="space-y-6">
                      {form.priorities.map((key) => (
                        <EngineDiagnostic key={key} engineKey={key} form={form} set={set} />
                      ))}
                    </div>
                  </FormCard>
                )}

                <Button type="submit" disabled={submitting} className="w-full h-14 text-base bg-[#c5ff3d] text-black hover:bg-[#b8f229] font-semibold">
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

              {/* Sticky live share-of-wallet panel */}
              <aside className="hidden lg:block">
                <div className="sticky top-24 rounded-2xl border border-[#c5ff3d]/30 bg-gradient-to-b from-[#c5ff3d]/5 to-transparent p-6">
                  <div className="text-xs uppercase tracking-widest text-[#c5ff3d] mb-3">Live Share-of-Wallet</div>
                  <div className="text-sm text-white/60 mb-1">% of family spend you capture</div>
                  <div className="font-display text-5xl font-bold text-[#c5ff3d] tabular-nums" style={{ fontFamily: "'Oswald', sans-serif" }}>
                    {live.capturedPct}%
                  </div>
                  <div className="mt-6 pt-5 border-t border-white/10">
                    <div className="text-sm text-white/60 mb-1">$ leaving the building / year</div>
                    <div className="font-display text-3xl font-bold text-white tabular-nums" style={{ fontFamily: "'Oswald', sans-serif" }}>
                      {fmtUSD(live.leaking)}
                    </div>
                  </div>
                  <div className="mt-6 pt-5 border-t border-white/10 text-xs text-white/50 leading-relaxed">
                    {live.walletPool > 0
                      ? <>Total family-spend pool: <span className="text-white/80 font-semibold">{fmtUSD(live.walletPool)}</span>. Your report will detail the 3 engines you picked.</>
                      : <>Add total players and revenue above to see your live share-of-wallet.</>}
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
    <Input {...props}
      className="bg-black/40 border-white/10 text-white placeholder:text-white/30 focus-visible:border-[#c5ff3d] focus-visible:ring-[#c5ff3d]/20" />
  );
}

function MarketPicker({ value, onChange }: { value: MarketType; onChange: (v: MarketType) => void }) {
  const opts: Array<{ v: MarketType; l: string }> = [
    { v: "small", l: "Small" },
    { v: "mid", l: "Mid-market" },
    { v: "major", l: "Major metro" },
  ];
  return (
    <div className="grid grid-cols-3 gap-1.5 bg-black/40 border border-white/10 rounded-md p-1">
      {opts.map((o) => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)}
          className={`text-xs px-2 py-2 rounded transition ${
            value === o.v ? "bg-[#c5ff3d] text-black font-semibold" : "text-white/70 hover:text-white"
          }`}>
          {o.l}
        </button>
      ))}
    </div>
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
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#c5ff3d" strokeWidth={28} strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          initial={{ strokeDasharray: `0 ${c}` }}
          animate={{ strokeDasharray: `${dash} ${c - dash}` }}
          transition={{ duration: 1.4, ease: "easeOut", delay: 0.3 }} />
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

// ---------------------------------------------------------------------------
// Engine diagnostic questions — only shown for picked engines
// ---------------------------------------------------------------------------

function EngineDiagnostic({
  engineKey,
  form,
  set,
}: {
  engineKey: EngineKey;
  form: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  const engine = ENGINES.find((e) => e.key === engineKey);
  if (!engine) return null;
  const Icon = engine.icon;
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-[#c5ff3d]/10 border border-[#c5ff3d]/20 flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#c5ff3d]" />
        </div>
        <div className="font-display text-base font-bold" style={{ fontFamily: "'Oswald', sans-serif" }}>{engine.name}</div>
      </div>
      {engineKey === "pricing" && (
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Avg annual fee per player ($)"><DarkInput type="number" min="0" value={form.avgFeePerPlayer} onChange={(e) => set("avgFeePerPlayer", e.target.value)} /></Field>
          <Field label="Year of last fee raise"><DarkInput type="text" placeholder="e.g. 2023" value={form.lastFeeRaiseYear} onChange={(e) => set("lastFeeRaiseYear", e.target.value)} /></Field>
        </div>
      )}
      {engineKey === "sponsorships" && (
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="# of sponsors today"><DarkInput type="number" min="0" value={form.numSponsors} onChange={(e) => set("numSponsors", e.target.value)} /></Field>
          <Field label="Total sponsorship revenue ($/yr)"><DarkInput type="number" min="0" value={form.sponsorshipRevenue} onChange={(e) => set("sponsorshipRevenue", e.target.value)} /></Field>
        </div>
      )}
      {engineKey === "apparel" && (
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Total parent spend on apparel & gear per player ($/yr)">
            <DarkInput type="number" min="0" value={form.parentApparelSpendPerPlayer} onChange={(e) => set("parentApparelSpendPerPlayer", e.target.value)} />
          </Field>
          <Field label="How much flows through your club ($/yr)">
            <DarkInput type="number" min="0" value={form.apparelRevenue} onChange={(e) => set("apparelRevenue", e.target.value)} />
          </Field>
        </div>
      )}
      {engineKey === "retention" && (
        <Field label="Current year-over-year retention (%)"><DarkInput type="number" min="0" max="100" value={form.currentRetentionPct} onChange={(e) => set("currentRetentionPct", e.target.value)} /></Field>
      )}
      {engineKey === "training" && (
        <Field label="Training / player-dev revenue ($/yr)"><DarkInput type="number" min="0" value={form.trainingRevenue} onChange={(e) => set("trainingRevenue", e.target.value)} /></Field>
      )}
      {engineKey === "events" && (
        <Field label="Events revenue — camps, clinics, tournaments ($/yr)"><DarkInput type="number" min="0" value={form.eventsRevenue} onChange={(e) => set("eventsRevenue", e.target.value)} /></Field>
      )}
      {engineKey === "wallet" && (
        <p className="text-sm text-white/60">
          Share of Wallet is the meta-engine — we'll quantify it on the report from the numbers above.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live share-of-wallet estimator
// ---------------------------------------------------------------------------

function estimateWallet(f: FormState) {
  const players = Number(f.totalPlayers) || 0;
  const totalRev = Number(f.totalAnnualRevenue) || 0;
  const outsideSpend = f.outsideSpendPerFamily || 15000;
  const walletPool = players * outsideSpend;
  const capturedPct = walletPool > 0 ? Math.min(100, Math.round((totalRev / walletPool) * 100)) : 0;
  const leaking = Math.max(0, walletPool - totalRev);
  return { capturedPct, leaking, walletPool };
}
