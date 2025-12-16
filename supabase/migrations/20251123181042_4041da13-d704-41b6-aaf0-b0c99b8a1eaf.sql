-- Add new claim status for pending more information
ALTER TYPE claim_status ADD VALUE IF NOT EXISTS 'referred_pending_info';

-- Update the RaiseServiceRequestDialog component will handle updating claim status