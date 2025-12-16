-- Add repairer_agent to the app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'repairer_agent';