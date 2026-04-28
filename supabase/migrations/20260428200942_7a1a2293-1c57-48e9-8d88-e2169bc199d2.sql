DROP TABLE IF EXISTS public.commv2_drafts CASCADE;
DROP TABLE IF EXISTS public.commv2_event_facts CASCADE;
DROP TABLE IF EXISTS public.commv2_reschedule_log CASCADE;
DROP TABLE IF EXISTS public.commv2_calendar_items CASCADE;
DROP TABLE IF EXISTS public.commv2_event_types CASCADE;
DROP FUNCTION IF EXISTS public.commv2_compute_draft_due() CASCADE;