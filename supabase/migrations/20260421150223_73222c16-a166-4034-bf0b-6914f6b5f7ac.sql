
-- Enums
CREATE TYPE public.task_engine AS ENUM ('Pricing','Sponsorship','Apparel','Events','Add-Ons','Retention','Facility','Operations');
CREATE TYPE public.task_type AS ENUM ('Strategy','Execute','Communication','Track');
CREATE TYPE public.task_status AS ENUM ('not_started','in_progress','completed','overdue');
CREATE TYPE public.task_priority AS ENUM ('high','medium','low');
CREATE TYPE public.task_action AS ENUM ('created','status_changed','note_added','due_date_changed','reassigned','completed');
CREATE TYPE public.notification_type AS ENUM ('task_completed','task_overdue','no_activity_digest');
CREATE TYPE public.notification_recipient_role AS ENUM ('admin','org_all');

-- task_templates
CREATE TABLE public.task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  engine public.task_engine NOT NULL,
  task_type public.task_type NOT NULL,
  suggested_days_to_complete integer NOT NULL DEFAULT 30,
  is_system_template boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage templates" ON public.task_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "authenticated read templates" ON public.task_templates FOR SELECT TO authenticated USING (true);

-- org_tasks
CREATE TABLE public.org_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.task_templates(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL,
  engine public.task_engine NOT NULL,
  task_type public.task_type NOT NULL,
  status public.task_status NOT NULL DEFAULT 'not_started',
  priority public.task_priority NOT NULL DEFAULT 'medium',
  suggested_due_date date,
  due_date date,
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  completed_by uuid
);
CREATE INDEX idx_org_tasks_org ON public.org_tasks(org_id);
CREATE INDEX idx_org_tasks_status ON public.org_tasks(status);
CREATE INDEX idx_org_tasks_due ON public.org_tasks(due_date);
ALTER TABLE public.org_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage org_tasks" ON public.org_tasks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "org members view org_tasks" ON public.org_tasks FOR SELECT TO authenticated
  USING (org_id = public.current_org_id());
CREATE POLICY "org members update org_tasks" ON public.org_tasks FOR UPDATE TO authenticated
  USING (org_id = public.current_org_id());

-- task_notes
CREATE TABLE public.task_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.org_tasks(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  note_text text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_task_notes_task ON public.task_notes(task_id);
ALTER TABLE public.task_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage task_notes" ON public.task_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "org members view task_notes" ON public.task_notes FOR SELECT TO authenticated
  USING (org_id = public.current_org_id());
CREATE POLICY "org members insert task_notes" ON public.task_notes FOR INSERT TO authenticated
  WITH CHECK (org_id = public.current_org_id() AND created_by = auth.uid());

-- task_activity_log
CREATE TABLE public.task_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.org_tasks(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  action public.task_action NOT NULL,
  old_value text,
  new_value text,
  performed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_activity_task ON public.task_activity_log(task_id);
ALTER TABLE public.task_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage activity" ON public.task_activity_log FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "org members view activity" ON public.task_activity_log FOR SELECT TO authenticated
  USING (org_id = public.current_org_id());
CREATE POLICY "org members insert activity" ON public.task_activity_log FOR INSERT TO authenticated
  WITH CHECK (org_id = public.current_org_id());

-- notification_log
CREATE TABLE public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  notification_type public.notification_type NOT NULL,
  recipient_role public.notification_recipient_role NOT NULL,
  task_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_sent ON public.notification_log(sent_at);
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins view notifications" ON public.notification_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "org members view own notifications" ON public.notification_log FOR SELECT TO authenticated
  USING (org_id = public.current_org_id());

-- Trigger to bump last_activity_at on note insert
CREATE OR REPLACE FUNCTION public.bump_task_activity_on_note()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.org_tasks SET last_activity_at = now() WHERE id = NEW.task_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_note_bumps_activity AFTER INSERT ON public.task_notes
  FOR EACH ROW EXECUTE FUNCTION public.bump_task_activity_on_note();

-- Column additions
ALTER TABLE public.organizations ADD COLUMN plan_activated_at timestamptz;
ALTER TABLE public.derived_metrics ADD COLUMN tasks_generated_at timestamptz;

-- Seed system templates (45)
INSERT INTO public.task_templates (title, description, engine, task_type, suggested_days_to_complete, is_system_template) VALUES
-- Pricing (5)
('Competitive pricing audit','Research the top 3 competitors in your local market. Document their fee structures, what is included in dues, and where your pricing sits relative to theirs.','Pricing','Strategy',7,true),
('Build tiered package options','Design at least two package tiers that bundle services at different price points. Define what is included in each tier and the price differential between them.','Pricing','Strategy',21,true),
('Create pricing strategy document','Document your official pricing approach including rationale, tier structure, and how staff should communicate pricing to families.','Pricing','Execute',30,true),
('Communicate new pricing structure to current families','Draft and send communication to current families introducing any updated pricing or packaging. Frame it around added value.','Pricing','Communication',45,true),
('Track revenue per player quarterly','Set a recurring reminder to calculate revenue per player at the end of each quarter and compare against the Curve OS wallet share target.','Pricing','Track',90,true),
-- Sponsorship (6)
('Build local business prospect list','Identify 10–15 local businesses with natural alignment to youth sports families. Include contact name, business type, and estimated sponsorship capacity.','Sponsorship','Strategy',7,true),
('Build sponsorship package tiers','Create a sponsorship deck with three tiers: Presenting, Supporting, and Community. Define what each tier includes — jersey placement, signage, social, event naming rights — and the investment level for each.','Sponsorship','Strategy',14,true),
('Assign sponsorship point of contact','Designate one person as the primary sponsorship relationship owner. This person owns outreach, follow-up, and renewal for all sponsor relationships.','Sponsorship','Execute',7,true),
('Begin initial sponsor outreach','Contact the top 10 prospects from your business list. Use the sponsorship deck. Goal is to book 3–5 conversations within 30 days.','Sponsorship','Execute',21,true),
('Log all sponsor conversations and follow-ups','Keep a running log of every sponsor conversation including date, contact name, tier discussed, and next step. Review weekly.','Sponsorship','Track',30,true),
('Close first sponsorship deal','Target at least one closed sponsorship agreement within 45 days of outreach beginning. Document the agreement terms and fulfillment obligations.','Sponsorship','Execute',45,true),
-- Apparel (5)
('Audit current apparel process and margin','Document your current apparel vendor, margin per item, and total annual apparel revenue per player. Identify where margin is being left behind.','Apparel','Strategy',7,true),
('Evaluate in-house vs outsourced apparel model','Research direct vendor options and compare margin against your current model. Build a simple one-page comparison of revenue impact at your player volume.','Apparel','Strategy',21,true),
('Create required gear package','Define a required gear bundle that is included in or added to registration. This guarantees a baseline apparel revenue per player regardless of optional purchases.','Apparel','Execute',30,true),
('Launch optional apparel store or catalog','Create an optional apparel menu families can order from throughout the year. Include spirit wear, practice gear, and equipment bundles.','Apparel','Execute',45,true),
('Track apparel revenue per player seasonally','Calculate apparel revenue per player at the end of each season and compare against the $75–$200 per player benchmark.','Apparel','Track',90,true),
-- Events (6)
('Identify signature event format to own','Choose one event format — showcase, data day, camp, clinic, or hosted tournament — that your organization can own and run annually. Define the format, target audience, and pricing model.','Events','Strategy',14,true),
('Build event P&L template','Create a simple P&L template for each event type you run. Include entry fees, field costs, staff costs, equipment, and marketing. Know your true profit per event.','Events','Strategy',14,true),
('Survey families on event interest','Send a short survey to current families asking about interest in showcases, recruiting events, data days, and development camps. Use results to prioritize which event to build first.','Events','Execute',7,true),
('Plan and schedule first owned event','Set a date, venue, format, and pricing for your first owned event. Assign a point person. Begin marketing to your current family base and local market.','Events','Execute',30,true),
('Post-event revenue and attendance review','After each event, complete a post-event review comparing actual revenue and attendance against projections. Document learnings for the next event.','Events','Track',60,true),
('Build annual event calendar','Map out a full-year event calendar with target dates for each event type. Share with families at the start of each season so they can plan and commit early.','Events','Strategy',45,true),
-- Add-Ons (5)
('Survey families on training interest','Send a short survey asking about interest in private lessons, small group training, and off-season programming. Ask about preferred timing, frequency, and price tolerance.','Add-Ons','Execute',7,true),
('Define lessons revenue capture model','Decide whether lessons and individual training revenue flows through the organization or to coaches directly. If coaches are capturing it independently, build a structure to bring it through the org.','Add-Ons','Strategy',14,true),
('Launch small group training program','Design and launch one small group training offering — hitting, pitching, fielding, or catching. Set a price, minimum group size, and schedule. Promote to current families first.','Add-Ons','Execute',30,true),
('Create year-round training menu','Build a simple one-page training menu that families can reference throughout the year. Include all available lessons, group sessions, and specialty programming with pricing.','Add-Ons','Execute',45,true),
('Track add-on revenue per player quarterly','Calculate lessons and add-on revenue per player each quarter. Compare against the $75–$250 per player benchmark and identify which programs are driving the most revenue.','Add-Ons','Track',90,true),
-- Retention (6)
('Implement weekly coach communication standard','Establish a mandatory weekly communication requirement for all coaches. Define the format, required content, and delivery method. Send the standard to all coaches immediately.','Retention','Execute',7,true),
('Build re-enrollment process','Design a formal re-enrollment workflow with early commitment incentives. Define the timeline, incentive structure, and how families are communicated with at each stage.','Retention','Strategy',21,true),
('Launch re-enrollment campaign','Execute the re-enrollment process for the current cycle. Track responses by team and identify families who have not committed.','Retention','Execute',30,true),
('Conduct exit interviews with churned families','Contact every family that does not re-enroll and conduct a brief exit conversation. Document the primary reason for leaving. Review findings monthly to identify patterns.','Retention','Execute',45,true),
('Track retention rate seasonally','Calculate your retention rate at the end of each season. Compare against your baseline from the Revenue Leak Report and track improvement over time.','Retention','Track',90,true),
('Build family engagement touchpoint calendar','Map out all intentional family touchpoints throughout the year — welcome communications, mid-season check-ins, end of season reviews, re-enrollment outreach. Assign ownership for each.','Retention','Strategy',30,true),
-- Facility (5)
('Audit facility schedule for unused blocks','Review your current facility schedule and identify all unused time blocks — mornings, weekday afternoons, evenings, and off-season windows. Quantify the hours available for rental or programming.','Facility','Strategy',7,true),
('Build facility rental rate card','Create a simple rate card for cage time, field time, and full facility rentals. Research what comparable facilities charge in your market. Define hourly rates, half-day rates, and full-day rates.','Facility','Execute',14,true),
('Identify facility rental prospects','Build a list of 5–10 potential facility tenants — local high schools, rec leagues, other travel clubs, individual instructors. Begin outreach with your rate card.','Facility','Execute',21,true),
('Build in-house instruction program','Design a structured private instruction program that runs through your organization rather than through individual coaches independently. Define revenue split, scheduling process, and how families book sessions.','Facility','Strategy',30,true),
('Track facility utilization monthly','Calculate facility utilization rate monthly — hours used vs. hours available. Track rental revenue per available hour and compare against the $1,200 per player facility revenue benchmark.','Facility','Track',90,true),
-- Operations (4)
('Document organizational structure','Create a clear org chart and role definitions for all staff and coaches. Define who owns what and who reports to whom.','Operations','Strategy',14,true),
('Build staff onboarding process','Create a standard onboarding checklist for new coaches and staff. Include expectations, communication standards, and accountability requirements.','Operations','Execute',30,true),
('Create parent onboarding packet','Build a standard welcome packet for new families. Include org philosophy, communication expectations, schedule structure, and how to get support.','Operations','Execute',21,true),
('Define KPIs and review cadence','Identify the 5–7 metrics you will track to measure organizational health. Set a monthly review cadence and assign ownership for each metric.','Operations','Track',30,true);
