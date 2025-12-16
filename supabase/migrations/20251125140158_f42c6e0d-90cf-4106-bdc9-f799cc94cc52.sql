-- Update communication templates with MediaMarkt branded HTML templates

-- Helper function to create branded email template
CREATE OR REPLACE FUNCTION create_branded_email(
  p_subject TEXT,
  p_main_content TEXT
) RETURNS TEXT AS $$
BEGIN
  RETURN format('
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>%s</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #E31E24 0%%, #C41E23 100%%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">MediaMarkt Insurance</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              %s
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #262626; padding: 30px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 14px;">MediaMarkt Insurance Portal</p>
              <p style="margin: 0; color: #cccccc; font-size: 12px;">
                This is an automated message. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>', p_subject, p_main_content);
END;
$$ LANGUAGE plpgsql;

-- Update Policy Templates
UPDATE communication_templates 
SET message_body = create_branded_email(
  'Your MediaMarkt Insurance Policy is Now Active',
  '<h2 style="margin: 0 0 20px 0; color: #1F1F1F; font-size: 20px;">Your Policy is Active</h2>
  <p style="margin: 0 0 15px 0; color: #1F1F1F; font-size: 14px; line-height: 1.6;">
    Great news! Your MediaMarkt Insurance policy <strong>{policy_number}</strong> is now active and your coverage has begun.
  </p>
  <p style="margin: 0 0 15px 0; color: #1F1F1F; font-size: 14px; line-height: 1.6;">
    <strong>Product:</strong> {product_name}<br>
    <strong>Start Date:</strong> {start_date}<br>
    <strong>Renewal Date:</strong> {renewal_date}
  </p>
  <p style="margin: 0 0 20px 0; color: #1F1F1F; font-size: 14px; line-height: 1.6;">
    Please log in to your MediaMarkt Insurance Portal to view your full policy details and documents.
  </p>
  <div style="text-align: center;">
    <a href="#" style="display: inline-block; padding: 12px 30px; background-color: #E31E24; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 14px;">View Policy Details</a>
  </div>'
)
WHERE type = 'policy' AND status = 'active';

UPDATE communication_templates 
SET message_body = create_branded_email(
  'Your MediaMarkt Insurance Policy is Pending',
  '<h2 style="margin: 0 0 20px 0; color: #1F1F1F; font-size: 20px;">Policy Pending Activation</h2>
  <p style="margin: 0 0 15px 0; color: #1F1F1F; font-size: 14px; line-height: 1.6;">
    Your MediaMarkt Insurance policy <strong>{policy_number}</strong> is currently pending activation.
  </p>
  <p style="margin: 0 0 20px 0; color: #1F1F1F; font-size: 14px; line-height: 1.6;">
    We''re processing your policy and will notify you once it''s active. Please log in to your MediaMarkt Insurance Portal to check the latest status.
  </p>
  <div style="text-align: center;">
    <a href="#" style="display: inline-block; padding: 12px 30px; background-color: #E31E24; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 14px;">Check Status</a>
  </div>'
)
WHERE type = 'policy' AND status = 'pending';

UPDATE communication_templates 
SET message_body = create_branded_email(
  'Your MediaMarkt Insurance Policy Has Expired',
  '<h2 style="margin: 0 0 20px 0; color: #1F1F1F; font-size: 20px;">Policy Expired</h2>
  <p style="margin: 0 0 15px 0; color: #1F1F1F; font-size: 14px; line-height: 1.6;">
    Your MediaMarkt Insurance policy <strong>{policy_number}</strong> has expired.
  </p>
  <p style="margin: 0 0 20px 0; color: #1F1F1F; font-size: 14px; line-height: 1.6;">
    If you wish to renew your coverage or discuss your options, please contact us or log in to your MediaMarkt Insurance Portal.
  </p>
  <div style="text-align: center;">
    <a href="#" style="display: inline-block; padding: 12px 30px; background-color: #E31E24; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 14px;">View Options</a>
  </div>'
)
WHERE type = 'policy' AND status = 'expired';

UPDATE communication_templates 
SET message_body = create_branded_email(
  'Your MediaMarkt Insurance Policy Has Been Cancelled',
  '<h2 style="margin: 0 0 20px 0; color: #1F1F1F; font-size: 20px;">Policy Cancelled</h2>
  <p style="margin: 0 0 15px 0; color: #1F1F1F; font-size: 14px; line-height: 1.6;">
    Your MediaMarkt Insurance policy <strong>{policy_number}</strong> has been cancelled as of <strong>{cancelled_date}</strong>.
  </p>
  <p style="margin: 0 0 20px 0; color: #1F1F1F; font-size: 14px; line-height: 1.6;">
    For full cancellation details and any applicable refunds, please log in to your MediaMarkt Insurance Portal.
  </p>
  <div style="text-align: center;">
    <a href="#" style="display: inline-block; padding: 12px 30px; background-color: #E31E24; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 14px;">View Details</a>
  </div>'
)
WHERE type = 'policy' AND status = 'cancelled';

-- Update Claim Templates
UPDATE communication_templates 
SET message_body = create_branded_email(
  'Your Claim Has Been Received',
  '<h2 style="margin: 0 0 20px 0; color: #1F1F1F; font-size: 20px;">Claim Received</h2>
  <p style="margin: 0 0 15px 0; color: #1F1F1F; font-size: 14px; line-height: 1.6;">
    We have received your claim <strong>{claim_number}</strong> for policy <strong>{policy_number}</strong>.
  </p>
  <p style="margin: 0 0 20px 0; color: #1F1F1F; font-size: 14px; line-height: 1.6;">
    Our team is reviewing your claim and will be in touch soon. Please log in to your MediaMarkt Insurance Portal to track your claim progress.
  </p>
  <div style="text-align: center;">
    <a href="#" style="display: inline-block; padding: 12px 30px; background-color: #E31E24; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 14px;">Track Claim</a>
  </div>'
)
WHERE type = 'claim' AND status = 'notified';

UPDATE communication_templates 
SET message_body = create_branded_email(
  'Your Claim Has Been Accepted',
  '<h2 style="margin: 0 0 20px 0; color: #1F1F1F; font-size: 20px;">Claim Accepted</h2>
  <p style="margin: 0 0 15px 0; color: #1F1F1F; font-size: 14px; line-height: 1.6;">
    Great news! Your claim <strong>{claim_number}</strong> has been accepted.
  </p>
  <p style="margin: 0 0 20px 0; color: #1F1F1F; font-size: 14px; line-height: 1.6;">
    We will now proceed with the next steps. Please log in to your MediaMarkt Insurance Portal to view the full details and next actions.
  </p>
  <div style="text-align: center;">
    <a href="#" style="display: inline-block; padding: 12px 30px; background-color: #E31E24; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 14px;">View Claim Details</a>
  </div>'
)
WHERE type = 'claim' AND status = 'accepted';

UPDATE communication_templates 
SET message_body = create_branded_email(
  'Claim Update - Additional Information Required',
  '<h2 style="margin: 0 0 20px 0; color: #1F1F1F; font-size: 20px;">Additional Information Needed</h2>
  <p style="margin: 0 0 15px 0; color: #1F1F1F; font-size: 14px; line-height: 1.6;">
    We need additional information to process your claim <strong>{claim_number}</strong>.
  </p>
  <p style="margin: 0 0 20px 0; color: #1F1F1F; font-size: 14px; line-height: 1.6;">
    Please log in to your MediaMarkt Insurance Portal to see what information is required and submit it as soon as possible.
  </p>
  <div style="text-align: center;">
    <a href="#" style="display: inline-block; padding: 12px 30px; background-color: #E31E24; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 14px;">Provide Information</a>
  </div>'
)
WHERE type = 'claim' AND status IN ('referred_pending_info', 'referred');

UPDATE communication_templates 
SET message_body = create_branded_email(
  'Excess Payment Required',
  '<h2 style="margin: 0 0 20px 0; color: #1F1F1F; font-size: 20px;">Excess Payment Due</h2>
  <p style="margin: 0 0 15px 0; color: #1F1F1F; font-size: 14px; line-height: 1.6;">
    To proceed with your claim <strong>{claim_number}</strong>, an excess payment of <strong>€{excess_amount}</strong> is required.
  </p>
  <p style="margin: 0 0 20px 0; color: #1F1F1F; font-size: 14px; line-height: 1.6;">
    Please log in to your MediaMarkt Insurance Portal to make the payment securely.
  </p>
  <div style="text-align: center;">
    <a href="#" style="display: inline-block; padding: 12px 30px; background-color: #E31E24; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 14px;">Make Payment</a>
  </div>'
)
WHERE type = 'claim' AND status = 'excess_due';

UPDATE communication_templates 
SET message_body = create_branded_email(
  'Your Claim Has Been Closed',
  '<h2 style="margin: 0 0 20px 0; color: #1F1F1F; font-size: 20px;">Claim Closed</h2>
  <p style="margin: 0 0 15px 0; color: #1F1F1F; font-size: 14px; line-height: 1.6;">
    Your claim <strong>{claim_number}</strong> has been closed.
  </p>
  <p style="margin: 0 0 20px 0; color: #1F1F1F; font-size: 14px; line-height: 1.6;">
    Thank you for your patience throughout this process. Please log in to your MediaMarkt Insurance Portal to view the full claim summary.
  </p>
  <div style="text-align: center;">
    <a href="#" style="display: inline-block; padding: 12px 30px; background-color: #E31E24; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 14px;">View Summary</a>
  </div>'
)
WHERE type = 'claim' AND status = 'closed';

-- Drop the helper function
DROP FUNCTION create_branded_email(TEXT, TEXT);