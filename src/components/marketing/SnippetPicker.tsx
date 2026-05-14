import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Quote, Search } from "lucide-react";

type Snippet = {
  id: string;
  title: string | null;
  body_text: string | null;
  asset_type: string;
  ai_tags: string[] | null;
};

export default function SnippetPicker({
  orgId,
  onPick,
}: {
  orgId: string;
  onPick: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Snippet[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open || !orgId) return;
    (async () => {
      const { data } = await supabase
        .from("org_brand_assets")
        .select("id,title,body_text,asset_type,ai_tags")
        .eq("org_id", orgId)
        .eq("archived", false)
        .eq("media_type", "text")
        .order("uploaded_at", { ascending: false })
        .limit(60);
      setItems((data ?? []) as Snippet[]);
    })();
  }, [open, orgId]);

  const q = search.trim().toLowerCase();
  const filtered = items.filter((it) => {
    if (!q) return true;
    return [it.title, it.body_text, ...(it.ai_tags ?? [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1">
          <Quote className="h-3 w-3" /> Use saved caption
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search captions…"
            className="h-8 pl-7 text-xs"
          />
        </div>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 text-center">
              No saved captions. Create one in the Content Library.
            </p>
          ) : (
            filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onPick(s.body_text ?? "");
                  setOpen(false);
                }}
                className="w-full text-left p-2 rounded hover:bg-muted text-xs space-y-0.5"
              >
                {s.title && <p className="font-medium">{s.title}</p>}
                <p className="text-muted-foreground line-clamp-3">{s.body_text}</p>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
