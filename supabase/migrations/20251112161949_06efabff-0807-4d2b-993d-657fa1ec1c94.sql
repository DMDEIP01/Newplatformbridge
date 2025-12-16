-- Step 2: Add classification and assignment fields to complaints table
ALTER TABLE public.complaints 
ADD COLUMN IF NOT EXISTS classification text,
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reviewed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id);

-- Add constraint
ALTER TABLE public.complaints
ADD CONSTRAINT complaints_classification_check 
CHECK (classification IN ('regulatory', 'non_regulatory'));

-- Update status comment
COMMENT ON COLUMN public.complaints.status IS 'Valid values: submitted, under_review, classified, responded, closed';

-- Create RLS policies for complaints agents
CREATE POLICY "Complaints agents can view all complaints"
ON public.complaints
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'complaints_agent'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Complaints agents can update complaints"
ON public.complaints
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'complaints_agent'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_complaints_status ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_classification ON public.complaints(classification);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned_to ON public.complaints(assigned_to);