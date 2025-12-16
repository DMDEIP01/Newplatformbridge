import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle, Bot, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import ServiceAgentChat from "@/components/ServiceAgentChat";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ServiceRequestInbox from "@/components/ServiceRequestInbox";

const serviceRequestReasons = [
  "Policy Information",
  "Coverage Query",
  "Billing Issue",
  "Update Details",
  "Technical Support",
  "General Inquiry",
  "Other",
];

const departments = [
  { value: "claims_agent", label: "Claims Agent" },
  { value: "commercial_agent", label: "Commercial Agent" },
  { value: "backoffice_operations", label: "Backoffice Operations" },
];

// Schema for policy-specific requests
const policyServiceRequestSchema = z.object({
  policyNumber: z.string().min(1, "Policy number is required"),
  customerName: z.string().min(2, "Name is required"),
  customerEmail: z.string().email("Valid email is required"),
  reason: z.string().min(1, "Reason is required"),
  department: z.string().min(1, "Department is required"),
  details: z.string().min(10, "Please provide more details (at least 10 characters)"),
  agentNotes: z.string().min(5, "Agent notes are required (at least 5 characters)"),
});

// Schema for general requests
const generalServiceRequestSchema = z.object({
  policyNumber: z.string().optional(),
  customerName: z.string().min(2, "Name is required"),
  customerEmail: z.string().email("Valid email is required"),
  reason: z.string().min(1, "Reason is required"),
  department: z.string().min(1, "Department is required"),
  details: z.string().min(10, "Please provide more details (at least 10 characters)"),
  agentNotes: z.string().min(5, "Agent notes are required (at least 5 characters)"),
});

export default function RetailServiceRequest() {
  const location = useLocation();
  const prePopulatedPolicy = location.state?.policy;
  
  const [searchingPolicy, setSearchingPolicy] = useState(false);
  const [foundPolicy, setFoundPolicy] = useState<any>(prePopulatedPolicy || null);
  const [policySearchTerm, setPolicySearchTerm] = useState(prePopulatedPolicy?.policy_number || "");
  const [submitting, setSubmitting] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState<any>(null);
  const [useAI, setUseAI] = useState(true);
  const [statusCounts, setStatusCounts] = useState({
    open: 0,
    pending: 0,
    resolved: 0,
    withinSLA: 0,
    breachedSLA: 0,
  });

  // Use appropriate schema based on whether we have a pre-populated policy
  const form = useForm<z.infer<typeof generalServiceRequestSchema>>({
    resolver: zodResolver(prePopulatedPolicy ? policyServiceRequestSchema : generalServiceRequestSchema),
    defaultValues: {
      policyNumber: prePopulatedPolicy?.policy_number || "",
      customerName: prePopulatedPolicy?.customer_name || prePopulatedPolicy?.profile?.full_name || "",
      customerEmail: prePopulatedPolicy?.customer_email || prePopulatedPolicy?.profile?.email || "",
      reason: "",
      department: "",
      details: "",
      agentNotes: "",
    },
  });

  // Fetch status counts
  useEffect(() => {
    fetchStatusCounts();
  }, []);

  const fetchStatusCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('service_requests')
        .select('status, created_at');
      
      if (error) throw error;
      
      const now = Date.now();
      const SLA_HOURS = 48;
      
      let withinSLA = 0;
      let breachedSLA = 0;
      
      data?.forEach(request => {
        if (request.status !== 'resolved' && request.status !== 'closed') {
          const ageHours = (now - new Date(request.created_at).getTime()) / (1000 * 60 * 60);
          if (ageHours <= SLA_HOURS) {
            withinSLA++;
          } else {
            breachedSLA++;
          }
        }
      });
      
      const counts = {
        open: data?.filter(r => r.status === 'open').length || 0,
        pending: data?.filter(r => r.status === 'pending').length || 0,
        resolved: data?.filter(r => r.status === 'resolved').length || 0,
        withinSLA,
        breachedSLA,
      };
      
      setStatusCounts(counts);
    } catch (error) {
      console.error('Error fetching status counts:', error);
    }
  };

  // Pre-populate form when policy is passed via navigation
  useEffect(() => {
    if (prePopulatedPolicy) {
      form.setValue('policyNumber', prePopulatedPolicy.policy_number);
      form.setValue('customerName', prePopulatedPolicy.customer_name || prePopulatedPolicy.profile?.full_name || '');
      form.setValue('customerEmail', prePopulatedPolicy.customer_email || prePopulatedPolicy.profile?.email || '');
      setFoundPolicy(prePopulatedPolicy);
      setPolicySearchTerm(prePopulatedPolicy.policy_number);
    }
  }, [prePopulatedPolicy]);

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

      if (error) throw error;

      if (data && data.policy) {
        setFoundPolicy(data.policy);
        form.setValue('policyNumber', policySearchTerm);
        form.setValue('customerName', data.policy.customer?.full_name || '');
        form.setValue('customerEmail', data.policy.customer?.email || '');
        toast.success("Policy found - you can now create a service request");
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

  const onSubmit = async (values: z.infer<typeof generalServiceRequestSchema>) => {
    // Allow submission for general requests without a policy
    if (!foundPolicy && !prePopulatedPolicy) {
      // This is a general inquiry without a policy - that's okay
    }

    setSubmitting(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create service request
      const { data: serviceRequest, error: srError }: any = await supabase
        .from('service_requests' as any)
        .insert([{
          policy_id: foundPolicy?.id || null,
          customer_name: values.customerName,
          customer_email: values.customerEmail,
          reason: values.reason,
          department: values.department,
          details: values.details,
          status: 'open',
          created_by: user?.id,
        }])
        .select()
        .single();

      if (srError) throw srError;

      // Update policy notes with service request reference (only if we have a policy)
      if (foundPolicy?.id) {
        const currentNotes = foundPolicy.notes || '';
        const newNote = `\n[${new Date().toLocaleDateString()}] Service Request ${serviceRequest.request_reference}: ${values.agentNotes}`;
        const updatedNotes = currentNotes + newNote;

        const { error: policyError } = await supabase
          .from('policies')
          .update({ notes: updatedNotes } as any)
          .eq('id', foundPolicy.id);

        if (policyError) {
          console.error('Failed to update policy notes:', policyError);
          toast.error("Service request created but failed to update policy notes");
        }
      }

      toast.success(`Service request ${serviceRequest.request_reference} created successfully`);

      setSubmittedRequest(serviceRequest);
      
      // Reset form and policy
      form.reset();
      setFoundPolicy(null);
      setPolicySearchTerm("");
    } catch (error: any) {
      console.error('Create service request error:', error);
      toast.error(error?.message || "Failed to create service request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewRequest = () => {
    setSubmittedRequest(null);
    form.reset();
    setFoundPolicy(null);
    setPolicySearchTerm("");
  };

  const handleServiceRequestCaptured = async (capturedRequest: any) => {
    try {
      // Pre-fill the form with AI-captured data
      form.setValue('customerName', capturedRequest.customer_name);
      form.setValue('customerEmail', capturedRequest.customer_email);
      if (capturedRequest.policy_number) {
        form.setValue('policyNumber', capturedRequest.policy_number);
        setPolicySearchTerm(capturedRequest.policy_number);
        // Try to find the policy
        await searchPolicy();
      }
      form.setValue('reason', capturedRequest.reason);
      form.setValue('details', capturedRequest.details);
      form.setValue('agentNotes', capturedRequest.conversation_summary);
      
      // Switch to manual form tab
      setUseAI(false);
      
      toast.info("Service request details captured. Please review and submit.");
    } catch (error) {
      console.error('Error handling captured request:', error);
    }
  };

  if (submittedRequest) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Service Request Created</h1>
          <p className="text-muted-foreground">Service request has been successfully submitted</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <CardTitle>Request Confirmation</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Reference Number</Label>
              <p className="text-2xl font-bold text-green-600">{submittedRequest.request_reference}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Customer</Label>
                <p className="font-medium">{submittedRequest.customer_name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium">{submittedRequest.customer_email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Reason</Label>
                <p className="font-medium">{submittedRequest.reason}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <Badge>{submittedRequest.status}</Badge>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Details</Label>
              <p className="text-sm">{submittedRequest.details}</p>
            </div>
            <Button onClick={handleNewRequest} className="w-full">
              Create Another Request
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Service Request</h1>
        <p className="text-muted-foreground mt-2">
          Manage customer service requests using AI assistant or manual form
        </p>
      </div>

      {/* Status Counters */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Open</p>
                <p className="text-3xl font-bold">{statusCounts.open}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-3xl font-bold">{statusCounts.pending}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Resolved</p>
                <p className="text-3xl font-bold">{statusCounts.resolved}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">SLA (48hrs)</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{statusCounts.withinSLA}</p>
                  {statusCounts.breachedSLA > 0 && (
                    <p className="text-xl font-semibold text-destructive">+{statusCounts.breachedSLA}</p>
                  )}
                </div>
              </div>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                statusCounts.breachedSLA > 0 
                  ? 'bg-red-100 dark:bg-red-900/20' 
                  : 'bg-green-100 dark:bg-green-900/20'
              }`}>
                <Clock className={`h-6 w-6 ${
                  statusCounts.breachedSLA > 0 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-green-600 dark:text-green-400'
                }`} />
              </div>
            </div>
            {statusCounts.breachedSLA > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {statusCounts.breachedSLA} request{statusCounts.breachedSLA !== 1 ? 's' : ''} overdue
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inbox" className="w-full">
        <TabsList>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="create">Create Request</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-6">
          <ServiceRequestInbox />
        </TabsContent>

        <TabsContent value="create" className="mt-6">
          <div className="space-y-6">

      {/* Conditionally show policy search only if no policy is pre-populated */}
      {!prePopulatedPolicy && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Search for Policy (Optional)</CardTitle>
            <CardDescription>
              Search by policy number, customer name or email, or leave blank for general inquiries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter policy number, name or email (optional)"
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
              >
                {searchingPolicy ? (
                  <>
                    <Search className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search Policy
                  </>
                )}
              </Button>
            </div>

            {foundPolicy && (
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Policy Found</p>
                    <p className="text-lg font-semibold">{foundPolicy.policy_number}</p>
                  </div>
                  <Badge variant={foundPolicy.status === 'active' ? 'default' : 'secondary'}>
                    {foundPolicy.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Product</p>
                    <p className="text-sm font-medium">{foundPolicy.product?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <p className="text-sm font-medium">{foundPolicy.customer?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{foundPolicy.customer?.email}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Show policy info card if pre-populated */}
      {prePopulatedPolicy && foundPolicy && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Policy Information</CardTitle>
            <CardDescription>
              Complete the service request details below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Policy Number</p>
                <p className="font-semibold">{foundPolicy.policy_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={foundPolicy.status === 'active' ? 'default' : 'secondary'}>
                  {foundPolicy.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Customer Name</p>
                <p className="font-semibold">{foundPolicy.customer_name || foundPolicy.profile?.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-semibold">{foundPolicy.customer_email || foundPolicy.profile?.email}</p>
              </div>
              {foundPolicy.product && (
                <div>
                  <p className="text-sm text-muted-foreground">Product</p>
                  <p className="font-semibold">{foundPolicy.product.name}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={useAI ? "ai" : "manual"} onValueChange={(v) => setUseAI(v === "ai")} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            AI Assistant
          </TabsTrigger>
          <TabsTrigger value="manual">Manual Form</TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="mt-6">
          <ServiceAgentChat onServiceRequestCaptured={handleServiceRequestCaptured} />
        </TabsContent>

        <TabsContent value="manual" className="mt-6">
          <Card>
        <CardHeader>
          <CardTitle>{prePopulatedPolicy ? "Service Request Details" : (foundPolicy ? "Step 2: Submit Service Request" : "Service Request Details")}</CardTitle>
          <CardDescription>
            Complete the service request details below
          </CardDescription>
        </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="policyNumber"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="customerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Request</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background z-50">
                            <SelectValue placeholder="Select a reason" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background z-50">
                          {serviceRequestReasons.map((reason) => (
                            <SelectItem key={reason} value={reason}>
                              {reason}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background z-50">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background z-50">
                          {departments.map((dept) => (
                            <SelectItem key={dept.value} value={dept.value}>
                              {dept.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="details"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Request Details</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Provide detailed information about the service request..."
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="agentNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agent Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add internal notes about this service request (will be saved to policy notes)..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                  {submitting ? "Creating Request..." : "Submit Service Request"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        </TabsContent>
      </Tabs>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
