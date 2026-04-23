DO $$
DECLARE
  v_org_ids uuid[] := ARRAY[
    '58c0a5d0-2ae8-422c-8b68-47f86326b56a'::uuid,
    '6b727bd1-7552-4288-b956-a6f0e0b6de20'::uuid,
    '439b3251-5d20-434e-a443-c04d07092d60'::uuid
  ];
  v_user_ids uuid[] := ARRAY[
    'b8785a0e-9094-4c03-b71e-d59be7ef0eec'::uuid,
    'a678a32c-8eda-4e22-a3d4-096135abd665'::uuid
  ];
BEGIN
  -- Org-scoped data
  DELETE FROM public.task_notes              WHERE org_id = ANY(v_org_ids);
  DELETE FROM public.task_activity_log       WHERE org_id = ANY(v_org_ids);
  DELETE FROM public.org_task_assignees      WHERE org_id = ANY(v_org_ids);
  DELETE FROM public.org_tasks               WHERE org_id = ANY(v_org_ids);
  DELETE FROM public.org_projects            WHERE org_id = ANY(v_org_ids);
  DELETE FROM public.org_notes               WHERE org_id = ANY(v_org_ids);
  DELETE FROM public.org_calculator_scenarios WHERE org_id = ANY(v_org_ids);
  DELETE FROM public.org_communication_log   WHERE org_id = ANY(v_org_ids);
  DELETE FROM public.org_presentation_edits  WHERE org_id = ANY(v_org_ids);
  DELETE FROM public.org_tier_history        WHERE org_id = ANY(v_org_ids);
  DELETE FROM public.org_weekly_focus        WHERE org_id = ANY(v_org_ids);
  DELETE FROM public.organization_intake     WHERE org_id = ANY(v_org_ids);
  DELETE FROM public.derived_metrics         WHERE org_id = ANY(v_org_ids);
  DELETE FROM public.admin_alert_dismissals  WHERE org_id = ANY(v_org_ids);
  DELETE FROM public.admin_org_assignments   WHERE org_id = ANY(v_org_ids);
  DELETE FROM public.admin_org_reviews       WHERE org_id = ANY(v_org_ids);
  DELETE FROM public.notification_log        WHERE org_id = ANY(v_org_ids);
  DELETE FROM public.invitations             WHERE org_id = ANY(v_org_ids);

  -- User-scoped data for the two users
  DELETE FROM public.user_onboarding         WHERE user_id = ANY(v_user_ids);
  DELETE FROM public.user_roles              WHERE user_id = ANY(v_user_ids);
  DELETE FROM public.profiles                WHERE user_id = ANY(v_user_ids);

  -- Clear primary_user_id pointer before org delete (defensive)
  UPDATE public.organizations SET primary_user_id = NULL WHERE id = ANY(v_org_ids);

  -- Delete the orgs
  DELETE FROM public.organizations           WHERE id = ANY(v_org_ids);

  -- Finally delete the auth users
  DELETE FROM auth.users                     WHERE id = ANY(v_user_ids);
END $$;