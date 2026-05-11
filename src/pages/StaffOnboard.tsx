import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, CheckCircle2, Circle, Clock, MapPin, Copy, Upload, FileText, AlertCircle } from "lucide-react";

const FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/onboard-portal`;
const STORAGE_BASE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/acquisition-documents`;

type Item = {
  id: string;
  requirement_type: string;
  requirement_name: string;
  status: string;
  due_date: string | null;
  documentation_url: string | null;
  reference_number: string | null;
  vendor: string | null;
};

export default function StaffOnboard() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${FN_URL}?token=${encodeURIComponent(token ?? "")}`);
      const body = await res.json();
      if (body.error) { setError(body.error); setData(null); }
      else { setData(body); setError(null); }
    } catch (e: any) {
      setError("network");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]);

  if (loading) {
    return <Centered><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></Centered>;
  }

  if (error || !data?.staff) {
    return (
      <Centered>
        <div className="max-w-md text-center bg-white rounded-2xl shadow-sm p-8 border border-slate-200">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Link unavailable</h1>
          <p className="text-slate-600">This onboarding link is no longer active or has expired.</p>
          <p className="text-slate-500 text-sm mt-4">If you believe this is an error, please contact your integration team.</p>
        </div>
      </Centered>
    );
  }

  const { staff, acquisition, items, config, content, handbook_doc } = data;
  const completed = items.filter((i: Item) => i.status === "complete" || i.status === "submitted").length;
  const pct = items.length ? Math.round((completed / items.length) * 100) : 0;
  const allDone = items.length > 0 && completed === items.length;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-5 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-lg bg-emerald-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <span className="font-bold text-slate-900 text-lg">Curve Sports</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">
            Welcome to {acquisition.club_name}
          </h1>
          <p className="text-slate-500 mt-2 text-sm uppercase tracking-wider font-semibold">Powered by Curve Sports</p>
        </div>

        {allDone ? (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-8 text-center">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-2xl font-bold text-emerald-900 mb-2">You're All Set!</h2>
            <p className="text-emerald-800">All onboarding requirements have been completed. Welcome to the team.</p>
            <div className="mt-5">
              <p className="text-sm font-semibold text-emerald-900">{completed} of {items.length} complete ✓</p>
              <div className="h-2 bg-emerald-200 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-emerald-600" style={{ width: "100%" }} />
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="text-lg text-slate-700 mb-6">
              Hi <span className="font-semibold text-slate-900">{staff.first_name}</span>, complete the steps below to get fully set up.
            </p>

            {/* Progress card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
              <div className="flex items-baseline justify-between mb-2">
                <span className="font-semibold text-slate-900">{completed} of {items.length} complete</span>
                <span className="text-sm text-slate-500 tabular-nums">{pct}%</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
              {config.compliance_deadline && (
                <p className="text-sm text-slate-500 mt-3">Complete by <span className="font-semibold text-slate-900">{config.compliance_deadline}</span></p>
              )}
            </div>

            {/* Items */}
            <div className="space-y-3">
              {items.length === 0 && (
                <div className="bg-slate-50 rounded-xl p-6 text-center text-slate-500 text-sm">
                  No requirements have been assigned yet.
                </div>
              )}
              {items.map((item: Item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  expanded={expanded === item.id}
                  onToggle={() => setExpanded(expanded === item.id ? null : item.id)}
                  config={config}
                  token={token!}
                  staffState={acquisition.state}
                  handbookDoc={handbook_doc}
                  onSubmitted={load}
                />
              ))}
            </div>
          </>
        )}

        {/* Content blocks */}
        {content?.length > 0 && (
          <div className="mt-10">
            <h3 className="text-xs uppercase tracking-wider font-bold text-slate-500 text-center mb-4">What's New</h3>
            <div className="space-y-3">
              {content.map((c: any) => (
                <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-5">
                  <h4 className="font-semibold text-slate-900 mb-2 capitalize">{c.content_key.replace(/_/g, " ")}</h4>
                  <p className="text-slate-700 text-sm whitespace-pre-wrap">{c.content_text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact */}
        {(config.compliance_contact_name || config.compliance_contact_email) && (
          <div className="mt-10 pt-8 border-t border-slate-200 text-center">
            <h3 className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-3">Questions?</h3>
            <p className="text-slate-700">
              Contact <span className="font-semibold">{config.compliance_contact_name ?? "your integration lead"}</span>
              {config.compliance_contact_email && (
                <>
                  {" "}at{" "}
                  <a className="text-emerald-600 hover:underline" href={`mailto:${config.compliance_contact_email}`}>
                    {config.compliance_contact_email}
                  </a>
                </>
              )}
            </p>
          </div>
        )}

        <div className="mt-12 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Curve Sports
        </div>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center px-4 bg-white">{children}</div>;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "complete") return <CheckCircle2 className="h-6 w-6 text-emerald-600" />;
  if (status === "submitted") return <Clock className="h-6 w-6 text-blue-500" />;
  if (status === "in_progress" || status === "started") return <Clock className="h-6 w-6 text-amber-500" />;
  return <Circle className="h-6 w-6 text-slate-300" />;
}

function statusLabel(s: string) {
  return s === "complete" ? "Complete"
    : s === "submitted" ? "Submitted — awaiting review"
    : s === "in_progress" || s === "started" ? "In Progress"
    : "Not Started";
}

function ItemCard({
  item, expanded, onToggle, config, token, staffState, handbookDoc, onSubmitted,
}: any) {
  const isHandbook = item.requirement_type === "handbook";
  const isFingerprint = item.requirement_type === "fingerprint" || /fingerprint|fdle/i.test(item.requirement_name);
  const isBackground = item.requirement_type === "background_check" || /background/i.test(item.requirement_name);
  const isConcussion = /concussion/i.test(item.requirement_name);
  const isAbuse = /abuse/i.test(item.requirement_name);
  const isLocked = item.status === "complete" || item.status === "submitted";

  return (
    <div className={`bg-white rounded-xl border-2 transition-all ${expanded ? "border-emerald-300 shadow-md" : "border-slate-200"}`}>
      <button onClick={onToggle} className="w-full text-left p-4 flex items-center gap-3">
        <StatusIcon status={item.status} />
        <div className="flex-1">
          <p className="font-semibold text-slate-900">{item.requirement_name}</p>
          <p className="text-sm text-slate-500">{statusLabel(item.status)}</p>
        </div>
        {!isLocked && <span className="text-emerald-600 text-sm font-semibold">{expanded ? "Hide" : "Open"}</span>}
      </button>

      {expanded && (
        <div className="px-4 pb-5 border-t border-slate-100 pt-4 space-y-4">
          {item.due_date && <p className="text-sm text-slate-500">Due: <span className="font-semibold text-slate-900">{item.due_date}</span></p>}

          {isLocked ? (
            <SubmittedView item={item} />
          ) : isHandbook ? (
            <HandbookSection item={item} token={token} handbookDoc={handbookDoc} onDone={onSubmitted} acqClubName={config.club_name} />
          ) : isFingerprint && (staffState?.toLowerCase() === "florida" || staffState?.toLowerCase() === "fl") ? (
            <FingerprintSection item={item} token={token} config={config} onDone={onSubmitted} />
          ) : isBackground ? (
            <PortalSection item={item} token={token} portalUrl={config.background_check_portal_url} instructions={config.background_check_instructions} buttonLabel="Go to Background Check Portal" onDone={onSubmitted} />
          ) : isConcussion ? (
            <PortalSection item={item} token={token} portalUrl={config.concussion_training_url} instructions={config.concussion_training_instructions} buttonLabel="Go to Training Portal" onDone={onSubmitted} />
          ) : isAbuse ? (
            <PortalSection item={item} token={token} portalUrl={config.abuse_prevention_training_url} instructions={config.abuse_prevention_instructions} buttonLabel="Go to Training Portal" onDone={onSubmitted} />
          ) : (
            <GenericSection item={item} token={token} onDone={onSubmitted} />
          )}
        </div>
      )}
    </div>
  );
}

function SubmittedView({ item }: any) {
  return (
    <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700">
      {item.status === "complete"
        ? <p>✓ Verified by the team.</p>
        : <p>Your submission is being reviewed. You'll see this update to "Complete" once verified by the team.</p>}
      {item.reference_number && <p className="mt-2">Reference: <span className="font-semibold">{item.reference_number}</span></p>}
      {item.documentation_url && <p className="mt-1 inline-flex items-center gap-1 text-emerald-700"><FileText className="h-4 w-4" /> Document attached ✓</p>}
    </div>
  );
}

function PortalSection({ item, token, portalUrl, instructions, buttonLabel, onDone }: any) {
  const [refNum, setRefNum] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    const fd = new FormData();
    fd.append("token", token);
    fd.append("op", "submit");
    fd.append("item_id", item.id);
    if (refNum) fd.append("reference_number", refNum);
    if (file) fd.append("file", file);
    fd.append("completed_date", new Date().toISOString().slice(0, 10));
    const res = await fetch(FN_URL, { method: "POST", body: fd });
    const body = await res.json();
    setSubmitting(false);
    if (body.error) alert(body.error);
    else onDone();
  };

  return (
    <div className="space-y-4">
      <p className="text-slate-700 text-sm">Complete this step through the portal:</p>
      {portalUrl ? (
        <a href={portalUrl} target="_blank" rel="noreferrer" className="block w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-5 rounded-lg">
          {buttonLabel}
        </a>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          Portal link not yet configured. Contact your integration lead.
        </div>
      )}
      {instructions && <p className="text-sm text-slate-600 whitespace-pre-wrap">{instructions}</p>}

      <div className="space-y-3 pt-2">
        <p className="font-semibold text-sm text-slate-900">After completing, upload your confirmation:</p>
        <FileInput file={file} onChange={setFile} />
        <input type="text" placeholder="Reference / Membership #" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" value={refNum} onChange={(e) => setRefNum(e.target.value)} />
        <button disabled={submitting || (!file && !refNum)} onClick={submit} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold py-3 rounded-lg">
          {submitting ? "Submitting…" : "Submit ✓"}
        </button>
      </div>
    </div>
  );
}

function FingerprintSection({ item, token, config, onDone }: any) {
  const [tcn, setTcn] = useState("");
  const [vendor, setVendor] = useState("");
  const [date, setDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const ori = config.ori_number;
  const vendors = [1, 2, 3].map((n) => ({
    name: config[`fingerprint_vendor_${n}_name`],
    address: config[`fingerprint_vendor_${n}_address`],
    url: config[`fingerprint_vendor_${n}_url`],
  })).filter((v) => v.name);

  const copyOri = () => { if (ori) navigator.clipboard.writeText(ori); };

  const submit = async () => {
    setSubmitting(true);
    const fd = new FormData();
    fd.append("token", token);
    fd.append("op", "submit");
    fd.append("item_id", item.id);
    if (tcn) fd.append("reference_number", tcn);
    if (vendor) fd.append("vendor", vendor);
    if (date) fd.append("completed_date", date);
    if (file) fd.append("file", file);
    const res = await fetch(FN_URL, { method: "POST", body: fd });
    const body = await res.json();
    setSubmitting(false);
    if (body.error) alert(body.error);
    else onDone();
  };

  return (
    <div className="space-y-4">
      <p className="text-slate-700 text-sm">You must complete FDLE Level 2 fingerprinting at an approved LiveScan vendor.</p>

      <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" /> Your ORI Number
        </p>
        <div className="flex items-center gap-2 mt-2">
          <p className="text-2xl font-bold text-emerald-900 tabular-nums tracking-wide flex-1">{ori || "Not yet configured"}</p>
          {ori && (
            <button onClick={copyOri} className="p-2 bg-white rounded-lg hover:bg-emerald-100">
              <Copy className="h-4 w-4 text-emerald-700" />
            </button>
          )}
        </div>
        <p className="text-xs text-emerald-800 mt-2">You MUST provide this number at your appointment. Incorrect ORI = invalid submission.</p>
      </div>

      {vendors.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase font-bold text-slate-500">Approved Vendors</p>
          {vendors.map((v, i) => (
            <div key={i} className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm">{v.name}</p>
                  {v.address && <p className="text-xs text-slate-600 mt-0.5">{v.address}</p>}
                  {v.url && <a href={v.url} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 font-semibold hover:underline mt-1 inline-block">Book Appointment →</a>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {config.fingerprint_instructions && (
        <p className="text-sm text-slate-600 whitespace-pre-wrap">{config.fingerprint_instructions}</p>
      )}

      <div className="bg-slate-50 rounded-lg p-3 text-sm">
        <p className="font-semibold text-slate-900 mb-1">What to bring:</p>
        <ul className="text-slate-700 space-y-0.5 text-xs list-disc pl-5">
          <li>Valid government-issued photo ID</li>
          <li>The ORI number above</li>
          <li>Payment method</li>
        </ul>
      </div>

      <div className="space-y-3 pt-2">
        <p className="font-semibold text-sm text-slate-900">After your appointment:</p>
        <FileInput file={file} onChange={setFile} label="Upload Receipt" />
        <input type="text" placeholder="TCN Number" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" value={tcn} onChange={(e) => setTcn(e.target.value)} />
        <input type="text" placeholder="Vendor Location" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" value={vendor} onChange={(e) => setVendor(e.target.value)} />
        <input type="date" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
        <button disabled={submitting || (!tcn && !file)} onClick={submit} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold py-3 rounded-lg">
          {submitting ? "Submitting…" : "Submit ✓"}
        </button>
      </div>
    </div>
  );
}

function HandbookSection({ item, token, handbookDoc, onDone, acqClubName }: any) {
  const [reading, setReading] = useState(false);
  const [ack, setAck] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const acknowledge = async () => {
    setSubmitting(true);
    const res = await fetch(FN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, op: "acknowledge_handbook", item_id: item.id }),
    });
    const body = await res.json();
    setSubmitting(false);
    if (body.error) alert(body.error);
    else onDone();
  };

  if (reading) {
    return (
      <div className="space-y-4">
        <button onClick={() => setReading(false)} className="text-sm text-emerald-600 font-semibold">← Back to Onboarding</button>
        <h3 className="text-lg font-bold text-slate-900">{acqClubName} Employee Handbook</h3>
        {handbookDoc?.file_path ? (
          <a href={`${STORAGE_BASE}/${handbookDoc.file_path}`} target="_blank" rel="noreferrer" className="block w-full text-center bg-emerald-600 text-white py-3 rounded-lg font-semibold">
            Download Handbook PDF
          </a>
        ) : handbookDoc?.external_url ? (
          <a href={handbookDoc.external_url} target="_blank" rel="noreferrer" className="block w-full text-center bg-emerald-600 text-white py-3 rounded-lg font-semibold">
            Open Handbook
          </a>
        ) : (
          <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700">
            The employee handbook is being finalized. You will be notified when it is ready for review.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-slate-700 text-sm">Review the employee handbook and acknowledge receipt.</p>
      <button onClick={() => setReading(true)} className="block w-full text-center bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-lg">
        Read Full Handbook
      </button>

      <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
        <input type="checkbox" className="mt-1 h-4 w-4" checked={ack} onChange={(e) => setAck(e.target.checked)} />
        <span>I have received, read, and understand the {acqClubName} Employee Handbook. I agree to comply with the policies and procedures described.</span>
      </label>

      <button disabled={!ack || submitting} onClick={acknowledge} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold py-3 rounded-lg">
        {submitting ? "Submitting…" : "I Acknowledge ✓"}
      </button>
      <p className="text-xs text-slate-500 text-center">By acknowledging you confirm you have read the complete handbook.</p>
    </div>
  );
}

function GenericSection({ item, token, onDone }: any) {
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    const fd = new FormData();
    fd.append("token", token);
    fd.append("op", "submit");
    fd.append("item_id", item.id);
    if (notes) fd.append("notes", notes);
    if (file) fd.append("file", file);
    fd.append("completed_date", new Date().toISOString().slice(0, 10));
    const res = await fetch(FN_URL, { method: "POST", body: fd });
    const body = await res.json();
    setSubmitting(false);
    if (body.error) alert(body.error);
    else onDone();
  };

  return (
    <div className="space-y-3">
      <FileInput file={file} onChange={setFile} />
      <textarea placeholder="Notes (optional)" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      <button disabled={submitting || (!file && !notes)} onClick={submit} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold py-3 rounded-lg">
        {submitting ? "Submitting…" : "Submit ✓"}
      </button>
    </div>
  );
}

function FileInput({ file, onChange, label = "Upload File" }: { file: File | null; onChange: (f: File | null) => void; label?: string }) {
  return (
    <label className="block w-full bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer">
      <Upload className="h-5 w-5 text-slate-500 mx-auto mb-1" />
      <p className="text-sm font-semibold text-slate-700">{file ? file.name : label}</p>
      <p className="text-xs text-slate-500 mt-0.5">{file ? "Tap to change" : "Tap to select file"}</p>
      <input type="file" className="hidden" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
    </label>
  );
}
