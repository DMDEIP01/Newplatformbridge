-- Create repair_costs table to track labour, parts, and admin costs
CREATE TABLE IF NOT EXISTS repair_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  fulfillment_id uuid NOT NULL REFERENCES claim_fulfillment(id) ON DELETE CASCADE,
  cost_type text NOT NULL CHECK (cost_type IN ('labour', 'parts', 'admin')),
  description text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  added_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE repair_costs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Repairer agents can insert costs"
ON repair_costs
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'repairer_agent'::app_role) 
  AND added_by = auth.uid()
);

CREATE POLICY "Repairer agents can view their own costs"
ON repair_costs
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'repairer_agent'::app_role) 
  AND added_by = auth.uid()
);

CREATE POLICY "Admins can view all costs"
ON repair_costs
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can manage all costs"
ON repair_costs
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Add index for faster queries
CREATE INDEX idx_repair_costs_claim_id ON repair_costs(claim_id);
CREATE INDEX idx_repair_costs_fulfillment_id ON repair_costs(fulfillment_id);