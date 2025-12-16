import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PolicyDocumentRequest {
  policyId: string;
  policyNumber: string;
  customerName: string;
  customerEmail: string;
  customerAddress: {
    line1: string;
    line2?: string;
    city: string;
    postcode: string;
  };
  productName: string;
  monthlyPremium: number;
  excess: number;
  startDate: string;
  renewalDate: string;
  coveredItems: Array<{
    product_name: string;
    model?: string;
    serial_number?: string;
    purchase_price?: number;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData: PolicyDocumentRequest = await req.json();
    console.log('Generating documents for policy:', requestData.policyNumber);

    // Get the policy's user_id
    const { data: policyData, error: policyError } = await supabase
      .from('policies')
      .select('user_id')
      .eq('id', requestData.policyId)
      .single();

    if (policyError || !policyData) {
      throw new Error('Failed to fetch policy user_id');
    }

    const documents = [];

    // Generate IPID (Insurance Product Information Document)
    const ipidContent = generateIPID(requestData);
    const ipidPath = `${requestData.policyId}/ipid_${requestData.policyNumber}.txt`;
    await uploadDocument(supabase, ipidPath, ipidContent);
    documents.push({ type: 'ipid', path: ipidPath, name: `IPID_${requestData.policyNumber}.txt` });

    // Generate Terms & Conditions
    const termsContent = generateTermsAndConditions(requestData);
    const termsPath = `${requestData.policyId}/terms_${requestData.policyNumber}.txt`;
    await uploadDocument(supabase, termsPath, termsContent);
    documents.push({ type: 'terms_conditions', path: termsPath, name: `Terms_${requestData.policyNumber}.txt` });

    // Generate Policy Schedule
    const scheduleContent = generatePolicySchedule(requestData);
    const schedulePath = `${requestData.policyId}/schedule_${requestData.policyNumber}.txt`;
    await uploadDocument(supabase, schedulePath, scheduleContent);
    documents.push({ type: 'policy_schedule', path: schedulePath, name: `Schedule_${requestData.policyNumber}.txt` });

    // Store document records in database
    for (const doc of documents) {
      const { error: docError } = await supabase
        .from('documents')
        .insert({
          policy_id: requestData.policyId,
          user_id: policyData.user_id,
          document_type: 'policy',
          document_subtype: doc.type,
          file_name: doc.name,
          file_path: doc.path,
          file_size: new Blob([doc.type === 'ipid' ? ipidContent : doc.type === 'terms_conditions' ? termsContent : scheduleContent]).size,
        });

      if (docError) {
        console.error('Error storing document record:', docError);
      }
    }

    // Mock email sending (will be implemented later)
    console.log(`[MOCK EMAIL] Sending documents to ${requestData.customerEmail}`);
    console.log(`[MOCK EMAIL] Documents: IPID, Terms & Conditions, Policy Schedule`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        documents,
        message: 'Documents generated successfully. Email sending is mocked for now.'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error generating documents:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

async function uploadDocument(supabase: any, path: string, content: string) {
  const { error } = await supabase.storage
    .from('policy-documents')
    .upload(path, new Blob([content], { type: 'text/plain' }), {
      contentType: 'text/plain',
      upsert: true,
    });

  if (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
}

function generateIPID(data: PolicyDocumentRequest): string {
  return `
INSURANCE PRODUCT INFORMATION DOCUMENT
=====================================

Policy Number: ${data.policyNumber}
Product: ${data.productName}

What is this type of insurance?
This is an extended warranty insurance policy that provides coverage for your electronic devices beyond the manufacturer's warranty.

What is insured?
✓ Accidental damage
✓ Mechanical breakdown
✓ Electrical failure
✓ Liquid damage
✓ Screen damage

What is not insured?
✗ Cosmetic damage that doesn't affect functionality
✗ Loss or theft
✗ Damage caused by unauthorized repairs
✗ Pre-existing faults

Are there any restrictions on cover?
! Excess of £${data.excess} applies to each claim
! Maximum 2 claims per year
! Device must be less than 12 months old at policy start

Where am I covered?
✓ Coverage applies in the United Kingdom

What are my obligations?
- Pay your monthly premium of £${data.monthlyPremium}
- Report claims within 30 days of incident
- Provide proof of purchase when required

When and how do I pay?
Monthly premium: £${data.monthlyPremium}
Payment starts: ${new Date(data.startDate).toLocaleDateString()}

When does the cover start and end?
Start date: ${new Date(data.startDate).toLocaleDateString()}
End date: ${new Date(data.renewalDate).toLocaleDateString()}
(Automatically renews unless cancelled)

How do I cancel the contract?
You can cancel at any time by contacting us. If you cancel within 14 days, you'll receive a full refund.

Document generated: ${new Date().toLocaleString()}
`;
}

function generateTermsAndConditions(data: PolicyDocumentRequest): string {
  return `
TERMS AND CONDITIONS
===================

Policy Number: ${data.policyNumber}
Policyholder: ${data.customerName}

1. DEFINITIONS
1.1 "We", "us", "our" means the insurance provider
1.2 "You", "your" means the policyholder
1.3 "Device" means the covered electronic equipment listed in the policy schedule

2. COVERAGE
2.1 Subject to the terms and conditions, we will repair or replace your device if it suffers:
    a) Accidental damage
    b) Mechanical breakdown
    c) Electrical failure
    d) Liquid damage
    e) Screen damage

3. EXCLUSIONS
3.1 This policy does not cover:
    a) Loss or theft
    b) Cosmetic damage
    c) Pre-existing conditions
    d) Unauthorized repairs
    e) Intentional damage

4. CLAIMS PROCEDURE
4.1 You must notify us of any claim within 30 days
4.2 You must provide proof of purchase if requested
4.3 An excess of £${data.excess} applies to each claim
4.4 Maximum of 2 claims per policy year

5. PREMIUM
5.1 Monthly premium: £${data.monthlyPremium}
5.2 Payment must be made on or before the due date
5.3 Failure to pay may result in policy cancellation

6. CANCELLATION
6.1 You may cancel at any time with 30 days notice
6.2 Cancellation within 14 days results in full refund
6.3 After 14 days, refunds are pro-rata

7. GENERAL CONDITIONS
7.1 You must take reasonable care of your device
7.2 All information provided must be accurate
7.3 Any changes must be notified to us within 14 days

8. COMPLAINTS
8.1 If you're unhappy, please contact our customer service team
8.2 We aim to resolve all complaints within 8 weeks

Effective Date: ${new Date(data.startDate).toLocaleDateString()}
Document generated: ${new Date().toLocaleString()}
`;
}

function generatePolicySchedule(data: PolicyDocumentRequest): string {
  const itemsList = data.coveredItems.map((item, idx) => 
    `${idx + 1}. ${item.product_name}
   Model: ${item.model || 'N/A'}
   Serial Number: ${item.serial_number || 'N/A'}
   Purchase Price: £${item.purchase_price || 'N/A'}`
  ).join('\n\n');

  return `
POLICY SCHEDULE
===============

Policy Number: ${data.policyNumber}

POLICYHOLDER DETAILS
Name: ${data.customerName}
Email: ${data.customerEmail}
Address: ${data.customerAddress.line1}
${data.customerAddress.line2 ? data.customerAddress.line2 + '\n' : ''}${data.customerAddress.city}
${data.customerAddress.postcode}

POLICY DETAILS
Product: ${data.productName}
Start Date: ${new Date(data.startDate).toLocaleDateString()}
Renewal Date: ${new Date(data.renewalDate).toLocaleDateString()}
Monthly Premium: £${data.monthlyPremium}
Excess: £${data.excess}

COVERED ITEMS
${itemsList}

IMPORTANT INFORMATION
- This policy automatically renews annually unless cancelled
- Premium may be reviewed at renewal
- Claims must be reported within 30 days of incident
- Maximum 2 claims per policy year
- Excess of £${data.excess} applies to each claim

CONTACT INFORMATION
Email: support@insurance.example.com
Phone: 0800 123 4567
Hours: Monday-Friday, 9am-5pm

Document generated: ${new Date().toLocaleString()}
Policy issued by: MediaMarkt Insurance Services
`;
}

serve(handler);
