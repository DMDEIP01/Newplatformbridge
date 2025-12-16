import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/hooks/useLanguage";
import Index from "./pages/Index";
import Layout from "./components/Layout";
import RetailLayout from "./components/RetailLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import RetailProtectedRoute from "./components/RetailProtectedRoute";
import Dashboard from "./pages/Dashboard";
import ClaimSubmission from "./pages/ClaimSubmission";
import ClaimStatus from "./pages/ClaimStatus";
import ClaimsHistory from "./pages/ClaimsHistory";
import ClaimDetail from "./pages/ClaimDetail";
import Policies from "./pages/Policies";
import Documents from "./pages/Documents";
import Payments from "./pages/Payments";
import ServiceRequest from "./pages/ServiceRequest";
import Complaints from "./pages/Complaints";
import Auth from "./pages/Auth";
import RetailAuth from "./pages/retail/RetailAuth";
import RetailDashboard from "./pages/retail/RetailDashboard";
import RetailSales from "./pages/retail/RetailSales";
import RetailPolicies from "./pages/retail/RetailPolicies";
import RetailPolicySearch from "./pages/retail/RetailPolicySearch";
import RetailPolicyDetails from "./pages/retail/RetailPolicyDetails";
import RetailClaims from "./pages/retail/RetailClaims";
import RetailMakeClaim from "./pages/retail/RetailMakeClaim";
import RetailMakeClaimPrototype from "./pages/retail/RetailMakeClaimPrototype";
import RetailReports from "./pages/retail/RetailReports";
import RetailConsultants from "./pages/retail/RetailConsultants";
import RetailComplaints from "./pages/retail/RetailComplaints";
import RetailComplaintsManagement from "./pages/retail/RetailComplaintsManagement";
import RetailClaimsManagement from "./pages/retail/RetailClaimsManagement";
import RetailClaimNextSteps from "./pages/retail/RetailClaimNextSteps";
import RetailServiceRequest from "./pages/retail/RetailServiceRequest";
import RepairerJobs from "./pages/retail/RepairerJobs";
import RepairerTradeInCosts from "./pages/retail/RepairerTradeInCosts";
import RetailPolicyUpgrade from "./pages/retail/RetailPolicyUpgrade";
import RetailCustomerEdit from "./pages/retail/RetailCustomerEdit";
import RetailClaimDocumentUpload from "./pages/retail/RetailClaimDocumentUpload";
import ClaimDocumentUpload from "./pages/customer/ClaimDocumentUpload";
import SetupConsultant from "./pages/SetupConsultant";
import SetupSystemAdmin from "./pages/SetupSystemAdmin";
import ProgramConfiguration from "./pages/ProgramConfiguration";
import DeviceDetails from "./pages/DeviceDetails";
import SeedData from "./pages/SeedData";
import SeedRetailData from "./pages/SeedRetailData";
import NotFound from "./pages/NotFound";
import Architecture from "./pages/Architecture";
import PortalOverview from "./pages/PortalOverview";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <LanguageProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/retail/auth" element={<RetailAuth />} />
            
            {/* Public customer document upload - no auth required */}
            <Route path="/claim-upload/:claimId" element={<ClaimDocumentUpload />} />
            
            <Route path="/setup-consultant" element={<SetupConsultant />} />
            <Route path="/setup-system-admin" element={<SetupSystemAdmin />} />
            <Route path="/program-configuration" element={<ProgramConfiguration />} />
            <Route path="/architecture" element={<Architecture />} />
            <Route path="/portal-overview" element={<PortalOverview />} />
            <Route path="/device/:deviceId" element={<DeviceDetails />} />
            <Route
              path="/seed"
              element={
                <ProtectedRoute>
                  <SeedData />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seed-retail"
              element={
                <ProtectedRoute>
                  <SeedRetailData />
                </ProtectedRoute>
              }
            />
            <Route
              path="/retail/*"
              element={<RetailLayout />}
            >
              <Route path="dashboard" element={<RetailDashboard />} />
              <Route path="sales" element={<RetailSales />} />
              <Route path="policies" element={<RetailPolicies />} />
              <Route path="policy-search" element={<RetailPolicySearch />} />
              <Route path="policies/:policyId" element={<RetailPolicyDetails />} />
              <Route path="policies/:policyId/upgrade" element={<RetailPolicyUpgrade />} />
              <Route path="policies/:policyId/edit-customer" element={<RetailCustomerEdit />} />
              <Route path="make-claim" element={<RetailMakeClaim />} />
              <Route path="make-claim-prototype" element={<RetailMakeClaimPrototype />} />
              <Route path="claims" element={<RetailClaims />} />
              <Route path="claims/:claimId" element={<RetailClaimsManagement />} />
              <Route path="claims/:claimId/upload-documents" element={<RetailClaimDocumentUpload />} />
              <Route path="claims/:claimId/next-steps" element={<RetailClaimNextSteps />} />
              <Route path="claims-management" element={<RetailClaimsManagement />} />
              <Route path="complaints" element={<RetailComplaints />} />
              <Route path="complaints-management" element={<RetailComplaintsManagement />} />
              <Route path="service-request" element={<RetailServiceRequest />} />
              <Route path="repairer-jobs" element={<RepairerJobs />} />
              <Route path="trade-in-costs" element={<RepairerTradeInCosts />} />
              <Route path="reports" element={<RetailReports />} />
              <Route path="consultants" element={<RetailConsultants />} />
            </Route>
            <Route
              path="/customer/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/claim" element={<ClaimSubmission />} />
                      <Route path="/claim/status" element={<ClaimStatus />} />
                      <Route path="/claims" element={<ClaimsHistory />} />
                      <Route path="/claim/:claimId" element={<ClaimDetail />} />
                      <Route path="/claims/:claimId" element={<ClaimDetail />} />
                      <Route path="/policies" element={<Policies />} />
                      <Route path="/documents" element={<Documents />} />
                      <Route path="/payments" element={<Payments />} />
                      <Route path="/complaints" element={<Complaints />} />
                      <Route path="/support" element={<ServiceRequest />} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </LanguageProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
