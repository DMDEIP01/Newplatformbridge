-- Add fields for retail agent complaints
ALTER TABLE complaints
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS complaint_type TEXT CHECK (complaint_type IN ('regulated', 'unregulated'));

-- Make user_id nullable for complaints created by retail agents on behalf of customers
ALTER TABLE complaints ALTER COLUMN user_id DROP NOT NULL;

-- Add RLS policies for consultants/admins to manage complaints
CREATE POLICY "Consultants can create complaints"
ON complaints
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'consultant'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Consultants can view all complaints"
ON complaints
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'consultant'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Consultants can update complaints"
ON complaints
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'consultant'::app_role) OR has_role(auth.uid(), 'admin'::app_role));