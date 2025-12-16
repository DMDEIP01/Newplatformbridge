-- Create programs table
CREATE TABLE public.programs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  settings jsonb DEFAULT '{}'::jsonb,
  data_isolation_enabled boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

-- System admins can manage all programs
CREATE POLICY "System admins can manage programs"
ON public.programs
FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Create program_products junction table
CREATE TABLE public.program_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(program_id, product_id)
);

ALTER TABLE public.program_products ENABLE ROW LEVEL SECURITY;

-- System admins can manage program products
CREATE POLICY "System admins can manage program products"
ON public.program_products
FOR ALL
USING (has_role(auth.uid(), 'system_admin'::app_role));

-- Anyone can view active program products
CREATE POLICY "Anyone can view active program products"
ON public.program_products
FOR SELECT
USING (is_active = true);

-- Add program_id to user_roles table
ALTER TABLE public.user_roles
ADD COLUMN program_id uuid REFERENCES public.programs(id) ON DELETE CASCADE;

-- Add program_id to policies table
ALTER TABLE public.policies
ADD COLUMN program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_policies_program_id ON public.policies(program_id);
CREATE INDEX idx_user_roles_program_id ON public.user_roles(program_id);

-- Update has_role function to support program-specific roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role, _program_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (_program_id IS NULL OR program_id = _program_id OR program_id IS NULL)
  )
$$;

-- Update timestamp trigger for programs
CREATE TRIGGER update_programs_updated_at
BEFORE UPDATE ON public.programs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.programs IS 'Programs represent separate instances/implementations of the system with their own products and settings';
COMMENT ON COLUMN public.programs.data_isolation_enabled IS 'When true, program data (policies, claims) are isolated from other programs';
COMMENT ON TABLE public.program_products IS 'Junction table allowing products to be shared across multiple programs';
COMMENT ON COLUMN public.user_roles.program_id IS 'When set, the role is specific to this program. NULL means role applies to all programs';