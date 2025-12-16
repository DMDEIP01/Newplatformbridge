# Database Schema Documentation

## Overview
This document contains the complete database schema for the Insurance/Warranty Management Platform.

## Enums

### app_role
- `admin`
- `consultant`
- `customer`
- `complaints_agent`
- `retail_agent`
- `claims_agent`
- `repairer_agent`
- `system_admin`
- `commercial_agent`
- `backoffice_agent`

### claim_status
- `notified`
- `accepted`
- `rejected`
- `referred`
- `inbound_logistics`
- `repair`
- `outbound_logistics`
- `closed`
- `referred_pending_info`
- `excess_due`
- `excess_paid_fulfillment_pending`
- `fulfillment_inspection_booked`
- `estimate_received`
- `fulfillment_outcome`
- `referred_info_received`

### claim_type
- `breakdown`
- `damage`
- `theft`

### complaint_reason
- `claim_processing`
- `customer_service`
- `policy_terms`
- `payment_issue`
- `product_coverage`
- `other`

### document_subtype
- `ipid`
- `terms_conditions`
- `policy_schedule`
- `receipt`
- `other`

### document_type
- `policy`
- `receipt`
- `photo`
- `other`

### payment_status
- `pending`
- `paid`
- `failed`

### payment_type
- `premium`
- `excess`

### policy_status
- `active`
- `expired`
- `cancelled`
- `pending`

### retail_portal_section
- `dashboard`
- `sales`
- `policy_search`
- `make_claim`
- `claims`
- `claims_management`
- `complaints_management`
- `repairer_jobs`
- `service_request`
- `reports`
- `consultants`

---

## Core Tables

### profiles
User profile information

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | - |
| full_name | text | No | - |
| email | text | No | - |
| phone | text | Yes | - |
| address_line1 | text | Yes | - |
| address_line2 | text | Yes | - |
| city | text | Yes | - |
| postcode | text | Yes | - |
| repairer_id | uuid | Yes | - |
| must_change_password | boolean | No | false |
| created_at | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |

**Foreign Keys:**
- `repairer_id` → `repairers.id`

---

### user_roles
User role assignments

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | No | - |
| role | app_role | No | - |
| program_id | uuid | Yes | - |
| created_at | timestamp with time zone | No | now() |

**Foreign Keys:**
- `program_id` → `programs.id`

---

### programs
Insurance/warranty programs

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| name | text | No | - |
| description | text | Yes | - |
| is_active | boolean | No | true |
| data_isolation_enabled | boolean | No | true |
| settings | jsonb | Yes | {} |
| reference_formats | jsonb | Yes | JSON |
| created_at | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |

---

### products
Insurance/warranty products

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | uuid_generate_v4() |
| product_id | text | No | - |
| name | text | No | - |
| product_name_external | text | Yes | - |
| type | text | No | 'Standard' |
| tier | integer | No | 1 |
| monthly_premium | numeric | No | - |
| premium_frequency | text | Yes | 'monthly' |
| rrp_min | numeric | No | - |
| rrp_max | numeric | Yes | - |
| excess_1 | numeric | No | - |
| excess_2 | numeric | Yes | 0 |
| coverage | text[] | No | - |
| perils | text[] | Yes | {} |
| peril_details | jsonb | Yes | {} |
| device_categories | text[] | Yes | {} |
| payment_types | text[] | Yes | {} |
| voucher_options | text[] | Yes | {} |
| fulfillment_method | text | Yes | - |
| policy_term_years | integer | Yes | 1 |
| store_commission | numeric | No | 5 |
| promotion | text | Yes | - |
| link_code | text | Yes | - |
| tax_name | text | Yes | - |
| tax_type | text | Yes | - |
| tax_value | numeric | Yes | - |
| tax_value_type | text | Yes | - |
| eligibility_rules | jsonb | Yes | {} |
| validity_rules | jsonb | Yes | {} |
| renewal_rules | jsonb | Yes | {} |
| product_parameters | jsonb | Yes | JSON |
| created_at | timestamp with time zone | No | now() |

---

### policies
Customer policies

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | uuid_generate_v4() |
| policy_number | text | No | - |
| user_id | uuid | No | - |
| product_id | uuid | No | - |
| program_id | uuid | Yes | - |
| consultant_id | uuid | Yes | - |
| status | policy_status | No | 'active' |
| start_date | date | No | CURRENT_DATE |
| renewal_date | date | No | - |
| customer_name | text | Yes | - |
| customer_email | text | Yes | - |
| customer_phone | text | Yes | - |
| customer_address_line1 | text | Yes | - |
| customer_address_line2 | text | Yes | - |
| customer_city | text | Yes | - |
| customer_postcode | text | Yes | - |
| notes | text | Yes | - |
| cancellation_reason | text | Yes | - |
| cancellation_details | text | Yes | - |
| cancelled_at | timestamp with time zone | Yes | - |
| created_at | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |

**Foreign Keys:**
- `user_id` → `profiles.id`
- `product_id` → `products.id`
- `program_id` → `programs.id`

---

### claims
Insurance/warranty claims

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | uuid_generate_v4() |
| claim_number | text | No | - |
| user_id | uuid | No | - |
| policy_id | uuid | No | - |
| consultant_id | uuid | Yes | - |
| claim_type | claim_type | No | - |
| status | claim_status | No | 'notified' |
| description | text | No | - |
| product_condition | text | Yes | - |
| has_receipt | boolean | No | false |
| decision | text | Yes | - |
| decision_reason | text | Yes | - |
| submitted_date | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |

**Foreign Keys:**
- `user_id` → `profiles.id`
- `policy_id` → `policies.id`

---

### claim_fulfillment
Claim fulfillment tracking

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| claim_id | uuid | No | - |
| status | text | No | 'pending_excess' |
| fulfillment_type | text | Yes | - |
| repairer_id | uuid | Yes | - |
| excess_amount | numeric | Yes | - |
| excess_paid | boolean | No | false |
| excess_payment_method | text | Yes | - |
| excess_payment_date | timestamp with time zone | Yes | - |
| appointment_date | timestamp with time zone | Yes | - |
| appointment_slot | text | Yes | - |
| repair_scheduled_date | timestamp with time zone | Yes | - |
| repair_scheduled_slot | text | Yes | - |
| quote_status | text | Yes | - |
| quote_amount | numeric | Yes | - |
| quote_rejection_reason | text | Yes | - |
| inspection_photos | text[] | Yes | - |
| inspection_notes | text | Yes | - |
| repair_outcome | text | Yes | - |
| ber_reason | text | Yes | - |
| device_value | numeric | Yes | - |
| logistics_reference | text | Yes | - |
| engineer_reference | text | Yes | - |
| notes | text | Yes | - |
| created_at | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |

**Foreign Keys:**
- `claim_id` → `claims.id`
- `repairer_id` → `repairers.id`

---

### complaints
Customer complaints

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| complaint_reference | text | No | generate_complaint_reference() |
| user_id | uuid | No | - |
| policy_id | uuid | Yes | - |
| reason | complaint_reason | No | - |
| details | text | No | - |
| status | text | No | 'submitted' |
| customer_name | text | Yes | - |
| customer_email | text | Yes | - |
| complaint_type | text | Yes | - |
| classification | text | Yes | - |
| assigned_to | uuid | Yes | - |
| reviewed_by | uuid | Yes | - |
| reviewed_at | timestamp with time zone | Yes | - |
| response | text | Yes | - |
| response_date | timestamp with time zone | Yes | - |
| notes | text | Yes | - |
| created_at | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |

**Foreign Keys:**
- `policy_id` → `policies.id`

---

### service_requests
Customer service requests

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| request_reference | text | No | generate_service_request_reference() |
| customer_name | text | No | - |
| customer_email | text | No | - |
| policy_id | uuid | Yes | - |
| claim_id | uuid | Yes | - |
| reason | text | No | - |
| details | text | No | - |
| department | text | Yes | - |
| status | text | No | 'open' |
| created_by | uuid | Yes | - |
| resolution_notes | text | Yes | - |
| resolved_at | timestamp with time zone | Yes | - |
| last_activity_at | timestamp with time zone | Yes | - |
| created_at | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |

**Foreign Keys:**
- `policy_id` → `policies.id`
- `claim_id` → `claims.id`

---

### documents
Document storage references

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | uuid_generate_v4() |
| user_id | uuid | No | - |
| policy_id | uuid | Yes | - |
| claim_id | uuid | Yes | - |
| service_request_id | uuid | Yes | - |
| document_type | document_type | No | - |
| document_subtype | document_subtype | Yes | 'other' |
| file_name | text | No | - |
| file_path | text | No | - |
| file_size | integer | Yes | - |
| metadata | jsonb | Yes | {} |
| uploaded_date | timestamp with time zone | No | now() |

**Foreign Keys:**
- `user_id` → `profiles.id`
- `policy_id` → `policies.id`
- `claim_id` → `claims.id`
- `service_request_id` → `service_requests.id`

---

### payments
Payment records

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | uuid_generate_v4() |
| user_id | uuid | No | - |
| policy_id | uuid | Yes | - |
| claim_id | uuid | Yes | - |
| payment_type | payment_type | No | - |
| amount | numeric | No | - |
| reference_number | text | No | - |
| status | payment_status | No | 'pending' |
| payment_date | timestamp with time zone | Yes | - |
| created_at | timestamp with time zone | No | now() |

**Foreign Keys:**
- `user_id` → `profiles.id`
- `policy_id` → `policies.id`
- `claim_id` → `claims.id`

---

## Supporting Tables

### devices
Device catalog

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| manufacturer | text | No | - |
| model_name | text | No | - |
| device_category | text | No | - |
| rrp | numeric | No | - |
| external_reference | text | Yes | - |
| include_in_promos | boolean | No | true |
| created_at | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |

---

### device_categories
Device categories

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| name | text | No | - |
| is_active | boolean | No | true |
| created_at | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |

---

### repairers
Repair service providers

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| name | text | No | - |
| company_name | text | No | - |
| contact_email | text | No | - |
| contact_phone | text | Yes | - |
| address_line1 | text | Yes | - |
| address_line2 | text | Yes | - |
| city | text | Yes | - |
| postcode | text | Yes | - |
| country | text | Yes | - |
| specializations | text[] | Yes | - |
| coverage_areas | text[] | Yes | - |
| connectivity_type | text | Yes | - |
| is_active | boolean | No | true |
| created_at | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |

---

### promotions
Promotional campaigns

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| promo_code | text | No | - |
| promo_name | text | No | - |
| promo_type | text | No | - |
| description | text | Yes | - |
| discount_value | numeric | Yes | - |
| voucher_value | numeric | Yes | - |
| free_months | integer | Yes | - |
| start_date | date | No | - |
| end_date | date | No | - |
| max_uses | integer | Yes | - |
| current_uses | integer | No | 0 |
| logo_url | text | Yes | - |
| terms_conditions | text | Yes | - |
| is_active | boolean | No | true |
| created_at | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |

---

### perils
Coverage perils/risks

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| name | text | No | - |
| description | text | Yes | - |
| acceptance_logic | jsonb | Yes | {} |
| rejection_terms | jsonb | Yes | [] |
| evidence_requirements | jsonb | Yes | [] |
| is_active | boolean | No | true |
| created_at | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |

---

### communication_templates
Email/SMS templates

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| type | text | No | - |
| status | text | No | - |
| subject | text | No | - |
| message_body | text | No | - |
| is_active | boolean | No | true |
| created_at | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |

---

### user_groups
User groups for permissions

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| name | text | No | - |
| description | text | Yes | - |
| created_at | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |

---

### claim_status_history
Claim status audit trail

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | uuid_generate_v4() |
| claim_id | uuid | No | - |
| status | claim_status | No | - |
| notes | text | Yes | - |
| created_at | timestamp with time zone | No | now() |

**Foreign Keys:**
- `claim_id` → `claims.id`

---

### policy_change_history
Policy modification history

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| policy_id | uuid | No | - |
| user_id | uuid | No | - |
| change_type | text | No | - |
| old_product_id | uuid | No | - |
| new_product_id | uuid | No | - |
| old_premium | numeric | No | - |
| new_premium | numeric | No | - |
| premium_difference | numeric | No | - |
| reason | text | Yes | - |
| changed_at | timestamp with time zone | No | now() |
| created_at | timestamp with time zone | No | now() |

**Foreign Keys:**
- `policy_id` → `policies.id`
- `old_product_id` → `products.id`
- `new_product_id` → `products.id`

---

### policy_communications
Policy-related communications

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| policy_id | uuid | No | - |
| claim_id | uuid | Yes | - |
| communication_type | text | No | - |
| subject | text | No | - |
| message_body | text | No | - |
| status | text | No | - |
| sent_at | timestamp with time zone | No | now() |
| read_at | timestamp with time zone | Yes | - |
| created_at | timestamp with time zone | No | now() |

**Foreign Keys:**
- `policy_id` → `policies.id`
- `claim_id` → `claims.id`

---

### covered_items
Items covered under policies

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | uuid_generate_v4() |
| policy_id | uuid | No | - |
| product_name | text | No | - |
| model | text | Yes | - |
| serial_number | text | Yes | - |
| purchase_price | numeric | Yes | - |
| added_date | date | No | CURRENT_DATE |
| created_at | timestamp with time zone | No | now() |

**Foreign Keys:**
- `policy_id` → `policies.id`

---

### repair_costs
Repair cost breakdowns

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| claim_id | uuid | No | - |
| fulfillment_id | uuid | No | - |
| cost_type | text | No | - |
| description | text | No | - |
| amount | numeric | No | - |
| units | integer | No | 1 |
| added_by | uuid | No | - |
| created_at | timestamp with time zone | Yes | now() |
| updated_at | timestamp with time zone | Yes | now() |

**Foreign Keys:**
- `claim_id` → `claims.id`
- `fulfillment_id` → `claim_fulfillment.id`

---

### claims_sla
Claims SLA configurations

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| program_id | uuid | Yes | - |
| claim_status | claim_status | No | - |
| sla_hours | integer | No | - |
| description | text | Yes | - |
| is_active | boolean | No | true |
| created_at | timestamp with time zone | Yes | now() |
| updated_at | timestamp with time zone | Yes | now() |

**Foreign Keys:**
- `program_id` → `programs.id`

---

### repairer_slas
Repairer SLA configurations

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| repairer_id | uuid | No | - |
| device_category | text | No | - |
| response_time_hours | integer | No | 24 |
| repair_time_hours | integer | No | 72 |
| availability_hours | text | Yes | - |
| quality_score | numeric | Yes | - |
| success_rate | numeric | Yes | - |
| notes | text | Yes | - |
| created_at | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |

**Foreign Keys:**
- `repairer_id` → `repairers.id`

---

### fulfillment_assignments
Repairer fulfillment assignments

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| repairer_id | uuid | Yes | - |
| product_id | uuid | Yes | - |
| program_ids | uuid[] | Yes | - |
| device_category | text | Yes | - |
| manufacturer | text | Yes | - |
| model_name | text | Yes | - |
| is_active | boolean | No | true |
| created_at | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |

**Foreign Keys:**
- `repairer_id` → `repairers.id`
- `product_id` → `products.id`

---

### service_request_messages
Service request chat messages

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| service_request_id | uuid | No | - |
| role | text | No | - |
| content | text | No | - |
| read_by_agent | boolean | No | false |
| created_at | timestamp with time zone | No | now() |

**Foreign Keys:**
- `service_request_id` → `service_requests.id`

---

### complaint_activity_log
Complaint activity audit trail

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| complaint_id | uuid | No | - |
| user_id | uuid | No | - |
| user_name | text | No | - |
| action_type | text | No | - |
| field_changed | text | Yes | - |
| old_value | text | Yes | - |
| new_value | text | Yes | - |
| action_details | text | Yes | - |
| created_at | timestamp with time zone | No | now() |

**Foreign Keys:**
- `complaint_id` → `complaints.id`

---

### program_products
Program-product associations

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| program_id | uuid | No | - |
| product_id | uuid | No | - |
| is_active | boolean | No | true |
| created_at | timestamp with time zone | No | now() |

**Foreign Keys:**
- `program_id` → `programs.id`
- `product_id` → `products.id`

---

### product_promotions
Product-promotion associations

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| product_id | uuid | No | - |
| promotion_id | uuid | No | - |
| is_active | boolean | No | true |
| created_at | timestamp with time zone | No | now() |

**Foreign Keys:**
- `product_id` → `products.id`
- `promotion_id` → `promotions.id`

---

### product_document_templates
Product document templates

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| product_id | uuid | No | - |
| document_subtype | text | No | - |
| template_content | text | No | - |
| is_active | boolean | No | true |
| created_at | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |

**Foreign Keys:**
- `product_id` → `products.id`

---

### product_communication_templates
Product communication template associations

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| product_id | uuid | No | - |
| template_id | uuid | No | - |
| is_active | boolean | No | true |
| created_at | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |

**Foreign Keys:**
- `product_id` → `products.id`
- `template_id` → `communication_templates.id`

---

### user_group_members
User group membership

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| group_id | uuid | No | - |
| user_id | uuid | No | - |
| created_at | timestamp with time zone | No | now() |

**Foreign Keys:**
- `group_id` → `user_groups.id`

---

### user_group_permissions
User group program permissions

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| group_id | uuid | No | - |
| program_id | uuid | No | - |
| allowed_sections | retail_portal_section[] | No | ARRAY[] |
| created_at | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |

**Foreign Keys:**
- `group_id` → `user_groups.id`
- `program_id` → `programs.id`

---

### user_program_permissions
Individual user program permissions

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | No | - |
| program_id | uuid | No | - |
| allowed_sections | retail_portal_section[] | No | ARRAY[] |
| created_at | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |

**Foreign Keys:**
- `program_id` → `programs.id`

---

### user_preferences
User preference settings

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | No | gen_random_uuid() |
| user_id | uuid | No | - |
| payment_email_reminder | boolean | No | true |
| payment_sms_reminder | boolean | No | false |
| payment_reminder_days | integer | No | 7 |
| created_at | timestamp with time zone | No | now() |
| updated_at | timestamp with time zone | No | now() |

---

## Database Functions

### generate_claim_number(product_name text)
Generates unique claim numbers based on product prefix

### generate_complaint_reference()
Generates unique complaint reference numbers

### generate_policy_number(product_name text)
Generates unique policy numbers based on product prefix

### generate_service_request_reference()
Generates unique service request reference numbers

### get_product_prefix(product_name text)
Extracts product prefix from product name

### has_role(_user_id uuid, _role app_role, _program_id uuid)
Checks if a user has a specific role, optionally within a program

### has_section_access(_user_id uuid, _program_id uuid, _section retail_portal_section)
Checks if a user has access to a specific portal section within a program

---

## Views

### sales_stats
Aggregated sales statistics by consultant

| Column | Type |
|--------|------|
| consultant_id | uuid |
| consultant_name | text |
| sale_month | text |
| total_policies_sold | bigint |
| total_premium_value | numeric |
| active_policies | bigint |

---

*Generated: 2025-11-27*
