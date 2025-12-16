-- Add new columns to devices table
ALTER TABLE public.devices
ADD COLUMN trade_in_faulty numeric,
ADD COLUMN refurb_buy numeric,
ADD COLUMN price_expiry date;

-- Update smartphones with calculated values
UPDATE public.devices
SET 
  trade_in_faulty = ROUND(rrp * (0.30 + (random() * 0.10))::numeric, 2),
  refurb_buy = ROUND(rrp * (0.50 + (random() * 0.15))::numeric, 2),
  price_expiry = CURRENT_DATE + INTERVAL '14 days'
WHERE LOWER(device_category) LIKE '%smartphone%' 
   OR LOWER(device_category) LIKE '%phone%'
   OR LOWER(device_category) = 'mobile phone';