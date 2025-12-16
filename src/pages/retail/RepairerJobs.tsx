import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { Package, Wrench, MapPin, Phone, Mail, ArrowLeft, MessageSquare, DollarSign, Clipboard, Camera } from "lucide-react";
import RepairerClaimsChat from "@/components/RepairerClaimsChat";
import { formatStatus } from "@/lib/utils";

interface FulfillmentJob {
  id: string;
  claim_id: string;
  fulfillment_type: string;
  status: string;
  device_value: number;
  excess_amount: number;
  excess_paid: boolean;
  appointment_date: string | null;
  appointment_slot: string | null;
  engineer_reference: string | null;
  logistics_reference: string | null;
  notes: string | null;
  repairer_id: string | null;
  repair_outcome: string | null;
  ber_reason: string | null;
  inspection_notes: string | null;
  inspection_photos: string[] | null;
  repairer_report: string[] | null;
  quote_amount: number | null;
  quote_status: string | null;
  quote_rejection_reason: string | null;
  repair_scheduled_date: string | null;
  repair_scheduled_slot: string | null;
  created_at: string;
  updated_at: string;
  claims: {
    claim_number: string;
    description: string;
    claim_type: string;
    product_condition: string | null;
    policies: {
      policy_number: string;
      customer_name: string;
      customer_email: string;
      customer_phone: string;
      customer_address_line1: string;
      customer_address_line2: string;
      customer_city: string;
      customer_postcode: string;
    };
  };
}

interface RepairCost {
  id: string;
  cost_type: string;
  description: string;
  amount: number;
  units: number;
  created_at: string;
}

interface NewCostItem {
  cost_type: string;
  description: string;
  amount: string;
  units: string;
}

export default function RepairerJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<FulfillmentJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<FulfillmentJob | null>(null);
  const [jobStatus, setJobStatus] = useState<string>("");
  const [jobNotes, setJobNotes] = useState<string>("");
  const [updating, setUpdating] = useState(false);
  const [costs, setCosts] = useState<RepairCost[]>([]);
  const [costItems, setCostItems] = useState<NewCostItem[]>([]);
  const [addingCost, setAddingCost] = useState(false);
  const [repairOutcome, setRepairOutcome] = useState<string>("");
  const [berReason, setBerReason] = useState<string>("");
  const [inspectionNotes, setInspectionNotes] = useState<string>("");
  const [quoteAmount, setQuoteAmount] = useState<string>("");
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [inspectionPhotos, setInspectionPhotos] = useState<File[]>([]);
  const [reportFiles, setReportFiles] = useState<File[]>([]);
  const [uploadingReport, setUploadingReport] = useState(false);
  const [outboundLogisticsRef, setOutboundLogisticsRef] = useState<string>("");

  useEffect(() => {
    if (user) {
      fetchJobs();
    }
  }, [user]);

  const fetchJobs = async () => {
    try {
      // First get the user's repairer_id
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("repairer_id")
        .eq("id", user?.id)
        .single();

      if (profileError) throw profileError;

      if (!profileData?.repairer_id) {
        toast.error("No repairer assigned to your profile");
        setLoading(false);
        return;
      }

      // Fetch jobs assigned to this repairer
      const { data, error } = await supabase
        .from("claim_fulfillment")
        .select(`
          *,
          claims (
            claim_number,
            description,
            claim_type,
            product_condition,
            policies (
              policy_number,
              customer_name,
              customer_email,
              customer_phone,
              customer_address_line1,
              customer_address_line2,
              customer_city,
              customer_postcode
            )
          )
        `)
        .eq("repairer_id", profileData.repairer_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error: any) {
      toast.error("Failed to load jobs: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectJob = (job: FulfillmentJob) => {
    setSelectedJob(job);
    setJobStatus(job.status);
    setJobNotes(job.notes || "");
    setRepairOutcome(job.repair_outcome || "");
    setBerReason(job.ber_reason || "");
    setInspectionNotes(job.inspection_notes || "");
    setQuoteAmount(job.quote_amount?.toString() || "");
    setCostItems([]);
    setInspectionPhotos([]);
    setOutboundLogisticsRef(job.logistics_reference || "");
    fetchCosts(job.id);
  };

  const fetchCosts = async (fulfillmentId: string) => {
    try {
      const { data, error } = await supabase
        .from("repair_costs")
        .select("id, cost_type, description, amount, units, created_at")
        .eq("fulfillment_id", fulfillmentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCosts(data || []);
    } catch (error: any) {
      console.error("Failed to load costs:", error);
    }
  };

  const handleAddCostItem = () => {
    setCostItems([...costItems, { cost_type: "", description: "", amount: "", units: "1" }]);
  };

  const handleRemoveCostItem = (index: number) => {
    setCostItems(costItems.filter((_, i) => i !== index));
  };

  const handleCostItemChange = (index: number, field: keyof NewCostItem, value: string) => {
    const updated = [...costItems];
    updated[index][field] = value;
    setCostItems(updated);
  };

  const handleAddAllCosts = async () => {
    if (!selectedJob || costItems.length === 0) {
      toast.error("Please add at least one cost item");
      return;
    }

    const invalidItems = costItems.some(
      (item) => !item.cost_type || !item.description || !item.amount || !item.units
    );
    if (invalidItems) {
      toast.error("Please fill in all fields for each cost item");
      return;
    }

    setAddingCost(true);
    try {
      const costsToInsert = costItems.map((item) => ({
        claim_id: selectedJob.claim_id,
        fulfillment_id: selectedJob.id,
        cost_type: item.cost_type,
        description: item.description,
        amount: parseFloat(item.amount),
        units: parseInt(item.units),
        added_by: user?.id,
      }));

      const { error } = await supabase.from("repair_costs").insert(costsToInsert);

      if (error) throw error;

      toast.success(`${costItems.length} cost(s) added successfully`);
      setCostItems([]);
      fetchCosts(selectedJob.id);
      // Recalculate quote amount after adding costs
      await recalculateQuoteAmount();
    } catch (error: any) {
      toast.error("Failed to add costs: " + error.message);
    } finally {
      setAddingCost(false);
    }
  };

  const recalculateQuoteAmount = async () => {
    if (!selectedJob) return;

    try {
      // Get all costs for this fulfillment
      const { data: allCosts, error: costsError } = await supabase
        .from("repair_costs")
        .select("amount")
        .eq("fulfillment_id", selectedJob.id);

      if (costsError) throw costsError;

      const totalAmount = (allCosts || []).reduce((sum, cost) => sum + cost.amount, 0);

      // Update the quote amount in fulfillment
      const { error: updateError } = await supabase
        .from("claim_fulfillment")
        .update({ quote_amount: totalAmount })
        .eq("id", selectedJob.id);

      if (updateError) throw updateError;

      // Update local state
      setQuoteAmount(totalAmount.toString());
    } catch (error: any) {
      console.error("Failed to recalculate quote:", error);
    }
  };

  const handleUploadPhotos = async () => {
    if (!selectedJob || inspectionPhotos.length === 0) {
      toast.error("Please select photos to upload");
      return;
    }

    setUploadingPhotos(true);
    try {
      const uploadedPaths: string[] = selectedJob.inspection_photos || [];

      for (const photo of inspectionPhotos) {
        const fileExt = photo.name.split('.').pop();
        const fileName = `${selectedJob.claim_id}/photos/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('inspection-photos')
          .upload(fileName, photo);

        if (uploadError) throw uploadError;
        uploadedPaths.push(fileName);
      }

      // Update fulfillment with photo paths
      const { error: updateError } = await supabase
        .from("claim_fulfillment")
        .update({
          inspection_photos: uploadedPaths,
        })
        .eq("id", selectedJob.id);

      if (updateError) throw updateError;

      toast.success(`${inspectionPhotos.length} photo(s) uploaded successfully`);
      setInspectionPhotos([]);
      fetchJobs();
    } catch (error: any) {
      toast.error("Failed to upload photos: " + error.message);
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleUploadReport = async () => {
    if (!selectedJob || reportFiles.length === 0) {
      toast.error("Please select report files to upload");
      return;
    }

    setUploadingReport(true);
    try {
      const uploadedPaths: string[] = selectedJob.repairer_report || [];

      for (const file of reportFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${selectedJob.claim_id}/reports/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('inspection-photos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;
        uploadedPaths.push(fileName);
      }

      // Update fulfillment with report paths
      const { error: updateError } = await supabase
        .from("claim_fulfillment")
        .update({
          repairer_report: uploadedPaths,
        })
        .eq("id", selectedJob.id);

      if (updateError) throw updateError;

      toast.success(`${reportFiles.length} report file(s) uploaded successfully`);
      setReportFiles([]);
      fetchJobs();
    } catch (error: any) {
      toast.error("Failed to upload report: " + error.message);
    } finally {
      setUploadingReport(false);
    }
  };

  const handleSubmitQuote = async () => {
    if (!selectedJob || !inspectionNotes) {
      toast.error("Please fill in inspection notes");
      return;
    }

    // Calculate total from costs
    const totalCosts = costs.reduce((sum, cost) => sum + cost.amount, 0);
    
    if (totalCosts === 0) {
      toast.error("Please add cost items before submitting quote");
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from("claim_fulfillment")
        .update({
          quote_amount: totalCosts,
          quote_status: "pending",
          inspection_notes: inspectionNotes,
          status: "awaiting_quote_approval",
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedJob.id);

      if (error) throw error;

      // Update claim status
      await supabase
        .from("claims")
        .update({ status: "estimate_received" })
        .eq("id", selectedJob.claim_id);

      toast.success("Quote submitted for approval");
      fetchJobs();
      setSelectedJob(null);
    } catch (error: any) {
      toast.error("Failed to submit quote: " + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkReceived = async () => {
    if (!selectedJob) return;
    
    setUpdating(true);
    try {
      await supabase
        .from("claim_fulfillment")
        .update({
          status: "received",
          notes: "Device received at repair center",
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedJob.id);

      await supabase
        .from("claims")
        .update({ status: "inbound_logistics" })
        .eq("id", selectedJob.claim_id);

      toast.success("Device marked as received");
      fetchJobs();
      setSelectedJob(null);
    } catch (error: any) {
      toast.error("Failed to update: " + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkInRepair = async () => {
    if (!selectedJob) return;
    
    setUpdating(true);
    try {
      await supabase
        .from("claim_fulfillment")
        .update({
          status: "in_repair",
          notes: "Repair in progress",
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedJob.id);

      await supabase
        .from("claims")
        .update({ status: "repair" })
        .eq("id", selectedJob.claim_id);

      toast.success("Marked as in repair");
      fetchJobs();
      setSelectedJob(null);
    } catch (error: any) {
      toast.error("Failed to update: " + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleRecordOutcome = async () => {
    if (!selectedJob || !repairOutcome) {
      toast.error("Please select a repair outcome");
      return;
    }

    if (repairOutcome === "ber" && !berReason) {
      toast.error("Please provide a reason for BER");
      return;
    }

    setUpdating(true);
    try {
      const updates: any = {
        repair_outcome: repairOutcome,
        ber_reason: repairOutcome === "ber" ? berReason : null,
        status: repairOutcome === "fixed" ? "repaired" : "ber",
        updated_at: new Date().toISOString(),
      };

      await supabase
        .from("claim_fulfillment")
        .update(updates)
        .eq("id", selectedJob.id);

      // Update claim status
      const claimStatus = repairOutcome === "fixed" ? "outbound_logistics" : "fulfillment_outcome";
      await supabase
        .from("claims")
        .update({ status: claimStatus })
        .eq("id", selectedJob.claim_id);

      toast.success("Repair outcome recorded");
      fetchJobs();
      setSelectedJob(null);
    } catch (error: any) {
      toast.error("Failed to record outcome: " + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleInspectionComplete = async () => {
    if (!selectedJob || !inspectionNotes) {
      toast.error("Please add inspection notes");
      return;
    }

    setUpdating(true);
    try {
      // First, upload any selected photos
      let uploadedPhotoPaths: string[] = selectedJob.inspection_photos || [];
      if (inspectionPhotos.length > 0) {
        for (const photo of inspectionPhotos) {
          const fileExt = photo.name.split('.').pop();
          const fileName = `${selectedJob.claim_id}/photos/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('inspection-photos')
            .upload(fileName, photo);

          if (uploadError) {
            console.error("Photo upload error:", uploadError);
          } else {
            uploadedPhotoPaths.push(fileName);
          }
        }
      }

      // Upload any selected report files
      let uploadedReportPaths: string[] = selectedJob.repairer_report || [];
      if (reportFiles.length > 0) {
        for (const file of reportFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${selectedJob.claim_id}/reports/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('inspection-photos')
            .upload(fileName, file);

          if (uploadError) {
            console.error("Report upload error:", uploadError);
          } else {
            uploadedReportPaths.push(fileName);
          }
        }
      }

      // Update fulfillment with all data
      await supabase
        .from("claim_fulfillment")
        .update({
          status: "inspection_complete",
          inspection_notes: inspectionNotes,
          inspection_photos: uploadedPhotoPaths.length > 0 ? uploadedPhotoPaths : null,
          repairer_report: uploadedReportPaths.length > 0 ? uploadedReportPaths : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedJob.id);

      toast.success("Inspection marked as complete");
      setInspectionPhotos([]);
      setReportFiles([]);
      fetchJobs();
      setSelectedJob(null);
    } catch (error: any) {
      toast.error("Failed to update: " + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateJobStatus = async () => {
    if (!selectedJob) return;
    
    setUpdating(true);
    try {
      await supabase
        .from("claim_fulfillment")
        .update({
          status: jobStatus,
          notes: jobNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedJob.id);

      toast.success("Job status updated");
      fetchJobs();
      setSelectedJob(null);
    } catch (error: any) {
      toast.error("Failed to update job: " + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkDispatched = async () => {
    if (!selectedJob) return;
    
    setUpdating(true);
    try {
      await supabase
        .from("claim_fulfillment")
        .update({
          status: "dispatched",
          logistics_reference: outboundLogisticsRef || null,
          notes: `Device dispatched for return to customer${outboundLogisticsRef ? ` - Tracking: ${outboundLogisticsRef}` : ''}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedJob.id);

      await supabase
        .from("claims")
        .update({ status: "outbound_logistics" })
        .eq("id", selectedJob.claim_id);

      toast.success("Device marked as dispatched");
      fetchJobs();
      setSelectedJob(null);
    } catch (error: any) {
      toast.error("Failed to update: " + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending_excess: "outline",
      scheduled: "secondary",
      received: "default",
      in_repair: "default",
      repaired: "default",
      ber: "destructive",
      inspection_complete: "secondary",
      awaiting_quote_approval: "outline",
      quote_approved: "default",
      repair_scheduled: "secondary",
      completed: "default",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{formatStatus(status)}</Badge>;
  };

  const getFulfillmentIcon = (type: string) => {
    return type === "engineer_visit" ? <Wrench className="h-5 w-5" /> : <Package className="h-5 w-5" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading jobs...</p>
        </div>
      </div>
    );
  }

  if (selectedJob) {
    const claim = selectedJob.claims;
    const policy = claim?.policies;

    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Button variant="ghost" onClick={() => setSelectedJob(null)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Jobs
        </Button>

        {/* Header Card with Status Update */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                {getFulfillmentIcon(selectedJob.fulfillment_type || "")}
                <div>
                  <CardTitle>{claim?.claim_number}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {policy?.customer_name} • {policy?.policy_number}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-2 min-w-[200px]">
                  <Label className="text-xs text-muted-foreground">Update Status</Label>
                  <Select value={jobStatus} onValueChange={setJobStatus}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {/* Common statuses for all types */}
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      
                      {/* In-Home Repair specific statuses */}
                      {selectedJob.fulfillment_type === "in_home_repair" && (
                        <>
                          <SelectItem value="awaiting_appointment">Awaiting Appointment</SelectItem>
                          <SelectItem value="inspection_complete">Inspection Complete</SelectItem>
                          <SelectItem value="awaiting_quote_approval">Awaiting Quote Approval</SelectItem>
                          <SelectItem value="quote_approved">Quote Approved</SelectItem>
                          <SelectItem value="repair_scheduled">Repair Scheduled</SelectItem>
                          <SelectItem value="repaired">Repaired</SelectItem>
                        </>
                      )}
                      
                      {/* Collection/Drop-off Repair specific statuses */}
                      {selectedJob.fulfillment_type === "collection_repair" && (
                        <>
                          <SelectItem value="pending_excess">Pending Excess Payment</SelectItem>
                          <SelectItem value="received">Received at Repair Center</SelectItem>
                          <SelectItem value="in_repair">In Repair</SelectItem>
                          <SelectItem value="repaired">Repaired</SelectItem>
                          <SelectItem value="dispatched">Dispatched to Customer</SelectItem>
                          <SelectItem value="ber">Beyond Economic Repair</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleUpdateJobStatus} 
                  disabled={updating}
                  className="mt-5"
                  size="sm"
                >
                  {updating ? "Updating..." : "Update"}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tabbed Interface */}
        <Tabs defaultValue="details" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="details">
              <Clipboard className="h-4 w-4 mr-2" />
              Details
            </TabsTrigger>
            <TabsTrigger value="inspection">
              <Camera className="h-4 w-4 mr-2" />
              Inspection
            </TabsTrigger>
            <TabsTrigger value="costs">
              <Wrench className="h-4 w-4 mr-2" />
              Costs & Quote
            </TabsTrigger>
            <TabsTrigger value="actions">
              <Package className="h-4 w-4 mr-2" />
              Actions
            </TabsTrigger>
            <TabsTrigger value="chat">
              <MessageSquare className="h-4 w-4 mr-2" />
              Communication
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Job & Customer Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Job Details and Customer Info Side by Side */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Job Details */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg mb-3">Job Information</h3>
                    <div>
                      <Label className="text-muted-foreground">Fulfillment Type</Label>
                      <p className="font-medium capitalize">
                        {selectedJob.fulfillment_type?.replace(/_/g, " ") || "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Claim Type</Label>
                      <p className="font-medium capitalize">{claim?.claim_type}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Device Value</Label>
                      <p className="font-medium">{selectedJob.device_value?.toFixed(2) || "0.00"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Excess Amount</Label>
                      <div className="font-medium flex items-center gap-2">
                        <span>{selectedJob.excess_amount?.toFixed(2) || "0.00"}</span>
                        {selectedJob.excess_paid && <Badge>Paid</Badge>}
                      </div>
                    </div>
                    {selectedJob.appointment_date && (
                      <div>
                        <Label className="text-muted-foreground">Appointment</Label>
                        <p className="font-medium">
                          {format(new Date(selectedJob.appointment_date), "dd MMM yyyy")}
                          {selectedJob.appointment_slot && ` - ${selectedJob.appointment_slot}`}
                        </p>
                      </div>
                    )}
                    {selectedJob.engineer_reference && (
                      <div>
                        <Label className="text-muted-foreground">Engineer Reference</Label>
                        <p className="font-medium">{selectedJob.engineer_reference}</p>
                      </div>
                    )}
                    {selectedJob.logistics_reference && (
                      <div>
                        <Label className="text-muted-foreground">Logistics Reference</Label>
                        <p className="font-medium">{selectedJob.logistics_reference}</p>
                      </div>
                    )}
                  </div>

                  {/* Customer Information */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Customer Information
                    </h3>
                    <div>
                      <Label className="text-muted-foreground">Name</Label>
                      <p className="font-medium">{policy?.customer_name || "Not provided"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground flex items-center gap-2">
                        <Phone className="h-3 w-3" />
                        Phone
                      </Label>
                      <p className="font-medium">{policy?.customer_phone || "Not provided"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground flex items-center gap-2">
                        <Mail className="h-3 w-3" />
                        Email
                      </Label>
                      <p className="font-medium">{policy?.customer_email || "Not provided"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Address</Label>
                      <p className="font-medium">
                        {policy?.customer_address_line1 || "Not provided"}
                        {policy?.customer_address_line2 && `, ${policy.customer_address_line2}`}
                        {(policy?.customer_city || policy?.customer_postcode) && (
                          <>
                            <br />
                            {policy?.customer_city}{policy?.customer_city && policy?.customer_postcode && ", "}{policy?.customer_postcode}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Claim Description */}
                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">Claim Description</h3>
                  <p className="text-muted-foreground">{claim?.description}</p>
                </div>

                {/* Damage Details */}
                {claim?.product_condition && (
                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-4">Damage Details / Product Condition</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{claim.product_condition}</p>
                  </div>
                )}

                {/* General Job Notes Section */}
                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">Job Notes</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Use this section to keep general notes about the job (not tied to status updates)
                  </p>
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                    <div>
                      <Label>Notes</Label>
                      <Textarea
                        value={jobNotes}
                        onChange={(e) => setJobNotes(e.target.value)}
                        placeholder="Add any notes about this job..."
                        rows={4}
                      />
                    </div>
                    <Button onClick={handleUpdateJobStatus} disabled={updating} variant="outline">
                      {updating ? "Saving..." : "Save Notes"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Costs & Quote Tab */}
          <TabsContent value="costs">
            <Card>
              <CardHeader>
                <CardTitle>Repair Costs & Quote</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">Repair Costs</h3>
                  
                  {/* Existing Costs */}
                  {costs.length > 0 && (
                    <div className="mb-6 space-y-3">
                      {costs.map((cost) => (
                        <div key={cost.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium capitalize">{cost.cost_type.replace(/_/g, " ")}</p>
                            <p className="text-sm text-muted-foreground">
                              {cost.description} {cost.units && `(${cost.units} units)`}
                            </p>
                          </div>
                          <p className="font-semibold text-lg">{cost.amount.toFixed(2)}</p>
                        </div>
                      ))}
                      <div className="flex justify-end pt-2 border-t">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Subtotal</p>
                          <p className="text-2xl font-bold text-primary">
                            {costs.reduce((sum, cost) => sum + cost.amount, 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

              {/* Add New Costs */}
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Add Cost Items</h4>
                  <Button variant="outline" size="sm" onClick={handleAddCostItem}>
                    Add Line
                  </Button>
                </div>

                {costItems.length > 0 && (
                  <div className="space-y-3">
                    {costItems.map((item, index) => (
                      <div key={index} className="grid md:grid-cols-12 gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="md:col-span-2">
                          <Label className="text-xs">Type</Label>
                          <Select
                            value={item.cost_type}
                            onValueChange={(value) => handleCostItemChange(index, "cost_type", value)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              <SelectItem value="labour">Labour</SelectItem>
                              <SelectItem value="parts">Parts</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-4">
                          <Label className="text-xs">Description</Label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleCostItemChange(index, "description", e.target.value)}
                            placeholder="Description"
                            className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-xs">Units</Label>
                          <input
                            type="number"
                            min="1"
                            value={item.units}
                            onChange={(e) => handleCostItemChange(index, "units", e.target.value)}
                            className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <Label className="text-xs">Amount</Label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.amount}
                            onChange={(e) => handleCostItemChange(index, "amount", e.target.value)}
                            placeholder="0.00"
                            className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                          />
                        </div>
                        <div className="md:col-span-1 flex items-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveCostItem(index)}
                            className="h-9 w-full"
                          >
                            ✕
                          </Button>
                        </div>
                      </div>
                    ))}

                    <div className="flex justify-end">
                      <Button onClick={handleAddAllCosts} disabled={addingCost}>
                        {addingCost ? "Adding..." : `Add ${costItems.length} Cost(s)`}
                      </Button>
                    </div>
                  </div>
                )}

                {costItems.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Click "Add Line" to start adding cost items
                  </p>
                )}
              </div>
            </div>

            {/* Collection Repair - Outbound Logistics */}
            {selectedJob.fulfillment_type === "collection_repair" && selectedJob.status === "repaired" && (
              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Outbound Logistics</h3>
                <div className="space-y-3 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                  <p className="text-sm text-muted-foreground">
                    Device has been repaired and is ready for return to customer
                  </p>
                  <div>
                    <Label>Logistics/Tracking Reference (Optional)</Label>
                    <Input
                      value={outboundLogisticsRef}
                      onChange={(e) => setOutboundLogisticsRef(e.target.value)}
                      placeholder="Enter tracking number..."
                    />
                  </div>
                  <Button onClick={handleMarkDispatched} disabled={updating}>
                    {updating ? "Processing..." : "Mark as Dispatched to Customer"}
                  </Button>
                </div>
              </div>
            )}

            {selectedJob.status === "dispatched" && (
              <div className="border-t pt-6">
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <p className="font-medium text-green-700 dark:text-green-400">
                    ✓ Device Dispatched to Customer
                  </p>
                  {selectedJob.logistics_reference && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Tracking: {selectedJob.logistics_reference}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Inspection Tab */}
      <TabsContent value="inspection">
        <Card>
          <CardHeader>
            <CardTitle>Inspection & Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Inspection Notes */}
            <div>
              <Label>Inspection Notes</Label>
              <Textarea
                value={inspectionNotes}
                onChange={(e) => setInspectionNotes(e.target.value)}
                placeholder="Detailed inspection findings..."
                rows={4}
              />
            </div>
            
            {/* Device Photos Section */}
            <div className="p-4 border rounded-lg space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Device Photos
              </h4>
              <p className="text-sm text-muted-foreground">
                Upload photos of the device showing its condition
              </p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files) {
                    setInspectionPhotos(Array.from(e.target.files));
                  }
                }}
                className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              {inspectionPhotos.length > 0 && (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">
                    {inspectionPhotos.length} photo(s) selected
                  </p>
                  <Button size="sm" onClick={handleUploadPhotos} disabled={uploadingPhotos}>
                    {uploadingPhotos ? "Uploading..." : "Upload Photos"}
                  </Button>
                </div>
              )}
              {selectedJob.inspection_photos && selectedJob.inspection_photos.length > 0 && (
                <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    ✓ {selectedJob.inspection_photos.length} device photo(s) uploaded
                  </p>
                </div>
              )}
            </div>

            {/* Repairer Report Section */}
            <div className="p-4 border rounded-lg space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Clipboard className="h-4 w-4" />
                Repairer Report
              </h4>
              <p className="text-sm text-muted-foreground">
                Upload inspection report (photos or PDF)
              </p>
              <input
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={(e) => {
                  if (e.target.files) {
                    setReportFiles(Array.from(e.target.files));
                  }
                }}
                className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              {reportFiles.length > 0 && (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">
                    {reportFiles.length} file(s) selected
                  </p>
                  <Button size="sm" onClick={handleUploadReport} disabled={uploadingReport}>
                    {uploadingReport ? "Uploading..." : "Upload Report"}
                  </Button>
                </div>
              )}
              {selectedJob.repairer_report && selectedJob.repairer_report.length > 0 && (
                <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    ✓ {selectedJob.repairer_report.length} report file(s) uploaded
                  </p>
                </div>
              )}
            </div>

            {selectedJob.status !== "inspection_complete" && inspectionNotes && (
              <Button onClick={handleInspectionComplete} disabled={updating}>
                Mark Inspection as Complete
              </Button>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Communication Tab */}
      <TabsContent value="chat">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Communication with Claims Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RepairerClaimsChat
              claimId={selectedJob.claim_id}
              userRole="repairer_agent"
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Actions Tab */}
      <TabsContent value="actions">
        <Card>
          <CardHeader>
            <CardTitle>Workflow Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="outline">Current Status:</Badge>
              {getStatusBadge(selectedJob.status)}
            </div>

            {/* Collection/Drop-off Flow */}
            {selectedJob.fulfillment_type === "collection_repair" && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <h4 className="font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Collection & Repair Workflow
                </h4>
                <div className="grid gap-2">
                  {selectedJob.status === "scheduled" && (
                    <Button onClick={handleMarkReceived} disabled={updating}>
                      Mark as Received at Repair Center
                    </Button>
                  )}
                  {selectedJob.status === "received" && (
                    <Button onClick={handleMarkInRepair} disabled={updating}>
                      Mark as In Repair
                    </Button>
                  )}
                  {selectedJob.status === "in_repair" && (
                    <div className="space-y-3">
                      <Label>Record Repair Outcome</Label>
                      <Select value={repairOutcome} onValueChange={setRepairOutcome}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select outcome..." />
                        </SelectTrigger>
                        <SelectContent className="bg-background">
                          <SelectItem value="fixed">✓ Fixed Successfully</SelectItem>
                          <SelectItem value="not_fixed">✗ Not Fixed</SelectItem>
                          <SelectItem value="ber">⚠ Beyond Economic Repair (BER)</SelectItem>
                        </SelectContent>
                      </Select>
                      {repairOutcome === "ber" && (
                        <Textarea
                          value={berReason}
                          onChange={(e) => setBerReason(e.target.value)}
                          placeholder="Explain why device is BER..."
                          rows={3}
                        />
                      )}
                      {repairOutcome && (
                        <Button onClick={handleRecordOutcome} disabled={updating}>
                          {updating ? "Recording..." : "Record Outcome"}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* In-Home Inspection Flow */}
            {selectedJob.fulfillment_type === "in_home_repair" && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                <h4 className="font-medium flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  In-Home Repair Workflow
                </h4>
                <div className="space-y-4">
                  {selectedJob.status === "inspection_complete" && (
                    <Button onClick={handleSubmitQuote} disabled={updating || costs.length === 0}>
                      {updating ? "Submitting..." : "Submit Quote for Approval"}
                    </Button>
                  )}

                  {selectedJob.status === "awaiting_quote_approval" && (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                      <p className="font-medium">⏳ Waiting for Quote Approval</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Quote: €{selectedJob.quote_amount?.toFixed(2)}
                        {selectedJob.device_value && selectedJob.device_value > 0 && selectedJob.quote_amount && (
                          <span className="ml-2 text-xs">
                            ({((selectedJob.quote_amount / selectedJob.device_value) * 100).toFixed(0)}% of device value)
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {selectedJob.quote_status === "rejected" && (
                    <div className="space-y-4">
                      <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                        <p className="font-medium text-red-700 dark:text-red-400">
                          ✗ Quote Rejected
                        </p>
                        {selectedJob.quote_rejection_reason && (
                          <p className="text-sm text-muted-foreground mt-2">
                            <span className="font-medium">Reason:</span> {selectedJob.quote_rejection_reason}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-2">
                          Previous quote amount: €{selectedJob.quote_amount?.toFixed(2)}
                          {selectedJob.device_value && selectedJob.device_value > 0 && selectedJob.quote_amount && (
                            <span className="ml-1">
                              ({((selectedJob.quote_amount / selectedJob.device_value) * 100).toFixed(0)}% of device value)
                            </span>
                          )}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        You can revise the costs in the "Costs & Quote" tab and submit a new quote.
                      </p>
                      <Button onClick={handleSubmitQuote} disabled={updating || costs.length === 0}>
                        {updating ? "Submitting..." : "Submit Revised Quote"}
                      </Button>
                    </div>
                  )}

                  {(selectedJob.status === "quote_approved" || selectedJob.quote_status === "approved") && (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                        <p className="font-medium text-green-700 dark:text-green-400">
                          ✓ Quote Approved - Proceed with Repair
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Approved amount: €{selectedJob.quote_amount?.toFixed(2)}
                          {selectedJob.device_value && selectedJob.device_value > 0 && selectedJob.quote_amount && (
                            <span className="ml-1">
                              ({((selectedJob.quote_amount / selectedJob.device_value) * 100).toFixed(0)}% of device value)
                            </span>
                          )}
                        </p>
                      </div>
                      
                      <div className="p-4 border rounded-lg bg-muted/30">
                        <p className="font-medium mb-2">Found Additional Costs?</p>
                        <p className="text-sm text-muted-foreground mb-3">
                          If you've discovered additional issues during repair, you can add new costs in the "Costs & Quote" tab and submit a revised quote for re-approval.
                        </p>
                        <Button 
                          variant="outline" 
                          onClick={handleSubmitQuote} 
                          disabled={updating || costs.length === 0}
                        >
                          {updating ? "Submitting..." : "Submit Revised Quote for Re-Approval"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
    );
  }

  const totalJobs = jobs.length;
  const pendingJobs = jobs.filter((j) => j.status === "pending_excess").length;
  const scheduledJobs = jobs.filter((j) => j.status === "scheduled").length;
  const inProgressJobs = jobs.filter((j) => j.status === "in_progress").length;
  const completedJobs = jobs.filter((j) => j.status === "completed").length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Repair Jobs</h1>
          <p className="text-muted-foreground">
            Manage your assigned fulfillment jobs and appointments
          </p>
        </div>
      </div>

      {/* Management Information Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalJobs}</div>
            <p className="text-xs text-muted-foreground">Total Jobs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{pendingJobs}</div>
            <p className="text-xs text-muted-foreground">Pending Excess</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{scheduledJobs}</div>
            <p className="text-xs text-muted-foreground">Scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{inProgressJobs}</div>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{completedJobs}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Jobs Assigned</h3>
            <p className="text-muted-foreground text-center">
              You don't have any repair jobs assigned to you yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => {
            const claim = job.claims;
            const policy = claim?.policies;
            
            return (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getFulfillmentIcon(job.fulfillment_type || "")}
                      <div>
                        <h3 className="font-semibold">{claim?.claim_number}</h3>
                        <p className="text-sm text-muted-foreground capitalize">
                          {job.fulfillment_type?.replace(/_/g, " ") || "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(job.status)}
                      {job.repairer_id === user?.id && (
                        <Badge variant="default" className="text-xs">Assigned to me</Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <Label className="text-muted-foreground text-xs">Customer</Label>
                      <p className="font-medium text-sm">{policy?.customer_name}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground text-xs">Location</Label>
                      <p className="font-medium text-sm">
                        {policy?.customer_city}, {policy?.customer_postcode}
                      </p>
                    </div>
                    {job.appointment_date && (
                      <div>
                        <Label className="text-muted-foreground text-xs">Appointment</Label>
                        <p className="font-medium text-sm">
                          {format(new Date(job.appointment_date), "dd MMM yyyy")}
                          {job.appointment_slot && ` - ${job.appointment_slot}`}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Created {format(new Date(job.created_at), "dd MMM yyyy")}
                    </p>
                    <Button onClick={() => handleSelectJob(job)} size="sm">
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
