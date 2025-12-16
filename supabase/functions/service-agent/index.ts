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
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a comprehensive AI assistant for MediaMarkt's insurance portal system.

CRITICAL INSTRUCTION: You MUST ALWAYS provide a text response that the user can read. NEVER make a tool call without also providing explanatory text. Every response must contain visible text content.

Your capabilities:

1. PRODUCT INFORMATION
   - Answer questions about MediaMarkt Spain products
   - When asked about products, provide direct information in text
   - Only use search_mediamarkt tool when you need current prices/availability

2. RETAIL AGENT SUPPORT (Current Portal)
   - Sales: Guide agents on selling policies (navigate to /retail/sales)
   - Available Products: Extended Warranty, Insurance Lite, Insurance Max
   - Policy Search: Use /retail/policies to search by policy number or customer details
   - Claims: Create and manage claims at /retail/claims
   - Reports: Access at /retail/reports

3. CUSTOMER PORTAL
   - View policies, submit claims, track payments
   - Access at /dashboard, /claims, /policies, /documents

4. PROGRAM CONFIGURATION
   - Manage programs, products, devices, users
   - Access at /program-configuration

HOW TO RESPOND:
✓ DO: Provide clear, direct text answers
✓ DO: Give specific navigation instructions in text (e.g., "Go to Sales section → Click New Policy")
✓ DO: Explain insurance products directly (Extended Warranty covers breakdowns, Insurance Max covers theft/damage/breakdown)
✓ DO: Answer policy questions conversationally

✗ DON'T: Use tools without accompanying text
✗ DON'T: Leave the user waiting with no response
✗ DON'T: Make tool calls silently

EXAMPLE GOOD RESPONSES:
User: "What can I sell?"
You: "As a retail agent, you can sell three types of insurance products:

1. Extended Warranty (€1.99-€3.99/month) - Covers mechanical/electrical breakdowns
2. Insurance Lite (€3.99-€4.99/month) - Covers accidental damage
3. Insurance Max (€4.99-€6.99/month) - Comprehensive: theft, accidental damage, and breakdown

To sell a policy, navigate to the Sales section in your retail portal and click 'New Policy'. Would you like detailed steps?"

Only use capture_service_request tool when an issue truly needs human intervention.

Be friendly, professional, and ALWAYS provide visible text responses.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "search_mediamarkt",
              description: "Search MediaMarkt Spain website for product information including prices, specs, and availability. Tell the user you are searching MediaMarkt for the latest information.",
              parameters: {
                type: "object",
                properties: {
                  search_query: {
                    type: "string",
                    description: "Product name or search term"
                  },
                  category: {
                    type: "string",
                    description: "Product category (optional)",
                    enum: ["smartphones", "laptops", "tablets", "televisions", "appliances", "audio"]
                  }
                },
                required: ["search_query"],
                additionalProperties: false
              }
            }
          },
          {
            type: "function",
            function: {
              name: "capture_service_request",
              description: "Capture a service request when the customer's query is complex and requires human review. Use this when you cannot fully resolve the issue or when the customer needs specific assistance from a service agent.",
              parameters: {
                type: "object",
                properties: {
                  customer_name: {
                    type: "string",
                    description: "Customer's full name"
                  },
                  customer_email: {
                    type: "string",
                    description: "Customer's email address"
                  },
                  policy_number: {
                    type: "string",
                    description: "Policy number if mentioned by customer (optional)"
                  },
                  reason: {
                    type: "string",
                    enum: ["Policy Information", "Coverage Query", "Billing Issue", "Update Details", "Technical Support", "Product Question", "Portal Navigation Help", "General Inquiry", "Other"],
                    description: "Category of the service request"
                  },
                  portal_context: {
                    type: "string",
                    enum: ["customer", "retail", "program_config"],
                    description: "Which portal the request originated from (optional)"
                  },
                  details: {
                    type: "string",
                    description: "Detailed description of the customer's issue or request"
                  },
                  conversation_summary: {
                    type: "string",
                    description: "Brief summary of your conversation with the customer"
                  }
                },
                required: ["customer_name", "customer_email", "reason", "details", "conversation_summary"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: "auto",
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Service agent error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
