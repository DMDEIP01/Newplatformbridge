-- Add manufacturer warranty months to device_categories (category-level default)
ALTER TABLE public.device_categories
ADD COLUMN manufacturer_warranty_months integer NOT NULL DEFAULT 12;

-- Add manufacturer warranty months to devices (model-level override)
ALTER TABLE public.devices
ADD COLUMN manufacturer_warranty_months integer;

COMMENT ON COLUMN public.device_categories.manufacturer_warranty_months IS 'Default manufacturer warranty period in months for this category';
COMMENT ON COLUMN public.devices.manufacturer_warranty_months IS 'Override manufacturer warranty period in months for this specific model (null uses category default)';