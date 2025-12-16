-- Allow commercial agents and backoffice agents to view all service requests
CREATE POLICY "Commercial agents can view all service requests"
ON public.service_requests
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'commercial_agent'::app_role, NULL::uuid) OR
  public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid)
);

CREATE POLICY "Backoffice agents can view all service requests"
ON public.service_requests
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'backoffice_agent'::app_role, NULL::uuid) OR
  public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid)
);

-- Allow commercial agents and backoffice agents to update service requests
CREATE POLICY "Commercial agents can update service requests"
ON public.service_requests
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'commercial_agent'::app_role, NULL::uuid) OR
  public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid)
);

CREATE POLICY "Backoffice agents can update service requests"
ON public.service_requests
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'backoffice_agent'::app_role, NULL::uuid) OR
  public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid)
);

-- Allow commercial agents and backoffice agents to insert service requests
CREATE POLICY "Commercial agents can insert service requests"
ON public.service_requests
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'commercial_agent'::app_role, NULL::uuid) OR
  public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid)
);

CREATE POLICY "Backoffice agents can insert service requests"
ON public.service_requests
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'backoffice_agent'::app_role, NULL::uuid) OR
  public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid)
);