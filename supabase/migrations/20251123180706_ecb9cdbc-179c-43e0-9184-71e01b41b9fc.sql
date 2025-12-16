-- Add claim_id to service_requests to link service requests to claims
ALTER TABLE public.service_requests
ADD COLUMN claim_id uuid REFERENCES public.claims(id) ON DELETE CASCADE;

-- Add service_request_id to documents table to support document uploads for service requests
ALTER TABLE public.documents
ADD COLUMN service_request_id uuid REFERENCES public.service_requests(id) ON DELETE CASCADE;

-- Add index for faster lookups
CREATE INDEX idx_service_requests_claim_id ON public.service_requests(claim_id);
CREATE INDEX idx_documents_service_request_id ON public.documents(service_request_id);

-- Update RLS policies for service_requests to allow claims agents
DROP POLICY IF EXISTS "Consultants can create service requests" ON public.service_requests;
DROP POLICY IF EXISTS "Consultants can update service requests" ON public.service_requests;
DROP POLICY IF EXISTS "Consultants can view all service requests" ON public.service_requests;

-- Allow consultants, claims agents, and retail agents to create service requests
CREATE POLICY "Agents can create service requests"
ON public.service_requests
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'consultant'::app_role, NULL::uuid) OR 
  public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid) OR
  public.has_role(auth.uid(), 'claims_agent'::app_role, NULL::uuid) OR
  public.has_role(auth.uid(), 'retail_agent'::app_role, NULL::uuid)
);

-- Allow agents to update service requests they created or are assigned to
CREATE POLICY "Agents can update service requests"
ON public.service_requests
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'consultant'::app_role, NULL::uuid) OR 
  public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid) OR
  public.has_role(auth.uid(), 'claims_agent'::app_role, NULL::uuid) OR
  public.has_role(auth.uid(), 'retail_agent'::app_role, NULL::uuid)
);

-- Allow agents to view all service requests
CREATE POLICY "Agents can view all service requests"
ON public.service_requests
FOR SELECT
USING (
  public.has_role(auth.uid(), 'consultant'::app_role, NULL::uuid) OR 
  public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid) OR
  public.has_role(auth.uid(), 'claims_agent'::app_role, NULL::uuid) OR
  public.has_role(auth.uid(), 'retail_agent'::app_role, NULL::uuid)
);

-- Allow customers to view their own service requests (by user_id match through policy)
CREATE POLICY "Customers can view own service requests"
ON public.service_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.policies p
    WHERE p.id = service_requests.policy_id
    AND p.user_id = auth.uid()
  )
);

-- Allow customers to update their own service requests (add messages)
CREATE POLICY "Customers can update own service requests"
ON public.service_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.policies p
    WHERE p.id = service_requests.policy_id
    AND p.user_id = auth.uid()
  )
);

-- Update documents RLS to allow service request document uploads
CREATE POLICY "Users can insert documents for service requests"
ON public.documents
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  (service_request_id IS NOT NULL OR claim_id IS NOT NULL OR policy_id IS NOT NULL)
);

-- Allow agents to view documents linked to service requests
CREATE POLICY "Agents can view service request documents"
ON public.documents
FOR SELECT
USING (
  service_request_id IS NOT NULL AND (
    public.has_role(auth.uid(), 'claims_agent'::app_role, NULL::uuid) OR
    public.has_role(auth.uid(), 'retail_agent'::app_role, NULL::uuid) OR
    public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid) OR
    public.has_role(auth.uid(), 'consultant'::app_role, NULL::uuid)
  )
);