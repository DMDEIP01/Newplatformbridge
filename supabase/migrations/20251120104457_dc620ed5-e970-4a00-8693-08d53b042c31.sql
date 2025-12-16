-- Update connectivity_type constraint with new options
ALTER TABLE public.repairers
DROP CONSTRAINT IF EXISTS repairers_connectivity_type_check;

ALTER TABLE public.repairers
ADD CONSTRAINT repairers_connectivity_type_check 
CHECK (connectivity_type IN ('EIP API', 'EIP SFTP', 'EIP Portal', 'Repairer API', 'Repairer SFTP'));

COMMENT ON COLUMN public.repairers.connectivity_type IS 'Integration method: EIP API, EIP SFTP, EIP Portal (EIP-managed), Repairer API, Repairer SFTP (Repairer-managed)';