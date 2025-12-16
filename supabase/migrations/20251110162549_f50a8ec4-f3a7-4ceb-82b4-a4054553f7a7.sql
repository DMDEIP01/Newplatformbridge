-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE policy_status AS ENUM ('active', 'expired', 'cancelled', 'pending');
CREATE TYPE claim_status AS ENUM ('notified', 'accepted', 'rejected', 'referred', 'inbound_logistics', 'repair', 'outbound_logistics', 'closed');
CREATE TYPE claim_type AS ENUM ('breakdown', 'damage', 'theft');
CREATE TYPE payment_type AS ENUM ('premium', 'excess');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed');
CREATE TYPE document_type AS ENUM ('policy', 'receipt', 'photo', 'other');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Products table (the 15 product tiers)
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'extended_warranty', 'insurance_lite', 'insurance_max'
  tier INTEGER NOT NULL, -- 1-5
  rrp_min DECIMAL(10,2) NOT NULL,
  rrp_max DECIMAL(10,2),
  monthly_premium DECIMAL(10,2) NOT NULL,
  excess DECIMAL(10,2) NOT NULL,
  coverage TEXT[] NOT NULL,
  promotion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Policies table
CREATE TABLE public.policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  policy_number TEXT NOT NULL UNIQUE,
  status policy_status NOT NULL DEFAULT 'active',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  renewal_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Covered items table
CREATE TABLE public.covered_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  model TEXT,
  serial_number TEXT,
  purchase_price DECIMAL(10,2),
  added_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Claims table
CREATE TABLE public.claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  claim_number TEXT NOT NULL UNIQUE,
  claim_type claim_type NOT NULL,
  status claim_status NOT NULL DEFAULT 'notified',
  product_condition TEXT,
  description TEXT NOT NULL,
  has_receipt BOOLEAN NOT NULL DEFAULT false,
  decision TEXT,
  decision_reason TEXT,
  submitted_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Claim status history table
CREATE TABLE public.claim_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  status claim_status NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES public.policies(id) ON DELETE SET NULL,
  claim_id UUID REFERENCES public.claims(id) ON DELETE SET NULL,
  payment_type payment_type NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  payment_date TIMESTAMPTZ,
  reference_number TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES public.policies(id) ON DELETE CASCADE,
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE,
  document_type document_type NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  uploaded_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON public.policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_claims_updated_at BEFORE UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.covered_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for products (public read)
CREATE POLICY "Anyone can view products" ON public.products
  FOR SELECT USING (true);

-- RLS Policies for policies
CREATE POLICY "Users can view own policies" ON public.policies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own policies" ON public.policies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own policies" ON public.policies
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for covered_items
CREATE POLICY "Users can view own covered items" ON public.covered_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.policies
      WHERE policies.id = covered_items.policy_id
      AND policies.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own covered items" ON public.covered_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.policies
      WHERE policies.id = covered_items.policy_id
      AND policies.user_id = auth.uid()
    )
  );

-- RLS Policies for claims
CREATE POLICY "Users can view own claims" ON public.claims
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own claims" ON public.claims
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own claims" ON public.claims
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for claim_status_history
CREATE POLICY "Users can view own claim history" ON public.claim_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.claims
      WHERE claims.id = claim_status_history.claim_id
      AND claims.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own claim history" ON public.claim_status_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.claims
      WHERE claims.id = claim_status_history.claim_id
      AND claims.user_id = auth.uid()
    )
  );

-- RLS Policies for payments
CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for documents
CREATE POLICY "Users can view own documents" ON public.documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents" ON public.documents
  FOR DELETE USING (auth.uid() = user_id);

-- Insert the 15 products
INSERT INTO public.products (name, type, tier, rrp_min, rrp_max, monthly_premium, excess, coverage, promotion) VALUES
  ('Extended Warranty 1', 'extended_warranty', 1, 0.10, 299.00, 1.99, 10.00, ARRAY['Extended Warranty'], NULL),
  ('Extended Warranty 2', 'extended_warranty', 2, 300.00, 599.00, 2.99, 15.00, ARRAY['Extended Warranty'], NULL),
  ('Extended Warranty 3', 'extended_warranty', 3, 600.00, 999.00, 3.99, 20.00, ARRAY['Extended Warranty'], NULL),
  ('Extended Warranty 4', 'extended_warranty', 4, 1000.00, 1999.00, 4.99, 30.00, ARRAY['Extended Warranty'], '2 months free'),
  ('Extended Warranty 5', 'extended_warranty', 5, 2000.00, NULL, 7.99, 40.00, ARRAY['Extended Warranty'], '3 months free'),
  
  ('Insurance Lite 1', 'insurance_lite', 1, 0.10, 299.00, 2.99, 10.00, ARRAY['Accidental Damage Only'], NULL),
  ('Insurance Lite 2', 'insurance_lite', 2, 300.00, 599.00, 3.99, 15.00, ARRAY['Accidental Damage Only'], NULL),
  ('Insurance Lite 3', 'insurance_lite', 3, 600.00, 999.00, 4.99, 25.00, ARRAY['Accidental Damage Only'], NULL),
  ('Insurance Lite 4', 'insurance_lite', 4, 1000.00, 1999.00, 5.99, 35.00, ARRAY['Accidental Damage Only'], '2 months free'),
  ('Insurance Lite 5', 'insurance_lite', 5, 2000.00, NULL, 8.99, 50.00, ARRAY['Accidental Damage Only'], '3 months free'),
  
  ('Insurance Max 1', 'insurance_max', 1, 0.10, 299.00, 3.99, 20.00, ARRAY['Accidental Damage', 'Loss', 'Theft'], NULL),
  ('Insurance Max 2', 'insurance_max', 2, 300.00, 599.00, 4.99, 25.00, ARRAY['Accidental Damage', 'Loss', 'Theft'], NULL),
  ('Insurance Max 3', 'insurance_max', 3, 600.00, 999.00, 5.99, 40.00, ARRAY['Accidental Damage', 'Loss', 'Theft'], NULL),
  ('Insurance Max 4', 'insurance_max', 4, 1000.00, 1999.00, 6.99, 50.00, ARRAY['Accidental Damage', 'Loss', 'Theft'], '2 months free'),
  ('Insurance Max 5', 'insurance_max', 5, 2000.00, NULL, 10.99, 75.00, ARRAY['Accidental Damage', 'Loss', 'Theft'], '3 months free');