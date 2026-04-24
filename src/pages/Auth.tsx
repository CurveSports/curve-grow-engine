import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import logoFullWhite from "@/assets/curve-logo-full-white.png";
import logoIcon from "@/assets/curve-logo-icon.png";
import { TrendingUp, Target, Sparkles } from "lucide-react";

type Mode = "signin" | "magic" | "forgot";

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<null | "magic" | "reset">(null);

  const onSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else navigate("/", { replace: true });
  };

  const onMagic = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectUrl },
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else setSent("magic");
  };

  const onForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else setSent("reset");
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Brand panel — dark ink with lime accent. Compact on mobile, full-height on desktop. */}
      <aside className="lg:w-[44%] xl:w-[40%] bg-nav text-nav-foreground relative overflow-hidden">
        {/* Lime gradient glow */}
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -left-32 w-80 h-80 rounded-full bg-accent/10 blur-3xl pointer-events-none" />

        <div className="relative h-full flex flex-col px-8 lg:px-12 py-8 lg:py-12">
          <div className="flex items-center">
            <img src={logoFullWhite} alt="CURVE Sports" className="h-8 lg:h-10 w-auto object-contain" />
          </div>

          {/* Hide the marketing block on mobile to keep auth fast */}
          <div className="hidden lg:flex flex-1 flex-col justify-center max-w-md">
            <p className="curve-eyebrow text-accent mb-5">The revenue operating system</p>
            <h1 className="font-display text-5xl xl:text-6xl font-extrabold leading-[1.05] tracking-tight mb-6">
              Build a better<br />youth sports<br />
              <span className="text-accent">organization.</span>
            </h1>
            <p className="text-nav-muted text-base leading-relaxed mb-10">
              Assess where you stand. Plan what's next. Grow with confidence — backed by data, transparency, and a partner who's done it before.
            </p>

            <ul className="space-y-4 text-sm">
              <Feature icon={TrendingUp} title="Revenue diagnostics">Know exactly where your gaps are.</Feature>
              <Feature icon={Target} title="Action plans that work">Tasks, owners, deadlines — no guesswork.</Feature>
              <Feature icon={Sparkles} title="Built by operators">Standards, calculators, and outreach playbooks.</Feature>
            </ul>
          </div>

          <div className="hidden lg:block text-xs text-nav-muted mt-8">
            © {new Date().getFullYear()} CURVE Sports
          </div>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex-1 flex items-center justify-center px-6 py-10 lg:py-12 bg-background">
        <div className="w-full max-w-md animate-fade-in">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <img src={logoIcon} alt="" className="h-9 w-9 object-contain" />
            <span className="font-display font-bold text-lg tracking-tight">Curve OS</span>
          </div>

          <p className="curve-eyebrow mb-3">
            {mode === "signin" ? "Sign in" : mode === "magic" ? "Magic link" : "Reset password"}
          </p>
          <h2 className="text-3xl lg:text-4xl font-display font-bold mb-3 leading-tight tracking-tight">
            {mode === "signin" ? "Welcome back." : mode === "magic" ? "One-time link." : "Reset your password."}
          </h2>
          <p className="text-muted-foreground mb-8">
            {mode === "signin"
              ? "Sign in with your email and password."
              : mode === "magic"
              ? "We'll email you a one-time sign-in link."
              : "Enter your email and we'll send you a password reset link."}
          </p>

          {sent ? (
            <div className="curve-card border-l-4 border-l-accent">
              <h3 className="font-display font-bold text-lg mb-1">Check your inbox</h3>
              <p className="text-sm text-muted-foreground">
                {sent === "magic" ? "We sent a sign-in link to " : "We sent a password reset link to "}
                <span className="text-foreground font-semibold">{email}</span>.
              </p>
              <button
                onClick={() => { setSent(null); setMode("signin"); }}
                className="text-sm text-foreground font-semibold mt-4 hover:underline"
              >
                ← Back to sign in
              </button>
            </div>
          ) : mode === "signin" ? (
            <form onSubmit={onSignIn} className="space-y-5">
              <div>
                <Label htmlFor="email" className="text-sm font-semibold">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourclub.com"
                  className="mt-2 h-12"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs text-foreground font-semibold hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 h-12"
                />
              </div>
              <Button type="submit" variant="cta" disabled={loading} className="w-full h-12 text-base">
                {loading ? "Signing in…" : "Sign in"}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setMode("magic")}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  Or sign in with a magic link
                </button>
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                Access is invite-only. If you don't have access, contact your CURVE consultant.
              </p>
            </form>
          ) : mode === "magic" ? (
            <form onSubmit={onMagic} className="space-y-5">
              <div>
                <Label htmlFor="email" className="text-sm font-semibold">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourclub.com"
                  className="mt-2 h-12"
                />
              </div>
              <Button type="submit" variant="cta" disabled={loading} className="w-full h-12 text-base">
                {loading ? "Sending…" : "Send sign-in link"}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  ← Back to password sign in
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={onForgot} className="space-y-5">
              <div>
                <Label htmlFor="email" className="text-sm font-semibold">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@yourclub.com"
                  className="mt-2 h-12"
                />
              </div>
              <Button type="submit" variant="cta" disabled={loading} className="w-full h-12 text-base">
                {loading ? "Sending…" : "Send reset link"}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  ← Back to sign in
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof TrendingUp;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <div className="mt-0.5 h-9 w-9 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-accent" />
      </div>
      <div>
        <p className="font-semibold text-white">{title}</p>
        <p className="text-nav-muted text-sm">{children}</p>
      </div>
    </li>
  );
}
