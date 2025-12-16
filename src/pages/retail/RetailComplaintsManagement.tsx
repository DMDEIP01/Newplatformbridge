import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { ArrowLeft, AlertCircle, CheckCircle, Clock, UserCircle, TrendingUp, MessageSquare, FileText, Activity, Mail, MailCheck, X, Plus, Search } from "lucide-react";
import { PolicyCommunications } from "@/components/PolicyCommunications";

interface Complaint {
  id: string;
  complaint_reference: string;
  policy_id: string;
  customer_name: string;
  customer_email: string;
  complaint_type: string;
  reason: string;
  details: string;
  status: string;
  classification: string | null;
  response: string | null;
  response_date: string | null;
  created_at: string;
  reviewed_at: string | null;
  assigned_to: string | null;
  notes: string | null;
  policies?: {
    customer_phone: string | null;
    customer_address_line1: string | null;
    customer_address_line2: string | null;
    customer_city: string | null;
    customer_postcode: string | null;
  };
}

interface ActivityLog {
  id: string;
  action_type: string;
  action_details: string | null;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  user_name: string;
  created_at: string;
}

interface Agent {
  id: string;
  full_name: string;
  email: string;
}

interface ComplaintMetrics {
  total: number;
  open: number;
  outOfSLA: number;
  awaitingResponse: number;
  regulatory: number;
}

export default function RetailComplaintsManagement() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [classification, setClassification] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [responseType, setResponseType] = useState<string>("");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [updating, setUpdating] = useState(false);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ComplaintMetrics>({
    total: 0,
    open: 0,
    outOfSLA: 0,
    awaitingResponse: 0,
    regulatory: 0,
  });

  // Create complaint dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchingPolicy, setSearchingPolicy] = useState(false);
  const [policySearchTerm, setPolicySearchTerm] = useState("");
  const [foundPolicy, setFoundPolicy] = useState<any>(null);
  const [newComplaint, setNewComplaint] = useState({
    customerName: "",
    customerEmail: "",
    reason: "",
    details: "",
  });
  const [creatingComplaint, setCreatingComplaint] = useState(false);

  useEffect(() => {
    fetchComplaints();
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      // Query profiles directly; RLS allows agents/admins to see other agents/admins
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name", { ascending: true });

      if (profileError) throw profileError;
      setAgents(profileData || []);
    } catch (error: any) {
      console.error("Failed to load agents:", error);
    }
  };

  const calculateMetrics = (complaintsData: Complaint[]) => {
    const now = new Date();
    const SLA_DAYS = 8; // 8 weeks for regulatory complaints

    const metrics: ComplaintMetrics = {
      total: complaintsData.length,
      open: 0,
      outOfSLA: 0,
      awaitingResponse: 0,
      regulatory: 0,
    };

    complaintsData.forEach((complaint) => {
      // Count open complaints
      if (complaint.status !== "closed" && complaint.status !== "resolved") {
        metrics.open++;
      }

      // Count awaiting response
      if (
        complaint.status === "classified" ||
        complaint.status === "under_review"
      ) {
        metrics.awaitingResponse++;
      }

      // Count regulatory
      if (complaint.classification === "regulatory") {
        metrics.regulatory++;

        // Check if out of SLA (8 weeks for regulatory)
        const daysSinceCreation = differenceInDays(
          now,
          new Date(complaint.created_at)
        );
        if (
          daysSinceCreation > SLA_DAYS * 7 &&
          complaint.status !== "closed" &&
          complaint.status !== "resolved"
        ) {
          metrics.outOfSLA++;
        }
      }
    });

    setMetrics(metrics);
  };

  const fetchComplaints = async () => {
    try {
      const { data, error } = await supabase
        .from("complaints")
        .select(`
          *,
          policies (
            customer_phone,
            customer_address_line1,
            customer_address_line2,
            customer_city,
            customer_postcode
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComplaints(data || []);
      calculateMetrics(data || []);
    } catch (error: any) {
      toast.error("Failed to load complaints: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityLog = async (complaintId: string) => {
    try {
      const { data, error } = await supabase
        .from("complaint_activity_log")
        .select("*")
        .eq("complaint_id", complaintId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setActivityLog(data || []);
    } catch (error: any) {
      console.error("Failed to load activity log:", error);
    }
  };

  const handleSelectComplaint = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setClassification(complaint.classification || "");
    setStatus(complaint.status);
    setResponse(complaint.response || "");
    setResponseType("");
    setAssignedTo(complaint.assigned_to || "unassigned");
    setNotes(complaint.notes || "");
    fetchActivityLog(complaint.id);
  };

  const hasUnsavedChanges = () => {
    if (!selectedComplaint) return false;
    
    return (
      status !== selectedComplaint.status ||
      (classification || null) !== selectedComplaint.classification ||
      response !== (selectedComplaint.response || "") ||
      notes !== (selectedComplaint.notes || "") ||
      (assignedTo === "unassigned" ? null : assignedTo) !== selectedComplaint.assigned_to
    );
  };

  const handleBackToList = () => {
    if (hasUnsavedChanges()) {
      if (window.confirm("You have unsaved changes. Are you sure you want to leave?")) {
        setSelectedComplaint(null);
        setClassification("");
        setStatus("");
        setResponse("");
        setResponseType("");
        setAssignedTo("");
        setNotes("");
        setActivityLog([]);
      }
    } else {
      setSelectedComplaint(null);
      setClassification("");
      setStatus("");
      setResponse("");
      setResponseType("");
      setAssignedTo("");
      setNotes("");
      setActivityLog([]);
    }
  };

  const logActivity = async (
    complaintId: string,
    actionType: string,
    actionDetails: string,
    fieldChanged?: string,
    oldValue?: string,
    newValue?: string
  ) => {
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user?.id)
        .single();

      await supabase.from("complaint_activity_log").insert({
        complaint_id: complaintId,
        user_id: user?.id,
        user_name: profileData?.full_name || "Unknown User",
        action_type: actionType,
        action_details: actionDetails,
        field_changed: fieldChanged,
        old_value: oldValue,
        new_value: newValue,
      });
    } catch (error: any) {
      console.error("Failed to log activity:", error);
    }
  };

  const handleUpdateComplaint = async () => {
    if (!selectedComplaint || !user) return;

    setUpdating(true);
    try {
      const updates: any = {
        classification: classification || null,
        status,
        response,
        notes,
        assigned_to: assignedTo === "unassigned" ? null : assignedTo,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
      };

      // If responding for the first time, set response_date
      if (response && !selectedComplaint.response_date) {
        updates.response_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from("complaints")
        .update(updates)
        .eq("id", selectedComplaint.id);

      if (error) throw error;

      // Log activities for changed fields
      const activityPromises = [];
      
      if (status !== selectedComplaint.status) {
        activityPromises.push(
          logActivity(
            selectedComplaint.id,
            "status_changed",
            `Status changed from "${selectedComplaint.status}" to "${status}"`,
            "status",
            selectedComplaint.status,
            status
          )
        );
      }

      if (classification !== selectedComplaint.classification) {
        activityPromises.push(
          logActivity(
            selectedComplaint.id,
            "classification_changed",
            `Classification updated to "${classification}"`,
            "classification",
            selectedComplaint.classification || "",
            classification
          )
        );
      }

      if (response && response !== selectedComplaint.response) {
        activityPromises.push(
          logActivity(
            selectedComplaint.id,
            "response_added",
            "Customer response added"
          )
        );
      }

      if (notes !== selectedComplaint.notes) {
        activityPromises.push(
          logActivity(
            selectedComplaint.id,
            "notes_updated",
            "Internal notes updated"
          )
        );
      }

      const newAssignee = assignedTo === "unassigned" ? null : assignedTo;
      if (newAssignee !== selectedComplaint.assigned_to) {
        const agentName = agents.find(a => a.id === newAssignee)?.full_name || "Unassigned";
        activityPromises.push(
          logActivity(
            selectedComplaint.id,
            "assigned",
            `Complaint assigned to ${agentName}`,
            "assigned_to",
            selectedComplaint.assigned_to || "",
            newAssignee || ""
          )
        );
      }

      await Promise.all(activityPromises);

      toast.success("Complaint updated successfully");
      handleBackToList();
      fetchComplaints();
    } catch (error: any) {
      toast.error("Failed to update complaint: " + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      submitted: { variant: "secondary", label: "Submitted" },
      under_review: { variant: "default", label: "Under Review" },
      classified: { variant: "default", label: "Classified" },
      responded: { variant: "default", label: "Responded" },
      closed: { variant: "outline", label: "Closed" },
    };

    const config = variants[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getClassificationBadge = (classification: string | null) => {
    if (!classification) return <Badge variant="outline">Unclassified</Badge>;
    
    return classification === "regulatory" ? (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="h-3 w-3" />
        Regulatory
      </Badge>
    ) : (
      <Badge variant="secondary" className="gap-1">
        <CheckCircle className="h-3 w-3" />
        Non-Regulatory
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-muted-foreground">Loading complaints...</div>
      </div>
    );
  }

  const getAgentName = (agentId: string | null) => {
    if (!agentId) return "Unassigned";
    const agent = agents.find((a) => a.id === agentId);
    return agent ? agent.full_name : "Unknown";
  };

  const getFilteredComplaints = () => {
    if (!activeFilter) return complaints;

    const now = new Date();
    const SLA_DAYS = 8 * 7; // 8 weeks in days

    switch (activeFilter) {
      case "open":
        return complaints.filter(
          (c) => c.status !== "closed" && c.status !== "resolved"
        );
      case "outOfSLA":
        return complaints.filter((c) => {
          if (c.classification !== "regulatory") return false;
          if (c.status === "closed" || c.status === "resolved") return false;
          const daysSinceCreation = differenceInDays(now, new Date(c.created_at));
          return daysSinceCreation > SLA_DAYS;
        });
      case "awaitingResponse":
        return complaints.filter(
          (c) => c.status === "classified" || c.status === "under_review"
        );
      case "regulatory":
        return complaints.filter((c) => c.classification === "regulatory");
      case "total":
      default:
        return complaints;
    }
  };

  const filteredComplaints = getFilteredComplaints();

  // If a complaint is selected, show the detail view
  if (selectedComplaint) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBackToList}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Review Complaint</h1>
            <p className="text-muted-foreground mt-2">
              Classify and respond to the customer complaint
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5" />
                Customer Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-muted-foreground">Name</div>
                  <div className="font-medium">{selectedComplaint.customer_name}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Email</div>
                  <div className="font-medium text-sm">{selectedComplaint.customer_email}</div>
                </div>
                {selectedComplaint.policies?.customer_phone && (
                  <div>
                    <div className="text-xs text-muted-foreground">Phone</div>
                    <div className="font-medium">{selectedComplaint.policies.customer_phone}</div>
                  </div>
                )}
                {(selectedComplaint.policies?.customer_address_line1 || selectedComplaint.policies?.customer_city) && (
                  <div className="sm:col-span-2">
                    <div className="text-xs text-muted-foreground">Address</div>
                    <div className="font-medium">
                      {[
                        selectedComplaint.policies?.customer_address_line1,
                        selectedComplaint.policies?.customer_address_line2,
                        selectedComplaint.policies?.customer_city,
                        selectedComplaint.policies?.customer_postcode
                      ].filter(Boolean).join(", ")}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Complaint Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-muted-foreground">Reference</div>
                  <div className="font-mono font-medium text-lg">
                    {selectedComplaint.complaint_reference}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Submitted Date</div>
                  <div className="font-medium">
                    {format(new Date(selectedComplaint.created_at), "PPP")}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Reason</div>
                  <div className="font-medium">{selectedComplaint.reason}</div>
                </div>
              </div>

              <div className="mt-6">
                <div className="text-sm text-muted-foreground mb-2">Complaint Details</div>
                <div className="p-4 rounded-lg bg-muted">
                  {selectedComplaint.details}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Classification & Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                {/* Left Column */}
                <div className="space-y-2">
                  <Label htmlFor="cause">Complaint Cause</Label>
                  <Select>
                    <SelectTrigger id="cause">
                      <SelectValue placeholder="< Please Choose ...>" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claim_delay">Claim Delay</SelectItem>
                      <SelectItem value="claim_rejection">Claim Rejection</SelectItem>
                      <SelectItem value="poor_service">Poor Service</SelectItem>
                      <SelectItem value="communication">Communication Issue</SelectItem>
                      <SelectItem value="policy_terms">Policy Terms</SelectItem>
                      <SelectItem value="premium">Premium Related</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Right Column */}
                <div className="space-y-2">
                  <Label htmlFor="status">Complaint Status *</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="classified">Classified</SelectItem>
                      <SelectItem value="responded">Responded</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="sub_reason">Complaint Sub Reason</Label>
                  <Select>
                    <SelectTrigger id="sub_reason">
                      <SelectValue placeholder="< Please Choose ...>" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="misinformed_sales">Misinformed/mis - sold by sales agent</SelectItem>
                      <SelectItem value="policy_documentation">Receipt of policy documentation</SelectItem>
                      <SelectItem value="quality_service_sales">Quality of Service by sales agent</SelectItem>
                      <SelectItem value="cancellation">Cancellation</SelectItem>
                      <SelectItem value="claim_declined">Claim declined</SelectItem>
                      <SelectItem value="fulfilment_option">Fulfilment option offered</SelectItem>
                      <SelectItem value="excess_amount">Excess amount</SelectItem>
                      <SelectItem value="process">Process</SelectItem>
                      <SelectItem value="misinformed_cs">Misinformed by customer services agent</SelectItem>
                      <SelectItem value="poor_quality_cs">Poor quality of service by customer services agent</SelectItem>
                      <SelectItem value="claim_delay">Delay in claim process</SelectItem>
                      <SelectItem value="repaired_device">Issue with repaired/replaced device</SelectItem>
                      <SelectItem value="unpaid_bills">Unpaid bills/account in arrears</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assigned_to">Assigned To</Label>
                  <Select value={assignedTo || "unassigned"} onValueChange={setAssignedTo}>
                    <SelectTrigger id="assigned_to">
                      <SelectValue placeholder="Select agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Is Regulator Reportable</Label>
                  <div className="flex items-center gap-4 h-10">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="regulator" className="w-4 h-4" />
                      <span className="text-sm">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="regulator" className="w-4 h-4" defaultChecked />
                      <span className="text-sm">No</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="outcome">Complaint Outcome</Label>
                  <Select defaultValue="pending">
                    <SelectTrigger id="outcome">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="upheld">Upheld</SelectItem>
                      <SelectItem value="partially_upheld">Partially Upheld</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Has Been Referred To FOS</Label>
                  <div className="flex items-center gap-4 h-10">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="fos" className="w-4 h-4" />
                      <span className="text-sm">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="fos" className="w-4 h-4" defaultChecked />
                      <span className="text-sm">No</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="action_type">Complaint Action Type</Label>
                  <Select defaultValue="action_required">
                    <SelectTrigger id="action_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="action_required">Action Required</SelectItem>
                      <SelectItem value="no_action">No Action</SelectItem>
                      <SelectItem value="escalated">Escalated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Is FOS Adjudicated</Label>
                  <div className="flex items-center gap-4 h-10">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="adjudicated" className="w-4 h-4" />
                      <span className="text-sm">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="adjudicated" className="w-4 h-4" defaultChecked />
                      <span className="text-sm">No</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="claim_paid">Claim Paid</Label>
                  <Select defaultValue="not_applicable">
                    <SelectTrigger id="claim_paid">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_applicable">Not Applicable</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Is Solicitor Complaint</Label>
                  <div className="flex items-center gap-4 h-10">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="solicitor" className="w-4 h-4" />
                      <span className="text-sm">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="solicitor" className="w-4 h-4" defaultChecked />
                      <span className="text-sm">No</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="compensation_type">Compensation Type</Label>
                  <Select defaultValue="none">
                    <SelectTrigger id="compensation_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="financial">Financial</SelectItem>
                      <SelectItem value="goodwill">Goodwill</SelectItem>
                      <SelectItem value="service_credit">Service Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Has Acknowledgement Been Sent</Label>
                  <div className="flex items-center gap-4 h-10">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="acknowledgement" className="w-4 h-4" />
                      <span className="text-sm">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="acknowledgement" className="w-4 h-4" defaultChecked />
                      <span className="text-sm">No</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="compensation_amount">Compensation Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
                    <input
                      id="compensation_amount"
                      type="number"
                      step="0.01"
                      defaultValue="0.00"
                      className="w-full h-10 pl-7 pr-3 rounded-md border border-input bg-background text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>In Breach Of Compliance</Label>
                  <div className="flex items-center gap-4 h-10">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="compliance" className="w-4 h-4" />
                      <span className="text-sm">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="compliance" className="w-4 h-4" defaultChecked />
                      <span className="text-sm">No</span>
                    </label>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Internal Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Internal Use Only)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add internal notes about this complaint..."
                  rows={5}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  These notes are for internal use only and will not be visible to the customer.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end sticky top-4 bg-background p-4 border rounded-lg shadow-sm z-10">
            <Button
              onClick={handleUpdateComplaint}
              disabled={updating || !status}
              size="lg"
            >
              {updating ? "Updating..." : "Update"}
            </Button>
            <Button variant="outline" onClick={handleBackToList} size="lg">
              Cancel
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Response & Resolution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor="response">Response to Customer</Label>
                  </div>
                  <div className="w-64">
                    <Select value={responseType} onValueChange={setResponseType}>
                      <SelectTrigger>
                        <SelectValue placeholder="< Please Choose ... >" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="action">Action</SelectItem>
                        <SelectItem value="awaiting_information">Awaiting Information</SelectItem>
                        <SelectItem value="awaiting_internal_action">Awaiting Internal Action</SelectItem>
                        <SelectItem value="complaint_approved">Complaint approved (Upheld)</SelectItem>
                        <SelectItem value="complaint_rejected">Complaint rejected (Refuted)</SelectItem>
                        <SelectItem value="complaint_closed">Complaint closed (No Activity)</SelectItem>
                        <SelectItem value="complaint_withdrawal">Complaint Withdrawal</SelectItem>
                        <SelectItem value="awaiting_external_action">Awaiting External action</SelectItem>
                        <SelectItem value="resubmitted_by_tpa">Resubmitted by TPA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Textarea
                  id="response"
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Enter your detailed response to the customer..."
                  rows={8}
                  className="resize-none"
                />
                <Button
                  onClick={async () => {
                    if (!responseType) {
                      toast.error("Please select a response type");
                      return;
                    }
                    if (!response.trim()) {
                      toast.error("Please enter a response message");
                      return;
                    }
                    
                    // Format response type for display
                    const responseTypeLabels: Record<string, string> = {
                      action: "Action",
                      awaiting_information: "Awaiting Information",
                      awaiting_internal_action: "Awaiting Internal Action",
                      complaint_approved: "Complaint approved (Upheld)",
                      complaint_rejected: "Complaint rejected (Refuted)",
                      complaint_closed: "Complaint closed (No Activity)",
                      complaint_withdrawal: "Complaint Withdrawal",
                      awaiting_external_action: "Awaiting External action",
                      resubmitted_by_tpa: "Resubmitted by TPA"
                    };
                    
                    const templateName = responseTypeLabels[responseType] || responseType;
                    const email = selectedComplaint.customer_email || "No email on file";
                    
                    await logActivity(
                      selectedComplaint.id,
                      "communication_sent",
                      `Template used: ${templateName} | Communication sent to ${email} | Message: ${response.substring(0, 100)}${response.length > 100 ? '...' : ''}`
                    );
                    toast.success(`Communication sent to ${email}`);
                    fetchActivityLog(selectedComplaint.id);
                    setResponse("");
                    setResponseType("");
                  }}
                  disabled={updating || !responseType || !response.trim()}
                  className="gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Send Comms
                </Button>
              </div>

              {selectedComplaint.response_date && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  <MessageSquare className="h-4 w-4" />
                  <span>
                    Previously responded on:{" "}
                    {format(new Date(selectedComplaint.response_date), "dd MMM yyyy HH:mm")}
                  </span>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={async () => {
                    const email = selectedComplaint.customer_email || "No email on file";
                    await logActivity(
                      selectedComplaint.id,
                      "email_sent",
                      `Acknowledgment email sent to ${email}`
                    );
                    toast.success(`Acknowledgment email logged for ${email}`);
                    fetchActivityLog(selectedComplaint.id);
                  }}
                  disabled={updating}
                  className="gap-2"
                >
                  <MailCheck className="h-4 w-4" />
                  Resend Acknowledgment
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    const email = selectedComplaint.customer_email || "No email on file";
                    await logActivity(
                      selectedComplaint.id,
                      "email_sent",
                      `On Hold notification email sent to ${email}`
                    );
                    toast.success(`On Hold notification logged for ${email}`);
                    fetchActivityLog(selectedComplaint.id);
                  }}
                  disabled={updating}
                  className="gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Resend on Hold
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activityLog.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No activity recorded yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activityLog.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex gap-4 pb-4 border-b last:border-b-0 last:pb-0"
                    >
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Activity className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{activity.user_name}</p>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(activity.created_at), "dd MMM yyyy HH:mm")}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">
                          {activity.action_details || activity.action_type}
                        </p>
                        {activity.field_changed && (
                          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded mt-2">
                            <span className="font-medium">Changed field:</span> {activity.field_changed}
                            {activity.old_value && (
                              <div className="mt-1">
                                <span className="text-destructive">- {activity.old_value}</span>
                                <br />
                                <span className="text-success">+ {activity.new_value}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Communications Section */}
          <PolicyCommunications complaintId={selectedComplaint.id} />
        </div>
      </div>
    );
  }

  const reasonOptions = [
    { label: "Claims Process", value: "claim_processing" },
    { label: "Policy Terms", value: "policy_terms" },
    { label: "Customer Service", value: "customer_service" },
    { label: "Payment Issue", value: "payment_issue" },
    { label: "Product Coverage", value: "product_coverage" },
    { label: "Other", value: "other" },
  ];

  const searchPolicy = async () => {
    if (!policySearchTerm.trim()) {
      toast.error("Please enter a policy number");
      return;
    }

    try {
      setSearchingPolicy(true);
      const { data, error } = await supabase.functions.invoke('retail-policy-lookup', {
        body: { policyNumber: policySearchTerm },
      });

      if (data && data.policy) {
        setFoundPolicy(data.policy);
        setNewComplaint({
          ...newComplaint,
          customerName: data.policy.customer?.full_name || data.policy.customer_name || '',
          customerEmail: data.policy.customer?.email || data.policy.customer_email || '',
        });
        toast.success("Policy found");
      } else {
        toast.error("Policy not found");
        setFoundPolicy(null);
      }
    } catch (error: any) {
      toast.error("Failed to search policy");
      console.error(error);
      setFoundPolicy(null);
    } finally {
      setSearchingPolicy(false);
    }
  };

  const handleCreateComplaint = async () => {
    if (!newComplaint.customerName || !newComplaint.customerEmail || !newComplaint.reason || !newComplaint.details) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    try {
      setCreatingComplaint(true);

      const { error } = await supabase
        .from('complaints')
        .insert([
          {
            user_id: user.id,
            policy_id: foundPolicy?.id || null,
            customer_name: newComplaint.customerName,
            customer_email: newComplaint.customerEmail,
            reason: newComplaint.reason,
            details: newComplaint.details,
            status: 'submitted',
          },
        ] as any);

      if (error) throw error;

      toast.success("Complaint created successfully");
      setCreateDialogOpen(false);
      setFoundPolicy(null);
      setPolicySearchTerm("");
      setNewComplaint({
        customerName: "",
        customerEmail: "",
        reason: "",
        details: "",
      });
      fetchComplaints(); // Refresh the list
    } catch (error: any) {
      console.error('Create complaint error', error);
      toast.error(error?.message || "Failed to create complaint");
    } finally {
      setCreatingComplaint(false);
    }
  };

  // List view
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Complaints Management</h1>
          <p className="text-muted-foreground mt-2">
            Review, classify, and respond to customer complaints
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Complaint
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] w-full h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Complaint</DialogTitle>
              <DialogDescription>
                Search for a policy or create a general complaint
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Policy Search */}
              <div className="space-y-2">
                <Label>Policy Number (Optional)</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Enter policy number (e.g., EW-123456)"
                      value={policySearchTerm}
                      onChange={(e) => setPolicySearchTerm(e.target.value)}
                      className="pl-9"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          searchPolicy();
                        }
                      }}
                    />
                  </div>
                  <Button
                    onClick={searchPolicy}
                    disabled={searchingPolicy || !policySearchTerm.trim()}
                    variant="outline"
                  >
                    {searchingPolicy ? "Searching..." : "Search"}
                  </Button>
                </div>
                {foundPolicy && (
                  <div className="p-3 bg-muted rounded-lg space-y-1">
                    <p className="text-sm font-medium">Policy: {foundPolicy.policy_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {foundPolicy.product?.name} - Status: {foundPolicy.status}
                    </p>
                  </div>
                )}
              </div>

              {/* Customer Details */}
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={newComplaint.customerName}
                  onChange={(e) => setNewComplaint({ ...newComplaint, customerName: e.target.value })}
                  placeholder="Enter customer name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerEmail">Customer Email *</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={newComplaint.customerEmail}
                  onChange={(e) => setNewComplaint({ ...newComplaint, customerEmail: e.target.value })}
                  placeholder="Enter customer email"
                />
              </div>

              {/* Complaint Details */}
              <div className="space-y-2">
                <Label htmlFor="reason">Reason *</Label>
                <Select
                  value={newComplaint.reason}
                  onValueChange={(value) => setNewComplaint({ ...newComplaint, reason: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {reasonOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="details">Complaint Details *</Label>
                <Textarea
                  id="details"
                  value={newComplaint.details}
                  onChange={(e) => setNewComplaint({ ...newComplaint, details: e.target.value })}
                  placeholder="Provide detailed information about the complaint..."
                  rows={6}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCreateDialogOpen(false);
                    setFoundPolicy(null);
                    setPolicySearchTerm("");
                    setNewComplaint({
                      customerName: "",
                      customerEmail: "",
                      reason: "",
                      details: "",
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateComplaint}
                  disabled={creatingComplaint}
                >
                  {creatingComplaint ? "Creating..." : "Create Complaint"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {activeFilter && (
        <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="font-medium">
              Active Filter: {activeFilter === "outOfSLA" ? "Out of SLA" : activeFilter === "awaitingResponse" ? "Awaiting Response" : activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Showing {filteredComplaints.length} of {complaints.length} complaints
            </span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setActiveFilter(null)}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Clear Filter
          </Button>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${activeFilter === "total" ? "ring-2 ring-primary" : ""}`}
          onClick={() => setActiveFilter(activeFilter === "total" ? null : "total")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Complaints</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
            {activeFilter === "total" && (
              <p className="text-xs text-primary mt-1">Filtered</p>
            )}
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${activeFilter === "open" ? "ring-2 ring-blue-600" : ""}`}
          onClick={() => setActiveFilter(activeFilter === "open" ? null : "open")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.open}</div>
            {activeFilter === "open" && (
              <p className="text-xs text-blue-600 mt-1">Filtered</p>
            )}
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${activeFilter === "outOfSLA" ? "ring-2 ring-destructive" : ""}`}
          onClick={() => setActiveFilter(activeFilter === "outOfSLA" ? null : "outOfSLA")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of SLA</CardTitle>
            <Clock className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics.outOfSLA}</div>
            <p className="text-xs text-muted-foreground mt-1">{">"} 8 weeks</p>
            {activeFilter === "outOfSLA" && (
              <p className="text-xs text-destructive mt-1 font-semibold">Filtered</p>
            )}
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${activeFilter === "awaitingResponse" ? "ring-2 ring-orange-600" : ""}`}
          onClick={() => setActiveFilter(activeFilter === "awaitingResponse" ? null : "awaitingResponse")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Awaiting Response</CardTitle>
            <MessageSquare className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{metrics.awaitingResponse}</div>
            {activeFilter === "awaitingResponse" && (
              <p className="text-xs text-orange-600 mt-1">Filtered</p>
            )}
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${activeFilter === "regulatory" ? "ring-2 ring-destructive" : ""}`}
          onClick={() => setActiveFilter(activeFilter === "regulatory" ? null : "regulatory")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Regulatory</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics.regulatory}</div>
            {activeFilter === "regulatory" && (
              <p className="text-xs text-destructive mt-1">Filtered</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Classification</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredComplaints.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  {activeFilter ? "No complaints match the selected filter" : "No complaints found"}
                </TableCell>
              </TableRow>
            ) : (
              filteredComplaints.map((complaint) => (
                <TableRow 
                  key={complaint.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSelectComplaint(complaint)}
                >
                  <TableCell className="font-mono text-sm">
                    {complaint.complaint_reference}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{complaint.customer_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {complaint.customer_email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getClassificationBadge(complaint.classification)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{getAgentName(complaint.assigned_to)}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(complaint.status)}</TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(complaint.created_at), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectComplaint(complaint);
                      }}
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
