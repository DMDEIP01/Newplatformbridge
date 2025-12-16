-- Create policy change history table
CREATE TABLE public.policy_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  old_product_id UUID NOT NULL REFERENCES public.products(id),
  new_product_id UUID NOT NULL REFERENCES public.products(id),
  change_type TEXT NOT NULL CHECK (change_type IN ('upgrade', 'downgrade', 'switch')),
  reason TEXT,
  old_premium NUMERIC NOT NULL,
  new_premium NUMERIC NOT NULL,
  premium_difference NUMERIC NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.policy_change_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own policy change history"
ON public.policy_change_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own policy change history"
ON public.policy_change_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_policy_change_history_user_id ON public.policy_change_history(user_id);
CREATE INDEX idx_policy_change_history_policy_id ON public.policy_change_history(policy_id);
CREATE INDEX idx_policy_change_history_changed_at ON public.policy_change_history(changed_at DESC);