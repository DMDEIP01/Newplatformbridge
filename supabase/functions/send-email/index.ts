import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";
import { wrapEmailContent } from "../_shared/email-template.ts";
import { getLogoBase64 } from "../_shared/logo-base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  policyId?: string;
  claimId?: string;
  complaintId?: string;
  communicationType?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY")!;

    if (!sendgridApiKey) {
      throw new Error("SENDGRID_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { to, subject, html, policyId, claimId, complaintId, communicationType }: EmailRequest = await req.json();

    console.log("Sending email to:", to);
    console.log("Subject:", subject);

    // Get logo and wrap content with MediaMarkt branding
    const logoBase64 = await getLogoBase64(supabaseUrl);
    // Build action URL for customer portal
    const projectUrl = supabaseUrl.replace('.supabase.co', '.lovable.app');
    const actionUrl = claimId 
      ? `${projectUrl}/customer/claims/${claimId}`
      : policyId 
        ? `${projectUrl}/customer/policies`
        : undefined;
    const brandedHtml = await wrapEmailContent(html, subject, actionUrl, logoBase64);

    // Send email using SendGrid API
    const sendgridResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${sendgridApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }],
          subject: subject,
        }],
        from: {
          email: "noreply@mediamarkt-insurance.com",
          name: "MediaMarkt Insurance"
        },
        content: [{
          type: "text/html",
          value: brandedHtml,
        }],
      }),
    });

    if (!sendgridResponse.ok) {
      const errorText = await sendgridResponse.text();
      console.error("SendGrid API error:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    console.log("Email sent successfully via SendGrid");
    const emailResult = { success: true, id: sendgridResponse.headers.get("x-message-id") };

    // Store communication record if policyId is provided
    if (policyId) {
      const { error: dbError } = await supabase
        .from("policy_communications")
        .insert({
          policy_id: policyId,
          claim_id: claimId || null,
          complaint_id: complaintId || null,
          communication_type: communicationType || "email",
          subject: subject,
          message_body: brandedHtml,
          status: "sent",
          sent_at: new Date().toISOString(),
        });

      if (dbError) {
        console.error("Error storing communication record:", dbError);
        // Don't throw error, email was sent successfully
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailResult.id,
        message: "Email sent successfully" 
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
    console.error("Error in send-email function:", error);
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
