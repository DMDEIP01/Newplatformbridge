# Functional Requirements Document

## EIP Care Portal - Insurance/Warranty Management Platform

**Document Version:** 1.1  
**Date:** December 11, 2024  
**Status:** Active

---

## 1. Executive Summary

The EIP Care Portal is a comprehensive insurance and warranty management platform supporting multi-tenant program operations. The system enables end-to-end management of warranty policies, claims processing, fulfillment workflows, complaint handling, and service requests across three distinct user portals.

---

## 2. System Overview

### 2.1 Platform Components

| Component | Description |
|-----------|-------------|
| **Customer Portal** | Self-service portal for policyholders |
| **Retail/BackOffice Portal** | Staff portal for agents and administrators |
| **Program Configuration Portal** | System administration for product setup |

### 2.2 User Roles

| Role | Description | Portal Access |
|------|-------------|---------------|
| Customer | Policyholder with self-service access | Customer Portal |
| Consultant | Sales representative at retail locations | Retail Portal |
| Retail Agent | Store staff handling policy sales | Retail Portal |
| Claims Agent | Staff processing insurance claims | Retail Portal |
| Complaints Agent | Staff handling customer complaints | Retail Portal |
| Repairer Agent | Authorized repair network staff | Retail Portal |
| Commercial Agent | Business development staff | Retail Portal |
| Backoffice Agent | Operations support staff | Retail Portal |
| System Admin | Full system administration access | All Portals |
| Admin | Program-level administration | Config Portal |

---

## 3. Functional Requirements

### 3.1 Authentication & Authorization

#### FR-AUTH-001: User Authentication
- **Description:** System shall support secure user authentication via email and password
- **Acceptance Criteria:**
  - Users can register with email and password
  - Users can sign in with credentials
  - Password reset functionality available
  - Session management with JWT tokens

#### FR-AUTH-002: Role-Based Access Control
- **Description:** System shall restrict access based on assigned user roles
- **Acceptance Criteria:**
  - Users assigned one or more roles
  - Roles can be program-scoped
  - Access controls enforced at database level (RLS)
  - Section-level permissions for retail portal

#### FR-AUTH-003: PIN Verification for Retail Portal
- **Description:** Retail staff shall verify identity with PIN after login
- **Acceptance Criteria:**
  - 4-digit PIN setup for staff users
  - PIN verification required for sensitive actions
  - PIN can be reset by administrators

---

### 3.2 Program Management

#### FR-PRG-001: Multi-Tenant Program Support
- **Description:** System shall support multiple insurance programs with data isolation
- **Acceptance Criteria:**
  - Create/edit/deactivate programs
  - Configure program-specific settings
  - Data isolation between programs
  - Custom branding per program

#### FR-PRG-002: Reference Number Formats
- **Description:** System shall generate unique reference numbers per program
- **Acceptance Criteria:**
  - Configurable formats for policies, claims, complaints, service requests
  - Auto-generated sequential numbers
  - Program-specific prefixes

---

### 3.3 Product Configuration

#### FR-PRD-001: Product Definition
- **Description:** System shall support configurable insurance products
- **Acceptance Criteria:**
  - Define product name, type, tier
  - Set price bands (RRP min/max)
  - Configure premium amounts and frequency
  - Define coverage and perils
  - Set excess amounts (Excess 1, Excess 2)

#### FR-PRD-002: Eligibility Rules
- **Description:** System shall validate policy eligibility at sale
- **Acceptance Criteria:**
  - Age-based eligibility rules
  - Device category restrictions
  - Manufacturer warranty requirements
  - Purchase date validation

#### FR-PRD-003: Validity Rules
- **Description:** System shall enforce policy validity rules
- **Acceptance Criteria:**
  - Waiting period configuration
  - Coverage start date rules
  - Claim count limits per period
  - Max claim value limits

#### FR-PRD-004: Renewal Rules
- **Description:** System shall manage policy renewals
- **Acceptance Criteria:**
  - Auto-renewal configuration
  - Renewal notification period
  - Premium adjustment rules
  - Grace period configuration

#### FR-PRD-005: Peril Configuration
- **Description:** System shall define covered perils per product
- **Acceptance Criteria:**
  - Define peril types (breakdown, accidental damage, theft)
  - Configure acceptance logic
  - Set rejection terms
  - Define evidence requirements

---

### 3.4 Policy Management

#### FR-POL-001: Policy Creation
- **Description:** System shall create new insurance policies
- **Acceptance Criteria:**
  - Capture customer details (name, email, phone, address)
  - Record covered item details (product, model, serial, price)
  - Assign to product and program
  - Generate unique policy number
  - Set start and renewal dates
  - Apply promotional discounts

#### FR-POL-002: Policy Document Generation
- **Description:** System shall generate policy documents automatically
- **Acceptance Criteria:**
  - Generate IPID (Insurance Product Information Document)
  - Generate Terms & Conditions
  - Generate Policy Schedule
  - Store documents in secure storage
  - Documents available for download

#### FR-POL-003: Policy Status Management
- **Description:** System shall track policy lifecycle
- **Acceptance Criteria:**
  - Status values: Active, Pending, Expired, Cancelled
  - Automatic status updates on renewal date
  - Cancellation with reason capture
  - Status history tracking

#### FR-POL-004: Policy Search
- **Description:** System shall provide policy search capabilities
- **Acceptance Criteria:**
  - Search by policy number
  - Search by customer name, email, phone
  - Search by device serial number
  - Filter by status, date range, product

#### FR-POL-005: Policy Modifications
- **Description:** System shall support policy changes
- **Acceptance Criteria:**
  - Edit customer contact details
  - Upgrade/switch product coverage
  - Calculate premium differences
  - Maintain change history audit trail

---

### 3.5 Claims Management

#### FR-CLM-001: Claim Submission
- **Description:** System shall capture insurance claims
- **Acceptance Criteria:**
  - Select policy for claim
  - Choose claim type (breakdown, accidental damage, theft)
  - Capture fault description
  - Record product condition
  - Upload damage photos
  - Upload purchase receipt
  - Generate unique claim number

#### FR-CLM-002: AI Document Analysis
- **Description:** System shall analyze claim documents using AI
- **Acceptance Criteria:**
  - Analyze damage photos for severity assessment
  - OCR and validate purchase receipts
  - Extract device information from photos
  - Provide fraud indicators
  - Generate analysis confidence scores

#### FR-CLM-003: Claim Assessment
- **Description:** System shall support claim decision-making
- **Acceptance Criteria:**
  - Display claim details and evidence
  - Show AI analysis results
  - Accept/Reject/Refer decision options
  - Capture decision reason
  - Automatic decision support for clear cases

#### FR-CLM-004: Claim Status Workflow
- **Description:** System shall manage claim status progression
- **Acceptance Criteria:**
  - Status values: Notified, Accepted, Rejected, Referred, Excess Due, Repair, Closed
  - Status transitions with validation
  - Status history tracking
  - SLA monitoring per status

#### FR-CLM-005: Claim Fulfillment - Excess Collection
- **Description:** System shall manage excess payment collection
- **Acceptance Criteria:**
  - Calculate excess amount due
  - Record payment method
  - Track payment status
  - Update claim status on payment

#### FR-CLM-006: Claim Fulfillment - Repair Workflow
- **Description:** System shall manage repair fulfillment
- **Acceptance Criteria:**
  - Assign claim to repairer
  - Book inspection appointment
  - Capture inspection photos and notes
  - Receive repair quote
  - Approve/reject quotes
  - Track repair completion
  - Handle BER (Beyond Economic Repair) outcomes

#### FR-CLM-007: Claim Fulfillment - Replacement/Voucher
- **Description:** System shall support alternative fulfillment methods
- **Acceptance Criteria:**
  - Issue replacement device
  - Generate voucher codes
  - Track logistics reference
  - Confirm delivery/collection

#### FR-CLM-008: Repair Cost Tracking
- **Description:** System shall track repair costs
- **Acceptance Criteria:**
  - Record labour costs
  - Record parts costs
  - Record logistics costs
  - Calculate total claim cost
  - Compare to device value

---

### 3.6 Complaint Management

#### FR-CMP-001: Complaint Submission
- **Description:** System shall capture customer complaints
- **Acceptance Criteria:**
  - Select complaint reason
  - Capture detailed description
  - Link to policy (optional)
  - Generate complaint reference
  - Record customer contact details

#### FR-CMP-002: Complaint Processing
- **Description:** System shall manage complaint resolution
- **Acceptance Criteria:**
  - Assign to complaints agent
  - Classify complaint type
  - Track investigation notes
  - Record response/resolution
  - Close with outcome

#### FR-CMP-003: Complaint Audit Trail
- **Description:** System shall maintain complaint activity history
- **Acceptance Criteria:**
  - Log all status changes
  - Record field modifications
  - Track user actions
  - Timestamp all activities

---

### 3.7 Service Request Management

#### FR-SRV-001: Service Request Creation
- **Description:** System shall capture service inquiries
- **Acceptance Criteria:**
  - Select request reason
  - Capture inquiry details
  - Link to policy/claim (optional)
  - Generate request reference
  - Assign department

#### FR-SRV-002: AI Chat Support
- **Description:** System shall provide AI-assisted support
- **Acceptance Criteria:**
  - Natural language chat interface
  - Product information retrieval
  - Policy status queries
  - Escalation to human agent
  - Conversation history

#### FR-SRV-003: Service Request Workflow
- **Description:** System shall manage request resolution
- **Acceptance Criteria:**
  - Status tracking (Open, In Progress, Resolved)
  - Message thread between customer and agent
  - Resolution notes capture
  - SLA monitoring

---

### 3.8 Device Catalog

#### FR-DEV-001: Device Management
- **Description:** System shall maintain device catalog
- **Acceptance Criteria:**
  - Define device categories
  - Add manufacturers and models
  - Set RRP (Recommended Retail Price)
  - Configure trade-in values
  - Set warranty periods

#### FR-DEV-002: Device Matching
- **Description:** System shall match devices to products
- **Acceptance Criteria:**
  - Match by price band
  - Match by device category
  - Validate manufacturer warranty
  - Support promotional device lists

---

### 3.9 Repairer Network

#### FR-REP-001: Repairer Management
- **Description:** System shall manage authorized repairers
- **Acceptance Criteria:**
  - Register repairer companies
  - Capture contact details
  - Define service areas
  - Set specializations/capabilities
  - Activate/deactivate repairers

#### FR-REP-002: Repairer SLAs
- **Description:** System shall track repairer performance
- **Acceptance Criteria:**
  - Define response time SLAs
  - Define repair time SLAs
  - Track quality scores
  - Track success rates
  - Configure by device category

#### FR-REP-003: Fulfillment Assignment Rules
- **Description:** System shall automate repairer assignment
- **Acceptance Criteria:**
  - Match by device category
  - Match by manufacturer
  - Match by coverage area
  - Match by program

---

### 3.10 Communications

#### FR-COM-001: Email Notifications
- **Description:** System shall send automated emails
- **Acceptance Criteria:**
  - Policy confirmation emails
  - Claim status update emails
  - Document request emails
  - Payment reminder emails
  - Configurable templates per product

#### FR-COM-002: Communication Templates
- **Description:** System shall support templated communications
- **Acceptance Criteria:**
  - Define email templates by status
  - Variable substitution (customer name, policy number, etc.)
  - HTML formatting support
  - Template assignment to products

#### FR-COM-003: Communication History
- **Description:** System shall log all communications
- **Acceptance Criteria:**
  - Record sent emails
  - Track delivery status
  - Link to policy/claim
  - Mark read status

---

### 3.11 Promotions

#### FR-PRM-001: Promotion Management
- **Description:** System shall support marketing promotions
- **Acceptance Criteria:**
  - Define promotion codes
  - Set promotion types (discount, free months, voucher)
  - Configure validity dates
  - Set usage limits
  - Track current usage

#### FR-PRM-002: Promotion Application
- **Description:** System shall apply promotions at sale
- **Acceptance Criteria:**
  - Validate promotion code
  - Check eligibility
  - Calculate discount/benefit
  - Record on policy
  - Display terms and conditions

---

### 3.12 Payments

#### FR-PAY-001: Payment Recording
- **Description:** System shall record payments
- **Acceptance Criteria:**
  - Record premium payments
  - Record excess payments
  - Capture payment method
  - Generate reference numbers
  - Track payment status

#### FR-PAY-002: Payment History
- **Description:** System shall display payment history
- **Acceptance Criteria:**
  - List all payments by policy
  - Show payment details
  - Filter by type and status
  - Export capability

---

### 3.13 Reporting

#### FR-RPT-001: Sales Reports
- **Description:** System shall provide sales analytics
- **Acceptance Criteria:**
  - Policies sold by period
  - Premium revenue
  - Sales by consultant
  - Sales by product
  - Conversion rates

#### FR-RPT-002: Claims Reports
- **Description:** System shall provide claims analytics
- **Acceptance Criteria:**
  - Claims by status
  - Claims by type
  - Claim costs
  - Claims ratio
  - SLA compliance

#### FR-RPT-003: Consultant Performance
- **Description:** System shall track consultant metrics
- **Acceptance Criteria:**
  - Sales count by consultant
  - Premium value by consultant
  - Active policies by consultant
  - Commission calculations

---

### 3.14 User Management

#### FR-USR-001: User Account Management
- **Description:** System shall manage user accounts
- **Acceptance Criteria:**
  - Create user accounts
  - Assign roles
  - Set program access
  - Reset passwords/PINs
  - Activate/deactivate users

#### FR-USR-002: User Groups
- **Description:** System shall support user grouping
- **Acceptance Criteria:**
  - Create user groups
  - Assign users to groups
  - Set group permissions
  - Section-level access control

---

## 4. Non-Functional Requirements (Summary)

| Category | Requirement |
|----------|-------------|
| **Performance** | Page load < 3 seconds, API response < 500ms |
| **Availability** | 99.5% uptime during business hours |
| **Security** | Row-level security, encrypted storage, JWT auth |
| **Scalability** | Support 10,000+ policies per program |
| **Compatibility** | Modern browsers (Chrome, Firefox, Safari, Edge) |
| **Mobile** | Responsive design for tablet/mobile access |
| **Accessibility** | WCAG 2.1 AA compliance target |

---

## 5. Data Entities Summary

| Entity | Description | Key Attributes |
|--------|-------------|----------------|
| Program | Insurance program/tenant | Name, settings, isolation |
| Product | Insurance product definition | Coverage, pricing, rules |
| Policy | Customer insurance policy | Policy number, status, dates |
| Claim | Insurance claim submission | Claim number, type, status |
| Complaint | Customer complaint | Reference, reason, status |
| Service Request | Support inquiry | Reference, reason, status |
| Device | Device catalog entry | Manufacturer, model, RRP |
| Repairer | Authorized repair company | Name, contact, capabilities |
| User/Profile | System user | Email, name, roles |

---

## 6. Integration Points

| Integration | Purpose | Method |
|-------------|---------|--------|
| SendGrid/Resend | Email delivery | API |
| Lovable AI | Document analysis, chat | API |
| Storage Service | Document storage | Lovable Cloud |
| Authentication | User auth | Lovable Cloud Auth |

---

## 7. Business Rules

### 7.1 Policy Rules
- Policy cannot be created without valid customer email
- Policy start date cannot be in the past
- Device price must fall within product price band
- Cancellation requires reason capture

### 7.2 Claim Rules
- Claims can only be submitted for active policies
- Waiting period must be satisfied before claim
- Maximum claims per period enforced
- Evidence requirements per peril type

### 7.3 Fulfillment Rules
- Excess must be paid before repair booking
- Quote required before repair authorization
- BER threshold based on device value percentage
- Repairer assignment based on matching rules

---

## 8. Appendix

### 8.1 Claim Status Values
1. Notified - Initial submission
2. Accepted - Claim approved
3. Rejected - Claim declined
4. Referred - Requires review
5. Excess Due - Awaiting excess payment
6. Excess Paid - Pending fulfillment
7. Inspection Booked - Engineer scheduled
8. Estimate Received - Quote submitted
9. Repair - In repair process
10. Closed - Claim completed

### 8.2 Complaint Reasons
- Claim Processing
- Customer Service
- Policy Terms
- Payment Issue
- Product Coverage
- Other

### 8.3 Document Types
- Policy (IPID, Terms, Schedule)
- Receipt
- Photo
- Other

---

*Document generated from EIP Care Portal system architecture*
