# Edge Functions Deployment Guide

This guide covers deploying all 24 edge functions to your external Supabase project.

## Prerequisites

1. [Supabase CLI](https://supabase.com/docs/guides/cli) installed
2. Supabase project created and linked
3. Required secrets configured

## Quick Start

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy all functions at once
supabase functions deploy
```

## Edge Functions Overview

| Function | Purpose | JWT Required | Required Secrets |
|----------|---------|--------------|------------------|
| `analyze-damage` | AI analysis of damage photos | Yes | LOVABLE_API_KEY |
| `analyze-device` | AI device identification from photos | Yes | LOVABLE_API_KEY |
| `analyze-receipt` | AI receipt parsing and validation | Yes | LOVABLE_API_KEY |
| `claims-fulfillment-advisor` | AI recommendations for claim resolution | Yes | LOVABLE_API_KEY |
| `create-consultant` | Create consultant user accounts | No | - |
| `extract-branding` | Extract branding from URLs | Yes | LOVABLE_API_KEY |
| `generate-policy-documents` | Generate PDF policy documents | Yes | - |
| `get-claim-upload-details` | Get claim upload information | No | - |
| `grant-consultant` | Grant consultant role to user | Yes | - |
| `grant-role` | Grant any role to user | Yes | - |
| `grant-system-admin` | Grant system admin role | Yes | - |
| `manage-user` | User management operations | Yes | - |
| `process-claim-automatically` | Auto-process claims with AI | No | LOVABLE_API_KEY |
| `reanalyze-claim-documents` | Re-run AI analysis on documents | Yes | LOVABLE_API_KEY |
| `regenerate-communications` | Regenerate email communications | Yes | - |
| `resend-communication` | Resend specific communication | No | SENDGRID_API_KEY |
| `retail-policy-lookup` | Search policies by various criteria | Yes | - |
| `seed-demo-data` | Seed database with demo data | Yes | - |
| `seed-retail-data` | Seed retail-specific demo data | No | - |
| `send-claim-document-request` | Send document request emails | No | SENDGRID_API_KEY, APP_URL |
| `send-email` | Generic email sending | Yes | SENDGRID_API_KEY |
| `send-templated-email` | Send emails using templates | Yes | SENDGRID_API_KEY |
| `service-agent` | AI-powered service chat | Yes | LOVABLE_API_KEY |
| `upload-claim-document` | Handle document uploads | No | - |

## Deploying Individual Functions

```bash
# Deploy a specific function
supabase functions deploy analyze-damage

# Deploy with specific memory/timeout
supabase functions deploy service-agent --memory 512 --timeout 60
```

## Required Secrets

### Essential Secrets
```bash
# For email functionality
supabase secrets set SENDGRID_API_KEY=your-sendgrid-api-key

# Application URL (for links in emails)
supabase secrets set APP_URL=https://your-app-domain.com
```

### For AI Features
```bash
# Lovable AI integration (if using Lovable AI features)
supabase secrets set LOVABLE_API_KEY=your-lovable-api-key
```

### View Current Secrets
```bash
supabase secrets list
```

## JWT Verification Configuration

The `supabase/config.toml` file controls JWT verification for each function:

```toml
[functions.send-email]
verify_jwt = true

[functions.create-consultant]
verify_jwt = false
```

Functions with `verify_jwt = false` can be called without authentication (public endpoints).

### Current Public Functions (No Auth Required)
- `create-consultant`
- `seed-retail-data`
- `send-claim-document-request`
- `get-claim-upload-details`
- `upload-claim-document`
- `process-claim-automatically`
- `resend-communication`

## Function-Specific Details

### AI Analysis Functions

These functions use AI to analyze images and documents:

```typescript
// analyze-damage - Analyzes damage photos
// Input: { images: string[] } (base64 encoded)
// Output: { analysis: string, severity: string, recommendations: string[] }

// analyze-device - Identifies device from photo
// Input: { image: string }
// Output: { manufacturer: string, model: string, category: string }

// analyze-receipt - Parses receipt information
// Input: { image: string }
// Output: { merchant: string, date: string, items: [], total: number }
```

### Email Functions

```typescript
// send-email - Send generic email
// Input: { to: string, subject: string, htmlContent: string, policyId?: string }

// send-templated-email - Send using template
// Input: { templateId: string, to: string, variables: {} }

// send-claim-document-request - Request documents from customer
// Input: { claimId: string }
```

### User Management Functions

```typescript
// create-consultant - Create new consultant
// Input: { email: string, password: string }

// grant-role - Grant role to user
// Input: { email: string, role: string, programId?: string }

// manage-user - Various user operations
// Input: { action: string, userId: string, data: {} }
```

## Testing Functions

### Using CLI
```bash
# Invoke a function
supabase functions invoke analyze-damage --body '{"images": ["base64data"]}'

# Invoke with auth token
supabase functions invoke manage-user \
  --body '{"action": "getUser", "userId": "123"}' \
  --header 'Authorization: Bearer YOUR_JWT_TOKEN'
```

### Using cURL
```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/analyze-damage' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"images": ["base64data"]}'
```

## Viewing Logs

```bash
# View logs for a specific function
supabase functions logs analyze-damage

# View logs with tail
supabase functions logs analyze-damage --tail

# View logs for all functions
supabase functions logs
```

## Common Issues

### CORS Errors
All functions should include CORS headers:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

### Timeout Issues
For long-running functions (like AI analysis), increase timeout:
```bash
supabase functions deploy service-agent --timeout 60
```

### Memory Issues
For functions processing large files:
```bash
supabase functions deploy upload-claim-document --memory 512
```

### Secret Not Found
Ensure secrets are set:
```bash
supabase secrets list
supabase secrets set MISSING_SECRET=value
```

## Updating Functions

When you update function code:
```bash
# Redeploy specific function
supabase functions deploy function-name

# Redeploy all functions
supabase functions deploy
```

## Deleting Functions

```bash
# Delete a function
supabase functions delete function-name
```

## Production Checklist

- [ ] All required secrets are set
- [ ] JWT verification is correct for each function
- [ ] CORS headers are configured
- [ ] Error handling is implemented
- [ ] Logging is adequate for debugging
- [ ] Timeout values are appropriate
- [ ] Memory limits are sufficient

## Function Source Files

All function source files are located in:
```
supabase/functions/
├── _shared/              # Shared utilities
│   ├── email-template.ts
│   └── logo-base64.ts
├── analyze-damage/
│   └── index.ts
├── analyze-device/
│   └── index.ts
├── analyze-receipt/
│   └── index.ts
... (24 functions total)
```

## Environment Variables Available in Functions

These are automatically available:
- `SUPABASE_URL` - Your project URL
- `SUPABASE_ANON_KEY` - Anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (full access)

Plus any secrets you've configured.
