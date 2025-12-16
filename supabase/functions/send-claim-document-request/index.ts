import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { wrapEmailContent } from "../_shared/email-template.ts";
import { getLogoBase64 } from "../_shared/logo-base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ClaimDocumentRequest {
  claimId: string;
  claimNumber: string;
  customerEmail: string;
  customerName: string;
  policyNumber: string;
  productName: string;
  policyId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!sendgridApiKey) {
      throw new Error("SENDGRID_API_KEY is not configured");
    }

    const { 
      claimId, 
      claimNumber, 
      customerEmail, 
      customerName,
      policyNumber,
      productName,
      policyId
    }: ClaimDocumentRequest = await req.json();

    console.log("Sending claim document request email:", { claimNumber, customerEmail });

    // Create upload link pointing to the dedicated customer document upload page
    const appUrl = Deno.env.get("APP_URL") || "https://220034a8-5ba8-413d-8890-60b951d410f2.lovableproject.com";
    const uploadLink = `${appUrl}/claim-upload/${claimId}`;

    // Get logo as base64 for email embedding
    const logoBase64 = await getLogoBase64(supabaseUrl);

    const emailContent = `
      <p style="font-size: 16px; margin-bottom: 20px;">Dear ${customerName},</p>
      
      <p style="font-size: 16px; margin-bottom: 20px;">
        Your claim <strong>${claimNumber}</strong> has been registered successfully. To proceed with your claim, please upload the required supporting documents using the link below.
      </p>

      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #666;">Claim Number:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #e30613; font-size: 18px;">${claimNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #666;">Policy Number:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #333;">${policyNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: 600; color: #666;">Product:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #333;">${productName}</td>
          </tr>
        </table>
      </div>

      <h2 style="color: #333; font-size: 20px; margin: 30px 0 15px;">Documents Required</h2>
      <ul style="margin: 0 0 25px 20px; padding: 0;">
        <li style="margin-bottom: 10px;">📸 Photos of the damaged/faulty device</li>
        <li style="margin-bottom: 10px;">🧾 Proof of purchase (receipt or invoice)</li>
        <li style="margin-bottom: 10px;">📋 Any additional supporting documents</li>
      </ul>

      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 4px;">
        <p style="margin: 0; color: #856404; font-size: 14px;">
          <strong>⚠️ Important:</strong> This upload link will expire in 48 hours. Please upload your documents as soon as possible to avoid delays.
        </p>
      </div>

      <h2 style="color: #333; font-size: 20px; margin: 30px 0 15px;">What Happens Next?</h2>
      <div style="margin: 0 0 20px;">
        <div style="margin-bottom: 15px;">
          <span style="color: #e30613; font-size: 20px; margin-right: 10px;">1️⃣</span>
          <span style="font-size: 14px;">Click the button above to access the upload page</span>
        </div>
        <div style="margin-bottom: 15px;">
          <span style="color: #e30613; font-size: 20px; margin-right: 10px;">2️⃣</span>
          <span style="font-size: 14px;">Upload photos and supporting documents</span>
        </div>
        <div style="margin-bottom: 15px;">
          <span style="color: #e30613; font-size: 20px; margin-right: 10px;">3️⃣</span>
          <span style="font-size: 14px;">Our team will review your documents and process your claim</span>
        </div>
        <div style="margin-bottom: 15px;">
          <span style="color: #e30613; font-size: 20px; margin-right: 10px;">4️⃣</span>
          <span style="font-size: 14px;">You'll receive a decision within 24-48 hours</span>
        </div>
      </div>

      <p style="font-size: 14px; color: #666; margin-top: 30px;">
        If you have any questions or need assistance, please don't hesitate to contact our support team.
      </p>
    `;

    const emailHtml = await wrapEmailContent(
      emailContent, 
      `Upload Documents - Claim ${claimNumber}`,
      uploadLink,
      logoBase64
    );

    // Send email using SendGrid API
    const sendgridResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${sendgridApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: customerEmail }],
          subject: `Action Required: Upload Documents for Claim ${claimNumber}`,
        }],
        from: {
          email: "noreply@mediamarkt-insurance.com",
          name: "MediaMarkt Insurance"
        },
        content: [{
          type: "text/html",
          value: emailHtml,
        }],
      }),
    });

    if (!sendgridResponse.ok) {
      const errorText = await sendgridResponse.text();
      console.error("SendGrid API error:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    console.log("Email sent successfully via SendGrid");
    const messageId = sendgridResponse.headers.get("x-message-id");

    // Store communication record in database
    if (policyId) {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.81.0");
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { error: dbError } = await supabase
        .from("policy_communications")
        .insert({
          policy_id: policyId,
          claim_id: claimId,
          communication_type: "claim",
          subject: `Action Required: Upload Documents for Claim ${claimNumber}`,
          message_body: emailHtml,
          status: "sent",
          sent_at: new Date().toISOString(),
        });

      if (dbError) {
        console.error("Error storing communication record:", dbError);
        // Don't throw error, email was sent successfully
      } else {
        console.log("Communication record stored successfully");
      }
    }

    return new Response(JSON.stringify({
      success: true,
      emailId: messageId 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending claim document request email:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
