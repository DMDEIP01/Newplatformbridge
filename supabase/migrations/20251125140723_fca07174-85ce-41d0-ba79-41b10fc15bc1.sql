-- Fix search_path for functions to address security warnings

-- Update assign_all_templates_to_product function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update assign_template_to_all_products function
CREATE OR REPLACE FUNCTION public.assign_template_to_all_products()
RETURNS TRIGGER AS $$
BEGIN
  -- Assign the new template to all existing products
  INSERT INTO public.product_communication_templates (product_id, template_id, is_active)
  SELECT id, NEW.id, true
  FROM public.products;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;