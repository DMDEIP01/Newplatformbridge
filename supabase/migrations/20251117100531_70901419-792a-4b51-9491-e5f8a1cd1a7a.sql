-- Make user_id NOT NULL in complaints table to prevent orphaned complaints
ALTER TABLE public.complaints 
ALTER COLUMN user_id SET NOT NULL;

-- Add a comment explaining the constraint
COMMENT ON COLUMN public.complaints.user_id IS 'Required: Every complaint must be associated with a user for proper access control and audit trail';