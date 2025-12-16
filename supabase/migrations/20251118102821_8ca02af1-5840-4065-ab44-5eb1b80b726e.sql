-- Add unique constraint to external_reference for upsert functionality
ALTER TABLE public.devices ADD CONSTRAINT devices_external_reference_key UNIQUE (external_reference);