-- Add missing roles to app_role enum for retail and claims agents
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'retail_agent') THEN
    ALTER TYPE public.app_role ADD VALUE 'retail_agent';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'app_role' AND e.enumlabel = 'claims_agent') THEN
    ALTER TYPE public.app_role ADD VALUE 'claims_agent';
  END IF;
END $$;