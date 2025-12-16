import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Mail, Phone, Edit, AlertCircle, Headphones, FileText, User, Shield, Package, Calendar, CreditCard, MessageSquare, ArrowUpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import PolicyDocumentsCard from "@/components/PolicyDocumentsCard";
import PolicyEditDialog from "@/components/PolicyEditDialog";
import { PolicyCommunications } from "@/components/PolicyCommunications";
import { PolicyPaymentHistory } from "@/components/PolicyPaymentHistory";
import { PolicyActionHistory } from "@/components/PolicyActionHistory";
import { formatStatus } from "@/lib/utils";

interface PolicyWithDetails {
  id: string;
  policy_number: string;
  status: string;
  start_date: string;
  renewal_date: string;
  user_id: string;
  product_id: string;
  notes?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address_line1?: string;
  customer_address_line2?: string;
  customer_city?: string;
  customer_postcode?: string;
  promotion_id?: string;
  original_premium?: number;
  promotional_premium?: number;
  product: {
    name: string;
    type: string;
    monthly_premium: number;
    excess_1: number;
    excess_2: number | null;
    coverage: string[];
    perils: string[] | null;
  };
  promotion?: {
    id: string;
    promo_name: string;
    promo_code: string;
    promo_type: string;
    discount_value: number | null;
    free_months: number | null;
  };
  profile: {
    full_name: string;
    email: string;
    phone: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    postcode?: string;
  };
  covered_items: Array<{
    product_name: string;
    model: string;
    serial_number: string;
    purchase_price: number;
  }>;
  complaints?: Array<{
    id: string;
    complaint_reference: string;
    complaint_type: string;
    reason: string;
    details: string;
    status: string;
    classification?: string;
    reviewed_at?: string;
    reviewed_by?: string;
    created_at: string;
    response?: string;
    response_date?: string;
  }>;
  service_requests?: Array<{
    id: string;
    request_reference: string;
    customer_name: string;
    customer_email: string;
    reason: string;
    details: string;
    status: string;
    created_at: string;
    resolved_at?: string;
    resolution_notes?: string;
  }>;
  claims?: Array<{
    id: string;
    claim_number: string;
    claim_type: string;
    status: string;
    decision?: string;
    description: string;
    submitted_date: string;
    has_receipt: boolean;
  }>;
}

export default function RetailPolicyDetails() {
  const { policyId } = useParams();
  const navigate = useNavigate();
  const [policy, setPolicy] = useState<PolicyWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [showAllClaims, setShowAllClaims] = useState(false);
  const [complaintStatus, setComplaintStatus] = useState("");
  const [complaintResponse, setComplaintResponse] = useState("");

  useEffect(() => {
    const loadData = async () => {
      await fetchPolicyDetails();
      if (policyId) {
        await fetchClaims(policyId);
      }
    };
    loadData();
    fetchProducts();
  }, [policyId]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("tier");
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchPolicyDetails = async () => {
    if (!policyId) {
      console.log("No policyId provided");
      return;
    }

    console.log("Fetching policy details for:", policyId);
    setLoading(true);
    try {
      const { data: policyData, error }: any = await supabase
        .from("policies")
        .select(`
          id,
          policy_number,
          status,
          start_date,
          renewal_date,
          user_id,
          product_id,
          notes,
          customer_name,
          customer_email,
          customer_phone,
          customer_address_line1,
          customer_address_line2,
          customer_city,
          customer_postcode,
          promotion_id,
          original_premium,
          promotional_premium,
          product:products(name, type, monthly_premium, excess_1, excess_2, coverage, perils),
          promotion:promotions(id, promo_name, promo_code, promo_type, discount_value, free_months),
          covered_items(product_name, model, serial_number, purchase_price)
        `)
        .eq("id", policyId)
        .maybeSingle();

      console.log("Policy fetch result:", { policyData, error });

      if (error) {
        console.error("Error fetching policy:", error);
        throw error;
      }
      
      if (!policyData) {
        toast.error("Policy not found");
        navigate("/retail/policy-search");
        return;
      }

      // Normalize covered_items
      const normalizedPolicy: any = {
        ...policyData,
        profile: {
          full_name: policyData.customer_name || "Unknown",
          email: policyData.customer_email || "",
          phone: policyData.customer_phone || "",
          address_line1: policyData.customer_address_line1 || "",
          address_line2: policyData.customer_address_line2 || "",
          city: policyData.customer_city || "",
          postcode: policyData.customer_postcode || "",
        },
        covered_items: Array.isArray(policyData.covered_items) 
          ? policyData.covered_items 
          : policyData.covered_items 
            ? [policyData.covered_items] 
            : []
      };

      setPolicy(normalizedPolicy);
      
      // Fetch complaints and service requests
      await fetchComplaints(policyId);
      await fetchServiceRequests(policyId);
    } catch (error: any) {
      console.error("Error fetching policy:", error);
      toast.error("Failed to load policy details");
      navigate("/retail/policy-search");
    } finally {
      setLoading(false);
    }
  };

  const fetchComplaints = async (policyId: string) => {
    try {
      const { data: complaints, error } = await supabase
        .from('complaints')
        .select('id, complaint_reference, complaint_type, reason, details, status, classification, reviewed_at, reviewed_by, created_at, response, response_date')
        .eq('policy_id', policyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPolicy((prev) => prev ? {
        ...prev,
        complaints: complaints || []
      } : null);
    } catch (error: any) {
      console.error('Error fetching complaints:', error);
    }
  };

  const fetchServiceRequests = async (policyId: string) => {
    try {
      const { data: serviceRequests, error } = await supabase
        .from('service_requests' as any)
        .select('id, request_reference, customer_name, customer_email, reason, details, status, created_at, resolved_at, resolution_notes')
        .eq('policy_id', policyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPolicy((prev: any) => prev ? {
        ...prev,
        service_requests: serviceRequests || []
      } : null);
    } catch (error: any) {
      console.error('Error fetching service requests:', error);
    }
  };

  const fetchClaims = async (policyId: string) => {
    try {
      const { data: claims, error } = await supabase
        .from('claims')
        .select('id, claim_number, claim_type, status, decision, description, submitted_date, has_receipt')
        .eq('policy_id', policyId)
        .order('submitted_date', { ascending: false });

      if (error) throw error;

      setPolicy((prev: any) => prev ? {
        ...prev,
        claims: claims || []
      } : null);
    } catch (error: any) {
      console.error('Error fetching claims:', error);
    }
  };

  const startEditingComplaint = (complaint: any) => {
    setSelectedComplaint(complaint);
    setComplaintStatus(complaint.status);
    setComplaintResponse(complaint.response || "");
  };

  const cancelEditingComplaint = () => {
    setSelectedComplaint(null);
    setComplaintResponse("");
  };

  const handleUpdateComplaint = async () => {
    if (!selectedComplaint || !policyId) return;

    try {
      const updateData: any = {
        status: complaintStatus,
      };

      if (complaintResponse.trim()) {
        updateData.response = complaintResponse;
        updateData.response_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('complaints')
        .update(updateData)
        .eq('id', selectedComplaint.id);

      if (error) throw error;

      toast.success("Complaint updated successfully");
      setSelectedComplaint(null);
      setComplaintResponse("");
      
      // Refresh complaints
      await fetchComplaints(policyId);
    } catch (error: any) {
      console.error('Update complaint error:', error);
      toast.error("Failed to update complaint");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">Policy not found</p>
        <Button onClick={() => navigate("/retail/policy-search")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Search
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/retail/policy-search")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Search
        </Button>
        <div className="flex gap-2">
          <Button 
            onClick={() => navigate("/retail/make-claim", { state: { policy } })} 
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Make Claim
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate(`/retail/policies/${policy.id}/upgrade`, { 
              state: { 
                currentPolicy: {
                  id: policy.id,
                  policy_number: policy.policy_number,
                  products: {
                    id: policy.product_id,
                    name: policy.product?.name || '',
                    type: policy.product?.type || '',
                    monthly_premium: policy.product?.monthly_premium || 0,
                    excess_1: policy.product?.excess_1 || 0,
                    coverage: [],
                    tier: products.find(p => p.id === policy.product_id)?.tier || 1
                  }
                }
              }
            })} 
            className="gap-2"
          >
            <ArrowUpCircle className="h-4 w-4" />
            Upgrade Policy
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate("/retail/service-request", { state: { policy } })} 
            className="gap-2"
          >
            <Headphones className="h-4 w-4" />
            Service Request
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate("/retail/complaints", { state: { policy } })} 
            className="gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Create Complaint
          </Button>
          <Button onClick={() => setEditDialogOpen(true)} className="gap-2" variant="outline">
            <Edit className="h-4 w-4" />
            Edit Policy
          </Button>
        </div>
      </div>

      {/* Header Card */}
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold">{policy.policy_number}</h1>
                <Badge 
                  variant={policy.status === 'active' ? 'default' : 'secondary'}
                  className="text-sm"
                >
                  {formatStatus(policy.status)}
                </Badge>
                {policy.promotion && (
                  <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                    {policy.promotion.promo_name}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">{policy.product?.name}</p>
            </div>
            <div className="text-right space-y-1">
              {policy.promotional_premium !== null && policy.promotional_premium !== undefined ? (
                <>
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-lg line-through text-muted-foreground">€{policy.original_premium?.toFixed(2)}</span>
                    <span className="text-2xl font-bold text-success">€{policy.promotional_premium.toFixed(2)}/mo</span>
                  </div>
                  <p className="text-sm text-success">
                    {policy.promotion?.promo_type === 'percentage_discount' && `${policy.promotion.discount_value}% off`}
                    {policy.promotion?.promo_type === 'fixed_discount' && `€${policy.promotion.discount_value?.toFixed(2)} off`}
                    {policy.promotion?.promo_type === 'free_months' && `${policy.promotion.free_months} month(s) free`}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-primary">
                    €{policy.product?.monthly_premium}/mo
                  </div>
                  <p className="text-sm text-muted-foreground">Monthly Premium</p>
                </>
              )}
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Start Date</p>
              <p className="font-medium">{new Date(policy.start_date).toLocaleDateString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Renewal Date</p>
              <p className="font-medium">{new Date(policy.renewal_date).toLocaleDateString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Excess</p>
              <p className="font-medium">€{policy.product?.excess_1}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-medium">{policy.product?.type}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for organized content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="gap-2">
            <Shield className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="customer" className="gap-2">
            <User className="h-4 w-4" />
            Customer
          </TabsTrigger>
          <TabsTrigger value="items" className="gap-2">
            <Package className="h-4 w-4" />
            Items
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Coverage Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Product Name</Label>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold">{policy.product?.name}</p>
                    {policy.promotion && (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
                        {policy.promotion.promo_name}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Monthly Premium</Label>
                    {policy.promotional_premium !== null && policy.promotional_premium !== undefined ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm line-through text-muted-foreground">€{policy.original_premium?.toFixed(2)}</p>
                          <p className="text-xl font-bold text-success">€{policy.promotional_premium.toFixed(2)}</p>
                        </div>
                        <p className="text-xs text-success">
                          {policy.promotion?.promo_type === 'percentage_discount' && `${policy.promotion.discount_value}% discount applied`}
                          {policy.promotion?.promo_type === 'fixed_discount' && `€${policy.promotion.discount_value?.toFixed(2)} discount applied`}
                          {policy.promotion?.promo_type === 'free_months' && (() => {
                            const freeMonths = policy.promotion?.free_months || 0;
                            const startDate = new Date(policy.start_date);
                            const expiryDate = new Date(startDate);
                            expiryDate.setMonth(expiryDate.getMonth() + freeMonths);
                            return `${freeMonths} month(s) free - expires ${expiryDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
                          })()}
                        </p>
                      </div>
                    ) : policy.promotion?.promo_type === 'free_months' ? (
                      <div className="space-y-1">
                        <p className="text-xl font-bold text-success">€{policy.product?.monthly_premium}</p>
                        <p className="text-xs text-success">
                          {(() => {
                            const freeMonths = policy.promotion?.free_months || 0;
                            const startDate = new Date(policy.start_date);
                            const expiryDate = new Date(startDate);
                            expiryDate.setMonth(expiryDate.getMonth() + freeMonths);
                            return `First ${freeMonths} month(s) free - expires ${expiryDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
                          })()}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xl font-bold text-primary">€{policy.product?.monthly_premium}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Excess Amount</Label>
                    <p className="text-xl font-bold">€{policy.product?.excess_1}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Product Type</Label>
                  <Badge variant="outline" className="text-sm">{policy.product?.type}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Important Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Policy Start Date</Label>
                  <p className="text-lg font-medium">
                    {new Date(policy.start_date).toLocaleDateString('en-GB', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Next Renewal Date</Label>
                  <p className="text-lg font-medium">
                    {new Date(policy.renewal_date).toLocaleDateString('en-GB', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Policy Status</Label>
                  <Badge 
                    variant={policy.status === 'active' ? 'default' : 'secondary'}
                    className="text-sm"
                  >
                    {policy.status.toUpperCase()}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {policy.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Policy Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm font-mono">{policy.notes}</pre>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Claims Section */}
          {policy.claims && policy.claims.length > 0 && (() => {
            const openClaims = policy.claims.filter(claim => 
              !['closed', 'rejected'].includes(claim.status)
            );
            const completedClaims = policy.claims.filter(claim => 
              ['closed', 'rejected'].includes(claim.status)
            );

            const getStatusColor = (status: string) => {
              switch (status) {
                case 'closed': return 'default';
                case 'accepted': return 'default';
                case 'notified': return 'secondary';
                case 'referred': return 'secondary';
                case 'excess_due': return 'secondary';
                case 'excess_paid_fulfillment_pending': return 'secondary';
                case 'fulfillment_inspection_booked': return 'secondary';
                case 'estimate_received': return 'secondary';
                case 'inbound_logistics': return 'secondary';
                case 'repair': return 'secondary';
                case 'outbound_logistics': return 'secondary';
                case 'fulfillment_outcome': return 'secondary';
                case 'rejected': return 'destructive';
                default: return 'outline';
              }
            };

            const getDecisionColor = (decision?: string) => {
              switch (decision) {
                case 'approved': return 'default';
                case 'rejected': return 'destructive';
                default: return 'outline';
              }
            };

            const renderClaimCard = (claim: any) => (
              <Card 
                key={claim.id} 
                className="border-l-4 border-l-primary cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate(`/retail/claims/${claim.id}`)}
              >
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold">{claim.claim_number}</p>
                        <div className="flex gap-2">
                          <Badge variant={getStatusColor(claim.status)}>
                            {claim.status.replace(/_/g, ' ')}
                          </Badge>
                          {claim.decision && (
                            <Badge variant={getDecisionColor(claim.decision)}>
                              {claim.decision}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(claim.submitted_date).toLocaleDateString()}
                      </p>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Type</Label>
                        <p className="text-sm font-medium">{claim.claim_type.replace(/_/g, ' ')}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Description</Label>
                        <p className="text-sm line-clamp-2">{claim.description}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );

            return (
              <>
                {openClaims.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Open Claims
                      </CardTitle>
                      <CardDescription>
                        {openClaims.length} {openClaims.length === 1 ? 'claim' : 'claims'} in progress
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {openClaims.map(renderClaimCard)}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {completedClaims.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        Completed Claims
                      </CardTitle>
                      <CardDescription>
                        {completedClaims.length} {completedClaims.length === 1 ? 'claim' : 'claims'} completed
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {completedClaims.map(renderClaimCard)}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            );
          })()}
        </TabsContent>

        {/* Customer Tab */}
        <TabsContent value="customer" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Customer Information
                  </CardTitle>
                  <CardDescription>Contact details and address information</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/retail/policies/${policy.id}/edit-customer`, {
                    state: {
                      customerData: {
                        customer_name: policy.customer_name,
                        customer_email: policy.customer_email,
                        customer_phone: policy.customer_phone,
                        customer_address_line1: policy.customer_address_line1,
                        customer_address_line2: policy.customer_address_line2,
                        customer_city: policy.customer_city,
                        customer_postcode: policy.customer_postcode,
                      }
                    }
                  })}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit Customer
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Full Name</Label>
                    <p className="text-lg font-medium">{policy.customer_name || "N/A"}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Address
                    </Label>
                    <p className="text-sm">{policy.customer_email || "N/A"}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Number
                    </Label>
                    <p className="text-sm">{policy.customer_phone || "N/A"}</p>
                  </div>
                </div>

                {(policy.customer_address_line1 || policy.customer_city || policy.customer_postcode) && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Address</Label>
                    <div className="bg-muted/50 p-4 rounded-lg space-y-1">
                      {policy.customer_address_line1 && <p className="text-sm">{policy.customer_address_line1}</p>}
                      {policy.customer_address_line2 && <p className="text-sm">{policy.customer_address_line2}</p>}
                      {policy.customer_city && <p className="text-sm">{policy.customer_city}</p>}
                      {policy.customer_postcode && <p className="text-sm font-medium">{policy.customer_postcode}</p>}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Covered Items Tab */}
        <TabsContent value="items" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Covered Items
              </CardTitle>
              <CardDescription>
                {policy.covered_items.length} {policy.covered_items.length === 1 ? 'item' : 'items'} covered under this policy
              </CardDescription>
            </CardHeader>
            <CardContent>
              {policy.covered_items.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No items covered under this policy</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {policy.covered_items.map((item, idx) => (
                    <Card key={idx} className="border-2">
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">{item.product_name}</h3>
                              {item.model && (
                                <p className="text-sm text-muted-foreground">Model: {item.model}</p>
                              )}
                            </div>
                            {item.purchase_price && (
                              <Badge variant="secondary" className="text-sm">
                                €{item.purchase_price}
                              </Badge>
                            )}
                          </div>
                          {item.serial_number && (
                            <div className="pt-2 border-t">
                              <Label className="text-xs text-muted-foreground">Serial Number</Label>
                              <p className="text-sm font-mono">{item.serial_number}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          {/* Policy Activity - Communications related to policy */}
          <Collapsible defaultOpen={false}>
            <Card>
              <CardHeader>
                <CollapsibleTrigger className="flex w-full items-center justify-between hover:no-underline">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-primary" />
                      Policy Activity
                    </CardTitle>
                    <CardDescription>Policy-related communications (sales, renewals, etc.)</CardDescription>
                  </div>
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 ui-open:rotate-180" />
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent>
                  <PolicyCommunications policyId={policy.id} claimId={null} />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Policy Action History */}
          <PolicyActionHistory policyId={policy.id} />

          {/* Claims */}
          <Collapsible defaultOpen={false}>
            <Card>
              <CardHeader>
                <CollapsibleTrigger className="flex w-full items-center justify-between hover:no-underline">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Claims
                      {policy.claims && policy.claims.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {policy.claims.length}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>Active and completed insurance claims</CardDescription>
                  </div>
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 ui-open:rotate-180" />
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent>
              {!policy.claims || policy.claims.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No claims</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Show latest claim */}
                  {(() => {
                    const latestClaim = policy.claims[0];
                    const getStatusColor = (status: string) => {
                      switch (status) {
                        case 'completed': return 'default';
                        case 'approved': return 'default';
                        case 'in_review': return 'secondary';
                        case 'pending_documents': return 'secondary';
                        case 'declined': return 'destructive';
                        default: return 'outline';
                      }
                    };

                    const getDecisionColor = (decision?: string) => {
                      switch (decision) {
                        case 'approved': return 'default';
                        case 'declined': return 'destructive';
                        case 'pending': return 'secondary';
                        default: return 'outline';
                      }
                    };

                    return (
                      <Card 
                        key={latestClaim.id} 
                        className="border-l-4 border-l-primary cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => navigate(`/retail/claims/${latestClaim.id}`)}
                      >
                        <CardContent className="pt-6">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold">{latestClaim.claim_number}</p>
                                  {policy.claims.length > 1 && (
                                    <Badge variant="outline" className="text-xs">Latest</Badge>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Badge variant={getStatusColor(latestClaim.status)}>
                                    {latestClaim.status.replace(/_/g, ' ')}
                                  </Badge>
                                  {latestClaim.decision && (
                                    <Badge variant={getDecisionColor(latestClaim.decision)}>
                                      {latestClaim.decision}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {new Date(latestClaim.submitted_date).toLocaleDateString()}
                              </p>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                              <div>
                                <Label className="text-xs text-muted-foreground">Type</Label>
                                <p className="text-sm font-medium">{latestClaim.claim_type.replace(/_/g, ' ')}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Description</Label>
                                <p className="text-sm line-clamp-2">{latestClaim.description}</p>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {latestClaim.has_receipt ? (
                                  <span className="text-green-600 dark:text-green-400">✓ Receipt provided</span>
                                ) : (
                                  <span className="text-amber-600 dark:text-amber-400">⚠ No receipt</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}

                  {/* Collapsible section for older claims */}
                  {policy.claims.length > 1 && (
                    <Collapsible open={showAllClaims} onOpenChange={setShowAllClaims}>
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" className="w-full gap-2">
                          {showAllClaims ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              Hide older claims ({policy.claims.length - 1})
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              Show older claims ({policy.claims.length - 1})
                            </>
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-4 mt-4">
                        {policy.claims.slice(1).map((claim) => {
                          const getStatusColor = (status: string) => {
                            switch (status) {
                              case 'completed': return 'default';
                              case 'approved': return 'default';
                              case 'in_review': return 'secondary';
                              case 'pending_documents': return 'secondary';
                              case 'declined': return 'destructive';
                              default: return 'outline';
                            }
                          };

                          const getDecisionColor = (decision?: string) => {
                            switch (decision) {
                              case 'approved': return 'default';
                              case 'declined': return 'destructive';
                              case 'pending': return 'secondary';
                              default: return 'outline';
                            }
                          };

                          return (
                            <Card 
                              key={claim.id} 
                              className="border-l-4 border-l-muted cursor-pointer hover:bg-accent/50 transition-colors"
                              onClick={() => navigate(`/retail/claims/${claim.id}`)}
                            >
                              <CardContent className="pt-6">
                                <div className="space-y-3">
                                  <div className="flex items-start justify-between">
                                    <div className="space-y-1">
                                      <p className="font-semibold">{claim.claim_number}</p>
                                      <div className="flex gap-2">
                                        <Badge variant={getStatusColor(claim.status)}>
                                          {claim.status.replace(/_/g, ' ')}
                                        </Badge>
                                        {claim.decision && (
                                          <Badge variant={getDecisionColor(claim.decision)}>
                                            {claim.decision}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(claim.submitted_date).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <Separator />
                                  <div className="space-y-2">
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Type</Label>
                                      <p className="text-sm font-medium">{claim.claim_type.replace(/_/g, ' ')}</p>
                                    </div>
                                    <div>
                                      <Label className="text-xs text-muted-foreground">Description</Label>
                                      <p className="text-sm line-clamp-2">{claim.description}</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      {claim.has_receipt ? (
                                        <span className="text-green-600 dark:text-green-400">✓ Receipt provided</span>
                                      ) : (
                                        <span className="text-amber-600 dark:text-amber-400">⚠ No receipt</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Service Requests */}
          <Collapsible defaultOpen={false}>
            <Card>
              <CardHeader>
                <CollapsibleTrigger className="flex w-full items-center justify-between hover:no-underline">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Headphones className="h-5 w-5 text-primary" />
                      Service Requests
                      {policy.service_requests && policy.service_requests.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {policy.service_requests.length}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>History of customer service interactions</CardDescription>
                  </div>
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 ui-open:rotate-180" />
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent>
              {!policy.service_requests || policy.service_requests.length === 0 ? (
                <div className="text-center py-8">
                  <Headphones className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No service requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {policy.service_requests.map((request) => (
                    <Card key={request.id} className="border-l-4 border-l-primary">
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <p className="font-semibold">{request.request_reference}</p>
                              <Badge variant={request.status === 'resolved' ? 'default' : request.status === 'in_progress' ? 'secondary' : 'outline'}>
                                {request.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(request.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Separator />
                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs text-muted-foreground">Reason</Label>
                              <p className="text-sm font-medium">{request.reason}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Details</Label>
                              <p className="text-sm">{request.details}</p>
                            </div>
                          </div>
                          {request.resolution_notes && (
                            <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200 dark:border-green-900">
                              <Label className="text-xs text-green-700 dark:text-green-400">Resolution</Label>
                              <p className="text-sm mt-1">{request.resolution_notes}</p>
                              {request.resolved_at && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Resolved: {new Date(request.resolved_at).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

          {/* Complaints */}
          <Collapsible defaultOpen={false}>
            <Card>
              <CardHeader>
                <CollapsibleTrigger className="flex w-full items-center justify-between hover:no-underline">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-primary" />
                      Complaints
                      {policy.complaints && policy.complaints.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {policy.complaints.length}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>Customer complaints and resolutions</CardDescription>
                  </div>
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 ui-open:rotate-180" />
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent>
              {!policy.complaints || policy.complaints.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No complaints</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {policy.complaints.map((complaint) => (
                    <Card key={complaint.id} className="border-l-4 border-l-orange-500">
                      <CardContent className="pt-6 space-y-3">
                      {selectedComplaint?.id === complaint.id ? (
                        // Edit mode
                        <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{complaint.complaint_reference}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant={complaint.complaint_type === 'regulated' ? 'destructive' : 'secondary'}>
                              {complaint.complaint_type}
                            </Badge>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(complaint.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Reason</Label>
                        <p className="text-sm capitalize">{complaint.reason.replace(/_/g, ' ')}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Details</Label>
                        <p className="text-sm">{complaint.details}</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={complaintStatus} onValueChange={setComplaintStatus}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="submitted">Submitted</SelectItem>
                            <SelectItem value="under_review">Under Review</SelectItem>
                            <SelectItem value="escalated">Escalated</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Response / Notes</Label>
                        <Textarea
                          placeholder="Provide response or update notes..."
                          value={complaintResponse}
                          onChange={(e) => setComplaintResponse(e.target.value)}
                          rows={4}
                        />
                      </div>
                      {complaint.complaint_type === 'regulated' && (
                        <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                          <p className="text-sm font-medium text-orange-900">FCA Regulated Complaint</p>
                          <p className="text-xs text-orange-700 mt-1">
                            Must be resolved within 8 weeks or provide a final response letter
                          </p>
                        </div>
                      )}
                          <div className="flex gap-2">
                            <Button onClick={handleUpdateComplaint}>
                              Save Changes
                            </Button>
                            <Button variant="outline" onClick={cancelEditingComplaint}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // View mode
                        <>
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <p className="font-semibold">{complaint.complaint_reference}</p>
                              <div className="flex gap-2 flex-wrap">
                                <Badge variant={complaint.complaint_type === 'regulated' ? 'destructive' : 'secondary'}>
                                  {complaint.complaint_type}
                                </Badge>
                                {complaint.classification && (
                                  <Badge variant={complaint.classification === 'regulatory' ? 'destructive' : 'secondary'}>
                                    {complaint.classification === 'regulatory' ? 'Regulatory' : 'Non-Regulatory'}
                                  </Badge>
                                )}
                                <Badge variant={complaint.status === 'resolved' || complaint.status === 'closed' ? 'default' : 'outline'}>
                                  {complaint.status.replace(/_/g, ' ')}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <p className="text-xs text-muted-foreground">
                                {new Date(complaint.created_at).toLocaleDateString()}
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditingComplaint(complaint)}
                              >
                                Update
                              </Button>
                            </div>
                          </div>
                          <Separator />
                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs text-muted-foreground">Reason</Label>
                              <p className="text-sm font-medium capitalize">{complaint.reason.replace(/_/g, ' ')}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Details</Label>
                              <p className="text-sm">{complaint.details}</p>
                            </div>
                          </div>
                          {complaint.response && (
                            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-900">
                              <Label className="text-xs text-blue-700 dark:text-blue-400">Response</Label>
                              <p className="text-sm mt-1">{complaint.response}</p>
                              {complaint.response_date && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Responded: {new Date(complaint.response_date).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          )}
                          {complaint.reviewed_at && (
                            <div className="text-xs text-muted-foreground">
                              Last reviewed: {new Date(complaint.reviewed_at).toLocaleString()}
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                  ))}
                </div>
              )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-6">
          <PolicyPaymentHistory 
            policyId={policy.id}
            promotionalPremium={policy.promotional_premium}
            originalPremium={policy.original_premium}
            promoName={policy.promotion?.promo_name}
            promoType={policy.promotion?.promo_type}
            discountValue={policy.promotion?.discount_value}
            freeMonths={policy.promotion?.free_months}
            policyStartDate={policy.start_date}
          />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <PolicyDocumentsCard 
            policyId={policy.id} 
            customerEmail={policy.customer_email || policy.profile?.email || ""} 
          />
        </TabsContent>
      </Tabs>

      {policy && (
        <PolicyEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          policy={policy}
          products={products}
          onSuccess={() => {
            fetchPolicyDetails();
          }}
        />
      )}
    </div>
  );
}
