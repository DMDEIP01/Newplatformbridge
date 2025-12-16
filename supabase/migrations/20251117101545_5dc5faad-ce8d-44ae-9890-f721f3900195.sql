-- Add system_admin role to app_role enum
-- This must be in its own transaction
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'system_admin';