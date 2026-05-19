import AppShell from "@/components/AppShell";
import SharedFilesTab from "@/components/shared/SharedFilesTab";
import { useAuth } from "@/hooks/useAuth";

export default function Files() {
  const { profile } = useAuth();
  const orgId = profile?.org_id;
  return (
    <AppShell title="Shared Files">
      {orgId ? (
        <SharedFilesTab orgId={orgId} />
      ) : (
        <p className="text-sm text-muted-foreground">No organization on your profile yet.</p>
      )}
    </AppShell>
  );
}
