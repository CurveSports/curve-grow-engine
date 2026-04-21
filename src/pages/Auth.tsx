import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

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
    if (error) {
      toast.error(error.message);
    } else {
      navigate("/", { replace: true });
    }
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
    <div className="min-h-screen flex flex-col">
      <div className="curve-container py-6">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-foreground flex items-center justify-center">
            <span className="text-background font-display font-bold text-sm">C</span>
          </div>
          <span className="font-display font-semibold text-lg tracking-tight">Curve OS</span>
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md animate-fade-in">
          <p className="curve-eyebrow mb-3">
            {mode === "signin" ? "Sign in" : mode === "magic" ? "Magic link" : "Reset password"}
          </p>
          <h1 className="text-4xl font-display font-semibold mb-3 leading-tight">
            The revenue operating system.
          </h1>
          <p className="text-muted-foreground mb-10">
            {mode === "signin"
              ? "Sign in with your email and password."
              : mode === "magic"
              ? "We'll email you a one-time sign-in link."
              : "Enter your email and we'll send you a password reset link."}
          </p>

          {sent ? (
            <div className="curve-card border-l-4 border-l-accent">
              <h2 className="font-display font-semibold text-lg mb-1">Check your inbox</h2>
              <p className="text-sm text-muted-foreground">
                {sent === "magic" ? "We sent a sign-in link to " : "We sent a password reset link to "}
                <span className="text-foreground font-medium">{email}</span>.
              </p>
              <button
                onClick={() => { setSent(null); setMode("signin"); }}
                className="text-sm text-accent mt-4 hover:underline"
              >
                ← Back to sign in
              </button>
            </div>
          ) : mode === "signin" ? (
            <form onSubmit={onSignIn} className="space-y-5">
              <div>
                <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
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
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs text-accent hover:underline"
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
              <Button type="submit" disabled={loading} className="w-full h-12 text-base">
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
              <p className="text-xs text-muted-foreground">
                Access is invite-only. If you don't have access, contact your Curve consultant.
              </p>
            </form>
          ) : mode === "magic" ? (
            <form onSubmit={onMagic} className="space-y-5">
              <div>
                <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
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
              <Button type="submit" disabled={loading} className="w-full h-12 text-base">
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
                <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
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
              <Button type="submit" disabled={loading} className="w-full h-12 text-base">
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

      <footer className="curve-container py-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} Curve Sports
      </footer>
    </div>
  );
}
