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
    const { imageBase64, insuredDeviceCategory } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
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

    console.log('Analyzing device with AI...');

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
            content: `You are an expert device identification and damage assessment specialist. Analyze the image and extract device information in JSON format.

Return ONLY valid JSON with this exact structure:
{
  "deviceCategory": "one of: Smartphone, Tablet, Laptop, Desktop Computer, Smart Watch, Headphones, Camera, Gaming Console, Smart TV, Home Appliance, Other",
  "brand": "device brand/manufacturer name (e.g., Apple, Samsung, Sony)",
  "model": "specific model if visible (or 'Unknown' if not visible)",
  "color": "primary color of the device",
  "faultCategory": "one of: Screen Issues, Battery Problems, Physical Damage, Water Damage, Software/Performance, Audio Issues, Camera Issues, Charging Issues, Connectivity Issues, Button/Port Issues",
  "specificIssue": "detailed description of the main issue (e.g., Cracked Screen, Dead Pixels, Battery Draining Fast, Water Exposure, etc.)",
  "damageType": "one of: Screen Damage, Water Damage, Physical Impact, Scratches/Scuffs, Broken Parts, Multiple Issues, No Visible Damage",
  "affectedAreas": ["list of affected areas like: Screen, Back Panel, Camera, Buttons, Ports, etc."],
  "severityLevel": "MUST be exactly one of: Critical - Device unusable, High - Major functionality affected, Medium - Some features not working, Low - Minor inconvenience",
  "explanation": "brief 1-2 sentence description of what you see and the damage assessment",
  "hasVisiblePhysicalDamage": true or false (true if any cracks, dents, scratches, broken parts, or water damage are visible),
  "physicalDamageDescription": "detailed description of visible physical damage, or null if none detected"
}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this device image and provide comprehensive device identification and damage assessment. Return ONLY the JSON object, no other text.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64
                }
              }
            ]
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
    
    console.log('AI Analysis:', analysisText);

    // Extract JSON from the response (handle markdown code blocks)
    const jsonMatch = analysisText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || 
                     analysisText.match(/(\{[\s\S]*?\})/);
    
    if (jsonMatch) {
      analysisText = jsonMatch[1];
    }

    try {
      const deviceInfo = JSON.parse(analysisText);
      
      // Validate and provide defaults
      const result: any = {
        deviceCategory: deviceInfo.deviceCategory || "Other",
        brand: deviceInfo.brand || "Unknown",
        model: deviceInfo.model || "Unknown",
        color: deviceInfo.color || "Unknown",
        faultCategory: deviceInfo.faultCategory || "Physical Damage",
        specificIssue: deviceInfo.specificIssue || "Unspecified damage",
        damageType: deviceInfo.damageType || "Physical Impact",
        affectedAreas: Array.isArray(deviceInfo.affectedAreas) ? deviceInfo.affectedAreas : ["Unknown"],
        severityLevel: deviceInfo.severityLevel || "Medium - Some features not working",
        explanation: deviceInfo.explanation || analysisText,
        hasVisiblePhysicalDamage: deviceInfo.hasVisiblePhysicalDamage || false,
        physicalDamageDescription: deviceInfo.physicalDamageDescription || null
      };
      
      // Normalize severity level to match dropdown options
      if (result.severityLevel.includes("Critical")) {
        result.severityLevel = "Critical - Device unusable";
      } else if (result.severityLevel.includes("High")) {
        result.severityLevel = "High - Major functionality affected";
      } else if (result.severityLevel.includes("Medium")) {
        result.severityLevel = "Medium - Some features not working";
      } else if (result.severityLevel.includes("Low")) {
        result.severityLevel = "Low - Minor inconvenience";
      }
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
      const findCategory = (text: string): string | null => {
        const lowerText = text.toLowerCase();
        for (const [category, keywords] of Object.entries(categoryMappings)) {
          if (keywords.some(keyword => lowerText.includes(keyword))) {
            return category;
          }
        }
        return null;
      };

      // Check for device category mismatch with smart matching
      if (insuredDeviceCategory) {
        const detectedCategory = result.deviceCategory.toLowerCase();
        const insuredCategory = insuredDeviceCategory.toLowerCase();
        
        // Try direct match first
        let isMismatch = !detectedCategory.includes(insuredCategory) && !insuredCategory.includes(detectedCategory);
        
        // If direct match fails, try smart category matching
        if (isMismatch) {
          const detectedNormalized = findCategory(detectedCategory);
          const insuredNormalized = findCategory(insuredCategory);
          
          console.log('Category matching:', { 
            detected: detectedCategory, 
            insured: insuredCategory,
            detectedNormalized,
            insuredNormalized 
          });
          
          // If both map to same category, it's not a mismatch
          if (detectedNormalized && insuredNormalized && detectedNormalized === insuredNormalized) {
            isMismatch = false;
          }
        }
        
        if (isMismatch && result.deviceCategory !== "Other" && result.deviceCategory !== "Unknown") {
          result.deviceMismatch = true;
          result.mismatchWarning = `The photo appears to show a ${result.deviceCategory}, but the insured device is a ${insuredDeviceCategory}. Please verify you've uploaded the correct photo.`;
        } else {
          result.deviceMismatch = false;
        }
      }

      console.log('Parsed device info:', result);

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
          deviceCategory: "Other",
          brand: "Unknown",
          model: "Unknown",
          color: "Unknown",
          faultCategory: "Physical Damage",
          specificIssue: "Unspecified damage",
          damageType: "Physical Impact",
          affectedAreas: ["Unknown"],
          severityLevel: "Medium - Some features not working",
          explanation: analysisText,
          deviceMismatch: false,
          hasVisiblePhysicalDamage: false,
          physicalDamageDescription: null
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in analyze-device function:', {
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
