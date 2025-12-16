import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ClaimUploadRequest {
  claimId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { claimId }: ClaimUploadRequest = await req.json();

    if (!claimId) {
      return new Response(
        JSON.stringify({ error: "Claim ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch claim details using service role to bypass RLS
    const { data: claim, error: claimError } = await supabase
      .from("claims")
      .select(`
        id,
        claim_number,
        status,
        claim_type,
        submitted_date,
        user_id,
        policies!inner (
          id,
          policy_number,
          customer_name,
          customer_email,
          products!inner (
            name
          )
        )
      `)
      .eq("id", claimId)
      .single();

    if (claimError || !claim) {
      console.error("Error fetching claim:", claimError);
      return new Response(
        JSON.stringify({ error: "Claim not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if link is expired (48 hours)
    const { data: communication, error: commError } = await supabase
      .from("policy_communications")
      .select("sent_at")
      .eq("claim_id", claimId)
      .eq("communication_type", "claim")
      .order("sent_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let isExpired = false;
    if (communication && communication.sent_at) {
      const sentAt = new Date(communication.sent_at);
      const now = new Date();
      const hoursSinceEmail = (now.getTime() - sentAt.getTime()) / (1000 * 60 * 60);
      isExpired = hoursSinceEmail > 48;
    }

    // Fetch existing documents count
    const { data: documents, error: docsError } = await supabase
      .from("documents")
      .select("document_type, document_subtype")
      .eq("claim_id", claimId);

    const uploadedFiles = { photos: 0, receipt: 0, other: 0 };
    documents?.forEach(doc => {
      if (doc.document_type === "photo") uploadedFiles.photos++;
      else if (doc.document_type === "receipt") uploadedFiles.receipt++;
      else uploadedFiles.other++;
    });

    return new Response(
      JSON.stringify({
        claim,
        isExpired,
        uploadedFiles,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in get-claim-upload-details:", error);
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
