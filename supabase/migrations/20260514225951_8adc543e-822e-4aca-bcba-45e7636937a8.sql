-- Round 15 Phase 1: Hybrid image generation engine — schema additions

ALTER TABLE public.designs
  ADD COLUMN IF NOT EXISTS generation_engine TEXT DEFAULT 'html_css',
  ADD COLUMN IF NOT EXISTS stability_prompt TEXT,
  ADD COLUMN IF NOT EXISTS stability_image_url TEXT,
  ADD COLUMN IF NOT EXISTS stability_seed BIGINT,
  ADD COLUMN IF NOT EXISTS composition_spec JSONB,
  ADD COLUMN IF NOT EXISTS generation_time_ms INTEGER;

ALTER TABLE public.design_templates
  ADD COLUMN IF NOT EXISTS stability_prompt_template TEXT,
  ADD COLUMN IF NOT EXISTS composition_config JSONB,
  ADD COLUMN IF NOT EXISTS generation_engine TEXT DEFAULT 'html_css',
  ADD COLUMN IF NOT EXISTS stability_model TEXT DEFAULT 'core',
  ADD COLUMN IF NOT EXISTS mood TEXT;

INSERT INTO public.system_integrations (
  integration_key, display_name, category, env_var_names,
  status, what_works_when_stubbed, what_unlocks_when_wired,
  setup_instructions, estimated_cost_monthly, activate_when,
  provider_docs_url, notes, used_by_features, sort_order
) VALUES (
  'stability_ai',
  'Stability AI (Image Generation)',
  'rendering',
  ARRAY['STABILITY_API_KEY'],
  'stubbed',
  'Design generation falls back to HTML/CSS via Puppeteer. Designs look document-style.',
  'Professional-grade background image generation. Designs look like Canva/Adobe Express output instead of HTML documents.',
  E'1. Sign up at platform.stability.ai\n2. Generate API key from dashboard\n3. Add STABILITY_API_KEY to backend secrets\n4. System automatically uses Stability AI for all new design generation\n\nRecommended models:\n- core: Default (~$0.03/image)\n- sd3.5-large: Premium (~$0.065/image)\n- ultra: Print quality (~$0.08/image)',
  '~$0.03/image (Core). Typical org generates 20-50 designs/month = $0.60-$1.50/org/month.',
  'Immediately — quality upgrade that makes designs competitive with Canva/Adobe Express',
  'https://platform.stability.ai/docs/api-reference',
  E'FUTURE ENHANCEMENTS:\n[ ] "Regenerate background" button (same prompt, new seed)\n[ ] Style presets per template (Cinematic, Bold, Clean, Vintage, Neon)\n[ ] Image-to-image from uploaded action photos\n[ ] Use winning designs as style seeds for consistency',
  ARRAY['generate-design','composite-image','render-design'],
  25
) ON CONFLICT (integration_key) DO NOTHING;