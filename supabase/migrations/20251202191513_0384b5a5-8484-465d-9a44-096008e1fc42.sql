-- Add purchase_date column to covered_items for tracking when the device was actually purchased
ALTER TABLE public.covered_items 
ADD COLUMN purchase_date date;