import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PresentationType = "internal_brief" | "client_kickoff" | "client_progress";

export type EditsMap = Record<string, string>; // key = `${slide}:${field}`

const k = (slide: number, field: string) => `${slide}:${field}`;

export function usePresentationEdits(orgId: string, type: PresentationType) {
  const [edits, setEdits] = useState<EditsMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("org_presentation_edits")
        .select("slide_number, field_key, edited_value")
        .eq("org_id", orgId)
        .eq("presentation_type", type);
      if (cancelled) return;
      const map: EditsMap = {};
      (data ?? []).forEach((row: any) => {
        map[k(row.slide_number, row.field_key)] = row.edited_value;
      });
      setEdits(map);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [orgId, type]);

  const get = useCallback((slide: number, field: string, fallback: string): string => {
    return edits[k(slide, field)] ?? fallback;
  }, [edits]);

  const save = useCallback(async (slide: number, field: string, value: string) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setEdits((e) => ({ ...e, [k(slide, field)]: value }));
    await supabase.from("org_presentation_edits").upsert({
      org_id: orgId,
      presentation_type: type,
      slide_number: slide,
      field_key: field,
      edited_value: value,
      edited_by: u.user.id,
    }, { onConflict: "org_id,presentation_type,slide_number,field_key" });
  }, [orgId, type]);

  const remove = useCallback(async (slide: number, field: string) => {
    setEdits((e) => {
      const n = { ...e };
      delete n[k(slide, field)];
      return n;
    });
    await supabase.from("org_presentation_edits").delete()
      .eq("org_id", orgId).eq("presentation_type", type)
      .eq("slide_number", slide).eq("field_key", field);
  }, [orgId, type]);

  return { edits, loading, get, save, remove };
}
