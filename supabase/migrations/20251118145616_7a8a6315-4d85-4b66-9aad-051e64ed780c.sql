-- Create perils table for centralized peril management
CREATE TABLE IF NOT EXISTS public.perils (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  rejection_terms JSONB DEFAULT '[]'::jsonb,
  acceptance_logic JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.perils ENABLE ROW LEVEL SECURITY;

-- Anyone can view active perils
CREATE POLICY "Anyone can view active perils" 
ON public.perils 
FOR SELECT 
USING (is_active = true);

-- System admins can manage perils
CREATE POLICY "System admins can manage perils" 
ON public.perils 
FOR ALL 
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'system_admin'
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_perils_updated_at
BEFORE UPDATE ON public.perils
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.perils IS 'Centralized peril configurations with rejection terms and acceptance logic';