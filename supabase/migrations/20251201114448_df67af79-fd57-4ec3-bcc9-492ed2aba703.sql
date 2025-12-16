-- Add complaint_id column to policy_communications table
ALTER TABLE policy_communications 
ADD COLUMN complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE;