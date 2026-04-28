import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";

// Routes the user to the right place based on their onboarding + role state.
export default function RouteResolver() {
  const { loading, session, role, profile, user, refresh } = useAuth();
  const { state: onboarding, loading: obLoading } = useOnboarding();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (loading || obLoading) return;

    (async () => {
      if (!session) { navigate("/auth", { replace: true }); return; }

      // No role yet — try to claim a pending invitation (self-heal)
      if (!role && !claimed) {
        setClaimed(true);
        const { data, error } = await supabase.rpc("claim_pending_invitation");
        const row = Array.isArray(data) ? data[0] : data;
        if (!error && row?.claimed) {
          await refresh();
          return;
        }
      }

      if (!role) { setChecking(false); return; }

      // 1. Password gate — applies to ALL users (admins and org users) before anything else
      if (!onboarding?.password_set_at) {
        navigate("/set-password", { replace: true });
        return;
      }

      // Admins skip remaining onboarding gates and go straight to their dashboard
      if (role === "admin") { navigate("/admin", { replace: true }); return; }

      // 2. Welcome gate (org users only)
      if (!onboarding?.welcomed_at) {
        navigate("/welcome", { replace: true });
        return;
      }

      if (role === "org_user" && profile?.org_id) {
        const { data: intake } = await supabase
          .from("organization_intake")
          .select("id")
          .eq("org_id", profile.org_id)
          .maybeSingle();
        if (intake) { navigate("/dashboard", { replace: true }); return; }
        // Pre-intake: route org primary through the customize step once
        if (!onboarding?.branding_completed_at && profile.user_id && profile.org_id) {
          // Only the primary user is gated — peers go straight to intake
          const { data: org } = await supabase
            .from("organizations")
            .select("primary_user_id")
            .eq("id", profile.org_id)
            .maybeSingle();
          if (org?.primary_user_id === user?.id) {
            navigate("/customize", { replace: true });
            return;
          }
        }
        navigate("/intake", { replace: true });
        return;
      }

      setChecking(false);
    })();
  }, [loading, obLoading, session, role, profile, user, onboarding, navigate, refresh, claimed]);

  if (loading || obLoading || checking) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Loading…</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl font-semibold mb-3">Account pending</h1>
        <p className="text-muted-foreground text-sm">
          Your account isn't yet linked to an organization. Please contact your Curve consultant
          for access, or sign out and use the email address that received the invitation.
        </p>
      </div>
    </div>
  );
}
