import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Device category synonyms and keyword mappings for smart matching
const categoryMappings: Record<string, string[]> = {
  'tv': ['tv', 'television', 'smart tv', 'led tv', 'oled', 'qled', 'lcd', 'neo qled', 'qn90', 'qn85', 'qn95', 'samsung q', 'lg oled', 'sony bravia'],
  'smartphone': ['smartphone', 'phone', 'mobile', 'iphone', 'galaxy', 'pixel', 'android phone', 'cell phone'],
  'laptop': ['laptop', 'notebook', 'macbook', 'chromebook', 'ultrabook', 'portable computer'],
  'tablet': ['tablet', 'ipad', 'galaxy tab', 'surface'],
  'desktop': ['desktop', 'pc', 'computer', 'imac', 'mac mini', 'workstation'],
  'monitor': ['monitor', 'display', 'screen'],
  'headphones': ['headphones', 'earbuds', 'earphones', 'airpods', 'wireless earbuds'],
  'speaker': ['speaker', 'soundbar', 'home audio', 'bluetooth speaker'],
  'camera': ['camera', 'dslr', 'mirrorless', 'digital camera', 'camcorder'],
  'gaming': ['gaming console', 'playstation', 'xbox', 'nintendo', 'ps5', 'ps4'],
  'watch': ['watch', 'smartwatch', 'apple watch', 'galaxy watch'],
  'appliance': ['washer', 'dryer', 'refrigerator', 'fridge', 'dishwasher', 'microwave', 'oven', 'air conditioner'],
};

// Function to find normalized category from text
function findCategory(text: string): string | null {
  const lowerText = text.toLowerCase();
  for (const [category, keywords] of Object.entries(categoryMappings)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return category;
    }
  }
  return null;
}

// Function to check if two device descriptions match (using smart matching)
function devicesMatch(detected: string, expected: string): boolean {
  const detectedLower = detected.toLowerCase();
  const expectedLower = expected.toLowerCase();
  
  // Direct match first
  if (detectedLower.includes(expectedLower) || expectedLower.includes(detectedLower)) {
    return true;
  }
  
  // Smart category matching
  const detectedNormalized = findCategory(detectedLower);
  const expectedNormalized = findCategory(expectedLower);
  
  console.log('Smart matching:', { 
    detected, 
    expected,
    detectedNormalized,
    expectedNormalized 
  });
  
  // If both map to same category, they match
  if (detectedNormalized && expectedNormalized && detectedNormalized === expectedNormalized) {
    return true;
  }
  
  return false;
}

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
4. Device must be clearly visible and identifiable
5. Report the detected device category accurately

DEVICE CATEGORY DETECTION:
- Identify what type of device is shown (TV, Smartphone, Laptop, Tablet, etc.)
- Be specific about the device category you detect
- If you see a TV, report deviceCategory as the TV model/type (e.g., "Smart TV", "Samsung TV", "OLED TV")

CONFIDENCE SCORING RULES (BE STRICT):
- 0.0-0.3: Invalid images (screenshots, no device, wrong content)
- 0.3-0.5: Poor quality, unclear, partially visible device, or significant uncertainty
- 0.5-0.7: Average quality, device visible but some details unclear or minor issues
- 0.7-0.9: Good quality, clear device image, most details visible
- 0.9-1.0: ONLY for perfect images - crystal clear, well-lit, device fully visible, no ambiguity whatsoever

Analyze and return JSON:
{
  "isValid": boolean (true only if real physical device visible),
  "validationIssue": "string or null (e.g., 'Screenshot detected', 'No product visible')",
  "deviceCategory": "string - the actual device type you see (e.g., 'Smart TV', 'iPhone', 'MacBook', 'Samsung Galaxy')",
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
5. Extract the product name/category from the receipt

PRODUCT EXTRACTION:
- Identify what product is listed on the receipt
- Report the product category/name as it appears on the receipt
- Be specific (e.g., "Samsung 65\" TV", "iPhone 15 Pro", "MacBook Air")

CONFIDENCE SCORING RULES (BE STRICT):
- 0.0-0.3: Invalid (not a receipt, screenshot, product photo, unreadable)
- 0.3-0.5: Poor quality or missing multiple required fields
- 0.5-0.7: Readable but missing some information or partially obscured
- 0.7-0.9: Good receipt with most required information visible
- 0.9-1.0: ONLY for perfect receipts - all fields clearly visible and legible

Analyze and return JSON:
{
  "isValid": boolean (true only if valid receipt/invoice),
  "validationIssue": "string or null (e.g., 'Not a receipt', 'Missing purchase information')",
  "deviceCategory": "string - the product name/category from the receipt",
  "hasRequiredInfo": boolean (has date, product, price, seller),
  "findings": ["what you can see", "what's missing"],
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
    
    // Apply smart device matching if we have device info
    let deviceMismatch = false;
    let mismatchWarning = null;
    
    if (deviceInfo && analysis.deviceCategory) {
      const matches = devicesMatch(analysis.deviceCategory, deviceInfo.name);
      if (!matches && analysis.deviceCategory !== "Unknown" && analysis.deviceCategory !== "Other") {
        deviceMismatch = true;
        mismatchWarning = `Device mismatch detected: Expected "${deviceInfo.name}" but found "${analysis.deviceCategory}"`;
        console.log(mismatchWarning);
      } else {
        console.log(`Device match confirmed: "${analysis.deviceCategory}" matches "${deviceInfo.name}"`);
      }
    }
    
    // Build assessment message based on validation
    let assessment = "";
    if (documentType === "photo") {
      if (!analysis.isValid) {
        assessment = `⚠️ INVALID: ${analysis.validationIssue || 'Image does not show a valid physical device'}`;
      } else if (deviceMismatch) {
        assessment = `⚠️ DEVICE MISMATCH: ${mismatchWarning}. ${analysis.hasPhysicalDamage ? 'Damage detected: ' + analysis.damageDescription : 'No visible damage.'}`;
      } else {
        assessment = `✓ Valid device photo. Device: ${analysis.deviceCategory || 'Unknown'}. ${analysis.hasPhysicalDamage ? 'Damage detected: ' + analysis.damageDescription : 'No visible damage.'}`;
      }
    } else if (documentType === "receipt") {
      if (!analysis.isValid) {
        assessment = `⚠️ INVALID: ${analysis.validationIssue || 'Not a valid receipt or proof of purchase'}`;
      } else if (deviceMismatch) {
        assessment = `⚠️ PRODUCT MISMATCH: ${mismatchWarning}. ${analysis.hasRequiredInfo ? 'Receipt contains required information.' : 'Some information may be missing.'}`;
      } else {
        assessment = `✓ Valid proof of purchase. Product: ${analysis.deviceCategory || 'Unknown'}. ${analysis.hasRequiredInfo ? 'Contains required information.' : 'Some information may be missing.'}`;
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
      deviceMismatch,
      mismatchWarning,
      hasPhysicalDamage: analysis.hasPhysicalDamage || false,
      hasRequiredInfo: analysis.hasRequiredInfo || false,
      productMatches: !deviceMismatch
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

    const { claimId } = await req.json();

    if (!claimId) {
      return new Response(
        JSON.stringify({ error: "Missing claimId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Re-analyzing documents for claim ${claimId}...`);

    // Get actual covered device details from the claim's policy
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
    const deviceInfo = coveredItem ? {
      name: coveredItem.product_name,
      model: coveredItem.model,
      price: coveredItem.purchase_price
    } : null;

    console.log("Using device info:", deviceInfo);

    // Get all image documents for this claim (photos and receipts)
    const { data: documents, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("claim_id", claimId)
      .in("document_type", ["photo", "receipt"]);

    if (docError) {
      console.error("Error fetching documents:", docError);
      throw new Error(`Failed to fetch documents: ${docError.message}`);
    }

    if (!documents || documents.length === 0) {
      return new Response(
        JSON.stringify({ error: "No documents found for this claim" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${documents.length} documents to re-analyze`);

    const results = [];

    // Process each document
    for (const doc of documents) {
      console.log(`Processing document ${doc.id} - ${doc.document_type}`);

      // Download file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("claim-documents")
        .download(doc.file_path);

      if (downloadError || !fileData) {
        console.error(`Failed to download ${doc.file_path}:`, downloadError);
        results.push({
          documentId: doc.id,
          fileName: doc.file_name,
          status: "error",
          error: "Failed to download file"
        });
        continue;
      }

      // Check if it's an image file
      if (!doc.file_name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        console.log(`Skipping non-image file: ${doc.file_name}`);
        results.push({
          documentId: doc.id,
          fileName: doc.file_name,
          status: "skipped",
          reason: "Not an image file"
        });
        continue;
      }

      // Convert to base64
      const arrayBuffer = await fileData.arrayBuffer();
      const base64 = base64Encode(arrayBuffer);
      const mimeType = doc.file_name.endsWith('.png') ? 'image/png' : 'image/jpeg';
      const imageBase64 = `data:${mimeType};base64,${base64}`;

      // Run AI analysis
      const aiAnalysis = await analyzeImage(imageBase64, doc.document_type, deviceInfo || undefined);

      if (aiAnalysis) {
        // Update document metadata with new analysis
        const { error: updateError } = await supabase
          .from("documents")
          .update({
            metadata: { ai_analysis: aiAnalysis }
          })
          .eq("id", doc.id);

        if (updateError) {
          console.error(`Failed to update document ${doc.id}:`, updateError);
          results.push({
            documentId: doc.id,
            fileName: doc.file_name,
            status: "error",
            error: "Failed to update document"
          });
        } else {
          console.log(`Successfully updated document ${doc.id}`);
          results.push({
            documentId: doc.id,
            fileName: doc.file_name,
            documentType: doc.document_type,
            status: "success",
            analysis: aiAnalysis
          });
        }
      } else {
        results.push({
          documentId: doc.id,
          fileName: doc.file_name,
          status: "error",
          error: "AI analysis failed"
        });
      }
    }

    console.log("Re-analysis complete:", results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        totalProcessed: results.length,
        successful: results.filter(r => r.status === "success").length,
        failed: results.filter(r => r.status === "error").length,
        skipped: results.filter(r => r.status === "skipped").length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in reanalyze-claim-documents:", error);
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
