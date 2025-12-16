import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { action, userData } = await req.json();

    if (action === "create") {
      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          full_name: userData.fullName,
        },
      });

      if (authError) throw authError;

      // Update profile with additional details
      if (authData.user) {
        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({
            phone: userData.phone || null,
            address_line1: userData.addressLine1 || null,
            address_line2: userData.addressLine2 || null,
            city: userData.city || null,
            postcode: userData.postcode || null,
            must_change_password: true, // Force password change on first login
          })
          .eq("id", authData.user.id);

        if (profileError) {
          console.error("Profile update error:", profileError);
        }

        // Link to user group if selected
        if (userData.groupId) {
          const { error: groupError } = await supabaseAdmin
            .from("user_group_members")
            .insert({
              user_id: authData.user.id,
              group_id: userData.groupId,
            });

          if (groupError) {
            console.error("Group assignment error:", groupError);
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, user: authData.user }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (action === "update") {
      // Update auth user email if changed
      if (userData.email) {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
          userData.userId,
          { email: userData.email }
        );

        if (authError) throw authError;
      }

      // Update profile
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({
          email: userData.email,
          full_name: userData.fullName,
          phone: userData.phone || null,
          address_line1: userData.addressLine1 || null,
          address_line2: userData.addressLine2 || null,
          city: userData.city || null,
          postcode: userData.postcode || null,
        })
        .eq("id", userData.userId);

      if (profileError) throw profileError;

      // Update user group membership
      await supabaseAdmin
        .from("user_group_members")
        .delete()
        .eq("user_id", userData.userId);

      if (userData.groupId) {
        const { error: groupError } = await supabaseAdmin
          .from("user_group_members")
          .insert({
            user_id: userData.userId,
            group_id: userData.groupId,
          });

        if (groupError) {
          console.error("Group assignment error:", groupError);
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (action === "bulk-create") {
      const results = [];
      
      for (const user of userData.users) {
        try {
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true,
            user_metadata: {
              full_name: user.full_name,
            },
          });

          if (authError) throw authError;

          if (authData.user) {
            await supabaseAdmin
              .from("profiles")
              .update({
                phone: user.phone || null,
                address_line1: user.address_line1 || null,
                address_line2: user.address_line2 || null,
                city: user.city || null,
                postcode: user.postcode || null,
                must_change_password: true, // Force password change on first login
              })
              .eq("id", authData.user.id);
          }

          results.push({ success: true, email: user.email });
        } catch (error: any) {
          results.push({ success: false, email: user.email, error: error?.message || "Unknown error" });
        }
      }

      return new Response(
        JSON.stringify({ results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Invalid action");
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
