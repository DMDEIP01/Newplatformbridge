import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { policyNumber: rawPolicyNumber } = await req.json();
    const searchTerm = rawPolicyNumber?.trim();

    console.log('Looking up policy with search term:', JSON.stringify({ raw: rawPolicyNumber, trimmed: searchTerm, length: searchTerm?.length }));

    if (!searchTerm || typeof searchTerm !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Search term is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate input length and characters to prevent abuse
    if (searchTerm.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Search term too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize search term - allow alphanumeric, @, ., -, _ and + for phone numbers
    const sanitizedSearchTerm = searchTerm.replace(/[^\w@.\-\+]/g, '');

    // Search by policy number, customer name, email, or phone using sanitized input
    const { data: policies, error: policyError } = await supabase
      .from('policies')
      .select(`
        id,
        policy_number,
        status,
        start_date,
        renewal_date,
        user_id,
        product_id,
        customer_name,
        customer_email,
        customer_phone
      `)
      .or(`policy_number.ilike.%${sanitizedSearchTerm}%,customer_name.ilike.%${sanitizedSearchTerm}%,customer_email.ilike.%${sanitizedSearchTerm}%,customer_phone.ilike.%${sanitizedSearchTerm}%`)
      .limit(1);

    const policy = policies?.[0];
    
    console.log('Policy search result:', { found: !!policy, searchTerm });

    console.log('Policy query result:', { policy, policyError });

    if (policyError) {
      console.error('Error fetching policy:', policyError);
      return new Response(
        JSON.stringify({ error: 'Policy not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!policy) {
      console.log('No policy found with search term:', searchTerm);
      return new Response(
        JSON.stringify({ error: 'Policy not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch product details
    const { data: product } = await supabase
      .from('products')
      .select('name, type, monthly_premium, excess_1, excess_2, coverage')
      .eq('id', policy.product_id)
      .single();

    // Fetch customer/profile details
    const { data: customer } = await supabase
      .from('profiles')
      .select('full_name, email, phone, address_line1, address_line2, city, postcode')
      .eq('id', policy.user_id)
      .single();

    // Fetch covered items
    const { data: covered_items } = await supabase
      .from('covered_items')
      .select('product_name, model, serial_number, purchase_price')
      .eq('policy_id', policy.id);

    const fullPolicy = {
      ...policy,
      product,
      customer,
      covered_items: covered_items || []
    };

    console.log('Policy found:', fullPolicy.policy_number);

    return new Response(
      JSON.stringify({ policy: fullPolicy }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in retail-policy-lookup:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
