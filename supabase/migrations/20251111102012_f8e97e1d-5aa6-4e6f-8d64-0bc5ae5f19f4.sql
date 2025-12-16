-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'consultant', 'customer');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
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
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Add consultant_id to policies table to track who sold it
ALTER TABLE public.policies
ADD COLUMN consultant_id uuid REFERENCES auth.users(id);

-- Add consultant_id to claims table for tracking
ALTER TABLE public.claims
ADD COLUMN consultant_id uuid REFERENCES auth.users(id);

-- Update policies RLS to allow consultants to view all policies
CREATE POLICY "Consultants can view all policies"
ON public.policies
FOR SELECT
USING (public.has_role(auth.uid(), 'consultant') OR public.has_role(auth.uid(), 'admin'));

-- Update claims RLS to allow consultants to view and manage all claims
CREATE POLICY "Consultants can view all claims"
ON public.claims
FOR SELECT
USING (public.has_role(auth.uid(), 'consultant') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Consultants can update all claims"
ON public.claims
FOR UPDATE
USING (public.has_role(auth.uid(), 'consultant') OR public.has_role(auth.uid(), 'admin'));

-- Create sales_stats view for reporting
CREATE OR REPLACE VIEW public.sales_stats AS
SELECT 
    p.consultant_id,
    pr.full_name as consultant_name,
    COUNT(p.id) as total_policies_sold,
    SUM(prod.monthly_premium) as total_premium_value,
    COUNT(CASE WHEN p.status = 'active' THEN 1 END) as active_policies,
    DATE_TRUNC('month', p.created_at) as sale_month
FROM public.policies p
LEFT JOIN public.profiles pr ON p.consultant_id = pr.id
LEFT JOIN public.products prod ON p.product_id = prod.id
WHERE p.consultant_id IS NOT NULL
GROUP BY p.consultant_id, pr.full_name, DATE_TRUNC('month', p.created_at);

-- Allow consultants and admins to view sales stats
CREATE POLICY "Consultants can view sales stats"
ON public.policies
FOR SELECT
USING (public.has_role(auth.uid(), 'consultant') OR public.has_role(auth.uid(), 'admin'));