import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResendRequest {
  communicationId: string;
}

serve(async (req) => {
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

    const { communicationId }: ResendRequest = await req.json();

    if (!communicationId) {
      throw new Error("communicationId is required");
    }

    console.log(`Resending communication: ${communicationId}`);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the communication with policy details
    const { data: communication, error: commError } = await supabase
      .from("policy_communications")
      .select(`
        id,
        subject,
        message_body,
        policy_id,
        policies!inner(customer_email, customer_name)
      `)
      .eq("id", communicationId)
      .single();

    if (commError || !communication) {
      console.error("Error fetching communication:", commError);
      throw new Error(`Communication not found: ${communicationId}`);
    }

    const customerEmail = (communication.policies as any).customer_email;
    const subject = communication.subject;
    const htmlContent = communication.message_body;

    console.log(`Resending "${subject}" to ${customerEmail}`);

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
          subject: subject,
        }],
        from: {
          email: "noreply@mediamarkt-insurance.com",
          name: "MediaMarkt Insurance"
        },
        content: [{
          type: "text/html",
          value: htmlContent,
        }],
      }),
    });

    if (!sendgridResponse.ok) {
      const errorText = await sendgridResponse.text();
      console.error("SendGrid API error:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    console.log(`Email resent successfully to ${customerEmail}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Email "${subject}" resent to ${customerEmail}` 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error resending communication:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
