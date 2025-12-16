import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const reasonOptions = [
  { label: "Claims Process", value: "claim_processing" },
  { label: "Policy Terms", value: "policy_terms" },
  { label: "Customer Service", value: "customer_service" },
  { label: "Payment Issue", value: "payment_issue" },
  { label: "Product Coverage", value: "product_coverage" },
  { label: "Other", value: "other" },
];

const createComplaintSchema = z.object({
  policyNumber: z.string().min(1, "Policy number is required"),
  customerName: z.string().min(2, "Name is required"),
  customerEmail: z.string().email("Valid email is required"),
  reason: z.string().min(1, "Reason is required"),
  details: z.string().min(10, "Please provide more details"),
});

export default function RetailComplaints() {
  const location = useLocation();
  const prePopulatedPolicy = location.state?.policy;
  
  const [searchingPolicy, setSearchingPolicy] = useState(false);
  const [foundPolicy, setFoundPolicy] = useState<any>(prePopulatedPolicy || null);
  const [policySearchTerm, setPolicySearchTerm] = useState(prePopulatedPolicy?.policy_number || "");

  const form = useForm<z.infer<typeof createComplaintSchema>>({
    resolver: zodResolver(createComplaintSchema),
    defaultValues: {
      policyNumber: prePopulatedPolicy?.policy_number || "",
      customerName: prePopulatedPolicy?.customer_name || prePopulatedPolicy?.profile?.full_name || "",
      customerEmail: prePopulatedPolicy?.customer_email || prePopulatedPolicy?.profile?.email || "",
      reason: "",
      details: "",
    },
  });

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

      if (data && data.policy) {
        setFoundPolicy(data.policy);
        form.setValue('policyNumber', policySearchTerm);
        // Populate customer details from policy fields or nested customer object
        form.setValue('customerName', data.policy.customer_name || data.policy.customer?.full_name || '');
        form.setValue('customerEmail', data.policy.customer_email || data.policy.customer?.email || '');
        toast.success("Policy found - customer details populated");
      } else {
        toast.error("Policy not found - you can still create a general complaint");
        setFoundPolicy(null);
      }
    } catch (error: any) {
      toast.error("Failed to search policy - you can still create a general complaint");
      console.error(error);
      setFoundPolicy(null);
    } finally {
      setSearchingPolicy(false);
    }
  };

  const onSubmitComplaint = async (values: z.infer<typeof createComplaintSchema>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("You must be logged in to create a complaint");
        return;
      }

      const { error } = await supabase
        .from('complaints')
        .insert([
          {
            user_id: user.id,
            policy_id: foundPolicy?.id || null,
            customer_name: values.customerName,
            customer_email: values.customerEmail,
            reason: values.reason,
            details: values.details,
            status: 'submitted',
          },
        ] as any);

      if (error) throw error;

      toast.success("Complaint created successfully");
      form.reset();
      setFoundPolicy(null);
      setPolicySearchTerm("");
    } catch (error: any) {
      console.error('Create complaint error', error);
      toast.error(error?.message || "Failed to create complaint");
    }
  };


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Complaint</h1>
        <p className="text-muted-foreground">
          {prePopulatedPolicy 
            ? "Submit a complaint for the selected policy" 
            : "Search for a policy to auto-fill details, or create a general complaint"}
        </p>
      </div>

      {/* Conditionally show policy search only if no policy is pre-populated */}
      {!prePopulatedPolicy && (
        <Card>
          <CardHeader>
            <CardTitle>Policy Search (Optional)</CardTitle>
            <CardDescription>
              Search by policy number, customer name or email to auto-fill details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter policy number, name or email"
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
              Complete the complaint details below
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

      <Card>
        <CardHeader>
          <CardTitle>{prePopulatedPolicy ? "Complaint Details" : foundPolicy ? "Step 2: Submit Complaint" : "Complaint Details"}</CardTitle>
          <CardDescription>
            Complete the complaint details below
          </CardDescription>
        </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitComplaint)} className="space-y-4">
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
                      <FormLabel>Reason</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a reason" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {reasonOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
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
                      <FormLabel>Complaint Details</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Provide detailed information about the complaint..."
                          rows={6}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" size="lg">
                  Submit Complaint
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }
