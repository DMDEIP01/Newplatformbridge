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

    const targetEmail = "consultant@test.com";
    const password = "Test123456!";

    console.log("Creating test consultant account...");

    // Helper to find user by email reliably by paging
    const findUserByEmail = async (email: string) => {
      let page = 1;
      const perPage = 1000;
      while (true) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
        if (error) throw error;
        const users = data?.users ?? [];
        const found = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
        if (found) return found;
        if (users.length < perPage) return null; // no more pages
        page += 1;
      }
    };

    // Check if consultant already exists (robust search)
    const existing = await findUserByEmail(targetEmail);
    if (existing) {
      // Ensure consultant role exists
      await supabase
        .from("user_roles")
        .upsert({ user_id: existing.id, role: "consultant" }, { onConflict: "user_id,role" });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Consultant account already exists",
          email: targetEmail,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Create consultant user
    const { data: consultantUser, error: consultantError } = await supabase.auth.admin.createUser({
      email: targetEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: "Test Consultant",
      },
    });

    if (consultantError) {
      console.log("createUser error, retrying lookup:", consultantError);
      // Race condition or duplicate email: try to find and proceed
      const maybeUser = await findUserByEmail(targetEmail);
      if (maybeUser) {
        await supabase
          .from("user_roles")
          .upsert({ user_id: maybeUser.id, role: "consultant" }, { onConflict: "user_id,role" });

        return new Response(
          JSON.stringify({
            success: true,
            message: "Consultant account already exists (recovered)",
            email: targetEmail,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw consultantError;
    }

    console.log("Consultant user created:", consultantUser.user.id);

    // Add consultant role
    const { error: roleError } = await supabase
      .from("user_roles")
      .upsert({ user_id: consultantUser.user.id, role: "consultant" }, { onConflict: "user_id,role" });

    if (roleError) throw roleError;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Consultant account created successfully",
        email: targetEmail,
        password,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error creating consultant:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
