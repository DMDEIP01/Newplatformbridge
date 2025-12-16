-- Create enum for retail portal sections
CREATE TYPE public.retail_portal_section AS ENUM (
  'dashboard',
  'sales',
  'policy_search',
  'make_claim',
  'claims',
  'claims_management',
  'complaints_management',
  'repairer_jobs',
  'service_request',
  'reports',
  'consultants'
);

-- Create table for user program section permissions
CREATE TABLE public.user_program_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  allowed_sections retail_portal_section[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, program_id)
);

-- Enable RLS
ALTER TABLE public.user_program_permissions ENABLE ROW LEVEL SECURITY;

-- System admins can manage all permissions
CREATE POLICY "System admins can manage permissions"
ON public.user_program_permissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'system_admin'
  )
);

-- Users can view their own permissions
CREATE POLICY "Users can view own permissions"
ON public.user_program_permissions
FOR SELECT
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_program_permissions_updated_at
BEFORE UPDATE ON public.user_program_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_user_program_permissions_user_program 
ON public.user_program_permissions(user_id, program_id);

-- Create helper function to check if user has access to a section in a program
CREATE OR REPLACE FUNCTION public.has_section_access(
  _user_id UUID,
  _program_id UUID,
  _section retail_portal_section
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_program_permissions
    WHERE user_id = _user_id
    AND program_id = _program_id
    AND _section = ANY(allowed_sections)
  )
$$;