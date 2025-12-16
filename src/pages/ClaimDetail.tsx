import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { AlertCircle, CheckCircle, Clock, XCircle, ArrowLeft, FileText, Shield, PlayCircle, MessageSquare, User, Download, ChevronDown, Camera, Send, Package, Wrench, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/hooks/useTranslation";
import ClaimFulfillmentFlow from "@/components/ClaimFulfillmentFlow";
import { PolicyCommunications } from "@/components/PolicyCommunications";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatStatus } from "@/lib/utils";

// Claim Progress Tracker Component
const ClaimProgressTracker = ({ claim }: { claim: Claim }) => {
  const stages = [
    { 
      id: 'submitted', 
      label: 'Submitted', 
      icon: Send,
      statuses: ['notified']
    },
    { 
      id: 'review', 
      label: 'Under Review', 
      icon: Clock,
      statuses: ['notified', 'referred', 'referred_pending_info', 'referred_info_received']
    },
    { 
      id: 'decision', 
      label: 'Decision Made', 
      icon: CheckCircle2,
      statuses: ['accepted', 'rejected']
    },
    { 
      id: 'fulfillment', 
      label: 'Fulfillment', 
      icon: Wrench,
      statuses: ['excess_due', 'excess_paid_fulfillment_pending', 'fulfillment_inspection_booked', 'estimate_received', 'fulfillment_outcome', 'inbound_logistics', 'repair', 'outbound_logistics']
    },
    { 
      id: 'complete', 
      label: 'Complete', 
      icon: CheckCircle,
      statuses: ['closed']
    }
  ];

  const getCurrentStageIndex = () => {
    // Stage 4: Closed/Complete
    if (claim.status === 'closed') return 4;
    
    // Stage 3: Fulfillment (acceptance and fulfillment status)
    if ((claim.decision === 'accepted' || claim.status === 'accepted') && [
      'excess_due', 
      'excess_paid_fulfillment_pending', 
      'fulfillment_inspection_booked', 
      'estimate_received', 
      'fulfillment_outcome',
      'inbound_logistics', 
      'repair', 
      'outbound_logistics'
    ].includes(claim.status)) {
      return 3;
    }
    
    // Stage 2: Decision Made (check both decision field AND status field)
    if (
      claim.decision === 'accepted' || 
      claim.decision === 'rejected' || 
      claim.status === 'accepted' || 
      claim.status === 'rejected'
    ) {
      return 2;
    }
    
    // Stage 1: Under Review (notified, referred states)
    if (['notified', 'referred', 'referred_pending_info', 'referred_info_received'].includes(claim.status)) {
      return 1;
    }
    
    // Stage 0: Submitted (initial state)
    return 0;
  };

  const currentStage = getCurrentStageIndex();
  
  // Debug: Log claim progress state for troubleshooting
  console.log('Claim Progress Tracker:', {
    status: claim.status,
    decision: claim.decision,
    currentStage,
    stageName: stages[currentStage]?.label
  });

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="text-lg">Claim Progress</CardTitle>
        <CardDescription>Track your claim journey from submission to completion</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute top-6 left-0 right-0 h-1 bg-muted">
            <div 
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${(currentStage / (stages.length - 1)) * 100}%` }}
            />
          </div>

          {/* Stages */}
          <div className="relative flex justify-between">
            {stages.map((stage, index) => {
              const Icon = stage.icon;
              const isCompleted = index < currentStage;
              const isCurrent = index === currentStage;
              const isRejected = claim.decision === 'rejected' && stage.id === 'decision';

              return (
                <div key={stage.id} className="flex flex-col items-center" style={{ flex: 1 }}>
                  <div 
                    className={`
                      w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all z-10
                      ${isCompleted ? 'bg-primary border-primary text-primary-foreground' : ''}
                      ${isCurrent ? 'bg-background border-primary ring-4 ring-primary/20 scale-110' : ''}
                      ${!isCompleted && !isCurrent ? 'bg-muted border-muted-foreground/20 text-muted-foreground' : ''}
                      ${isRejected ? 'bg-destructive border-destructive text-destructive-foreground' : ''}
                    `}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className={`
                    mt-2 text-xs font-medium text-center max-w-[80px]
                    ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}
                  `}>
                    {stage.label}
                  </p>
                  {isCurrent && (
                    <Badge variant="secondary" className="mt-1 text-xs">Current</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Photo thumbnail component with signed URL
const PhotoThumbnail = ({ doc }: { doc: Document }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadImage = async () => {
      try {
        const { data, error } = await supabase.storage
          .from("claim-documents")
          .download(doc.file_path);
        
        if (error) throw error;
        
        const url = URL.createObjectURL(data);
        setImageUrl(url);
      } catch (error) {
        console.error("Error loading image:", error);
      }
    };

    loadImage();

    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [doc.file_path]);

  const handleView = async () => {
    try {
      const { data, error } = await supabase.storage
        .from("claim-documents")
        .download(doc.file_path);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      window.open(url, '_blank');
    } catch (error) {
      console.error("Error viewing photo:", error);
      toast.error("Failed to open photo");
    }
  };

  return (
    <div
      className="relative aspect-square rounded-lg border overflow-hidden bg-muted hover:ring-2 hover:ring-primary transition-all cursor-pointer group"
      onClick={handleView}
    >
      {imageUrl ? (
        <img 
          src={imageUrl}
          alt={doc.file_name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <FileText className="h-8 w-8 text-muted-foreground animate-pulse" />
        </div>
      )}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <span className="text-white text-sm font-medium">View</span>
      </div>
    </div>
  );
};

interface Claim {
  id: string;
  claim_number: string;
  claim_type: "breakdown" | "damage" | "theft";
  description: string;
  status: string;
  decision: string | null;
  decision_reason: string | null;
  submitted_date: string;
  has_receipt: boolean;
  product_condition?: string;
  policies: {
    policy_number: string;
    products: {
      name: string;
      type: string;
      excess_1: number;
    };
  };
}

interface ServiceRequest {
  id: string;
  request_reference: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
}

interface ServiceRequestMessage {
  id: string;
  content: string;
  role: string;
  created_at: string;
}

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  uploaded_date: string;
  document_type: string;
}

export default function ClaimDetail() {
  const { claimId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFulfillment, setShowFulfillment] = useState(false);
  const [hasFulfillmentData, setHasFulfillmentData] = useState(false);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [serviceMessages, setServiceMessages] = useState<Record<string, ServiceRequestMessage[]>>({});
  const [serviceDocuments, setServiceDocuments] = useState<Record<string, Document[]>>({});
  const [claimDocuments, setClaimDocuments] = useState<Document[]>([]);

  // Helper function to capitalize and format status strings
  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getStatusConfig = (status: string, hasDocuments: boolean) => {
    // If status is notified and no documents uploaded, show "Documents Requested"
    if (status === "notified" && !hasDocuments) {
      return { label: "Documents Requested", color: "bg-amber-500", icon: AlertCircle };
    }
    
    const config: Record<string, { label: string; color: string; icon: any }> = {
      notified: { label: "Under Review", color: "bg-blue-500", icon: Clock },
      accepted: { label: "Accepted", color: "bg-success", icon: CheckCircle },
      approved: { label: "Approved", color: "bg-success", icon: CheckCircle },
      rejected: { label: "Rejected", color: "bg-destructive", icon: XCircle },
      paid: { label: "Paid", color: "bg-success", icon: CheckCircle },
      closed: { label: "Closed", color: "bg-muted", icon: CheckCircle },
      referred: { label: "Referred", color: "bg-amber-500", icon: AlertCircle },
      referred_pending_info: { label: "Pending Information", color: "bg-amber-500", icon: AlertCircle },
      referred_info_received: { label: "Information Received", color: "bg-blue-500", icon: Clock },
      excess_due: { label: "Excess Payment Due", color: "bg-orange-500", icon: Clock },
      excess_paid_fulfillment_pending: { label: "Processing", color: "bg-blue-500", icon: Clock },
      fulfillment_inspection_booked: { label: "Inspection Booked", color: "bg-blue-500", icon: Clock },
      estimate_received: { label: "Estimate Received", color: "bg-blue-500", icon: Clock },
      fulfillment_outcome: { label: "Fulfillment Complete", color: "bg-success", icon: CheckCircle },
      inbound_logistics: { label: "Device In Transit", color: "bg-blue-500", icon: Clock },
      repair: { label: "Under Repair", color: "bg-blue-500", icon: Clock },
      outbound_logistics: { label: "Being Delivered", color: "bg-blue-500", icon: Clock },
    };
    return config[status] || { label: formatStatus(status), color: "bg-muted", icon: Clock };
  };
  
  const statusConfig = claim ? getStatusConfig(claim.status, claimDocuments.length > 0) : null;

  const decisionConfig = {
    accepted: { label: "Accepted", color: "bg-success", icon: CheckCircle },
    rejected: { label: "Rejected", color: "bg-destructive", icon: XCircle },
    referred: { label: "Referred For Review", color: "bg-amber-500", icon: AlertCircle },
  };

  // Use decision status if available, otherwise fall back to claim status
  const displayStatus = claim?.decision 
    ? decisionConfig[claim.decision as keyof typeof decisionConfig]
    : statusConfig;

  const claimTypeLabels = {
    breakdown: "Breakdown/Malfunction",
    damage: "Accidental Damage",
    theft: "Theft/Loss",
  };

  useEffect(() => {
    if (claimId) {
      fetchClaim();
      fetchServiceRequests();
      fetchClaimDocuments();
      checkExistingFulfillment();

      // Set up realtime subscription for claim updates
      const channel = supabase
        .channel(`claim-${claimId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'claims',
            filter: `id=eq.${claimId}`
          },
          (payload) => {
            console.log('Claim updated:', payload);
            // Refresh claim data when it's updated
            fetchClaim();
            
            // Show toast when decision is made
            const newClaim = payload.new as any;
            if (newClaim.decision === 'approved' && claim?.decision !== 'approved') {
              toast.success("Your claim has been approved! You can now start the fulfillment process.");
            } else if (newClaim.decision === 'declined' && claim?.decision !== 'declined') {
              toast.error("Your claim decision has been updated. Please review the details.");
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [claimId]);

  const checkExistingFulfillment = async () => {
    try {
      const { data, error } = await supabase
        .from("claim_fulfillment")
        .select("id")
        .eq("claim_id", claimId)
        .maybeSingle();

      if (!error && data) {
        setHasFulfillmentData(true);
        setShowFulfillment(true);
      }
    } catch (error) {
      console.error("Error checking fulfillment:", error);
    }
  };

  const fetchClaimDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("claim_id", claimId)
        .order("uploaded_date", { ascending: false });

      if (error) throw error;
      setClaimDocuments(data || []);
    } catch (error) {
      console.error("Error fetching claim documents:", error);
    }
  };

  const fetchServiceRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("service_requests")
        .select("*")
        .eq("claim_id", claimId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setServiceRequests(data || []);

      // Fetch messages and documents for each service request
      for (const request of data || []) {
        // Fetch messages
        const { data: messagesData, error: messagesError } = await supabase
          .from("service_request_messages")
          .select("*")
          .eq("service_request_id", request.id)
          .order("created_at", { ascending: true });

        if (!messagesError) {
          setServiceMessages(prev => ({ ...prev, [request.id]: messagesData || [] }));
        }

        // Fetch documents
        const { data: docsData, error: docsError } = await supabase
          .from("documents")
          .select("*")
          .eq("service_request_id", request.id)
          .order("uploaded_date", { ascending: true });

        if (!docsError) {
          setServiceDocuments(prev => ({ ...prev, [request.id]: docsData || [] }));
        }
      }
    } catch (error) {
      console.error("Error fetching service requests:", error);
    }
  };

  const fetchClaim = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("claims")
        .select(`
          id,
          claim_number,
          claim_type,
          description,
          status,
          decision,
          decision_reason,
          submitted_date,
          has_receipt,
          product_condition,
          policy_id,
          policies!inner (
            id,
            policy_number,
            customer_postcode,
            customer_city,
            products!inner (
              name,
              type,
              excess_1,
              device_categories
            )
          )
        `)
        .eq("id", claimId)
        .single();

      if (error) throw error;
      
      // Fetch covered item to determine actual device category
      const { data: coveredItem } = await supabase
        .from("covered_items")
        .select("product_name")
        .eq("policy_id", data.policy_id)
        .single();
      
      // Add device category based on covered item or product device categories
      let detectedCategory = "";
      
      if (coveredItem) {
        // First try to find the device in the devices table for accurate category
        const { data: deviceMatch } = await supabase
          .from("devices")
          .select("device_category, manufacturer, model_name")
          .or(`model_name.ilike.%${coveredItem.product_name}%`)
          .limit(1)
          .maybeSingle();
        
        if (deviceMatch?.device_category) {
          console.log("Found device category from devices table:", deviceMatch.device_category);
          // Map device categories to repairer specializations
          const categoryMapping: { [key: string]: string } = {
            'TV': 'TVs',
            'Brown Goods': 'TVs',
            'Smart TV': 'TVs',
            'Laptop': 'Laptops',
            'Notebook': 'Laptops',
            'Mobile Phone': 'Mobile Phones',
            'Smartphone': 'Mobile Phones',
            'Tablet': 'Tablets',
            'Camera': 'Cameras',
            'Gaming Console': 'Gaming Consoles',
            'White Goods': 'Home Appliances',
            'Washing Machine': 'Home Appliances',
            'Refrigerator': 'Home Appliances',
          };
          detectedCategory = categoryMapping[deviceMatch.device_category] || deviceMatch.device_category;
        }
        
        // Fallback to keyword-based detection if devices table didn't match
        if (!detectedCategory) {
          const productName = coveredItem.product_name.toLowerCase();
          
          if (productName.includes("laptop") || productName.includes("macbook") || productName.includes("notebook")) {
            detectedCategory = "Laptops";
          } else if (productName.includes("phone") || productName.includes("iphone") || productName.includes("samsung galaxy") || productName.includes("pixel")) {
            detectedCategory = "Mobile Phones";
          } else if (productName.includes("tablet") || productName.includes("ipad")) {
            detectedCategory = "Tablets";
          } else if (
            productName.includes("tv") || 
            productName.includes("television") || 
            productName.includes("bravia") ||
            productName.includes("oled") ||
            productName.includes("qled") ||
            productName.includes("qned") ||
            productName.includes("nanocell") ||
            productName.includes("x95k") ||
            productName.includes("x90") ||
            productName.includes("a80") ||
            productName.includes("c1") ||
            productName.includes("c2") ||
            productName.includes("g2")
          ) {
            detectedCategory = "TVs";
          } else if (productName.includes("camera")) {
            detectedCategory = "Cameras";
          } else if (productName.includes("headphone") || productName.includes("earphone")) {
            detectedCategory = "Headphones";
          } else if (productName.includes("watch")) {
            detectedCategory = "Watches";
          } else if (productName.includes("speaker")) {
            detectedCategory = "Speakers";
          } else if (productName.includes("console") || productName.includes("playstation") || productName.includes("xbox") || productName.includes("nintendo")) {
            detectedCategory = "Gaming Consoles";
          } else if (productName.includes("washing") || productName.includes("dishwasher") || productName.includes("fridge") || productName.includes("oven")) {
            detectedCategory = "Home Appliances";
          }
        }
      }
      
      // Fallback to product device_categories if no category detected
      if (!detectedCategory && data.policies?.products?.device_categories?.length > 0) {
        detectedCategory = data.policies.products.device_categories[0];
      }
      
      // Add detected values to claim data
      (data as any).detectedDeviceCategory = detectedCategory;
      (data as any).customerPostcode = data.policies?.customer_postcode || "";
      (data as any).customerCity = data.policies?.customer_city || "";
      
      console.log("Detected device category:", detectedCategory);
      console.log("Customer coverage area:", data.policies?.customer_postcode, data.policies?.customer_city);
      
      setClaim(data);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching claim:", error);
      }
      toast.error("Failed to load claim details");
      navigate("/claims");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{t("claimDetails")}</h1>
          <p className="text-muted-foreground mt-1">{t("loadingClaimInformation")}</p>
        </div>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link to="/customer/claims">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("backToClaims")}
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">{t("claimNotFound")}</h1>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t("claimNotFoundDescription")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const StatusIcon = displayStatus?.icon || Clock;

  // Scroll to fulfillment section
  const scrollToFulfillment = () => {
    const fulfillmentSection = document.getElementById('fulfillment-section');
    if (fulfillmentSection) {
      fulfillmentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Determine next action based on claim status
  const getNextAction = () => {
    if (claim.decision === "accepted" || claim.status === "accepted") {
      if (!showFulfillment) {
        return {
          title: "Start Fulfillment",
          description: claim.policies.products.excess_1 > 0 
            ? `Pay excess of €${claim.policies.products.excess_1} to proceed`
            : "Begin the fulfillment process for your claim",
          action: () => {
            setShowFulfillment(true);
            setTimeout(scrollToFulfillment, 100);
          },
          urgent: true,
          buttonLabel: "Start Now"
        };
      } else {
        return {
          title: "Fulfillment In Progress",
          description: "Continue with your claim fulfillment process below",
          action: scrollToFulfillment,
          urgent: true,
          buttonLabel: "Continue"
        };
      }
    }
    if (claim.status === "notified") {
      return {
        title: "Under Review",
        description: "Your claim is being processed by our team",
        urgent: false
      };
    }
    if (claim.decision === "referred") {
      return {
        title: "Additional Information Required",
        description: "Please check service requests for required documents",
        urgent: true
      };
    }
    return null;
  };

  const nextAction = getNextAction();

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      {/* Back Button */}
      <Link to="/customer/claims">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("backToClaims")}
        </Button>
      </Link>

      {/* Claim Progress Tracker */}
      <ClaimProgressTracker claim={claim} />

      {/* Claim Accepted Message */}
      {(claim.decision === "accepted" || claim.status === "accepted") && (
        <Alert className="border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-md">
          <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          <AlertDescription className="ml-2">
            <p className="font-bold text-lg text-emerald-800 dark:text-emerald-200">
              Great news! Your claim has been accepted.
            </p>
            <p className="text-sm mt-1 text-emerald-700 dark:text-emerald-300">
              {!showFulfillment 
                ? "Scroll down to the 'Claim Fulfillment' section and click to expand it to continue."
                : "You can now proceed with the fulfillment steps below."
              }
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content - Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Claim Summary Card */}
          <Card className="border-2">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl mb-2">{claim.claim_number}</CardTitle>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-4 w-4" />
                      {claimTypeLabels[claim.claim_type]}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {format(new Date(claim.submitted_date), "PPP")}
                    </div>
                  </div>
                </div>
                <Badge 
                  variant="secondary"
                  className={`${displayStatus?.color} text-white text-sm px-3 py-1`}
                >
                  {displayStatus?.label || formatStatus(claim.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Show decision reason prominently if referred */}
              {claim.decision === "referred" && claim.decision_reason && (
                <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <AlertDescription>
                    <p className="font-semibold text-amber-900 dark:text-amber-200 mb-1">Referral Reason (AI Assessment):</p>
                    <p className="text-sm text-amber-800 dark:text-amber-300">{claim.decision_reason}</p>
                  </AlertDescription>
                </Alert>
              )}
              
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                <p className="text-sm leading-relaxed">{claim.description}</p>
              </div>
              {claim.product_condition && claim.status !== "notified" && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Additional Notes</p>
                    <p className="text-sm">{claim.product_condition}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Device Photos */}
          {claimDocuments.filter(doc => doc.document_type === 'photo').length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Camera className="h-5 w-5" />
                  Device Photos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {claimDocuments
                    .filter(doc => doc.document_type === 'photo')
                    .map((doc) => (
                      <PhotoThumbnail key={doc.id} doc={doc} />
                    ))}
                </div>
                
                {/* AI Analysis Feedback for Photos */}
                {claimDocuments
                  .filter(doc => doc.document_type === 'photo' && (doc as any).metadata?.ai_analysis)
                  .map((doc) => {
                    const metadata = (doc as any).metadata;
                    return (
                      <div key={`ai-${doc.id}`} className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start gap-2 mb-2">
                          <Camera className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">AI Analysis - {doc.file_name}</p>
                            <p className="text-sm text-blue-800 dark:text-blue-200">{metadata.ai_analysis.assessment}</p>
                            {metadata.ai_analysis.findings && metadata.ai_analysis.findings.length > 0 && (
                              <ul className="mt-2 text-sm text-blue-700 dark:text-blue-300 list-disc list-inside space-y-1">
                                {metadata.ai_analysis.findings.map((finding: string, idx: number) => (
                                  <li key={idx}>{finding}</li>
                                ))}
                              </ul>
                            )}
                            {metadata.ai_analysis.confidence && (
                              <div className="mt-2">
                                <Badge variant="secondary" className="text-xs">
                                  Confidence: {Math.round((metadata.ai_analysis.confidence || 0) * 100)}%
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          )}

          {/* Collapsible Sections */}
          <Collapsible defaultOpen={false}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Additional Claim Details
                    </div>
                    <ChevronDown className="h-5 w-5 transition-transform ui-open:rotate-180" />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("claimNumber")}</p>
                      <p className="font-medium">{claim.claim_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("claimType")}</p>
                      <p className="font-medium">{claimTypeLabels[claim.claim_type]}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("submittedDate")}</p>
                      <p className="font-medium">
                        {format(new Date(claim.submitted_date), "PPP")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t("status")}</p>
                      <Badge 
                        variant="secondary"
                        className={`${displayStatus?.color} text-white`}
                      >
                        {displayStatus?.label || formatStatus(claim.status)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Decision Information */}
          {claim.decision && (
            <Collapsible defaultOpen={false}>
              <Card>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardTitle className="flex items-center justify-between">
                      <span>{t("decision")}</span>
                      <ChevronDown className="h-5 w-5 transition-transform ui-open:rotate-180" />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">{t("decisionStatus")}</p>
                      <Badge variant={decisionConfig[claim.decision as keyof typeof decisionConfig]?.color as any}>
                        {decisionConfig[claim.decision as keyof typeof decisionConfig]?.label || formatStatus(claim.decision || '')}
                      </Badge>
                    </div>
                    {claim.decision_reason && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">{t("decisionReason")}</p>
                          <div className="text-sm bg-muted/30 p-4 rounded-lg whitespace-pre-wrap">
                            {claim.decision_reason}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Receipt/POP and Supporting Documents */}
          <Collapsible defaultOpen={claimDocuments.filter(doc => doc.document_type === 'receipt').length > 0}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {t("supportingDocuments")}
                    </span>
                    <ChevronDown className="h-5 w-5 transition-transform ui-open:rotate-180" />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  {/* Receipt Status */}
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">{t("receiptStatus")}</p>
                    {claim.has_receipt ? (
                      <Badge variant="default" className="bg-success">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        {t("provided")}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <XCircle className="mr-1 h-3 w-3" />
                        {t("notProvided")}
                      </Badge>
                    )}
                  </div>

                  {/* Receipts/POP Documents */}
                  {claimDocuments.filter(doc => doc.document_type === 'receipt').length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-semibold mb-3 text-primary">Proof of Purchase</p>
                        <div className="grid grid-cols-1 gap-3">
                          {claimDocuments
                            .filter(doc => doc.document_type === 'receipt')
                            .map((doc) => (
                              <div
                                key={doc.id}
                                className="flex items-center gap-3 p-4 rounded-lg border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors"
                              >
                                <div className="p-2 rounded-lg bg-primary/10">
                                  <FileText className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{doc.file_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(doc.uploaded_date), "PPP")}
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      const { data, error } = await supabase.storage
                                        .from("claim-documents")
                                        .download(doc.file_path);
                                      
                                      if (error) throw error;
                                      
                                      const url = URL.createObjectURL(data);
                                      const a = document.createElement("a");
                                      a.href = url;
                                      a.download = doc.file_name;
                                      document.body.appendChild(a);
                                      a.click();
                                      document.body.removeChild(a);
                                      URL.revokeObjectURL(url);
                                      toast.success("Document downloaded");
                                    } catch (error) {
                                      console.error("Error downloading file:", error);
                                      toast.error("Failed to download file");
                                    }
                                  }}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Other Documents */}
                  {claimDocuments.filter(doc => doc.document_type !== 'photo' && doc.document_type !== 'receipt').length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium mb-3">Other Documents</p>
                        <div className="space-y-2">
                          {claimDocuments
                            .filter(doc => doc.document_type !== 'photo' && doc.document_type !== 'receipt')
                            .map((doc) => (
                              <div
                                key={doc.id}
                                className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                              >
                                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{doc.file_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(doc.uploaded_date), "PPP")}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      const { data, error } = await supabase.storage
                                        .from("claim-documents")
                                        .download(doc.file_path);
                                      
                                      if (error) throw error;
                                      
                                      const url = URL.createObjectURL(data);
                                      const a = document.createElement("a");
                                      a.href = url;
                                      a.download = doc.file_name;
                                      document.body.appendChild(a);
                                      a.click();
                                      document.body.removeChild(a);
                                      URL.revokeObjectURL(url);
                                      toast.success("Document downloaded");
                                    } catch (error) {
                                      console.error("Error downloading file:", error);
                                      toast.error("Failed to download file");
                                    }
                                  }}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Service Requests Section */}
          {serviceRequests.length > 0 && (
            <Collapsible defaultOpen={false}>
              <Card>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <MessageSquare className="h-5 w-5" />
                          Service Requests
                        </CardTitle>
                        <CardDescription>
                          Communication history between agent and customer
                        </CardDescription>
                      </div>
                      <ChevronDown className="h-5 w-5 transition-transform ui-open:rotate-180" />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    {serviceRequests.map((request) => (
                      <div key={request.id} className="border rounded-lg p-4 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{request.reason}</h4>
                              <Badge variant={request.status === "resolved" ? "default" : "secondary"}>
                                {formatStatus(request.status)}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {request.request_reference}
                            </p>
                            <p className="text-sm">{request.details}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Created: {format(new Date(request.created_at), "PPP p")}
                            </p>
                          </div>
                        </div>

                        {/* Messages */}
                        {serviceMessages[request.id] && serviceMessages[request.id].length > 0 && (
                          <div className="mt-4 space-y-3">
                            <Separator />
                            <h5 className="text-sm font-medium">Messages</h5>
                            <ScrollArea className="h-[300px] pr-4">
                              <div className="space-y-3">
                                {serviceMessages[request.id].map((message) => (
                                  <div
                                    key={message.id}
                                    className={`flex gap-2 ${
                                      message.role === "user" ? "justify-end" : "justify-start"
                                    }`}
                                  >
                                    <div
                                      className={`flex gap-2 max-w-[80%] ${
                                        message.role === "user" ? "flex-row-reverse" : "flex-row"
                                      }`}
                                    >
                                      <div
                                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                                          message.role === "user"
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted"
                                        }`}
                                      >
                                        <User className="h-4 w-4" />
                                      </div>
                                      <div className="flex flex-col gap-1">
                                        <div
                                          className={`rounded-lg px-4 py-3 ${
                                            message.role === "user"
                                              ? "bg-primary text-primary-foreground"
                                              : "bg-muted"
                                          }`}
                                        >
                                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                        </div>
                                        {serviceDocuments[request.id]?.length > 0 && (
                                          <div className="flex flex-wrap gap-2 mt-1">
                                            {serviceDocuments[request.id].map((doc) => (
                                              <div
                                                key={doc.id}
                                                className="flex items-center gap-2 text-xs bg-muted px-2 py-1 rounded"
                                              >
                                                <FileText className="h-3 w-3" />
                                                <span className="truncate max-w-[150px]">{doc.file_name}</span>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-auto p-0 hover:bg-transparent"
                                                  onClick={async () => {
                                                    try {
                                                      const { data, error } = await supabase.storage
                                                        .from("service-request-documents")
                                                        .download(doc.file_path);
                                                      
                                                      if (error) throw error;
                                                      
                                                      const url = URL.createObjectURL(data);
                                                      const a = document.createElement("a");
                                                      a.href = url;
                                                      a.download = doc.file_name;
                                                      document.body.appendChild(a);
                                                      a.click();
                                                      document.body.removeChild(a);
                                                      URL.revokeObjectURL(url);
                                                      toast.success("Document downloaded");
                                                    } catch (error) {
                                                      console.error("Error downloading file:", error);
                                                      toast.error("Failed to download file");
                                                    }
                                                  }}
                                                >
                                                  <Download className="h-3 w-3" />
                                                </Button>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        <span className="text-xs text-muted-foreground">
                                          {format(new Date(message.created_at), "p")}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Fulfillment Section */}
          {(claim.decision === "accepted" || claim.decision === "approved") && (
            <Collapsible defaultOpen={showFulfillment} open={showFulfillment ? true : undefined}>
              <Card id="fulfillment-section">
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          Claim Fulfillment
                        </CardTitle>
                        <CardDescription>
                          {claim.policies.products.excess_1 > 0 
                            ? `Pay excess of £${claim.policies.products.excess_1} to start fulfillment`
                            : "Process the fulfillment for this accepted claim"}
                        </CardDescription>
                      </div>
                      <ChevronDown className="h-5 w-5 transition-transform ui-open:rotate-180" />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    {!showFulfillment ? (
                      <Button onClick={() => setShowFulfillment(true)} className="w-full" size="lg">
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Start Fulfillment Process
                      </Button>
                    ) : (
                      <ClaimFulfillmentFlow
                        claimId={claim.id}
                        claimType={claim.claim_type}
                        deviceCategory={(claim as any).detectedDeviceCategory || ""}
                        coverageArea={(claim as any).customerPostcode || (claim as any).customerCity || ""}
                        policyId={(claim.policies as any).id}
                        onComplete={() => {
                          toast.success("Fulfillment completed successfully");
                          fetchClaim();
                        }}
                      />
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {/* Claim Communications */}
          <Collapsible defaultOpen={false}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Communications
                    </span>
                    <ChevronDown className="h-5 w-5 transition-transform ui-open:rotate-180" />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="p-0">
                  <PolicyCommunications 
                    policyId={(claim.policies as any).id} 
                    claimId={claim.id}
                  />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

        {/* Receipt/POP and Supporting Documents */}
        <Collapsible defaultOpen={claimDocuments.filter(doc => doc.document_type === 'receipt').length > 0}>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {t("supportingDocuments")}
                  </span>
                  <ChevronDown className="h-5 w-5 transition-transform ui-open:rotate-180" />
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-6">
                {/* Receipt Status */}
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">{t("receiptStatus")}</p>
                  {claim.has_receipt ? (
                    <Badge variant="default" className="bg-success">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      {t("provided")}
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <XCircle className="mr-1 h-3 w-3" />
                      {t("notProvided")}
                    </Badge>
                  )}
                </div>

                {/* Receipts/POP Documents */}
                {claimDocuments.filter(doc => doc.document_type === 'receipt').length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-semibold mb-3 text-primary">Proof of Purchase</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {claimDocuments
                          .filter(doc => doc.document_type === 'receipt')
                          .map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center gap-3 p-4 rounded-lg border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors"
                            >
                              <div className="p-2 rounded-lg bg-primary/10">
                                <FileText className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{doc.file_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(doc.uploaded_date), "PPP")}
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const { data, error } = await supabase.storage
                                      .from("claim-documents")
                                      .download(doc.file_path);
                                    
                                    if (error) throw error;
                                    
                                    const url = URL.createObjectURL(data);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = doc.file_name;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                    toast.success("Document downloaded");
                                  } catch (error) {
                                    console.error("Error downloading file:", error);
                                    toast.error("Failed to download file");
                                  }
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Other Documents */}
                {claimDocuments.filter(doc => doc.document_type !== 'photo' && doc.document_type !== 'receipt').length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-3">Other Documents</p>
                      <div className="space-y-2">
                        {claimDocuments
                          .filter(doc => doc.document_type !== 'photo' && doc.document_type !== 'receipt')
                          .map((doc) => (
                            <div
                              key={doc.id}
                              className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                              <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{doc.file_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(doc.uploaded_date), "PPP")}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const { data, error } = await supabase.storage
                                      .from("claim-documents")
                                      .download(doc.file_path);
                                    
                                    if (error) throw error;
                                    
                                    const url = URL.createObjectURL(data);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = doc.file_name;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                    toast.success("Document downloaded");
                                  } catch (error) {
                                    console.error("Error downloading file:", error);
                                    toast.error("Failed to download file");
                                  }
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Service Requests Section */}
        {serviceRequests.length > 0 && (
          <Collapsible defaultOpen={false}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Service Requests
                      </CardTitle>
                      <CardDescription>
                        Communication history between agent and customer
                      </CardDescription>
                    </div>
                    <ChevronDown className="h-5 w-5 transition-transform ui-open:rotate-180" />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
              {serviceRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{request.reason}</h4>
                        <Badge variant={request.status === "resolved" ? "default" : "secondary"}>
                          {formatStatus(request.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {request.request_reference}
                      </p>
                      <p className="text-sm">{request.details}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Created: {format(new Date(request.created_at), "PPP p")}
                      </p>
                    </div>
                  </div>

                  {/* Messages */}
                  {serviceMessages[request.id] && serviceMessages[request.id].length > 0 && (
                    <div className="mt-4 space-y-3">
                      <Separator />
                      <h5 className="text-sm font-medium">Messages</h5>
                      <ScrollArea className="h-[300px] pr-4">
                        <div className="space-y-3">
                          {serviceMessages[request.id].map((message) => (
                            <div
                              key={message.id}
                              className={`flex gap-2 ${
                                message.role === "user" ? "justify-end" : "justify-start"
                              }`}
                            >
                              <div
                                className={`flex gap-2 max-w-[80%] ${
                                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                                }`}
                              >
                                <div
                                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                                    message.role === "user"
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-muted"
                                  }`}
                                >
                                  <User className="h-4 w-4" />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <div
                                    className={`rounded-lg px-4 py-3 ${
                                      message.role === "user"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted"
                                    }`}
                                  >
                                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                    
                                    {/* Display documents uploaded with this message */}
                                    {serviceDocuments[request.id]?.filter(doc => {
                                      const timeDiff = Math.abs(
                                        new Date(doc.uploaded_date).getTime() - 
                                        new Date(message.created_at).getTime()
                                      );
                                      return timeDiff < 5000; // Within 5 seconds
                                    }).map((doc) => (
                                      <div
                                        key={doc.id}
                                        className={`mt-2 flex items-center gap-2 p-2 rounded border ${
                                          message.role === "user"
                                            ? "bg-primary-foreground/10 border-primary-foreground/20"
                                            : "bg-background border-border"
                                        }`}
                                      >
                                        <FileText className="h-4 w-4 shrink-0" />
                                        <span className="text-sm flex-1 truncate">{doc.file_name}</span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0"
                                          onClick={async () => {
                                            try {
                                              const { data, error } = await supabase.storage
                                                .from("claim-documents")
                                                .download(doc.file_path);
                                              
                                              if (error) throw error;
                                              
                                              const url = URL.createObjectURL(data);
                                              const a = document.createElement("a");
                                              a.href = url;
                                              a.download = doc.file_name;
                                              document.body.appendChild(a);
                                              a.click();
                                              document.body.removeChild(a);
                                              URL.revokeObjectURL(url);
                                              toast.success("Document downloaded");
                                            } catch (error) {
                                              console.error("Error downloading file:", error);
                                              toast.error("Failed to download file");
                                            }
                                          }}
                                        >
                                          <Download className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(message.created_at), "p")}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              ))}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        </div>

        {/* Right Sidebar (1/3) */}
        <div className="space-y-6">
          {/* Next Action Card */}
          {nextAction && (
            <Card className={`border-2 ${nextAction.urgent ? 'border-primary' : 'border-border'}`}>
              <CardHeader className={nextAction.urgent ? 'bg-primary/5' : 'bg-muted/30'}>
                <CardTitle className="text-lg flex items-center gap-2">
                  {nextAction.urgent && <AlertCircle className="h-5 w-5 text-primary" />}
                  Next Action
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div>
                  <p className="font-semibold mb-2">{nextAction.title}</p>
                  <p className="text-sm text-muted-foreground">{nextAction.description}</p>
                </div>
                {nextAction.action && (
                  <Button onClick={nextAction.action} className="w-full" size="lg">
                    <PlayCircle className="mr-2 h-4 w-4" />
                    {(nextAction as any).buttonLabel || "Start Now"}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Policy Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Policy Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Policy Number</p>
                <p className="font-medium">{claim.policies.policy_number}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Product</p>
                <p className="font-medium text-sm">{claim.policies.products.name}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Excess</p>
                <p className="font-semibold text-lg">£{claim.policies.products.excess_1}</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Claim Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Documents</span>
                <Badge variant="secondary">{claimDocuments.length}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Photos</span>
                <Badge variant="secondary">
                  {claimDocuments.filter(doc => doc.document_type === 'photo').length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Service Requests</span>
                <Badge variant="secondary">{serviceRequests.length}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
