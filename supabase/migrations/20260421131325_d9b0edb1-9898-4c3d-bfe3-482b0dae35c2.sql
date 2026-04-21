
CREATE OR REPLACE FUNCTION public.claim_pending_invitation()
RETURNS TABLE(claimed boolean, org_id uuid, role app_role)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_invite RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::app_role;
    RETURN;
  END IF;

  -- If the user already has a role, nothing to do
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uid) THEN
    RETURN QUERY SELECT false, (SELECT p.org_id FROM public.profiles p WHERE p.user_id = v_uid), (SELECT ur.role FROM public.user_roles ur WHERE ur.user_id = v_uid LIMIT 1);
    RETURN;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::app_role;
    RETURN;
  END IF;

  SELECT * INTO v_invite FROM public.invitations
  WHERE lower(email) = lower(v_email) AND status = 'pending'
  ORDER BY created_at DESC LIMIT 1;

  IF v_invite IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::app_role;
    RETURN;
  END IF;

  INSERT INTO public.profiles (user_id, email, org_id)
  VALUES (v_uid, v_email, v_invite.org_id)
  ON CONFLICT (user_id) DO UPDATE SET org_id = EXCLUDED.org_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, v_invite.role)
  ON CONFLICT DO NOTHING;

  IF v_invite.is_primary AND v_invite.org_id IS NOT NULL THEN
    UPDATE public.organizations SET primary_user_id = v_uid WHERE id = v_invite.org_id;
  END IF;

  UPDATE public.invitations SET status = 'accepted', accepted_at = now() WHERE id = v_invite.id;

  RETURN QUERY SELECT true, v_invite.org_id, v_invite.role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_pending_invitation() TO authenticated;
