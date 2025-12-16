-- Create repairers table for company/organization information
CREATE TABLE public.repairers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  address_line1 text,
  address_line2 text,
  city text,
  postcode text,
  coverage_areas text[],
  specializations text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.repairers ENABLE ROW LEVEL SECURITY;

-- Add repairer_id to profiles FIRST (before creating policies that reference it)
ALTER TABLE public.profiles
ADD COLUMN repairer_id uuid REFERENCES public.repairers(id) ON DELETE SET NULL;

-- NOW create policies
CREATE POLICY "System admins can manage repairers"
ON public.repairers
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = auth.uid()
  AND role = 'system_admin'
));

CREATE POLICY "Repairer agents can view their company"
ON public.repairers
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT repairer_id FROM public.profiles
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Anyone can view active repairers"
ON public.repairers
FOR SELECT
TO authenticated
USING (is_active = true);

-- Update fulfillment_assignments - rename existing columns first
ALTER TABLE public.fulfillment_assignments
RENAME COLUMN repairer_id TO old_repairer_id;

ALTER TABLE public.fulfillment_assignments
RENAME COLUMN repairer_name TO old_repairer_name;

-- Add new properly typed repairer_id column
ALTER TABLE public.fulfillment_assignments
ADD COLUMN repairer_id uuid REFERENCES public.repairers(id) ON DELETE CASCADE;

-- Drop old columns
ALTER TABLE public.fulfillment_assignments
DROP COLUMN old_repairer_id;

ALTER TABLE public.fulfillment_assignments
DROP COLUMN old_repairer_name;

-- Add trigger for updated_at
CREATE TRIGGER update_repairers_updated_at
  BEFORE UPDATE ON public.repairers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();