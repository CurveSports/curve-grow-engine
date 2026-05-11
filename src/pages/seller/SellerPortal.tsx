import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, LogOut, Upload, FileText, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { phaseLabel, dayOf100, PHASES } from "@/lib/acquisitions";

export default function SellerPortal() {
  const { acquisitionId } = useParams();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [acq, setAcq] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [portalUser, setPortalUser] = useState<any>(null);
  const [msgOpen, setMsgOpen] = useState(false);
  const [msg, setMsg] = useState({ subject: "", body: "" });

  const load = async () => {
    if (!acquisitionId || !user) return;
    setLoading(true);
    const { data: pu } = await supabase.from("acquisition_portal_users")
      .select("*").eq("acquisition_id", acquisitionId).eq("user_id", user.id).maybeSingle();
    setPortalUser(pu);
    if (!pu) { setLoading(false); return; }

    // Update last_login
    await supabase.from("acquisition_portal_users").update({ last_login_at: new Date().toISOString() }).eq("id", pu.id);

    const [{ data: a }, { data: t }, { data: d }, { data: act }] = await Promise.all([
      supabase.from("acquisition_projects").select("*").eq("id", acquisitionId).maybeSingle(),
      supabase.from("acquisition_tasks").select("*").eq("acquisition_id", acquisitionId).eq("is_seller_visible", true).order("display_order"),
      supabase.from("acquisition_documents").select("*").eq("acquisition_id", acquisitionId).eq("is_seller_visible", true).eq("is_current_version", true).order("created_at", { ascending: false }),
      supabase.from("acquisition_portal_activity").select("*").eq("acquisition_id", acquisitionId).order("created_at", { ascending: false }).limit(20),
    ]);
    setAcq(a); setTasks(t ?? []); setDocs(d ?? []); setActivity(act ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [acquisitionId, user?.id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!portalUser || !acq) {
    return <div className="min-h-screen flex items-center justify-center text-center px-4">
      <div><h1 className="text-xl font-bold mb-2">Access not available</h1><p className="text-muted-foreground text-sm">You don't have access to this portal.</p>
        <Button variant="outline" className="mt-4" onClick={signOut}>Sign out</Button></div>
    </div>;
  }

  const updateTaskStatus = async (taskId: string, status: string, note: string) => {
    if (!note.trim() && status === "done") { toast.error("Please describe what was completed"); return; }
    await supabase.from("acquisition_tasks").update({ status }).eq("id", taskId);
    if (note.trim()) {
      await supabase.from("acquisition_task_notes").insert({
        task_id: taskId, acquisition_id: acquisitionId, note_text: note,
        created_by: user!.id, is_seller_visible: true,
      });
    }
    await supabase.from("acquisition_portal_activity").insert({
      acquisition_id: acquisitionId!, portal_user_id: portalUser.id,
      actor_name: portalUser.display_name ?? portalUser.email,
      action: "update_task", detail: `Marked "${tasks.find(t=>t.id===taskId)?.title}" as ${status}`,
    });
    toast.success("Updated"); load();
  };

  const sendMessage = async () => {
    if (!msg.subject.trim() || !msg.body.trim()) return;
    await supabase.from("acquisition_communications").insert({
      acquisition_id: acquisitionId, communication_type: "seller",
      subject: msg.subject, summary: msg.body, contact_name: portalUser.display_name ?? portalUser.email,
      method: "portal_message",
    });
    await supabase.from("acquisition_portal_activity").insert({
      acquisition_id: acquisitionId!, portal_user_id: portalUser.id,
      actor_name: portalUser.display_name ?? portalUser.email,
      action: "send_message", detail: msg.subject,
    });
    toast.success("Message sent to integration team");
    setMsg({ subject: "", body: "" }); setMsgOpen(false);
  };

  const completed = tasks.filter(t => t.status === "done").length;
  const day = dayOf100(acq.close_date);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">C</div>
            <div>
              <p className="font-semibold text-slate-900 text-sm leading-tight">{acq.club_name} — Integration Portal</p>
              <p className="text-xs text-slate-500">{portalUser.display_name ?? portalUser.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4 mr-1.5" /> Sign out</Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-6 space-y-6">
        {/* Timeline */}
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Integration Timeline</h2>
          <div className="flex items-center gap-1.5 text-xs flex-wrap">
            {PHASES.map((p) => (
              <div key={p.key} className={`flex-1 min-w-[80px] py-2 px-2 rounded text-center font-medium ${acq.phase === p.key ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                {p.label}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3 text-sm text-slate-600">
            {day != null && <span>Day {day} of 100</span>}
            <span>{Number(acq.completion_pct).toFixed(0)}% complete</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${acq.completion_pct}%` }} />
          </div>
        </section>

        {/* Tasks */}
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Your Action Items</h2>
            <span className="text-sm text-slate-500">{completed} of {tasks.length} complete</span>
          </div>
          <div className="space-y-3">
            {tasks.length === 0 && <p className="text-sm text-slate-500 italic">No action items assigned to you yet.</p>}
            {tasks.map((t) => (
              <SellerTaskCard key={t.id} task={t} onUpdate={updateTaskStatus} />
            ))}
          </div>
        </section>

        {/* Documents */}
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Shared Documents</h2>
          <div className="space-y-2">
            {docs.length === 0 && <p className="text-sm text-slate-500 italic">No shared documents yet.</p>}
            {docs.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-slate-900 truncate">{d.document_name}</span>
                </div>
                {d.file_path && (
                  <a className="text-xs text-emerald-600 font-semibold hover:underline" target="_blank" rel="noreferrer"
                     href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/acquisition-documents/${d.file_path}`}>
                    Download
                  </a>
                )}
              </div>
            ))}
          </div>
          <SellerUpload acquisitionId={acquisitionId!} portalUser={portalUser} onUploaded={load} />
        </section>

        {/* Activity */}
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Recent Activity</h2>
          <div className="space-y-2 text-sm">
            {activity.length === 0 && <p className="text-slate-500 italic">No activity yet.</p>}
            {activity.slice(0, 10).map((a) => (
              <div key={a.id} className="flex items-start gap-2 text-slate-700">
                <span className="text-slate-400 text-xs whitespace-nowrap mt-0.5">{new Date(a.created_at).toLocaleDateString()}</span>
                <span>{a.detail ?? a.action}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Contact Integration Team</h2>
          {!msgOpen ? (
            <Button onClick={() => setMsgOpen(true)} className="bg-emerald-600 hover:bg-emerald-700"><Send className="h-4 w-4 mr-1.5" /> Send Message</Button>
          ) : (
            <div className="space-y-2">
              <input className="w-full px-3 py-2 border border-slate-200 rounded text-sm" placeholder="Subject" value={msg.subject} onChange={(e) => setMsg({ ...msg, subject: e.target.value })} />
              <textarea className="w-full px-3 py-2 border border-slate-200 rounded text-sm" rows={4} placeholder="Message" value={msg.body} onChange={(e) => setMsg({ ...msg, body: e.target.value })} />
              <div className="flex gap-2"><Button onClick={sendMessage} className="bg-emerald-600 hover:bg-emerald-700">Send</Button><Button variant="outline" onClick={() => setMsgOpen(false)}>Cancel</Button></div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function SellerTaskCard({ task, onUpdate }: any) {
  const [note, setNote] = useState(task.seller_notes ?? "");
  const overdue = task.target_date && task.target_date < new Date().toISOString().slice(0, 10) && task.status !== "done";
  return (
    <div className="border border-slate-200 rounded-lg p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-semibold text-slate-900">{task.title}</p>
          <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{task.workstream}</span>
            <span className={`px-1.5 py-0.5 rounded ${task.status === "done" ? "bg-emerald-100 text-emerald-700" : task.status === "started" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}`}>
              {task.status === "open" ? "Open" : task.status === "started" ? "Started" : "Done"}
            </span>
            {task.target_date && <span className={overdue ? "text-rose-600 font-semibold" : "text-slate-500"}>Due {task.target_date}</span>}
          </div>
        </div>
      </div>
      {task.status !== "done" && (
        <>
          <textarea rows={2} placeholder="Notes…" className="w-full mt-3 px-2 py-1.5 border border-slate-200 rounded text-sm" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2 mt-2">
            {task.status === "open" && <Button size="sm" variant="outline" onClick={() => onUpdate(task.id, "started", note)}>Mark as Started</Button>}
            {task.status === "started" && <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => onUpdate(task.id, "done", note)}>Mark as Done</Button>}
          </div>
        </>
      )}
    </div>
  );
}

function SellerUpload({ acquisitionId, portalUser, onUploaded }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    const path = `${acquisitionId}/seller-uploads/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("acquisition-documents").upload(path, file);
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    await supabase.from("acquisition_documents").insert({
      acquisition_id: acquisitionId, document_name: file.name, document_type: "seller_upload",
      storage_type: "uploaded", file_path: path, file_size: file.size, file_type: file.type,
      is_seller_visible: true,
    });
    await supabase.from("acquisition_portal_activity").insert({
      acquisition_id: acquisitionId, portal_user_id: portalUser.id,
      actor_name: portalUser.display_name ?? portalUser.email,
      action: "upload_document", detail: file.name,
    });
    toast.success("Uploaded"); setFile(null); setUploading(false); onUploaded();
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-100">
      <p className="text-xs uppercase font-bold text-slate-500 mb-2">Upload Document</p>
      <div className="flex gap-2">
        <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="flex-1 text-sm" />
        <Button disabled={!file || uploading} onClick={upload} className="bg-emerald-600 hover:bg-emerald-700"><Upload className="h-4 w-4 mr-1" /> Upload</Button>
      </div>
    </div>
  );
}
