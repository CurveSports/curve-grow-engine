-- One-time hard reset for test org 5f0de127-04c2-44a1-9fed-62dfa3e5d0a0
-- Wipes all tasks, projects, weekly focus, and activity so action plan can regenerate from intake.
DELETE FROM public.task_notes WHERE org_id = '5f0de127-04c2-44a1-9fed-62dfa3e5d0a0';
DELETE FROM public.task_activity_log WHERE org_id = '5f0de127-04c2-44a1-9fed-62dfa3e5d0a0';
DELETE FROM public.org_tasks WHERE org_id = '5f0de127-04c2-44a1-9fed-62dfa3e5d0a0';
DELETE FROM public.org_projects WHERE org_id = '5f0de127-04c2-44a1-9fed-62dfa3e5d0a0';
DELETE FROM public.org_weekly_focus WHERE org_id = '5f0de127-04c2-44a1-9fed-62dfa3e5d0a0';
UPDATE public.organizations SET plan_activated_at = NULL WHERE id = '5f0de127-04c2-44a1-9fed-62dfa3e5d0a0';