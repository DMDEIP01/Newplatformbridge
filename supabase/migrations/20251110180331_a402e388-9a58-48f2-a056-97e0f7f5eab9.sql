-- Create enum for complaint reasons
CREATE TYPE complaint_reason AS ENUM (
  'claim_processing',
  'customer_service',
  'policy_terms',
  'payment_issue',
  'product_coverage',
  'other'
);

-- Create complaints table
CREATE TABLE public.complaints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  complaint_reference TEXT NOT NULL UNIQUE,
  reason complaint_reason NOT NULL,
  details TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own complaints"
ON public.complaints
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own complaints"
ON public.complaints
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create function to generate complaint reference
CREATE OR REPLACE FUNCTION generate_complaint_reference()
RETURNS TEXT AS $$
DECLARE
  ref_number TEXT;
BEGIN
  ref_number := 'CMP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  RETURN ref_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_complaints_updated_at
BEFORE UPDATE ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();