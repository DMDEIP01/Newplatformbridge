-- Create product communication templates junction table
CREATE TABLE IF NOT EXISTS public.product_communication_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.communication_templates(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, template_id)
);

-- Enable RLS
ALTER TABLE public.product_communication_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "System admins can manage product template assignments"
  ON public.product_communication_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'system_admin'
    )
  );

CREATE POLICY "Anyone can view active product template assignments"
  ON public.product_communication_templates
  FOR SELECT
  USING (is_active = true);

-- Create trigger to update updated_at
CREATE TRIGGER update_product_communication_templates_updated_at
  BEFORE UPDATE ON public.product_communication_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to assign all templates to a new product
CREATE OR REPLACE FUNCTION public.assign_all_templates_to_product()
RETURNS TRIGGER AS $$
BEGIN
  -- Assign all existing active templates to the new product
  INSERT INTO public.product_communication_templates (product_id, template_id, is_active)
  SELECT NEW.id, id, true
  FROM public.communication_templates
  WHERE is_active = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-assign templates to new products
CREATE TRIGGER assign_templates_to_new_product
  AFTER INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_all_templates_to_product();

-- Function to assign new template to all products
CREATE OR REPLACE FUNCTION public.assign_template_to_all_products()
RETURNS TRIGGER AS $$
BEGIN
  -- Assign the new template to all existing products
  INSERT INTO public.product_communication_templates (product_id, template_id, is_active)
  SELECT id, NEW.id, true
  FROM public.products;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-assign new templates to all products
CREATE TRIGGER assign_new_template_to_products
  AFTER INSERT ON public.communication_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_template_to_all_products();

-- Backfill existing data: assign all existing templates to all existing products
INSERT INTO public.product_communication_templates (product_id, template_id, is_active)
SELECT p.id, t.id, true
FROM public.products p
CROSS JOIN public.communication_templates t
ON CONFLICT (product_id, template_id) DO NOTHING;