-- Allow agents to view claim documents
CREATE POLICY "Agents can view claim documents"
ON documents
FOR SELECT
USING (
  public.has_role(auth.uid(), 'claims_agent'::app_role, NULL::uuid) OR
  public.has_role(auth.uid(), 'retail_agent'::app_role, NULL::uuid) OR
  public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid) OR
  public.has_role(auth.uid(), 'complaints_agent'::app_role, NULL::uuid) OR
  public.has_role(auth.uid(), 'consultant'::app_role, NULL::uuid)
);