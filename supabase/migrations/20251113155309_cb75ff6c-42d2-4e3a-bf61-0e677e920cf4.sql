-- Create fulfillment table to track claim fulfillment process
CREATE TABLE IF NOT EXISTS public.claim_fulfillment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES public.claims(id),
  excess_paid BOOLEAN NOT NULL DEFAULT false,
  excess_amount NUMERIC,
  excess_payment_date TIMESTAMP WITH TIME ZONE,
  device_value NUMERIC,
  fulfillment_type TEXT, -- 'voucher', 'collection_repair', 'in_home_repair'
  appointment_date TIMESTAMP WITH TIME ZONE,
  appointment_slot TEXT,
  logistics_reference TEXT,
  engineer_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending_excess', -- 'pending_excess', 'awaiting_appointment', 'scheduled', 'in_progress', 'completed'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.claim_fulfillment ENABLE ROW LEVEL SECURITY;

-- Allow agents to manage fulfillment
CREATE POLICY "Agents can manage fulfillment"
ON public.claim_fulfillment
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'retail_agent'::app_role) OR 
  has_role(auth.uid(), 'claims_agent'::app_role)
);

-- Allow users to view their own fulfillment
CREATE POLICY "Users can view own fulfillment"
ON public.claim_fulfillment
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM claims
    WHERE claims.id = claim_fulfillment.claim_id
    AND claims.user_id = auth.uid()
  )
);

-- Create trigger to update updated_at
CREATE TRIGGER update_claim_fulfillment_updated_at
BEFORE UPDATE ON public.claim_fulfillment
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();