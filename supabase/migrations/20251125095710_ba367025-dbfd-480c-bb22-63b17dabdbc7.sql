-- Add new columns to claim_fulfillment table for enhanced tracking
ALTER TABLE public.claim_fulfillment
ADD COLUMN IF NOT EXISTS repair_outcome TEXT CHECK (repair_outcome IN ('fixed', 'not_fixed', 'ber')),
ADD COLUMN IF NOT EXISTS ber_reason TEXT,
ADD COLUMN IF NOT EXISTS inspection_notes TEXT,
ADD COLUMN IF NOT EXISTS inspection_photos TEXT[],
ADD COLUMN IF NOT EXISTS quote_amount NUMERIC,
ADD COLUMN IF NOT EXISTS quote_status TEXT CHECK (quote_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS quote_rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS repair_scheduled_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS repair_scheduled_slot TEXT;

-- Create inspection-photos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('inspection-photos', 'inspection-photos', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for inspection-photos bucket
CREATE POLICY "Repairer agents can upload inspection photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inspection-photos' AND
  (public.has_role(auth.uid(), 'repairer_agent'::app_role, NULL::uuid) OR public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid))
);

CREATE POLICY "Repairer agents can view inspection photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'inspection-photos' AND
  (public.has_role(auth.uid(), 'repairer_agent'::app_role, NULL::uuid) OR public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid) OR public.has_role(auth.uid(), 'claims_agent'::app_role, NULL::uuid) OR public.has_role(auth.uid(), 'retail_agent'::app_role, NULL::uuid))
);

CREATE POLICY "Claims agents can view inspection photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'inspection-photos' AND
  (public.has_role(auth.uid(), 'claims_agent'::app_role, NULL::uuid) OR public.has_role(auth.uid(), 'retail_agent'::app_role, NULL::uuid) OR public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid))
);

CREATE POLICY "Admins can delete inspection photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'inspection-photos' AND
  public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid)
);