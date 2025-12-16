-- Add connectivity_type to repairers table
ALTER TABLE public.repairers
ADD COLUMN connectivity_type text CHECK (connectivity_type IN ('Portal', 'API', 'SFTP'));

COMMENT ON COLUMN public.repairers.connectivity_type IS 'Integration method: Portal (web-based), API (REST/SOAP), or SFTP (file transfer)';