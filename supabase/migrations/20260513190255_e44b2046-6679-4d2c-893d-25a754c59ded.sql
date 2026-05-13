
-- Events module: survey config + responses + W-9 storage

CREATE TABLE public.event_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT 'Event Payment Intake',
  description text DEFAULT '',
  instructions text DEFAULT '',
  w9_template_url text,
  is_active boolean NOT NULL DEFAULT true,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TRIGGER event_surveys_updated_at
  BEFORE UPDATE ON public.event_surveys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.event_surveys ENABLE ROW LEVEL SECURITY;

-- Public can read active surveys (for the public intake form)
CREATE POLICY "Public can view active event surveys"
  ON public.event_surveys FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage event surveys"
  ON public.event_surveys FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Responses
CREATE TABLE public.event_survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.event_surveys(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  organization text NOT NULL,
  phone text NOT NULL,
  personal_email text NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('zelle','echeck')),
  zelle_id text,
  zelle_id_type text CHECK (zelle_id_type IN ('phone','email') OR zelle_id_type IS NULL),
  check_payable_to text,
  check_delivery_email text,
  w9_file_path text,
  w9_file_name text,
  notes text,
  extra jsonb DEFAULT '{}'::jsonb,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text
);

CREATE INDEX event_survey_responses_survey_id_idx ON public.event_survey_responses(survey_id);
CREATE INDEX event_survey_responses_search_idx ON public.event_survey_responses
  USING gin (to_tsvector('simple',
    coalesce(first_name,'')||' '||coalesce(last_name,'')||' '||coalesce(organization,'')||' '||coalesce(personal_email,'')||' '||coalesce(phone,'')));

ALTER TABLE public.event_survey_responses ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anonymous) can submit a response to an ACTIVE survey
CREATE POLICY "Public can submit responses"
  ON public.event_survey_responses FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.event_surveys s WHERE s.id = survey_id AND s.is_active = true)
  );

CREATE POLICY "Admins read all responses"
  ON public.event_survey_responses FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update responses"
  ON public.event_survey_responses FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete responses"
  ON public.event_survey_responses FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for W-9 uploads (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-w9s', 'event-w9s', false)
ON CONFLICT (id) DO NOTHING;

-- Public can upload W-9 to the bucket (only into the public-uploads/ prefix)
CREATE POLICY "Public can upload W-9 files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'event-w9s');

-- Admins can read/manage all W-9 files
CREATE POLICY "Admins read W-9 files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'event-w9s' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete W-9 files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'event-w9s' AND public.has_role(auth.uid(), 'admin'));

-- Seed a default survey
INSERT INTO public.event_surveys (slug, title, description, instructions)
VALUES (
  'payment-intake',
  '2026 Event Payment Intake',
  'One clean intake form for event payments and tax documentation.',
  'A completed W-9 is required for 2026. If we do not have a completed W-9 on file, payment will not be issued. Please use a personal email address — school/work emails often block E-checks.'
);
