import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Users, ShoppingBag, Settings, FileText, CreditCard, MessageSquare, LifeBuoy, LayoutDashboard, ClipboardList, Search, Upload, Wrench, TrendingUp, UserCog, AlertTriangle, Package, Shield, Palette, Clock, Database, Building, UserPlus, ArrowUpCircle, Edit, Camera } from "lucide-react";

const PortalOverview = () => {
  const handlePrint = () => {
    window.print();
  };

  const ScreenItem = ({ title, route, description, icon: Icon }: { title: string; route: string; description: string; icon?: any }) => (
    <div className="border-l-4 border-primary/30 pl-4 py-2">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-primary" />}
        <h4 className="font-medium">{title}</h4>
      </div>
      <p className="text-xs text-muted-foreground font-mono mt-1">{route}</p>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-white p-8 max-w-5xl mx-auto">
      {/* Print button - hidden when printing */}
      <div className="print:hidden mb-6 flex justify-end">
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          Save as PDF
        </Button>
      </div>

      {/* Header */}
      <div className="text-center mb-12 border-b pb-8">
        <img src="/eip-logo.png" alt="EIP" className="mx-auto mb-4 h-12" />
        <h1 className="text-3xl font-bold mb-2">EIP Care Portal</h1>
        <p className="text-lg text-muted-foreground">Complete Screen Documentation</p>
        <p className="text-sm text-muted-foreground mt-2">Generated: {new Date().toLocaleDateString()}</p>
      </div>

      {/* Table of Contents */}
      <div className="mb-12 break-inside-avoid">
        <h2 className="text-xl font-semibold mb-4">Table of Contents</h2>
        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
          <li>Portal Selection (Public)</li>
          <li>Customer Portal (13 screens)</li>
          <li>Retail/BackOffice Portal (18 screens)</li>
          <li>Program Configuration Portal (8 tabs)</li>
          <li>Public Utility Pages (4 screens)</li>
        </ol>
      </div>

      {/* Section 1: Portal Selection */}
      <div className="mb-12 break-inside-avoid">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2 flex items-center gap-2">
          <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm">1</span>
          Portal Selection
        </h2>
        <div className="space-y-4">
          <ScreenItem 
            icon={LayoutDashboard}
            title="Main Portal Selection" 
            route="/" 
            description="Landing page with three portal options: Customer, BackOffice, and Program Configuration. Users select their role to proceed to the appropriate login."
          />
        </div>
      </div>

      {/* Section 2: Customer Portal */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2 flex items-center gap-2">
          <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm">2</span>
          <Users className="h-5 w-5" />
          Customer Portal
        </h2>
        <p className="text-muted-foreground mb-6">Self-service portal for customers to manage warranties, submit claims, and track policies.</p>
        
        <div className="space-y-4">
          <h3 className="font-semibold text-lg mt-6 mb-3">Authentication</h3>
          <ScreenItem 
            icon={Users}
            title="Customer Login / Sign Up" 
            route="/auth" 
            description="Authentication screen with Sign In and Sign Up tabs. Customers enter email and password to access their account or register new accounts."
          />

          <h3 className="font-semibold text-lg mt-6 mb-3">Dashboard & Overview</h3>
          <ScreenItem 
            icon={LayoutDashboard}
            title="Customer Dashboard" 
            route="/customer/" 
            description="Main dashboard showing policy summary, recent claims, upcoming payments, and quick action buttons. Displays key metrics and notifications."
          />

          <h3 className="font-semibold text-lg mt-6 mb-3">Claims Management</h3>
          <ScreenItem 
            icon={ClipboardList}
            title="Submit New Claim" 
            route="/customer/claim" 
            description="Multi-step claim submission wizard: select policy, choose claim type (breakdown/accidental damage), upload photos of damage, provide fault details, and upload supporting documents."
          />
          <ScreenItem 
            icon={Clock}
            title="Claim Status" 
            route="/customer/claim/status" 
            description="Track the current status of a recently submitted claim with timeline visualization showing each stage of the claims process."
          />
          <ScreenItem 
            icon={FileText}
            title="Claims History" 
            route="/customer/claims" 
            description="List of all submitted claims with filters by status, date, and claim type. Shows claim number, status badge, submission date, and quick view options."
          />
          <ScreenItem 
            icon={FileText}
            title="Claim Detail" 
            route="/customer/claims/:claimId" 
            description="Detailed view of a specific claim showing all information: policy details, device info, damage description, uploaded photos, documents, status history, and communication log."
          />

          <h3 className="font-semibold text-lg mt-6 mb-3">Policy Management</h3>
          <ScreenItem 
            icon={Shield}
            title="My Policies" 
            route="/customer/policies" 
            description="List of all customer policies with status (active/expired/cancelled), coverage details, premium amounts, renewal dates, and covered items. Ability to view policy documents."
          />

          <h3 className="font-semibold text-lg mt-6 mb-3">Documents & Payments</h3>
          <ScreenItem 
            icon={FileText}
            title="Documents" 
            route="/customer/documents" 
            description="Repository of all policy documents including certificates, terms & conditions, claim correspondence, and uploaded receipts. Download and view capabilities."
          />
          <ScreenItem 
            icon={CreditCard}
            title="Payments" 
            route="/customer/payments" 
            description="Payment history showing all transactions: premiums paid, excess payments, refunds. Payment status, dates, amounts, and reference numbers. Payment reminder settings."
          />

          <h3 className="font-semibold text-lg mt-6 mb-3">Support</h3>
          <ScreenItem 
            icon={AlertTriangle}
            title="Complaints" 
            route="/customer/complaints" 
            description="Submit and track complaints. Form to raise new complaints with reason selection, detailed description. View complaint history and responses."
          />
          <ScreenItem 
            icon={LifeBuoy}
            title="Support / Service Request" 
            route="/customer/support" 
            description="AI-powered chat support for general inquiries. Create service requests for policy changes, questions, or assistance. Track open requests."
          />
        </div>
      </div>

      {/* Section 3: Retail Portal */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2 flex items-center gap-2">
          <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm">3</span>
          <ShoppingBag className="h-5 w-5" />
          Retail / BackOffice Portal
        </h2>
        <p className="text-muted-foreground mb-6">Staff portal for retail agents, claims handlers, complaints agents, repairers, and administrators.</p>
        
        <div className="space-y-4">
          <h3 className="font-semibold text-lg mt-6 mb-3">Authentication</h3>
          <ScreenItem 
            icon={Users}
            title="Retail Portal Login" 
            route="/retail/auth" 
            description="Role-based quick login with 7 predefined profiles: Retail Agent, Claims Agent, Complaints Agent, Repairer Agent, Commercial Agent, Backoffice Operations, Program Admin. PIN verification required after login."
          />

          <h3 className="font-semibold text-lg mt-6 mb-3">Dashboard</h3>
          <ScreenItem 
            icon={LayoutDashboard}
            title="Retail Dashboard" 
            route="/retail/dashboard" 
            description="Role-specific dashboard. Retail agents see sales metrics, policy counts, pending claims. Repairer agents see job queue, SLA status, monthly revenue. Key performance indicators and quick actions."
          />

          <h3 className="font-semibold text-lg mt-6 mb-3">Sales & Policies</h3>
          <ScreenItem 
            icon={TrendingUp}
            title="New Sale" 
            route="/retail/sales" 
            description="Point-of-sale screen to create new warranty policies. Customer details form, device selection, product/coverage selection, price band matching, promotional code application, payment collection."
          />
          <ScreenItem 
            icon={FileText}
            title="Policies List" 
            route="/retail/policies" 
            description="Browse all policies with advanced filters: status, date range, product type, consultant. Bulk actions, export functionality. Access to individual policy management."
          />
          <ScreenItem 
            icon={Search}
            title="Policy Search" 
            route="/retail/policy-search" 
            description="Advanced search interface to find policies by policy number, customer name, email, phone, or device serial number. Quick lookup for customer service."
          />
          <ScreenItem 
            icon={FileText}
            title="Policy Details" 
            route="/retail/policies/:policyId" 
            description="Comprehensive policy view: customer info, covered device, coverage details, premium history, claims history, documents, communications log, action history. Edit and management actions."
          />
          <ScreenItem 
            icon={ArrowUpCircle}
            title="Policy Upgrade" 
            route="/retail/policies/:policyId/upgrade" 
            description="Upgrade or switch policy coverage. Compare current vs new product, price difference calculation, confirmation flow. Handles mid-term adjustments."
          />
          <ScreenItem 
            icon={Edit}
            title="Edit Customer Details" 
            route="/retail/policies/:policyId/edit-customer" 
            description="Update customer information: name, contact details, address. Validation and audit trail of changes."
          />

          <h3 className="font-semibold text-lg mt-6 mb-3">Claims Processing</h3>
          <ScreenItem 
            icon={ClipboardList}
            title="Claims Queue" 
            route="/retail/claims" 
            description="List of all claims with SLA indicators, status filters, assignment tracking. Color-coded urgency levels. Bulk processing capabilities."
          />
          <ScreenItem 
            icon={ClipboardList}
            title="Make Claim (on behalf of customer)" 
            route="/retail/make-claim" 
            description="Staff-assisted claim submission. Search for policy, capture claim details, upload evidence on customer's behalf. Streamlined process for in-store claims."
          />
          <ScreenItem 
            icon={ClipboardList}
            title="Claim Management" 
            route="/retail/claims/:claimId" 
            description="Full claim processing interface: review evidence, AI damage analysis, accept/reject/refer decisions, fulfillment flow (repair booking, repairer assignment, logistics), cost tracking, quote approval, communication tools."
          />
          <ScreenItem 
            icon={Upload}
            title="Claim Document Upload" 
            route="/retail/claims/:claimId/upload-documents" 
            description="Upload additional documents to a claim: photos, receipts, engineer reports. Document categorization and AI analysis."
          />
          <ScreenItem 
            icon={FileText}
            title="Claim Next Steps" 
            route="/retail/claims/:claimId/next-steps" 
            description="Post-submission guidance showing claim status, expected timeline, next actions required from customer or staff."
          />

          <h3 className="font-semibold text-lg mt-6 mb-3">Complaints Handling</h3>
          <ScreenItem 
            icon={AlertTriangle}
            title="Complaints Queue" 
            route="/retail/complaints" 
            description="List of customer complaints with priority levels, SLA tracking, assignment status. Filter by type, status, date."
          />
          <ScreenItem 
            icon={AlertTriangle}
            title="Complaints Management" 
            route="/retail/complaints-management" 
            description="Detailed complaint handling: review details, investigation notes, response drafting, resolution tracking, escalation workflow, audit trail."
          />

          <h3 className="font-semibold text-lg mt-6 mb-3">Service & Support</h3>
          <ScreenItem 
            icon={LifeBuoy}
            title="Service Request Inbox" 
            route="/retail/service-request" 
            description="Queue of customer service requests and inquiries. AI-assisted responses, request categorization, resolution tracking, SLA monitoring."
          />

          <h3 className="font-semibold text-lg mt-6 mb-3">Repairer Functions</h3>
          <ScreenItem 
            icon={Wrench}
            title="Repairer Jobs" 
            route="/retail/repairer-jobs" 
            description="Job queue for repairer agents: assigned repairs, inspection bookings, quote submissions, repair completion, parts ordering. SLA tracking and job status updates."
          />
          <ScreenItem 
            icon={CreditCard}
            title="Trade-In Costs" 
            route="/retail/trade-in-costs" 
            description="Manage repair costs and trade-in valuations. Cost entry for labour, parts, logistics. Quote submission and approval workflow."
          />

          <h3 className="font-semibold text-lg mt-6 mb-3">Reporting & Admin</h3>
          <ScreenItem 
            icon={TrendingUp}
            title="Reports" 
            route="/retail/reports" 
            description="Business intelligence dashboards: sales performance, claims ratios, SLA compliance, consultant performance, revenue analytics. Export and date range filtering."
          />
          <ScreenItem 
            icon={UserCog}
            title="Consultants Management" 
            route="/retail/consultants" 
            description="Manage retail consultants: view performance metrics, sales history, create new consultant accounts, reset PINs, activate/deactivate users."
          />
        </div>
      </div>

      {/* Section 4: Program Configuration */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2 flex items-center gap-2">
          <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm">4</span>
          <Settings className="h-5 w-5" />
          Program Configuration Portal
        </h2>
        <p className="text-muted-foreground mb-6">System administration portal for configuring programs, products, and deployment settings. Requires admin authentication.</p>
        
        <div className="space-y-4">
          <ScreenItem 
            icon={Building}
            title="Programs Tab" 
            route="/program-configuration → Programs" 
            description="Create and manage insurance programs. Configure program name, description, data isolation settings, reference number formats. Program-level settings and activation."
          />
          <ScreenItem 
            icon={Package}
            title="Products Tab" 
            route="/program-configuration → Products" 
            description="Configure warranty products: pricing tiers, coverage levels, excess amounts, device categories, perils covered, eligibility rules, validity rules, renewal rules, document templates, communication templates, promotions. Product activation and deactivation."
          />
          <ScreenItem 
            icon={Clock}
            title="Claims SLA Tab" 
            route="/program-configuration → Claims SLA" 
            description="Define service level agreements for claim processing. Set SLA hours for each claim status, configure escalation rules, enable/disable SLA tracking per program."
          />
          <ScreenItem 
            icon={FileText}
            title="References Tab" 
            route="/program-configuration → References" 
            description="Configure reference number formats for policies, claims, complaints, and service requests. Define prefixes, suffixes, numbering patterns per program."
          />
          <ScreenItem 
            icon={Package}
            title="Devices Tab" 
            route="/program-configuration → Devices" 
            description="Manage device catalog: categories (phones, laptops, TVs etc.), manufacturers, models, RRP values, trade-in prices, warranty periods. Device matching for policy creation."
          />
          <ScreenItem 
            icon={Wrench}
            title="Fulfillment Tab" 
            route="/program-configuration → Fulfillment" 
            description="Configure claim fulfillment: repairer network management (add/edit repairers, contact details, coverage areas, specializations), repairer SLA settings, fulfillment assignments (which repairer handles which device types)."
          />
          <ScreenItem 
            icon={UserPlus}
            title="Access Control Tab" 
            route="/program-configuration → Access Control" 
            description="User management: create users with roles, manage user groups, configure permissions per program. Entity management for organizational hierarchy. Role-based access to portal sections."
          />
          <ScreenItem 
            icon={Palette}
            title="Branding Tab" 
            route="/program-configuration → Branding" 
            description="Extract and configure branding from client websites. Color schemes, logos, fonts. Apply branding to customer-facing communications and documents."
          />
        </div>
      </div>

      {/* Section 5: Public Utility Pages */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 border-b pb-2 flex items-center gap-2">
          <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm">5</span>
          Public Utility Pages
        </h2>
        <p className="text-muted-foreground mb-6">Publicly accessible pages for specific workflows.</p>
        
        <div className="space-y-4">
          <ScreenItem 
            icon={Upload}
            title="Public Claim Document Upload" 
            route="/claim-upload/:claimId" 
            description="Public link sent to customers to upload additional documents for their claim. No login required - secured by unique claim ID. Supports photos, receipts, and other evidence."
          />
          <ScreenItem 
            icon={UserPlus}
            title="Setup Consultant" 
            route="/setup-consultant" 
            description="Initial setup page for new consultant accounts. Password creation and profile completion after receiving invitation."
          />
          <ScreenItem 
            icon={Settings}
            title="Setup System Admin" 
            route="/setup-system-admin" 
            description="Initial setup page for system administrator accounts. Secure onboarding flow for admin users."
          />
          <ScreenItem 
            icon={Database}
            title="Architecture Documentation" 
            route="/architecture" 
            description="Technical documentation showing system architecture, data flows, and integration points."
          />
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="mb-12 border rounded-lg p-6 bg-gray-50 break-inside-avoid">
        <h2 className="text-xl font-semibold mb-4">Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-3xl font-bold text-primary">44</div>
            <div className="text-sm text-muted-foreground">Total Screens</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary">13</div>
            <div className="text-sm text-muted-foreground">Customer Portal</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary">18</div>
            <div className="text-sm text-muted-foreground">Retail Portal</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary">8</div>
            <div className="text-sm text-muted-foreground">Admin Tabs</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground border-t pt-6">
        <p className="font-medium">MediaMarkt Care Portal</p>
        <p>Powered by EIP</p>
        <p className="mt-2">Document generated on {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
};

export default PortalOverview;
