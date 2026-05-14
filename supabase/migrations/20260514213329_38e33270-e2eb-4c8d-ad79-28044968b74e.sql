UPDATE public.system_integrations
SET env_var_names = ARRAY['AYRSHARE_API_KEY','AYRSHARE_JWT_PRIVATE_KEY','AYRSHARE_WEBHOOK_SECRET'],
    status = 'stubbed',
    last_health_check_result = jsonb_build_object(
      'success', false,
      'missing_vars', jsonb_build_array('AYRSHARE_API_KEY','AYRSHARE_JWT_PRIVATE_KEY','AYRSHARE_WEBHOOK_SECRET')
    )
WHERE integration_key = 'ayrshare';