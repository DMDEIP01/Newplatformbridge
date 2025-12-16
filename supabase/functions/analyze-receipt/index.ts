import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, expectedDevice } = await req.json();
    
    console.log('Receipt analysis request received:', {
      hasImage: !!imageBase64,
      expectedDevice: expectedDevice || 'none provided'
    });
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No receipt file provided" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Detect file type from base64 data URI
    const isPdf = imageBase64.startsWith('data:application/pdf');
    const fileType = isPdf ? 'PDF' : 'image';
    console.log(`Analyzing receipt (${fileType}) with AI...`);

    // Build the content array based on file type
    const userContent: any[] = [
      {
        type: 'text',
        text: 'Extract device information from this receipt/invoice. Return ONLY the JSON object, no other text.'
      }
    ];

    if (isPdf) {
      // For PDFs, extract the base64 data and use inline_data format
      const base64Data = imageBase64.replace(/^data:application\/pdf;base64,/, '');
      userContent.push({
        type: 'file',
        file: {
          filename: 'receipt.pdf',
          file_data: `data:application/pdf;base64,${base64Data}`
        }
      });
    } else {
      // For images, use the standard image_url format
      userContent.push({
        type: 'image_url',
        image_url: {
          url: imageBase64
        }
      });
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert at extracting information from receipts and invoices. Analyze the document (image or PDF) and extract key product information.

IMPORTANT: Look carefully for serial numbers, IMEI numbers, or any unique device identifiers. They may appear:
- Near the product description or model number
- In a barcode or QR code area
- In a separate "Serial Number", "S/N", "IMEI", "Serial", or "SN" field
- Near the bottom of the receipt
- In item details or specifications section

Return ONLY valid JSON with this exact structure:
{
  "deviceCategory": "extracted device category/product type (e.g., Smartphone, Laptop, TV, etc.) or null if not found",
  "serialNumber": "extracted serial number/IMEI/S/N or null if not found - look for any unique alphanumeric identifier associated with the product",
  "rrp": "extracted price/RRP as a number or null if not found",
  "dateOfSale": "extracted date in YYYY-MM-DD format or null if not found",
  "manufacturer": "brand/manufacturer name or null if not found",
  "model": "product model or null if not found",
  "confidence": {
    "deviceCategory": "high, medium, low, or none",
    "serialNumber": "high, medium, low, or none",
    "rrp": "high, medium, low, or none",
    "dateOfSale": "high, medium, low, or none"
  }
}`
          },
          {
            role: 'user',
            content: userContent
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: `AI analysis failed: ${errorText || response.statusText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    let analysisText = data.choices[0].message.content;
    
    console.log('AI Receipt Analysis:', analysisText);

    // Extract JSON from the response (handle markdown code blocks)
    const jsonMatch = analysisText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || 
                     analysisText.match(/(\{[\s\S]*?\})/);
    
    if (jsonMatch) {
      analysisText = jsonMatch[1];
    }

    try {
      const receiptInfo = JSON.parse(analysisText);
      
      // Device category synonyms and keyword mappings
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
      
      // Function to find category from text
      const findCategory = (text: string): string | null => {
        const lowerText = text.toLowerCase();
        for (const [category, keywords] of Object.entries(categoryMappings)) {
          if (keywords.some(keyword => lowerText.includes(keyword))) {
            return category;
          }
        }
        return null;
      };
      
      // Validate extracted data against expected device if provided
      const validation: any = {
        deviceCategory: { found: !!receiptInfo.deviceCategory, matches: false },
        serialNumber: { found: !!receiptInfo.serialNumber, matches: false },
        rrp: { found: !!receiptInfo.rrp, matches: false },
        dateOfSale: { found: !!receiptInfo.dateOfSale, matches: false }
      };

      if (expectedDevice) {
        console.log('Comparing with expected device:', expectedDevice);
        
        // Check device category match with smart synonym handling
        if (receiptInfo.deviceCategory && expectedDevice.category) {
          const normalizedExtracted = receiptInfo.deviceCategory.toLowerCase().trim();
          const normalizedExpected = expectedDevice.category.toLowerCase().trim();
          
          // Try direct match first
          let matches = normalizedExtracted.includes(normalizedExpected) || 
                       normalizedExpected.includes(normalizedExtracted);
          
          // If no direct match, try category-based matching
          if (!matches) {
            const extractedCategory = findCategory(normalizedExtracted);
            const expectedCategory = findCategory(normalizedExpected);
            
            console.log('Category matching:', { 
              extracted: normalizedExtracted, 
              expected: normalizedExpected,
              extractedCategory,
              expectedCategory 
            });
            
            if (extractedCategory && expectedCategory && extractedCategory === expectedCategory) {
              matches = true;
            }
          }
          
          validation.deviceCategory.matches = matches;
        }

        // Check serial number match
        if (receiptInfo.serialNumber && expectedDevice.serial) {
          console.log('Serial number comparison:', {
            extracted: receiptInfo.serialNumber,
            expected: expectedDevice.serial
          });
          validation.serialNumber.matches = 
            receiptInfo.serialNumber.toLowerCase().trim() === 
            expectedDevice.serial.toLowerCase().trim();
        } else {
          console.log('Serial number not found or not expected:', {
            extractedSerial: receiptInfo.serialNumber,
            expectedSerial: expectedDevice.serial
          });
        }

        // Check RRP match (within reasonable range - ±20%)
        if (receiptInfo.rrp && expectedDevice.rrp) {
          const extractedRRP = parseFloat(receiptInfo.rrp);
          const expectedRRP = parseFloat(expectedDevice.rrp);
          const tolerance = expectedRRP * 0.2;
          validation.rrp.matches = 
            Math.abs(extractedRRP - expectedRRP) <= tolerance;
          console.log('RRP comparison:', {
            extracted: extractedRRP,
            expected: expectedRRP,
            tolerance,
            matches: validation.rrp.matches
          });
        }

        // Date of sale just needs to be found
        validation.dateOfSale.matches = !!receiptInfo.dateOfSale;
      }

      const result = {
        ...receiptInfo,
        validation,
        allFieldsFound: validation.deviceCategory.found && 
                       validation.serialNumber.found && 
                       validation.rrp.found && 
                       validation.dateOfSale.found,
        allFieldsMatch: validation.deviceCategory.matches && 
                       validation.serialNumber.matches && 
                       validation.rrp.matches && 
                       validation.dateOfSale.matches
      };

      console.log('Parsed receipt info with validation:', result);

      return new Response(
        JSON.stringify(result),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError, 'Raw text:', analysisText);
      
      // Return a fallback response
      return new Response(
        JSON.stringify({
          deviceCategory: null,
          serialNumber: null,
          rrp: null,
          dateOfSale: null,
          manufacturer: null,
          model: null,
          confidence: {
            deviceCategory: "none",
            serialNumber: "none",
            rrp: "none",
            dateOfSale: "none"
          },
          validation: {
            deviceCategory: { found: false, matches: false },
            serialNumber: { found: false, matches: false },
            rrp: { found: false, matches: false },
            dateOfSale: { found: false, matches: false }
          },
          allFieldsFound: false,
          allFieldsMatch: false,
          error: "Could not extract information from receipt"
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in analyze-receipt function:', {
      error,
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    });
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: `Analysis error: ${errorMessage}` }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
