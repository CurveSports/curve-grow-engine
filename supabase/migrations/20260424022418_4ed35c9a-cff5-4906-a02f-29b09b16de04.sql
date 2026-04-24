
-- Block all client access to oauth_states; service role bypasses RLS.
CREATE POLICY "deny all client access to oauth states"
  ON public.user_email_oauth_states FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);
