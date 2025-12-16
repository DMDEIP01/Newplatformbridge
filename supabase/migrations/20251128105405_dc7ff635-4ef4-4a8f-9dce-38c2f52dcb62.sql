-- Enable realtime for claims table so customers see updates immediately
ALTER PUBLICATION supabase_realtime ADD TABLE public.claims;