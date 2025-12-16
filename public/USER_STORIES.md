# User Stories

## EIP Care Portal - Insurance/Warranty Management Platform

**Document Version:** 1.1  
**Date:** December 11, 2024  
**Format:** Agile User Stories by Persona

---

## Table of Contents

1. [Customer Stories](#1-customer-stories)
2. [Retail Consultant Stories](#2-retail-consultant-stories)
3. [Claims Agent Stories](#3-claims-agent-stories)
4. [Complaints Agent Stories](#4-complaints-agent-stories)
5. [Repairer Agent Stories](#5-repairer-agent-stories)
6. [Backoffice Agent Stories](#6-backoffice-agent-stories)
7. [System Administrator Stories](#7-system-administrator-stories)

---

## 1. Customer Stories

### Epic: Account Management

| ID | User Story | Acceptance Criteria | Priority |
|----|------------|---------------------|----------|
| CUS-001 | As a customer, I want to register for an account so that I can access my policies online | - Can register with email/password<br>- Receive confirmation email<br>- Existing policies auto-linked by email | High |
| CUS-002 | As a customer, I want to log in securely so that I can access my account | - Login with email/password<br>- Session persists across pages<br>- Secure logout option | High |
| CUS-003 | As a customer, I want to reset my password so that I can regain access if I forget it | - Request reset via email<br>- Receive reset link<br>- Set new password | High |

### Epic: Policy Management

| ID | User Story | Acceptance Criteria | Priority |
|----|------------|---------------------|----------|
| CUS-010 | As a customer, I want to view all my policies so that I can see my coverage | - List all policies<br>- Show status, dates, coverage<br>- Filter by status | High |
| CUS-011 | As a customer, I want to view policy details so that I understand my coverage | - See covered item details<br>- View coverage/perils<br>- See premium and excess amounts | High |
| CUS-012 | As a customer, I want to download policy documents so that I have records | - Download IPID<br>- Download Terms & Conditions<br>- Download Policy Schedule | High |
| CUS-013 | As a customer, I want to see my policy renewal date so that I can plan ahead | - Display renewal date prominently<br>- Show days until renewal | Medium |

### Epic: Claims Submission

| ID | User Story | Acceptance Criteria | Priority |
|----|------------|---------------------|----------|
| CUS-020 | As a customer, I want to submit a claim so that I can get my device repaired/replaced | - Select policy<br>- Choose claim type<br>- Describe fault<br>- Receive claim number | High |
| CUS-021 | As a customer, I want to upload photos of damage so that my claim can be assessed | - Upload multiple photos<br>- Support JPG/PNG<br>- Preview before submit | High |
| CUS-022 | As a customer, I want to upload my purchase receipt so that I can prove ownership | - Upload receipt image/PDF<br>- AI validates receipt<br>- Shows extraction results | High |
| CUS-023 | As a customer, I want to see claim submission confirmation so that I know it was received | - Display claim number<br>- Show expected timeline<br>- Email confirmation sent | High |

### Epic: Claims Tracking

| ID | User Story | Acceptance Criteria | Priority |
|----|------------|---------------------|----------|
| CUS-030 | As a customer, I want to track my claim status so that I know what's happening | - See current status<br>- View status timeline<br>- Understand next steps | High |
| CUS-031 | As a customer, I want to view my claims history so that I can see past claims | - List all claims<br>- Filter by status<br>- Click to view details | Medium |
| CUS-032 | As a customer, I want to receive email updates on my claim so that I stay informed | - Email on status change<br>- Clear explanation of status<br>- Links to portal | Medium |
| CUS-033 | As a customer, I want to upload additional documents to my claim if requested | - See what's needed<br>- Upload documents<br>- Confirmation of receipt | High |

### Epic: Payments

| ID | User Story | Acceptance Criteria | Priority |
|----|------------|---------------------|----------|
| CUS-040 | As a customer, I want to view my payment history so that I can track what I've paid | - List all payments<br>- Show amount, date, type<br>- Filter by period | Medium |
| CUS-041 | As a customer, I want to pay my claim excess so that my claim can proceed | - See amount due<br>- Multiple payment methods<br>- Receive confirmation | High |
| CUS-042 | As a customer, I want to set payment reminders so that I don't miss payments | - Configure reminder days<br>- Choose email/SMS<br>- Enable/disable | Low |

### Epic: Support

| ID | User Story | Acceptance Criteria | Priority |
|----|------------|---------------------|----------|
| CUS-050 | As a customer, I want to chat with support so that I can get help quickly | - AI chat available<br>- Natural language queries<br>- Escalate to human if needed | Medium |
| CUS-051 | As a customer, I want to raise a complaint so that issues can be addressed | - Select complaint reason<br>- Describe issue<br>- Receive reference number | Medium |
| CUS-052 | As a customer, I want to track my complaint so that I know the outcome | - See complaint status<br>- View any response<br>- Timeline of updates | Medium |
| CUS-053 | As a customer, I want to create a service request so that I can get assistance | - Describe my inquiry<br>- Link to policy if relevant<br>- Track response | Medium |

---

## 2. Retail Consultant Stories

### Epic: Authentication

| ID | User Story | Acceptance Criteria | Priority |
|----|------------|---------------------|----------|
| CON-001 | As a consultant, I want to log in quickly so that I can serve customers | - Quick login with role selection<br>- PIN verification<br>- Remember device option | High |
| CON-002 | As a consultant, I want to change my PIN so that I maintain security | - Enter current PIN<br>- Set new PIN<br>- Confirmation | Medium |

### Epic: Policy Sales

| ID | User Story | Acceptance Criteria | Priority |
|----|------------|---------------------|----------|
| CON-010 | As a consultant, I want to create a new policy so that customers can be covered | - Enter customer details<br>- Select product<br>- Match price band<br>- Generate policy | High |
| CON-011 | As a consultant, I want to search for products by device price so that I offer the right coverage | - Enter device price<br>- See matching products<br>- Compare coverage levels | High |
| CON-012 | As a consultant, I want to apply promotional codes so that customers get discounts | - Enter promo code<br>- Validate eligibility<br>- Show discount applied | High |
| CON-013 | As a consultant, I want to capture device details so that the item is properly covered | - Enter manufacturer, model<br>- Record serial number<br>- Capture purchase date | High |
| CON-014 | As a consultant, I want to collect payment so that the policy is activated | - Show premium amount<br>- Record payment method<br>- Generate receipt | High |
| CON-015 | As a consultant, I want the customer to receive policy documents immediately so that they have confirmation | - Auto-generate documents<br>- Email to customer<br>- Option to print | High |

### Epic: Policy Management

| ID | User Story | Acceptance Criteria | Priority |
|----|------------|---------------------|----------|
| CON-020 | As a consultant, I want to search for policies so that I can help customers | - Search by policy number<br>- Search by customer details<br>- Quick results | High |
| CON-021 | As a consultant, I want to view policy details so that I can answer customer questions | - See full policy info<br>- View claims history<br>- See payment status | High |
| CON-022 | As a consultant, I want to update customer contact details so that records are accurate | - Edit name, phone, email, address<br>- Save changes<br>- Audit trail | Medium |
| CON-023 | As a consultant, I want to upgrade a policy so that customers get better coverage | - Compare current vs new product<br>- Calculate price difference<br>- Process upgrade | Medium |
| CON-024 | As a consultant, I want to cancel a policy so that customer requests are handled | - Select cancellation reason<br>- Capture details<br>- Confirm cancellation | Medium |

### Epic: Claims Assistance

| ID | User Story | Acceptance Criteria | Priority |
|----|------------|---------------------|----------|
| CON-030 | As a consultant, I want to submit a claim on behalf of a customer so that in-store claims are easy | - Search for policy<br>- Enter claim details<br>- Upload evidence<br>- Submit claim | High |
| CON-031 | As a consultant, I want to check claim status for a customer so that I can inform them | - Search by claim number<br>- See current status<br>- View timeline | High |

### Epic: Dashboard & Reporting

| ID | User Story | Acceptance Criteria | Priority |
|----|------------|---------------------|----------|
| CON-040 | As a consultant, I want to see my sales dashboard so that I track my performance | - Policies sold today/week/month<br>- Premium value<br>- Comparison to targets | Medium |
| CON-041 | As a consultant, I want to see my sales history so that I can review my work | - List policies I created<br>- Filter by date<br>- Export option | Low |

---

## 3. Claims Agent Stories

### Epic: Claims Queue

| ID | User Story | Acceptance Criteria | Priority |
|----|------------|---------------------|----------|
| CLM-001 | As a claims agent, I want to see all pending claims so that I can process them | - List claims by status<br>- SLA indicators<br>- Sort by priority | High |
| CLM-002 | As a claims agent, I want to filter claims so that I focus on specific types | - Filter by status<br>- Filter by claim type<br>- Filter by date range | High |
| CLM-003 | As a claims agent, I want to see SLA breaches so that I prioritize urgent claims | - Highlight overdue claims<br>- Show time remaining<br>- Sort by urgency | High |

### Epic: Claims Assessment

| ID | User Story | Acceptance Criteria | Priority |
|----|------------|---------------------|----------|
| CLM-010 | As a claims agent, I want to review claim details so that I can make a decision | - See all claim info<br>- View uploaded evidence<br>- Check policy coverage | High |
| CLM-011 | As a claims agent, I want to see AI damage analysis so that I have assessment support | - View AI confidence score<br>- See damage assessment<br>- Check fraud indicators | High |
| CLM-012 | As a claims agent, I want to see AI receipt analysis so that I verify purchase | - View extracted data<br>- See validation results<br>- Check price matching | High |
| CLM-013 | As a claims agent, I want to accept a claim so that fulfillment can proceed | - Select accept decision<br>- System updates status<br>- Customer notified | High |
| CLM-014 | As a claims agent, I want to reject a claim so that invalid claims are declined | - Select reject decision<br>- Enter rejection reason<br>- Customer notified | High |
| CLM-015 | As a claims agent, I want to refer a claim so that complex cases get review | - Select refer decision<br>- Add notes for reviewer<br>- Assign if needed | High |
| CLM-016 | As a claims agent, I want to request more information so that I can complete assessment | - Select info needed<br>- Send request to customer<br>- Track response | Medium |

### Epic: Claims Fulfillment

| ID | User Story | Acceptance Criteria | Priority |
|----|------------|---------------------|----------|
| CLM-020 | As a claims agent, I want to see fulfillment options so that I choose the best outcome | - AI recommendations<br>- Compare repair vs replace<br>- Cost analysis | High |
| CLM-021 | As a claims agent, I want to collect excess payment so that repair can proceed | - Show excess amount<br>- Record payment<br>- Update status | High |
| CLM-022 | As a claims agent, I want to assign a repairer so that the device gets fixed | - See available repairers<br>- View SLAs and ratings<br>- Assign claim | High |
| CLM-023 | As a claims agent, I want to book an inspection so that damage can be assessed | - Select date/time slot<br>- Assign engineer<br>- Notify customer | High |
| CLM-024 | As a claims agent, I want to review repair quotes so that I authorize work | - See quote amount<br>- Compare to device value<br>- Approve or reject | High |
| CLM-025 | As a claims agent, I want to process BER (Beyond Economic Repair) so that alternatives are offered | - See repair vs value comparison<br>- Select BER reason<br>- Initiate replacement/voucher | High |
| CLM-026 | As a claims agent, I want to issue a voucher so that customer gets replacement value | - Calculate voucher amount<br>- Generate voucher code<br>- Send to customer | Medium |
| CLM-027 | As a claims agent, I want to close a claim so that completed claims are finalized | - Verify fulfillment complete<br>- Add closing notes<br>- Update status to closed | High |

### Epic: Communication

| ID | User Story | Acceptance Criteria | Priority |
|----|------------|---------------------|----------|
| CLM-030 | As a claims agent, I want to send emails to customers so that they stay informed | - Select email template<br>- Customize if needed<br>- Track delivery | Medium |
| CLM-031 | As a claims agent, I want to view communication history so that I see what was sent | - List all communications<br>- View content<br>- See delivery status | Medium |

---

## 4. Complaints Agent Stories

### Epic: Complaints Queue

| ID | User Story | Acceptance Criteria | Priority |
|----|------------|---------------------|----------|
| CMP-001 | As a complaints agent, I want to see all complaints so that I can address them | - List all complaints<br>- Filter by status<br>- SLA indicators | High |
| CMP-002 | As a complaints agent, I want to be assigned complaints so that workload is distributed | - See my assigned complaints<br>- Accept new assignments<br>- Reassign if needed | High |

### Epic: Complaints Processing

| ID | User Story | Acceptance Criteria | Priority |
|----|------------|---------------------|----------|
| CMP-010 | As a complaints agent, I want to review complaint details so that I understand the issue | - See complaint description<br>- View related policy/claim<br>- Check customer history | High |
| CMP-011 | As a complaints agent, I want to classify complaints so that they're properly categorized | - Select classification<br>- Add type/category<br>- Update complaint | Medium |
| CMP-012 | As a complaints agent, I want to add investigation notes so that I document my work | - Enter notes<br>- Save with timestamp<br>- Notes visible to team | High |
| CMP-013 | As a complaints agent, I want to respond to complaints so that customers get resolution | - Draft response<br>- Review before sending<br>- Record response | High |
| CMP-014 | As a complaints agent, I want to escalate complaints so that serious issues get attention | - Flag for escalation<br>- Assign to senior staff<br>- Add escalation reason | Medium |
| CMP-015 | As a complaints agent, I want to close complaints so that resolved issues are finalized | - Select resolution outcome<br>- Add closing notes<br>- Update status | High |

---

## 5. Repairer Agent Stories

### Epic: Job Management

| ID | User Story | Acceptance Criteria | Priority |
|----|------------|---------------------|----------|
| REP-001 | As a repairer agent, I want to see my assigned jobs so that I know what to work on | - List assigned claims<br>- Show device details<br>- SLA indicators | High |
| REP-002 | As a repairer agent, I want to accept a job so that I confirm I'll handle it | - Review job details<br>- Accept assignment<br>- Update status | High |
| REP-003 | As a repairer agent, I want to view job details so that I understand the repair needed | - See damage description<br>- View customer photos<br>- Check device info | High |

### Epic: Inspection

| ID | User Story | Acceptance Criteria | Priority |
|----|------------|---------------------|----------|
| REP-010 | As a repairer agent, I want to schedule inspection so that I can assess the device | - Select date/time<br>- Confirm with customer<br>- Update job | High |
| REP-011 | As a repairer agent, I want to upload inspection photos so that damage is documented | - Take/upload photos<br>- Add annotations<br>- Save to claim | High |
| REP-012 | As a repairer agent, I want to add inspection notes so that findings are recorded | - Enter observations<br>- Note condition<br>- Identify repairs needed | High |

### Epic: Quoting & Repair

| ID | User Story | Acceptance Criteria | Priority |
|----|------------|---------------------|----------|
| REP-020 | As a repairer agent, I want to submit a repair quote so that work can be authorized | - Enter labour costs<br>- Enter parts costs<br>- Submit for approval | High |
| REP-021 | As a repairer agent, I want to see quote approval status so that I know when to proceed | - See approval/rejection<br>- View any comments<br>- Proceed with repair | High |
| REP-022 | As a repairer agent, I want to update repair progress so that status is current | - Mark stages complete<br>- Add progress notes<br>- Update timeline | High |
| REP-023 | As a repairer agent, I want to complete a repair so that the job is finished | - Mark repair complete<br>- Enter outcome<br>- Add final notes | High |
| REP-024 | As a repairer agent, I want to mark as BER so that unrepairable devices are handled | - Select BER reason<br>- Enter device value<br>- Notify claims team | High |

### Epic: Cost Tracking

| ID | User Story | Acceptance Criteria | Priority |
|----|------------|---------------------|----------|
| REP-030 | As a repairer agent, I want to record repair costs so that expenses are tracked | - Enter cost items<br>- Categorize (labour/parts/logistics)<br>- Calculate totals | High |
| REP-031 | As a repairer agent, I want to see my monthly revenue so that I track my business | - View jobs completed<br>- See total revenue<br>- Filter by period | Medium |

---

## 6. Backoffice Agent Stories

### Epic: Service Requests

| ID | User Story | Acceptance Criteria | Priority |
|----|------------|---------------------|----------|
| BOF-001 | As a backoffice agent, I want to see service request queue so that I handle inquiries | - List open requests<br>- Filter by department<br>- SLA tracking | High |
| BOF-002 | As a backoffice agent, I want to respond to service requests so that customers get help | - View request details<br>- Send response<br>- Track conversation | High |
| BOF-003 | As a backoffice agent, I want to resolve service requests so that they're completed | - Add resolution notes<br>- Close request<br>- Customer notified | High |

### Epic: Reporting

| ID | User Story | Acceptance Criteria | Priority |
|----|------------|---------------------|----------|
| BOF-010 | As a backoffice agent, I want to generate reports so that I analyze performance | - Select report type<br>- Choose date range<br>- Export data | Medium |
| BOF-011 | As a backoffice agent, I want to view dashboard metrics so that I monitor operations | - See key KPIs<br>- Real-time updates<br>- Drill-down capability | Medium |

---

## 7. System Administrator Stories

### Epic: Program Management

| ID | User Story | Acceptance Criteria | Priority |
|----|------------|---------------------|----------|
| ADM-001 | As an admin, I want to create programs so that new clients are onboarded | - Enter program details<br>- Configure settings<br>- Activate program | High |
| ADM-002 | As an admin, I want to configure program settings so that behavior is customized | - Set data isolation<br>- Configure reference formats<br>- Branding settings | High |

### Epic: Product Configuration

| ID | User Story | Acceptance Criteria | Priority |
|----|------------|---------------------|----------|
| ADM-010 | As an admin, I want to create products so that new coverage is available | - Define product details<br>- Set pricing tiers<br>- Configure coverage | High |
| ADM-011 | As an admin, I want to configure eligibility rules so that sales are validated | - Set age limits<br>- Device restrictions<br>- Warranty requirements | High |
| ADM-012 | As an admin, I want to configure perils so that coverage is defined | - Add/edit perils<br>- Set acceptance logic<br>- Define evidence requirements | High |
| ADM-013 | As an admin, I want to configure document templates so that policies are generated | - Edit IPID template<br>- Edit T&C template<br>- Edit schedule template | Medium |
| ADM-014 | As an admin, I want to configure communication templates so that emails are sent | - Create email templates<br>- Set trigger events<br>- Assign to products | Medium |
| ADM-015 | As an admin, I want to manage promotions so that marketing campaigns run | - Create promotions<br>- Set validity dates<br>- Assign to products | Medium |

### Epic: Claims Configuration

| ID | User Story | Acceptance Criteria | Priority |
|----|------------|---------------------|----------|
| ADM-020 | As an admin, I want to configure claims SLAs so that performance is tracked | - Set SLA hours per status<br>- Enable/disable per program<br>- Configure escalations | High |
| ADM-021 | As an admin, I want to configure voucher options so that fulfillment choices exist | - Define voucher types<br>- Set value rules<br>- Assign to products | Medium |

### Epic: Device Management

| ID | User Story | Acceptance Criteria | Priority |
|----|------------|---------------------|----------|
| ADM-030 | As an admin, I want to manage device categories so that products are organized | - Create categories<br>- Set warranty periods<br>- Activate/deactivate | Medium |
| ADM-031 | As an admin, I want to manage device catalog so that devices are listed | - Add devices<br>- Set RRP and trade-in values<br>- Import bulk data | Medium |

### Epic: Repairer Management

| ID | User Story | Acceptance Criteria | Priority |
|----|------------|---------------------|----------|
| ADM-040 | As an admin, I want to manage repairers so that the network is maintained | - Add repairer companies<br>- Set capabilities<br>- Activate/deactivate | High |
| ADM-041 | As an admin, I want to configure repairer SLAs so that performance is tracked | - Set response times<br>- Set repair times<br>- Configure by device type | Medium |
| ADM-042 | As an admin, I want to configure fulfillment assignments so that claims route correctly | - Set matching rules<br>- Assign by category/manufacturer<br>- Priority ordering | High |

### Epic: User Management

| ID | User Story | Acceptance Criteria | Priority |
|----|------------|---------------------|----------|
| ADM-050 | As an admin, I want to create user accounts so that staff can access the system | - Enter user details<br>- Assign roles<br>- Set program access | High |
| ADM-051 | As an admin, I want to manage user roles so that access is controlled | - Assign/remove roles<br>- Set section permissions<br>- Configure by program | High |
| ADM-052 | As an admin, I want to create user groups so that permissions are managed efficiently | - Define groups<br>- Set group permissions<br>- Assign users to groups | Medium |
| ADM-053 | As an admin, I want to reset user credentials so that access issues are resolved | - Reset password<br>- Reset PIN<br>- Force password change | High |
| ADM-054 | As an admin, I want to deactivate users so that access is revoked | - Deactivate account<br>- Maintain audit trail<br>- Option to reactivate | High |

---

## Story Point Summary

| Persona | Total Stories | High Priority | Medium Priority | Low Priority |
|---------|--------------|---------------|-----------------|--------------|
| Customer | 17 | 12 | 4 | 1 |
| Consultant | 15 | 10 | 4 | 1 |
| Claims Agent | 17 | 14 | 3 | 0 |
| Complaints Agent | 7 | 5 | 2 | 0 |
| Repairer Agent | 12 | 10 | 2 | 0 |
| Backoffice Agent | 5 | 3 | 2 | 0 |
| System Admin | 18 | 11 | 7 | 0 |
| **Total** | **91** | **65** | **24** | **2** |

---

*Document generated from EIP Care Portal system architecture*
