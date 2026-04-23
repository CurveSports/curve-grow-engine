ALTER TABLE public.user_onboarding 
ADD COLUMN IF NOT EXISTS branding_completed_at timestamp with time zone;