import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper function to analyze image with AI
async function analyzeImage(imageBase64: string, documentType: string, deviceInfo?: { name: string; model?: string; price?: number }) {
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableApiKey) {
    console.log("LOVABLE_API_KEY not set, skipping AI analysis");
    return null;
  }

  try {
    let prompt = "";
    
    if (documentType === "photo") {
      const deviceDescription = deviceInfo 
        ? `Expected device: ${deviceInfo.name}${deviceInfo.model ? ` (Model: ${deviceInfo.model})` : ''}` 
        : 'Device type unknown';
      
      prompt = `CRITICAL: You are analyzing a claim photo for insurance validation. Be STRICT and PRECISE.

${deviceDescription}

VALIDATION RULES (MUST follow):
1. Check if image shows an ACTUAL PHYSICAL DEVICE (not screenshots, web pages, documents, or digital content)
2. If it's a screenshot, webpage, or digital content: isValid=false, confidence=0.1
3. If no device is visible: isValid=false, confidence=0.2
4. Device must match the EXACT expected device name/type provided above
5. Device must be clearly visible and identifiable

DEVICE MATCHING:
- Compare the visible device against the expected device name
- If they don't match (e.g., expected TV but found Mobile Phone): isValid=false
- Report the device mismatch clearly in validationIssue

CONFIDENCE SCORING RULES (BE STRICT):
- 0.0-0.3: Invalid images (screenshots, no device, wrong device type, wrong content)
- 0.3-0.5: Poor quality, unclear, partially visible device, or significant uncertainty
- 0.5-0.7: Average quality, device visible but some details unclear or minor issues
- 0.7-0.9: Good quality, clear device image, most details visible
- 0.9-1.0: ONLY for perfect images - crystal clear, well-lit, device fully visible, no ambiguity whatsoever

Analyze and return JSON:
{
  "isValid": boolean (true only if real physical device visible AND matches expected device),
  "validationIssue": "string or null (e.g., 'Screenshot detected', 'No product visible', 'Wrong device type - Expected TV but found Mobile Phone')",
  "deviceCategory": "string or null (the actual device you see)",
  "hasPhysicalDamage": boolean,
  "damageDescription": "string",
  "severityLevel": "No Issues" | "Minor - Cosmetic damage only" | "Medium - Some features not working" | "Severe - Device not functional",
  "findings": ["finding1", "finding2"],
  "confidence": 0.0-1.0 (MUST follow scoring rules above - be harsh on quality)
}`;
    } else if (documentType === "receipt") {
      const deviceDescription = deviceInfo 
        ? `Expected purchase: ${deviceInfo.name}${deviceInfo.model ? ` (Model: ${deviceInfo.model})` : ''}${deviceInfo.price ? ` at approximately £${deviceInfo.price}` : ''}` 
        : 'Device details unknown';
      
      prompt = `CRITICAL: You are validating a proof of purchase/receipt for insurance claims. Be STRICT.

${deviceDescription}

VALIDATION RULES:
1. Must be a REAL receipt/invoice (not screenshots of websites, product photos, or random documents)
2. Must show: purchase date, product details, price/amount, seller/store name
3. Must be legible and not heavily obscured
4. If it's a product photo, screenshot, or webpage: isValid=false
5. Product details on receipt must match the expected device name/model above

PRODUCT MATCHING:
- Compare the product listed on receipt against expected device
- If they don't match (e.g., expected TV but receipt shows Mobile Phone): Flag this clearly
- Small variations in naming are OK (e.g., "Samsung TV" vs "Samsung Television")
- Model number should match if both are available

CONFIDENCE SCORING RULES (BE STRICT):
- 0.0-0.3: Invalid (not a receipt, screenshot, product photo, unreadable, wrong product)
- 0.3-0.5: Poor quality or missing multiple required fields or product mismatch
- 0.5-0.7: Readable but missing some information or partially obscured
- 0.7-0.9: Good receipt with most required information visible and product matches
- 0.9-1.0: ONLY for perfect receipts - all fields clearly visible and legible, product matches exactly

Analyze and return JSON:
{
  "isValid": boolean (true only if valid receipt/invoice),
  "validationIssue": "string or null (e.g., 'Not a receipt', 'Missing purchase information', 'Product mismatch - Expected TV but receipt shows Mobile Phone')",
  "hasRequiredInfo": boolean (has date, product, price, seller),
  "productMatches": boolean (product on receipt matches expected device),
  "findings": ["what you can see", "what's missing or wrong", "product match status"],
  "confidence": 0.0-1.0 (MUST follow scoring rules above - be harsh on quality)
}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: { url: imageBase64 }
              }
            ]
          }
        ],
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI analysis error:", response.status, errorText);
      return null;
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) return null;

    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const analysis = JSON.parse(jsonMatch[0]);
    
    // Build assessment message based on validation
    let assessment = "";
    if (documentType === "photo") {
      if (!analysis.isValid) {
        assessment = `⚠️ INVALID: ${analysis.validationIssue || 'Image does not show a valid physical device'}`;
      } else {
        assessment = `✓ Valid device photo. Device: ${analysis.deviceCategory || 'Unknown'}. ${analysis.hasPhysicalDamage ? 'Damage detected: ' + analysis.damageDescription : 'No visible damage.'}`;
      }
    } else if (documentType === "receipt") {
      if (!analysis.isValid) {
        assessment = `⚠️ INVALID: ${analysis.validationIssue || 'Not a valid receipt or proof of purchase'}`;
      } else {
        assessment = `✓ Valid proof of purchase. ${analysis.hasRequiredInfo ? 'Contains required information.' : 'Some information may be missing.'}`;
      }
    }
    
    return {
      assessment,
      isValid: analysis.isValid || false,
      validationIssue: analysis.validationIssue || null,
      severityLevel: analysis.severityLevel || null,
      findings: analysis.findings || [],
      confidence: analysis.confidence || 0,
      deviceCategory: analysis.deviceCategory || null,
      hasPhysicalDamage: analysis.hasPhysicalDamage || false,
      hasRequiredInfo: analysis.hasRequiredInfo || false
    };
  } catch (error) {
    console.error("Error in AI analysis:", error);
    return null;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const claimId = formData.get("claimId") as string;
    const documentType = formData.get("documentType") as string;
    const claimNumber = formData.get("claimNumber") as string;
    const userId = formData.get("userId") as string;

    if (!file || !claimId || !documentType || !claimNumber || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: "File exceeds 10MB limit" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: "Invalid file format. Only JPG, PNG, and PDF are allowed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const fileName = `${claimNumber}_${documentType}_${timestamp}.${fileExt}`;
    const filePath = `claim-documents/${claimId}/${fileName}`;

    // Upload to storage using service role
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("claim-documents")
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error(`Failed to upload to storage: ${uploadError.message}`);
    }

    // Perform AI analysis for both photos and receipts
    let metadata: any = null;
    if ((documentType === "photo" || documentType === "receipt") && file.type.startsWith('image/')) {
      console.log(`Performing AI analysis on ${documentType}...`);
      
      // Convert file to base64 using Deno's standard library
      const base64 = base64Encode(fileBuffer);
      const imageBase64 = `data:${file.type};base64,${base64}`;
      
      // Get actual covered device details from the claim's policy
      let deviceInfo = null;
      const { data: claimData } = await supabase
        .from("claims")
        .select(`
          policies!inner(
            covered_items(product_name, model, purchase_price)
          )
        `)
        .eq("id", claimId)
        .single();
      
      const coveredItem = (claimData?.policies as any)?.covered_items;
      if (coveredItem) {
        deviceInfo = {
          name: coveredItem.product_name,
          model: coveredItem.model,
          price: coveredItem.purchase_price
        };
        console.log("Using covered device info:", deviceInfo);
      }
      
      const aiAnalysis = await analyzeImage(imageBase64, documentType, deviceInfo || undefined);
      
      if (aiAnalysis) {
        metadata = { ai_analysis: aiAnalysis };
        console.log("AI analysis completed:", aiAnalysis);
      }
    }

    // Create document record using service role
    const { error: docError } = await supabase
      .from("documents")
      .insert({
        claim_id: claimId,
        user_id: userId,
        document_type: documentType,
        document_subtype: documentType === "receipt" ? "receipt" : "other",
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        metadata: metadata,
      });

    if (docError) {
      console.error("Database insert error:", docError);
      // Try to clean up the uploaded file
      await supabase.storage.from("claim-documents").remove([filePath]);
      throw new Error(`Failed to create document record: ${docError.message}`);
    }

    console.log("File uploaded successfully:", fileName);

    // Check if this is the last required document and trigger automatic processing
    const { data: allDocs } = await supabase
      .from("documents")
      .select("document_type")
      .eq("claim_id", claimId);

    const hasPhotos = allDocs?.some(d => d.document_type === "photo") || false;
    const hasReceipt = allDocs?.some(d => d.document_type === "receipt") || false;

    // If we have both photos and receipt, trigger automatic processing
    if (hasPhotos && hasReceipt) {
      console.log("All documents uploaded, triggering automatic claim processing");
      
      // Trigger claim processing without waiting for it to complete
      supabase.functions.invoke("process-claim-automatically", {
        body: { claimId }
      }).then(response => {
        if (response.error) {
          console.error("Error processing claim:", response.error);
        } else {
          console.log("Claim processed successfully:", response.data);
        }
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        fileName,
        filePath,
        processingTriggered: hasPhotos && hasReceipt,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in upload-claim-document:", error);
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
