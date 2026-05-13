
CREATE TABLE public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_name text,
  city text,
  state text,
  country text DEFAULT 'US',
  level text NOT NULL DEFAULT 'NCAA D1',
  athletic_conference text,
  mascot text,
  logo_url text,
  primary_color text,
  secondary_color text,
  website text,
  aliases text[] DEFAULT '{}',
  verified boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_schools_name_lower ON public.schools (lower(name));
CREATE INDEX idx_schools_short_lower ON public.schools (lower(short_name));
CREATE INDEX idx_schools_state ON public.schools (state);
CREATE INDEX idx_schools_level ON public.schools (level);

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read active schools"
  ON public.schools FOR SELECT TO authenticated
  USING (active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage all schools"
  ON public.schools FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can suggest new schools"
  ON public.schools FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND verified = false);

CREATE TRIGGER schools_updated_at BEFORE UPDATE ON public.schools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
