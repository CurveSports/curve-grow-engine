CREATE POLICY "org members insert system calendar items"
ON public.org_calendar_items
FOR INSERT
TO authenticated
WITH CHECK (
  org_id = public.current_org_id()
  AND created_by = auth.uid()
  AND is_system_item = true
  AND is_custom = false
);