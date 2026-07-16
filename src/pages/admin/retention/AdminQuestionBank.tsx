import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MasterQuestion, QUESTION_TYPE_LABELS, SurveyQuestionType, categoryLabel } from "@/lib/surveys";
import { SortableQuestionList } from "@/components/retention/SortableQuestionList";

export default function AdminQuestionBank() {
  const [questions, setQuestions] = useState<MasterQuestion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number>(1);
  const [versions, setVersions] = useState<number[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<{ question_text: string; question_type: SurveyQuestionType; category: string; is_required: boolean; sort_order: number }>({
    question_text: "", question_type: "rating_5", category: "overall", is_required: true, sort_order: 100,
  });

  const load = async () => {
    const { data } = await (supabase as any).from("survey_master_questions").select("*").order("version", { ascending: false }).order("sort_order");
    const all: MasterQuestion[] = data || [];
    const vs = Array.from(new Set(all.map((q) => q.version))).sort((a, b) => b - a);
    setVersions(vs);
    if (!vs.includes(selectedVersion) && vs.length) setSelectedVersion(vs[0]);
    setQuestions(all);
  };

  useEffect(() => { load(); }, []);

  const inVersion = questions.filter((q) => q.version === selectedVersion);

  const bumpVersion = async () => {
    if (!confirm("Create a new version of the core question set? New surveys will use it; existing surveys keep their current version.")) return;
    const next = Math.max(...versions, 0) + 1;
    // clone current version's active questions into new version
    const rows = inVersion.filter((q) => q.is_active).map((q) => ({
      version: next,
      question_text: q.question_text,
      question_type: q.question_type,
      category: q.category,
      sort_order: q.sort_order,
      is_required: q.is_required,
      is_active: true,
    }));
    if (rows.length === 0) return toast.error("No active questions to clone.");
    const { error } = await (supabase as any).from("survey_master_questions").insert(rows);
    if (error) return toast.error(error.message);
    toast.success(`Version ${next} created`);
    setSelectedVersion(next);
    load();
  };

  const addQuestion = async () => {
    if (!form.question_text.trim()) return;
    const { error } = await (supabase as any).from("survey_master_questions").insert({
      version: selectedVersion,
      question_text: form.question_text.trim(),
      question_type: form.question_type,
      category: form.category,
      sort_order: form.sort_order,
      is_required: form.is_required,
      is_active: true,
    });
    if (error) return toast.error(error.message);
    setAddOpen(false);
    setForm({ question_text: "", question_type: "rating_5", category: "overall", is_required: true, sort_order: 100 });
    load();
  };

  const toggleActive = async (q: MasterQuestion) => {
    const { error } = await (supabase as any).from("survey_master_questions").update({ is_active: !q.is_active }).eq("id", q.id);
    if (error) return toast.error(error.message);
    load();
  };

  const remove = async (q: MasterQuestion) => {
    if (!confirm("Delete this question? Existing responses referencing it are preserved.")) return;
    const { error } = await (supabase as any).from("survey_master_questions").delete().eq("id", q.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <AppShell title="Core Question Bank">
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">Core Question Bank</h1>
            <p className="text-muted-foreground mt-1">Locked, versioned Curve questions used across every org's end-of-season survey.</p>
          </div>
          <div className="flex gap-2 items-center">
            <Label className="text-sm">Version:</Label>
            <select className="h-9 px-3 rounded-md border border-input bg-background text-sm" value={selectedVersion} onChange={(e) => setSelectedVersion(Number(e.target.value))}>
              {versions.map((v) => <option key={v} value={v}>v{v}</option>)}
            </select>
            <Button variant="outline" size="sm" onClick={bumpVersion}>New version</Button>
            <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" />Add question</Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Version {selectedVersion} — {inVersion.length} questions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {inVersion.length > 0 && <p className="text-xs text-muted-foreground">Drag ⋮⋮ to reorder — order is saved automatically.</p>}
            <SortableQuestionList
              items={inVersion}
              onReorder={async (ids) => {
                const prev = questions;
                const byId = new Map(inVersion.map((q) => [q.id, q]));
                const next = ids.map((qid, i) => ({ ...(byId.get(qid) as MasterQuestion), sort_order: (i + 1) * 10 }));
                // optimistic
                setQuestions((cur) => {
                  const others = cur.filter((q) => q.version !== selectedVersion);
                  return [...others, ...next];
                });
                const results = await Promise.all(next.map((q) =>
                  (supabase as any).from("survey_master_questions").update({ sort_order: q.sort_order }).eq("id", q.id)
                ));
                const firstErr = results.find((r: any) => r?.error);
                if (firstErr) {
                  setQuestions(prev);
                  toast.error(`Could not save order: ${firstErr.error.message}`);
                  return;
                }
                toast.success("Question order saved");
                load();
              }}
              renderItem={(q, handle) => (
                <div className="flex items-start gap-3 border rounded p-3 bg-card">
                  <div className="pt-1">{handle}</div>
                  <Badge variant="outline" className="mt-0.5 shrink-0">{categoryLabel(q.category)}</Badge>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{q.question_text}</div>
                    <div className="text-xs text-muted-foreground">
                      {QUESTION_TYPE_LABELS[q.question_type]}{q.is_required ? " · required" : ""}
                      {!q.is_active && <span className="ml-2 text-destructive">(hidden)</span>}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => toggleActive(q)}>{q.is_active ? "Hide" : "Show"}</Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(q)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              )}
            />
            {inVersion.length === 0 && <p className="text-muted-foreground p-2">No questions in this version.</p>}
          </CardContent>
        </Card>


        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add question to v{selectedVersion}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Question</Label><Textarea rows={2} value={form.question_text} onChange={(e) => setForm({ ...form, question_text: e.target.value })} /></div>
              <div>
                <Label>Type</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.question_type} onChange={(e) => setForm({ ...form, question_type: e.target.value as SurveyQuestionType })}>
                  {Object.entries(QUESTION_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div><Label>Category (e.g. coaching, value, nps)</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
              <div><Label>Sort order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_required} onChange={(e) => setForm({ ...form, is_required: e.target.checked })} />Required</label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={addQuestion} disabled={!form.question_text.trim()}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
