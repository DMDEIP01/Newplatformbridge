-- Allow commercial agents and backoffice agents to view service request messages
CREATE POLICY "Commercial agents can view service request messages"
ON public.service_request_messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'commercial_agent'::app_role, NULL::uuid) OR
  public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid)
);

CREATE POLICY "Backoffice agents can view service request messages"
ON public.service_request_messages
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'backoffice_agent'::app_role, NULL::uuid) OR
  public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid)
);

-- Allow commercial agents and backoffice agents to insert service request messages
CREATE POLICY "Commercial agents can insert service request messages"
ON public.service_request_messages
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'commercial_agent'::app_role, NULL::uuid) OR
  public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid)
);

CREATE POLICY "Backoffice agents can insert service request messages"
ON public.service_request_messages
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'backoffice_agent'::app_role, NULL::uuid) OR
  public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid)
);

-- Allow commercial agents and backoffice agents to update service request messages
CREATE POLICY "Commercial agents can update service request messages"
ON public.service_request_messages
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'commercial_agent'::app_role, NULL::uuid) OR
  public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid)
);

CREATE POLICY "Backoffice agents can update service request messages"
ON public.service_request_messages
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'backoffice_agent'::app_role, NULL::uuid) OR
  public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid)
);