-- Add product_id column to products table
ALTER TABLE public.products ADD COLUMN product_id TEXT;

-- Generate product_ids for existing products using a DO block
DO $$
DECLARE
  product_record RECORD;
  counter INTEGER := 1;
BEGIN
  FOR product_record IN 
    SELECT id FROM public.products ORDER BY created_at
  LOOP
    UPDATE public.products 
    SET product_id = 'PRD-' || LPAD(counter::TEXT, 6, '0')
    WHERE id = product_record.id;
    counter := counter + 1;
  END LOOP;
END $$;

-- Make product_id NOT NULL and unique
ALTER TABLE public.products 
  ALTER COLUMN product_id SET NOT NULL,
  ADD CONSTRAINT products_product_id_key UNIQUE (product_id);

-- Create function to auto-generate product_id for new products
CREATE OR REPLACE FUNCTION public.generate_product_id()
RETURNS TRIGGER AS $$
DECLARE
  next_id INTEGER;
  new_product_id TEXT;
BEGIN
  -- Get the next sequential number
  SELECT COALESCE(MAX(SUBSTRING(product_id FROM 'PRD-(\d+)')::INTEGER), 0) + 1
  INTO next_id
  FROM public.products;
  
  -- Generate the new product_id
  new_product_id := 'PRD-' || LPAD(next_id::TEXT, 6, '0');
  
  -- Assign it to the new row
  NEW.product_id := new_product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-generate product_id
CREATE TRIGGER generate_product_id_trigger
BEFORE INSERT ON public.products
FOR EACH ROW
WHEN (NEW.product_id IS NULL)
EXECUTE FUNCTION public.generate_product_id();

-- Create promotions table
CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code TEXT NOT NULL UNIQUE,
  promo_name TEXT NOT NULL,
  promo_type TEXT NOT NULL CHECK (promo_type IN ('percentage_discount', 'fixed_discount', 'free_months', 'voucher')),
  discount_value NUMERIC,
  free_months INTEGER,
  voucher_value NUMERIC,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  terms_conditions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on promotions
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- System admins can manage promotions
CREATE POLICY "System admins can manage promotions"
ON public.promotions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'system_admin'::app_role
  )
);

-- Anyone can view active promotions
CREATE POLICY "Anyone can view active promotions"
ON public.promotions
FOR SELECT
USING (is_active = true);

-- Create product_promotions junction table
CREATE TABLE public.product_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, promotion_id)
);

-- Enable RLS on product_promotions
ALTER TABLE public.product_promotions ENABLE ROW LEVEL SECURITY;

-- System admins can manage product promotions
CREATE POLICY "System admins can manage product promotions"
ON public.product_promotions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'system_admin'::app_role
  )
);

-- Anyone can view active product promotions
CREATE POLICY "Anyone can view active product promotions"
ON public.product_promotions
FOR SELECT
USING (is_active = true);

-- Add updated_at trigger to promotions
CREATE TRIGGER update_promotions_updated_at
BEFORE UPDATE ON public.promotions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();