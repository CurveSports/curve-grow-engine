import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useBranding } from "@/hooks/useBranding";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Upload, ImageOff, Palette, RotateCcw, ArrowRight } from "lucide-react";
import SendPlatformsManager from "@/components/communications/SendPlatformsManager";
import EmailConnectionsManager from "@/components/communications/EmailConnectionsManager";

// ----- Color helpers -----
function hexToHsl(hex: string): string | null {
  const m = hex.replace("#", "").match(/^([0-9a-f]{6})$/i);
  if (!m) return null;
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function hslToHex(hsl: string | null): string {
  if (!hsl) return "#000000";
  const m = hsl.match(/^(\d+)\s+(\d+)%\s+(\d+)%$/);
  if (!m) return "#000000";
  const h = +m[1] / 360, s = +m[2] / 100, l = +m[3] / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) { r = g = b = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const DEFAULT_PRIMARY = "222 47% 11%";
const DEFAULT_ACCENT = "142 71% 45%";

export default function Settings() {
  const { user, profile, role, isPrimary, refresh: refreshAuth } = useAuth();
  const { logoUrl, primaryHsl, accentHsl, refresh: refreshBranding } = useBranding();

  const canEditBranding = role === "admin" || isPrimary;

  // ----- Profile state -----
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => { setFullName(profile?.full_name ?? ""); }, [profile?.full_name]);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("user_id", user.id);
    setSavingProfile(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    refreshAuth();
  };

  const updatePassword = async () => {
    if (newPassword.length < 8) return toast.error("Password must be at least 8 characters");
    if (newPassword !== confirmPassword) return toast.error("Passwords don't match");
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) return toast.error(error.message);
    setNewPassword(""); setConfirmPassword("");
    toast.success("Password changed");
  };

  // ----- Branding state -----
  const [primaryHex, setPrimaryHex] = useState(hslToHex(primaryHsl ?? DEFAULT_PRIMARY));
  const [accentHex, setAccentHex] = useState(hslToHex(accentHsl ?? DEFAULT_ACCENT));
  const [savingBranding, setSavingBranding] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { setPrimaryHex(hslToHex(primaryHsl ?? DEFAULT_PRIMARY)); }, [primaryHsl]);
  useEffect(() => { setAccentHex(hslToHex(accentHsl ?? DEFAULT_ACCENT)); }, [accentHsl]);

  const saveBranding = async () => {
    if (!profile?.org_id || !user) return;
    setSavingBranding(true);
    const primary = hexToHsl(primaryHex);
    const accent = hexToHsl(accentHex);
    const { error } = await supabase.from("org_branding").upsert({
      org_id: profile.org_id,
      primary_hsl: primary,
      accent_hsl: accent,
      updated_by: user.id,
    }, { onConflict: "org_id" });
    setSavingBranding(false);
    if (error) return toast.error(error.message);
    toast.success("Branding saved");
    refreshBranding();
  };

  const resetBranding = () => {
    setPrimaryHex(hslToHex(DEFAULT_PRIMARY));
    setAccentHex(hslToHex(DEFAULT_ACCENT));
  };

  const onLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.org_id || !user) return;
    if (file.size > 2 * 1024 * 1024) return toast.error("Logo must be under 2 MB");
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${profile.org_id}/logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("org-logos").upload(path, file, {
      cacheControl: "3600", contentType: file.type,
    });
    if (upErr) { setUploading(false); return toast.error(upErr.message); }
    const { data: pub } = supabase.storage.from("org-logos").getPublicUrl(path);
    const { error: dbErr } = await supabase.from("org_branding").upsert({
      org_id: profile.org_id,
      logo_url: pub.publicUrl,
      updated_by: user.id,
    }, { onConflict: "org_id" });
    setUploading(false);
    if (dbErr) return toast.error(dbErr.message);
    toast.success("Logo uploaded");
    refreshBranding();
    e.target.value = "";
  };

  const removeLogo = async () => {
    if (!profile?.org_id || !user) return;
    const { error } = await supabase.from("org_branding").update({
      logo_url: null, updated_by: user.id,
    }).eq("org_id", profile.org_id);
    if (error) return toast.error(error.message);
    toast.success("Logo removed");
    refreshBranding();
  };

  return (
    <AppShell title="Settings">
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your profile, organization branding, and team.</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            {role === "org_user" && <TabsTrigger value="organization">Organization</TabsTrigger>}
            <TabsTrigger value="sending">Sending</TabsTrigger>
            {role === "org_user" && isPrimary && <TabsTrigger value="team">Team</TabsTrigger>}
          </TabsList>

          <TabsContent value="sending" className="space-y-6">
            {role === "org_user" && profile?.org_id && user && (
              <SendPlatformsManager orgId={profile.org_id} userId={user.id} canEdit={isPrimary} />
            )}
            {user && <EmailConnectionsManager userId={user.id} />}
          </TabsContent>

          {/* ===== PROFILE ===== */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="p-6 space-y-4">
              <div>
                <h2 className="font-display text-lg font-semibold">Your profile</h2>
                <p className="text-sm text-muted-foreground">How you appear in the app.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fullname">Full name</Label>
                  <Input id="fullname" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={profile?.email ?? ""} disabled />
                </div>
              </div>
              <div>
                <Button onClick={saveProfile} disabled={savingProfile}>
                  {savingProfile ? "Saving…" : "Save profile"}
                </Button>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div>
                <h2 className="font-display text-lg font-semibold">Change password</h2>
                <p className="text-sm text-muted-foreground">Use at least 8 characters.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="new-pass">New password</Label>
                  <Input id="new-pass" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-pass">Confirm</Label>
                  <Input id="confirm-pass" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
              </div>
              <div>
                <Button onClick={updatePassword} disabled={savingPassword || !newPassword}>
                  {savingPassword ? "Updating…" : "Update password"}
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* ===== ORGANIZATION / BRANDING ===== */}
          {role === "org_user" && (
            <TabsContent value="organization" className="space-y-6">
              {!canEditBranding && (
                <Card className="p-4 bg-muted/40 text-sm text-muted-foreground">
                  Only the organization's primary user can edit branding. You're seeing the current settings in read-only mode.
                </Card>
              )}

              <Card className="p-6 space-y-5">
                <div>
                  <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                    <Upload className="h-4 w-4" /> Logo
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Shown in the navigation and on reports. PNG, JPG, WEBP, or SVG accepted — transparent PNG or SVG at 200×60px+ looks best. Max 2 MB.
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="h-20 w-44 rounded-lg border border-border bg-nav flex items-center justify-center overflow-hidden">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Org logo" className="max-h-16 max-w-40 object-contain" />
                    ) : (
                      <div className="flex flex-col items-center text-nav-muted">
                        <ImageOff className="h-5 w-5" />
                        <span className="text-[10px] mt-1">No logo</span>
                      </div>
                    )}
                  </div>
                  {canEditBranding && (
                    <div className="flex flex-col gap-2">
                      <label className="inline-flex">
                        <input type="file" accept="image/*" className="hidden" onChange={onLogoFile} disabled={uploading} />
                        <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-foreground text-background text-sm font-medium cursor-pointer hover:opacity-90">
                          <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : logoUrl ? "Replace logo" : "Upload logo"}
                        </span>
                      </label>
                      {logoUrl && (
                        <Button variant="ghost" size="sm" onClick={removeLogo}>Remove logo</Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-6 space-y-5">
                <div>
                  <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                    <Palette className="h-4 w-4" /> Color scheme
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Pick the primary (ink) and accent (highlight) colors used across buttons, links, and active nav items.
                  </p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <ColorField label="Primary" hex={primaryHex} onChange={setPrimaryHex} disabled={!canEditBranding} />
                  <ColorField label="Accent" hex={accentHex} onChange={setAccentHex} disabled={!canEditBranding} />
                </div>

                {/* Live preview */}
                <div className="rounded-lg border border-border p-4 space-y-3 bg-card">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Live preview</div>
                  <div className="flex items-center gap-3">
                    <div
                      className="h-9 px-4 inline-flex items-center rounded-md text-sm font-medium text-white"
                      style={{ background: accentHex }}
                    >
                      Primary action
                    </div>
                    <div
                      className="h-9 px-4 inline-flex items-center rounded-md text-sm font-medium text-white"
                      style={{ background: primaryHex }}
                    >
                      Ink button
                    </div>
                    <a className="text-sm font-medium underline" style={{ color: accentHex }} href="#">A linked element</a>
                  </div>
                </div>

                {canEditBranding && (
                  <div className="flex items-center gap-2">
                    <Button onClick={saveBranding} disabled={savingBranding}>
                      {savingBranding ? "Saving…" : "Save branding"}
                    </Button>
                    <Button variant="ghost" onClick={resetBranding}>
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset to defaults
                    </Button>
                  </div>
                )}
              </Card>
            </TabsContent>
          )}

          {/* ===== TEAM ===== */}
          {role === "org_user" && isPrimary && (
            <TabsContent value="team">
              <Card className="p-6 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-semibold">Team members</h2>
                  <p className="text-sm text-muted-foreground">Invite peers and manage who has access to your workspace.</p>
                </div>
                <Button asChild>
                  <Link to="/team">Manage team <ArrowRight className="h-4 w-4 ml-1.5" /></Link>
                </Button>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppShell>
  );
}

function ColorField({ label, hex, onChange, disabled }: { label: string; hex: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-10 w-14 rounded-md border border-border cursor-pointer disabled:opacity-50"
        />
        <Input
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="font-mono uppercase"
          maxLength={7}
        />
      </div>
    </div>
  );
}
