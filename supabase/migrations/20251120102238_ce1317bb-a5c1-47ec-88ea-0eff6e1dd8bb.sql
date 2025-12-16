-- Drop the old restrictive check constraint
ALTER TABLE public.fulfillment_assignments 
DROP CONSTRAINT IF EXISTS check_assignment_type;

-- Add a new, more flexible constraint that allows combinations
-- At least one of program_ids, product_id, or device_category must be set
ALTER TABLE public.fulfillment_assignments
ADD CONSTRAINT check_assignment_type CHECK (
  (program_ids IS NOT NULL AND array_length(program_ids, 1) > 0) OR
  (product_id IS NOT NULL) OR
  (device_category IS NOT NULL)
);

COMMENT ON CONSTRAINT check_assignment_type ON public.fulfillment_assignments IS 
'Ensures at least one assignment type is specified. Allows combinations of program_ids, product_id, and device_category for more flexible assignment rules.';