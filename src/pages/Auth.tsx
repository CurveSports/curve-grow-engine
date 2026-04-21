import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectUrl },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
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
          <p className="curve-eyebrow mb-3">Sign in</p>
          <h1 className="text-4xl font-display font-semibold mb-3 leading-tight">
            The revenue operating system.
          </h1>
          <p className="text-muted-foreground mb-10">
            Enter the email address associated with your organization. We'll send you a secure sign-in link.
          </p>

          {sent ? (
            <div className="curve-card border-l-4 border-l-accent">
              <h2 className="font-display font-semibold text-lg mb-1">Check your inbox</h2>
              <p className="text-sm text-muted-foreground">
                We sent a sign-in link to <span className="text-foreground font-medium">{email}</span>. Click the link to access your account.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
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
              <p className="text-xs text-muted-foreground">
                Access is invite-only. If you don't have access, contact your Curve consultant.
              </p>
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
