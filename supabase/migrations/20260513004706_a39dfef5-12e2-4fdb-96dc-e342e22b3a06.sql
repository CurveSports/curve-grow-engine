DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'campaigns','designs','approvals','org_brand_assets','org_brand_kits',
    'org_contact_segments','org_contact_uploads','org_contacts','org_email_ab_tests',
    'org_email_domains','org_email_events','org_email_sends','org_marketing_summary',
    'org_nps_responses','org_nps_surveys','org_send_time_recommendations',
    'org_shortlinks','org_sms_drafts','org_sms_events','org_sms_inbound',
    'org_sms_numbers','org_sms_sends','org_social_accounts','org_social_posts'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'admins manage ' || t, t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin''::app_role)) WITH CHECK (public.has_role(auth.uid(), ''admin''::app_role))',
        'admins manage ' || t, t
      );
    END IF;
  END LOOP;
END $$;