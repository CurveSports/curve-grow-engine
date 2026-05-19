
ALTER TABLE public.org_shared_files
  ADD COLUMN folder_path TEXT NOT NULL DEFAULT '';

CREATE INDEX idx_org_shared_files_folder ON public.org_shared_files(org_id, folder_path);

CREATE TABLE public.org_shared_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, path)
);

CREATE INDEX idx_org_shared_folders_org ON public.org_shared_folders(org_id, path);

ALTER TABLE public.org_shared_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all shared folders"
  ON public.org_shared_folders FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org users view their org folders"
  ON public.org_shared_folders FOR SELECT
  USING (org_id = public.current_org_id());

CREATE POLICY "Org users create folders in their org"
  ON public.org_shared_folders FOR INSERT
  WITH CHECK (org_id = public.current_org_id() AND created_by = auth.uid());

CREATE POLICY "Org users delete folders they created"
  ON public.org_shared_folders FOR DELETE
  USING (org_id = public.current_org_id() AND created_by = auth.uid());
