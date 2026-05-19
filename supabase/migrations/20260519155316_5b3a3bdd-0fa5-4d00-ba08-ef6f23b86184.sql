
-- Shared files table
CREATE TABLE public.org_shared_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  description TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_org_shared_files_org ON public.org_shared_files(org_id, created_at DESC);

ALTER TABLE public.org_shared_files ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins manage all shared files"
  ON public.org_shared_files
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Org users: view files in their own org
CREATE POLICY "Org users view their org files"
  ON public.org_shared_files
  FOR SELECT
  USING (org_id = public.current_org_id());

-- Org users: upload to their org
CREATE POLICY "Org users upload to their org"
  ON public.org_shared_files
  FOR INSERT
  WITH CHECK (org_id = public.current_org_id() AND uploaded_by = auth.uid());

-- Org users: delete files they uploaded
CREATE POLICY "Org users delete own uploads"
  ON public.org_shared_files
  FOR DELETE
  USING (org_id = public.current_org_id() AND uploaded_by = auth.uid());

CREATE TRIGGER update_org_shared_files_updated_at
  BEFORE UPDATE ON public.org_shared_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('org-shared-files', 'org-shared-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS — files stored under {org_id}/...
CREATE POLICY "Admins manage shared-files storage"
  ON storage.objects FOR ALL
  USING (bucket_id = 'org-shared-files' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'org-shared-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Org users read their org shared files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'org-shared-files'
    AND (storage.foldername(name))[1] = public.current_org_id()::text
  );

CREATE POLICY "Org users upload to their org shared files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'org-shared-files'
    AND (storage.foldername(name))[1] = public.current_org_id()::text
  );

CREATE POLICY "Org users delete their org shared files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'org-shared-files'
    AND (storage.foldername(name))[1] = public.current_org_id()::text
  );
