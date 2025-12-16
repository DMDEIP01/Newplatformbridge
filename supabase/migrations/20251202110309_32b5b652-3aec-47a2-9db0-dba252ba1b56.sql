-- Add pending_fulfillment to claim_status enum
ALTER TYPE claim_status ADD VALUE IF NOT EXISTS 'pending_fulfillment';