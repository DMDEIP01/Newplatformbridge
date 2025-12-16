-- Add promotion_id to policies table to track which promo was applied
ALTER TABLE public.policies 
ADD COLUMN IF NOT EXISTS promotion_id uuid REFERENCES public.promotions(id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_policies_promotion_id ON public.policies(promotion_id);

-- Add promotional pricing columns to store the actual discounted price at time of sale
ALTER TABLE public.policies 
ADD COLUMN IF NOT EXISTS promotional_premium numeric,
ADD COLUMN IF NOT EXISTS original_premium numeric;