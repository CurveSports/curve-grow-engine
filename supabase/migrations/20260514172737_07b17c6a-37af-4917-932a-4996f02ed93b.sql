ALTER TABLE public.designs ADD COLUMN IF NOT EXISTS generation_error text;
ALTER TABLE public.designs ADD COLUMN IF NOT EXISTS generation_started_at timestamptz;

ALTER TABLE public.designs REPLICA IDENTITY FULL;
DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='designs';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.designs';
  END IF;
END $$;