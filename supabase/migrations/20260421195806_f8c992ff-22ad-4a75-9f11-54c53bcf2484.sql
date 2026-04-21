DO $$
DECLARE
  keep_id uuid := '439b3251-5d20-434e-a443-c04d07092d60';
  org_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO org_ids FROM public.organizations WHERE id != keep_id;

  DELETE FROM public.task_notes WHERE org_id = ANY(org_ids);
  DELETE FROM public.task_activity_log WHERE org_id = ANY(org_ids);
  DELETE FROM public.org_tasks WHERE org_id = ANY(org_ids);
  DELETE FROM public.notification_log WHERE org_id = ANY(org_ids);
  DELETE FROM public.derived_metrics WHERE org_id = ANY(org_ids);
  DELETE FROM public.organization_intake WHERE org_id = ANY(org_ids);
  DELETE FROM public.invitations WHERE org_id = ANY(org_ids);
  UPDATE public.profiles SET org_id = NULL WHERE org_id = ANY(org_ids);
  DELETE FROM public.organizations WHERE id = ANY(org_ids);
END $$;