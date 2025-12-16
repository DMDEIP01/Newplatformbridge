-- Allow complaint type in communication_templates
ALTER TABLE communication_templates DROP CONSTRAINT IF EXISTS communication_templates_type_check;

-- Add constraint that allows policy, claim, and complaint types
ALTER TABLE communication_templates 
ADD CONSTRAINT communication_templates_type_check 
CHECK (type IN ('policy', 'claim', 'complaint'));

-- Insert complaint communication templates with MediaMarkt branding
INSERT INTO communication_templates (type, status, subject, message_body, is_active) VALUES
('complaint', 'submitted', 'Complaint Acknowledgement - {{complaint_reference}}', 'Dear {{customer_name}},

Thank you for contacting us regarding your complaint.

Complaint Reference: {{complaint_reference}}
Date Submitted: {{created_at}}
Reason: {{reason}}

We have received your complaint and are reviewing the details. Our team will investigate this matter and provide you with a response within our standard timeframe.

We appreciate your patience and will keep you updated on the progress.

Details of your complaint:
{{details}}

If you have any additional information to provide, please reply to this email quoting your complaint reference number.', true),

('complaint', 'pending', 'Complaint Under Review - {{complaint_reference}}', 'Dear {{customer_name}},

Your complaint is currently being reviewed by our team.

Complaint Reference: {{complaint_reference}}
Current Status: Under Review

We are carefully examining all aspects of your complaint and will provide you with an update as soon as possible.

If you have any questions, please contact us quoting your complaint reference number.', true),

('complaint', 'awaiting_info', 'Additional Information Required - {{complaint_reference}}', 'Dear {{customer_name}},

We are reviewing your complaint and require additional information to proceed.

Complaint Reference: {{complaint_reference}}

Required Information:
{{notes}}

Please provide the requested information at your earliest convenience so we can continue investigating your complaint.

You can respond to this email or contact our customer service team.', true),

('complaint', 'upheld', 'Complaint Upheld - {{complaint_reference}}', 'Dear {{customer_name}},

Following our investigation, we have completed the review of your complaint.

Complaint Reference: {{complaint_reference}}
Outcome: Upheld

{{response}}

We sincerely apologize for any inconvenience caused and appreciate you bringing this matter to our attention.

If you have any further questions, please don''t hesitate to contact us.', true),

('complaint', 'refuted', 'Complaint Review Outcome - {{complaint_reference}}', 'Dear {{customer_name}},

Following our investigation, we have completed the review of your complaint.

Complaint Reference: {{complaint_reference}}
Outcome: Not Upheld

{{response}}

We understand this may not be the outcome you were hoping for. If you wish to escalate this matter further, please contact us and we will provide information about the next steps.', true),

('complaint', 'closed', 'Complaint Closed - {{complaint_reference}}', 'Dear {{customer_name}},

Your complaint has been closed.

Complaint Reference: {{complaint_reference}}
Final Status: Closed

{{response}}

We consider this matter resolved. If you have any concerns about this outcome or need to raise a new issue, please don''t hesitate to contact us.

Thank you for your patience throughout this process.', true),

('complaint', 'withdrawn', 'Complaint Withdrawal Confirmed - {{complaint_reference}}', 'Dear {{customer_name}},

We confirm the withdrawal of your complaint as requested.

Complaint Reference: {{complaint_reference}}
Status: Withdrawn

Your complaint has been closed following your request. No further action will be taken on this matter.

If you need to raise a new complaint in the future, please don''t hesitate to contact us.', true),

('complaint', 'on_hold', 'Complaint On Hold - {{complaint_reference}}', 'Dear {{customer_name}},

Your complaint has been placed on hold.

Complaint Reference: {{complaint_reference}}
Status: On Hold

Reason:
{{notes}}

We will resume the investigation once the outstanding matters are resolved. We will keep you informed of any updates.

If you have any questions, please contact us quoting your complaint reference number.', true)