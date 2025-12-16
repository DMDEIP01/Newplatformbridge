# Supabase Setup Guide

This guide will help you set up a new Supabase project and connect it to this application for full portability and direct database access.

## Prerequisites

- A [Supabase account](https://supabase.com)
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed (optional, for edge function deployment)
- Node.js 18+ installed

## Step 1: Create a New Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in:
   - **Name**: Your project name
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose the closest region to your users
4. Click "Create new project"
5. Wait for the project to be provisioned (2-3 minutes)

## Step 2: Get Your Project Credentials

Once your project is ready:

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://abcdefghijklmnop.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - Keep this secret!

3. Go to **Settings** → **General**
4. Copy the **Reference ID** (e.g., `abcdefghijklmnop`)

## Step 3: Run the Database Migration

1. In your Supabase Dashboard, go to **SQL Editor**
2. Click "New query"
3. Open `CONSOLIDATED_MIGRATION.sql` from this repository
4. Copy the entire contents and paste into the SQL Editor
5. Click "Run" (this may take a minute)

**Note**: The migration includes:
- All tables (30+)
- All enums (10)
- All database functions (15+)
- All triggers
- All RLS policies
- Storage buckets
- Performance indexes

## Step 4: Configure Authentication

1. Go to **Authentication** → **Providers**
2. Ensure **Email** is enabled
3. Go to **Authentication** → **Settings**
4. Under "Auth settings":
   - Enable **"Enable email confirmations"** = OFF (for development)
   - Or configure your email provider for production

### Recommended Auth Settings for Development:
```
Auto-confirm email: ON
Enable email signups: ON
```

### For Production:
```
Auto-confirm email: OFF
Enable email signups: ON
Configure email templates
Set up custom SMTP provider
```

## Step 5: Update Environment Variables

Create or update your `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-ref
```

## Step 6: Deploy Edge Functions

See `EDGE_FUNCTIONS_DEPLOYMENT.md` for detailed instructions on deploying all 24 edge functions using the Supabase CLI.

Quick start:
```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy all functions
supabase functions deploy
```

## Step 7: Configure Secrets

In your Supabase Dashboard, go to **Settings** → **Edge Functions** → **Secrets**:

Add the following secrets:

| Secret Name | Description | Required |
|-------------|-------------|----------|
| `SENDGRID_API_KEY` | For sending emails | Yes (for email features) |
| `APP_URL` | Your app's public URL | Yes |
| `LOVABLE_API_KEY` | For AI features | Optional |

### Setting Secrets via CLI:
```bash
supabase secrets set SENDGRID_API_KEY=your-sendgrid-key
supabase secrets set APP_URL=https://your-app-url.com
```

## Step 8: Seed Demo Data (Optional)

To populate the database with demo data:

1. Navigate to `/seed-data` in your application
2. Click "Load Demo Data"
3. Or navigate to `/seed-retail-data` for retail-specific demo data

## Step 9: Create Initial Admin User

1. Sign up through your application's auth page
2. Run this SQL in Supabase SQL Editor to grant admin role:

```sql
-- Replace 'your-email@example.com' with your actual email
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM public.profiles
WHERE email = 'your-email@example.com';

-- Also grant system_admin if needed
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'system_admin'::app_role
FROM public.profiles
WHERE email = 'your-email@example.com';
```

## Connecting from Lovable

If you're using Lovable to build your frontend:

1. In your Lovable project settings, go to **Integrations**
2. Select **Connect to Supabase**
3. Enter your Supabase project URL and anon key
4. Click Connect

## Verification Checklist

After setup, verify everything works:

- [ ] Can sign up/login
- [ ] Can view products and programs
- [ ] Can create policies
- [ ] Can submit claims
- [ ] Edge functions respond correctly
- [ ] Emails are being sent (if configured)

## Troubleshooting

### "Row Level Security violation" errors
- Ensure you're logged in
- Check that the user has the correct role assigned
- Verify RLS policies were created correctly

### Edge functions not working
- Check that secrets are configured
- Verify functions are deployed: `supabase functions list`
- Check function logs: `supabase functions logs <function-name>`

### Auth not working
- Verify email confirmation settings
- Check auth provider configuration
- Review auth logs in Supabase Dashboard

## Database Schema Overview

### Core Tables
- `profiles` - User profile data
- `user_roles` - Role assignments
- `programs` - Insurance programs
- `products` - Insurance products
- `policies` - Customer policies
- `claims` - Insurance claims
- `complaints` - Customer complaints
- `service_requests` - Service tickets

### Supporting Tables
- `covered_items` - Items covered by policies
- `claim_fulfillment` - Claim repair/replacement tracking
- `repairers` - Repair service providers
- `documents` - File storage references
- `payments` - Payment records
- `policy_communications` - Email/communication history

### Configuration Tables
- `promotions` - Promotional offers
- `perils` - Coverage types
- `devices` - Device catalog
- `communication_templates` - Email templates

## Support

For issues specific to this application, please check the project documentation or raise an issue in the repository.

For Supabase-specific issues, refer to:
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
