
-- Meeting transcripts
CREATE TABLE public.acquisition_meeting_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acquisition_id uuid REFERENCES public.acquisition_projects(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('zoom_webhook','zoom_manual','manual_paste','upload')),
  zoom_meeting_id text,
  zoom_meeting_topic text,
  zoom_host_email text,
  zoom_recording_url text,
  zoom_duration_minutes integer,
  zoom_participants jsonb,
  meeting_date timestamptz,
  meeting_title text,
  raw_transcript text,
  ai_status text NOT NULL DEFAULT 'pending' CHECK (ai_status IN ('pending','processing','complete','failed')),
  meeting_summary text,
  key_decisions jsonb,
  action_items jsonb,
  open_issues jsonb,
  risk_flags jsonb,
  follow_ups jsonb,
  ai_error text,
  processed_at timestamptz,
  is_tagged boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  suggestions_reviewed boolean NOT NULL DEFAULT false,
  suggestions_applied_count integer NOT NULL DEFAULT 0,
  suggestions_dismissed_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_acq_transcripts_acquisition ON public.acquisition_meeting_transcripts(acquisition_id);
CREATE INDEX idx_acq_transcripts_untagged ON public.acquisition_meeting_transcripts(is_tagged) WHERE is_tagged = false;

CREATE TRIGGER acq_transcripts_updated_at BEFORE UPDATE ON public.acquisition_meeting_transcripts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Meeting agendas
CREATE TABLE public.acquisition_meeting_agendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acquisition_id uuid NOT NULL REFERENCES public.acquisition_projects(id) ON DELETE CASCADE,
  meeting_date date,
  week_number integer,
  status_updates jsonb,
  items_needing_discussion jsonb,
  workstream_status jsonb,
  decisions_needed jsonb,
  compliance_status jsonb,
  documents_for_review jsonb,
  pending_follow_ups jsonb,
  next_week_priorities jsonb,
  custom_items jsonb,
  ai_talking_points text,
  previous_transcript_id uuid REFERENCES public.acquisition_meeting_transcripts(id) ON DELETE SET NULL,
  previous_action_items jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','final','archived')),
  generated_by uuid,
  edited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_acq_agendas_acquisition ON public.acquisition_meeting_agendas(acquisition_id);

CREATE TRIGGER acq_agendas_updated_at BEFORE UPDATE ON public.acquisition_meeting_agendas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Task suggestions
CREATE TABLE public.acquisition_task_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id uuid NOT NULL REFERENCES public.acquisition_meeting_transcripts(id) ON DELETE CASCADE,
  acquisition_id uuid NOT NULL REFERENCES public.acquisition_projects(id) ON DELETE CASCADE,
  suggestion_type text NOT NULL CHECK (suggestion_type IN ('status_update','new_task','add_note','update_date','mark_blocked','mark_complete')),
  existing_task_id uuid REFERENCES public.acquisition_tasks(id) ON DELETE SET NULL,
  existing_task_title text,
  suggested_action text NOT NULL,
  context_from_transcript text,
  confidence text CHECK (confidence IN ('high','medium','low')),
  resolution text NOT NULL DEFAULT 'pending' CHECK (resolution IN ('pending','accepted','dismissed','modified')),
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_acq_suggestions_transcript ON public.acquisition_task_suggestions(transcript_id);
CREATE INDEX idx_acq_suggestions_pending ON public.acquisition_task_suggestions(resolution) WHERE resolution = 'pending';

-- RLS
ALTER TABLE public.acquisition_meeting_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acquisition_meeting_agendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acquisition_task_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acq users manage transcripts" ON public.acquisition_meeting_transcripts
  FOR ALL TO authenticated
  USING (public.has_module_access(auth.uid(), 'acquisitions'))
  WITH CHECK (public.has_module_access(auth.uid(), 'acquisitions'));

CREATE POLICY "acq users manage agendas" ON public.acquisition_meeting_agendas
  FOR ALL TO authenticated
  USING (public.has_module_access(auth.uid(), 'acquisitions'))
  WITH CHECK (public.has_module_access(auth.uid(), 'acquisitions'));

CREATE POLICY "acq users manage suggestions" ON public.acquisition_task_suggestions
  FOR ALL TO authenticated
  USING (public.has_module_access(auth.uid(), 'acquisitions'))
  WITH CHECK (public.has_module_access(auth.uid(), 'acquisitions'));

-- Service role can insert untagged transcripts from webhook
CREATE POLICY "service role insert transcripts" ON public.acquisition_meeting_transcripts
  FOR INSERT TO service_role WITH CHECK (true);
