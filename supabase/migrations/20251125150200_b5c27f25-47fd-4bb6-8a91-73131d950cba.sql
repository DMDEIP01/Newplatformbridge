-- Create product document templates table
CREATE TABLE IF NOT EXISTS public.product_document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  document_subtype TEXT NOT NULL CHECK (document_subtype IN ('ipid', 'terms_conditions', 'policy_schedule')),
  template_content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, document_subtype)
);

-- Enable RLS
ALTER TABLE public.product_document_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active templates"
  ON public.product_document_templates
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "System admins can manage templates"
  ON public.product_document_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() 
      AND role = 'system_admin'
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_product_document_templates_updated_at
  BEFORE UPDATE ON public.product_document_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate policy documents from templates
CREATE OR REPLACE FUNCTION public.generate_policy_documents_from_templates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  template_record RECORD;
  generated_content TEXT;
  file_name TEXT;
BEGIN
  -- Loop through all active templates for this product
  FOR template_record IN
    SELECT * FROM public.product_document_templates
    WHERE product_id = NEW.product_id
    AND is_active = true
  LOOP
    -- Generate content with variable substitution
    generated_content := template_record.template_content;
    generated_content := REPLACE(generated_content, '{policy_number}', NEW.policy_number);
    generated_content := REPLACE(generated_content, '{start_date}', TO_CHAR(NEW.start_date, 'DD/MM/YYYY'));
    generated_content := REPLACE(generated_content, '{renewal_date}', TO_CHAR(NEW.renewal_date, 'DD/MM/YYYY'));
    generated_content := REPLACE(generated_content, '{customer_name}', COALESCE(NEW.customer_name, ''));
    generated_content := REPLACE(generated_content, '{customer_email}', COALESCE(NEW.customer_email, ''));
    generated_content := REPLACE(generated_content, '{customer_address}', COALESCE(NEW.customer_address_line1 || ' ' || COALESCE(NEW.customer_address_line2, '') || ', ' || COALESCE(NEW.customer_city, '') || ' ' || COALESCE(NEW.customer_postcode, ''), ''));
    
    -- Generate file name
    file_name := NEW.policy_number || '_' || template_record.document_subtype || '.html';
    
    -- Insert document record
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

-- Create trigger to generate documents on policy creation
CREATE TRIGGER generate_policy_documents_trigger
  AFTER INSERT ON public.policies
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_policy_documents_from_templates();

-- Insert default templates for all existing products
INSERT INTO public.product_document_templates (product_id, document_subtype, template_content)
SELECT 
  id as product_id,
  'ipid' as document_subtype,
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #E30613 0%, #000000 100%); color: white; padding: 30px; text-align: center; }
    .content { padding: 20px; line-height: 1.6; }
    .section { margin: 30px 0; }
    h1 { margin: 0; }
    h2 { color: #E30613; border-bottom: 2px solid #E30613; padding-bottom: 10px; }
    .highlight { background: #FFF3CD; padding: 15px; border-left: 4px solid #E30613; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Insurance Product Information Document (IPID)</h1>
    <p>Policy Number: {policy_number}</p>
  </div>
  <div class="content">
    <div class="section">
      <h2>Product: ' || name || '</h2>
      <p><strong>Coverage Start:</strong> {start_date}</p>
      <p><strong>Renewal Date:</strong> {renewal_date}</p>
    </div>
    
    <div class="section">
      <h2>What is this type of insurance?</h2>
      <p>This is a device protection insurance policy provided by MediaMarkt that covers your electronic devices against various risks including accidental damage, breakdown, and theft.</p>
    </div>
    
    <div class="section">
      <h2>What is insured?</h2>
      <ul>
        <li>✓ Accidental damage from drops and spills</li>
        <li>✓ Mechanical and electrical breakdown</li>
        <li>✓ Theft and loss (where applicable)</li>
        <li>✓ Worldwide coverage</li>
        <li>✓ Unlimited repairs</li>
      </ul>
    </div>
    
    <div class="section">
      <h2>What is not insured?</h2>
      <ul>
        <li>✗ Cosmetic damage that does not affect functionality</li>
        <li>✗ Loss or theft without police report</li>
        <li>✗ Pre-existing faults</li>
        <li>✗ Intentional damage</li>
      </ul>
    </div>
    
    <div class="highlight">
      <h3>Important Information</h3>
      <p>Claims must be notified within 24 hours. An excess fee applies to each claim. Full terms and conditions are available in your policy documents.</p>
    </div>
    
    <div class="section">
      <h2>Where am I covered?</h2>
      <p>Coverage is valid worldwide with a limit of 30 consecutive days outside your home country.</p>
    </div>
    
    <div class="section">
      <h2>Premium: €' || monthly_premium || ' per month</h2>
      <p><strong>Excess per claim:</strong> €' || excess_1 || '</p>
    </div>
  </div>
</body>
</html>' as template_content
FROM public.products
ON CONFLICT (product_id, document_subtype) DO NOTHING;

INSERT INTO public.product_document_templates (product_id, document_subtype, template_content)
SELECT 
  id as product_id,
  'terms_conditions' as document_subtype,
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #E30613 0%, #000000 100%); color: white; padding: 30px; text-align: center; }
    .content { padding: 20px; line-height: 1.6; }
    .section { margin: 30px 0; }
    h1 { margin: 0; }
    h2 { color: #E30613; border-bottom: 2px solid #E30613; padding-bottom: 10px; }
    ol, ul { margin-left: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Terms and Conditions</h1>
    <p>Policy Number: {policy_number}</p>
  </div>
  <div class="content">
    <div class="section">
      <h2>1. Your Policy</h2>
      <p><strong>Policyholder:</strong> {customer_name}</p>
      <p><strong>Email:</strong> {customer_email}</p>
      <p><strong>Address:</strong> {customer_address}</p>
      <p><strong>Policy Period:</strong> {start_date} to {renewal_date}</p>
    </div>
    
    <div class="section">
      <h2>2. Definitions</h2>
      <p><strong>We, Us, Our:</strong> MediaMarkt Insurance Services</p>
      <p><strong>You, Your:</strong> The person named as the policyholder</p>
      <p><strong>Device:</strong> The electronic equipment covered under this policy</p>
      <p><strong>Excess:</strong> The amount you must pay towards each claim</p>
    </div>
    
    <div class="section">
      <h2>3. Cover</h2>
      <p>This policy provides cover for:</p>
      <ul>
        <li>Accidental damage resulting from handling</li>
        <li>Liquid damage</li>
        <li>Breakdown after manufacturer warranty expires</li>
        <li>Theft following forcible and violent entry</li>
      </ul>
    </div>
    
    <div class="section">
      <h2>4. Exclusions</h2>
      <p>This policy does not cover:</p>
      <ul>
        <li>Cosmetic damage that does not affect functionality</li>
        <li>Loss or theft without a police report filed within 24 hours</li>
        <li>Faults that existed before the policy started</li>
        <li>Software issues not caused by hardware failure</li>
        <li>Unauthorized repairs or modifications</li>
        <li>War, terrorism, or radioactive contamination</li>
      </ul>
    </div>
    
    <div class="section">
      <h2>5. Making a Claim</h2>
      <ol>
        <li>Report the incident within 24 hours via the MediaMarkt Insurance Portal</li>
        <li>Provide all requested documentation including photos and receipts</li>
        <li>For theft claims, provide a police report within 7 days</li>
        <li>We will assess your claim within 48 hours</li>
        <li>If approved, we will arrange repair or replacement</li>
      </ol>
    </div>
    
    <div class="section">
      <h2>6. Excess</h2>
      <p>You must pay an excess of €' || excess_1 || ' for each approved claim. This must be paid before we arrange repair or replacement.</p>
    </div>
    
    <div class="section">
      <h2>7. Cancellation</h2>
      <p>You may cancel this policy at any time by contacting us. If you cancel within 14 days (cooling-off period) and have not made a claim, we will refund your premium in full. After this period, no refund will be provided.</p>
    </div>
    
    <div class="section">
      <h2>8. Renewal</h2>
      <p>This policy will automatically renew on {renewal_date} unless you notify us otherwise at least 14 days before the renewal date.</p>
    </div>
    
    <div class="section">
      <h2>9. Complaints</h2>
      <p>If you wish to make a complaint, please contact us through the MediaMarkt Insurance Portal or email support@mediamarkt-insurance.com</p>
    </div>
    
    <div class="section">
      <h2>10. Data Protection</h2>
      <p>We process your personal data in accordance with GDPR. Full details are available in our Privacy Policy.</p>
    </div>
  </div>
</body>
</html>' as template_content
FROM public.products
ON CONFLICT (product_id, document_subtype) DO NOTHING;

INSERT INTO public.product_document_templates (product_id, document_subtype, template_content)
SELECT 
  id as product_id,
  'policy_schedule' as document_subtype,
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #E30613 0%, #000000 100%); color: white; padding: 30px; text-align: center; }
    .content { padding: 20px; }
    h1 { margin: 0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0; }
    .info-box { border: 2px solid #E30613; padding: 15px; }
    .info-box h3 { color: #E30613; margin-top: 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background: #E30613; color: white; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Policy Schedule</h1>
    <p>Policy Number: {policy_number}</p>
  </div>
  <div class="content">
    <div class="info-grid">
      <div class="info-box">
        <h3>Policyholder Details</h3>
        <p><strong>Name:</strong> {customer_name}</p>
        <p><strong>Email:</strong> {customer_email}</p>
        <p><strong>Address:</strong> {customer_address}</p>
      </div>
      <div class="info-box">
        <h3>Policy Details</h3>
        <p><strong>Product:</strong> ' || name || '</p>
        <p><strong>Start Date:</strong> {start_date}</p>
        <p><strong>Renewal Date:</strong> {renewal_date}</p>
        <p><strong>Policy Term:</strong> ' || COALESCE(policy_term_years::text, '1') || ' year(s)</p>
      </div>
    </div>
    
    <h2 style="color: #E30613;">Coverage Summary</h2>
    <table>
      <tr>
        <th>Cover Type</th>
        <th>Limit</th>
      </tr>
      <tr>
        <td>Accidental Damage</td>
        <td>Up to device value</td>
      </tr>
      <tr>
        <td>Theft</td>
        <td>Up to device value</td>
      </tr>
      <tr>
        <td>Breakdown</td>
        <td>Up to device value</td>
      </tr>
      <tr>
        <td>Worldwide Cover</td>
        <td>30 days per trip</td>
      </tr>
    </table>
    
    <h2 style="color: #E30613;">Premium and Excess</h2>
    <table>
      <tr>
        <th>Description</th>
        <th>Amount</th>
      </tr>
      <tr>
        <td>Monthly Premium</td>
        <td>€' || monthly_premium || '</td>
      </tr>
      <tr>
        <td>Excess per Claim</td>
        <td>€' || excess_1 || '</td>
      </tr>
    </table>
    
    <div style="background: #FFF3CD; padding: 15px; border-left: 4px solid #E30613; margin: 30px 0;">
      <h3>Important Notes</h3>
      <ul>
        <li>This schedule should be read together with your policy terms and conditions</li>
        <li>All claims are subject to the policy excess</li>
        <li>Claims must be notified within 24 hours of the incident</li>
        <li>Keep this document safe for your records</li>
      </ul>
    </div>
  </div>
</body>
</html>' as template_content
FROM public.products
ON CONFLICT (product_id, document_subtype) DO NOTHING;