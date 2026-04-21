import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Star, Pencil, Trash2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Tag = "internal_planning" | "kickoff" | "check_in" | "issue" | "win" | "renewal";

const TAG_LABELS: Record<Tag, string> = {
  internal_planning: "Internal Planning",
  kickoff: "Kickoff",
  check_in: "Check-in",
  issue: "Issue",
  win: "Win",
  renewal: "Renewal",
};

const TAG_STYLES: Record<Tag, string> = {
  internal_planning: "bg-info-soft text-info border-info/30",
  kickoff: "bg-accent-soft text-accent border-accent/30",
  check_in: "bg-warning-soft text-warning border-warning/30",
  issue: "bg-destructive/10 text-destructive border-destructive/30",
  win: "bg-accent-soft text-accent border-accent/30",
  renewal: "bg-health-soft text-health border-health/30",
};

type Note = {
  id: string;
  org_id: string;
  note_text: string;
  tag: Tag | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export default function NotesTab({ orgId }: { orgId: string }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [tag, setTag] = useState<Tag | "none">("none");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editTag, setEditTag] = useState<Tag | "none">("none");

  const load = async () => {
    const { data } = await supabase
      .from("org_notes" as any)
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });
    const list = (data ?? []) as unknown as Note[];
    setNotes(list);
    const ids = Array.from(new Set(list.map((n) => n.created_by)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => { map[p.user_id] = p.full_name || p.email; });
      setAuthors(map);
    }
  };

  useEffect(() => { load(); }, [orgId]);

  const addNote = async () => {
    if (!text.trim() || !user) return;
    setSaving(true);
    const { error } = await supabase.from("org_notes" as any).insert({
      org_id: orgId,
      note_text: text.trim(),
      tag: tag === "none" ? null : tag,
      created_by: user.id,
    } as any);
    setSaving(false);
    if (error) { toast({ title: "Failed to add note", description: error.message, variant: "destructive" }); return; }
    setText(""); setTag("none");
    load();
  };

  const startEdit = (n: Note) => {
    setEditingId(n.id);
    setEditText(n.note_text);
    setEditTag(n.tag ?? "none");
  };

  const saveEdit = async (id: string) => {
    const { error } = await supabase.from("org_notes" as any)
      .update({ note_text: editText.trim(), tag: editTag === "none" ? null : editTag } as any)
      .eq("id", id);
    if (error) { toast({ title: "Failed to update note", description: error.message, variant: "destructive" }); return; }
    setEditingId(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this note? This cannot be undone.")) return;
    const { error } = await supabase.from("org_notes" as any).delete().eq("id", id);
    if (error) { toast({ title: "Failed to delete note", description: error.message, variant: "destructive" }); return; }
    load();
  };

  return (
    <div className="space-y-4">
      <div className="curve-card">
        <p className="curve-eyebrow mb-2">Add Internal Note</p>
        <Textarea
          placeholder="Write an internal note about this organization…"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2 justify-end">
          <Select value={tag} onValueChange={(v) => setTag(v as any)}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Tag (optional)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No tag</SelectItem>
              {(Object.keys(TAG_LABELS) as Tag[]).map((t) => (
                <SelectItem key={t} value={t}>{TAG_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={addNote}
            disabled={!text.trim() || saving}
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {saving ? "Adding…" : "Add Note"}
          </Button>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="curve-card text-center py-12">
          <p className="text-sm text-muted-foreground">
            No notes yet. Add the first note to start building this org's history.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => {
            const isAuthor = user?.id === n.created_by;
            const isEditing = editingId === n.id;
            return (
              <div key={n.id} className="curve-card">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {n.tag && (
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                        TAG_STYLES[n.tag],
                      )}>
                        {n.tag === "win" && <Star className="h-3 w-3 fill-current" />}
                        {TAG_LABELS[n.tag]}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {authors[n.created_by] ?? "Unknown"} · {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                  {isAuthor && !isEditing && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => startEdit(n)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground" aria-label="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => remove(n.id)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-destructive" aria-label="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea rows={3} value={editText} onChange={(e) => setEditText(e.target.value)} />
                    <div className="flex items-center gap-2 justify-end">
                      <Select value={editTag} onValueChange={(v) => setEditTag(v as any)}>
                        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No tag</SelectItem>
                          {(Object.keys(TAG_LABELS) as Tag[]).map((t) => (
                            <SelectItem key={t} value={t}>{TAG_LABELS[t]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                      </Button>
                      <Button size="sm" onClick={() => saveEdit(n.id)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                        <Check className="h-4 w-4 mr-1" /> Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-foreground whitespace-pre-wrap">{n.note_text}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
