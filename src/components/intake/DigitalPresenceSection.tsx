import { TextField } from "@/components/intake/Fields";

export type DigitalPresence = {
  website_url: string;
  instagram_handle: string;
  facebook_url: string;
  x_handle: string;
  tiktok_handle: string;
  youtube_url: string;
  linkedin_url: string;
  posting_frequency: string;
  primary_audience_notes: string;
  recent_post_urls: Record<string, string[]>;
};

export const EMPTY_DIGITAL_PRESENCE: DigitalPresence = {
  website_url: "",
  instagram_handle: "",
  facebook_url: "",
  x_handle: "",
  tiktok_handle: "",
  youtube_url: "",
  linkedin_url: "",
  posting_frequency: "",
  primary_audience_notes: "",
  recent_post_urls: {},
};

const PLATFORMS: Array<{
  key: keyof DigitalPresence;
  postKey: string;
  label: string;
  placeholder: string;
  helper?: string;
}> = [
  { key: "instagram_handle", postKey: "instagram", label: "Instagram", placeholder: "@yourclub" },
  { key: "facebook_url", postKey: "facebook", label: "Facebook", placeholder: "facebook.com/yourclub" },
  { key: "x_handle", postKey: "x", label: "X / Twitter", placeholder: "@yourclub" },
  { key: "tiktok_handle", postKey: "tiktok", label: "TikTok", placeholder: "@yourclub" },
  { key: "youtube_url", postKey: "youtube", label: "YouTube", placeholder: "youtube.com/@yourclub" },
  { key: "linkedin_url", postKey: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/company/yourclub" },
];

type Props = {
  value: DigitalPresence;
  onChange: (next: DigitalPresence) => void;
};

export default function DigitalPresenceSection({ value, onChange }: Props) {
  const set = <K extends keyof DigitalPresence>(k: K, v: DigitalPresence[K]) =>
    onChange({ ...value, [k]: v });

  const setPostUrl = (platformKey: string, idx: number, url: string) => {
    const current = value.recent_post_urls?.[platformKey] ?? ["", "", ""];
    const next = [...current];
    while (next.length < 3) next.push("");
    next[idx] = url;
    onChange({
      ...value,
      recent_post_urls: { ...(value.recent_post_urls ?? {}), [platformKey]: next },
    });
  };

  return (
    <div className="space-y-8">
      <div className="rounded-md border-l-2 border-accent bg-accent-soft/40 px-4 py-3 text-sm text-foreground">
        We'll use this to run an AI website + social audit. The more accurate the links, the sharper the audit. <strong>Pasting your 3 most recent post URLs per platform is optional but strongly encouraged</strong> — it lets us infer your real brand voice from actual posts instead of guessing.
      </div>

      <div className="space-y-5">
        <h3 className="font-display text-lg font-semibold">Website</h3>
        <TextField
          label="Website URL"
          value={value.website_url}
          onChange={(v) => set("website_url", v)}
          hint="e.g. https://yourclub.com"
        />
      </div>

      <div className="space-y-5">
        <h3 className="font-display text-lg font-semibold">Social Media</h3>
        <p className="text-sm text-muted-foreground -mt-3">
          Add the handle or URL for each platform you use. Skip any you don't.
        </p>

        {PLATFORMS.map((p) => {
          const handleVal = (value as any)[p.key] as string;
          const posts = value.recent_post_urls?.[p.postKey] ?? ["", "", ""];
          return (
            <div key={p.key} className="space-y-3 rounded-lg border border-border p-4">
              <TextField
                label={p.label}
                value={handleVal}
                onChange={(v) => set(p.key, v)}
                placeholder={p.placeholder}
              />
              {handleVal && (
                <div className="space-y-2 pl-3 border-l-2 border-accent/40">
                  <p className="text-xs text-muted-foreground">
                    Paste up to 3 recent post URLs (optional but recommended)
                  </p>
                  {[0, 1, 2].map((i) => (
                    <input
                      key={i}
                      type="url"
                      value={posts[i] ?? ""}
                      onChange={(e) => setPostUrl(p.postKey, i, e.target.value)}
                      placeholder={`Recent post URL #${i + 1}`}
                      className="w-full rounded-md border border-border bg-background text-sm text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition"
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-5">
        <h3 className="font-display text-lg font-semibold">Context (optional)</h3>
        <div className="space-y-3">
          <label className="block text-base font-medium text-foreground leading-snug">
            How often do you post on social?
          </label>
          <select
            value={value.posting_frequency}
            onChange={(e) => set("posting_frequency", e.target.value)}
            className="w-full rounded-md border border-border bg-background text-base text-foreground px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition"
          >
            <option value="">Select frequency…</option>
            <option value="Multiple times per day">Multiple times per day</option>
            <option value="Daily">Daily</option>
            <option value="A few times per week">A few times per week</option>
            <option value="Weekly">Weekly</option>
            <option value="A few times per month">A few times per month</option>
            <option value="Rarely / inconsistent">Rarely / inconsistent</option>
          </select>
        </div>

        <div className="space-y-3">
          <label className="block text-base font-medium text-foreground leading-snug">
            Who is your primary audience? (optional)
          </label>
          <textarea
            value={value.primary_audience_notes}
            onChange={(e) => set("primary_audience_notes", e.target.value)}
            rows={3}
            placeholder="e.g. parents of 10–14 year-old players in the south metro, plus local sponsors"
            className="w-full rounded-md border border-border bg-background text-base text-foreground px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition"
          />
        </div>
      </div>
    </div>
  );
}
