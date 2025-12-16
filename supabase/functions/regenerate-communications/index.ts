import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { wrapEmailContent } from "../_shared/email-template.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user has admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user has admin or system_admin role
    const { data: roles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'system_admin']);

    if (roleError || !roles || roles.length === 0) {
      throw new Error('Unauthorized - Admin access required');
    }

    console.log('Starting communication regeneration...');

    // Fetch all policy communications
    const { data: communications, error: commError } = await supabase
      .from('policy_communications')
      .select('*')
      .order('created_at', { ascending: true });

    if (commError) {
      throw commError;
    }

    if (!communications || communications.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No communications to regenerate',
          updated: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${communications.length} communications to regenerate`);

    let updated = 0;
    let errors = 0;

    // Process each communication
    for (const comm of communications) {
      try {
        // Fetch associated policy data
        const { data: policy, error: policyError } = await supabase
          .from('policies')
          .select(`
            *,
            products (
              name,
              product_id
            )
          `)
          .eq('id', comm.policy_id)
          .single();

        if (policyError) {
          console.error(`Error fetching policy for comm ${comm.id}:`, policyError);
          errors++;
          continue;
        }

        // Extract the plain text content from existing HTML
        // This is a simple extraction - we strip HTML tags to get the core message
        let plainContent = comm.message_body
          .replace(/<[^>]*>/g, '\n') // Replace HTML tags with newlines
          .replace(/\n\n+/g, '\n\n') // Normalize multiple newlines
          .trim();

        // Construct action URL for customer portal
        const projectUrl = supabaseUrl.replace('.supabase.co', '.lovable.app');
        let actionUrl: string | undefined;
        if (comm.claim_id) {
          actionUrl = `${projectUrl}/customer/claims/${comm.claim_id}`;
        } else if (comm.policy_id) {
          actionUrl = `${projectUrl}/customer/policies`;
        }

        // Wrap content with new template
        const updatedHtml = await wrapEmailContent(plainContent, comm.subject, actionUrl);

        // Update the communication
        const { error: updateError } = await supabase
          .from('policy_communications')
          .update({ message_body: updatedHtml })
          .eq('id', comm.id);

        if (updateError) {
          console.error(`Error updating comm ${comm.id}:`, updateError);
          errors++;
        } else {
          updated++;
          console.log(`Updated communication ${comm.id}`);
        }
      } catch (error) {
        console.error(`Error processing comm ${comm.id}:`, error);
        errors++;
      }
    }

    console.log(`Regeneration complete. Updated: ${updated}, Errors: ${errors}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully regenerated ${updated} communications`,
        updated,
        errors,
        total: communications.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('Error in regenerate-communications:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});