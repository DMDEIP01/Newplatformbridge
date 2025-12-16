-- Allow customers to view messages for their service requests
CREATE POLICY "Customers can view own service request messages"
ON public.service_request_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.service_requests sr
    JOIN public.policies p ON sr.policy_id = p.id
    WHERE sr.id = service_request_messages.service_request_id
    AND p.user_id = auth.uid()
  )
);

-- Allow customers to insert messages in their service requests
CREATE POLICY "Customers can insert messages in own service requests"
ON public.service_request_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.service_requests sr
    JOIN public.policies p ON sr.policy_id = p.id
    WHERE sr.id = service_request_messages.service_request_id
    AND p.user_id = auth.uid()
  )
);

-- Enable realtime for service_request_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_request_messages;