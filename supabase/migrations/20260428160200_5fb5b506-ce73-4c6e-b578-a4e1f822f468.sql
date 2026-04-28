
-- ============================================================
-- Communications 2.0 — parallel system, separate from existing comms tables
-- All tables prefixed commv2_ to avoid any collision.
-- ============================================================

-- 1. Event type catalog (managed by Curve admins)
CREATE TABLE public.commv2_event_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,                    -- 'tryout', 'fundraiser', 'team_update', etc.
  display_name text NOT NULL,
  description text,
  -- JSON schema of fact fields. Each field: { key, label, type, required, help_text }
  -- type: 'text' | 'date' | 'time' | 'location' | 'url' | 'currency' | 'long_text'
  fact_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  supports_multiple_occurrences boolean NOT NULL DEFAULT false,
  default_stakeholder text,                     -- 'parents' | 'sponsors' | 'board' | 'coaches' | 'all'
  default_lead_days integer NOT NULL DEFAULT 7,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commv2_event_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage event types"
  ON public.commv2_event_types FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "all authed users view active event types"
  ON public.commv2_event_types FOR SELECT TO authenticated
  USING (is_active = true);

CREATE TRIGGER trg_commv2_event_types_updated
  BEFORE UPDATE ON public.commv2_event_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 2. Calendar items (scheduled communications)
CREATE TABLE public.commv2_calendar_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  event_type_id uuid NOT NULL REFERENCES public.commv2_event_types(id) ON DELETE RESTRICT,
  title text NOT NULL,                          -- e.g., "Spring 2026 U12 Tryouts"
  stakeholder text NOT NULL,                    -- 'parents' | 'sponsors' | 'board' | 'coaches' | 'all' | 'custom'
  custom_stakeholder_label text,                -- when stakeholder = 'custom'
  -- Date the comm should be sent. original = first scheduled, current = after any reschedules.
  original_send_date date NOT NULL,
  current_send_date date NOT NULL,
  -- Draft must be ready this many days before current_send_date
  draft_lead_days integer NOT NULL DEFAULT 7,
  -- Computed automatically by trigger so we can query "drafts due this week"
  draft_due_date date,
  status text NOT NULL DEFAULT 'scheduled',     -- 'scheduled' | 'drafting' | 'ready_to_send' | 'sent' | 'cancelled'
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commv2_calendar_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage commv2 calendar"
  ON public.commv2_calendar_items FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "org members view own commv2 calendar"
  ON public.commv2_calendar_items FOR SELECT TO authenticated
  USING (org_id = current_org_id());

CREATE POLICY "org members insert own commv2 calendar"
  ON public.commv2_calendar_items FOR INSERT TO authenticated
  WITH CHECK (org_id = current_org_id() AND created_by = auth.uid());

CREATE POLICY "org members update own commv2 calendar"
  ON public.commv2_calendar_items FOR UPDATE TO authenticated
  USING (org_id = current_org_id())
  WITH CHECK (org_id = current_org_id());

CREATE POLICY "org members delete own commv2 calendar"
  ON public.commv2_calendar_items FOR DELETE TO authenticated
  USING (org_id = current_org_id());

-- Compute draft_due_date automatically
CREATE OR REPLACE FUNCTION public.commv2_compute_draft_due()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.draft_due_date := NEW.current_send_date - (COALESCE(NEW.draft_lead_days, 7) || ' days')::interval;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_commv2_calendar_items_compute
  BEFORE INSERT OR UPDATE ON public.commv2_calendar_items
  FOR EACH ROW EXECUTE FUNCTION public.commv2_compute_draft_due();

CREATE INDEX idx_commv2_calendar_org_date ON public.commv2_calendar_items(org_id, current_send_date);
CREATE INDEX idx_commv2_calendar_draft_due ON public.commv2_calendar_items(draft_due_date) WHERE status IN ('scheduled', 'drafting');


-- 3. Reschedule audit log
CREATE TABLE public.commv2_reschedule_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_item_id uuid NOT NULL REFERENCES public.commv2_calendar_items(id) ON DELETE CASCADE,
  org_id uuid NOT NULL,
  changed_by uuid NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  previous_send_date date NOT NULL,
  new_send_date date NOT NULL,
  reason text
);

ALTER TABLE public.commv2_reschedule_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage commv2 reschedule log"
  ON public.commv2_reschedule_log FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "org members view own reschedule log"
  ON public.commv2_reschedule_log FOR SELECT TO authenticated
  USING (org_id = current_org_id());

CREATE POLICY "org members insert own reschedule log"
  ON public.commv2_reschedule_log FOR INSERT TO authenticated
  WITH CHECK (org_id = current_org_id() AND changed_by = auth.uid());

CREATE INDEX idx_commv2_reschedule_log_item ON public.commv2_reschedule_log(calendar_item_id, changed_at DESC);


-- 4. Fact sheets (one per calendar item, flexible JSON)
CREATE TABLE public.commv2_event_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_item_id uuid NOT NULL UNIQUE REFERENCES public.commv2_calendar_items(id) ON DELETE CASCADE,
  org_id uuid NOT NULL,
  -- Shared facts that apply to all occurrences (e.g., what to bring, registration url)
  shared_facts jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Array of occurrences. Each: { label, date, time, location, address, notes, ...custom }
  -- For single-event comms, this is an array with one item.
  occurrences jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Snapshot of which required fields are still missing (computed app-side; helps queries)
  missing_required_fields text[] NOT NULL DEFAULT '{}',
  is_complete boolean NOT NULL DEFAULT false,
  last_updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commv2_event_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage commv2 facts"
  ON public.commv2_event_facts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "org members view own commv2 facts"
  ON public.commv2_event_facts FOR SELECT TO authenticated
  USING (org_id = current_org_id());

CREATE POLICY "org members insert own commv2 facts"
  ON public.commv2_event_facts FOR INSERT TO authenticated
  WITH CHECK (org_id = current_org_id());

CREATE POLICY "org members update own commv2 facts"
  ON public.commv2_event_facts FOR UPDATE TO authenticated
  USING (org_id = current_org_id())
  WITH CHECK (org_id = current_org_id());

CREATE TRIGGER trg_commv2_facts_updated
  BEFORE UPDATE ON public.commv2_event_facts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 5. Drafts (AI-generated, supports calendar-linked and ad-hoc)
CREATE TABLE public.commv2_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  -- NULL for ad-hoc drafts (off-calendar)
  calendar_item_id uuid REFERENCES public.commv2_calendar_items(id) ON DELETE SET NULL,
  draft_mode text NOT NULL DEFAULT 'calendar', -- 'calendar' | 'ad_hoc'
  stakeholder text NOT NULL,
  -- For ad-hoc: free text describing the comm. For calendar: copied from event type.
  ad_hoc_prompt text,
  subject text,
  body text,
  format text NOT NULL DEFAULT 'email',         -- 'email' | 'text' | 'social' | 'newsletter'
  tone text,
  status text NOT NULL DEFAULT 'pending_facts', -- 'pending_facts' | 'drafting' | 'drafted' | 'approved' | 'sent' | 'discarded'
  missing_facts text[] NOT NULL DEFAULT '{}',
  -- Snapshot of facts at generation time (so the draft is reproducible)
  facts_snapshot jsonb,
  generation_attempts integer NOT NULL DEFAULT 0,
  last_error text,
  generated_at timestamptz,
  approved_at timestamptz,
  approved_by uuid,
  sent_at timestamptz,
  sent_by uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commv2_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage commv2 drafts"
  ON public.commv2_drafts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "org members view own commv2 drafts"
  ON public.commv2_drafts FOR SELECT TO authenticated
  USING (org_id = current_org_id());

CREATE POLICY "org members insert own commv2 drafts"
  ON public.commv2_drafts FOR INSERT TO authenticated
  WITH CHECK (org_id = current_org_id() AND created_by = auth.uid());

CREATE POLICY "org members update own commv2 drafts"
  ON public.commv2_drafts FOR UPDATE TO authenticated
  USING (org_id = current_org_id())
  WITH CHECK (org_id = current_org_id());

CREATE TRIGGER trg_commv2_drafts_updated
  BEFORE UPDATE ON public.commv2_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_commv2_drafts_org_status ON public.commv2_drafts(org_id, status);
CREATE INDEX idx_commv2_drafts_calendar_item ON public.commv2_drafts(calendar_item_id) WHERE calendar_item_id IS NOT NULL;


-- 6. Seed the event type catalog with sensible defaults
INSERT INTO public.commv2_event_types (code, display_name, description, fact_schema, supports_multiple_occurrences, default_stakeholder, default_lead_days, display_order) VALUES
('tryout_announcement', 'Tryout Announcement', 'Announce upcoming tryout dates and registration details.',
 '[
   {"key":"team_or_program","label":"Team / Program","type":"text","required":true,"help_text":"e.g., U12 Travel Baseball"},
   {"key":"registration_url","label":"Registration URL","type":"url","required":true},
   {"key":"registration_deadline","label":"Registration Deadline","type":"date","required":true},
   {"key":"cost","label":"Tryout Fee","type":"currency","required":false},
   {"key":"what_to_bring","label":"What to Bring","type":"long_text","required":true,"help_text":"Glove, cleats, water, etc."},
   {"key":"contact_name","label":"Contact Person","type":"text","required":false},
   {"key":"contact_email","label":"Contact Email","type":"text","required":false}
 ]'::jsonb,
 true, 'parents', 14, 10),

('tryout_reminder', 'Tryout Reminder', 'Final reminder before tryouts begin.',
 '[
   {"key":"team_or_program","label":"Team / Program","type":"text","required":true},
   {"key":"registration_url","label":"Registration URL","type":"url","required":false},
   {"key":"what_to_bring","label":"What to Bring","type":"long_text","required":true}
 ]'::jsonb,
 true, 'parents', 3, 20),

('team_update', 'Team Update', 'Weekly or periodic update to families.',
 '[
   {"key":"highlights","label":"This week''s highlights","type":"long_text","required":true,"help_text":"Recent results, milestones, shoutouts"},
   {"key":"upcoming","label":"Upcoming events","type":"long_text","required":true,"help_text":"Practices, games, deadlines coming up"},
   {"key":"action_items","label":"Action items for families","type":"long_text","required":false}
 ]'::jsonb,
 false, 'parents', 2, 30),

('registration_open', 'Registration Open', 'Announce that registration is open for a season or program.',
 '[
   {"key":"program_name","label":"Program Name","type":"text","required":true},
   {"key":"registration_url","label":"Registration URL","type":"url","required":true},
   {"key":"registration_deadline","label":"Registration Deadline","type":"date","required":true},
   {"key":"cost","label":"Cost","type":"currency","required":true},
   {"key":"early_bird_deadline","label":"Early-bird Deadline","type":"date","required":false},
   {"key":"early_bird_cost","label":"Early-bird Price","type":"currency","required":false}
 ]'::jsonb,
 false, 'parents', 21, 40),

('registration_reminder', 'Registration Reminder', 'Reminder that registration is closing soon.',
 '[
   {"key":"program_name","label":"Program Name","type":"text","required":true},
   {"key":"registration_url","label":"Registration URL","type":"url","required":true},
   {"key":"registration_deadline","label":"Deadline","type":"date","required":true}
 ]'::jsonb,
 false, 'parents', 7, 50),

('fundraiser_launch', 'Fundraiser Launch', 'Launch a fundraising campaign.',
 '[
   {"key":"campaign_name","label":"Campaign Name","type":"text","required":true},
   {"key":"goal_amount","label":"Goal Amount","type":"currency","required":true},
   {"key":"end_date","label":"End Date","type":"date","required":true},
   {"key":"donation_url","label":"Donation URL","type":"url","required":true},
   {"key":"why_it_matters","label":"Why it matters","type":"long_text","required":true,"help_text":"What the funds will be used for"}
 ]'::jsonb,
 false, 'all', 7, 60),

('event_announcement', 'Event Announcement', 'Announce an event (game day, social, banquet, etc.).',
 '[
   {"key":"event_name","label":"Event Name","type":"text","required":true},
   {"key":"description","label":"Description","type":"long_text","required":true},
   {"key":"rsvp_url","label":"RSVP URL","type":"url","required":false},
   {"key":"cost","label":"Cost","type":"currency","required":false}
 ]'::jsonb,
 true, 'parents', 14, 70),

('sponsor_thank_you', 'Sponsor Thank You', 'Thank a sponsor publicly or privately.',
 '[
   {"key":"sponsor_name","label":"Sponsor Name","type":"text","required":true},
   {"key":"contribution","label":"What they contributed","type":"long_text","required":true},
   {"key":"impact","label":"Impact on the org","type":"long_text","required":false}
 ]'::jsonb,
 false, 'sponsors', 7, 80),

('board_update', 'Board Update', 'Periodic update to the board of directors.',
 '[
   {"key":"period","label":"Reporting period","type":"text","required":true,"help_text":"e.g., Q1 2026"},
   {"key":"financials_summary","label":"Financials summary","type":"long_text","required":true},
   {"key":"key_decisions_needed","label":"Decisions needed","type":"long_text","required":false},
   {"key":"wins","label":"Wins to highlight","type":"long_text","required":true}
 ]'::jsonb,
 false, 'board', 7, 90);
