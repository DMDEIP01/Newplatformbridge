import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-exclusive",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("grant-role: Starting request");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { email, password, fullName, role } = await req.json();
    console.log("grant-role: Processing", { email, role });

    if (!email || !password || !fullName || !role) {
      return new Response(JSON.stringify({ error: "Missing parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let userId: string | null = null;

    // Try to create the user (idempotent behavior)
    console.log("grant-role: Creating user");
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    
    if (createErr) {
      console.log("grant-role: User creation error", createErr.message);
    } else {
      console.log("grant-role: User created successfully");
    }

    if (createErr) {
      // If already exists, try to resolve via profiles table by email
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (profileErr) throw profileErr;
      if (!profile) {
        // As a fallback, we cannot reliably fetch auth user by email without listing all users.
        return new Response(JSON.stringify({ error: "User exists but profile not found" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      userId = profile.id;
    } else {
      userId = created.user?.id ?? null;
      // Ensure profile exists with full name and email
      if (userId) {
        // Upsert profile
        await supabase.from("profiles").upsert({
          id: userId,
          full_name: fullName,
          email,
        });
      }
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Failed to resolve user id" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Optionally reset other roles when switching
    const exclusive = (role && (req.headers.get('x-exclusive') === 'true')) ? true : false;
    console.log("grant-role: Exclusive mode:", exclusive);

    if (exclusive) {
      console.log("grant-role: Deleting existing roles for user");
      const { error: deleteErr } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (deleteErr) console.log("grant-role: Delete error", deleteErr.message);
    }

    // Grant the requested role (idempotent)
    console.log("grant-role: Upserting role");
    const { error: upsertErr } = await supabase.from("user_roles").upsert(
      { user_id: userId, role },
      { onConflict: "user_id,role" }
    );
    
    if (upsertErr) {
      console.log("grant-role: Upsert error", upsertErr.message);
      throw upsertErr;
    }

    console.log("grant-role: Success");
    return new Response(
      JSON.stringify({ success: true, userId, role, exclusive }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("grant-role error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
