INSERT INTO public.system_integrations (
  integration_key, display_name, category, env_var_names, status,
  what_works_when_stubbed, what_unlocks_when_wired,
  setup_instructions, estimated_cost_monthly, activate_when,
  provider_docs_url, notes, used_by_features, sort_order
) VALUES (
  'composite_worker',
  'Composite Worker (sharp on Railway/Fly)',
  'image',
  ARRAY['COMPOSITE_WORKER_URL','COMPOSITE_WORKER_TOKEN'],
  'stubbed',
  'Stability AI generates the background and we serve the raw background image as the design preview. Logo, headline, date/time, location, and CTA overlays are skipped.',
  'Final composited PNGs with brand logo, typography, color overlays, and CTA chip rendered on top of the AI background — production-quality assets ready to publish.',
  E'1. Deploy services/composite-worker/ to Railway (or Fly.io).\n2. Set WORKER_AUTH_TOKEN on the worker (openssl rand -hex 32).\n3. Add COMPOSITE_WORKER_URL (https://your-worker.up.railway.app) and COMPOSITE_WORKER_TOKEN (matching the worker token) as Lovable Cloud secrets here.\n4. Generate any Stability-engine template — final.png will appear in the design-renders bucket.',
  '~$5/mo (Railway hobby or Fly shared-cpu-1x)',
  'Ready to ship branded composite designs to orgs',
  'https://sharp.pixelplumbing.com/',
  'Worker code lives in services/composite-worker/. Without these vars, generate-design falls back to raw Stability backgrounds (no overlays).',
  ARRAY['generate-design','composite-image','regenerate-background'],
  55
)
ON CONFLICT (integration_key) DO UPDATE SET
  env_var_names = EXCLUDED.env_var_names,
  display_name = EXCLUDED.display_name,
  category = EXCLUDED.category,
  what_works_when_stubbed = EXCLUDED.what_works_when_stubbed,
  what_unlocks_when_wired = EXCLUDED.what_unlocks_when_wired,
  setup_instructions = EXCLUDED.setup_instructions,
  estimated_cost_monthly = EXCLUDED.estimated_cost_monthly,
  activate_when = EXCLUDED.activate_when,
  provider_docs_url = EXCLUDED.provider_docs_url,
  notes = EXCLUDED.notes,
  used_by_features = EXCLUDED.used_by_features,
  sort_order = EXCLUDED.sort_order;