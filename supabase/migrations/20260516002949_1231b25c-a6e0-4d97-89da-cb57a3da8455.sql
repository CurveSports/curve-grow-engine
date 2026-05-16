
CREATE TABLE public.design_system_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  prompt_template text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  version int NOT NULL DEFAULT 1,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX one_active_design_system_prompt
  ON public.design_system_prompts (is_active)
  WHERE is_active = true;

ALTER TABLE public.design_system_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage design system prompts"
  ON public.design_system_prompts
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_design_system_prompts_updated_at
  BEFORE UPDATE ON public.design_system_prompts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
