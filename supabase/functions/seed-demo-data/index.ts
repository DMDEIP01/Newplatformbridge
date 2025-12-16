import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Get the user from the JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    console.log("Seeding data for user:", user.id);

    // Add customer role to current user
    const { error: customerRoleError } = await supabase
      .from("user_roles")
      .upsert({ user_id: user.id, role: "customer" });

    if (customerRoleError) console.log("Customer role error:", customerRoleError);

    // Create a test consultant account
    const { data: consultantUser, error: consultantError } = await supabase.auth.admin.createUser({
      email: "consultant@test.com",
      password: "Test123456!",
      email_confirm: true,
      user_metadata: {
        full_name: "Test Consultant"
      }
    });

    if (!consultantError && consultantUser.user) {
      console.log("Consultant user created:", consultantUser.user.id);
      
      // Add consultant role
      await supabase.from("user_roles").insert({
        user_id: consultantUser.user.id,
        role: "consultant"
      });
    }

    // Get product IDs
    const { data: products } = await supabase
      .from("products")
      .select("id, name, excess, monthly_premium")
      .in("name", ["Extended Warranty 3", "Insurance Max 4"]);

    if (!products || products.length === 0) {
      throw new Error("Products not found");
    }

    const extendedWarranty = products.find(p => p.name === "Extended Warranty 3");
    const insuranceMax = products.find(p => p.name === "Insurance Max 4");

    // Create policies
    const { data: policies, error: policiesError } = await supabase
      .from("policies")
      .insert([
        {
          user_id: user.id,
          product_id: extendedWarranty?.id,
          policy_number: `EW-2024-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`,
          status: "active",
          start_date: "2024-01-15",
          renewal_date: "2025-01-15",
        },
        {
          user_id: user.id,
          product_id: insuranceMax?.id,
          policy_number: `IM-2024-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`,
          status: "active",
          start_date: "2024-02-01",
          renewal_date: "2025-02-01",
        },
      ])
      .select();

    if (policiesError) throw policiesError;

    // Add covered items
    await supabase.from("covered_items").insert([
      {
        policy_id: policies[0].id,
        product_name: 'Samsung 55" Smart TV',
        model: "UE55AU7100",
        serial_number: "SN123456789",
        purchase_price: 799.00,
      },
      {
        policy_id: policies[1].id,
        product_name: "Bosch Washing Machine",
        model: "WAU28T64GB",
        serial_number: "SN987654321",
        purchase_price: 1249.00,
      },
    ]);

    // Create a claim
    const { data: claims } = await supabase
      .from("claims")
      .insert([
        {
          policy_id: policies[0].id,
          user_id: user.id,
          claim_number: `CLM-2024-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`,
          claim_type: "breakdown",
          status: "repair",
          product_condition: "moderate",
          description: "TV screen not displaying properly, vertical lines appearing",
          has_receipt: true,
          decision: "accepted",
          decision_reason: "Valid claim with proof of purchase",
        },
      ])
      .select();

    if (claims && claims[0]) {
      // Add claim status history
      await supabase.from("claim_status_history").insert([
        { claim_id: claims[0].id, status: "notified", notes: "Claim received" },
        { claim_id: claims[0].id, status: "accepted", notes: "Claim approved" },
        { claim_id: claims[0].id, status: "inbound_logistics", notes: "Product collected" },
        { claim_id: claims[0].id, status: "repair", notes: "Under repair at service center" },
      ]);

      // Add excess payment
      await supabase.from("payments").insert([
        {
          user_id: user.id,
          claim_id: claims[0].id,
          payment_type: "excess",
          amount: extendedWarranty?.excess || 20.00,
          status: "paid",
          payment_date: new Date().toISOString(),
          reference_number: `EXC-${Math.floor(Math.random() * 10000)}`,
        },
      ]);
    }

    // Add premium payments
    await supabase.from("payments").insert([
      {
        user_id: user.id,
        policy_id: policies[0].id,
        payment_type: "premium",
        amount: extendedWarranty?.monthly_premium || 3.99,
        status: "paid",
        payment_date: "2024-01-15",
        reference_number: `PRM-${Math.floor(Math.random() * 10000)}`,
      },
      {
        user_id: user.id,
        policy_id: policies[0].id,
        payment_type: "premium",
        amount: extendedWarranty?.monthly_premium || 3.99,
        status: "paid",
        payment_date: "2023-12-15",
        reference_number: `PRM-${Math.floor(Math.random() * 10000)}`,
      },
      {
        user_id: user.id,
        policy_id: policies[1].id,
        payment_type: "premium",
        amount: insuranceMax?.monthly_premium || 6.99,
        status: "paid",
        payment_date: "2024-02-01",
        reference_number: `PRM-${Math.floor(Math.random() * 10000)}`,
      },
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Demo data created successfully",
        policiesCreated: policies.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error seeding data:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
