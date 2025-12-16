-- Add policy_id field to complaints table to link complaints with policies
ALTER TABLE complaints
ADD COLUMN IF NOT EXISTS policy_id UUID REFERENCES policies(id);