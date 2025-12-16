-- Add new roles to the app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'commercial_agent';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'backoffice_agent';