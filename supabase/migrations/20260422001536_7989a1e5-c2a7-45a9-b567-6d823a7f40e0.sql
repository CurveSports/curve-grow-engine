ALTER TABLE public.derived_metrics
  ADD COLUMN IF NOT EXISTS engagement_approach_recommendation text,
  ADD COLUMN IF NOT EXISTS pricing_strategy_note text,
  ADD COLUMN IF NOT EXISTS admin_alerts jsonb DEFAULT '[]'::jsonb;

-- Extend notification_type enum to include high_risk_alert (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'high_risk_alert' 
      AND enumtypid = 'public.notification_type'::regtype
  ) THEN
    ALTER TYPE public.notification_type ADD VALUE 'high_risk_alert';
  END IF;
END $$;