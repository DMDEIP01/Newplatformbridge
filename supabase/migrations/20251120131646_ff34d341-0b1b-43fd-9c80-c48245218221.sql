-- Create service request messages table to store conversation history
CREATE TABLE IF NOT EXISTS public.service_request_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'agent')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_by_agent BOOLEAN NOT NULL DEFAULT false
);

-- Add index for faster queries
CREATE INDEX idx_service_request_messages_request_id ON public.service_request_messages(service_request_id);
CREATE INDEX idx_service_request_messages_created_at ON public.service_request_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.service_request_messages ENABLE ROW LEVEL SECURITY;

-- Allow retail agents and admins to view all messages
CREATE POLICY "Retail agents can view all messages"
  ON public.service_request_messages
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'retail_agent'::app_role, NULL::uuid) OR 
    public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid) OR
    public.has_role(auth.uid(), 'consultant'::app_role, NULL::uuid)
  );

-- Allow retail agents to insert messages
CREATE POLICY "Retail agents can insert messages"
  ON public.service_request_messages
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'retail_agent'::app_role, NULL::uuid) OR 
    public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid) OR
    public.has_role(auth.uid(), 'consultant'::app_role, NULL::uuid)
  );

-- Allow retail agents to update messages (mark as read)
CREATE POLICY "Retail agents can update messages"
  ON public.service_request_messages
  FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'retail_agent'::app_role, NULL::uuid) OR 
    public.has_role(auth.uid(), 'admin'::app_role, NULL::uuid) OR
    public.has_role(auth.uid(), 'consultant'::app_role, NULL::uuid)
  );

-- Add last_activity_at field to service_requests table for sorting
ALTER TABLE public.service_requests 
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create function to update last_activity_at
CREATE OR REPLACE FUNCTION update_service_request_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.service_requests
  SET last_activity_at = NEW.created_at
  WHERE id = NEW.service_request_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to update last_activity_at on new messages
DROP TRIGGER IF EXISTS update_service_request_activity_trigger ON public.service_request_messages;
CREATE TRIGGER update_service_request_activity_trigger
  AFTER INSERT ON public.service_request_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_service_request_activity();