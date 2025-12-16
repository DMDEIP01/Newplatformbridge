-- Create complaint activity log table
CREATE TABLE public.complaint_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_details TEXT,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.complaint_activity_log ENABLE ROW LEVEL SECURITY;

-- Complaints agents can view activity logs
CREATE POLICY "Complaints agents can view activity logs"
ON public.complaint_activity_log
FOR SELECT
USING (
  has_role(auth.uid(), 'complaints_agent') OR 
  has_role(auth.uid(), 'admin')
);

-- Complaints agents can insert activity logs
CREATE POLICY "Complaints agents can insert activity logs"
ON public.complaint_activity_log
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'complaints_agent') OR 
  has_role(auth.uid(), 'admin')
);

-- Create index for faster queries
CREATE INDEX idx_complaint_activity_log_complaint_id ON public.complaint_activity_log(complaint_id);
CREATE INDEX idx_complaint_activity_log_created_at ON public.complaint_activity_log(created_at DESC);

-- Add notes column to complaints table
ALTER TABLE public.complaints ADD COLUMN notes TEXT;