-- Remove the check constraint on classification and make it properly nullable
ALTER TABLE public.complaints DROP CONSTRAINT IF EXISTS complaints_classification_check;

-- The classification field is already nullable, so no need to alter it further