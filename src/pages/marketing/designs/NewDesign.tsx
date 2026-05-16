import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffectiveOrg } from "@/hooks/useEffectiveOrg";
import { useAuth } from "@/hooks/useAuth";
import { useMarketingLink } from "@/hooks/useMarketingLink";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { FABRIC_TEMPLATE_LIST, FabricTemplate } from "@/lib/designTemplates/fabricTemplates";

type LegacyTemplate = {
  id: string;
  name: string;
  category: string;
  design_type: string;
  dimensions: any;
};

export default function NewDesign() {
  const navigate = useNavigate();
  const ml = useMarketingLink();
  const { orgId } = useEffectiveOrg();
  const { profile, role } = useAuth();
  const [legacy, setLegacy] = useState<LegacyTemplate[]>([]);
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("design_templates")
      .select("id,name,category,design_type,dimensions")
      .eq("active", true)
      .order("sort_order")
      .then(({ data }) => setLegacy((data ?? []) as LegacyTemplate[]));
  }, []);

  const startEditor = async (tpl: FabricTemplate) => {
    if (!orgId) return toast.error("No org selected");
    setCreating(tpl.key);
    try {
      const payload: any = {
        org_id: orgId,
        design_type: "social_post",
        name: tpl.name,
        status: "draft",
        generation_engine: "fabric_editor",
        composition_config: {
          engine: "fabric_editor",
          template_key: tpl.key,
          values: tpl.defaults,
          fabric: null,
        },
        created_by: profile?.user_id ?? null,
        created_by_role: role ?? null,
      };
      const { data, error } = await (supabase.from("designs") as any)
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      navigate(ml(`/marketing/designs/${data.id}/edit`));
    } catch (e: any) {
      toast.error(e.message || "Could not start design");
    } finally {
      setCreating(null);
    }
  };

  return (
    <AppShell title="New design">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(ml("/marketing/designs"))}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Pick a template</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Editor templates open in the Curve Designer — drag, swap photos, change text.
          </p>
        </div>
      </div>

      {/* Editor templates */}
      <section className="mb-10">
        <h2 className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-3">
          Editor templates · drag &amp; drop
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FABRIC_TEMPLATE_LIST.map((tpl) => (
            <Card
              key={tpl.key}
              className="overflow-hidden hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer group"
              onClick={() => !creating && startEditor(tpl)}
            >
              <div className="aspect-square bg-gradient-to-br from-primary/20 via-accent/10 to-background relative flex items-center justify-center">
                <div className="text-center px-4">
                  <p className="font-display text-2xl font-bold">{tpl.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {tpl.dims.width}×{tpl.dims.height}
                  </p>
                </div>
                {creating === tpl.key && (
                  <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <p className="font-semibold">{tpl.name}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tpl.blurb}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Legacy AI-generated templates */}
      {legacy.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs uppercase tracking-wider font-bold text-muted-foreground">
              AI-generated templates · prompt-based
            </h2>
            <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300">
              Legacy
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            These still work but generate as a single AI image. They'll be rebuilt as editor templates next.
          </p>
          <Card className="p-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(ml("/marketing/designs?legacy=1"))}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Use a legacy AI template ({legacy.length})
            </Button>
          </Card>
        </section>
      )}
    </AppShell>
  );
}
