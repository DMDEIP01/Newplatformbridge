import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";
import { wrapEmailContent } from "../_shared/email-template.ts";
import { getLogoBase64 } from "../_shared/logo-base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TemplatedEmailRequest {
  policyId: string;
  claimId?: string;
  templateId: string;
  status?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { policyId, claimId, templateId, status }: TemplatedEmailRequest = await req.json();

    console.log("Fetching template:", templateId);

    // Fetch template
    const { data: template, error: templateError } = await supabase
      .from("communication_templates")
      .select("*")
      .eq("id", templateId)
      .eq("is_active", true)
      .single();

    if (templateError || !template) {
      throw new Error(`Template not found or inactive: ${templateId}`);
    }

    console.log("Fetching policy data:", policyId);

    // Fetch policy data
    const { data: policy, error: policyError } = await supabase
      .from("policies")
      .select(`
        *,
        products (
          name,
          product_name_external
        )
      `)
      .eq("id", policyId)
      .single();

    if (policyError || !policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    let claimData = null;
    if (claimId) {
      console.log("Fetching claim data:", claimId);
      const { data: claim, error: claimError } = await supabase
        .from("claims")
        .select("*")
        .eq("id", claimId)
        .single();

      if (!claimError && claim) {
        claimData = claim;
      }
    }

    // Replace variables in template
    let messageBody = template.message_body;
    let subject = template.subject;

    const replacements: Record<string, string> = {
      "{customer_name}": policy.customer_name || "Customer",
      "{policy_number}": policy.policy_number || "",
      "{product_name}": policy.products?.name || policy.products?.product_name_external || "",
      "{start_date}": policy.start_date ? new Date(policy.start_date).toLocaleDateString() : "",
      "{renewal_date}": policy.renewal_date ? new Date(policy.renewal_date).toLocaleDateString() : "",
      "{status}": status || policy.status || "",
    };

    if (claimData) {
      replacements["{claim_number}"] = claimData.claim_number || "";
      replacements["{claim_type}"] = claimData.claim_type || "";
      replacements["{claim_status}"] = status || claimData.status || "";
      replacements["{submitted_date}"] = claimData.submitted_date 
        ? new Date(claimData.submitted_date).toLocaleDateString() 
        : "";
    }

    // Apply replacements
    for (const [key, value] of Object.entries(replacements)) {
      messageBody = messageBody.replace(new RegExp(key, "g"), value);
      subject = subject.replace(new RegExp(key, "g"), value);
    }

    console.log("Calling send-email function");

    // Build action URL for the email button - link to customer portal
    const projectUrl = supabaseUrl.replace('.supabase.co', '.lovable.app');
    const actionUrl = claimId 
      ? `${projectUrl}/customer/claims/${claimId}`
      : `${projectUrl}/customer/policies`;

    // Get logo as base64 for email embedding
    const logoBase64 = await getLogoBase64(supabaseUrl);

    // Wrap content in branded HTML template with embedded logo
    const brandedHtml = await wrapEmailContent(messageBody, subject, actionUrl, logoBase64);

    // Call send-email function
    const { data: emailResult, error: emailError } = await supabase.functions.invoke("send-email", {
      body: {
        to: policy.customer_email,
        subject: subject,
        html: brandedHtml,
        policyId: policyId,
        claimId: claimId || null,
        communicationType: template.type,
      },
    });

    if (emailError) {
      throw emailError;
    }

    console.log("Email sent successfully via send-email function");

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Templated email sent successfully",
        emailResult 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-templated-email function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);
