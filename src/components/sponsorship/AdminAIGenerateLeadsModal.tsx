// Admin-only dialog to AI-generate a curated lead list for an org's city/state, then bulk-insert.
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Sparkles, Loader2, AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { BUSINESS_TYPE_OPTIONS } from "@/lib/orgSponsorship";

type Candidate = {
  business_name: string;
  business_type: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  website: string;
  address: string;
  city_state: string;
  rationale: string;
  selected: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  orgId: string;
  defaultCityState?: string | null;
  onCreated?: (n: number) => void;
};

export default function AdminAIGenerateLeadsModal({ open, onOpenChange, orgId, defaultCityState, onCreated }: Props) {
  const { user } = useAuth();
  const [city, setCity] = useState(defaultCityState ?? "");
  const [count, setCount] = useState(25);
  const [cats, setCats] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);

  useEffect(() => {
    if (open) {
      setCity(defaultCityState ?? "");
      setCount(25);
      setCats(new Set());
      setCandidates(null);
    }
  }, [open, defaultCityState]);

  const generate = async () => {
    if (!city.trim() || city.trim().length < 3) return toast.error("Enter a city/state");
    setBusy(true);
    setCandidates(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-leads-by-city", {
        body: { city_state: city.trim(), count, categories: Array.from(cats) },
      });
      if (error) throw error;
      const list: Candidate[] = ((data as any)?.candidates ?? []).map((c: any) => ({
        business_name: c.business_name ?? "",
        business_type: c.business_type ?? "",
        contact_name: c.contact_name ?? "",
        contact_phone: c.contact_phone ?? "",
        contact_email: c.contact_email ?? "",
        website: c.website ?? "",
        address: c.address ?? "",
        city_state: c.city_state ?? city.trim(),
        rationale: c.rationale ?? "",
        selected: true,
      }));
      if (list.length === 0) throw new Error("No candidates returned");
      setCandidates(list);
      toast.success(`${list.length} candidates generated — review and import`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  const importSelected = async () => {
    if (!candidates || !user) return;
    const picked = candidates.filter(c => c.selected && c.business_name.trim());
    if (picked.length === 0) return toast.error("Select at least one candidate");
    setSubmitBusy(true);
    const inserts = picked.map(c => {
      const notes = [c.rationale, c.website && `Website: ${c.website}`, c.address && `Address: ${c.address}`]
        .filter(Boolean)
        .join(" • ");
      return {
        org_id: orgId,
        business_name: c.business_name.trim(),
        contact_name: c.contact_name?.trim() || null,
        contact_email: c.contact_email?.trim() || null,
        contact_phone: c.contact_phone?.trim() || null,
        business_type: c.business_type?.trim() || null,
        city_state: c.city_state?.trim() || city.trim(),
        source: "dsf_outreach",
        stage: "new_lead",
        created_by: user.id,
        ai_generated: true,
        ai_generation_notes: notes || null,
      };
    });
    const { data, error } = await supabase.from("sponsorship_leads").insert(inserts).select("id");
    setSubmitBusy(false);
    if (error) {
      console.error(error);
      return toast.error(error.message);
    }
    toast.success(`${data?.length ?? picked.length} leads imported`);
    onCreated?.(data?.length ?? picked.length);
    onOpenChange(false);
  };

  const updateCand = (idx: number, patch: Partial<Candidate>) =>
    setCandidates(cs => cs ? cs.map((c, i) => i === idx ? { ...c, ...patch } : c) : cs);

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && !submitBusy && onOpenChange(o)}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" /> AI Lead Generator
          </DialogTitle>
          <DialogDescription>
            Generate a curated list of local sponsor candidates for this org's city.
          </DialogDescription>
        </DialogHeader>

        {!candidates && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs">City / State</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Dallas, TX" className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">How many candidates? ({count})</Label>
              <input
                type="range" min={15} max={40} step={5}
                value={count} onChange={(e) => setCount(Number(e.target.value))}
                className="w-full mt-2 accent-accent"
              />
            </div>
            <div>
              <Label className="text-xs mb-2 block">Bias toward categories (optional)</Label>
              <div className="flex flex-wrap gap-1.5">
                {BUSINESS_TYPE_OPTIONS.map(o => {
                  const on = cats.has(o);
                  return (
                    <button
                      key={o}
                      type="button"
                      onClick={() => {
                        const next = new Set(cats);
                        if (on) next.delete(o); else next.add(o);
                        setCats(next);
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors",
                        on ? "bg-accent text-accent-foreground border-accent" : "bg-background text-muted-foreground border-border hover:border-foreground/40",
                      )}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="rounded-md border border-warning/30 bg-warning-soft/40 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed">
                <strong>Powered by Google Search.</strong> Business names, phones, addresses, and websites come from real Google results — but listings change. Spot-check before outreach. Emails usually aren't on Google; use the website link to find them.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
              <Button onClick={generate} disabled={busy} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {busy ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Generating…</> : <><Sparkles className="h-4 w-4 mr-1.5" /> Generate</>}
              </Button>
            </div>
          </div>
        )}

        {candidates && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <p className="text-muted-foreground">{candidates.filter(c => c.selected).length} of {candidates.length} selected</p>
              <div className="flex gap-2">
                <button className="text-accent hover:underline" onClick={() => setCandidates(cs => cs!.map(c => ({ ...c, selected: true })))}>Select all</button>
                <button className="text-muted-foreground hover:text-foreground" onClick={() => setCandidates(cs => cs!.map(c => ({ ...c, selected: false })))}>Clear</button>
              </div>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {candidates.map((c, i) => (
                <div key={i} className={cn(
                  "rounded-md border p-3 space-y-1.5 transition-colors",
                  c.selected ? "border-accent bg-accent-soft/30" : "border-border bg-card",
                )}>
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => updateCand(i, { selected: !c.selected })}
                      className={cn(
                        "h-5 w-5 rounded border flex items-center justify-center mt-0.5 flex-shrink-0",
                        c.selected ? "bg-accent border-accent text-accent-foreground" : "border-border bg-background",
                      )}
                    >
                      {c.selected && <Check className="h-3 w-3" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <Input
                        value={c.business_name}
                        onChange={(e) => updateCand(i, { business_name: e.target.value })}
                        className="h-8 font-semibold text-sm border-0 px-1 -mx-1 focus-visible:ring-1"
                      />
                      <p className="text-xs text-muted-foreground italic mt-1">{c.rationale}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
                        <Input value={c.business_type} onChange={(e) => updateCand(i, { business_type: e.target.value })} placeholder="Type" className="h-7 text-xs" />
                        <Input value={c.contact_name} onChange={(e) => updateCand(i, { contact_name: e.target.value })} placeholder="Contact name" className="h-7 text-xs" />
                        <Input value={c.contact_phone} onChange={(e) => updateCand(i, { contact_phone: e.target.value })} placeholder="Phone" className="h-7 text-xs" />
                        <Input value={c.contact_email} onChange={(e) => updateCand(i, { contact_email: e.target.value })} placeholder="Email (often blank)" className="h-7 text-xs" />
                        <Input value={c.address} onChange={(e) => updateCand(i, { address: e.target.value })} placeholder="Address" className="h-7 text-xs sm:col-span-2" />
                        <Input value={c.website} onChange={(e) => updateCand(i, { website: e.target.value })} placeholder="Website" className="h-7 text-xs sm:col-span-2" />
                      </div>
                      {(c.website || c.business_name) && (
                        <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
                          {c.website && (
                            <a href={c.website.startsWith("http") ? c.website : `https://${c.website}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                              Visit site →
                            </a>
                          )}
                          <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(`${c.business_name} ${c.city_state} email contact`)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground hover:underline"
                          >
                            Find email on Google →
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between gap-2 pt-3 border-t border-border">
              <Button variant="ghost" onClick={() => setCandidates(null)} disabled={submitBusy}>← Regenerate</Button>
              <Button
                onClick={importSelected}
                disabled={submitBusy || candidates.filter(c => c.selected).length === 0}
                className="bg-health text-health-foreground hover:bg-health/90"
              >
                {submitBusy ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Importing…</> : `Import ${candidates.filter(c => c.selected).length} leads`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
