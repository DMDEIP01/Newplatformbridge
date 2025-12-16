-- Create policy_action_history table to track all policy actions
CREATE TABLE public.policy_action_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- 'upgrade', 'downgrade', 'renewal', 'cancellation', 'documents_issued', 'premium_change'
  action_description TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.policy_action_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own policy action history" 
ON public.policy_action_history 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM policies 
    WHERE policies.id = policy_action_history.policy_id 
    AND policies.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert action history for their policies" 
ON public.policy_action_history 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM policies 
    WHERE policies.id = policy_action_history.policy_id 
    AND policies.user_id = auth.uid()
  )
);

CREATE POLICY "Agents can view all policy action history" 
ON public.policy_action_history 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role, NULL::uuid) OR 
  has_role(auth.uid(), 'retail_agent'::app_role, NULL::uuid) OR 
  has_role(auth.uid(), 'claims_agent'::app_role, NULL::uuid) OR
  has_role(auth.uid(), 'consultant'::app_role, NULL::uuid)
);

CREATE POLICY "Agents can insert policy action history" 
ON public.policy_action_history 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role, NULL::uuid) OR 
  has_role(auth.uid(), 'retail_agent'::app_role, NULL::uuid) OR 
  has_role(auth.uid(), 'claims_agent'::app_role, NULL::uuid) OR
  has_role(auth.uid(), 'consultant'::app_role, NULL::uuid)
);

-- Create index for faster queries
CREATE INDEX idx_policy_action_history_policy_id ON public.policy_action_history(policy_id);
CREATE INDEX idx_policy_action_history_created_at ON public.policy_action_history(created_at DESC);