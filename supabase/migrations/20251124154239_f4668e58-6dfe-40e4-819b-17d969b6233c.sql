-- Add new claim statuses to support the complete claims journey
-- Current statuses: notified, accepted, rejected, referred, inbound_logistics, repair, outbound_logistics, closed, referred_pending_info
-- Adding: excess_due, excess_paid_fulfillment_pending, fulfillment_inspection_booked, estimate_received, fulfillment_outcome, referred_info_received

-- Add new statuses to the claim_status enum
ALTER TYPE claim_status ADD VALUE IF NOT EXISTS 'excess_due';
ALTER TYPE claim_status ADD VALUE IF NOT EXISTS 'excess_paid_fulfillment_pending';
ALTER TYPE claim_status ADD VALUE IF NOT EXISTS 'fulfillment_inspection_booked';
ALTER TYPE claim_status ADD VALUE IF NOT EXISTS 'estimate_received';
ALTER TYPE claim_status ADD VALUE IF NOT EXISTS 'fulfillment_outcome';
ALTER TYPE claim_status ADD VALUE IF NOT EXISTS 'referred_info_received';