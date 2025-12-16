-- Fix search_path for new functions
ALTER FUNCTION public.get_product_prefix(TEXT) SET search_path TO 'public';
ALTER FUNCTION public.generate_policy_number(TEXT) SET search_path TO 'public';
ALTER FUNCTION public.generate_claim_number(TEXT) SET search_path TO 'public';