import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessClaimRequest {
  claimId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { claimId }: ProcessClaimRequest = await req.json();

    console.log("Processing claim automatically:", claimId);

    // Fetch claim details
    const { data: claim, error: claimError } = await supabase
      .from("claims")
      .select(`
        id,
        claim_number,
        claim_type,
        description,
        has_receipt,
        user_id,
        policies!inner (
          id,
          policy_number,
          customer_name,
          customer_email,
          product_id,
          products!inner (
            name,
            type,
            excess_1,
            coverage,
            peril_details
          )
        )
      `)
      .eq("id", claimId)
      .single();

    if (claimError || !claim) {
      throw new Error("Claim not found");
    }

    // Extract policy and product (they come as arrays from join)
    const policy = Array.isArray(claim.policies) ? claim.policies[0] : claim.policies;
    const product = Array.isArray(policy.products) ? policy.products[0] : policy.products;

    // Fetch uploaded documents
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("document_type, file_name")
      .eq("claim_id", claimId);

    if (docsError) {
      console.error("Error fetching documents:", docsError);
    }

    const hasPhotos = documents?.some(d => d.document_type === "photo") || false;
    const hasReceipt = documents?.some(d => d.document_type === "receipt") || false;

    // Use AI to analyze the claim
    const analysisPrompt = `
You are an insurance claims assessor. Analyze this claim and provide a decision.

Claim Details:
- Claim Number: ${claim.claim_number}
- Claim Type: ${claim.claim_type}
- Product: ${product.name}
- Coverage: ${product.coverage.join(", ")}
- Description: ${claim.description}

Documents Provided:
- Photos: ${hasPhotos ? "Yes" : "No"}
- Receipt: ${hasReceipt ? "Yes" : "No"}

Based on the information provided, determine if the claim should be:
1. ACCEPTED - All requirements met, claim is clearly valid and straightforward
2. REFERRED - Needs manual review by claims team (use this for any uncertainty or missing information)

IMPORTANT: Never reject a claim automatically. If there are any concerns, missing information, or uncertainty, always REFER the claim for manual review.

Provide your decision and a brief reason (max 200 characters).
`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an insurance claims assessor. Respond with a clear decision and brief reason." },
          { role: "user", content: analysisPrompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "process_claim_decision",
            description: "Process the claim decision",
            parameters: {
              type: "object",
              properties: {
                decision: {
                  type: "string",
                  enum: ["accepted", "referred"],
                  description: "The claim decision - only accept or refer, never reject automatically"
                },
                reason: {
                  type: "string",
                  description: "Brief reason for the decision (max 200 characters)"
                }
              },
              required: ["decision", "reason"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "process_claim_decision" } }
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI analysis failed:", await aiResponse.text());
      throw new Error("Failed to analyze claim");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No decision received from AI");
    }

    const { decision, reason } = JSON.parse(toolCall.function.arguments);
    
    console.log("AI Decision:", decision, "Reason:", reason);

    // Determine new status based on decision
    let newStatus = "notified";
    let decisionValue = null;
    
    if (decision === "accepted") {
      newStatus = "accepted";
      decisionValue = "approved";
    } else if (decision === "referred") {
      newStatus = "referred";
      decisionValue = "pending_review";
    } else {
      // Fallback: if somehow a rejected decision comes through, convert it to referred
      console.warn("Unexpected decision received, converting to referred:", decision);
      newStatus = "referred";
      decisionValue = "pending_review";
    }

    // Update claim with decision
    const { error: updateError } = await supabase
      .from("claims")
      .update({
        status: newStatus,
        decision: decisionValue,
        decision_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", claimId);

    if (updateError) {
      console.error("Error updating claim:", updateError);
      throw updateError;
    }

    // Add status history
    await supabase
      .from("claim_status_history")
      .insert({
        claim_id: claimId,
        status: newStatus,
        notes: `Automatic decision: ${reason}`,
      });

    // If accepted, create fulfillment record
    if (decision === "accepted") {
      const { error: fulfillmentError } = await supabase
        .from("claim_fulfillment")
        .insert({
          claim_id: claimId,
          status: "pending_excess",
          excess_amount: product.excess_1,
          notes: "Claim automatically approved. Awaiting excess payment to proceed with fulfillment.",
        });

      if (fulfillmentError) {
        console.error("Error creating fulfillment:", fulfillmentError);
      }
    }

    // Send decision email
    const emailSubject = decision === "accepted" 
      ? `Claim Approved - ${claim.claim_number}`
      : `Claim Under Review - ${claim.claim_number}`;

    const emailBody = decision === "accepted"
      ? `Dear ${policy.customer_name},

Good news! Your claim ${claim.claim_number} has been approved.

Decision: ${reason}

Next Steps:
${product.excess_1 > 0 
  ? `1. Pay the excess amount of €${product.excess_1}
2. Once payment is received, we'll begin the fulfillment process
3. You can track your claim progress in the customer portal`
  : `1. We'll begin the fulfillment process immediately
2. You can track your claim progress in the customer portal`}

Log in to your customer portal to view details and track progress.

Thank you for choosing our insurance service.`
      : `Dear ${policy.customer_name},

Your claim ${claim.claim_number} is currently under review by our claims team.

Reason: ${reason}

We'll notify you once a decision has been made. This typically takes 24-48 hours.

Thank you for your patience.`;

    // Send email
    const { error: emailError } = await supabase.functions.invoke("send-email", {
      body: {
        to: policy.customer_email,
        subject: emailSubject,
        html: emailBody.replace(/\n/g, '<br>'),
        policyId: policy.id,
        claimId: claim.id,
      }
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        decision,
        reason,
        newStatus,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in process-claim-automatically:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
