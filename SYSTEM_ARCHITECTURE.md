# System Architecture Documentation

## Project Overview
Insurance/Warranty Management Platform with multi-role access control, claims processing, policy management, and fulfillment workflows.

---

## System Components

### 1. Frontend Application
- **Framework**: React 18.3.1 with TypeScript
- **Routing**: React Router DOM
- **UI Library**: Shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with semantic tokens
- **State Management**: TanStack Query for server state

### 2. Backend (Lovable Cloud - Supabase)
- **Database**: PostgreSQL
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage (5 buckets)
- **Edge Functions**: Deno-based serverless functions
- **Real-time**: WebSocket connections for live updates

---

## Database Schema

### Core Tables

#### **profiles**
User profile information linked to authentication
```sql
- id (uuid, PK, references auth.users)
- email (text, NOT NULL)
- full_name (text, NOT NULL)
- phone (text)
- address_line1 (text)
- address_line2 (text)
- city (text)
- postcode (text)
- repairer_id (uuid, FK to repairers)
- must_change_password (boolean, default: false)
- created_at (timestamp)
- updated_at (timestamp)
```

#### **user_roles**
Multi-role authorization system
```sql
- id (uuid, PK)
- user_id (uuid, FK to profiles)
- role (app_role enum)
- program_id (uuid, FK to programs, nullable)
- created_at (timestamp)

Supported roles:
- admin
- consultant
- retail_agent
- claims_agent
- complaints_agent
- repairer_agent
- commercial_agent
- backoffice_agent
- system_admin
```

#### **programs**
Multi-tenancy program management
```sql
- id (uuid, PK)
- name (text, NOT NULL)
- description (text)
- is_active (boolean, default: true)
- data_isolation_enabled (boolean, default: true)
- reference_formats (jsonb)
- settings (jsonb)
- created_at (timestamp)
- updated_at (timestamp)
```

#### **products**
Insurance/warranty product definitions
```sql
- id (uuid, PK)
- product_id (text, NOT NULL, auto-generated: PRD-XXXXXX)
- name (text, NOT NULL)
- product_name_external (text)
- type (text, default: 'Standard')
- tier (integer, default: 1)
- coverage (text[], NOT NULL)
- perils (text[])
- device_categories (text[])
- rrp_min (numeric, NOT NULL)
- rrp_max (numeric)
- monthly_premium (numeric, NOT NULL)
- premium_frequency (text, default: 'monthly')
- policy_term_years (integer, default: 1)
- excess_1 (numeric, NOT NULL)
- excess_2 (numeric, default: 0)
- store_commission (numeric, default: 5)
- payment_types (text[])
- fulfillment_method (text)
- voucher_options (text[])
- tax_name (text)
- tax_type (text)
- tax_value (numeric)
- tax_value_type (text)
- link_code (text)
- promotion (text)
- eligibility_rules (jsonb)
- validity_rules (jsonb)
- renewal_rules (jsonb)
- product_parameters (jsonb)
- peril_details (jsonb)
- created_at (timestamp)
```

#### **policies**
Customer policy records
```sql
- id (uuid, PK)
- policy_number (text, NOT NULL, auto-generated)
- user_id (uuid, FK to profiles)
- product_id (uuid, FK to products)
- program_id (uuid, FK to programs)
- consultant_id (uuid, FK to profiles)
- status (policy_status enum: active/cancelled/expired/pending)
- start_date (date, NOT NULL)
- renewal_date (date, NOT NULL)
- customer_name (text)
- customer_email (text)
- customer_phone (text)
- customer_address_line1 (text)
- customer_address_line2 (text)
- customer_city (text)
- customer_postcode (text)
- cancellation_reason (text)
- cancellation_details (text)
- cancelled_at (timestamp)
- notes (text)
- created_at (timestamp)
- updated_at (timestamp)
```

#### **claims**
Claim submissions and processing
```sql
- id (uuid, PK)
- claim_number (text, NOT NULL, auto-generated)
- policy_id (uuid, FK to policies)
- user_id (uuid, FK to profiles)
- consultant_id (uuid, FK to profiles)
- claim_type (claim_type enum)
- status (claim_status enum)
- description (text, NOT NULL)
- product_condition (text)
- has_receipt (boolean, default: false)
- decision (text)
- decision_reason (text)
- submitted_date (timestamp, default: now())
- created_at (timestamp)
- updated_at (timestamp)
```

#### **claim_fulfillment**
Fulfillment workflow tracking
```sql
- id (uuid, PK)
- claim_id (uuid, FK to claims)
- repairer_id (uuid, FK to repairers)
- status (text, default: 'pending_excess')
- fulfillment_type (text)
- excess_amount (numeric)
- excess_paid (boolean, default: false)
- excess_payment_method (text)
- excess_payment_date (timestamp)
- device_value (numeric)
- quote_status (text)
- quote_amount (numeric)
- quote_rejection_reason (text)
- appointment_date (timestamp)
- appointment_slot (text)
- repair_scheduled_date (timestamp)
- repair_scheduled_slot (text)
- repair_outcome (text)
- ber_reason (text)
- inspection_photos (text[])
- inspection_notes (text)
- engineer_reference (text)
- logistics_reference (text)
- notes (text)
- created_at (timestamp)
- updated_at (timestamp)
```

#### **complaints**
Customer complaint management
```sql
- id (uuid, PK)
- complaint_reference (text, auto-generated: CMP-YYYY-XXXXXX)
- user_id (uuid, FK to profiles)
- policy_id (uuid, FK to policies)
- customer_name (text)
- customer_email (text)
- reason (complaint_reason enum)
- complaint_type (text)
- classification (text)
- details (text, NOT NULL)
- status (text, default: 'submitted')
- response (text)
- response_date (timestamp)
- assigned_to (uuid, FK to profiles)
- reviewed_by (uuid, FK to profiles)
- reviewed_at (timestamp)
- notes (text)
- created_at (timestamp)
- updated_at (timestamp)
```

#### **service_requests**
Customer service inquiry system
```sql
- id (uuid, PK)
- user_id (uuid, FK to profiles)
- policy_id (uuid, FK to policies)
- reference_number (text, auto-generated: SR-YYYY-XXXXXX)
- subject (text, NOT NULL)
- category (text, NOT NULL)
- priority (text, default: 'medium')
- status (text, default: 'open')
- last_activity_at (timestamp, default: now())
- resolved_at (timestamp)
- resolved_by (uuid, FK to profiles)
- created_at (timestamp)
- updated_at (timestamp)
```

#### **devices**
Device catalog for insurance
```sql
- id (uuid, PK)
- manufacturer (text, NOT NULL)
- model_name (text, NOT NULL)
- device_category (text, NOT NULL)
- rrp (numeric, NOT NULL)
- external_reference (text)
- include_in_promos (boolean, default: true)
- created_at (timestamp)
- updated_at (timestamp)
```

#### **repairers**
Authorized repair network
```sql
- id (uuid, PK)
- name (text, NOT NULL)
- contact_name (text)
- email (text, NOT NULL)
- phone (text)
- address (text)
- capabilities (text[])
- is_active (boolean, default: true)
- created_at (timestamp)
- updated_at (timestamp)
```

### Supporting Tables

#### **perils**
Covered insurance perils/events
```sql
- id (uuid, PK)
- name (text, NOT NULL)
- description (text)
- acceptance_logic (jsonb)
- rejection_terms (jsonb)
- evidence_requirements (jsonb)
- is_active (boolean, default: true)
```

#### **promotions**
Marketing promotions and discounts
```sql
- id (uuid, PK)
- promo_name (text, NOT NULL)
- promo_code (text, NOT NULL)
- promo_type (text, NOT NULL)
- description (text)
- discount_value (numeric)
- free_months (integer)
- voucher_value (numeric)
- start_date (date, NOT NULL)
- end_date (date, NOT NULL)
- max_uses (integer)
- current_uses (integer, default: 0)
- logo_url (text)
- terms_conditions (text)
- is_active (boolean, default: true)
```

#### **documents**
File storage metadata
```sql
- id (uuid, PK)
- user_id (uuid, FK to profiles)
- policy_id (uuid, FK to policies)
- claim_id (uuid, FK to claims)
- service_request_id (uuid, FK to service_requests)
- document_type (document_type enum)
- document_subtype (document_subtype enum)
- file_name (text, NOT NULL)
- file_path (text, NOT NULL)
- file_size (integer)
- metadata (jsonb)
- uploaded_date (timestamp, default: now())
```

#### **payments**
Payment transaction records
```sql
- id (uuid, PK)
- user_id (uuid, FK to profiles)
- policy_id (uuid, FK to policies)
- claim_id (uuid, FK to claims)
- reference_number (text, NOT NULL)
- amount (numeric, NOT NULL)
- payment_type (payment_type enum)
- status (payment_status enum, default: 'pending')
- payment_date (timestamp)
- created_at (timestamp)
```

---

## Row-Level Security (RLS) Policies

### Access Control Matrix

| Table | Role | SELECT | INSERT | UPDATE | DELETE |
|-------|------|--------|--------|--------|--------|
| **profiles** | Own user | ✓ | - | ✓ | - |
| | retail_agent | ✓ | - | - | - |
| | system_admin | ✓ | - | - | - |
| **policies** | Own user | ✓ | ✓ | ✓ | - |
| | consultant | ✓ | ✓ | ✓* | - |
| | retail_agent | ✓ | ✓ | ✓ | - |
| | claims_agent | ✓ | - | - | - |
| **claims** | Own user | ✓ | ✓ | ✓ | - |
| | consultant | ✓ | ✓ | ✓ | - |
| | retail_agent | ✓ | ✓ | ✓ | - |
| | claims_agent | ✓ | - | ✓ | - |
| | repairer_agent | ✓ | - | ✓ | - |
| **complaints** | Own user | ✓ | ✓ | - | - |
| | consultant | ✓ | ✓ | ✓ | - |
| | complaints_agent | ✓ | - | ✓ | - |
| **service_requests** | Own user | ✓ | ✓ | ✓ | - |
| | retail_agent | ✓ | ✓ | ✓ | - |
| | claims_agent | ✓ | - | ✓ | - |
| | commercial_agent | ✓ | ✓ | ✓ | - |
| | backoffice_agent | ✓ | ✓ | ✓ | - |
| **products** | Anyone | ✓ | - | - | - |
| | system_admin | ✓ | ✓ | ✓ | ✓ |
| **devices** | Anyone | ✓ | - | - | - |
| | system_admin | ✓ | ✓ | ✓ | ✓ |

*Consultants can only update policies assigned to them

---

## Database Functions

### **generate_policy_number(product_name text)**
Generates sequential policy numbers with product prefix (EW/IL/IM)

### **generate_claim_number(product_name text)**
Generates sequential claim numbers with product prefix

### **generate_service_request_reference()**
Generates service request references (SR-YYYY-XXXXXX)

### **generate_complaint_reference()**
Generates complaint references (CMP-YYYY-XXXXXX)

### **has_role(_user_id uuid, _role app_role, _program_id uuid)**
Checks if user has specific role (optionally scoped to program)

### **has_section_access(_user_id uuid, _program_id uuid, _section retail_portal_section)**
Checks if user has access to specific retail portal section

### **link_policy_to_existing_user()**
Trigger function to automatically link policies to users by email match

### **handle_new_user()**
Trigger function to create profile and link policies on user signup

---

## Storage Buckets

1. **claim-receipts** (Private)
   - Purchase receipts for claims
   - Access: User owns claim

2. **policy-documents** (Private)
   - Generated policy documents
   - Access: User owns policy

3. **claim-documents** (Private)
   - Supporting claim documentation
   - Access: User owns claim

4. **inspection-photos** (Private)
   - Device inspection photos for fulfillment
   - Access: User owns claim, repairer agents

5. **promotion-logos** (Public)
   - Promotional material images
   - Access: Public read

---

## Edge Functions

### **manage-user**
- **Auth**: Required (JWT)
- **Purpose**: User management operations (create, update roles)
- **Used by**: System admins

### **grant-consultant**
- **Auth**: Required (JWT)
- **Purpose**: Grant consultant role to user
- **Used by**: Admins

### **grant-role**
- **Auth**: Required (JWT)
- **Purpose**: Generic role assignment with user creation
- **Used by**: Admins

### **grant-system-admin**
- **Auth**: Required (JWT)
- **Purpose**: Grant system_admin role
- **Used by**: Super admins

### **send-templated-email**
- **Auth**: Required (JWT)
- **Purpose**: Send emails using templates
- **Integration**: SendGrid or Resend
- **Used by**: System (policy communications)

### **generate-policy-documents**
- **Auth**: Required (JWT)
- **Purpose**: Generate PDF policy documents
- **Used by**: Policy creation workflow

### **retail-policy-lookup**
- **Auth**: Required (JWT)
- **Purpose**: Search policies by various criteria
- **Used by**: Retail agents

### **analyze-damage**
- **Auth**: Required (JWT)
- **Purpose**: AI analysis of damage photos
- **Integration**: Lovable AI (Gemini models)
- **Used by**: Claims workflow

### **analyze-device**
- **Auth**: Required (JWT)
- **Purpose**: AI analysis of device photos
- **Integration**: Lovable AI (Gemini models)
- **Used by**: Claims workflow

### **analyze-receipt**
- **Auth**: Required (JWT)
- **Purpose**: AI OCR and analysis of receipts
- **Integration**: Lovable AI (Gemini models)
- **Used by**: Claims workflow

### **claims-fulfillment-advisor**
- **Auth**: Required (JWT)
- **Purpose**: AI-powered fulfillment recommendations
- **Integration**: Lovable AI
- **Used by**: Claims agents

### **service-agent**
- **Auth**: Required (JWT)
- **Purpose**: AI chatbot for service requests
- **Integration**: Lovable AI
- **Used by**: Service request chat

### **seed-demo-data**
- **Auth**: Required (JWT)
- **Purpose**: Seed demonstration data
- **Used by**: Setup wizards

### **seed-retail-data**
- **Auth**: Not required
- **Purpose**: Seed retail portal demo data
- **Used by**: Setup wizards

---

## Authentication Flow

```
1. User visits /auth or /retail/auth
2. Enters credentials (email + password)
3. Supabase Auth validates credentials
4. On success:
   - JWT token issued
   - Session stored in localStorage
   - User redirected based on role:
     * End users → /dashboard
     * Retail/Admin users → /retail/dashboard
5. Protected routes check:
   - Valid session exists
   - User has required role(s)
   - RLS policies enforce data access
```

### Role Assignment
- Roles stored in `user_roles` table
- Multiple roles per user supported
- Program-scoped roles available
- System admin role bypasses most restrictions

---

## Key Business Workflows

### 1. Policy Sale
```
Retail Agent → Select Product → Enter Customer Details → 
Apply Promotion (optional) → Generate Policy Number → 
Create Policy Record → Generate Documents → Send Welcome Email
```

### 2. Claim Submission
```
User/Agent → Submit Claim → Upload Receipt/Photos → 
AI Analysis (damage/device) → Status: Notified → 
Claims Agent Review → Decision (approve/reject) → 
If Approved: Route to Fulfillment
```

### 3. Claim Fulfillment
```
Approved Claim → Match Repairer (by device/location) → 
Collect Excess Payment → Schedule Appointment → 
Repairer Inspection → Quote (if needed) → 
Repair/Replace/BER → Update Status → Close Claim
```

### 4. Complaint Handling
```
User/Agent → Submit Complaint → Auto-assign Reference → 
Complaints Agent Review → Classify → Respond → 
Mark Resolved → Log Activity
```

### 5. Service Request
```
User → Create Request → AI Agent Initial Response → 
Agent Assignment (if needed) → Back-and-forth Messages → 
Resolve → Close Request
```

---

## Security Architecture

### Authentication
- Supabase Auth with email/password
- JWT tokens with automatic refresh
- Session management via localStorage
- Auto-confirm email enabled for non-production

### Authorization
- Multi-role system via `user_roles` table
- Row-Level Security (RLS) on all tables
- Role-based route protection in frontend
- Program-scoped access control

### Data Isolation
- RLS policies enforce user ownership
- Program-level data isolation supported
- Agents can view assigned records only
- System admins have full visibility

### API Security
- All edge functions verify JWT (except setup functions)
- Service role key used for admin operations
- CORS headers configured
- Input validation on all endpoints

---

## Enums and Constants

### app_role
```
admin, consultant, retail_agent, claims_agent, 
complaints_agent, repairer_agent, commercial_agent, 
backoffice_agent, system_admin
```

### claim_status
```
notified, accepted, rejected, referred, 
inbound_logistics, repair, outbound_logistics, closed,
referred_pending_info, excess_due, excess_paid_fulfillment_pending,
fulfillment_inspection_booked, estimate_received, fulfillment_outcome,
referred_info_received, pending_fulfillment
```

### claim_type
```
breakdown, damage, theft
```

### policy_status
```
active, cancelled, expired, pending
```

### payment_status
```
pending, completed, failed, refunded
```

### document_type
```
policy, claim, receipt, proof_of_purchase, other
```

### complaint_reason
```
claim_processing, customer_service, policy_terms,
payment_issue, product_coverage, other
```

---

## Technology Stack Summary

### Frontend
- React 18.3.1
- TypeScript 5.x
- Vite build tool
- Tailwind CSS 3.x
- React Router DOM 6.30
- TanStack Query 5.83
- Shadcn/ui components
- Lucide React icons

### Backend (Lovable Cloud)
- PostgreSQL 15+
- Supabase Auth
- Supabase Storage
- Deno Edge Functions
- SendGrid/Resend (email)

### AI Integration
- Lovable AI API
- Gemini 2.5 Pro/Flash models
- Image analysis
- Document OCR
- Chatbot capabilities

---

## Environment Variables

```
VITE_SUPABASE_URL=<project_url>
VITE_SUPABASE_PUBLISHABLE_KEY=<anon_key>
VITE_SUPABASE_PROJECT_ID=<project_id>
SUPABASE_URL=<project_url>
SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
SUPABASE_DB_URL=<database_url>
SENDGRID_API_KEY=<sendgrid_key>
RESEND_API_KEY=<resend_key>
LOVABLE_API_KEY=<lovable_ai_key>
```

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Browser                          │
│  React SPA (hosted on Lovable/Vercel/Custom domain)        │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTPS
                  │
┌─────────────────▼───────────────────────────────────────────┐
│              Lovable Cloud (Supabase)                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  PostgreSQL Database (with RLS)                      │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Supabase Auth (JWT)                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Storage Buckets (5 buckets)                        │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Edge Functions (Deno runtime)                       │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ API Calls
                  │
┌─────────────────▼───────────────────────────────────────────┐
│              External Services                               │
│  - Lovable AI (Gemini models)                               │
│  - SendGrid (email delivery)                                │
│  - Resend (email alternative)                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Relationships Diagram

```
users (auth.users)
  ↓
profiles (1:1)
  ↓
user_roles (1:N) → programs (N:1)
  ↓
policies (N:1)
  ├→ products (N:1)
  ├→ covered_items (1:N)
  ├→ policy_communications (1:N)
  ├→ policy_change_history (1:N)
  ├→ documents (1:N)
  ├→ payments (1:N)
  └→ claims (1:N)
      ├→ claim_status_history (1:N)
      ├→ claim_fulfillment (1:1)
      │   ├→ repairers (N:1)
      │   └→ repair_costs (1:N)
      ├→ documents (1:N)
      └→ payments (1:N)

complaints (N:1) → policies
service_requests (N:1) → policies
  └→ service_request_messages (1:N)

products (1:N)
  ├→ program_products (N:N) → programs
  ├→ product_promotions (N:N) → promotions
  ├→ product_communication_templates (N:N) → communication_templates
  └→ fulfillment_assignments (1:N) → repairers

devices (standalone catalog)
perils (standalone definitions)
```

---

## Performance Considerations

1. **Indexes**: Automatically created on foreign keys and frequently queried fields
2. **RLS Performance**: Policies use `has_role()` function for efficient role checks
3. **Query Optimization**: TanStack Query caches API responses
4. **Real-time**: Selective use of Supabase Realtime subscriptions
5. **File Storage**: CDN-backed storage buckets for fast delivery

---

## Maintenance & Monitoring

### Database Migrations
- All schema changes via `supabase/migrations/` directory
- Sequential timestamp-based migration files
- Automatic deployment on commit

### Logging
- Edge function logs available in Cloud console
- Database query logs (via `postgres_logs`)
- Auth logs (via `auth_logs`)
- Analytics queries via `supabase--analytics-query`

### Backup Strategy
- Automated daily backups (Supabase managed)
- Point-in-time recovery available
- Export capabilities for all tables

---

*Generated: 2024-12-04*
*Project ID: ynphvrkktapgghzxjakp*
