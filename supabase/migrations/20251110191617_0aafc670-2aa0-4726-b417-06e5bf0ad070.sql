-- Delete duplicate covered items, keeping only one per policy
-- Using ROW_NUMBER to identify which rows to keep
WITH ranked_items AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY policy_id 
      ORDER BY added_date ASC, created_at ASC
    ) as rn
  FROM public.covered_items
)
DELETE FROM public.covered_items
WHERE id IN (
  SELECT id FROM ranked_items WHERE rn > 1
);

-- Add unique constraint to ensure one device per policy
ALTER TABLE public.covered_items
ADD CONSTRAINT covered_items_policy_id_unique UNIQUE (policy_id);

-- Add comment to clarify the constraint
COMMENT ON CONSTRAINT covered_items_policy_id_unique ON public.covered_items 
IS 'Ensures each policy can only have one insured device/asset';