# EIP Care Portal - Quick Start & Demo Guide

> **Version:** 1.0 | **Last Updated:** December 2024

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Quick Setup Checklist](#quick-setup-checklist)
3. [Demo Walkthrough by Portal](#demo-walkthrough-by-portal)
4. [Feature Matrix](#feature-matrix)
5. [Role-Based Access Guide](#role-based-access-guide)
6. [AI Features Showcase](#ai-features-showcase)
7. [Integration Points](#integration-points)
8. [Common Workflows](#common-workflows)
9. [Troubleshooting Tips](#troubleshooting-tips)

---

## Executive Summary

### What is EIP Care Portal?

EIP Care Portal is a comprehensive **insurance and warranty management platform** designed to streamline the entire lifecycle of product protection plans - from policy sales through claims processing to customer service.

### Platform Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EIP CARE PORTAL                              │
├─────────────────┬─────────────────────────┬─────────────────────────┤
│  CUSTOMER       │  RETAIL / BACKOFFICE    │  PROGRAM CONFIGURATION  │
│  PORTAL         │  PORTAL                 │  PORTAL                 │
├─────────────────┼─────────────────────────┼─────────────────────────┤
│ • View Policies │ • Policy Sales          │ • Program Management    │
│ • Submit Claims │ • Claims Processing     │ • Product Configuration │
│ • Track Status  │ • Customer Management   │ • Peril Rules           │
│ • Documents     │ • Complaint Handling    │ • Repairer Network      │
│ • Complaints    │ • Repairer Jobs         │ • User Management       │
│ • Service Req.  │ • Reports & Analytics   │ • Communications        │
└─────────────────┴─────────────────────────┴─────────────────────────┘
```

### Key Value Propositions

| Capability | Description |
|------------|-------------|
| **Multi-Tenant** | Support multiple insurance programs with isolated data |
| **AI-Powered** | Automated damage analysis, receipt OCR, smart recommendations |
| **End-to-End** | Complete workflow from policy sale to claim fulfillment |
| **Role-Based** | 10 distinct user roles with granular permissions |
| **Configurable** | Flexible product rules, pricing tiers, and coverage options |
| **Integrated** | Email notifications, document storage, repairer coordination |

---

## Quick Setup Checklist

### Prerequisites

- [ ] Supabase project created (or Lovable Cloud enabled)
- [ ] Database migrations executed (`CONSOLIDATED_MIGRATION.sql`)
- [ ] Edge functions deployed
- [ ] Required secrets configured:
  - `SENDGRID_API_KEY` - Email notifications
  - `LOVABLE_API_KEY` - AI features (auto-provided in Lovable Cloud)
  - `APP_URL` - Application base URL

### Step 1: Seed Demo Data

Navigate to `/seed-data` in the application and click "Seed Demo Data" to populate:
- Sample programs (MediaMarkt, Saturn)
- Products with pricing tiers
- Device catalog
- Perils and coverage rules
- Communication templates

### Step 2: Create Admin User

Navigate to `/setup-system-admin` and create your first system administrator account.

### Step 3: Seed Retail Data (Optional)

Navigate to `/seed-retail-data` to create sample:
- Customers with policies
- Claims in various statuses
- Complaints and service requests
- Repairer companies and users

### Step 4: Access the Portals

| Portal | URL | Purpose |
|--------|-----|---------|
| Customer Portal | `/` (Login) | Customer self-service |
| Retail Portal | `/retail` | Staff operations |
| Admin Portal | `/programs` | System configuration |

---

## Demo Walkthrough by Portal

### Customer Portal Demo (5 Scenarios)

#### Scenario 1: Customer Registration & Login
1. Navigate to `/auth`
2. Click "Sign Up" tab
3. Enter email, password, and full name
4. Submit and verify email (auto-confirmed in dev mode)
5. Login with credentials

#### Scenario 2: View Policies & Documents
1. After login, view the Dashboard
2. Navigate to "My Policies" to see active protection plans
3. Click a policy to view details:
   - Coverage information
   - Covered device details
   - Policy documents (IPID, Terms, Schedule)
4. Download documents as needed

#### Scenario 3: Submit a Claim
1. From a policy, click "Make a Claim"
2. Select claim type: **Breakdown**, **Damage**, or **Theft**
3. Complete the multi-step form:
   - **Step 1:** Select policy
   - **Step 2:** Device information
   - **Step 3:** Upload damage photos
   - **Step 4:** Describe the fault/damage
   - **Step 5:** Upload supporting documents
4. Submit and receive claim reference number

#### Scenario 4: Track Claim Status
1. Navigate to "My Claims"
2. View claim status progression:
   - Notified → Accepted/Rejected/Referred
   - Fulfillment stages (Repair, Voucher, Replacement)
3. View AI damage analysis results
4. Upload additional documents if requested

#### Scenario 5: Raise a Service Request
1. Navigate to "Service Request"
2. Select reason and policy (if applicable)
3. Describe your query
4. Submit and receive reference number
5. Track responses via chat interface

---

### Retail/BackOffice Portal Demo (8 Scenarios)

#### Access the Retail Portal
1. Navigate to `/retail`
2. Select a role to login:
   - **Consultant** - Policy sales
   - **Claims Agent** - Claims processing
   - **Complaints Agent** - Complaint handling
   - **Repairer Agent** - Repair job management
   - **Backoffice Agent** - Full access
3. Enter PIN (default: `1234` for demo users)

#### Scenario 1: Create a Policy Sale (Consultant)
1. Navigate to "Sales"
2. Fill customer details:
   - Name, email, phone
   - Address information
3. Select product and coverage tier
4. Specify device details:
   - Category, manufacturer, model
   - Purchase date and price
5. Apply promotion code (optional)
6. Generate policy documents
7. Complete sale

#### Scenario 2: Policy Search & Management
1. Navigate to "Policy Search"
2. Search by:
   - Policy number
   - Customer name/email
   - Phone number
3. View policy details:
   - Status, coverage, premium
   - Linked claims and payments
   - Communication history
4. Actions available:
   - Edit customer details
   - Cancel policy
   - Switch/upgrade product
   - Add notes

#### Scenario 3: Process a Claim (Claims Agent)
1. Navigate to "Claims Management"
2. View claims queue with SLA indicators
3. Click a claim to review:
   - Customer and policy details
   - Submitted photos and documents
   - AI damage analysis results
4. Make decision:
   - **Accept** - Proceed to fulfillment
   - **Reject** - Provide rejection reason
   - **Refer** - Request additional information

#### Scenario 4: Manage Claim Fulfillment
1. From an accepted claim, click "Manage Fulfillment"
2. Select fulfillment method:
   - **Repair** - Assign to repairer
   - **Voucher** - Generate store credit
   - **Replacement** - Arrange new device
   - **Cash Settlement** - Direct payment
3. For repairs:
   - Select repairer from network
   - Book inspection appointment
   - Track repair progress
   - Record costs and outcomes

#### Scenario 5: Handle a Complaint (Complaints Agent)
1. Navigate to "Complaints Management"
2. View complaint queue
3. Select a complaint to review:
   - Customer details
   - Related policy/claim
   - Complaint reason and details
4. Process complaint:
   - Add investigation notes
   - Assign classification
   - Record resolution
   - Send response to customer

#### Scenario 6: Repairer Job Management (Repairer Agent)
1. Navigate to "Repairer Jobs"
2. View assigned repair jobs
3. For each job:
   - Review device and fault details
   - Upload inspection photos
   - Submit repair quote
   - Record repair outcome
   - Add cost breakdown (parts, labor)

#### Scenario 7: Service Request Handling
1. Navigate to "Service Request"
2. View incoming customer queries
3. Use AI-powered chat to:
   - Answer policy questions
   - Provide claim status updates
   - Escalate complex issues
4. Mark requests as resolved

#### Scenario 8: View Reports & Analytics
1. Navigate to "Reports"
2. View dashboards:
   - Sales performance by consultant
   - Claims statistics and trends
   - SLA compliance metrics
3. Export data for analysis

---

### Program Configuration Portal Demo (6 Scenarios)

#### Access the Admin Portal
1. Navigate to `/programs`
2. Login as System Administrator

#### Scenario 1: Create a New Program
1. Click "Create Program"
2. Enter program details:
   - Name and description
   - Data isolation settings
3. Configure reference number formats:
   - Policy number pattern
   - Claim number pattern
   - Complaint reference pattern
4. Save program

#### Scenario 2: Configure Products
1. Select a program
2. Navigate to "Products" tab
3. Create/edit products:
   - Product name and ID
   - Pricing tiers (monthly premium)
   - Excess amounts
   - Device price ranges (RRP min/max)
   - Policy term length
4. Configure product rules:
   - Eligibility rules (device age, price limits)
   - Validity rules (coverage start dates)
   - Renewal rules (auto-renewal settings)

#### Scenario 3: Set Up Perils & Coverage
1. Navigate to "Perils" tab
2. Create peril definitions:
   - Accidental Damage
   - Mechanical Breakdown
   - Theft
   - Liquid Damage
3. Configure for each peril:
   - Acceptance logic (conditions for coverage)
   - Rejection terms (exclusions)
   - Evidence requirements (photos, receipts)

#### Scenario 4: Manage Device Catalog
1. Navigate to `/device-details`
2. View/edit device database:
   - Categories (Phones, Tablets, Laptops, etc.)
   - Manufacturers and models
   - RRP and trade-in values
3. Import devices in bulk
4. Set promotional eligibility

#### Scenario 5: Configure Repairer Network
1. Navigate to "Repairers" tab
2. Add repairer companies:
   - Company details and contact
   - Service areas
   - Specializations
3. Configure SLAs:
   - Response time targets
   - Repair time limits
   - Quality metrics
4. Set up fulfillment assignments:
   - Device category matching
   - Program associations

#### Scenario 6: Manage Users & Permissions
1. Navigate to "Users" tab
2. Create user accounts:
   - Assign roles
   - Set program access
3. Configure user groups:
   - Group permissions
   - Section access by program
4. Manage PINs and passwords

---

## Feature Matrix

| Feature | Customer | Retail | Admin | Roles |
|---------|:--------:|:------:|:-----:|-------|
| View Policies | ✅ | ✅ | ✅ | All |
| Policy Documents | ✅ | ✅ | ✅ | All |
| Submit Claims | ✅ | ✅ | - | Customer, Consultant |
| Process Claims | - | ✅ | - | Claims Agent, Backoffice |
| Claim Fulfillment | - | ✅ | - | Claims Agent, Repairer |
| Create Policies | - | ✅ | - | Consultant, Retail Agent |
| Cancel Policies | - | ✅ | - | Backoffice Agent |
| Submit Complaints | ✅ | ✅ | - | Customer, Consultant |
| Handle Complaints | - | ✅ | - | Complaints Agent |
| Service Requests | ✅ | ✅ | - | All |
| View Reports | - | ✅ | ✅ | Backoffice, Admin |
| Program Config | - | - | ✅ | System Admin |
| Product Config | - | - | ✅ | Admin |
| User Management | - | - | ✅ | System Admin |
| Repairer Jobs | - | ✅ | - | Repairer Agent |

---

## Role-Based Access Guide

### Role Definitions

| Role | Code | Description | Portal Access |
|------|------|-------------|---------------|
| Customer | `customer` | End-user with policies | Customer Portal |
| Consultant | `consultant` | Sales representative | Retail Portal (Sales) |
| Retail Agent | `retail_agent` | Store staff | Retail Portal (Sales, Search) |
| Claims Agent | `claims_agent` | Claims processor | Retail Portal (Claims) |
| Complaints Agent | `complaints_agent` | Complaint handler | Retail Portal (Complaints) |
| Repairer Agent | `repairer_agent` | Repair technician | Retail Portal (Jobs) |
| Backoffice Agent | `backoffice_agent` | Full operations | Retail Portal (All) |
| Commercial Agent | `commercial_agent` | Partner manager | Retail Portal (Reports) |
| Admin | `admin` | Program admin | Admin Portal |
| System Admin | `system_admin` | Full system access | All Portals |

### Section Permissions (Retail Portal)

| Section | Consultant | Retail | Claims | Complaints | Repairer | Backoffice |
|---------|:----------:|:------:|:------:|:----------:|:--------:|:----------:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sales | ✅ | ✅ | - | - | - | ✅ |
| Policy Search | ✅ | ✅ | ✅ | ✅ | - | ✅ |
| Make Claim | ✅ | ✅ | ✅ | - | - | ✅ |
| Claims Management | - | - | ✅ | - | - | ✅ |
| Complaints Mgmt | - | - | - | ✅ | - | ✅ |
| Repairer Jobs | - | - | - | - | ✅ | ✅ |
| Service Request | ✅ | ✅ | ✅ | ✅ | - | ✅ |
| Reports | - | - | - | - | - | ✅ |
| Consultants | - | - | - | - | - | ✅ |

### Granting Roles

Roles are granted via the `grant-role` edge function:

```javascript
// Grant consultant role for specific program
await supabase.functions.invoke('grant-role', {
  body: {
    userId: 'user-uuid',
    role: 'consultant',
    programId: 'program-uuid'
  }
});
```

---

## AI Features Showcase

### 1. Damage Photo Analysis

**Function:** `analyze-damage`

Analyzes uploaded claim photos to:
- Detect damage type and severity
- Identify affected components
- Estimate repair complexity
- Flag potential fraud indicators

**Usage in Claims:**
- Photos uploaded during claim submission are automatically analyzed
- Results shown to claims agents during processing
- Confidence scores help guide decisions

### 2. Receipt OCR & Validation

**Function:** `analyze-receipt`

Extracts from purchase receipts:
- Store name and date
- Product description
- Purchase price
- Serial/model numbers

**Validation Checks:**
- Receipt date within eligibility window
- Price within product tier limits
- Device matches policy coverage

### 3. Device Recognition

**Function:** `analyze-device`

Identifies devices from photos:
- Manufacturer and model
- Device condition assessment
- Matches against device catalog
- Suggests appropriate coverage tier

### 4. Fulfillment Recommendations

**Function:** `claims-fulfillment-advisor`

AI-powered recommendations for:
- Optimal fulfillment method
- Repairer selection
- Cost-benefit analysis
- Settlement amount suggestions

### 5. Service Agent Chatbot

**Function:** `service-agent`

Conversational AI for:
- Policy information queries
- Claim status updates
- FAQ responses
- Escalation to human agents

---

## Integration Points

### Email Notifications (SendGrid/Resend)

**Trigger Points:**
- Policy creation confirmation
- Claim status updates
- Document requests
- Complaint responses
- Payment reminders

**Templates Managed:**
- Configurable per product
- Branded with program logo
- Multi-language support

### Document Storage

**Storage Buckets:**
- `policy-documents` - Generated PDFs
- `claim-photos` - Customer uploads
- `receipts` - Purchase evidence
- `repairer-reports` - Inspection photos

### Payment Recording

**Tracked Payments:**
- Premium payments
- Excess payments
- Settlement payouts

**Integration Ready:**
- Stripe-compatible structure
- Payment status tracking
- Refund handling

### Repairer Network

**Coordination Features:**
- Automated job assignment
- SLA monitoring
- Quote submission
- Cost tracking
- Performance metrics

---

## Common Workflows

### Policy Lifecycle

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   PENDING   │────▶│   ACTIVE    │────▶│   EXPIRED   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  CANCELLED  │
                    └─────────────┘
```

**Key Actions:**
- Policy created → Documents generated → Email sent
- Renewal date approaching → Reminder sent
- Cancellation requested → Cooling-off check → Refund calculated

### Claim Lifecycle

```
┌──────────┐     ┌──────────┐     ┌──────────────┐
│ NOTIFIED │────▶│ ACCEPTED │────▶│ FULFILLMENT  │
└──────────┘     └──────────┘     └──────────────┘
     │                                    │
     ▼                                    ▼
┌──────────┐                       ┌──────────┐
│ REJECTED │                       │  CLOSED  │
└──────────┘                       └──────────┘
     │
     ▼
┌──────────┐
│ REFERRED │ (Request more info)
└──────────┘
```

**Fulfillment Types:**
- **Repair:** Inspection → Quote → Approval → Repair → Return
- **Voucher:** Value calculated → Code generated → Sent to customer
- **Replacement:** Stock check → Dispatch → Delivery confirmation
- **Cash:** Amount agreed → Payment processed

### Complaint Handling

```
┌─────────┐     ┌──────────────┐     ┌──────────────┐
│  OPEN   │────▶│ IN PROGRESS  │────▶│   RESOLVED   │
└─────────┘     └──────────────┘     └──────────────┘
                      │
                      ▼
               ┌──────────────┐
               │  ESCALATED   │
               └──────────────┘
```

---

## Troubleshooting Tips

### Common Setup Issues

| Issue | Solution |
|-------|----------|
| "No policies found" | Run seed data, check RLS policies |
| "Permission denied" | Verify user role assignment |
| "Edge function error" | Check secrets are configured |
| "Email not sent" | Verify SENDGRID_API_KEY |

### RLS Permission Errors

**Symptoms:**
- Empty data queries
- "Row level security" errors
- Unexpected null results

**Debugging Steps:**
1. Check user is authenticated
2. Verify role in `user_roles` table
3. Check program access in `user_program_permissions`
4. Test RLS policies in Supabase SQL Editor

### Edge Function Debugging

**View Logs:**
```bash
supabase functions logs <function-name> --tail
```

**Common Issues:**
- Missing secrets → Add in Supabase Dashboard
- CORS errors → Check function headers
- Timeout → Increase memory/timeout limits

### Demo Data Reset

To reset demo data:
1. Navigate to `/seed-data`
2. (Optional) Clear existing data via SQL
3. Re-run seed functions

**SQL to Clear Data:**
```sql
-- Clear in correct order (respect foreign keys)
DELETE FROM claim_fulfillment;
DELETE FROM claims;
DELETE FROM complaints;
DELETE FROM service_requests;
DELETE FROM policies;
DELETE FROM user_roles WHERE role != 'system_admin';
```

---

## Appendix: Quick Reference URLs

| Page | Route | Description |
|------|-------|-------------|
| Customer Login | `/auth` | Customer authentication |
| Dashboard | `/dashboard` | Customer home |
| Policies | `/policies` | Customer policies |
| Claims | `/claims` | Customer claims |
| Submit Claim | `/claim-submission` | New claim form |
| Retail Login | `/retail` | Staff authentication |
| Retail Dashboard | `/retail/dashboard` | Staff home |
| Sales | `/retail/sales` | New policy sale |
| Policy Search | `/retail/policy-search` | Find policies |
| Claims Mgmt | `/retail/claims-management` | Process claims |
| Programs | `/programs` | Admin: Programs list |
| Devices | `/device-details` | Admin: Device catalog |
| Seed Data | `/seed-data` | Setup: Demo data |
| Setup Admin | `/setup-system-admin` | Setup: First admin |

---

*For technical implementation details, see `SYSTEM_ARCHITECTURE.md` and `DATABASE_SCHEMA.md`.*
