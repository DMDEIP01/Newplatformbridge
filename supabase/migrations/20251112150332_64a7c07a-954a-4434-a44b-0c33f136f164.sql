-- Add customer information fields to policies table
ALTER TABLE policies
ADD COLUMN customer_name TEXT,
ADD COLUMN customer_email TEXT,
ADD COLUMN customer_phone TEXT,
ADD COLUMN customer_address_line1 TEXT,
ADD COLUMN customer_address_line2 TEXT,
ADD COLUMN customer_city TEXT,
ADD COLUMN customer_postcode TEXT;

-- Update existing policies to copy profile data to customer fields
UPDATE policies
SET 
  customer_name = profiles.full_name,
  customer_email = profiles.email,
  customer_phone = profiles.phone,
  customer_address_line1 = profiles.address_line1,
  customer_address_line2 = profiles.address_line2,
  customer_city = profiles.city,
  customer_postcode = profiles.postcode
FROM profiles
WHERE policies.user_id = profiles.id;