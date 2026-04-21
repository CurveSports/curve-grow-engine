-- Onboarding state per user
CREATE TABLE public.user_onboarding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  password_set_at TIMESTAMP WITH TIME ZONE,
  welcomed_at TIMESTAMP WITH TIME ZONE,
  intake_started_at TIMESTAMP WITH TIME ZONE,
  intake_completed_at TIMESTAMP WITH TIME ZONE,
  report_viewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own onboarding"
ON public.user_onboarding FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "users update own onboarding"
ON public.user_onboarding FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "users insert own onboarding"
ON public.user_onboarding FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "admins manage onboarding"
ON public.user_onboarding FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_user_onboarding_updated_at
BEFORE UPDATE ON public.user_onboarding
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create an onboarding row whenever a profile is created
CREATE OR REPLACE FUNCTION public.handle_new_profile_onboarding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_onboarding (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_init_onboarding
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile_onboarding();

-- Backfill for existing users
INSERT INTO public.user_onboarding (user_id, intake_completed_at)
SELECT p.user_id,
       CASE WHEN oi.id IS NOT NULL THEN now() ELSE NULL END
FROM public.profiles p
LEFT JOIN public.organization_intake oi ON oi.org_id = p.org_id
ON CONFLICT (user_id) DO NOTHING;