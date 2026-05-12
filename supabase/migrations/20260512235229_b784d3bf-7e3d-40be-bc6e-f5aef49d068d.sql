
-- ============================================================
-- CAMPAIGN SEQUENCE TEMPLATES
-- ============================================================
CREATE TABLE public.campaign_sequence_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  duration_days INTEGER,
  anchor_event TEXT,
  anchor_label TEXT,
  goal_metric TEXT,
  default_goal_target INTEGER,
  tier INTEGER,
  best_for TEXT,
  is_system BOOLEAN DEFAULT TRUE,
  owner_org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  thumbnail_url TEXT,
  preview_summary TEXT,
  active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.campaign_sequence_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_template_id UUID REFERENCES public.campaign_sequence_templates(id) ON DELETE CASCADE,
  order_in_sequence INTEGER,
  days_from_anchor INTEGER,
  time_of_day TIME DEFAULT '09:00:00',
  asset_type TEXT,
  channel TEXT,
  email_template_id UUID,
  design_template_id UUID,
  copy_template TEXT,
  subject_template TEXT,
  preview_text_template TEXT,
  target_segment_filter JSONB,
  asset_label TEXT,
  notes TEXT,
  required BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_sequence_assets_template ON public.campaign_sequence_assets(sequence_template_id);
CREATE INDEX idx_sequence_assets_order ON public.campaign_sequence_assets(sequence_template_id, order_in_sequence);

ALTER TABLE public.campaign_sequence_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_sequence_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active templates"
  ON public.campaign_sequence_templates FOR SELECT TO authenticated
  USING (active = TRUE OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage templates"
  ON public.campaign_sequence_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org owners manage own custom templates"
  ON public.campaign_sequence_templates FOR ALL TO authenticated
  USING (owner_org_id IS NOT NULL AND owner_org_id = public.current_org_id())
  WITH CHECK (owner_org_id IS NOT NULL AND owner_org_id = public.current_org_id());

CREATE POLICY "View assets when template is visible"
  ON public.campaign_sequence_assets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.campaign_sequence_templates t
    WHERE t.id = sequence_template_id
      AND (t.active = TRUE OR public.has_role(auth.uid(), 'admin'))));

CREATE POLICY "Admins manage assets"
  ON public.campaign_sequence_assets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_sequence_templates_updated_at
  BEFORE UPDATE ON public.campaign_sequence_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- SMS INFRASTRUCTURE
-- ============================================================
CREATE TABLE public.org_sms_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  twilio_phone_number TEXT,
  twilio_phone_sid TEXT,
  display_name TEXT,
  area_code TEXT,
  monthly_cost_cents INTEGER DEFAULT 100,
  tcpa_consent_attested BOOLEAN DEFAULT FALSE,
  tcpa_consent_attested_by UUID,
  tcpa_consent_attested_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT TRUE,
  provisioned_at TIMESTAMPTZ DEFAULT NOW(),
  released_at TIMESTAMPTZ
);

CREATE TABLE public.org_sms_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  campaign_id UUID,
  segment_id UUID REFERENCES public.org_contact_segments(id),
  from_number_id UUID REFERENCES public.org_sms_numbers(id),
  message_body TEXT NOT NULL,
  include_opt_out BOOLEAN DEFAULT TRUE,
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  recipient_count INTEGER,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  opt_out_count INTEGER DEFAULT 0,
  cost_cents INTEGER,
  status TEXT DEFAULT 'draft',
  ab_test_id UUID,
  ab_variant TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.org_sms_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  send_id UUID REFERENCES public.org_sms_sends(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.org_contacts(id),
  event_type TEXT,
  twilio_message_sid TEXT,
  error_code TEXT,
  error_message TEXT,
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.org_sms_inbound (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.org_contacts(id),
  from_number TEXT,
  to_number TEXT,
  body TEXT,
  twilio_message_sid TEXT,
  action_taken TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sms_events_send ON public.org_sms_events(send_id);
CREATE INDEX idx_sms_events_contact ON public.org_sms_events(contact_id);
CREATE INDEX idx_sms_sends_org ON public.org_sms_sends(org_id);
CREATE INDEX idx_sms_inbound_org ON public.org_sms_inbound(org_id);

ALTER TABLE public.org_sms_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_sms_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_sms_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_sms_inbound ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view own sms numbers" ON public.org_sms_numbers FOR SELECT TO authenticated
  USING (org_id = public.current_org_id() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Org members manage own sms numbers" ON public.org_sms_numbers FOR ALL TO authenticated
  USING (org_id = public.current_org_id() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (org_id = public.current_org_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members view own sms sends" ON public.org_sms_sends FOR SELECT TO authenticated
  USING (org_id = public.current_org_id() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Org members manage own sms sends" ON public.org_sms_sends FOR ALL TO authenticated
  USING (org_id = public.current_org_id() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (org_id = public.current_org_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members view own sms events" ON public.org_sms_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.org_sms_sends s WHERE s.id = send_id
    AND (s.org_id = public.current_org_id() OR public.has_role(auth.uid(), 'admin'))));

CREATE POLICY "Org members view own sms inbound" ON public.org_sms_inbound FOR SELECT TO authenticated
  USING (org_id = public.current_org_id() OR public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- NPS SURVEYS
-- ============================================================
CREATE TABLE public.org_nps_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT,
  trigger_type TEXT,
  audience_segment_id UUID REFERENCES public.org_contact_segments(id),
  question TEXT DEFAULT 'How likely are you to recommend {org_name} to a friend or family member?',
  scale_min INTEGER DEFAULT 0,
  scale_max INTEGER DEFAULT 10,
  followup_question_promoter TEXT DEFAULT 'What did we do well that you''d highlight?',
  followup_question_passive TEXT DEFAULT 'What would make your experience a 10?',
  followup_question_detractor TEXT DEFAULT 'What can we do better?',
  send_channel TEXT DEFAULT 'email',
  status TEXT DEFAULT 'draft',
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  recipient_count INTEGER,
  response_count INTEGER DEFAULT 0,
  promoter_count INTEGER DEFAULT 0,
  passive_count INTEGER DEFAULT 0,
  detractor_count INTEGER DEFAULT 0,
  nps_score NUMERIC(5,2),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.org_nps_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID REFERENCES public.org_nps_surveys(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.org_contacts(id),
  score INTEGER,
  category TEXT,
  followup_response TEXT,
  responded_via TEXT,
  ip_address TEXT,
  user_agent TEXT,
  flagged_for_followup BOOLEAN DEFAULT FALSE,
  followup_completed_at TIMESTAMPTZ,
  followup_completed_by UUID,
  followup_notes TEXT,
  responded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nps_responses_survey ON public.org_nps_responses(survey_id);
CREATE INDEX idx_nps_responses_category ON public.org_nps_responses(category);
CREATE INDEX idx_nps_surveys_org ON public.org_nps_surveys(org_id);

ALTER TABLE public.org_nps_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_nps_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage own nps surveys" ON public.org_nps_surveys FOR ALL TO authenticated
  USING (org_id = public.current_org_id() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (org_id = public.current_org_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members view nps responses" ON public.org_nps_responses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.org_nps_surveys s WHERE s.id = survey_id
    AND (s.org_id = public.current_org_id() OR public.has_role(auth.uid(), 'admin'))));

CREATE POLICY "Org members update nps responses" ON public.org_nps_responses FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.org_nps_surveys s WHERE s.id = survey_id
    AND (s.org_id = public.current_org_id() OR public.has_role(auth.uid(), 'admin'))));

CREATE OR REPLACE FUNCTION public.categorize_nps_response()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.score >= 9 THEN
    NEW.category := 'promoter';
    NEW.flagged_for_followup := COALESCE(NEW.flagged_for_followup, FALSE);
  ELSIF NEW.score >= 7 THEN
    NEW.category := 'passive';
    NEW.flagged_for_followup := COALESCE(NEW.flagged_for_followup, FALSE);
  ELSE
    NEW.category := 'detractor';
    NEW.flagged_for_followup := TRUE;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_categorize_nps_response
BEFORE INSERT ON public.org_nps_responses
FOR EACH ROW EXECUTE FUNCTION public.categorize_nps_response();

CREATE OR REPLACE FUNCTION public.recalc_nps_survey_stats()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total INTEGER; v_promoters INTEGER; v_passives INTEGER; v_detractors INTEGER; v_score NUMERIC;
BEGIN
  SELECT COUNT(*),
    COUNT(*) FILTER (WHERE category = 'promoter'),
    COUNT(*) FILTER (WHERE category = 'passive'),
    COUNT(*) FILTER (WHERE category = 'detractor')
  INTO v_total, v_promoters, v_passives, v_detractors
  FROM public.org_nps_responses WHERE survey_id = NEW.survey_id;

  IF v_total > 0 THEN
    v_score := ((v_promoters - v_detractors)::NUMERIC / v_total) * 100;
  ELSE
    v_score := 0;
  END IF;

  UPDATE public.org_nps_surveys SET
    response_count = v_total, promoter_count = v_promoters,
    passive_count = v_passives, detractor_count = v_detractors,
    nps_score = v_score, updated_at = now()
  WHERE id = NEW.survey_id;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_recalc_nps_stats
AFTER INSERT OR UPDATE ON public.org_nps_responses
FOR EACH ROW EXECUTE FUNCTION public.recalc_nps_survey_stats();

CREATE TRIGGER update_nps_surveys_updated_at
  BEFORE UPDATE ON public.org_nps_surveys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PORTFOLIO ANALYTICS
-- ============================================================
CREATE TABLE public.curve_marketing_portfolio_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE,
  period_end DATE,
  period_type TEXT,
  total_orgs_active INTEGER,
  total_campaigns_active INTEGER,
  total_campaigns_completed INTEGER,
  total_emails_sent INTEGER,
  total_emails_delivered INTEGER,
  total_emails_opened INTEGER,
  total_emails_clicked INTEGER,
  avg_open_rate NUMERIC(5,2),
  avg_click_rate NUMERIC(5,2),
  total_social_posts INTEGER,
  total_social_engagement INTEGER,
  total_sms_sent INTEGER,
  total_sms_delivered INTEGER,
  total_sms_opt_outs INTEGER,
  total_designs_created INTEGER,
  total_designs_approved INTEGER,
  total_nps_responses INTEGER,
  portfolio_nps_score NUMERIC(5,2),
  total_ai_cost_cents INTEGER,
  total_email_cost_cents INTEGER,
  total_sms_cost_cents INTEGER,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.org_marketing_summary (
  org_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  last_activity_at TIMESTAMPTZ,
  contacts_total INTEGER DEFAULT 0,
  contacts_email_subscribed INTEGER DEFAULT 0,
  contacts_sms_subscribed INTEGER DEFAULT 0,
  campaigns_active INTEGER DEFAULT 0,
  campaigns_completed_l30 INTEGER DEFAULT 0,
  emails_sent_l30 INTEGER DEFAULT 0,
  emails_sent_l90 INTEGER DEFAULT 0,
  avg_open_rate_l30 NUMERIC(5,2),
  avg_click_rate_l30 NUMERIC(5,2),
  social_posts_l30 INTEGER DEFAULT 0,
  total_social_engagement_l30 INTEGER DEFAULT 0,
  sms_sent_l30 INTEGER DEFAULT 0,
  designs_created_l30 INTEGER DEFAULT 0,
  current_nps_score NUMERIC(5,2),
  nps_trend TEXT,
  marketing_health_score INTEGER,
  refreshed_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.curve_marketing_portfolio_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_marketing_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view portfolio summary" ON public.curve_marketing_portfolio_summary FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org members view own marketing summary" ON public.org_marketing_summary FOR SELECT TO authenticated
  USING (org_id = public.current_org_id() OR public.has_role(auth.uid(), 'admin'));
