import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, html: providedHtml, sourceUrl } = await req.json();
    
    if (!url && !providedHtml) {
      return new Response(
        JSON.stringify({ error: "URL or HTML content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let html: string;
    const targetUrl = url || sourceUrl || "provided-html";

    if (providedHtml) {
      // Use provided HTML directly
      console.log("Using provided HTML content");
      html = providedHtml;
    } else {
      // Fetch the website HTML with browser-like headers
      console.log("Fetching website:", url);
      const websiteResponse = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
          "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          "Sec-Ch-Ua-Mobile": "?0",
          "Sec-Ch-Ua-Platform": '"Windows"',
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1"
        }
      });
      
      if (!websiteResponse.ok) {
        // Return a proper response for bot protection errors
        if (websiteResponse.status === 403 || websiteResponse.status === 401 || websiteResponse.status === 503) {
          console.log(`Website blocked with status ${websiteResponse.status}`);
          return new Response(
            JSON.stringify({ 
              success: false,
              error: `Website blocked (${websiteResponse.status}). This site has bot protection. Please use the 'Paste HTML' method instead.`,
              errorCode: "BOT_PROTECTION"
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw new Error(`Failed to fetch website: ${websiteResponse.status}`);
      }
      
      html = await websiteResponse.text();
    }
    
    // Extract a reasonable portion of HTML for analysis (first 50KB)
    const truncatedHtml = html.substring(0, 50000);

    // Use Lovable AI to analyze the branding
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a brand identity extraction expert. Analyze the provided HTML and extract the brand's visual identity. Return a JSON object with the following structure:
{
  "colors": {
    "primary": "HSL value like '0 85% 52%'",
    "secondary": "HSL value",
    "accent": "HSL value",
    "background": "HSL value",
    "foreground": "HSL value",
    "muted": "HSL value",
    "success": "HSL value (use a green)",
    "warning": "HSL value (use an orange/yellow)",
    "destructive": "HSL value (use a red)"
  },
  "fonts": {
    "primary": "Font family name",
    "heading": "Font family name for headings"
  },
  "borderRadius": "CSS value like '0.5rem'",
  "logoUrl": "URL of the main logo if found, or null"
}

Extract colors from:
- CSS variables
- Inline styles
- Link colors, button colors
- Background colors
- Brand elements

Convert all colors to HSL format (just the values, like "0 85% 52%" without the hsl() wrapper).
If you can't find a specific color, make an educated guess based on the overall brand feel.`
          },
          {
            role: "user",
            content: `Analyze this website HTML and extract the brand identity:\n\nURL: ${targetUrl}\n\nHTML:\n${truncatedHtml}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_branding",
              description: "Extract brand identity from website",
              parameters: {
                type: "object",
                properties: {
                  colors: {
                    type: "object",
                    properties: {
                      primary: { type: "string", description: "Primary brand color in HSL format" },
                      secondary: { type: "string", description: "Secondary color in HSL format" },
                      accent: { type: "string", description: "Accent color in HSL format" },
                      background: { type: "string", description: "Background color in HSL format" },
                      foreground: { type: "string", description: "Text color in HSL format" },
                      muted: { type: "string", description: "Muted background color in HSL format" },
                      success: { type: "string", description: "Success color in HSL format" },
                      warning: { type: "string", description: "Warning color in HSL format" },
                      destructive: { type: "string", description: "Error/destructive color in HSL format" }
                    },
                    required: ["primary", "secondary", "accent", "background", "foreground"]
                  },
                  fonts: {
                    type: "object",
                    properties: {
                      primary: { type: "string", description: "Primary font family" },
                      heading: { type: "string", description: "Heading font family" }
                    },
                    required: ["primary"]
                  },
                  borderRadius: { type: "string", description: "Border radius value" },
                  logoUrl: { type: "string", description: "URL of the logo if found" }
                },
                required: ["colors", "fonts"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_branding" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add more credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI response error:", errorText);
      throw new Error("Failed to analyze branding");
    }

    const aiData = await aiResponse.json();
    console.log("AI response:", JSON.stringify(aiData, null, 2));
    
    // Extract the tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No branding data extracted");
    }

    const branding = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ 
        success: true, 
        branding,
        sourceUrl: targetUrl
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error extracting branding:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to extract branding" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
