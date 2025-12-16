-- Add department field to service_requests table
ALTER TABLE public.service_requests 
ADD COLUMN IF NOT EXISTS department text;