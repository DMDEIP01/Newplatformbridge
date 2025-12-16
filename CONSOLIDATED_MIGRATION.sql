-- ============================================================================
-- CONSOLIDATED SUPABASE MIGRATION
-- Insurance/Warranty Management Platform
-- 
-- Run this entire file in your Supabase SQL Editor to set up the complete
-- database schema, functions, triggers, RLS policies, and storage buckets.
-- ============================================================================

-- ============================================================================
-- PART 1: EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- ============================================================================
-- PART 2: ENUMS
-- ============================================================================

CREATE TYPE public.app_role AS ENUM (
  'admin',
  'consultant',
  'retail_agent',
  'claims_agent',
  'complaints_agent',
  'repairer_agent',
  'system_admin',
  'backoffice_agent',
  'commercial_agent'
);

CREATE TYPE public.claim_status AS ENUM (
  'notified',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'in_progress',
  'completed',
  'closed',
  'awaiting_information',
  'awaiting_parts',
  'scheduled',
  'cancelled'
);

CREATE TYPE public.claim_type AS ENUM (
  'breakdown',
  'accidental_damage',
  'theft',
  'liquid_damage',
  'screen_damage',
  'battery_replacement',
  'other'
);

CREATE TYPE public.complaint_reason AS ENUM (
  'service_quality',
  'claim_handling',
  'policy_terms',
  'billing',
  'communication',
  'staff_behavior',
  'wait_time',
  'other'
);

CREATE TYPE public.document_type AS ENUM (
  'receipt',
  'photo',
  'policy',
  'claim',
  'other'
);

CREATE TYPE public.document_subtype AS ENUM (
  'policy_schedule',
  'terms_conditions',
  'welcome_letter',
  'claim_receipt',
  'claim_photo',
  'claim_evidence',
  'repairer_report',
  'other'
);

CREATE TYPE public.payment_status AS ENUM (
  'pending',
  'completed',
  'failed',
  'refunded'
);

CREATE TYPE public.payment_type AS ENUM (
  'premium',
  'excess',
  'refund',
  'settlement'
);

CREATE TYPE public.policy_status AS ENUM (
  'active',
  'expired',
  'cancelled',
  'pending',
  'suspended'
);

CREATE TYPE public.retail_portal_section AS ENUM (
  'dashboard',
  'policy_search',
  'sales',
  'claims',
  'complaints',
  'reports',
  'service_requests'
);

-- ============================================================================
-- PART 3: SEQUENCES
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS public.policy_number_ew_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.policy_number_il_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.policy_number_im_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.claim_number_ew_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.claim_number_il_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.claim_number_im_seq START 1;

-- ============================================================================
-- PART 4: CORE TABLES
-- ============================================================================

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  postcode TEXT,
  repairer_id UUID,
  must_change_password BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  program_id UUID,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- User groups
CREATE TABLE public.user_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- User group members
CREATE TABLE public.user_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  group_id UUID NOT NULL REFERENCES public.user_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- User PINs
CREATE TABLE public.user_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  must_change_pin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User preferences
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  payment_email_reminder BOOLEAN DEFAULT true,
  payment_sms_reminder BOOLEAN DEFAULT false,
  payment_reminder_days INTEGER DEFAULT 7,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Programs
CREATE TABLE public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  reference_formats JSONB DEFAULT '{"claim_number": {"format": "{product_prefix}-{sequence:6}", "description": "Claim number format"}, "policy_number": {"format": "{product_prefix}-{sequence:6}", "description": "Policy number format"}}'::jsonb,
  data_isolation_enabled BOOLEAN DEFAULT true NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- User program permissions
CREATE TABLE public.user_program_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  allowed_sections public.retail_portal_section[] DEFAULT '{}'::public.retail_portal_section[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- User group permissions
CREATE TABLE public.user_group_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.user_groups(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  allowed_sections public.retail_portal_section[] DEFAULT '{}'::public.retail_portal_section[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  product_name_external TEXT,
  type TEXT DEFAULT 'warranty' NOT NULL,
  tier INTEGER DEFAULT 1 NOT NULL,
  monthly_premium NUMERIC NOT NULL,
  premium_frequency TEXT,
  coverage TEXT[] NOT NULL,
  excess_1 NUMERIC NOT NULL,
  excess_2 NUMERIC,
  rrp_min NUMERIC NOT NULL,
  rrp_max NUMERIC,
  store_commission NUMERIC DEFAULT 0 NOT NULL,
  promotion TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  link_code TEXT,
  device_categories TEXT[],
  perils TEXT[],
  peril_details JSONB,
  policy_term_years INTEGER,
  payment_types TEXT[],
  fulfillment_method TEXT,
  eligibility_rules JSONB,
  validity_rules JSONB,
  renewal_rules JSONB,
  product_parameters JSONB,
  voucher_options TEXT[],
  tax_name TEXT,
  tax_type TEXT,
  tax_value NUMERIC,
  tax_value_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Program products
CREATE TABLE public.program_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(program_id, product_id)
);

-- Promotions
CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code TEXT NOT NULL UNIQUE,
  promo_name TEXT NOT NULL,
  promo_type TEXT NOT NULL,
  description TEXT,
  discount_value NUMERIC,
  free_months INTEGER,
  voucher_value NUMERIC,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0 NOT NULL,
  terms_conditions TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Product promotions
CREATE TABLE public.product_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(product_id, promotion_id)
);

-- Perils
CREATE TABLE public.perils (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  acceptance_logic JSONB,
  rejection_terms JSONB,
  evidence_requirements JSONB,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Policies
CREATE TABLE public.policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id),
  program_id UUID REFERENCES public.programs(id),
  promotion_id UUID REFERENCES public.promotions(id),
  status public.policy_status DEFAULT 'active' NOT NULL,
  start_date TIMESTAMPTZ DEFAULT now() NOT NULL,
  renewal_date TIMESTAMPTZ NOT NULL,
  original_premium NUMERIC,
  promotional_premium NUMERIC,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  customer_address_line1 TEXT,
  customer_address_line2 TEXT,
  customer_city TEXT,
  customer_postcode TEXT,
  consultant_id UUID,
  notes TEXT,
  cancellation_reason TEXT,
  cancellation_details TEXT,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Covered items
CREATE TABLE public.covered_items (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE UNIQUE,
  product_name TEXT NOT NULL,
  model TEXT,
  serial_number TEXT,
  purchase_price NUMERIC,
  purchase_date DATE,
  added_date DATE DEFAULT CURRENT_DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Claims
CREATE TABLE public.claims (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  claim_number TEXT NOT NULL UNIQUE,
  policy_id UUID NOT NULL REFERENCES public.policies(id),
  user_id UUID NOT NULL,
  consultant_id UUID,
  claim_type public.claim_type NOT NULL,
  description TEXT NOT NULL,
  product_condition TEXT,
  status public.claim_status DEFAULT 'notified' NOT NULL,
  has_receipt BOOLEAN DEFAULT false NOT NULL,
  decision TEXT,
  decision_reason TEXT,
  submitted_date TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Claim status history
CREATE TABLE public.claim_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  status public.claim_status NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Claim fulfillment
CREATE TABLE public.claim_fulfillment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE UNIQUE,
  fulfillment_type TEXT,
  status TEXT DEFAULT 'pending_excess' NOT NULL,
  excess_paid BOOLEAN DEFAULT false NOT NULL,
  excess_amount NUMERIC,
  excess_payment_date TIMESTAMPTZ,
  excess_payment_method TEXT,
  device_value NUMERIC,
  appointment_date TIMESTAMPTZ,
  appointment_slot TEXT,
  logistics_reference TEXT,
  engineer_reference TEXT,
  repairer_id UUID,
  quote_amount NUMERIC,
  quote_status TEXT,
  quote_rejection_reason TEXT,
  repair_scheduled_date TIMESTAMPTZ,
  repair_scheduled_slot TEXT,
  repair_outcome TEXT,
  ber_reason TEXT,
  inspection_notes TEXT,
  inspection_photos TEXT[],
  repairer_report TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Repairers
CREATE TABLE public.repairers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  postcode TEXT,
  country TEXT,
  coverage_areas TEXT[],
  specializations TEXT[],
  connectivity_type TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add foreign key for repairer_id in profiles
ALTER TABLE public.profiles ADD CONSTRAINT profiles_repairer_id_fkey 
  FOREIGN KEY (repairer_id) REFERENCES public.repairers(id);

-- Add foreign key for repairer_id in claim_fulfillment
ALTER TABLE public.claim_fulfillment ADD CONSTRAINT claim_fulfillment_repairer_id_fkey 
  FOREIGN KEY (repairer_id) REFERENCES public.repairers(id);

-- Repairer SLAs
CREATE TABLE public.repairer_slas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repairer_id UUID NOT NULL REFERENCES public.repairers(id) ON DELETE CASCADE,
  device_category TEXT NOT NULL,
  response_time_hours INTEGER DEFAULT 24 NOT NULL,
  repair_time_hours INTEGER DEFAULT 72 NOT NULL,
  quality_score NUMERIC DEFAULT 0.00,
  success_rate NUMERIC DEFAULT 0.00,
  availability_hours TEXT DEFAULT '9am-5pm Mon-Fri',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(repairer_id, device_category)
);

-- Repair costs
CREATE TABLE public.repair_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.claims(id),
  fulfillment_id UUID NOT NULL REFERENCES public.claim_fulfillment(id),
  cost_type TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  units INTEGER DEFAULT 1 NOT NULL,
  added_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fulfillment assignments
CREATE TABLE public.fulfillment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_ids UUID[],
  product_id UUID REFERENCES public.products(id),
  device_category TEXT,
  manufacturer TEXT,
  model_name TEXT,
  repairer_id UUID REFERENCES public.repairers(id),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Claims SLA
CREATE TABLE public.claims_sla (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_status public.claim_status NOT NULL,
  sla_hours INTEGER NOT NULL,
  description TEXT,
  program_id UUID REFERENCES public.programs(id),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Complaints
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_reference TEXT NOT NULL UNIQUE DEFAULT generate_complaint_reference(),
  user_id UUID NOT NULL,
  policy_id UUID REFERENCES public.policies(id),
  reason public.complaint_reason NOT NULL,
  complaint_type TEXT,
  classification TEXT,
  details TEXT NOT NULL,
  status TEXT DEFAULT 'submitted' NOT NULL,
  response TEXT,
  response_date TIMESTAMPTZ,
  customer_name TEXT,
  customer_email TEXT,
  assigned_to UUID,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Complaint activity log
CREATE TABLE public.complaint_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_details TEXT,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Service requests
CREATE TABLE public.service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_reference TEXT NOT NULL UNIQUE DEFAULT generate_service_request_reference(),
  policy_id UUID REFERENCES public.policies(id),
  claim_id UUID REFERENCES public.claims(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT NOT NULL,
  department TEXT,
  status TEXT DEFAULT 'open' NOT NULL,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_by UUID,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Service request messages
CREATE TABLE public.service_request_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  read_by_agent BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Documents
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL,
  policy_id UUID REFERENCES public.policies(id),
  claim_id UUID REFERENCES public.claims(id),
  service_request_id UUID REFERENCES public.service_requests(id),
  document_type public.document_type NOT NULL,
  document_subtype public.document_subtype DEFAULT 'other',
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  uploaded_date TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id UUID NOT NULL,
  policy_id UUID REFERENCES public.policies(id),
  claim_id UUID REFERENCES public.claims(id),
  payment_type public.payment_type NOT NULL,
  amount NUMERIC NOT NULL,
  status public.payment_status DEFAULT 'pending' NOT NULL,
  reference_number TEXT NOT NULL,
  payment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Policy communications
CREATE TABLE public.policy_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES public.policies(id),
  claim_id UUID REFERENCES public.claims(id),
  complaint_id UUID REFERENCES public.complaints(id),
  communication_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  message_body TEXT NOT NULL,
  status TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Policy change history
CREATE TABLE public.policy_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES public.policies(id),
  user_id UUID NOT NULL,
  change_type TEXT NOT NULL,
  old_product_id UUID NOT NULL REFERENCES public.products(id),
  new_product_id UUID NOT NULL REFERENCES public.products(id),
  old_premium NUMERIC NOT NULL,
  new_premium NUMERIC NOT NULL,
  premium_difference NUMERIC NOT NULL,
  reason TEXT,
  changed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Policy action history
CREATE TABLE public.policy_action_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES public.policies(id),
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Communication templates
CREATE TABLE public.communication_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  subject TEXT NOT NULL,
  message_body TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Product communication templates
CREATE TABLE public.product_communication_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.communication_templates(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(product_id, template_id)
);

-- Product document templates
CREATE TABLE public.product_document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  document_subtype TEXT NOT NULL,
  template_content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Devices
CREATE TABLE public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_category TEXT NOT NULL,
  manufacturer TEXT NOT NULL,
  model_name TEXT NOT NULL,
  rrp NUMERIC NOT NULL,
  external_reference TEXT,
  manufacturer_warranty_months INTEGER,
  trade_in_faulty NUMERIC,
  refurb_buy NUMERIC,
  price_expiry DATE,
  include_in_promos BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Device categories
CREATE TABLE public.device_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  manufacturer_warranty_months INTEGER DEFAULT 12 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ============================================================================
-- PART 5: DATABASE FUNCTIONS
-- ============================================================================

-- Generate service request reference
CREATE OR REPLACE FUNCTION public.generate_service_request_reference()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  ref_number TEXT;
BEGIN
  ref_number := 'SR-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  RETURN ref_number;
END;
$$;

-- Generate complaint reference
CREATE OR REPLACE FUNCTION public.generate_complaint_reference()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  ref_number TEXT;
BEGIN
  ref_number := 'CMP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  RETURN ref_number;
END;
$$;

-- Has role function (with program_id)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role, _program_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (_program_id IS NULL OR program_id = _program_id OR program_id IS NULL)
  )
$$;

-- Has section access
CREATE OR REPLACE FUNCTION public.has_section_access(_user_id UUID, _program_id UUID, _section retail_portal_section)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_program_permissions
    WHERE user_id = _user_id
    AND program_id = _program_id
    AND _section = ANY(allowed_sections)
  )
$$;

-- Get product prefix
CREATE OR REPLACE FUNCTION public.get_product_prefix(product_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF product_name ILIKE '%extended%warranty%' OR product_name ILIKE '%EW%' THEN
    RETURN 'EW';
  ELSIF product_name ILIKE '%insurance%lite%' OR product_name ILIKE '%IL%' THEN
    RETURN 'IL';
  ELSIF product_name ILIKE '%insurance%max%' OR product_name ILIKE '%IM%' THEN
    RETURN 'IM';
  ELSE
    RETURN 'EW';
  END IF;
END;
$$;

-- Generate policy number
CREATE OR REPLACE FUNCTION public.generate_policy_number(product_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  prefix TEXT;
  seq_val INTEGER;
  new_number TEXT;
BEGIN
  prefix := get_product_prefix(product_name);
  
  IF prefix = 'EW' THEN
    seq_val := nextval('policy_number_ew_seq');
  ELSIF prefix = 'IL' THEN
    seq_val := nextval('policy_number_il_seq');
  ELSIF prefix = 'IM' THEN
    seq_val := nextval('policy_number_im_seq');
  ELSE
    seq_val := nextval('policy_number_ew_seq');
  END IF;
  
  new_number := prefix || '-' || LPAD(seq_val::TEXT, 6, '0');
  RETURN new_number;
END;
$$;

-- Generate claim number
CREATE OR REPLACE FUNCTION public.generate_claim_number(product_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  prefix TEXT;
  seq_val INTEGER;
  new_number TEXT;
BEGIN
  prefix := get_product_prefix(product_name);
  
  IF prefix = 'EW' THEN
    seq_val := nextval('claim_number_ew_seq');
  ELSIF prefix = 'IL' THEN
    seq_val := nextval('claim_number_il_seq');
  ELSIF prefix = 'IM' THEN
    seq_val := nextval('claim_number_im_seq');
  ELSE
    seq_val := nextval('claim_number_ew_seq');
  END IF;
  
  new_number := prefix || 'CL-' || LPAD(seq_val::TEXT, 5, '0');
  RETURN new_number;
END;
$$;

-- Generate product ID trigger function
CREATE OR REPLACE FUNCTION public.generate_product_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  next_id INTEGER;
  new_product_id TEXT;
BEGIN
  SELECT COALESCE(MAX(SUBSTRING(product_id FROM 'PRD-(\d+)')::INTEGER), 0) + 1
  INTO next_id
  FROM public.products;
  
  new_product_id := 'PRD-' || LPAD(next_id::TEXT, 6, '0');
  NEW.product_id := new_product_id;
  
  RETURN NEW;
END;
$$;

-- Update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email
  );
  
  UPDATE public.policies
  SET user_id = NEW.id
  WHERE customer_email ILIKE NEW.email
    AND user_id != NEW.id;
  
  RETURN NEW;
END;
$$;

-- Link policy to existing user
CREATE OR REPLACE FUNCTION public.link_policy_to_existing_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  matching_user_id UUID;
BEGIN
  SELECT id INTO matching_user_id
  FROM public.profiles
  WHERE email ILIKE NEW.customer_email
  LIMIT 1;
  
  IF matching_user_id IS NOT NULL THEN
    NEW.user_id := matching_user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Set policy program
CREATE OR REPLACE FUNCTION public.set_policy_program()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  product_program_id UUID;
BEGIN
  SELECT pp.program_id INTO product_program_id
  FROM public.program_products pp
  WHERE pp.product_id = NEW.product_id
    AND pp.is_active = true
  LIMIT 1;
  
  IF product_program_id IS NOT NULL THEN
    NEW.program_id := product_program_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update service request activity
CREATE OR REPLACE FUNCTION public.update_service_request_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.service_requests
  SET last_activity_at = NEW.created_at
  WHERE id = NEW.service_request_id;
  RETURN NEW;
END;
$$;

-- Verify PIN
CREATE OR REPLACE FUNCTION public.verify_pin(user_id UUID, pin_attempt TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT pin_hash INTO stored_hash
  FROM user_pins
  WHERE user_pins.user_id = verify_pin.user_id;
  
  IF stored_hash IS NOT NULL THEN
    RETURN (stored_hash = extensions.crypt(pin_attempt, stored_hash));
  END IF;
  
  RETURN false;
END;
$$;

-- Get program consultants
CREATE OR REPLACE FUNCTION public.get_program_consultants(target_program_id UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  role app_role,
  program_id UUID,
  created_at TIMESTAMPTZ,
  full_name TEXT,
  email TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    ur.id,
    ur.user_id,
    ur.role,
    ur.program_id,
    ur.created_at,
    p.full_name,
    p.email
  FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'consultant'
    AND (target_program_id IS NULL OR ur.program_id = target_program_id)
    AND public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid);
$$;

-- Assign template to all products
CREATE OR REPLACE FUNCTION public.assign_template_to_all_products()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.product_communication_templates (product_id, template_id, is_active)
  SELECT id, NEW.id, true
  FROM public.products;
  
  RETURN NEW;
END;
$$;

-- Assign all templates to product
CREATE OR REPLACE FUNCTION public.assign_all_templates_to_product()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.product_communication_templates (product_id, template_id, is_active)
  SELECT NEW.id, id, true
  FROM public.communication_templates
  WHERE is_active = true;
  
  RETURN NEW;
END;
$$;

-- Generate policy documents from templates
CREATE OR REPLACE FUNCTION public.generate_policy_documents_from_templates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  template_record RECORD;
  generated_content TEXT;
  file_name TEXT;
BEGIN
  FOR template_record IN
    SELECT * FROM public.product_document_templates
    WHERE product_id = NEW.product_id
    AND is_active = true
  LOOP
    generated_content := template_record.template_content;
    generated_content := REPLACE(generated_content, '{policy_number}', NEW.policy_number);
    generated_content := REPLACE(generated_content, '{start_date}', TO_CHAR(NEW.start_date, 'DD/MM/YYYY'));
    generated_content := REPLACE(generated_content, '{renewal_date}', TO_CHAR(NEW.renewal_date, 'DD/MM/YYYY'));
    generated_content := REPLACE(generated_content, '{customer_name}', COALESCE(NEW.customer_name, ''));
    generated_content := REPLACE(generated_content, '{customer_email}', COALESCE(NEW.customer_email, ''));
    generated_content := REPLACE(generated_content, '{customer_address}', COALESCE(NEW.customer_address_line1 || ' ' || COALESCE(NEW.customer_address_line2, '') || ', ' || COALESCE(NEW.customer_city, '') || ' ' || COALESCE(NEW.customer_postcode, ''), ''));
    
    file_name := NEW.policy_number || '_' || template_record.document_subtype || '.html';
    
    INSERT INTO public.documents (
      user_id,
      policy_id,
      document_type,
      document_subtype,
      file_name,
      file_path,
      metadata
    ) VALUES (
      NEW.user_id,
      NEW.id,
      'policy',
      template_record.document_subtype::document_subtype,
      file_name,
      'policy-documents/' || NEW.user_id || '/' || NEW.policy_number || '/' || file_name,
      jsonb_build_object(
        'generated_from_template', true,
        'template_id', template_record.id,
        'content', generated_content
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- PART 6: TRIGGERS
-- ============================================================================

-- Trigger to create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update service request activity on new message
CREATE OR REPLACE TRIGGER update_service_request_activity_trigger
  AFTER INSERT ON public.service_request_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_service_request_activity();

-- Auto-generate product_id
CREATE OR REPLACE TRIGGER generate_product_id_trigger
  BEFORE INSERT ON public.products
  FOR EACH ROW
  WHEN (NEW.product_id IS NULL OR NEW.product_id = '')
  EXECUTE FUNCTION public.generate_product_id();

-- Link policy to existing user
CREATE OR REPLACE TRIGGER link_policy_to_user_trigger
  BEFORE INSERT ON public.policies
  FOR EACH ROW EXECUTE FUNCTION public.link_policy_to_existing_user();

-- Set policy program
CREATE OR REPLACE TRIGGER set_policy_program_trigger
  BEFORE INSERT ON public.policies
  FOR EACH ROW EXECUTE FUNCTION public.set_policy_program();

-- Assign templates to new products
CREATE OR REPLACE TRIGGER assign_templates_to_new_product
  AFTER INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.assign_all_templates_to_product();

-- Assign new template to all products
CREATE OR REPLACE TRIGGER assign_template_to_products
  AFTER INSERT ON public.communication_templates
  FOR EACH ROW EXECUTE FUNCTION public.assign_template_to_all_products();

-- Generate policy documents on creation
CREATE OR REPLACE TRIGGER generate_policy_documents_trigger
  AFTER INSERT ON public.policies
  FOR EACH ROW EXECUTE FUNCTION public.generate_policy_documents_from_templates();

-- Updated_at triggers
CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_programs_updated_at
  BEFORE UPDATE ON public.programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_policies_updated_at
  BEFORE UPDATE ON public.policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_claims_updated_at
  BEFORE UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_complaints_updated_at
  BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_service_requests_updated_at
  BEFORE UPDATE ON public.service_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- PART 7: VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW public.consultant_profiles_view AS
SELECT 
  ur.id,
  ur.user_id,
  ur.role,
  ur.program_id,
  ur.created_at,
  p.full_name,
  p.email
FROM public.user_roles ur
JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.role = 'consultant';

CREATE OR REPLACE VIEW public.sales_stats AS
SELECT
  p.consultant_id,
  pr.full_name as consultant_name,
  TO_CHAR(p.created_at, 'YYYY-MM') as sale_month,
  COUNT(*) as total_policies_sold,
  COUNT(*) FILTER (WHERE p.status = 'active') as active_policies,
  SUM(COALESCE(p.promotional_premium, p.original_premium)) as total_premium_value
FROM public.policies p
LEFT JOIN public.profiles pr ON p.consultant_id = pr.id
GROUP BY p.consultant_id, pr.full_name, TO_CHAR(p.created_at, 'YYYY-MM');

-- ============================================================================
-- PART 8: ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_group_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_program_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perils ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.covered_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_fulfillment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repairers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repairer_slas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fulfillment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims_sla ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_request_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_action_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_categories ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES RLS
-- ============================================================================
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System admins can manage profiles" ON public.profiles FOR ALL USING (public.has_role(auth.uid(), 'system_admin'));

-- ============================================================================
-- USER_ROLES RLS
-- ============================================================================
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- USER_GROUPS RLS
-- ============================================================================
CREATE POLICY "System admins can manage user groups" ON public.user_groups FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'system_admin'));

-- ============================================================================
-- USER_GROUP_MEMBERS RLS
-- ============================================================================
CREATE POLICY "System admins can manage group members" ON public.user_group_members FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'system_admin'));
CREATE POLICY "Users can view own group memberships" ON public.user_group_members FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- USER_GROUP_PERMISSIONS RLS
-- ============================================================================
CREATE POLICY "System admins can manage group permissions" ON public.user_group_permissions FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'system_admin'));

-- ============================================================================
-- USER_PINS RLS
-- ============================================================================
CREATE POLICY "Users can view own PIN" ON public.user_pins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own PIN" ON public.user_pins FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "System can insert PINs" ON public.user_pins FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage PINs" ON public.user_pins FOR ALL USING (has_role(auth.uid(), 'admin', NULL));

-- ============================================================================
-- USER_PROGRAM_PERMISSIONS RLS
-- ============================================================================
CREATE POLICY "Users can view own permissions" ON public.user_program_permissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System admins can manage permissions" ON public.user_program_permissions FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'system_admin'));

-- ============================================================================
-- PROGRAMS RLS
-- ============================================================================
CREATE POLICY "Authenticated users can view active programs" ON public.programs FOR SELECT USING (is_active = true);
CREATE POLICY "System admins can view all programs" ON public.programs FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'system_admin'));
CREATE POLICY "System admins can manage programs" ON public.programs FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'system_admin'));

-- ============================================================================
-- PRODUCTS RLS
-- ============================================================================
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "System admins can manage products" ON public.products FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'system_admin'));

-- ============================================================================
-- PROGRAM_PRODUCTS RLS
-- ============================================================================
CREATE POLICY "Anyone can view active program products" ON public.program_products FOR SELECT USING (is_active = true);
CREATE POLICY "System admins can manage program products" ON public.program_products FOR ALL USING (public.has_role(auth.uid(), 'system_admin'));

-- ============================================================================
-- PROMOTIONS RLS
-- ============================================================================
CREATE POLICY "Anyone can view active promotions" ON public.promotions FOR SELECT USING (is_active = true);
CREATE POLICY "Admins and retail agents can insert promotions" ON public.promotions FOR INSERT WITH CHECK (has_role(auth.uid(), 'system_admin', NULL) OR has_role(auth.uid(), 'admin', NULL) OR has_role(auth.uid(), 'retail_agent', NULL));
CREATE POLICY "System admins can manage promotions" ON public.promotions FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'system_admin'));

-- ============================================================================
-- PERILS RLS
-- ============================================================================
CREATE POLICY "Anyone can view active perils" ON public.perils FOR SELECT USING (is_active = true);
CREATE POLICY "System admins can manage perils" ON public.perils FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'system_admin'));

-- ============================================================================
-- POLICIES RLS
-- ============================================================================
CREATE POLICY "Users can view own policies" ON public.policies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Agents can view all policies" ON public.policies FOR SELECT USING (public.has_role(auth.uid(), 'consultant') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'retail_agent') OR public.has_role(auth.uid(), 'claims_agent') OR public.has_role(auth.uid(), 'complaints_agent'));
CREATE POLICY "Agents can insert policies" ON public.policies FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'consultant') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'retail_agent'));
CREATE POLICY "Agents can update policies" ON public.policies FOR UPDATE USING (public.has_role(auth.uid(), 'consultant') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'retail_agent') OR public.has_role(auth.uid(), 'claims_agent'));

-- ============================================================================
-- COVERED_ITEMS RLS
-- ============================================================================
CREATE POLICY "Users can view own covered items" ON public.covered_items FOR SELECT USING (EXISTS (SELECT 1 FROM policies WHERE policies.id = covered_items.policy_id AND policies.user_id = auth.uid()));
CREATE POLICY "Users can insert own covered items" ON public.covered_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM policies WHERE policies.id = covered_items.policy_id AND policies.user_id = auth.uid()));
CREATE POLICY "Users can update own covered items" ON public.covered_items FOR UPDATE USING (EXISTS (SELECT 1 FROM policies WHERE policies.id = covered_items.policy_id AND policies.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM policies WHERE policies.id = covered_items.policy_id AND policies.user_id = auth.uid()));
CREATE POLICY "Agents can view covered items" ON public.covered_items FOR SELECT USING (public.has_role(auth.uid(), 'consultant') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'retail_agent') OR public.has_role(auth.uid(), 'claims_agent') OR public.has_role(auth.uid(), 'complaints_agent'));
CREATE POLICY "Retail agents can insert covered items" ON public.covered_items FOR INSERT WITH CHECK (has_role(auth.uid(), 'retail_agent', NULL) OR has_role(auth.uid(), 'admin', NULL) OR has_role(auth.uid(), 'consultant', NULL));

-- ============================================================================
-- CLAIMS RLS
-- ============================================================================
CREATE POLICY "Users can view claims for their policies" ON public.claims FOR SELECT USING (EXISTS (SELECT 1 FROM policies WHERE policies.id = claims.policy_id AND policies.user_id = auth.uid()));
CREATE POLICY "Users can insert own claims" ON public.claims FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own claims" ON public.claims FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Agents can view all claims" ON public.claims FOR SELECT USING (public.has_role(auth.uid(), 'consultant') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'claims_agent') OR public.has_role(auth.uid(), 'complaints_agent') OR public.has_role(auth.uid(), 'retail_agent') OR public.has_role(auth.uid(), 'repairer_agent'));
CREATE POLICY "Agents can insert claims" ON public.claims FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'consultant') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'claims_agent') OR public.has_role(auth.uid(), 'complaints_agent') OR public.has_role(auth.uid(), 'retail_agent'));
CREATE POLICY "Agents can update claims" ON public.claims FOR UPDATE USING (public.has_role(auth.uid(), 'consultant') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'claims_agent') OR public.has_role(auth.uid(), 'complaints_agent') OR public.has_role(auth.uid(), 'retail_agent') OR public.has_role(auth.uid(), 'repairer_agent'));

-- ============================================================================
-- CLAIM_FULFILLMENT RLS
-- ============================================================================
CREATE POLICY "Users can view own fulfillment" ON public.claim_fulfillment FOR SELECT USING (EXISTS (SELECT 1 FROM claims WHERE claims.id = claim_fulfillment.claim_id AND claims.user_id = auth.uid()));
CREATE POLICY "Agents can manage fulfillment" ON public.claim_fulfillment FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'retail_agent') OR public.has_role(auth.uid(), 'claims_agent'));
CREATE POLICY "Repairer agents can view all fulfillment jobs" ON public.claim_fulfillment FOR SELECT USING (public.has_role(auth.uid(), 'repairer_agent') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'retail_agent') OR public.has_role(auth.uid(), 'claims_agent'));
CREATE POLICY "Repairer agents can update assigned fulfillment jobs" ON public.claim_fulfillment FOR UPDATE USING (public.has_role(auth.uid(), 'repairer_agent') AND repairer_id = auth.uid());
CREATE POLICY "Authenticated users can manage fulfillment" ON public.claim_fulfillment FOR ALL USING (EXISTS (SELECT 1 FROM claims WHERE claims.id = claim_fulfillment.claim_id)) WITH CHECK (EXISTS (SELECT 1 FROM claims WHERE claims.id = claim_fulfillment.claim_id));

-- ============================================================================
-- REPAIRERS RLS
-- ============================================================================
CREATE POLICY "Anyone can view active repairers" ON public.repairers FOR SELECT USING (is_active = true);
CREATE POLICY "Repairer agents can view their company" ON public.repairers FOR SELECT USING (id IN (SELECT profiles.repairer_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "System admins can manage repairers" ON public.repairers FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'system_admin'));

-- ============================================================================
-- REPAIRER_SLAS RLS
-- ============================================================================
CREATE POLICY "Anyone can view active repairer SLAs" ON public.repairer_slas FOR SELECT USING (true);
CREATE POLICY "System admins can manage repairer SLAs" ON public.repairer_slas FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'system_admin'));

-- ============================================================================
-- REPAIR_COSTS RLS
-- ============================================================================
CREATE POLICY "Admins can view all costs" ON public.repair_costs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage all costs" ON public.repair_costs FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Repairer agents can view their own costs" ON public.repair_costs FOR SELECT USING (public.has_role(auth.uid(), 'repairer_agent') AND added_by = auth.uid());
CREATE POLICY "Repairer agents can insert costs" ON public.repair_costs FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'repairer_agent') AND added_by = auth.uid());
CREATE POLICY "Claims agents can view repair costs" ON public.repair_costs FOR SELECT USING (has_role(auth.uid(), 'claims_agent', NULL));
CREATE POLICY "Retail agents can view repair costs" ON public.repair_costs FOR SELECT USING (has_role(auth.uid(), 'retail_agent', NULL));
CREATE POLICY "Backoffice agents can view repair costs" ON public.repair_costs FOR SELECT USING (has_role(auth.uid(), 'backoffice_agent', NULL));

-- ============================================================================
-- FULFILLMENT_ASSIGNMENTS RLS
-- ============================================================================
CREATE POLICY "Anyone can view active fulfillment assignments" ON public.fulfillment_assignments FOR SELECT USING (is_active = true);
CREATE POLICY "System admins can manage fulfillment assignments" ON public.fulfillment_assignments FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'system_admin'));

-- ============================================================================
-- CLAIMS_SLA RLS
-- ============================================================================
CREATE POLICY "Agents can view claims SLA" ON public.claims_sla FOR SELECT USING (has_role(auth.uid(), 'admin', NULL) OR has_role(auth.uid(), 'retail_agent', NULL) OR has_role(auth.uid(), 'claims_agent', NULL) OR has_role(auth.uid(), 'system_admin', NULL));
CREATE POLICY "System admins can manage claims SLA" ON public.claims_sla FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'system_admin'));

-- ============================================================================
-- COMPLAINTS RLS
-- ============================================================================
CREATE POLICY "Users can view their own complaints" ON public.complaints FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own complaints" ON public.complaints FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Consultants can view all complaints" ON public.complaints FOR SELECT USING (public.has_role(auth.uid(), 'consultant') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Consultants can create complaints" ON public.complaints FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'consultant') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Consultants can update complaints" ON public.complaints FOR UPDATE USING (public.has_role(auth.uid(), 'consultant') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Complaints agents can view all complaints" ON public.complaints FOR SELECT USING (public.has_role(auth.uid(), 'complaints_agent') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Complaints agents can create complaints" ON public.complaints FOR INSERT WITH CHECK (has_role(auth.uid(), 'complaints_agent', NULL) OR has_role(auth.uid(), 'admin', NULL));
CREATE POLICY "Complaints agents can update complaints" ON public.complaints FOR UPDATE USING (public.has_role(auth.uid(), 'complaints_agent') OR public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- SERVICE_REQUESTS RLS
-- ============================================================================
CREATE POLICY "Customers can view own service requests" ON public.service_requests FOR SELECT USING (EXISTS (SELECT 1 FROM policies p WHERE p.id = service_requests.policy_id AND p.user_id = auth.uid()));
CREATE POLICY "Agents can view all service requests" ON public.service_requests FOR SELECT USING (has_role(auth.uid(), 'retail_agent', NULL) OR has_role(auth.uid(), 'claims_agent', NULL) OR has_role(auth.uid(), 'admin', NULL) OR has_role(auth.uid(), 'consultant', NULL) OR has_role(auth.uid(), 'backoffice_agent', NULL) OR has_role(auth.uid(), 'commercial_agent', NULL));
CREATE POLICY "Agents can insert service requests" ON public.service_requests FOR INSERT WITH CHECK (has_role(auth.uid(), 'retail_agent', NULL) OR has_role(auth.uid(), 'claims_agent', NULL) OR has_role(auth.uid(), 'admin', NULL) OR has_role(auth.uid(), 'consultant', NULL));
CREATE POLICY "Agents can update service requests" ON public.service_requests FOR UPDATE USING (has_role(auth.uid(), 'retail_agent', NULL) OR has_role(auth.uid(), 'claims_agent', NULL) OR has_role(auth.uid(), 'admin', NULL) OR has_role(auth.uid(), 'consultant', NULL));

-- ============================================================================
-- SERVICE_REQUEST_MESSAGES RLS
-- ============================================================================
CREATE POLICY "Customers can view own service request messages" ON public.service_request_messages FOR SELECT USING (EXISTS (SELECT 1 FROM service_requests sr JOIN policies p ON sr.policy_id = p.id WHERE sr.id = service_request_messages.service_request_id AND p.user_id = auth.uid()));
CREATE POLICY "Customers can insert messages in own service requests" ON public.service_request_messages FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM service_requests sr JOIN policies p ON sr.policy_id = p.id WHERE sr.id = service_request_messages.service_request_id AND p.user_id = auth.uid()));
CREATE POLICY "Agents can view all messages" ON public.service_request_messages FOR SELECT USING (has_role(auth.uid(), 'retail_agent', NULL) OR has_role(auth.uid(), 'claims_agent', NULL) OR has_role(auth.uid(), 'admin', NULL) OR has_role(auth.uid(), 'consultant', NULL));
CREATE POLICY "Agents can insert messages" ON public.service_request_messages FOR INSERT WITH CHECK (has_role(auth.uid(), 'retail_agent', NULL) OR has_role(auth.uid(), 'claims_agent', NULL) OR has_role(auth.uid(), 'admin', NULL) OR has_role(auth.uid(), 'consultant', NULL));
CREATE POLICY "Agents can update messages" ON public.service_request_messages FOR UPDATE USING (has_role(auth.uid(), 'retail_agent', NULL) OR has_role(auth.uid(), 'claims_agent', NULL) OR has_role(auth.uid(), 'admin', NULL) OR has_role(auth.uid(), 'consultant', NULL));
CREATE POLICY "Backoffice agents can view service request messages" ON public.service_request_messages FOR SELECT USING (has_role(auth.uid(), 'backoffice_agent', NULL) OR has_role(auth.uid(), 'admin', NULL));
CREATE POLICY "Backoffice agents can insert service request messages" ON public.service_request_messages FOR INSERT WITH CHECK (has_role(auth.uid(), 'backoffice_agent', NULL) OR has_role(auth.uid(), 'admin', NULL));
CREATE POLICY "Backoffice agents can update service request messages" ON public.service_request_messages FOR UPDATE USING (has_role(auth.uid(), 'backoffice_agent', NULL) OR has_role(auth.uid(), 'admin', NULL));
CREATE POLICY "Commercial agents can view service request messages" ON public.service_request_messages FOR SELECT USING (has_role(auth.uid(), 'commercial_agent', NULL) OR has_role(auth.uid(), 'admin', NULL));
CREATE POLICY "Commercial agents can insert service request messages" ON public.service_request_messages FOR INSERT WITH CHECK (has_role(auth.uid(), 'commercial_agent', NULL) OR has_role(auth.uid(), 'admin', NULL));
CREATE POLICY "Commercial agents can update service request messages" ON public.service_request_messages FOR UPDATE USING (has_role(auth.uid(), 'commercial_agent', NULL) OR has_role(auth.uid(), 'admin', NULL));

-- ============================================================================
-- DOCUMENTS RLS
-- ============================================================================
CREATE POLICY "Users can view own documents" ON public.documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON public.documents FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert documents for service requests" ON public.documents FOR INSERT WITH CHECK ((auth.uid() = user_id) AND (service_request_id IS NOT NULL OR claim_id IS NOT NULL OR policy_id IS NOT NULL));
CREATE POLICY "Agents can view claim documents" ON public.documents FOR SELECT USING (has_role(auth.uid(), 'claims_agent', NULL) OR has_role(auth.uid(), 'retail_agent', NULL) OR has_role(auth.uid(), 'admin', NULL) OR has_role(auth.uid(), 'complaints_agent', NULL) OR has_role(auth.uid(), 'consultant', NULL));
CREATE POLICY "Agents can view service request documents" ON public.documents FOR SELECT USING ((service_request_id IS NOT NULL) AND (has_role(auth.uid(), 'claims_agent', NULL) OR has_role(auth.uid(), 'retail_agent', NULL) OR has_role(auth.uid(), 'admin', NULL) OR has_role(auth.uid(), 'consultant', NULL)));
CREATE POLICY "Agents can update claim and service request documents" ON public.documents FOR UPDATE USING ((has_role(auth.uid(), 'claims_agent', NULL) OR has_role(auth.uid(), 'retail_agent', NULL) OR has_role(auth.uid(), 'admin', NULL) OR has_role(auth.uid(), 'consultant', NULL)) AND (service_request_id IS NOT NULL OR claim_id IS NOT NULL)) WITH CHECK ((has_role(auth.uid(), 'claims_agent', NULL) OR has_role(auth.uid(), 'retail_agent', NULL) OR has_role(auth.uid(), 'admin', NULL) OR has_role(auth.uid(), 'consultant', NULL)) AND (service_request_id IS NOT NULL OR claim_id IS NOT NULL));

-- ============================================================================
-- PAYMENTS RLS
-- ============================================================================
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payments" ON public.payments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- POLICY_COMMUNICATIONS RLS
-- ============================================================================
CREATE POLICY "Users can view their own policy communications" ON public.policy_communications FOR SELECT USING (EXISTS (SELECT 1 FROM policies WHERE policies.id = policy_communications.policy_id AND policies.user_id = auth.uid()));
CREATE POLICY "Users can mark their communications as read" ON public.policy_communications FOR UPDATE USING (EXISTS (SELECT 1 FROM policies WHERE policies.id = policy_communications.policy_id AND policies.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM policies WHERE policies.id = policy_communications.policy_id AND policies.user_id = auth.uid()));
CREATE POLICY "Agents can view all policy communications" ON public.policy_communications FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = ANY (ARRAY['retail_agent', 'claims_agent', 'consultant', 'admin']::app_role[])));
CREATE POLICY "System can insert policy communications" ON public.policy_communications FOR INSERT WITH CHECK (true);

-- ============================================================================
-- POLICY_CHANGE_HISTORY RLS
-- ============================================================================
CREATE POLICY "Users can view their own policy change history" ON public.policy_change_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own policy change history" ON public.policy_change_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- COMMUNICATION_TEMPLATES RLS
-- ============================================================================
CREATE POLICY "Anyone can view active templates" ON public.communication_templates FOR SELECT USING (is_active = true);
CREATE POLICY "System admins can manage templates" ON public.communication_templates FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'system_admin'));

-- ============================================================================
-- PRODUCT_COMMUNICATION_TEMPLATES RLS
-- ============================================================================
CREATE POLICY "Anyone can view active product template assignments" ON public.product_communication_templates FOR SELECT USING (is_active = true);
CREATE POLICY "System admins can manage product template assignments" ON public.product_communication_templates FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'system_admin'));

-- ============================================================================
-- PRODUCT_DOCUMENT_TEMPLATES RLS
-- ============================================================================
CREATE POLICY "Anyone can view active templates" ON public.product_document_templates FOR SELECT USING (is_active = true);
CREATE POLICY "System admins can manage templates" ON public.product_document_templates FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'system_admin'));

-- ============================================================================
-- DEVICES RLS
-- ============================================================================
CREATE POLICY "Anyone can view devices" ON public.devices FOR SELECT USING (true);
CREATE POLICY "System admins can manage devices" ON public.devices FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'system_admin'));

-- ============================================================================
-- DEVICE_CATEGORIES RLS
-- ============================================================================
CREATE POLICY "Anyone can view active device categories" ON public.device_categories FOR SELECT USING (is_active = true);
CREATE POLICY "System admins can manage device categories" ON public.device_categories FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'system_admin'));

-- ============================================================================
-- PART 9: STORAGE BUCKETS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('claim-receipts', 'claim-receipts', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('policy-documents', 'policy-documents', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('claim-documents', 'claim-documents', false) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('promotion-logos', 'promotion-logos', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('inspection-photos', 'inspection-photos', true) ON CONFLICT DO NOTHING;

-- Storage policies for claim-receipts
CREATE POLICY "Users can upload claim receipts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'claim-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own claim receipts" ON storage.objects FOR SELECT USING (bucket_id = 'claim-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for policy-documents
CREATE POLICY "Users can view own policy documents" ON storage.objects FOR SELECT USING (bucket_id = 'policy-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for claim-documents
CREATE POLICY "Users can upload claim documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'claim-documents');
CREATE POLICY "Users can view claim documents" ON storage.objects FOR SELECT USING (bucket_id = 'claim-documents');

-- Storage policies for promotion-logos (public)
CREATE POLICY "Anyone can view promotion logos" ON storage.objects FOR SELECT USING (bucket_id = 'promotion-logos');
CREATE POLICY "Admins can upload promotion logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'promotion-logos');

-- Storage policies for inspection-photos (public)
CREATE POLICY "Anyone can view inspection photos" ON storage.objects FOR SELECT USING (bucket_id = 'inspection-photos');
CREATE POLICY "Agents can upload inspection photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'inspection-photos');

-- ============================================================================
-- PART 10: INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_policies_user_id ON public.policies(user_id);
CREATE INDEX IF NOT EXISTS idx_policies_product_id ON public.policies(product_id);
CREATE INDEX IF NOT EXISTS idx_policies_program_id ON public.policies(program_id);
CREATE INDEX IF NOT EXISTS idx_policies_status ON public.policies(status);
CREATE INDEX IF NOT EXISTS idx_policies_customer_email ON public.policies(customer_email);
CREATE INDEX IF NOT EXISTS idx_claims_policy_id ON public.claims(policy_id);
CREATE INDEX IF NOT EXISTS idx_claims_user_id ON public.claims(user_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON public.claims(status);
CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON public.complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_policy_id ON public.complaints(policy_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_policy_id ON public.service_requests(policy_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_policy_id ON public.documents(policy_id);
CREATE INDEX IF NOT EXISTS idx_documents_claim_id ON public.documents(claim_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
