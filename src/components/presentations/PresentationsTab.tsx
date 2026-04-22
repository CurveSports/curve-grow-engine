import { useMemo, useState } from "react";
import { PresentationShell, type SlideDef } from "./PresentationShell";
import { usePresentationData } from "./usePresentationData";
import { usePresentationEdits } from "./usePresentationEdits";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

import { Slide1Snapshot } from "./internal/Slide1Snapshot";
import { Slide2Health } from "./internal/Slide2Health";
import { Slide3Risk } from "./internal/Slide3Risk";
import { Slide4Revenue } from "./internal/Slide4Revenue";
import { Slide5Engines } from "./internal/Slide5Engines";
import { Slide6Conversation } from "./internal/Slide6Conversation";
import { Slide7Notes } from "./internal/Slide7Notes";

import { KickoffSlide1 } from "./client/KickoffSlide1";
import { KickoffSlide2 } from "./client/KickoffSlide2";
import { KickoffSlide3 } from "./client/KickoffSlide3";
import { KickoffSlide4 } from "./client/KickoffSlide4";
import { KickoffSlide5 } from "./client/KickoffSlide5";
import { KickoffSlide6 } from "./client/KickoffSlide6";

type TopMode = "internal" | "client";
type ClientMode = "kickoff" | "progress";

export function PresentationsTab({ orgId }: { orgId: string }) {
  const [mode, setMode] = useState<TopMode>("internal");
  const [clientMode, setClientMode] = useState<ClientMode>("kickoff");
  const [editing, setEditing] = useState(false);

  const data = usePresentationData(orgId);
  const internalEdits = usePresentationEdits(orgId, "internal_brief");
  const clientType = clientMode === "kickoff" ? "client_kickoff" : "client_progress";
  const clientEdits = usePresentationEdits(orgId, clientType);

  if (data.loading || internalEdits.loading || clientEdits.loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading presentation…</div>;
  }
  if (!data.metrics) {
    return (
      <div className="curve-card text-center py-16">
        <p className="font-semibold">Intake not yet completed — presentations unavailable</p>
        <p className="text-sm text-muted-foreground mt-2">Once the org submits intake and metrics are calculated, presentations will appear here.</p>
      </div>
    );
  }

  const orgName = data.org?.name ?? "Organization";

  const internalSlides: SlideDef[] = useMemo(() => [
    { id: 1, name: "Intelligence Snapshot", render: () => <Slide1Snapshot orgName={orgName} metrics={data.metrics} intake={data.intake} /> },
    { id: 2, name: "Organizational Health", render: () => <Slide2Health metrics={data.metrics} intake={data.intake} /> },
    { id: 3, name: "Risk Assessment", render: () => <Slide3Risk metrics={data.metrics} intake={data.intake} /> },
    { id: 4, name: "Revenue Intelligence", render: () => <Slide4Revenue metrics={data.metrics} /> },
    { id: 5, name: "Engines & Activation", render: () => <Slide5Engines orgId={orgId} metrics={data.metrics} tasks={data.tasks} get={internalEdits.get} save={internalEdits.save} editing={editing} /> },
    { id: 6, name: "Conversation Guide", render: () => <Slide6Conversation intake={data.intake} metrics={data.metrics} get={internalEdits.get} save={internalEdits.save} editing={editing} /> },
    { id: 7, name: "Notes & History", render: () => <Slide7Notes orgId={orgId} tasks={data.tasks} projects={data.projects} notes={data.notes} activity={data.activity} scenarios={data.scenarios} get={internalEdits.get} save={internalEdits.save} editing={editing} /> },
  ], [orgName, data, editing, internalEdits, orgId]);

  const showScoresKey = "__show_scores";
  const showScores = clientEdits.get(4, showScoresKey, "true") === "true";
  const setShowScores = (v: boolean) => clientEdits.save(4, showScoresKey, v ? "true" : "false");

  const daysIn = data.org?.plan_activated_at
    ? Math.floor((Date.now() - new Date(data.org.plan_activated_at).getTime()) / 86400000)
    : null;

  const clientSlides: SlideDef[] = useMemo(() => [
    { id: 1, name: "Your Organization", render: () => <KickoffSlide1 org={data.org} intake={data.intake} metrics={data.metrics} daysIn={clientMode === "progress" ? daysIn : null} /> },
    { id: 2, name: "Revenue Picture", render: () => <KickoffSlide2 metrics={data.metrics} intake={data.intake} /> },
    { id: 3, name: "Total Opportunity", render: () => <KickoffSlide3 metrics={data.metrics} /> },
    { id: 4, name: "Your Engines", render: () => <KickoffSlide4 metrics={data.metrics} showScores={showScores} /> },
    { id: 5, name: "90-Day Plan", render: () => <KickoffSlide5 projects={data.projects} tasks={data.tasks} /> },
    { id: 6, name: "What Success Looks Like", render: () => <KickoffSlide6 metrics={data.metrics} intake={data.intake} /> },
  ], [data, clientMode, daysIn, showScores]);

  return (
    <div className="space-y-4">
      {/* Top toggle */}
      <div className="flex items-center gap-2">
        <ToggleBtn active={mode === "internal"} onClick={() => setMode("internal")}>Internal Brief</ToggleBtn>
        <ToggleBtn active={mode === "client"} onClick={() => setMode("client")}>Client Presentation</ToggleBtn>
      </div>

      {mode === "internal" ? (
        <PresentationShell
          presentationLabel="Internal Brief"
          orgName={orgName}
          slides={internalSlides}
          editMode={editing}
          onToggleEdit={setEditing}
          theme="dark"
        />
      ) : (
        <>
          <div className="flex items-center gap-2">
            <ToggleBtn active={clientMode === "kickoff"} onClick={() => setClientMode("kickoff")} small>Kickoff Presentation</ToggleBtn>
            <ToggleBtn active={clientMode === "progress"} onClick={() => setClientMode("progress")} small>Progress Review</ToggleBtn>
          </div>
          <PresentationShell
            presentationLabel={clientMode === "kickoff" ? "Kickoff" : "Progress Review"}
            orgName={orgName}
            slides={clientSlides}
            theme="light"
            extraControls={
              <div className="flex items-center gap-2 px-2 py-1 rounded-md border border-border">
                <Label htmlFor="show-scores" className="text-xs cursor-pointer">Show Scores</Label>
                <Switch id="show-scores" checked={showScores} onCheckedChange={setShowScores} />
              </div>
            }
          />
        </>
      )}
    </div>
  );
}

function ToggleBtn({ active, onClick, children, small }: { active: boolean; onClick: () => void; children: React.ReactNode; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-md font-semibold transition-colors border",
        small ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
        active ? "bg-accent text-accent-foreground border-accent" : "bg-card text-muted-foreground border-border hover:text-foreground",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
