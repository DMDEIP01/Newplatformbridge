import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { claimId, deviceCategory, coverageArea } = await req.json();

    if (!claimId) {
      return new Response(
        JSON.stringify({ error: "claimId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch claim details with program information
    const { data: claim, error: claimError } = await supabase
      .from("claims")
      .select(`
        *,
        policy:policies(
          *,
          product:products(*),
          program:programs(
            id,
            name,
            settings
          )
        )
      `)
      .eq("id", claimId)
      .single();

    if (claimError || !claim) {
      return new Response(
        JSON.stringify({ error: "Claim not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch repairers with their SLAs for the device category
    const { data: repairers, error: repairersError } = await supabase
      .from("repairers")
      .select(`
        *,
        slas:repairer_slas(*)
      `)
      .eq("is_active", true);

    console.log("Total active repairers found:", repairers?.length || 0);

    if (repairersError) {
      console.error("Error fetching repairers:", repairersError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch repairers" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get program countries for filtering
    const programCountries = claim.policy?.program?.settings?.countries || [];
    console.log("Program countries:", programCountries);
    
    // Country code to name mapping
    const countryCodeToName: { [key: string]: string } = {
      'DE': 'Germany',
      'ES': 'Spain',
      'FR': 'France',
      'IT': 'Italy',
      'NL': 'Netherlands',
      'BE': 'Belgium',
      'AT': 'Austria',
      'CH': 'Switzerland',
      'IE': 'Ireland',
      'UK': 'United Kingdom',
    };
    
    // German region mapping for broader coverage matching
    const germanRegionMapping: { [key: string]: string[] } = {
      'east germany': ['berlin', 'brandenburg', 'sachsen', 'saxony', 'sachsen-anhalt', 'thüringen', 'thuringia', 'mecklenburg', 'leipzig', 'dresden', 'chemnitz', 'potsdam', 'magdeburg', 'erfurt', 'jena', 'halle', 'rostock'],
      'west germany': ['nordrhein-westfalen', 'nrw', 'rheinland-pfalz', 'saarland', 'hessen', 'köln', 'düsseldorf', 'dortmund', 'essen', 'frankfurt', 'mainz', 'wiesbaden', 'bonn', 'aachen', 'ruhrgebiet'],
      'south germany': ['bayern', 'bavaria', 'baden-württemberg', 'münchen', 'munich', 'stuttgart', 'nürnberg', 'nuremberg', 'augsburg', 'freiburg', 'karlsruhe', 'mannheim', 'regensburg', 'ulm'],
      'north germany': ['schleswig-holstein', 'hamburg', 'bremen', 'niedersachsen', 'lower saxony', 'hannover', 'hanover', 'kiel', 'lübeck', 'braunschweig', 'oldenburg', 'osnabrück', 'wolfsburg'],
      'nationwide': ['germany', 'deutschland', 'all'],
      'germany': ['all'],
    };
    
    // Check if coverage area matches considering regional groupings
    const checkCoverageMatch = (coverageAreas: string[], targetArea: string): boolean => {
      if (!targetArea) return true;
      if (!coverageAreas || coverageAreas.length === 0) return true; // No coverage restrictions
      
      const targetLower = targetArea.toLowerCase();
      
      // Direct match
      if (coverageAreas.some(area => area.toLowerCase() === targetLower)) {
        return true;
      }
      
      // Check if any coverage area is a regional grouping that includes the target
      for (const area of coverageAreas) {
        const areaLower = area.toLowerCase();
        
        // Check if coverage area is a broad region that contains the target city
        for (const [region, cities] of Object.entries(germanRegionMapping)) {
          if (areaLower.includes(region) || region.includes(areaLower)) {
            if (cities.some(city => targetLower.includes(city) || city.includes(targetLower))) {
              return true;
            }
          }
        }
        
        // Check if target is in a region that matches the coverage area
        for (const [region, cities] of Object.entries(germanRegionMapping)) {
          if (cities.some(city => targetLower.includes(city) || city.includes(targetLower))) {
            if (areaLower.includes(region) || region.includes(areaLower)) {
              return true;
            }
          }
        }
        
        // Partial match (coverage area contains target or vice versa)
        if (areaLower.includes(targetLower) || targetLower.includes(areaLower)) {
          return true;
        }
      }
      
      // If coverage includes "Nationwide" or "Germany" or just the country name
      if (coverageAreas.some(area => {
        const areaLower = area.toLowerCase();
        return areaLower === 'nationwide' || areaLower === 'germany' || areaLower === 'deutschland';
      })) {
        return true;
      }
      
      return false;
    };
    
    // Filter repairers by specialization and coverage area
    // If a repairer has no country set (NULL), they're available for all programs
    const eligibleRepairers = repairers?.filter(repairer => {
      // Case-insensitive partial match for device category to handle singular/plural variations
      const hasSpecialization = !deviceCategory || 
        repairer.specializations?.some((spec: string) => {
          const specLower = spec.toLowerCase();
          const categoryLower = deviceCategory.toLowerCase();
          // Match if either contains the other (handles "TV" vs "TVs", "Smart TV" vs "Smart TVs")
          return specLower.includes(categoryLower) || categoryLower.includes(specLower);
        });
      
      // Use improved coverage matching
      const hasCoverage = checkCoverageMatch(repairer.coverage_areas || [], coverageArea || "");
      
      // Filter by program country
      // If repairer has no country set (NULL), they're available for all programs
      let matchesCountry = true;
      if (programCountries.length > 0 && repairer.country) {
        // Only filter by country if program has restrictions AND repairer has a country set
        const programCountryNames = programCountries.map((code: string) => 
          countryCodeToName[code] || code
        );
        
        matchesCountry = programCountryNames.some((country: string) => 
          country.toLowerCase() === repairer.country?.toLowerCase()
        );
      }
      
      console.log(`Repairer ${repairer.company_name}:`, {
        hasSpecialization,
        hasCoverage,
        matchesCountry,
        country: repairer.country,
        programCountries,
        specializations: repairer.specializations,
        coverageAreas: repairer.coverage_areas,
        deviceCategory,
        coverageArea
      });
      
      return hasSpecialization && hasCoverage && matchesCountry;
    }) || [];

    console.log("Eligible repairers after filtering:", eligibleRepairers.length);
    console.log("Eligible repairer names:", eligibleRepairers.map(r => r.company_name));

    // Build context for RAG - include IDs so AI can reference them
    const repairerContext = eligibleRepairers.map(r => {
      // Find matching SLA - use flexible matching like specializations
      const sla = r.slas?.find((s: any) => {
        const slaCategoryLower = s.device_category.toLowerCase();
        const deviceCategoryLower = (deviceCategory || "").toLowerCase();
        return slaCategoryLower.includes(deviceCategoryLower) || deviceCategoryLower.includes(slaCategoryLower);
      });
      return `
Repairer ID: ${r.id}
Company Name: ${r.company_name}
Location: ${r.city}, ${r.postcode}
Connectivity: ${r.connectivity_type}
Specializations: ${r.specializations?.join(", ") || "None"}
Coverage Areas: ${r.coverage_areas?.join(", ") || "None"}
${sla ? `SLA for ${deviceCategory}:
  - Response time: ${sla.response_time_hours}h
  - Repair time: ${sla.repair_time_hours}h
  - Availability: ${sla.availability_hours}
  - Quality score: ${sla.quality_score}/5.00
  - Success rate: ${sla.success_rate}%
  ${sla.notes ? `- Notes: ${sla.notes}` : ""}
` : "No SLA configured for this category"}
`;
    }).join("\n---\n");

    if (eligibleRepairers.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "No repairers available for this device category and coverage area",
          claim,
          eligibleRepairers: [],
          recommendations: {
            recommendations: [],
            overall_analysis: "No repairers found matching the criteria"
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const claimContext = `
Claim Details:
- Claim Number: ${claim.claim_number}
- Type: ${claim.claim_type}
- Status: ${claim.status}
- Description: ${claim.description}
- Product Condition: ${claim.product_condition || "Not specified"}
- Device Category: ${deviceCategory || "Not specified"}
- Coverage Area: ${coverageArea || "Not specified"}
`;

    const systemPrompt = `You are a claims fulfillment advisor for an insurance program. Your role is to analyze repairer SLA data and recommend the best repairer for a given claim.

Consider:
1. Response time - faster is better for urgent claims
2. Repair time - total turnaround time
3. Quality score - higher is better
4. Success rate - higher is better
5. Geographic proximity and coverage
6. Specializations matching the device category
7. Availability hours

CRITICAL: 
- Only recommend repairers from the provided list below
- Use the EXACT Repairer ID and Company Name as shown in the data
- Do not make up or suggest repairers not in the list
- Provide a ranked list of up to 3 repairers (or fewer if less are available)
- Score each repairer from 0-100 (percentage), where 100 is a perfect match
- DO NOT mention connectivity type (API/SFTP) in your key advantages or reasoning`;

    const userPrompt = `${claimContext}

Available Repairers (ONLY recommend from this list):
${repairerContext}

Please recommend the top 3 repairers (or fewer if less available) for this claim. You MUST use the exact Repairer ID and Company Name shown above. Do not recommend any repairers not in this list.`;

    // Call Lovable AI with tool calling for structured output
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "recommend_repairers",
              description: "Return top 3 repairer recommendations with reasoning. IMPORTANT: Only recommend repairers from the provided list. Use exact company names and IDs.",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        repairer_id: { 
                          type: "string",
                          description: "The exact UUID of the repairer from the provided list"
                        },
                        repairer_name: { 
                          type: "string",
                          description: "The exact company name of the repairer as provided"
                        },
                        rank: { type: "integer" },
                        score: { type: "number" },
                        reasoning: { type: "string" },
                        key_advantages: {
                          type: "array",
                          items: { type: "string" }
                        }
                      },
                      required: ["repairer_id", "repairer_name", "rank", "score", "reasoning", "key_advantages"],
                      additionalProperties: false
                    }
                  },
                  overall_analysis: { type: "string" }
                },
                required: ["recommendations", "overall_analysis"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "recommend_repairers" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      return new Response(
        JSON.stringify({ error: "No recommendations generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const recommendations = JSON.parse(toolCall.function.arguments);

    const responseData = {
      claim,
      eligibleRepairers: eligibleRepairers.map(r => ({
        id: r.id,
        name: r.company_name,
        connectivity_type: r.connectivity_type,
        slas: r.slas
      })),
      recommendations
    };
    
    console.log("Returning response with:", {
      eligibleRepairersCount: eligibleRepairers.length,
      recommendationsCount: recommendations.recommendations?.length || 0
    });

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in claims-fulfillment-advisor:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
