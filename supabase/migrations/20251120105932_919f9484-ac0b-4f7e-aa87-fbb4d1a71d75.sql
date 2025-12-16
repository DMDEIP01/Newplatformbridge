-- Create repairer_slas table to track SLA metrics per repairer per device category
CREATE TABLE IF NOT EXISTS public.repairer_slas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repairer_id UUID NOT NULL REFERENCES public.repairers(id) ON DELETE CASCADE,
  device_category TEXT NOT NULL,
  response_time_hours INTEGER NOT NULL DEFAULT 24,
  repair_time_hours INTEGER NOT NULL DEFAULT 72,
  availability_hours TEXT DEFAULT '9am-5pm Mon-Fri',
  quality_score DECIMAL(3,2) DEFAULT 0.00 CHECK (quality_score >= 0 AND quality_score <= 5.00),
  success_rate DECIMAL(5,2) DEFAULT 0.00 CHECK (success_rate >= 0 AND success_rate <= 100.00),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(repairer_id, device_category)
);

-- Enable RLS
ALTER TABLE public.repairer_slas ENABLE ROW LEVEL SECURITY;

-- Anyone can view SLAs
CREATE POLICY "Anyone can view active repairer SLAs"
  ON public.repairer_slas
  FOR SELECT
  USING (true);

-- System admins can manage SLAs
CREATE POLICY "System admins can manage repairer SLAs"
  ON public.repairer_slas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'system_admin'
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_repairer_slas_updated_at
  BEFORE UPDATE ON public.repairer_slas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_repairer_slas_repairer_category ON public.repairer_slas(repairer_id, device_category);
CREATE INDEX idx_repairer_slas_category ON public.repairer_slas(device_category);