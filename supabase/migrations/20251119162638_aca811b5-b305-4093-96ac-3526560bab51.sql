-- First drop the old constraint
ALTER TABLE public.fulfillment_assignments
DROP CONSTRAINT IF EXISTS check_assignment_type;

-- Delete any existing assignments (since the table should be empty based on network logs)
DELETE FROM public.fulfillment_assignments;

-- Drop the old program_id column
ALTER TABLE public.fulfillment_assignments
DROP COLUMN IF EXISTS program_id;

-- Add the new program_ids array column
ALTER TABLE public.fulfillment_assignments
ADD COLUMN program_ids UUID[];

-- Add new constraint that ensures only one type of assignment
ALTER TABLE public.fulfillment_assignments
ADD CONSTRAINT check_assignment_type CHECK (
  (program_ids IS NOT NULL AND array_length(program_ids, 1) > 0 AND product_id IS NULL AND device_category IS NULL) OR
  (program_ids IS NULL AND product_id IS NOT NULL AND device_category IS NULL) OR
  (program_ids IS NULL AND product_id IS NULL AND device_category IS NOT NULL)
);

-- Create index for faster lookups on program_ids
CREATE INDEX idx_fulfillment_assignments_program_ids ON public.fulfillment_assignments USING GIN(program_ids);