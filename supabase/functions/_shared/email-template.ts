// MediaMarkt branded email template wrapper
export const wrapEmailContent = async (content: string, subject: string, actionUrl?: string, logoBase64?: string): Promise<string> => {
  // Check if content is already a complete HTML document with structure
  // If so, just add the CTA button before the footer and return
  if (isCompleteHtmlDocument(content)) {
    return insertCtaIntoExistingHtml(content, actionUrl);
  }
  
  // Use provided base64 logo or fallback to URL
  const logoSrc = logoBase64 || `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/promotion-logos/mediamarkt-logo-email.png`;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #e30613 0%, #c40510 100%);
      padding: 30px 40px;
      text-align: center;
    }
    .logo {
      max-width: 180px;
      height: auto;
      margin-bottom: 10px;
      filter: brightness(0) invert(1);
    }
    .content {
      padding: 40px;
      color: #333333;
      line-height: 1.6;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .content p {
      margin: 0 0 16px 0;
      color: #333333;
      word-wrap: break-word;
    }
    .content strong {
      color: #333333;
      font-weight: 600;
    }
    .claim-info {
      background-color: #f8f8f8;
      border-left: 4px solid #e30613;
      padding: 16px 20px;
      margin: 24px 0;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .claim-info p {
      margin: 8px 0;
      font-size: 14px;
      word-wrap: break-word;
    }
    .cta-button {
      display: inline-block;
      background-color: #e30613;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 4px;
      font-weight: 600;
      margin: 24px 0;
    }
    .footer {
      background-color: #1a1a1a;
      color: #999999;
      padding: 30px 40px;
      text-align: center;
      font-size: 12px;
      line-height: 1.8;
    }
    .footer a {
      color: #e30613;
      text-decoration: none;
    }
    .divider {
      height: 1px;
      background-color: #e0e0e0;
      margin: 24px 0;
    }
    @media only screen and (max-width: 600px) {
      .content {
        padding: 24px !important;
      }
      .header {
        padding: 20px !important;
      }
      .footer {
        padding: 20px !important;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <img src="${logoSrc}" alt="MediaMarkt" class="logo" />
      <div style="color: #ffffff; font-size: 14px; margin-top: 8px; font-weight: normal;">Insurance Protection</div>
    </div>
    
    <!-- Content -->
    <div class="content">
      ${formatPlainTextContent(content, actionUrl)}
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p><strong>MediaMarkt Insurance</strong></p>
      <p>Your trusted protection partner</p>
      <div style="margin: 16px 0;">
        <a href="#">Contact Support</a> | 
        <a href="#">Policy Terms</a> | 
        <a href="#">Privacy Policy</a>
      </div>
      <p>This is an automated message. Please do not reply to this email.</p>
      <p style="margin-top: 16px; color: #666;">
        © ${new Date().getFullYear()} MediaMarkt Insurance. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
};

// Check if content is already a complete HTML document
const isCompleteHtmlDocument = (content: string): boolean => {
  const trimmed = content.trim().toLowerCase();
  // Check for DOCTYPE or html tag AND has a body with content structure
  const hasHtmlStructure = (
    (trimmed.startsWith('<!doctype html>') || trimmed.startsWith('<html')) &&
    trimmed.includes('<body') &&
    trimmed.includes('</body>')
  );
  
  // Also check if it has table-based email layout (common in email templates)
  const hasEmailTable = content.includes('cellpadding') || content.includes('cellspacing');
  
  return hasHtmlStructure || (trimmed.includes('<table') && hasEmailTable);
};

// Insert CTA button into existing HTML document before the footer
const insertCtaIntoExistingHtml = (html: string, actionUrl?: string): string => {
  if (!actionUrl) return html;
  
  const ctaHtml = `
    <tr>
      <td style="padding: 20px 30px; text-align: center;">
        <a href="${actionUrl}" style="display: inline-block; background-color: #E31E24; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 4px; font-weight: 600; font-size: 14px;">Login to Customer Portal</a>
      </td>
    </tr>
  `;
  
  // Try to insert before the footer section
  // Look for common footer patterns in email HTML
  const footerPatterns = [
    /(<tr>\s*<td[^>]*style="[^"]*background-color:\s*#262626)/i,  // Dark footer
    /(<tr>\s*<td[^>]*style="[^"]*background-color:\s*#1a1a1a)/i,  // Another dark footer
    /(<\/table>\s*<\/td>\s*<\/tr>\s*<\/table>\s*<\/td>\s*<\/tr>\s*<\/table>)/i,  // End of nested tables
  ];
  
  for (const pattern of footerPatterns) {
    if (pattern.test(html)) {
      return html.replace(pattern, ctaHtml + '$1');
    }
  }
  
  // Fallback: insert before closing body tag
  return html.replace('</body>', ctaHtml + '</body>');
};

// Helper function to format plain text content into HTML
const formatPlainTextContent = (content: string, actionUrl?: string): string => {
  // Clean any wrapper tags but preserve inner content
  let cleanContent = content.trim()
    .replace(/^<!DOCTYPE[^>]*>/i, '')
    .replace(/<\/?html[^>]*>/gi, '')
    .replace(/<\/?head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<\/?body[^>]*>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '')
    .trim();
  
  // If content has HTML structure already, use it
  if (/<[a-z][\s\S]*>/i.test(cleanContent)) {
    // Clean up any existing CTA buttons to avoid duplication
    cleanContent = cleanContent.replace(/<a[^>]*class="cta-button"[^>]*>.*?<\/a>/gi, '');
    cleanContent = cleanContent.replace(/<div[^>]*>\s*<a[^>]*>Login to Customer Portal<\/a>\s*<\/div>/gi, '');
    
    const buttonHtml = actionUrl ? `
      <div style="text-align: center; margin: 32px 0 16px 0;">
        <a href="${actionUrl}" class="cta-button">Login to Customer Portal</a>
      </div>
    ` : '';
    return cleanContent + buttonHtml;
  }
  
  // Split content into paragraphs for plain text
  const paragraphs = cleanContent.split('\n\n');
  
  const formattedContent = paragraphs.map(para => {
    const trimmed = para.trim();
    if (!trimmed) return '';
    
    // Check if it's a claim/policy info block (contains colons)
    if (trimmed.includes(':') && trimmed.split('\n').length > 1) {
      const lines = trimmed.split('\n').map(line => {
        // Bold the label before the colon
        if (line.includes(':')) {
          const [label, ...valueParts] = line.split(':');
          return `<p><strong>${label}:</strong>${valueParts.join(':')}</p>`;
        }
        return `<p>${line}</p>`;
      }).join('');
      return `<div class="claim-info">${lines}</div>`;
    }
    
    // Check if it's a bulleted list
    if (trimmed.includes('•') || trimmed.includes('*')) {
      const items = trimmed.split('\n')
        .filter(line => line.trim().startsWith('•') || line.trim().startsWith('*'))
        .map(line => {
          const text = line.trim().replace(/^[•*]\s*/, '');
          return `<li>${text}</li>`;
        })
        .join('');
      return `<ul style="margin: 16px 0; padding-left: 24px;">${items}</ul>`;
    }
    
    // Regular paragraph
    return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
  }).join('');
  
  // Add login button if actionUrl is provided
  const buttonHtml = actionUrl ? `
    <div style="text-align: center; margin: 32px 0 16px 0;">
      <a href="${actionUrl}" class="cta-button">Login to Customer Portal</a>
    </div>
  ` : '';
  
  return formattedContent + buttonHtml;
};