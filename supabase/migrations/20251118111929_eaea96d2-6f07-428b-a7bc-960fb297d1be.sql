-- Create user_groups table
CREATE TABLE public.user_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create user_group_permissions table (links groups to programs with sections)
CREATE TABLE public.user_group_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.user_groups(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  allowed_sections retail_portal_section[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, program_id)
);

-- Create user_group_members table (links users to groups)
CREATE TABLE public.user_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.user_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, group_id)
);

-- Enable RLS
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_group_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_group_members ENABLE ROW LEVEL SECURITY;

-- System admins can manage all user groups
CREATE POLICY "System admins can manage user groups"
ON public.user_groups
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'system_admin'
  )
);

-- System admins can manage group permissions
CREATE POLICY "System admins can manage group permissions"
ON public.user_group_permissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'system_admin'
  )
);

-- System admins can manage group members
CREATE POLICY "System admins can manage group members"
ON public.user_group_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'system_admin'
  )
);

-- Users can view their own group memberships
CREATE POLICY "Users can view own group memberships"
ON public.user_group_members
FOR SELECT
USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_user_groups_updated_at
BEFORE UPDATE ON public.user_groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_group_permissions_updated_at
BEFORE UPDATE ON public.user_group_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for faster lookups
CREATE INDEX idx_user_group_permissions_group_program 
ON public.user_group_permissions(group_id, program_id);

CREATE INDEX idx_user_group_members_user 
ON public.user_group_members(user_id);

CREATE INDEX idx_user_group_members_group 
ON public.user_group_members(group_id);