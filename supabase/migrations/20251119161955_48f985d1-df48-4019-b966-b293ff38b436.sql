-- Create fulfillment assignments table
CREATE TABLE IF NOT EXISTS public.fulfillment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Assignment can be by program, product, or device category
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  device_category TEXT,
  
  -- The repairer assigned as fulfillment partner
  repairer_id UUID NOT NULL,
  repairer_name TEXT NOT NULL,
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Ensure only one type of assignment per row
  CONSTRAINT check_assignment_type CHECK (
    (program_id IS NOT NULL AND product_id IS NULL AND device_category IS NULL) OR
    (program_id IS NULL AND product_id IS NOT NULL AND device_category IS NULL) OR
    (program_id IS NULL AND product_id IS NULL AND device_category IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.fulfillment_assignments ENABLE ROW LEVEL SECURITY;

-- System admins can manage fulfillment assignments
CREATE POLICY "System admins can manage fulfillment assignments"
ON public.fulfillment_assignments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'system_admin'::app_role
  )
);

-- Anyone can view active assignments (for lookup during claims)
CREATE POLICY "Anyone can view active fulfillment assignments"
ON public.fulfillment_assignments
FOR SELECT
TO authenticated
USING (is_active = true);

-- Add updated_at trigger
CREATE TRIGGER update_fulfillment_assignments_updated_at
BEFORE UPDATE ON public.fulfillment_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_fulfillment_assignments_program ON public.fulfillment_assignments(program_id) WHERE program_id IS NOT NULL;
CREATE INDEX idx_fulfillment_assignments_product ON public.fulfillment_assignments(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_fulfillment_assignments_device_category ON public.fulfillment_assignments(device_category) WHERE device_category IS NOT NULL;