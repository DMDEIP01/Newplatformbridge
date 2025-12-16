-- Create communication templates table
CREATE TABLE IF NOT EXISTS public.communication_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('policy', 'claim')),
  status TEXT NOT NULL,
  subject TEXT NOT NULL,
  message_body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create policy communications table to store sent communications
CREATE TABLE IF NOT EXISTS public.policy_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  claim_id UUID REFERENCES public.claims(id) ON DELETE SET NULL,
  communication_type TEXT NOT NULL CHECK (communication_type IN ('policy', 'claim')),
  status TEXT NOT NULL,
  subject TEXT NOT NULL,
  message_body TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_communications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for communication_templates
CREATE POLICY "System admins can manage communication templates"
  ON public.communication_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'system_admin'
    )
  );

CREATE POLICY "Anyone can view active templates"
  ON public.communication_templates
  FOR SELECT
  USING (is_active = true);

-- RLS Policies for policy_communications
CREATE POLICY "Users can view their own policy communications"
  ON public.policy_communications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.policies
      WHERE policies.id = policy_communications.policy_id
      AND policies.user_id = auth.uid()
    )
  );

CREATE POLICY "Agents can view all policy communications"
  ON public.policy_communications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('retail_agent', 'claims_agent', 'consultant', 'admin')
    )
  );

CREATE POLICY "System can insert policy communications"
  ON public.policy_communications
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can mark their communications as read"
  ON public.policy_communications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.policies
      WHERE policies.id = policy_communications.policy_id
      AND policies.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.policies
      WHERE policies.id = policy_communications.policy_id
      AND policies.user_id = auth.uid()
    )
  );

-- Create trigger for updated_at on communication_templates
CREATE TRIGGER update_communication_templates_updated_at
  BEFORE UPDATE ON public.communication_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_communication_templates_type_status ON public.communication_templates(type, status);
CREATE INDEX idx_policy_communications_policy_id ON public.policy_communications(policy_id);
CREATE INDEX idx_policy_communications_claim_id ON public.policy_communications(claim_id);
CREATE INDEX idx_policy_communications_sent_at ON public.policy_communications(sent_at DESC);

-- Insert default Media Markt branded templates
INSERT INTO public.communication_templates (type, status, subject, message_body) VALUES
-- Policy Templates
('policy', 'active', 'Your MediaMarkt Insurance Policy is Now Active', 'Dear Customer,

Great news! Your MediaMarkt insurance policy is now active and your coverage has begun.

To view your policy details, including coverage information and policy documents, please log into your MediaMarkt Insurance Portal at any time.

Policy Details:
• Policy Number: {policy_number}
• Start Date: {start_date}
• Product: {product_name}

Log in to view your full policy details and documents.

If you have any questions, our team is here to help.

Best regards,
MediaMarkt Insurance Team'),

('policy', 'pending', 'Your MediaMarkt Insurance Policy is Being Processed', 'Dear Customer,

Thank you for choosing MediaMarkt Insurance! We are currently processing your policy application.

Your policy will be activated soon. You will receive a confirmation email once your policy is active.

Please log into your MediaMarkt Insurance Portal to track your application status.

Application Reference: {policy_number}

Thank you for your patience.

Best regards,
MediaMarkt Insurance Team'),

('policy', 'expired', 'Your MediaMarkt Insurance Policy Has Expired', 'Dear Customer,

Your MediaMarkt insurance policy has expired.

Policy Number: {policy_number}
Expiry Date: {renewal_date}

If you would like to renew your coverage, please contact us or log into your MediaMarkt Insurance Portal to explore renewal options.

Thank you for choosing MediaMarkt Insurance.

Best regards,
MediaMarkt Insurance Team'),

('policy', 'cancelled', 'Your MediaMarkt Insurance Policy Has Been Cancelled', 'Dear Customer,

Your MediaMarkt insurance policy has been cancelled as requested.

Policy Number: {policy_number}
Cancellation Date: {cancelled_date}

Please log into your MediaMarkt Insurance Portal to view your cancellation confirmation and any applicable refund information.

If this cancellation was made in error, please contact us immediately.

Best regards,
MediaMarkt Insurance Team'),

-- Claim Templates  
('claim', 'notified', 'MediaMarkt Insurance - Your Claim Has Been Received', 'Dear Customer,

We have received your insurance claim and our team is reviewing it.

Claim Number: {claim_number}
Policy Number: {policy_number}

Please log into your MediaMarkt Insurance Portal to:
• Track your claim status
• View submitted documentation
• Upload additional documents if needed

We will keep you updated on the progress of your claim.

Best regards,
MediaMarkt Claims Team'),

('claim', 'accepted', 'MediaMarkt Insurance - Your Claim Has Been Accepted', 'Dear Customer,

Great news! Your insurance claim has been accepted.

Claim Number: {claim_number}
Policy Number: {policy_number}

Please log into your MediaMarkt Insurance Portal to view:
• Acceptance details
• Next steps for claim fulfillment
• All claim documentation

We will guide you through the fulfillment process.

Best regards,
MediaMarkt Claims Team'),

('claim', 'rejected', 'MediaMarkt Insurance - Claim Decision Update', 'Dear Customer,

We have completed our review of your insurance claim.

Claim Number: {claim_number}
Policy Number: {policy_number}

Please log into your MediaMarkt Insurance Portal to view:
• Full decision details
• Explanation of decision
• Your appeal rights (if applicable)

If you have questions about this decision, our team is available to assist you.

Best regards,
MediaMarkt Claims Team'),

('claim', 'referred', 'MediaMarkt Insurance - Your Claim Requires Additional Review', 'Dear Customer,

Your insurance claim has been referred for additional review by our specialist team.

Claim Number: {claim_number}
Policy Number: {policy_number}

This is a standard process for certain types of claims to ensure we provide you with the best possible service.

Please log into your MediaMarkt Insurance Portal to:
• View referral details
• Track review progress
• See any additional information we may need

We appreciate your patience.

Best regards,
MediaMarkt Claims Team'),

('claim', 'referred_pending_info', 'MediaMarkt Insurance - Additional Information Required', 'Dear Customer,

We need some additional information to process your insurance claim.

Claim Number: {claim_number}
Policy Number: {policy_number}

Please log into your MediaMarkt Insurance Portal to:
• See what information is required
• Upload the requested documents
• View detailed instructions

Please provide this information at your earliest convenience to avoid delays in processing your claim.

Best regards,
MediaMarkt Claims Team'),

('claim', 'referred_info_received', 'MediaMarkt Insurance - Information Received', 'Dear Customer,

Thank you for providing the additional information for your claim.

Claim Number: {claim_number}
Policy Number: {policy_number}

We have received your documents and our team is now reviewing your claim.

Please log into your MediaMarkt Insurance Portal to track your claim progress.

Best regards,
MediaMarkt Claims Team'),

('claim', 'excess_due', 'MediaMarkt Insurance - Excess Payment Required', 'Dear Customer,

Your claim has been approved! To proceed with fulfillment, we require payment of your policy excess.

Claim Number: {claim_number}
Policy Number: {policy_number}
Excess Amount Due: {excess_amount}

Please log into your MediaMarkt Insurance Portal to:
• View payment details
• Make your excess payment
• See fulfillment timeline

Once payment is received, we will immediately begin processing your claim fulfillment.

Best regards,
MediaMarkt Claims Team'),

('claim', 'excess_paid_fulfillment_pending', 'MediaMarkt Insurance - Excess Payment Received', 'Dear Customer,

We have received your excess payment. Your claim fulfillment is now being arranged.

Claim Number: {claim_number}
Policy Number: {policy_number}

Please log into your MediaMarkt Insurance Portal to:
• View fulfillment status
• Track next steps
• See estimated timelines

We will update you as your claim progresses.

Best regards,
MediaMarkt Claims Team'),

('claim', 'fulfillment_inspection_booked', 'MediaMarkt Insurance - Inspection Appointment Scheduled', 'Dear Customer,

An inspection appointment has been scheduled for your claim.

Claim Number: {claim_number}
Policy Number: {policy_number}

Please log into your MediaMarkt Insurance Portal to:
• View appointment details
• See inspection location and time
• Access any preparation instructions

If you need to reschedule, please contact us as soon as possible.

Best regards,
MediaMarkt Claims Team'),

('claim', 'estimate_received', 'MediaMarkt Insurance - Repair Estimate Received', 'Dear Customer,

We have received a repair estimate for your claim.

Claim Number: {claim_number}
Policy Number: {policy_number}

Please log into your MediaMarkt Insurance Portal to:
• View the repair estimate
• See estimated repair timeline
• Review next steps

Our team is reviewing the estimate and will update you shortly.

Best regards,
MediaMarkt Claims Team'),

('claim', 'fulfillment_outcome', 'MediaMarkt Insurance - Claim Fulfillment Complete', 'Dear Customer,

Your claim fulfillment has been completed.

Claim Number: {claim_number}
Policy Number: {policy_number}

Please log into your MediaMarkt Insurance Portal to:
• View fulfillment details
• Download completion documents
• See any follow-up instructions

Thank you for choosing MediaMarkt Insurance.

Best regards,
MediaMarkt Claims Team'),

('claim', 'inbound_logistics', 'MediaMarkt Insurance - Device Collection Arranged', 'Dear Customer,

Collection of your device has been arranged as part of your claim fulfillment.

Claim Number: {claim_number}
Policy Number: {policy_number}

Please log into your MediaMarkt Insurance Portal to:
• View collection details
• See tracking information
• Access preparation instructions

Please ensure your device is ready for collection.

Best regards,
MediaMarkt Claims Team'),

('claim', 'repair', 'MediaMarkt Insurance - Your Device is Being Repaired', 'Dear Customer,

Your device is currently being repaired.

Claim Number: {claim_number}
Policy Number: {policy_number}

Please log into your MediaMarkt Insurance Portal to:
• Track repair progress
• View estimated completion date
• See repair details

We will notify you once the repair is complete.

Best regards,
MediaMarkt Claims Team'),

('claim', 'outbound_logistics', 'MediaMarkt Insurance - Your Device is Being Returned', 'Dear Customer,

Your repaired device is on its way back to you!

Claim Number: {claim_number}
Policy Number: {policy_number}

Please log into your MediaMarkt Insurance Portal to:
• Track your delivery
• View delivery timeline
• See tracking information

Thank you for your patience during the repair process.

Best regards,
MediaMarkt Claims Team'),

('claim', 'closed', 'MediaMarkt Insurance - Your Claim is Complete', 'Dear Customer,

Your insurance claim has been successfully completed and is now closed.

Claim Number: {claim_number}
Policy Number: {policy_number}

Please log into your MediaMarkt Insurance Portal to:
• View final claim summary
• Download all claim documents
• Access your claim history

Thank you for choosing MediaMarkt Insurance. We hope you are satisfied with our service.

Best regards,
MediaMarkt Claims Team');