import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Copy, Plus, Mail, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";

const STAFF_BASE = `${window.location.origin}/onboard/`;
const SELLER_BASE = `${window.location.origin}/portal/seller/`;

const CONFIG_KEYS: { key: string; label: string; type?: "textarea" }[] = [
  { key: "compliance_deadline", label: "Compliance deadline (YYYY-MM-DD)" },
  { key: "compliance_contact_name", label: "Compliance contact name" },
  { key: "compliance_contact_email", label: "Compliance contact email" },
  { key: "ori_number", label: "ORI Number (Florida fingerprint)" },
  { key: "fingerprint_instructions", label: "Fingerprint instructions", type: "textarea" },
  { key: "fingerprint_vendor_1_name", label: "Vendor 1 — name" },
  { key: "fingerprint_vendor_1_address", label: "Vendor 1 — address" },
  { key: "fingerprint_vendor_1_url", label: "Vendor 1 — booking URL" },
  { key: "fingerprint_vendor_2_name", label: "Vendor 2 — name" },
  { key: "fingerprint_vendor_2_address", label: "Vendor 2 — address" },
  { key: "fingerprint_vendor_2_url", label: "Vendor 2 — booking URL" },
  { key: "fingerprint_vendor_3_name", label: "Vendor 3 — name" },
  { key: "fingerprint_vendor_3_address", label: "Vendor 3 — address" },
  { key: "fingerprint_vendor_3_url", label: "Vendor 3 — booking URL" },
  { key: "background_check_portal_url", label: "Background check portal URL" },
  { key: "background_check_instructions", label: "Background check instructions", type: "textarea" },
  { key: "concussion_training_url", label: "Concussion training URL" },
  { key: "concussion_training_instructions", label: "Concussion training instructions", type: "textarea" },
  { key: "abuse_prevention_training_url", label: "Abuse-prevention training URL" },
  { key: "abuse_prevention_instructions", label: "Abuse-prevention training instructions", type: "textarea" },
];

export default function PortalsPanel({ acquisition }: { acquisition: any }) {
  const [loading, setLoading] = useState(true);
  const [sellers, setSellers] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [tokens, setTokens] = useState<Map<string, any>>(new Map());
  const [config, setConfig] = useState<Record<string, string>>({});
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviting, setInviting] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: pu }, { data: st }, { data: tk }, { data: cfg }] = await Promise.all([
      supabase.from("acquisition_portal_users").select("*").eq("acquisition_id", acquisition.id).eq("portal_type", "seller").order("created_at"),
      supabase.from("acquisition_staff").select("id, first_name, last_name, email, role").eq("acquisition_id", acquisition.id).eq("is_active", true).order("last_name"),
      supabase.from("acquisition_staff_tokens").select("*").eq("acquisition_id", acquisition.id),
      supabase.from("acquisition_portal_config").select("config_key, config_value").eq("acquisition_id", acquisition.id),
    ]);
    setSellers(pu ?? []);
    setStaff(st ?? []);
    const tm = new Map<string, any>();
    (tk ?? []).forEach((t: any) => tm.set(t.staff_id, t));
    setTokens(tm);
    const cm: Record<string, string> = {};
    (cfg ?? []).forEach((c: any) => { cm[c.config_key] = c.config_value ?? ""; });
    setConfig(cm);
    setLoading(false);
  };
  useEffect(() => { load(); }, [acquisition.id]);

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success("Link copied"); };

  const inviteSeller = async () => {
    if (!inviteEmail.trim()) return toast.error("Email required");
    setInviting(true);
    const { error } = await supabase.functions.invoke("acquisition-invite-seller", {
      body: { acquisition_id: acquisition.id, email: inviteEmail.trim(), display_name: inviteName.trim() || null },
    });
    setInviting(false);
    if (error) return toast.error(error.message);
    toast.success("Seller added — copy the magic-link from the user list and share manually");
    setInviteEmail(""); setInviteName(""); load();
  };

  const revokeSeller = async (id: string) => {
    if (!confirm("Revoke access for this seller?")) return;
    await supabase.from("acquisition_portal_users").update({ is_active: false }).eq("id", id);
    toast.success("Access revoked"); load();
  };

  const generateToken = async (staffId: string) => {
    const tok = Array.from({ length: 32 }, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".charAt(Math.floor(Math.random() * 62))).join("");
    const { error } = await supabase.from("acquisition_staff_tokens").insert({
      acquisition_id: acquisition.id, staff_id: staffId, token: tok, is_active: true,
    });
    if (error) return toast.error(error.message);
    toast.success("Link generated"); load();
  };

  const markSent = async (tokenId: string) => {
    await supabase.from("acquisition_staff_tokens").update({ link_sent_at: new Date().toISOString() }).eq("id", tokenId);
    load();
  };

  const saveConfig = async (key: string, value: string) => {
    const { error } = await supabase.from("acquisition_portal_config").upsert({
      acquisition_id: acquisition.id, config_key: key, config_value: value,
    }, { onConflict: "acquisition_id,config_key" });
    if (error) return toast.error(error.message);
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>;

  const sellerLink = `${SELLER_BASE}${acquisition.id}`;

  return (
    <div className="space-y-6">
      {/* SELLER PORTAL */}
      <section className="curve-card">
        <h2 className="font-display text-xl font-bold mb-1">Seller Portal</h2>
        <p className="text-sm text-muted-foreground mb-4">Login-based portal at <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{sellerLink}</code></p>

        <div className="border border-border rounded-lg p-3 mb-4 bg-muted/30">
          <p className="text-xs uppercase font-bold text-muted-foreground mb-2">Invite previous owner</p>
          <div className="flex flex-wrap gap-2 items-center">
            <Input className="h-9 w-56" placeholder="Email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            <Input className="h-9 w-56" placeholder="Display name (optional)" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
            <Button size="sm" disabled={inviting} onClick={inviteSeller} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-1" /> Add seller
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">A seller_portal account is created. Share the portal URL above; the seller signs in with magic-link from the login screen.</p>
        </div>

        <div className="space-y-2">
          {sellers.length === 0 && <p className="text-sm text-muted-foreground italic">No sellers invited yet.</p>}
          {sellers.map((s) => (
            <div key={s.id} className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${s.is_active ? "bg-card" : "bg-muted/30 opacity-60"}`}>
              <div className="min-w-0">
                <p className="font-semibold text-sm">{s.display_name ?? s.email}</p>
                <p className="text-xs text-muted-foreground">{s.email} · {s.last_login_at ? `Last login ${new Date(s.last_login_at).toLocaleDateString()}` : "Never logged in"}{!s.is_active ? " · revoked" : ""}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => copy(sellerLink)}><Copy className="h-3.5 w-3.5 mr-1" /> Copy link</Button>
                {s.is_active && <Button size="sm" variant="ghost" onClick={() => revokeSeller(s.id)}><Trash2 className="h-3.5 w-3.5 text-rose-600" /></Button>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* STAFF ONBOARDING */}
      <section className="curve-card">
        <h2 className="font-display text-xl font-bold mb-1">Staff Onboarding Links</h2>
        <p className="text-sm text-muted-foreground mb-4">No-login unique URLs for staff to complete compliance.</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Email</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((p) => {
                const t = tokens.get(p.id);
                const link = t?.token ? `${STAFF_BASE}${t.token}` : null;
                return (
                  <tr key={p.id} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-medium">{p.first_name} {p.last_name}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{p.role}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{p.email ?? "—"}</td>
                    <td className="py-2 pr-3 text-xs">
                      {!t ? <span className="text-muted-foreground">No link</span> :
                        !t.is_active ? <span className="text-rose-600">Revoked</span> :
                        t.last_accessed_at ? <span className="text-emerald-700">Accessed {new Date(t.last_accessed_at).toLocaleDateString()} ({t.access_count}×)</span> :
                        t.link_sent_at ? <span className="text-amber-700">Sent {new Date(t.link_sent_at).toLocaleDateString()}, never accessed</span> :
                        <span className="text-muted-foreground">Generated, not sent</span>}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-1.5">
                        {!t ? (
                          <Button size="sm" variant="outline" onClick={() => generateToken(p.id)}><Plus className="h-3 w-3 mr-1" /> Generate link</Button>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" onClick={() => copy(link!)}><Copy className="h-3 w-3 mr-1" /> Copy</Button>
                            <a href={link!} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost"><ExternalLink className="h-3 w-3" /></Button></a>
                            {!t.link_sent_at && <Button size="sm" variant="ghost" onClick={() => markSent(t.id)}><Mail className="h-3 w-3 mr-1" /> Mark sent</Button>}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {staff.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-muted-foreground italic">Add staff in the Compliance tab first.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* CONFIG */}
      <section className="curve-card">
        <h2 className="font-display text-xl font-bold mb-1">Portal Configuration</h2>
        <p className="text-sm text-muted-foreground mb-4">Per-acquisition links, instructions, and contacts shown in the staff onboarding portal.</p>

        <div className="grid md:grid-cols-2 gap-3">
          {CONFIG_KEYS.map((c) => (
            <ConfigField key={c.key} keyName={c.key} label={c.label} type={c.type}
              value={config[c.key] ?? ""}
              onChange={(v) => setConfig({ ...config, [c.key]: v })}
              onBlur={(v) => saveConfig(c.key, v)} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ConfigField({ keyName, label, type, value, onChange, onBlur }: { keyName: string; label: string; type?: "textarea"; value: string; onChange: (v: string) => void; onBlur: (v: string) => void }) {
  const className = type === "textarea" ? "md:col-span-2" : "";
  return (
    <div className={className}>
      <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</label>
      {type === "textarea" ? (
        <Textarea rows={3} className="text-sm mt-1" value={value} onChange={(e) => onChange(e.target.value)} onBlur={(e) => onBlur(e.target.value)} />
      ) : (
        <Input className="h-9 text-sm mt-1" value={value} onChange={(e) => onChange(e.target.value)} onBlur={(e) => onBlur(e.target.value)} />
      )}
    </div>
  );
}
