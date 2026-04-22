-- Create enum for task source
CREATE TYPE public.task_source AS ENUM ('system', 'library', 'custom');

-- Add source column to org_tasks, default to 'system' for backfill
ALTER TABLE public.org_tasks
ADD COLUMN source public.task_source NOT NULL DEFAULT 'system';

-- Index for filtering
CREATE INDEX idx_org_tasks_source ON public.org_tasks(source);