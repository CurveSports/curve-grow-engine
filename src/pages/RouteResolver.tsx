import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

// Routes the user to the right place based on their state.
export default function RouteResolver() {
  const { loading, session, role, profile, refresh } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (loading) return;

    (async () => {
      if (!session) { navigate("/auth", { replace: true }); return; }
      if (role === "admin") { navigate("/admin", { replace: true }); return; }
      if (role === "org_user" && profile?.org_id) {
        const { data: intake } = await supabase
          .from("organization_intake")
          .select("id")
          .eq("org_id", profile.org_id)
          .maybeSingle();
        if (intake) navigate("/report", { replace: true });
        else navigate("/intake", { replace: true });
        return;
      }

      // No role yet — try to claim a pending invitation (self-heal)
      if (!claimed) {
        setClaimed(true);
        const { data, error } = await supabase.rpc("claim_pending_invitation");
        const row = Array.isArray(data) ? data[0] : data;
        if (!error && row?.claimed) {
          await refresh();
          return; // effect will re-run with new role
        }
      }

      // Has session but no role / no invite — show pending state
      setChecking(false);
    })();
  }, [loading, session, role, profile, navigate, refresh, claimed]);

  if (loading || checking) {
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
