import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, Search, FileText, Eye, MessageSquarePlus, Download, User, Send, Upload, X, CheckCircle2, XCircle, ThumbsUp, ThumbsDown, ChevronDown, MessageCircle, AlertCircle, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useUserPrograms } from "@/hooks/useUserPrograms";
import { formatDistanceToNow } from "date-fns";
import ClaimFulfillmentFlow from "@/components/ClaimFulfillmentFlow";
import { ClaimRejectionDialog } from "@/components/ClaimRejectionDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { PolicyCommunications } from "@/components/PolicyCommunications";
import { RaiseServiceRequestDialog } from "@/components/RaiseServiceRequestDialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import QuoteApprovalCard from "@/components/QuoteApprovalCard";
import RepairerClaimsChat from "@/components/RepairerClaimsChat";
import InspectionDetailsSection from "@/components/InspectionDetailsSection";
import ClaimCostsSummary from "@/components/ClaimCostsSummary";

interface Claim {
  id: string;
  claim_number: string;
  policy_id: string;
  user_id: string;
  claim_type: string;
  description: string;
  status: string;
  decision: string | null;
  decision_reason: string | null;
  submitted_date: string;
  updated_at: string;
  has_receipt: boolean;
  product_condition?: string;
  hasCustomerUpdate?: boolean;
  policies: {
    id: string;
    policy_number: string;
    customer_name: string | null;
    customer_email: string | null;
    customer_phone: string | null;
    product_id: string;
    program_id: string | null;
    products: {
      name: string;
      type: string;
      excess_1: number;
    };
  };
}

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  document_type: string;
  document_subtype?: string;
  uploaded_date: string;
  claim_id?: string;
  metadata?: any; // Allow any type to match database Json type
}

interface MandatoryDocument {
  type: string;
  subtype: string;
  label: string;
  uploaded: boolean;
  documentId?: string;
}

interface ClaimMetrics {
  total: number;
  updated: number;
  approved: number;
  quotesApproval: number;
  outOfSLA: number;
}

interface ClaimSLA {
  id: string;
  claim_status: string;
  sla_hours: number;
  is_active: boolean;
  program_id: string | null;
}

interface ClaimWithSLA extends Claim {
  slaStatus?: 'within' | 'approaching' | 'breached';
  hoursInStatus?: number;
  slaHours?: number;
}

interface RepairCost {
  id: string;
  cost_type: string;
  description: string;
  amount: number;
  created_at: string;
}

interface ServiceRequest {
  id: string;
  request_reference: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
  last_activity_at: string;
  messages?: ServiceRequestMessage[];
  documents?: ServiceRequestDocument[];
}

interface ServiceRequestMessage {
  id: string;
  content: string;
  role: string;
  created_at: string;
  read_by_agent?: boolean;
}

interface ServiceRequestDocument {
  id: string;
  file_name: string;
  file_path: string;
  uploaded_date: string;
  document_type?: string;
  document_subtype?: string;
  service_request_id?: string;
}

export default function RetailClaimsManagement() {
  const { claimId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isSystemAdmin, isClaimsAgent } = useRole();
  const { programIds, loading: programsLoading } = useUserPrograms();
  const [claims, setClaims] = useState<ClaimWithSLA[]>([]);
  const [slaData, setSlaData] = useState<ClaimSLA[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [decision, setDecision] = useState<string>("");
  const [decisionReason, setDecisionReason] = useState<string>("");
  const [showFulfillment, setShowFulfillment] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [repairCosts, setRepairCosts] = useState<RepairCost[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [reanalyzingDocuments, setReanalyzingDocuments] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewImageName, setPreviewImageName] = useState<string>("");
  const [showServiceRequestDialog, setShowServiceRequestDialog] = useState(false);
  const [replyingToRequest, setReplyingToRequest] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState<string>("");
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [sendingReply, setSendingReply] = useState(false);
  const [showDocumentRejectionDialog, setShowDocumentRejectionDialog] = useState(false);
  const [rejectionDocumentId, setRejectionDocumentId] = useState<string | null>(null);
  const [rejectionDocumentType, setRejectionDocumentType] = useState<string>("");
  const [rejectionDocumentSubtype, setRejectionDocumentSubtype] = useState<string>("");
  const [rejectionDocumentLabel, setRejectionDocumentLabel] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [rejectionReasonOther, setRejectionReasonOther] = useState<string>("");
  const [showDocumentTypeDialog, setShowDocumentTypeDialog] = useState(false);
  const [selectedDocumentForMapping, setSelectedDocumentForMapping] = useState<ServiceRequestDocument | null>(null);
  const [selectedMappingDocumentType, setSelectedMappingDocumentType] = useState<string>("");
  const [openServiceRequests, setOpenServiceRequests] = useState<Set<string>>(new Set());
  const [policyDetailsOpen, setPolicyDetailsOpen] = useState(false);
  const [metrics, setMetrics] = useState<ClaimMetrics>({
    total: 0,
    updated: 0,
    approved: 0,
    quotesApproval: 0,
    outOfSLA: 0,
  });
  const [viewMode, setViewMode] = useState<"all" | "active" | "completed" | "quotesApproval">("active");
  const [sortField, setSortField] = useState<string>("submitted_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [activeMetricFilter, setActiveMetricFilter] = useState<null | "outOfSLA" | "updated" | "approved" | "quotesApproval">(null);
  const [claimFulfillment, setClaimFulfillment] = useState<any>(null);
  const [detectedDeviceCategory, setDetectedDeviceCategory] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    console.log("previewImage state changed:", previewImage);
  }, [previewImage]);

  useEffect(() => {
    fetchSLAData();
  }, []);

  const fetchSLAData = async () => {
    try {
      const { data, error } = await supabase
        .from("claims_sla")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;
      setSlaData(data || []);
    } catch (error: any) {
      console.error("Failed to load SLA data:", error);
    }
  };

  const calculateSLAStatus = async (claim: Claim): Promise<ClaimWithSLA> => {
    try {
      // Find applicable SLA for this claim's status
      const applicableSLA = slaData.find(
        sla => sla.claim_status === claim.status && 
        (sla.program_id === null || sla.program_id === claim.policies.program_id)
      );

      if (!applicableSLA) {
        return { ...claim };
      }

      // Get the most recent status history entry for this status
      const { data: statusHistory } = await supabase
        .from("claim_status_history")
        .select("created_at")
        .eq("claim_id", claim.id)
        .eq("status", claim.status as any)
        .order("created_at", { ascending: false })
        .limit(1);

      // Use status history if available, otherwise fall back to submitted_date
      const statusDate = statusHistory && statusHistory.length > 0
        ? new Date(statusHistory[0].created_at)
        : new Date(claim.submitted_date);

      // Calculate hours in current status
      const now = new Date();
      const hoursInStatus = (now.getTime() - statusDate.getTime()) / (1000 * 60 * 60);

      // Determine SLA status
      let slaStatus: 'within' | 'approaching' | 'breached' = 'within';
      if (hoursInStatus > applicableSLA.sla_hours) {
        slaStatus = 'breached';
      } else if (hoursInStatus > applicableSLA.sla_hours * 0.8) {
        slaStatus = 'approaching';
      }

      return {
        ...claim,
        slaStatus,
        hoursInStatus: Math.round(hoursInStatus),
        slaHours: applicableSLA.sla_hours,
      };
    } catch (error) {
      console.error("Error calculating SLA status:", error);
      return { ...claim };
    }
  };

  const fetchClaims = useCallback(async () => {
    console.log("Starting fetchClaims with programIds:", programIds, "claimId from URL:", claimId);
    
    // If accessing a specific claim via URL, fetch it directly without waiting for programs
    if (claimId) {
      setLoading(true);
      try {
        console.log("Fetching specific claim:", claimId);
        const { data: specificClaim, error: specificError } = await supabase
          .from("claims")
          .select(`
            *,
            policies!inner (
              id,
              policy_number,
              customer_name,
              customer_email,
              customer_phone,
              product_id,
              program_id,
              products (
                name,
                type,
                excess_1
              )
            )
          `)
          .eq("id", claimId)
          .maybeSingle();

        if (specificError) {
          console.error("Error fetching specific claim:", specificError);
          toast({
            title: "Error",
            description: "Failed to load claim details",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        if (!specificClaim) {
          console.log("Claim not found:", claimId);
          toast({
            title: "Not Found",
            description: "The claim you're looking for doesn't exist or you don't have access to it.",
            variant: "destructive",
          });
          setLoading(false);
          navigate("/retail/claims");
          return;
        }

        console.log("Loaded specific claim from URL:", specificClaim);
        const claimWithSLA = await calculateSLAStatus(specificClaim);
        setClaims([claimWithSLA]);
        await handleSelectClaim(claimWithSLA);
        setLoading(false);
        return;
      } catch (error) {
        console.error("Error in fetchClaims:", error);
        setLoading(false);
        return;
      }
    }
    
    // For listing claims, wait for programs to load
    if (programsLoading) {
      console.log("Skipping fetchClaims - programs still loading");
      return;
    }

    setLoading(true);
    try {
      // Otherwise, fetch all claims based on program access
      let query = supabase
        .from("claims")
        .select(`
          *,
          policies!inner (
            id,
            policy_number,
            customer_name,
            customer_email,
            customer_phone,
            product_id,
            program_id,
            products (
              name,
              type,
              excess_1
            )
          )
        `);

      // Filter by user's assigned programs - only if programs exist and not accessing specific claim
      if (programIds.length > 0 && !claimId) {
        console.log("Filtering by program IDs:", programIds);
        query.in("policies.program_id", programIds);
      } else if (!claimId) {
        console.log("No program IDs - checking if admin/system admin/claims agent");
        // If no programs assigned, check if user has privileged role
        // Admins, system admins, and claims agents can see all claims
        if (!isAdmin && !isSystemAdmin && !isClaimsAgent) {
          console.log("User has no programs and no privileged role - showing empty list");
          setClaims([]);
          calculateMetrics([]);
          setLoading(false);
          return;
        }
        console.log("User has privileged role - showing all claims");
      }

      // Filter based on view mode
      if (viewMode === "completed") {
        query.eq("status", "closed");
      } else if (viewMode === "active") {
        query.neq("status", "closed");
      } else if (viewMode === "quotesApproval") {
        query.eq("status", "estimate_received");
      }
      // "all" mode: no filter

      const { data, error } = await query.order("submitted_date", { ascending: false });

      if (error) {
        console.error("Claims query error:", error);
        throw error;
      }

      console.log("Fetched claims:", data?.length || 0, "claims");

      // Check for unread customer messages for each claim
      const claimsWithUpdateStatus = await Promise.all(
        (data || []).map(async (claim) => {
          const { data: serviceRequests } = await supabase
            .from("service_requests")
            .select("id")
            .eq("claim_id", claim.id);

          if (serviceRequests && serviceRequests.length > 0) {
            const { data: unreadMessages } = await supabase
              .from("service_request_messages")
              .select("id")
              .in("service_request_id", serviceRequests.map(sr => sr.id))
              .eq("role", "customer")
              .eq("read_by_agent", false)
              .limit(1);

            return {
              ...claim,
              hasCustomerUpdate: unreadMessages && unreadMessages.length > 0
            };
          }
          return { ...claim, hasCustomerUpdate: false };
        })
      );

      // Calculate SLA status for each claim
      const claimsWithSLA = await Promise.all(
        claimsWithUpdateStatus.map(claim => calculateSLAStatus(claim))
      );

      setClaims(claimsWithSLA);
      calculateMetrics(claimsWithSLA);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [programsLoading, programIds, isAdmin, isSystemAdmin, isClaimsAgent, viewMode, slaData, claimId]);

  useEffect(() => {
    console.log("Programs loading state:", programsLoading, "Program IDs:", programIds);
    if (!programsLoading) {
      fetchClaims();
    }
  }, [programsLoading, fetchClaims]);

  // Auto-select claim if claimId is in URL (now handled in fetchClaims)
  // This effect is kept for backwards compatibility but main logic moved to fetchClaims
  useEffect(() => {
    if (claimId && claims.length > 0 && !selectedClaim) {
      const claim = claims.find(c => c.id === claimId);
      if (claim && claim.id !== selectedClaim?.id) {
        handleSelectClaim(claim);
      }
    }
  }, [claimId, claims, selectedClaim]);

  const calculateMetrics = (claimsData: ClaimWithSLA[]) => {
    const metrics = {
      total: claimsData.length,
      updated: claimsData.filter((c) => c.hasCustomerUpdate).length,
      approved: claimsData.filter((c) => c.decision === "approved").length,
      quotesApproval: claimsData.filter((c) => 
        c.status === "estimate_received"
      ).length,
      outOfSLA: claimsData.filter((c) => c.slaStatus === 'breached').length,
    };
    setMetrics(metrics);
  };

  const handleSelectClaim = async (claim: ClaimWithSLA) => {
    setSelectedClaim(claim);
    setDecision(claim.decision || "");
    setDecisionReason(claim.decision_reason || "");
    // Show fulfillment if claim is already accepted
    setShowFulfillment(claim.status === "accepted");
    
    // Fetch covered item to detect device category
    try {
      const { data: coveredItem } = await supabase
        .from("covered_items")
        .select("product_name")
        .eq("policy_id", claim.policy_id)
        .single();

      if (coveredItem?.product_name) {
        let category = "";
        
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
          category = categoryMapping[deviceMatch.device_category] || deviceMatch.device_category;
        }
        
        // Fallback to keyword-based detection if devices table didn't match
        if (!category) {
          const productName = coveredItem.product_name.toLowerCase();
          
          if (productName.includes("laptop") || productName.includes("macbook") || productName.includes("notebook")) {
            category = "Laptops";
          } else if (productName.includes("phone") || productName.includes("iphone") || productName.includes("samsung galaxy") || productName.includes("pixel")) {
            category = "Mobile Phones";
          } else if (productName.includes("tablet") || productName.includes("ipad")) {
            category = "Tablets";
          } else if (
            productName.includes("tv") || 
            productName.includes("television") || 
            productName.includes("bravia") ||
            productName.includes("oled") ||
            productName.includes("qled") ||
            productName.includes("qned") ||
            productName.includes("nanocell") ||
            productName.includes("led tv") ||
            productName.includes("smart display") ||
            productName.includes("x95k") ||
            productName.includes("x90") ||
            productName.includes("a80")
          ) {
            category = "TVs";
          } else if (productName.includes("camera")) {
            category = "Cameras";
          } else if (productName.includes("washing") || productName.includes("dishwasher") || productName.includes("fridge") || productName.includes("oven")) {
            category = "Home Appliances";
          } else if (productName.includes("console") || productName.includes("playstation") || productName.includes("xbox") || productName.includes("nintendo")) {
            category = "Gaming Consoles";
          }
        }
        
        setDetectedDeviceCategory(category);
      }
    } catch (error) {
      console.error("Failed to fetch covered item:", error);
      setDetectedDeviceCategory("");
    }
    
    // Fetch documents for the claim
    await fetchDocuments(claim.id);
    
    // Fetch service requests for the claim
    await fetchServiceRequests(claim.id);
    
    // Always fetch repair costs and fulfillment - let the DB filter
    fetchRepairCosts(claim.id);
    await fetchClaimFulfillment(claim.id);
  };

  const fetchClaimFulfillment = async (claimId: string) => {
    try {
      const { data, error } = await supabase
        .from("claim_fulfillment")
        .select(`
          *,
          repairers (
            name,
            company_name
          )
        `)
        .eq("claim_id", claimId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setClaimFulfillment(data);
    } catch (error: any) {
      console.error("Failed to fetch claim fulfillment:", error);
      setClaimFulfillment(null);
    }
  };

  const fetchDocuments = async (claimId: string) => {
    setLoadingDocuments(true);
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("claim_id", claimId)
        .order("uploaded_date", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error("Failed to load documents:", error);
      toast({
        title: "Error",
        description: "Failed to load claim documents",
        variant: "destructive",
      });
    } finally {
      setLoadingDocuments(false);
    }
  };

  const fetchServiceRequests = async (claimId: string) => {
    try {
      const { data, error } = await supabase
        .from("service_requests")
        .select("*")
        .eq("claim_id", claimId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      console.log("Service requests fetched:", data);

      // Fetch messages and documents for each service request
      const requestsWithData = await Promise.all(
        (data || []).map(async (request) => {
          // Fetch messages
          const { data: messagesData, error: messagesError } = await supabase
            .from("service_request_messages")
            .select("*")
            .eq("service_request_id", request.id)
            .order("created_at", { ascending: true });

          console.log(`Messages for ${request.request_reference}:`, messagesData, messagesError);

          // Fetch documents
          const { data: docsData, error: docsError } = await supabase
            .from("documents")
            .select("id, file_name, file_path, uploaded_date, document_type, document_subtype, service_request_id")
            .eq("service_request_id", request.id)
            .order("uploaded_date", { ascending: true });

          console.log(`Documents for ${request.request_reference}:`, docsData, docsError);

          return {
            ...request,
            messages: messagesData || [],
            documents: docsData || []
          };
        })
      );

      console.log("Final service requests with data:", requestsWithData);
      setServiceRequests(requestsWithData);
    } catch (error: any) {
      console.error("Failed to load service requests:", error);
      toast({
        title: "Error",
        description: "Failed to load service requests",
        variant: "destructive",
      });
    }
  };

  const downloadDocument = async (filePath: string, fileName: string, documentType: string) => {
    try {
      // Try claim-receipts first (most files are stored there)
      let { data, error } = await supabase.storage
        .from("claim-receipts")
        .download(filePath);

      // If not found, try claim-documents
      if (error) {
        const fallbackResult = await supabase.storage
          .from("claim-documents")
          .download(filePath);
        
        if (fallbackResult.error) throw fallbackResult.error;
        data = fallbackResult.data;
      }

      if (!data) throw new Error("No data received");

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const previewImageDocument = async (filePath: string, fileName: string, documentType: string) => {
    try {
      console.log("Attempting to preview:", filePath, "from claim-receipts");
      let { data, error } = await supabase.storage
        .from("claim-receipts")
        .download(filePath);

      // If not found, try claim-documents
      if (error) {
        console.log("Not found in claim-receipts, trying claim-documents");
        const fallbackResult = await supabase.storage
          .from("claim-documents")
          .download(filePath);
        
        if (fallbackResult.error) {
          console.error("Failed in both buckets:", fallbackResult.error);
          throw fallbackResult.error;
        }
        data = fallbackResult.data;
      }

      if (!data) {
        console.error("No data received from download");
        throw new Error("No data received");
      }

      console.log("Creating blob URL from data:", data);
      const url = URL.createObjectURL(data);
      console.log("Setting preview image:", url);
      setPreviewImage(url);
      setPreviewImageName(fileName);
    } catch (error: any) {
      console.error("Error previewing image:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to preview image",
        variant: "destructive",
      });
    }
  };

  const isImageDocument = (fileName: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic'];
    return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  };

  const handleSendReply = async (serviceRequestId: string) => {
    if (!replyMessage.trim() && replyFiles.length === 0) {
      toast({
        title: "Error",
        description: "Please enter a message or attach a file",
        variant: "destructive",
      });
      return;
    }

    setSendingReply(true);
    try {
      // Insert the agent message
      const { error: messageError } = await supabase
        .from("service_request_messages")
        .insert({
          service_request_id: serviceRequestId,
          content: replyMessage.trim(),
          role: "agent",
        });

      if (messageError) throw messageError;

      // Upload files if any
      if (replyFiles.length > 0 && selectedClaim) {
        for (const file of replyFiles) {
          const fileExt = file.name.split(".").pop();
          const fileName = `${crypto.randomUUID()}.${fileExt}`;
          const filePath = `${selectedClaim.user_id}/${selectedClaim.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("claim-documents")
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          // Create document record
          const { error: docError } = await supabase.from("documents").insert({
            user_id: selectedClaim.user_id,
            claim_id: selectedClaim.id,
            service_request_id: serviceRequestId,
            file_name: file.name,
            file_path: filePath,
            document_type: "other",
            file_size: file.size,
          });

          if (docError) throw docError;
        }
      }

      // Update last_activity_at
      await supabase
        .from("service_requests")
        .update({ last_activity_at: new Date().toISOString() })
        .eq("id", serviceRequestId);

      toast({
        title: "Success",
        description: "Reply sent successfully",
      });

      // Refresh service requests
      if (selectedClaim) {
        await fetchServiceRequests(selectedClaim.id);
      }

      // Reset form
      setReplyMessage("");
      setReplyFiles([]);
      setReplyingToRequest(null);
    } catch (error: any) {
      console.error("Error sending reply:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send reply",
        variant: "destructive",
      });
    } finally {
      setSendingReply(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setReplyFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setReplyFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getMandatoryDocuments = (claimType: string): MandatoryDocument[] => {
    const mandatoryDocs: { [key: string]: { type: string; subtype: string; label: string }[] } = {
      breakdown: [
        { type: "receipt", subtype: "receipt", label: "Proof of Purchase / Receipt" },
        { type: "photo", subtype: "other", label: "Photo of Fault/Damage" },
      ],
      damage: [
        { type: "receipt", subtype: "receipt", label: "Proof of Purchase / Receipt" },
        { type: "photo", subtype: "other", label: "Photo of Damage" },
      ],
      theft: [
        { type: "receipt", subtype: "receipt", label: "Proof of Purchase / Receipt" },
        { type: "other", subtype: "other", label: "Police Report" },
      ],
    };

    const required = mandatoryDocs[claimType] || [];
    
    return required.map((doc) => {
      const uploaded = documents.find(
        (d) => d.document_type === doc.type && d.document_subtype === doc.subtype && d.claim_id === selectedClaim?.id
      );
      return {
        ...doc,
        uploaded: !!uploaded,
        documentId: uploaded?.id,
      };
    });
  };

  const handleAcceptClaimDocument = async (documentId: string) => {
    if (!selectedClaim) return;

    try {
      // Document is already linked to claim, just show success
      toast({
        title: "Success",
        description: "Document accepted",
      });

      // Refresh documents
      await fetchDocuments(selectedClaim.id);
    } catch (error: any) {
      console.error("Error accepting document:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept document",
        variant: "destructive",
      });
    }
  };

  const openRejectDocumentDialog = (
    documentId: string,
    docType: string,
    docSubtype: string,
    docLabel: string,
    serviceRequestId?: string
  ) => {
    setRejectionDocumentId(documentId);
    setRejectionDocumentType(docType);
    setRejectionDocumentSubtype(docSubtype);
    setRejectionDocumentLabel(docLabel);
    setRejectionReason("");
    setRejectionReasonOther("");
    setShowDocumentRejectionDialog(true);
    // Store service request ID if provided for SR-specific rejections
    if (serviceRequestId) {
      (window as any).__rejectionServiceRequestId = serviceRequestId;
    } else {
      delete (window as any).__rejectionServiceRequestId;
    }
  };

  const handleRejectClaimDocument = async () => {
    if (!selectedClaim || !rejectionDocumentId) return;

    if (!rejectionReason) {
      toast({
        title: "Error",
        description: "Please select a rejection reason",
        variant: "destructive",
      });
      return;
    }

    if (rejectionReason === "other" && !rejectionReasonOther.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if this is a service request rejection
      const serviceRequestId = (window as any).__rejectionServiceRequestId;

      if (serviceRequestId) {
        // Handle service request document rejection
        await handleRejectDocument(serviceRequestId, rejectionDocumentId);
      } else {
        // Handle claim document rejection
        // Delete the document
        const { error: deleteError } = await supabase
          .from("documents")
          .delete()
          .eq("id", rejectionDocumentId);

        if (deleteError) throw deleteError;

        // Create service request with rejection reason
        const reasonText = rejectionReason === "other" 
          ? rejectionReasonOther 
          : rejectionReason === "not_clear" 
            ? "Picture not clear"
            : "Wrong product";

        const { error: srError } = await supabase.from("service_requests").insert({
          claim_id: selectedClaim.id,
          policy_id: selectedClaim.policy_id,
          customer_name: selectedClaim.policies.customer_name || "Customer",
          customer_email: selectedClaim.policies.customer_email || "",
          reason: "Document rejected",
          details: `Your ${rejectionDocumentLabel} was rejected. Reason: ${reasonText}. Please upload a new document via the customer portal.`,
          status: "open",
        });

        if (srError) throw srError;

        toast({
          title: "Success",
          description: "Document rejected and customer notified",
        });

        // Close dialog and refresh
        setShowDocumentRejectionDialog(false);
        await fetchDocuments(selectedClaim.id);
        await fetchServiceRequests(selectedClaim.id);
      }
    } catch (error: any) {
      console.error("Error rejecting document:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject document",
        variant: "destructive",
      });
    }
  };

  const handleRequestMissingDocument = async (docType: string, docSubtype: string, docLabel: string) => {
    if (!selectedClaim) return;

    try {
      const { error } = await supabase.from("service_requests").insert({
        claim_id: selectedClaim.id,
        policy_id: selectedClaim.policy_id,
        customer_name: selectedClaim.policies.customer_name || "Customer",
        customer_email: selectedClaim.policies.customer_email || "",
        reason: "Missing document",
        details: `Please upload the following missing document: ${docLabel}. You can upload this via the customer portal where you made the claim.`,
        status: "open",
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Service request created for missing document",
      });

      // Refresh service requests
      if (selectedClaim) {
        await fetchServiceRequests(selectedClaim.id);
      }
    } catch (error: any) {
      console.error("Error creating service request:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create service request",
        variant: "destructive",
      });
    }
  };

  const handleAcceptDocument = async (
    serviceRequestId: string,
    documentId: string,
    docType: "policy" | "receipt" | "photo" | "other",
    docSubtype: "ipid" | "terms_conditions" | "policy_schedule" | "receipt" | "other"
  ) => {
    if (!selectedClaim) return;

    try {
      // Update the document to link it to the claim with proper type/subtype
      const { error: updateError } = await supabase
        .from("documents")
        .update({
          claim_id: selectedClaim.id,
          document_type: docType,
          document_subtype: docSubtype,
        })
        .eq("id", documentId);

      if (updateError) throw updateError;

      // Mark service request as resolved
      const { error: srError } = await supabase
        .from("service_requests")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
          resolution_notes: "Document accepted and linked to claim",
        })
        .eq("id", serviceRequestId);

      if (srError) throw srError;

      toast({
        title: "Success",
        description: "Document accepted and linked to claim",
      });

      // Refresh documents and service requests
      await fetchDocuments(selectedClaim.id);
      await fetchServiceRequests(selectedClaim.id);
    } catch (error: any) {
      console.error("Error accepting document:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to accept document",
        variant: "destructive",
      });
    }
  };

  const openDocumentTypeDialog = (document: ServiceRequestDocument) => {
    setSelectedDocumentForMapping(document);
    setSelectedMappingDocumentType("");
    setShowDocumentTypeDialog(true);
  };

  const handleMapDocumentToType = async () => {
    if (!selectedDocumentForMapping || !selectedMappingDocumentType || !selectedClaim) {
      toast({
        title: "Error",
        description: "Please select a document type",
        variant: "destructive",
      });
      return;
    }

    const mandatoryDocs = getMandatoryDocuments(selectedClaim.claim_type);
    const mandatoryDoc = mandatoryDocs.find(doc => doc.type === selectedMappingDocumentType);

    if (!mandatoryDoc) {
      toast({
        title: "Error",
        description: "Invalid document type selected",
        variant: "destructive",
      });
      return;
    }

    await handleAcceptDocument(
      selectedDocumentForMapping.service_request_id!,
      selectedDocumentForMapping.id,
      mandatoryDoc.type as "policy" | "receipt" | "photo" | "other",
      mandatoryDoc.subtype as "ipid" | "terms_conditions" | "policy_schedule" | "receipt" | "other"
    );

    setShowDocumentTypeDialog(false);
    setSelectedDocumentForMapping(null);
  };

  const toggleServiceRequest = async (requestId: string) => {
    const newOpenSet = new Set(openServiceRequests);
    
    if (newOpenSet.has(requestId)) {
      newOpenSet.delete(requestId);
    } else {
      newOpenSet.add(requestId);
      
      // Mark messages as read when opening
      const request = serviceRequests.find(sr => sr.id === requestId);
      if (request?.messages) {
        const unreadMessageIds = request.messages
          .filter(msg => msg.role === "customer" && !(msg as any).read_by_agent)
          .map(msg => msg.id);
        
        if (unreadMessageIds.length > 0) {
          await supabase
            .from("service_request_messages")
            .update({ read_by_agent: true })
            .in("id", unreadMessageIds);
          
          // Refresh service requests to update UI
          await fetchServiceRequests(selectedClaim!.id);
        }
      }
    }
    
    setOpenServiceRequests(newOpenSet);
  };

  const getUnreadCount = (request: ServiceRequest): number => {
    if (!request.messages) return 0;
    return request.messages.filter(msg => 
      msg.role === "customer" && !(msg as any).read_by_agent
    ).length;
  };

  const handleRejectDocument = async (serviceRequestId: string, documentId: string) => {
    if (!selectedClaim || !rejectionDocumentId) return;

    if (!rejectionReason) {
      toast({
        title: "Error",
        description: "Please select a rejection reason",
        variant: "destructive",
      });
      return;
    }

    if (rejectionReason === "other" && !rejectionReasonOther.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason",
        variant: "destructive",
      });
      return;
    }

    try {
      // Delete the document
      const { error: deleteError } = await supabase
        .from("documents")
        .delete()
        .eq("id", documentId);

      if (deleteError) throw deleteError;

      // Create rejection message with reason
      const reasonText = rejectionReason === "other" 
        ? rejectionReasonOther 
        : rejectionReason === "not_clear" 
          ? "Picture not clear"
          : "Wrong product";

      // Add a message to the service request
      const { error: messageError } = await supabase
        .from("service_request_messages")
        .insert({
          service_request_id: serviceRequestId,
          content: `The uploaded document was rejected. Reason: ${reasonText}. Please upload a new document.`,
          role: "agent",
        });

      if (messageError) throw messageError;

      toast({
        title: "Success",
        description: "Document rejected. Customer notified to reupload.",
      });

      // Close dialog and refresh
      setShowDocumentRejectionDialog(false);
      await fetchServiceRequests(selectedClaim.id);
    } catch (error: any) {
      console.error("Error rejecting document:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject document",
        variant: "destructive",
      });
    }
  };

  const fetchRepairCosts = async (claimId: string) => {
    try {
      const { data, error } = await supabase
        .from("repair_costs")
        .select("*")
        .eq("claim_id", claimId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRepairCosts(data || []);
    } catch (error: any) {
      console.error("Failed to load repair costs:", error);
    }
  };

  const handleReopenClaim = async (claim: Claim) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("claims")
        .update({
          decision: "referred",
          status: "referred",
        })
        .eq("id", claim.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Claim reopened and moved to referred queue",
      });

      // Refresh the specific claim to show decision section
      const { data: updatedClaim, error: fetchError } = await supabase
        .from("claims")
        .select(`
          id,
          claim_number,
          policy_id,
          user_id,
          claim_type,
          description,
          status,
          decision,
          decision_reason,
          submitted_date,
          updated_at,
          has_receipt,
          product_condition,
          policies!inner (
            id,
            policy_number,
            customer_name,
            customer_email,
            customer_phone,
            product_id,
            program_id,
            products!inner (
              name,
              type,
              excess_1
            )
          )
        `)
        .eq("id", claim.id)
        .single();

      if (!fetchError && updatedClaim) {
        setSelectedClaim(updatedClaim as Claim);
      }

      // Refresh claims list
      fetchClaims();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reopen claim",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleBackToList = () => {
    setSelectedClaim(null);
    setDecision("");
    setDecisionReason("");
    setShowFulfillment(false);
    setRepairCosts([]);
    setDocuments([]);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getStatusBadge = (status: string, hasDocuments?: boolean) => {
    // If status is notified and no documents, show "Documents Requested"
    if (status === "notified" && hasDocuments === false) {
      return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800">Documents Requested</Badge>;
    }
    
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      notified: { label: "Under Review", variant: "outline" },
      accepted: { label: "Accepted", variant: "default" },
      rejected: { label: "Rejected", variant: "destructive" },
      referred: { label: "Referred", variant: "secondary" },
      referred_pending_info: { label: "Referred - Info Requested", variant: "secondary" },
      referred_info_received: { label: "Referred - Info Received", variant: "secondary" },
      excess_due: { label: "Excess Due", variant: "outline" },
      excess_paid_fulfillment_pending: { label: "Excess Paid - Fulfillment Pending", variant: "outline" },
      fulfillment_inspection_booked: { label: "Fulfillment Inspection Booked", variant: "outline" },
      estimate_received: { label: "Estimate Received", variant: "outline" },
      fulfillment_outcome: { label: "Fulfillment Outcome", variant: "outline" },
      inbound_logistics: { label: "Inbound Logistics", variant: "outline" },
      repair: { label: "Repair", variant: "outline" },
      outbound_logistics: { label: "Outbound Logistics", variant: "outline" },
      closed: { label: "Closed", variant: "default" },
    };

    const config = statusConfig[status] || { label: status, variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredClaims = claims.filter((claim) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      claim.claim_number.toLowerCase().includes(searchLower) ||
      claim.policies.policy_number.toLowerCase().includes(searchLower) ||
      claim.policies.customer_name?.toLowerCase().includes(searchLower) ||
      claim.policies.customer_email?.toLowerCase().includes(searchLower)
    );

    if (!matchesSearch) return false;

    // Apply metric filter
    if (activeMetricFilter === "outOfSLA") {
      return claim.slaStatus === "breached";
    } else if (activeMetricFilter === "updated") {
      // Claims updated in last 24 hours
      const dayAgo = new Date();
      dayAgo.setDate(dayAgo.getDate() - 1);
      return new Date(claim.updated_at) > dayAgo;
    } else if (activeMetricFilter === "approved") {
      return claim.decision === "approved";
    } else if (activeMetricFilter === "quotesApproval") {
      return claim.status === "estimate_received";
    }

    return true;
  });

  const sortedClaims = [...filteredClaims].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case "claim_number":
        aValue = a.claim_number;
        bValue = b.claim_number;
        break;
      case "policy_number":
        aValue = a.policies.policy_number;
        bValue = b.policies.policy_number;
        break;
      case "customer_name":
        aValue = a.policies.customer_name || "";
        bValue = b.policies.customer_name || "";
        break;
      case "claim_type":
        aValue = a.claim_type;
        bValue = b.claim_type;
        break;
      case "submitted_date":
        aValue = new Date(a.submitted_date).getTime();
        bValue = new Date(b.submitted_date).getTime();
        break;
      case "status":
        aValue = a.status;
        bValue = b.status;
        break;
      case "decision":
        aValue = a.decision || "";
        bValue = b.decision || "";
        break;
      default:
        aValue = a.submitted_date;
        bValue = b.submitted_date;
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const handleUpdateClaim = async () => {
    if (!selectedClaim || !decision) {
      toast({
        title: "Error",
        description: "Please select a decision",
        variant: "destructive",
      });
      return;
    }

    // If rejected, show rejection dialog
    if (decision === "rejected") {
      setShowRejectionDialog(true);
      return;
    }

    // Handle approval
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("claims")
        .update({
          decision,
          decision_reason: decisionReason,
          status: "accepted",
        })
        .eq("id", selectedClaim.id);

      if (error) throw error;

      // Send acceptance email with link to customer portal
      try {
        // Get the base URL for the customer portal
        const portalUrl = `${window.location.origin}/customer/claims/${selectedClaim.id}`;
        
        // Find the claim accepted template
        const { data: template } = await supabase
          .from("communication_templates")
          .select("*")
          .eq("status", "accepted")
          .eq("type", "claim")
          .eq("is_active", true)
          .single();

        if (template) {
          // Update template with portal link
          const updatedMessageBody = template.message_body.replace(
            'href="#"',
            `href="${portalUrl}"`
          );

          // Send email directly using send-email function
          await supabase.functions.invoke("send-email", {
            body: {
              to: selectedClaim.policies.customer_email,
              subject: template.subject.replace("{claim_number}", selectedClaim.claim_number),
              html: updatedMessageBody
                .replace(/{claim_number}/g, selectedClaim.claim_number)
                .replace(/{policy_number}/g, selectedClaim.policies.policy_number)
                .replace(/{customer_name}/g, selectedClaim.policies.customer_name || "Customer"),
              policyId: selectedClaim.policy_id,
              claimId: selectedClaim.id,
              communicationType: "claim",
            },
          });
        }
      } catch (emailError) {
        console.error("Error sending acceptance email:", emailError);
        // Don't fail the claim update if email fails
      }

      toast({
        title: "Success",
        description: "Claim approved successfully and customer notified",
      });

      fetchClaims();
      
      // Show fulfillment flow for approved claims
      setShowFulfillment(true);
      // Update local claim status
      setSelectedClaim({ ...selectedClaim, status: "accepted", decision, decision_reason: decisionReason });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const parseClaimDescription = (description: string) => {
    const lines = description.split('\n');
    const parsed: Record<string, string> = {};
    
    lines.forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        if (value) {
          parsed[key] = value;
        }
      }
    });
    
    return parsed;
  };
  
  const getClaimedDevice = (parsedDescription: Record<string, string>) => {
    // First check if there's a direct "Device" key (common in claim descriptions)
    const directDevice = parsedDescription['Device'];
    if (directDevice && directDevice !== 'Not provided') {
      return directDevice;
    }
    
    // Try multiple keys that might contain device info
    const category = parsedDescription['Device Category'] || parsedDescription['Claimed Device'] || '';
    const make = parsedDescription['Make/Brand'] || parsedDescription['Make'] || '';
    const model = parsedDescription['Model'] || '';
    const color = parsedDescription['Color'] || '';
    
    // Build device string
    const parts = [category, make, model, color].filter(p => p && p !== 'Not provided');
    return parts.join(' ') || 'Not specified';
  };

  const getDecisionBadge = (decision: string | null) => {
    if (!decision) {
      return <Badge variant="outline">Pending Review</Badge>;
    }
    switch (decision) {
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{decision}</Badge>;
    }
  };

  const getStatusDisplayInfo = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color?: string }> = {
      notified: { label: "Notified", variant: "outline" },
      referred: { label: "Referred for Review", variant: "secondary", color: "bg-amber-500" },
      referred_pending_info: { label: "Pending Information", variant: "secondary", color: "bg-amber-500" },
      referred_info_received: { label: "Information Received", variant: "secondary", color: "bg-blue-500" },
      accepted: { label: "Accepted", variant: "default", color: "bg-green-500" },
      rejected: { label: "Rejected", variant: "destructive" },
      excess_due: { label: "Excess Due", variant: "secondary", color: "bg-orange-500" },
      excess_paid_fulfillment_pending: { label: "Excess Paid - Fulfillment Pending", variant: "secondary", color: "bg-blue-500" },
      pending_fulfillment: { label: "Pending Fulfillment", variant: "secondary", color: "bg-blue-500" },
      fulfillment_inspection_booked: { label: "Inspection Booked", variant: "secondary", color: "bg-blue-500" },
      estimate_received: { label: "Quote Received - Awaiting Approval", variant: "secondary", color: "bg-purple-500" },
      fulfillment_outcome: { label: "Fulfillment Outcome", variant: "secondary", color: "bg-blue-500" },
      inbound_logistics: { label: "Inbound Logistics", variant: "secondary", color: "bg-indigo-500" },
      repair: { label: "In Repair", variant: "secondary", color: "bg-cyan-500" },
      outbound_logistics: { label: "Outbound Logistics", variant: "secondary", color: "bg-indigo-500" },
      closed: { label: "Closed", variant: "outline" },
    };
    return statusMap[status] || { label: status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()), variant: "outline" as const };
  };

  // Check if claim is in fulfillment stage (past accepted)
  const isInFulfillmentStage = (status: string) => {
    const fulfillmentStatuses = [
      "excess_due", "excess_paid_fulfillment_pending", "pending_fulfillment",
      "fulfillment_inspection_booked", "estimate_received", "fulfillment_outcome",
      "inbound_logistics", "repair", "outbound_logistics", "closed"
    ];
    return fulfillmentStatuses.includes(status);
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Detailed view
  if (selectedClaim) {
    const statusInfo = getStatusDisplayInfo(selectedClaim.status);
    const claimInFulfillment = isInFulfillmentStage(selectedClaim.status);
    
    return (
      <div className="space-y-6">
        {/* Header with Back Button and Current Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={handleBackToList}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Claims List
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-medium">Current Status:</span>
              <Badge className={statusInfo.color || ""} variant={statusInfo.variant}>
                {statusInfo.label}
              </Badge>
            </div>
          </div>
          <Button
            onClick={() => setShowServiceRequestDialog(true)}
            variant="outline"
          >
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            Raise Service Request
          </Button>
        </div>

        {/* Claim Status Banner - Only show "Proceed to Fulfillment" at accepted stage */}
        {selectedClaim.status === "accepted" && !claimInFulfillment && (
          <div className="bg-green-50 dark:bg-green-950/20 border-2 border-green-500 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0" />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-green-900 dark:text-green-100 mb-2">
                  Claim Accepted
                </h3>
                <p className="text-green-800 dark:text-green-200">
                  {!showFulfillment 
                    ? "Click the button below to proceed with the fulfillment process."
                    : "You can now manage the fulfillment steps below."
                  }
                </p>
                {!showFulfillment && (
                  <Button 
                    className="mt-4 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => setShowFulfillment(true)}
                  >
                    Proceed to Fulfillment
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Referred Claim Banner - Prominent at the top */}
        {(selectedClaim.status === "referred" || selectedClaim.decision === "referred") && selectedClaim.status !== "accepted" && selectedClaim.status !== "rejected" && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-500 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-8 w-8 text-amber-600 shrink-0" />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-amber-900 dark:text-amber-100 mb-2">
                  Claim Referred for Manual Review
                </h3>
                {selectedClaim.decision_reason && (
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1">Reason for Referral:</p>
                    <p className="text-amber-800 dark:text-amber-200 whitespace-pre-wrap">{selectedClaim.decision_reason}</p>
                  </div>
                )}
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Please review all documents and claim details below, then approve or reject the claim.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Show status context for claims already in fulfillment */}
        {claimInFulfillment && selectedClaim.status !== "closed" && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Claim in Fulfillment Process
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  This claim has been accepted and is currently being fulfilled. See fulfillment details below.
                </p>
              </div>
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Claim Review: {selectedClaim.claim_number}</CardTitle>
            <CardDescription>
              {showFulfillment ? "Manage claim fulfillment" : "Make a decision on this referred claim"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Policy Details - Collapsible by default */}
            <Collapsible open={policyDetailsOpen} onOpenChange={setPolicyDetailsOpen}>
              <div className="border rounded-lg">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                    <h3 className="text-lg font-semibold">Policy & Customer Information</h3>
                    <ChevronDown className={`h-5 w-5 transition-transform ${policyDetailsOpen ? 'rotate-180' : ''}`} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4">
                    {/* Claim Overview Grid */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Policy Number</h3>
                        <p className="text-sm">{selectedClaim.policies.policy_number}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Customer Name</h3>
                        <p className="text-sm">{selectedClaim.policies.customer_name || "N/A"}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Customer Email</h3>
                        <p className="text-sm">{selectedClaim.policies.customer_email || "N/A"}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Customer Phone</h3>
                        <p className="text-sm">{selectedClaim.policies.customer_phone || "N/A"}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Product</h3>
                        <p className="text-sm">{selectedClaim.policies.products.name}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Excess Amount</h3>
                        <p className="text-sm">£{selectedClaim.policies.products.excess_1}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Submitted</h3>
                        <p className="text-sm">
                          {formatDistanceToNow(new Date(selectedClaim.submitted_date), { addSuffix: true })}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Has Receipt</h3>
                        {selectedClaim.has_receipt ? (
                          <Badge className="bg-success">Provided</Badge>
                        ) : (
                          <Badge variant="outline">Not Provided</Badge>
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground">Current Status</h3>
                        <div className="mt-1">
                          {getDecisionBadge(selectedClaim.decision)}
                        </div>
                      </div>
                      {selectedClaim.decision === "rejected" && selectedClaim.decision_reason && (
                        <div className="md:col-span-2">
                          <h3 className="text-sm font-medium text-muted-foreground mb-2">Rejection Reason</h3>
                          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                              <p className="text-sm text-foreground">{selectedClaim.decision_reason}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      {(selectedClaim.status === "referred" || selectedClaim.decision === "referred" || selectedClaim.decision === "pending_review") && selectedClaim.decision_reason && (
                        <div className="md:col-span-2">
                          <h3 className="text-sm font-medium text-muted-foreground mb-2">Referral Reason (AI Assessment)</h3>
                          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                              <p className="text-sm text-amber-900 dark:text-amber-200 whitespace-pre-wrap">{selectedClaim.decision_reason}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Manual Assessment Section for Referred Claims - show when status OR decision is referred */}
            {(selectedClaim.status === "referred" || selectedClaim.decision === "referred") && selectedClaim.status !== "accepted" && selectedClaim.status !== "rejected" && (
              <div className="border-t pt-6">
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-1">
                        Manual Assessment Required
                      </h3>
                      <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                        This claim has been flagged for manual review. Please assess all documents and claim details before making a final decision.
                      </p>
                      {selectedClaim.decision_reason && (
                        <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded border border-amber-300 dark:border-amber-700 mt-2">
                          <p className="text-xs font-semibold text-amber-900 dark:text-amber-100 mb-1">Reason for Referral:</p>
                          <p className="text-sm text-amber-900 dark:text-amber-200 whitespace-pre-wrap">{selectedClaim.decision_reason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-3 mt-4">
                    <Button 
                      variant="default"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={async () => {
                        try {
                          setUpdating(true);
                          const { error } = await supabase
                            .from("claims")
                            .update({
                              status: "accepted",
                              decision: "accepted",
                              updated_at: new Date().toISOString(),
                            })
                            .eq("id", selectedClaim.id);

                          if (error) throw error;

                          // Add status history
                          await supabase
                            .from("claim_status_history")
                            .insert({
                              claim_id: selectedClaim.id,
                              status: "accepted",
                              notes: "Manually approved after referral",
                            });

                          toast({
                            title: "Claim Approved",
                            description: "The claim has been approved successfully",
                          });

                          // Refresh claims
                          fetchClaims();
                          setSelectedClaim(null);
                        } catch (error: any) {
                          console.error("Error approving claim:", error);
                          toast({
                            title: "Error",
                            description: "Failed to approve claim",
                            variant: "destructive",
                          });
                        } finally {
                          setUpdating(false);
                        }
                      }}
                      disabled={updating}
                    >
                      {updating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                      Approve Claim
                    </Button>
                    <Button 
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        setDecision("rejected");
                        setShowRejectionDialog(true);
                      }}
                      disabled={updating}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject Claim
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Claim Information</h3>
              <div className="grid gap-4 md:grid-cols-2 mb-4">
                <div className="rounded-md border p-3 bg-primary/5">
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Claim Type</h4>
                  <p className="text-sm font-semibold capitalize">{selectedClaim.claim_type.replace("_", " ")}</p>
                </div>
                {(() => {
                  const parsedData = parseClaimDescription(selectedClaim.description);
                  const deviceDisplay = getClaimedDevice(parsedData);
                  return (
                    <div className="rounded-md border p-3 bg-primary/5">
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Claimed Device</h4>
                      <p className="text-sm font-semibold">{deviceDisplay}</p>
                    </div>
                  );
                })()}
              </div>
              {(() => {
                const parsedData = parseClaimDescription(selectedClaim.description);
                return (
                  <div className="grid gap-3 md:grid-cols-2">
                    {Object.entries(parsedData).map(([key, value]) => (
                      <div key={key} className="rounded-md border p-3 bg-muted/50">
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">{key}</h4>
                        <p className="text-sm">{value}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Documents & Attachments - Mandatory Documents Checklist */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Documents Checklist</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (!selectedClaim) return;
                      
                      setReanalyzingDocuments(true);
                      try {
                        const { data, error } = await supabase.functions.invoke('reanalyze-claim-documents', {
                          body: {
                            claimId: selectedClaim.id
                          }
                        });
                        
                        if (error) throw error;
                        
                        // Refresh documents to show updated AI analysis
                        fetchDocuments(selectedClaim.id);
                        
                        toast({
                          title: "Analysis Complete",
                          description: `Reanalyzed ${data.successful} document(s) successfully`,
                        });
                      } catch (error: any) {
                        console.error('Error reanalyzing documents:', error);
                        toast({
                          title: "Error",
                          description: "Failed to reanalyze documents",
                          variant: "destructive",
                        });
                      } finally {
                        setReanalyzingDocuments(false);
                      }
                    }}
                    disabled={reanalyzingDocuments || loadingDocuments}
                  >
                    {reanalyzingDocuments ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <AlertCircle className="h-4 w-4 mr-2" />
                    )}
                    Re-run AI Analysis
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const { error } = await supabase.functions.invoke('send-claim-document-request', {
                          body: {
                            claimId: selectedClaim.id,
                            policyId: selectedClaim.policy_id,
                            claimNumber: selectedClaim.claim_number,
                            customerEmail: selectedClaim.policies.customer_email,
                            customerName: selectedClaim.policies.customer_name,
                            policyNumber: selectedClaim.policies.policy_number,
                            productName: selectedClaim.policies.products.name
                          }
                        });
                        
                        if (error) throw error;
                        
                        toast({
                          title: "Email Sent",
                          description: "Document request email sent to customer successfully",
                        });
                      } catch (error: any) {
                        console.error('Error sending document request:', error);
                        toast({
                          title: "Error",
                          description: "Failed to send document request email",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Document Request
                  </Button>
                </div>
              </div>
              {loadingDocuments ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Mandatory Documents */}
                  {getMandatoryDocuments(selectedClaim.claim_type).map((mandatoryDoc, index) => {
                    const uploadedDoc = documents.find(
                      (d) => d.document_type === mandatoryDoc.type && 
                             d.document_subtype === mandatoryDoc.subtype &&
                             d.claim_id === selectedClaim.id
                    );

                    return (
                      <div
                        key={index}
                        className={`rounded-lg border-2 p-4 ${
                          uploadedDoc
                            ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                            : "border-red-500 bg-red-50 dark:bg-red-950/20"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {uploadedDoc ? (
                            <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0 mt-1" />
                          ) : (
                            <XCircle className="h-6 w-6 text-red-600 shrink-0 mt-1" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div>
                                <p className="font-medium">{mandatoryDoc.label}</p>
                                <p className="text-sm text-muted-foreground">
                                  {uploadedDoc ? "Document provided" : "Missing - Required"}
                                </p>
                              </div>
                              {!uploadedDoc && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRequestMissingDocument(mandatoryDoc.type, mandatoryDoc.subtype, mandatoryDoc.label)}
                                >
                                  <MessageSquarePlus className="h-4 w-4 mr-2" />
                                  Request Document
                                </Button>
                              )}
                            </div>

                            {/* Show uploaded document details with AI feedback */}
                            {uploadedDoc && (
                              <div className="mt-3 p-3 bg-background rounded border">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="flex items-start gap-2 flex-1 min-w-0">
                                    <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm truncate">{uploadedDoc.file_name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Uploaded {formatDistanceToNow(new Date(uploadedDoc.uploaded_date), { addSuffix: true })}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    {isImageDocument(uploadedDoc.file_name) && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => previewImageDocument(uploadedDoc.file_path, uploadedDoc.file_name, uploadedDoc.document_type)}
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => downloadDocument(uploadedDoc.file_path, uploadedDoc.file_name, uploadedDoc.document_type)}
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                      onClick={() => handleAcceptClaimDocument(uploadedDoc.id)}
                                    >
                                      <ThumbsUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => openRejectDocumentDialog(
                                        uploadedDoc.id,
                                        mandatoryDoc.type,
                                        mandatoryDoc.subtype,
                                        mandatoryDoc.label
                                      )}
                                    >
                                      <ThumbsDown className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                                
                                {/* AI Analysis Feedback - Color coded based on validation */}
                                {uploadedDoc.metadata?.ai_analysis && (() => {
                                  const analysis = uploadedDoc.metadata.ai_analysis;
                                  const isValid = analysis.isValid;
                                  const confidence = analysis.confidence || 0;
                                  
                                  // Determine color scheme based on validation status
                                  let bgColor, borderColor, textColor, badgeColor;
                                  if (isValid && confidence >= 0.7) {
                                    // Valid and high confidence - Green
                                    bgColor = "bg-green-50 dark:bg-green-950/20";
                                    borderColor = "border-green-200 dark:border-green-800";
                                    textColor = "text-green-900 dark:text-green-100";
                                    badgeColor = "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
                                  } else if (isValid && confidence < 0.7) {
                                    // Valid but low confidence - Amber
                                    bgColor = "bg-amber-50 dark:bg-amber-950/20";
                                    borderColor = "border-amber-200 dark:border-amber-800";
                                    textColor = "text-amber-900 dark:text-amber-100";
                                    badgeColor = "bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200";
                                  } else {
                                    // Invalid - Red
                                    bgColor = "bg-red-50 dark:bg-red-950/20";
                                    borderColor = "border-red-200 dark:border-red-800";
                                    textColor = "text-red-900 dark:text-red-100";
                                    badgeColor = "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200";
                                  }
                                  
                                  return (
                                    <div className={`mt-2 p-2 rounded border ${bgColor} ${borderColor}`}>
                                      <p className={`text-xs font-semibold ${textColor} mb-1`}>
                                        {isValid ? '✓ AI Validation Passed' : '⚠️ AI Validation Failed'}
                                      </p>
                                      <p className={`text-xs ${textColor}`}>{analysis.assessment}</p>
                                      {analysis.findings && analysis.findings.length > 0 && (
                                        <ul className={`mt-1 text-xs ${textColor} list-disc list-inside space-y-0.5`}>
                                          {analysis.findings.map((finding, idx) => (
                                            <li key={idx}>{finding}</li>
                                          ))}
                                        </ul>
                                      )}
                                      <div className="mt-1 flex items-center gap-2">
                                        <Badge className={`text-xs ${badgeColor}`}>
                                          Confidence: {Math.round(confidence * 100)}%
                                        </Badge>
                                        {!isValid && analysis.validationIssue && (
                                          <Badge variant="destructive" className="text-xs">
                                            Issue: {analysis.validationIssue}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Additional Documents (not part of mandatory checklist) */}
                  {documents.filter(doc => {
                    const isMandatory = getMandatoryDocuments(selectedClaim.claim_type).some(
                      m => m.type === doc.document_type && m.subtype === doc.document_subtype
                    );
                    return !isMandatory && doc.claim_id === selectedClaim.id;
                  }).length > 0 && (
                    <div className="border-t pt-4 mt-6">
                      <h4 className="text-sm font-semibold mb-3">Additional Documents</h4>
                      <div className="space-y-3">
                        {documents.filter(doc => {
                          const isMandatory = getMandatoryDocuments(selectedClaim.claim_type).some(
                            m => m.type === doc.document_type && m.subtype === doc.document_subtype
                          );
                          return !isMandatory && doc.claim_id === selectedClaim.id;
                        }).map((doc) => (
                          <div key={doc.id} className="p-3 bg-muted rounded-lg border">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2 flex-1 min-w-0">
                                <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{doc.file_name}</p>
                                  <p className="text-xs text-muted-foreground capitalize">
                                    {doc.document_type} {doc.document_subtype && `- ${doc.document_subtype}`}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Uploaded {formatDistanceToNow(new Date(doc.uploaded_date), { addSuffix: true })}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                {isImageDocument(doc.file_name) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => previewImageDocument(doc.file_path, doc.file_name, doc.document_type)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => downloadDocument(doc.file_path, doc.file_name, doc.document_type)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => handleAcceptClaimDocument(doc.id)}
                                >
                                  <ThumbsUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => openRejectDocumentDialog(
                                    doc.id,
                                    doc.document_type,
                                    doc.document_subtype || "other",
                                    `${doc.document_type} - ${doc.file_name}`
                                  )}
                                >
                                  <ThumbsDown className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {isAdmin && repairCosts.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Repair Costs (Admin Only)</h3>
                <div className="space-y-3">
                  {repairCosts.map((cost) => (
                    <div key={cost.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium capitalize">{cost.cost_type.replace(/_/g, " ")}</p>
                        <p className="text-sm text-muted-foreground">{cost.description}</p>
                      </div>
                      <p className="font-semibold text-lg">€{cost.amount.toFixed(2)}</p>
                    </div>
                  ))}
                  <div className="flex justify-end pt-2 border-t">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total Repair Costs</p>
                      <p className="text-xl font-bold">
                        €{repairCosts.reduce((sum, cost) => sum + cost.amount, 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Service Requests Section */}
            {serviceRequests.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Service Requests ({serviceRequests.length})</h3>
                <div className="space-y-3">
                  {serviceRequests.map((request) => {
                    const unreadCount = getUnreadCount(request);
                    const isOpen = openServiceRequests.has(request.id);
                    
                    return (
                      <Collapsible
                        key={request.id}
                        open={isOpen}
                        onOpenChange={() => toggleServiceRequest(request.id)}
                      >
                        <div className="border rounded-lg">
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                              <div className="flex items-center gap-3 flex-1">
                                <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold">{request.request_reference}</p>
                                    {unreadCount > 0 && (
                                      <Badge variant="destructive" className="h-5 px-2">
                                        <MessageCircle className="h-3 w-3 mr-1" />
                                        {unreadCount}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">{request.reason}</p>
                                </div>
                                <Badge variant={request.status === "open" ? "default" : "secondary"}>
                                  {request.status}
                                </Badge>
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent>
                            <div className="px-4 pb-4 space-y-4">
                              <p className="text-sm text-muted-foreground">{request.details}</p>
                              <div className="flex gap-4 text-xs text-muted-foreground">
                                <span>Created: {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</span>
                                {request.last_activity_at && (
                                  <span>Last activity: {formatDistanceToNow(new Date(request.last_activity_at), { addSuffix: true })}</span>
                                )}
                              </div>

                      {/* Messages Thread */}
                      {request.messages && request.messages.length > 0 && (
                        <div className="border-t pt-4 space-y-3">
                          <h4 className="text-sm font-semibold">Conversation</h4>
                          <div className="space-y-3 max-h-[400px] overflow-y-auto">
                            {request.messages.map((message) => {
                              // Find documents uploaded around the same time as this message
                              const messageDocs = (request.documents || []).filter(doc => {
                                const timeDiff = Math.abs(
                                  new Date(doc.uploaded_date).getTime() - 
                                  new Date(message.created_at).getTime()
                                );
                                return timeDiff < 5000; // Within 5 seconds
                              });

                              return (
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
                                        
                                         {/* Display attached documents with accept/reject */}
                                         {messageDocs.length > 0 && (
                                           <div className="mt-3 space-y-2">
                                             {messageDocs.map((doc) => (
                                               <div
                                                 key={doc.id}
                                                  className={`flex items-center gap-2 p-2 rounded border ${
                                                    message.role === "user"
                                                      ? "bg-primary-foreground/10 border-primary-foreground/20"
                                                      : "bg-background border-border"
                                                  }`}
                                                >
                                                  <FileText className="h-4 w-4 shrink-0" />
                                                  <Button
                                                    variant="link"
                                                    className="p-0 h-auto text-sm flex-1 truncate text-left justify-start"
                                                    onClick={() => {
                                                      const docWithServiceRequestId = { ...doc, service_request_id: request.id };
                                                      openDocumentTypeDialog(docWithServiceRequestId);
                                                    }}
                                                  >
                                                    {doc.file_name}
                                                  </Button>
                                                  <div className="flex gap-1">
                                                    {message.role === "user" && request.reason === "Missing document" && request.status === "open" && (
                                                      <>
                                                         <Button
                                                           variant="ghost"
                                                           size="sm"
                                                           className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                           onClick={() => {
                                                            // Determine document label based on service request details
                                                            const docLabel = request.details.toLowerCase();
                                                            let label = "document";
                                                            
                                                            if (docLabel.includes("receipt") || docLabel.includes("purchase")) {
                                                              label = "Proof of Purchase / Receipt";
                                                            } else if (docLabel.includes("photo") || docLabel.includes("damage") || docLabel.includes("fault")) {
                                                              label = "Photo of Damage/Fault";
                                                            } else if (docLabel.includes("police")) {
                                                              label = "Police Report";
                                                            }
                                                            
                                                            openRejectDocumentDialog(doc.id, doc.document_type || "other", doc.document_subtype || "other", label, request.id);
                                                          }}
                                                          title="Reject document"
                                                        >
                                                          <ThumbsDown className="h-3.5 w-3.5" />
                                                        </Button>
                                                     </>
                                                   )}
                                                   <Button
                                                     variant="ghost"
                                                     size="sm"
                                                     className="h-7 w-7 p-0"
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
                                                         toast({
                                                           title: "Success",
                                                           description: "Document downloaded",
                                                         });
                                                       } catch (error) {
                                                         console.error("Error downloading file:", error);
                                                         toast({
                                                           title: "Error",
                                                           description: "Failed to download file",
                                                           variant: "destructive",
                                                         });
                                                       }
                                                     }}
                                                   >
                                                     <Download className="h-3 w-3" />
                                                   </Button>
                                                 </div>
                                               </div>
                                             ))}
                                           </div>
                                         )}
                                      </div>
                                      <span className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Reply Interface */}
                      <div className="border-t pt-4 mt-4">
                        {replyingToRequest === request.id ? (
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold">Send Reply</h4>
                            <Textarea
                              value={replyMessage}
                              onChange={(e) => setReplyMessage(e.target.value)}
                              placeholder="Type your reply..."
                              className="min-h-[100px]"
                              disabled={sendingReply}
                            />
                            
                            {/* File Upload */}
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => document.getElementById(`file-upload-${request.id}`)?.click()}
                                  disabled={sendingReply}
                                >
                                  <Upload className="h-4 w-4 mr-2" />
                                  Attach Files
                                </Button>
                                <input
                                  id={`file-upload-${request.id}`}
                                  type="file"
                                  multiple
                                  className="hidden"
                                  onChange={handleFileSelect}
                                  disabled={sendingReply}
                                />
                              </div>
                              
                              {replyFiles.length > 0 && (
                                <div className="space-y-2">
                                  {replyFiles.map((file, index) => (
                                    <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                                      <FileText className="h-4 w-4" />
                                      <span className="text-sm flex-1 truncate">{file.name}</span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={() => removeFile(index)}
                                        disabled={sendingReply}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleSendReply(request.id)}
                                disabled={sendingReply || (!replyMessage.trim() && replyFiles.length === 0)}
                                size="sm"
                              >
                                {sendingReply ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Sending...
                                  </>
                                ) : (
                                  <>
                                    <Send className="h-4 w-4 mr-2" />
                                    Send Reply
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setReplyingToRequest(null);
                                  setReplyMessage("");
                                  setReplyFiles([]);
                                }}
                                disabled={sendingReply}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReplyingToRequest(request.id)}
                          >
                            <MessageSquarePlus className="h-4 w-4 mr-2" />
                            Reply to Request
                          </Button>
                        )}
                      </div>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Policy Communications Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Communications History</h3>
              <PolicyCommunications 
                policyId={selectedClaim.policy_id} 
                claimId={selectedClaim.id}
              />
            </div>

            {/* Quote Approval Section */}
            {claimFulfillment && claimFulfillment.quote_status === "pending" && claimFulfillment.quote_amount && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Quote Approval</h3>
                <QuoteApprovalCard
                  fulfillmentId={claimFulfillment.id}
                  claimId={selectedClaim.id}
                  claimNumber={selectedClaim.claim_number}
                  repairerName={claimFulfillment.repairers?.name || claimFulfillment.repairers?.company_name || "Unknown Repairer"}
                  quoteAmount={claimFulfillment.quote_amount}
                  deviceValue={claimFulfillment.device_value}
                  inspectionNotes={claimFulfillment.inspection_notes}
                  inspectionPhotos={claimFulfillment.inspection_photos}
                  repairerReport={claimFulfillment.repairer_report}
                  repairCosts={repairCosts}
                  onApprove={() => {
                    toast({
                      title: "Success",
                      description: "Quote approved",
                    });
                    fetchClaims();
                    handleBackToList();
                  }}
                  onReject={() => {
                    toast({
                      title: "Success",
                      description: "Claim settled with BER",
                    });
                    fetchClaims();
                    handleBackToList();
                  }}
                />
              </div>
            )}

            {/* Inspection Details Section - shown for claims with approved/rejected quotes */}
            {claimFulfillment && 
             (claimFulfillment.quote_status === "approved" || claimFulfillment.quote_status === "rejected") && (
              <InspectionDetailsSection 
                fulfillment={claimFulfillment}
                repairCosts={repairCosts}
              />
            )}

            {/* Claim Costs Summary - shown for closed claims */}
            {selectedClaim.status === "closed" && (
              <ClaimCostsSummary
                fulfillment={claimFulfillment}
                repairCosts={repairCosts}
                claimDecision={selectedClaim.decision}
                claimDecisionReason={selectedClaim.decision_reason}
              />
            )}

            {/* Repairer Communication */}
            {(selectedClaim.status === "estimate_received" || 
              selectedClaim.status === "awaiting_quote_approval" || 
              selectedClaim.status === "repair" ||
              selectedClaim.status === "inbound_logistics" ||
              selectedClaim.status === "outbound_logistics") && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Repairer Communication</h3>
                <RepairerClaimsChat
                  claimId={selectedClaim.id}
                  userRole="claims_agent"
                />
              </div>
            )}

            {showFulfillment ? (
              <div className="border-t pt-6">
                <ClaimFulfillmentFlow
                  claimId={selectedClaim.id}
                  claimType={selectedClaim.claim_type}
                  deviceCategory={detectedDeviceCategory}
                  policyId={selectedClaim.policy_id}
                  onComplete={() => {
                    fetchClaims();
                    handleBackToList();
                  }}
                />
              </div>
            ) : (selectedClaim.decision === "rejected" || selectedClaim.status === "rejected") ? (
              <div className="space-y-4 border-t pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Claim Rejected</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      This claim has been rejected. You can reopen it for review if needed.
                    </p>
                  </div>
                  <Button 
                    onClick={() => handleReopenClaim(selectedClaim)}
                    disabled={updating}
                  >
                    {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Reopen Claim
                  </Button>
                </div>
              </div>
            ) : selectedClaim.status === "notified" ? (
              <div className="space-y-4 border-t pt-6">
                <div className="rounded-lg border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/20 p-6">
                  <div className="flex items-start gap-3">
                    <Loader2 className="h-6 w-6 text-blue-600 animate-spin shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        Automatic Processing in Progress
                      </h3>
                      <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                        This claim is currently being processed automatically. Once documents are uploaded and analyzed, the system will make a decision and notify the customer.
                      </p>
                      <div className="space-y-2">
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          <strong>Status:</strong> {(() => {
                            const mandatoryDocs = getMandatoryDocuments(selectedClaim.claim_type);
                            const allDocsUploaded = mandatoryDocs.every(doc => 
                              documents.some(d => d.document_type === doc.type && d.document_subtype === doc.subtype && d.claim_id === selectedClaim.id)
                            );
                            return allDocsUploaded 
                              ? "All documents uploaded - AI is analyzing the claim" 
                              : "Waiting for customer to upload required documents";
                          })()}
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          The claim will be automatically updated once processing is complete. You will be able to review the decision and take action if needed.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button variant="outline" onClick={handleBackToList}>
                    Back to List
                  </Button>
                </div>
              </div>
            ) : (isClaimsAgent || isSystemAdmin || isAdmin) && selectedClaim.decision === "referred" ? (
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-semibold">Make Decision</h3>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Decision</label>
                  <Select value={decision} onValueChange={setDecision}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select decision" />
                    </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="approved">Approve</SelectItem>
                  <SelectItem value="rejected">Reject</SelectItem>
                </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Reason / Notes</label>
                  <Textarea
                    value={decisionReason}
                    onChange={(e) => setDecisionReason(e.target.value)}
                    placeholder="Provide reasoning for your decision..."
                    rows={4}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={handleBackToList}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateClaim} disabled={updating || !decision}>
                    {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Decision
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end border-t pt-6">
                <Button variant="outline" onClick={handleBackToList}>
                  Back to List
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {selectedClaim && (
          <ClaimRejectionDialog
            open={showRejectionDialog}
            onOpenChange={setShowRejectionDialog}
            claimId={selectedClaim.id}
            claimType={selectedClaim.claim_type}
            productId={selectedClaim.policies.product_id}
            onRejected={async () => {
              // Refresh the claims list to remove the rejected claim
              await fetchClaims();
              // Clear the selected claim and go back to list
              setSelectedClaim(null);
              setShowRejectionDialog(false);
            }}
          />
        )}

        <Dialog open={!!previewImage} onOpenChange={(open) => {
          console.log("Dialog onOpenChange called:", open, "previewImage:", previewImage);
          if (!open) setPreviewImage(null);
        }}>
          <DialogContent className="max-w-4xl" aria-describedby="image-preview-description">
            <DialogHeader>
              <DialogTitle>{previewImageName}</DialogTitle>
            </DialogHeader>
            <p id="image-preview-description" className="sr-only">
              Full size preview of the uploaded document
            </p>
            <div className="flex items-center justify-center bg-muted rounded-lg p-4 min-h-[400px]">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt={previewImageName}
                  className="max-h-[70vh] w-auto object-contain rounded-lg"
                  onLoad={() => console.log("Image loaded successfully")}
                  onError={(e) => console.error("Image failed to load", e)}
                />
              ) : (
                <p>No image to display</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <RaiseServiceRequestDialog
          open={showServiceRequestDialog}
          onOpenChange={setShowServiceRequestDialog}
          claimId={selectedClaim.id}
          policyId={selectedClaim.policy_id}
          customerName={selectedClaim.policies.customer_name || "Customer"}
          customerEmail={selectedClaim.policies.customer_email || ""}
          onSuccess={() => {
            toast({
              title: "Success",
              description: "Service request created and customer notified",
            });
            // Refresh service requests list and claim data
            if (selectedClaim) {
              fetchServiceRequests(selectedClaim.id);
              handleSelectClaim(selectedClaim);
            }
          }}
        />

        <Dialog open={showDocumentRejectionDialog} onOpenChange={setShowDocumentRejectionDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg">Reject Document</DialogTitle>
              <DialogDescription className="text-sm">
                {rejectionDocumentLabel}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-3">
              <div className="space-y-3">
                <RadioGroup value={rejectionReason} onValueChange={setRejectionReason}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="not_clear" id="not_clear" />
                    <Label htmlFor="not_clear" className="font-normal cursor-pointer text-sm">
                      Picture not clear
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="wrong_product" id="wrong_product" />
                    <Label htmlFor="wrong_product" className="font-normal cursor-pointer text-sm">
                      Wrong product
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="other" id="other" />
                    <Label htmlFor="other" className="font-normal cursor-pointer text-sm">
                      Other
                    </Label>
                  </div>
                </RadioGroup>

                {rejectionReason === "other" && (
                  <Textarea
                    value={rejectionReasonOther}
                    onChange={(e) => setRejectionReasonOther(e.target.value)}
                    placeholder="Enter the reason..."
                    rows={3}
                    className="text-sm"
                  />
                )}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDocumentRejectionDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRejectClaimDocument}
                disabled={!rejectionReason || (rejectionReason === "other" && !rejectionReasonOther.trim())}
              >
                Reject & Request New
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Type Mapping Dialog */}
      <Dialog open={showDocumentTypeDialog} onOpenChange={setShowDocumentTypeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Document Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Document: {selectedDocumentForMapping?.file_name}
              </p>
              <p className="text-sm mb-4">
                Select which document type this should be stored against:
              </p>
              <Select value={selectedMappingDocumentType} onValueChange={setSelectedMappingDocumentType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {selectedClaim && getMandatoryDocuments(selectedClaim.claim_type).map((doc) => (
                    <SelectItem key={doc.type} value={doc.type}>
                      {doc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDocumentTypeDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleMapDocumentToType}>
                Accept & Map Document
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Type Mapping Dialog - Smaller */}
      <Dialog open={showDocumentTypeDialog} onOpenChange={setShowDocumentTypeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Select Document Type</DialogTitle>
            <DialogDescription className="text-sm">
              "{selectedDocumentForMapping?.file_name}"
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Select value={selectedMappingDocumentType} onValueChange={setSelectedMappingDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {selectedClaim && getMandatoryDocuments(selectedClaim.claim_type).map((doc) => (
                  <SelectItem key={doc.type} value={doc.type}>
                    {doc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowDocumentTypeDialog(false)}>
              Cancel
            </Button>
            <Button 
              size="sm"
              onClick={handleMapDocumentToType}
              disabled={!selectedMappingDocumentType}
            >
              Accept & Map
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

  // List view
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Claims Management</h1>
        <p className="text-muted-foreground">Review and decide on referred claims</p>
      </div>

      <div className="flex gap-2">
        <Button
          variant={viewMode === "all" ? "default" : "outline"}
          onClick={() => setViewMode("all")}
        >
          All Claims
        </Button>
        <Button
          variant={viewMode === "active" ? "default" : "outline"}
          onClick={() => setViewMode("active")}
        >
          Active Claims
        </Button>
        <Button
          variant={viewMode === "quotesApproval" ? "default" : "outline"}
          onClick={() => setViewMode("quotesApproval")}
        >
          Quotes Approval
        </Button>
        <Button
          variant={viewMode === "completed" ? "default" : "outline"}
          onClick={() => setViewMode("completed")}
        >
          Completed Claims
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${activeMetricFilter === null ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setActiveMetricFilter(null)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {viewMode === "all" ? "Total Claims" : viewMode === "active" ? "Active Claims" : viewMode === "quotesApproval" ? "Quotes Awaiting Approval" : "Completed Claims"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${activeMetricFilter === "outOfSLA" ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setActiveMetricFilter(activeMetricFilter === "outOfSLA" ? null : "outOfSLA")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Out of SLA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {metrics.outOfSLA}
            </div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${activeMetricFilter === "updated" ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setActiveMetricFilter(activeMetricFilter === "updated" ? null : "updated")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Updated Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{metrics.updated}</div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${activeMetricFilter === "approved" ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setActiveMetricFilter(activeMetricFilter === "approved" ? null : "approved")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.approved}</div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${activeMetricFilter === "quotesApproval" ? 'ring-2 ring-primary' : ''}`}
          onClick={() => setActiveMetricFilter(activeMetricFilter === "quotesApproval" ? null : "quotesApproval")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Quotes Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{metrics.quotesApproval}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {viewMode === "all" ? "All Claims" : viewMode === "active" ? "Active Claims" : viewMode === "quotesApproval" ? "Quotes Approval" : "Completed Claims"}
          </CardTitle>
          <CardDescription>
            {viewMode === "all" 
              ? "View all claims in the system" 
              : viewMode === "active"
                ? "Claims currently in progress"
                : viewMode === "quotesApproval"
                  ? "Claims with quotes awaiting approval"
                  : "Claims that have been closed"}
          </CardDescription>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by claim number, policy, customer name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {sortedClaims.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm 
                ? "No claims match your search" 
                : `No ${viewMode} claims at this time`}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("claim_number")}
                  >
                    <div className="flex items-center gap-1">
                      Claim Number
                      {sortField === "claim_number" && (
                        <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("policy_number")}
                  >
                    <div className="flex items-center gap-1">
                      Policy
                      {sortField === "policy_number" && (
                        <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("customer_name")}
                  >
                    <div className="flex items-center gap-1">
                      Customer
                      {sortField === "customer_name" && (
                        <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("claim_type")}
                  >
                    <div className="flex items-center gap-1">
                      Type
                      {sortField === "claim_type" && (
                        <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("submitted_date")}
                  >
                    <div className="flex items-center gap-1">
                      Submitted
                      {sortField === "submitted_date" && (
                        <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {sortField === "status" && (
                        <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("decision")}
                  >
                    <div className="flex items-center gap-1">
                      Decision
                      {sortField === "decision" && (
                        <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedClaims.map((claim) => (
                  <TableRow 
                    key={claim.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSelectClaim(claim)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="inline-block min-w-[140px]">{claim.claim_number}</span>
                        {claim.slaStatus === 'breached' && (
                          <Badge variant="destructive" className="ml-2 whitespace-nowrap">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Out of SLA
                          </Badge>
                        )}
                        {claim.slaStatus === 'approaching' && (
                          <Badge variant="outline" className="ml-2 border-yellow-500 text-yellow-600 whitespace-nowrap">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            SLA Approaching
                          </Badge>
                        )}
                        {claim.hasCustomerUpdate && (
                          <Badge variant="outline" className="ml-2 whitespace-nowrap">
                            <MessageCircle className="h-3 w-3 mr-1" />
                            Update
                          </Badge>
                        )}
                      </div>
                      {claim.slaHours && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {claim.hoursInStatus}h / {claim.slaHours}h SLA
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{claim.policies.policy_number}</TableCell>
                    <TableCell>{claim.policies.customer_name || "N/A"}</TableCell>
                    <TableCell className="capitalize">{claim.claim_type.replace("_", " ")}</TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(claim.submitted_date), { addSuffix: true })}
                    </TableCell>
                    <TableCell>{getStatusBadge(claim.status, documents.some(d => d.claim_id === claim.id))}</TableCell>
                    <TableCell>{getDecisionBadge(claim.decision)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectClaim(claim)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
