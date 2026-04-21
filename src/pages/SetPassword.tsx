import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SetPassword() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { mark } = useOnboarding();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const validatePassword = (pwd: string) => {
    const errors: string[] = [];
    if (pwd.length < 8) errors.push("At least 8 characters");
    if (!/[A-Z]/.test(pwd)) errors.push("1 uppercase letter");
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) errors.push("1 special character");
    return errors;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validatePassword(password);
    if (validationErrors.length > 0) {
      toast.error("Password must include: " + validationErrors.join(", "));
      return;
    }
    if (password !== confirm) { toast.error("Passwords don't match."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setLoading(false); toast.error(error.message); return; }
    await mark("password_set_at");
    setLoading(false);
    toast.success("Password set.");
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="curve-container py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-foreground flex items-center justify-center">
            <span className="text-background font-display font-bold text-sm">C</span>
          </div>
          <span className="font-display font-semibold text-lg tracking-tight">Curve OS</span>
        </div>
        <button onClick={signOut} className="text-xs text-muted-foreground hover:text-foreground">Sign out</button>
      </div>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md animate-fade-in">
          <p className="curve-eyebrow mb-3">Step 1 of 2 · Secure your account</p>
          <h1 className="text-4xl font-display font-semibold mb-3 leading-tight">Create your password.</h1>
          <p className="text-muted-foreground mb-10">
            Choose a password you'll use for future sign-ins. You can still request magic links anytime.
          </p>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <Label htmlFor="password" className="text-sm font-medium">New password</Label>
              <Input id="password" type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)} className="mt-2 h-12" />
              <p className="text-xs text-muted-foreground mt-2">Minimum 8 characters.</p>
            </div>
            <div>
              <Label htmlFor="confirm" className="text-sm font-medium">Confirm password</Label>
              <Input id="confirm" type="password" required value={confirm}
                onChange={(e) => setConfirm(e.target.value)} className="mt-2 h-12" />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-12 text-base">
              {loading ? "Saving…" : "Set password & continue"}
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
