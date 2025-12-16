-- Allow claims_agent to view repair costs
CREATE POLICY "Claims agents can view repair costs" 
ON public.repair_costs 
FOR SELECT 
USING (public.has_role(auth.uid()::uuid, 'claims_agent'::app_role, NULL::uuid));

-- Allow backoffice_agent to view repair costs  
CREATE POLICY "Backoffice agents can view repair costs" 
ON public.repair_costs 
FOR SELECT 
USING (public.has_role(auth.uid()::uuid, 'backoffice_agent'::app_role, NULL::uuid));

-- Allow retail_agent to view repair costs
CREATE POLICY "Retail agents can view repair costs" 
ON public.repair_costs 
FOR SELECT 
USING (public.has_role(auth.uid()::uuid, 'retail_agent'::app_role, NULL::uuid));