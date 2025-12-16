-- Create storage bucket for promotion logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('promotion-logos', 'promotion-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Add logo_url column to promotions table
ALTER TABLE public.promotions
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Create RLS policies for promotion logos bucket
CREATE POLICY "Public can view promotion logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'promotion-logos');

CREATE POLICY "Admins and retail agents can upload promotion logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'promotion-logos' AND
  (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('system_admin'::app_role, 'admin'::app_role, 'retail_agent'::app_role)
    )
  )
);

CREATE POLICY "Admins and retail agents can update promotion logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'promotion-logos' AND
  (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('system_admin'::app_role, 'admin'::app_role, 'retail_agent'::app_role)
    )
  )
);

CREATE POLICY "Admins and retail agents can delete promotion logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'promotion-logos' AND
  (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('system_admin'::app_role, 'admin'::app_role, 'retail_agent'::app_role)
    )
  )
);