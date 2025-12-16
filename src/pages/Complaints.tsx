import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle2, FileText, Clock, MessageSquare, User, Mail, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/hooks/useTranslation";
import { Separator } from "@/components/ui/separator";
import { PolicyCommunications } from "@/components/PolicyCommunications";

const complaintSchema = z.object({
  reason: z.string().min(1, { message: "Please select a reason for your complaint" }),
  details: z.string()
    .trim()
    .min(10, { message: "Please provide at least 10 characters of detail" })
    .max(2000, { message: "Details must be less than 2000 characters" }),
});

type ComplaintFormValues = z.infer<typeof complaintSchema>;

interface Complaint {
  id: string;
  complaint_reference: string;
  reason: string;
  details: string;
  status: string;
  response: string | null;
  response_date: string | null;
  created_at: string;
}

interface Profile {
  full_name: string;
  email: string;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
}

const complaintReasons = [
  { value: "customer_service", label: "Customer Service" },
  { value: "policy_terms", label: "Policy Terms" },
  { value: "claim_processing", label: "Claim Processing" },
  { value: "payment_issue", label: "Payment Issue" },
  { value: "product_coverage", label: "Product Coverage" },
  { value: "other", label: "Other" },
];

const statusConfig = {
  submitted: { label: "Submitted", color: "bg-blue-500" },
  under_review: { label: "Under Review", color: "bg-yellow-500" },
  resolved: { label: "Resolved", color: "bg-green-500" },
  closed: { label: "Closed", color: "bg-gray-500" },
};

export default function Complaints() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const form = useForm<ComplaintFormValues>({
    resolver: zodResolver(complaintSchema),
    defaultValues: {
      reason: "",
      details: "",
    },
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchComplaints();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email, phone, address_line1, address_line2, city, postcode")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchComplaints = async () => {
    try {
      const { data, error } = await supabase
        .from("complaints")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching complaints:", error);
        throw error;
      }
      
      console.log("Fetched complaints:", data);
      setComplaints(data || []);
    } catch (error) {
      console.error("Error fetching complaints:", error);
      toast.error("Failed to load complaints");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: ComplaintFormValues) => {
    if (!user) {
      toast.error("You must be logged in to submit a complaint");
      return;
    }

    if (!profile) {
      toast.error("Unable to load your profile. Please refresh the page.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate complaint reference
      const { data: refData, error: refError } = await supabase.rpc(
        "generate_complaint_reference"
      );

      if (refError) throw refError;

      const reference = refData as string;

      // Insert complaint with customer details
      const { error: insertError } = await supabase.from("complaints").insert([{
        user_id: user.id,
        complaint_reference: reference,
        reason: values.reason,
        details: values.details,
        customer_name: profile.full_name,
        customer_email: profile.email,
      }] as any);

      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }

      toast.success("Complaint submitted successfully", {
        description: `Your complaint reference is: ${reference}`,
      });

      form.reset();
      fetchComplaints(); // Refresh the complaints list
    } catch (error) {
      console.error("Error submitting complaint:", error);
      toast.error("Failed to submit complaint", {
        description: "Please try again or contact support.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getReasonLabel = (reason: string) => {
    return complaintReasons.find(r => r.value === reason)?.label || reason;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Complaints</h1>
        <p className="text-muted-foreground mt-1">
          We take your feedback seriously and will address your concerns
        </p>
      </div>

      {profile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Your Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="text-sm font-medium">{profile.full_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{profile.email}</p>
                </div>
              </div>
              {profile.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm font-medium">{profile.phone}</p>
                  </div>
                </div>
              )}
              {(profile.address_line1 || profile.city) && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="text-sm font-medium">
                      {[profile.address_line1, profile.address_line2, profile.city, profile.postcode]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="submit" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="submit">Submit Complaint</TabsTrigger>
          <TabsTrigger value="history">My Complaints ({complaints.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="submit" className="space-y-6 mt-6">
          <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Complaint Details
          </CardTitle>
          <CardDescription>
            Please provide details about your complaint. You will receive a reference number for tracking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Complaint</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a reason" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background z-50">
                        {complaintReasons.map((reason) => (
                          <SelectItem key={reason.value} value={reason.value}>
                            {reason.label}
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
                        placeholder="Please provide detailed information about your complaint..."
                        className="min-h-[200px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <FormMessage />
                      <span>{field.value.length}/2000</span>
                    </div>
                  </FormItem>
                )}
              />

              <div className="rounded-lg bg-muted/50 p-4 border">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Your complaint will be managed by our dedicated complaints team on a separate system. You will receive a reference number to track your complaint.
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Complaint"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6 mt-6">
          {loading ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  Loading complaints...
                </div>
              </CardContent>
            </Card>
          ) : complaints.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    You haven't submitted any complaints yet
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {complaints.map((complaint) => (
                <Card key={complaint.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <CardTitle className="text-lg">
                            {complaint.complaint_reference}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">
                            {getReasonLabel(complaint.reason)}
                          </Badge>
                          <Badge 
                            variant="secondary"
                            className={`${statusConfig[complaint.status as keyof typeof statusConfig]?.color || 'bg-gray-500'} text-white`}
                          >
                            {statusConfig[complaint.status as keyof typeof statusConfig]?.label || complaint.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(complaint.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-1">Complaint Details</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {complaint.details}
                      </p>
                    </div>

                    {complaint.response && (
                      <div className="rounded-lg border bg-muted/50 p-4">
                        <div className="flex items-start gap-2 mb-2">
                          <MessageSquare className="h-4 w-4 text-primary mt-0.5" />
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold mb-1">Response from Team</h4>
                            {complaint.response_date && (
                              <p className="text-xs text-muted-foreground mb-2">
                                {new Date(complaint.response_date).toLocaleString()}
                              </p>
                            )}
                            <p className="text-sm whitespace-pre-wrap">
                              {complaint.response}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                     {!complaint.response && complaint.status === 'submitted' && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 p-3">
                        <p className="text-xs text-blue-800 dark:text-blue-200">
                          Your complaint has been received and is awaiting review by our team.
                        </p>
                      </div>
                    )}

                    {/* Communications Section */}
                    <div className="mt-6">
                      <PolicyCommunications complaintId={complaint.id} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
