-- Step 1: Add complaints_agent role to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'complaints_agent';