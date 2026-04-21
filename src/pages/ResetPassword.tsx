import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery hash and fires a PASSWORD_RECOVERY event.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated.");
      navigate("/", { replace: true });
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
          <p className="curve-eyebrow mb-3">Set new password</p>
          <h1 className="text-4xl font-display font-semibold mb-3 leading-tight">
            Choose a new password.
          </h1>
          <p className="text-muted-foreground mb-10">
            {ready
              ? "Enter and confirm your new password below."
              : "Verifying your reset link…"}
          </p>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <Label htmlFor="password" className="text-sm font-medium">New password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 h-12"
                disabled={!ready}
              />
            </div>
            <div>
              <Label htmlFor="confirm" className="text-sm font-medium">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-2 h-12"
                disabled={!ready}
              />
            </div>
            <Button type="submit" disabled={loading || !ready} className="w-full h-12 text-base">
              {loading ? "Updating…" : "Update password"}
            </Button>
          </form>
        </div>
      </main>

      <footer className="curve-container py-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} Curve Sports
      </footer>
    </div>
  );
}
