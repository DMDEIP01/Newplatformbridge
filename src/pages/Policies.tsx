import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Calendar, CheckCircle, ArrowUpCircle, FileText, Download, Bell, X, AlertCircle, Smartphone, Laptop, Tv, Watch, Headphones, Speaker, Camera, Tablet, FileWarning, Edit } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { PolicySwitchDialog } from "@/components/PolicySwitchDialog";
import { PolicyChangeHistory } from "@/components/PolicyChangeHistory";
import { PolicyCommunications } from "@/components/PolicyCommunications";
import PolicyDocumentsCard from "@/components/PolicyDocumentsCard";
import CustomerPolicyEditDialog from "@/components/CustomerPolicyEditDialog";
import { PolicyPaymentHistory } from "@/components/PolicyPaymentHistory";
import { PolicyActionHistory } from "@/components/PolicyActionHistory";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatStatus } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Policy {
  id: string;
  policy_number: string;
  start_date: string;
  renewal_date: string;
  status: string;
  cancelled_at?: string;
  cancellation_reason?: string;
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
  products: {
    id: string;
    name: string;
    type: string;
    monthly_premium: number;
    excess_1: number;
    coverage: string[];
    tier: number;
  };
  promotion?: {
    id: string;
    promo_name: string;
    promo_type: string;
    discount_value: number | null;
    free_months: number | null;
  };
  covered_item?: {
    product_name: string;
    model: string;
    serial_number: string;
    added_date: string;
  } | null;
}

const getDeviceIcon = (productName: string) => {
  const name = productName?.toLowerCase() || '';
  
  if (name.includes('iphone') || name.includes('phone') || name.includes('mobile')) {
    return { Icon: Smartphone, color: 'text-blue-600 dark:text-blue-400' };
  }
  if (name.includes('laptop') || name.includes('macbook') || name.includes('notebook')) {
    return { Icon: Laptop, color: 'text-purple-600 dark:text-purple-400' };
  }
  if (name.includes('tv') || name.includes('television')) {
    return { Icon: Tv, color: 'text-indigo-600 dark:text-indigo-400' };
  }
  if (name.includes('watch')) {
    return { Icon: Watch, color: 'text-rose-600 dark:text-rose-400' };
  }
  if (name.includes('headphone') || name.includes('earphone') || name.includes('earbuds')) {
    return { Icon: Headphones, color: 'text-green-600 dark:text-green-400' };
  }
  if (name.includes('speaker') || name.includes('soundbar') || name.includes('sonos') || name.includes('arc')) {
    return { Icon: Speaker, color: 'text-orange-600 dark:text-orange-400' };
  }
  if (name.includes('camera')) {
    return { Icon: Camera, color: 'text-pink-600 dark:text-pink-400' };
  }
  if (name.includes('tablet') || name.includes('ipad')) {
    return { Icon: Tablet, color: 'text-cyan-600 dark:text-cyan-400' };
  }
  
  return { Icon: Shield, color: 'text-muted-foreground' };
};

export default function Policies() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [switchDialogOpen, setSwitchDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPolicyForSwitch, setSelectedPolicyForSwitch] = useState<Policy | null>(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState<string>("");
  const [cancellationDetails, setCancellationDetails] = useState<string>("");
  const [renewalReminders, setRenewalReminders] = useState({
    email: true,
    sms: false,
  });

  useEffect(() => {
    fetchPolicies();
  }, [user]);

  const fetchPolicies = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("policies")
        .select(`
          id,
          policy_number,
          start_date,
          renewal_date,
          status,
          cancelled_at,
          cancellation_reason,
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
          products (
            id,
            name,
            type,
            monthly_premium,
            excess_1,
            coverage,
            tier
          ),
          promotion:promotions (
            id,
            promo_name,
            promo_type,
            discount_value,
            free_months
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter to show active policies and cancelled policies within 60 days
      const now = new Date();
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      
      const filteredPolicies = (data || []).filter(policy => {
        if (policy.status === 'active') return true;
        if (policy.status === 'cancelled' && policy.cancelled_at) {
          const cancelledDate = new Date(policy.cancelled_at);
          return cancelledDate >= sixtyDaysAgo;
        }
        return false;
      });

      // Fetch covered item for each policy (one per policy)
      const policiesWithItems = await Promise.all(
        filteredPolicies.map(async (policy) => {
          const { data: item } = await supabase
            .from("covered_items")
            .select("product_name, model, serial_number, added_date")
            .eq("policy_id", policy.id)
            .maybeSingle();

          return {
            ...policy,
            covered_item: item,
          };
        })
      );

      // Sort: active policies first, then cancelled
      const sortedPolicies = policiesWithItems.sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return 0;
      });

      setPolicies(sortedPolicies as Policy[]);
      
      // Set the first policy as selected by default
      if (sortedPolicies.length > 0 && !selectedPolicyId) {
        setSelectedPolicyId(sortedPolicies[0].id);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching policies:", error);
      }
      toast.error("Failed to load policies");
    } finally {
      setLoading(false);
    }
  };
  const handleRenewPolicy = async () => {
    if (!selectedPolicy) return;
    
    try {
      // Calculate new renewal date (1 year from current renewal date)
      const currentRenewalDate = new Date(selectedPolicy.renewal_date);
      const newRenewalDate = new Date(currentRenewalDate);
      newRenewalDate.setFullYear(newRenewalDate.getFullYear() + 1);
      
      const { error } = await supabase
        .from("policies")
        .update({ 
          renewal_date: newRenewalDate.toISOString().split('T')[0]
        })
        .eq("id", selectedPolicy.id);

      if (error) throw error;

      toast.success("Policy renewed successfully", {
        description: `Your policy has been renewed until ${newRenewalDate.toLocaleDateString()}`,
      });
      
      // Refresh policies to show updated data
      fetchPolicies();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error renewing policy:", error);
      }
      toast.error("Failed to renew policy", {
        description: "Please try again or contact support.",
      });
    }
  };

  const handleUpgradeCoverage = () => {
    toast.info("Upgrade options", {
      description: "Our team will contact you with upgrade options within 1 business day.",
    });
  };

  const handleSwitchPolicy = (policy: Policy) => {
    setSelectedPolicyForSwitch(policy);
    setSwitchDialogOpen(true);
  };

  const handleDownloadDocument = (documentName: string) => {
    toast.success(`Downloading ${documentName}`, {
      description: "Your document download will begin shortly.",
    });
    // In a real app, this would trigger an actual file download
  };

  const handleReminderToggle = (type: 'email' | 'sms', value: boolean) => {
    setRenewalReminders(prev => ({ ...prev, [type]: value }));
    toast.success(`${type === 'email' ? 'Email' : 'SMS'} reminders ${value ? 'enabled' : 'disabled'}`);
  };

  const handleCancelPolicy = async () => {
    if (!selectedPolicy) return;

    if (!cancellationReason) {
      toast.error("Please select a reason for cancellation");
      return;
    }

    try {
      const { error } = await supabase
        .from("policies")
        .update({ 
          status: 'cancelled',
          cancellation_reason: cancellationReason,
          cancellation_details: cancellationDetails.trim() || null,
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", selectedPolicy.id);

      if (error) throw error;

      toast.success("Policy cancelled successfully", {
        description: "Your policy has been cancelled and will not renew.",
      });

      setCancelDialogOpen(false);
      setCancellationReason("");
      setCancellationDetails("");
      fetchPolicies();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error cancelling policy:", error);
      }
      toast.error("Failed to cancel policy", {
        description: "Please try again or contact support.",
      });
    }
  };

  const isWithinRenewalPeriod = (renewalDate: string) => {
    const renewal = new Date(renewalDate);
    const today = new Date();
    const diffTime = renewal.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 60 && diffDays > 0;
  };

  const selectedPolicy = policies.find(p => p.id === selectedPolicyId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Policies</h1>
        <p className="text-muted-foreground mt-1">View and manage your insurance policies</p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">Loading your policies...</div>
          </CardContent>
        </Card>
      ) : policies.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">No active policies found</div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Policy Selector */}
          {policies.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Select Policy</CardTitle>
                <CardDescription>Choose a policy to view details</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedPolicyId} onValueChange={setSelectedPolicyId}>
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Select a policy" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    {policies.map((policy) => (
                      <SelectItem key={policy.id} value={policy.id} className="py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-sm">
                            {policy.policy_number} - {policy.products.name}
                            {policy.status === 'cancelled' && ' (Cancelled)'}
                          </span>
                          {policy.covered_item && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                              {(() => {
                                const { Icon: DeviceIcon, color } = getDeviceIcon(policy.covered_item.product_name);
                                return <DeviceIcon className={`h-3 w-3 shrink-0 ${color}`} />;
                              })()}
                              {policy.covered_item.product_name} {policy.covered_item.model && `- ${policy.covered_item.model}`}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {selectedPolicy && (
            <div className="space-y-6">
              {/* Cancelled Policy Warning */}
              {selectedPolicy.status === 'cancelled' && (
                <Card className="border-destructive/50 bg-destructive/5">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-destructive">Policy Cancelled</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          This policy was cancelled on {new Date(selectedPolicy.cancelled_at!).toLocaleDateString()}.
                          {selectedPolicy.cancellation_reason && ` Reason: ${formatStatus(selectedPolicy.cancellation_reason)}.`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          This policy information will be available for 60 days after cancellation.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Active Policy Overview */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Policy {selectedPolicy.policy_number}
                      </CardTitle>
                      <CardDescription className="mt-1">{selectedPolicy.products.name}</CardDescription>
                      {selectedPolicy.covered_item && (
                        <div className="mt-2 text-sm flex items-center gap-2">
                          {(() => {
                            const { Icon: DeviceIcon, color } = getDeviceIcon(selectedPolicy.covered_item.product_name);
                            return <DeviceIcon className={`h-4 w-4 ${color}`} />;
                          })()}
                          <div>
                            <span className="font-medium">Insured Device: </span>
                            <span className="text-muted-foreground">
                              {selectedPolicy.covered_item.product_name}
                              {selectedPolicy.covered_item.model && ` - ${selectedPolicy.covered_item.model}`}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    <Badge className={selectedPolicy.status === 'active' ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}>
                      <CheckCircle className="mr-1 h-3 w-3" />
                      {formatStatus(selectedPolicy.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="text-sm text-muted-foreground">Monthly Premium</div>
                      {selectedPolicy.promotional_premium !== null && selectedPolicy.promotional_premium !== undefined ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg line-through text-muted-foreground">£{selectedPolicy.original_premium?.toFixed(2)}</span>
                            <span className="text-2xl font-bold text-success">£{selectedPolicy.promotional_premium.toFixed(2)}</span>
                          </div>
                          {selectedPolicy.promotion && (
                            <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-xs">
                              {selectedPolicy.promotion.promo_type === 'percentage_discount' && `${selectedPolicy.promotion.discount_value}% off`}
                              {selectedPolicy.promotion.promo_type === 'fixed_discount' && `£${selectedPolicy.promotion.discount_value?.toFixed(2)} off`}
                              {selectedPolicy.promotion.promo_type === 'free_months' && `${selectedPolicy.promotion.free_months} month(s) free`}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <div className="text-2xl font-bold">£{selectedPolicy.products.monthly_premium}</div>
                      )}
                    </div>
                    <div>
                    <div className="text-sm text-muted-foreground">Excess</div>
                    <div className="text-2xl font-bold">£{selectedPolicy.products.excess_1}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Start Date</div>
                      <div className="font-medium">{selectedPolicy.start_date}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Renewal Date</div>
                      <div className="font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-warning" />
                        {selectedPolicy.renewal_date}
                      </div>
                    </div>
                  </div>

                  {/* Customer Details Section */}
                  {(selectedPolicy.customer_name || selectedPolicy.customer_email || selectedPolicy.customer_phone) && (
                    <div className="pt-4 border-t">
                      <h3 className="text-sm font-semibold mb-3">Customer Details</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {selectedPolicy.customer_name && (
                          <div>
                            <div className="text-sm text-muted-foreground">Name</div>
                            <div className="font-medium">{selectedPolicy.customer_name}</div>
                          </div>
                        )}
                        {selectedPolicy.customer_email && (
                          <div>
                            <div className="text-sm text-muted-foreground">Email</div>
                            <div className="font-medium">{selectedPolicy.customer_email}</div>
                          </div>
                        )}
                        {selectedPolicy.customer_phone && (
                          <div>
                            <div className="text-sm text-muted-foreground">Phone</div>
                            <div className="font-medium">{selectedPolicy.customer_phone}</div>
                          </div>
                        )}
                        {(selectedPolicy.customer_address_line1 || selectedPolicy.customer_city || selectedPolicy.customer_postcode) && (
                          <div>
                            <div className="text-sm text-muted-foreground">Address</div>
                            <div className="font-medium text-sm space-y-0.5">
                              {selectedPolicy.customer_address_line1 && <div>{selectedPolicy.customer_address_line1}</div>}
                              {selectedPolicy.customer_address_line2 && <div>{selectedPolicy.customer_address_line2}</div>}
                              {(selectedPolicy.customer_city || selectedPolicy.customer_postcode) && (
                                <div>
                                  {selectedPolicy.customer_city}{selectedPolicy.customer_city && selectedPolicy.customer_postcode && ', '}{selectedPolicy.customer_postcode}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    {selectedPolicy.status === 'active' && (
                      <Button 
                        className="w-full" 
                        onClick={() => navigate('/customer/claim', { state: { policyId: selectedPolicy.id } })}
                      >
                        <FileWarning className="mr-2 h-4 w-4" />
                        Make Claim
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setEditDialogOpen(true)}
                      disabled={selectedPolicy.status === 'cancelled'}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Details
                    </Button>
                    {isWithinRenewalPeriod(selectedPolicy.renewal_date) && selectedPolicy.status === 'active' && (
                      <Button className="w-full" onClick={handleRenewPolicy}>
                        <Calendar className="mr-2 h-4 w-4" />
                        Renew Policy
                      </Button>
                    )}
                    {selectedPolicy.products.name !== "Insurance Max" && (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => handleSwitchPolicy(selectedPolicy)}
                        disabled={selectedPolicy.status === 'cancelled'}
                      >
                        <ArrowUpCircle className="mr-2 h-4 w-4" />
                        Upgrade Policy
                      </Button>
                    )}
                    {selectedPolicy.status === 'active' && (
                      <Button 
                        variant="destructive" 
                        className="w-full"
                        onClick={() => setCancelDialogOpen(true)}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancel Policy
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Two Column Layout for Better Space Usage */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Renewal Reminders */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Bell className="h-5 w-5" />
                      Renewal Reminders
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email-renewal" className="cursor-pointer">
                        <div className="font-medium text-sm">Email Reminders</div>
                        <div className="text-xs text-muted-foreground">Get notified via email</div>
                      </Label>
                      <Switch 
                        id="email-renewal" 
                        checked={renewalReminders.email}
                        onCheckedChange={(checked) => handleReminderToggle('email', checked)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="sms-renewal" className="cursor-pointer">
                        <div className="font-medium text-sm">SMS Reminders</div>
                        <div className="text-xs text-muted-foreground">Get notified via text</div>
                      </Label>
                      <Switch 
                        id="sms-renewal"
                        checked={renewalReminders.sms}
                        onCheckedChange={(checked) => handleReminderToggle('sms', checked)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* What's Covered */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">What's Covered</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {selectedPolicy.products.coverage.map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-success shrink-0 mt-0.5" />
                          <span className="text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Covered Device */}
              {selectedPolicy.covered_item && (
                <Card>
                  <CardHeader>
                    <CardTitle>Covered Device</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start justify-between p-4 border rounded-lg">
                      <div className="flex items-start gap-3">
                        {(() => {
                          const { Icon: DeviceIcon, color } = getDeviceIcon(selectedPolicy.covered_item.product_name);
                          return <DeviceIcon className={`h-10 w-10 ${color} shrink-0`} />;
                        })()}
                        <div className="space-y-1">
                          <div className="font-medium">{selectedPolicy.covered_item.product_name}</div>
                          <div className="text-sm text-muted-foreground">Model: {selectedPolicy.covered_item.model}</div>
                          <div className="text-sm text-muted-foreground">Serial: {selectedPolicy.covered_item.serial_number}</div>
                          <div className="text-xs text-muted-foreground">Added: {selectedPolicy.covered_item.added_date}</div>
                        </div>
                      </div>
                      <Badge variant="outline">Covered</Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Policy Documents */}
              <PolicyDocumentsCard 
                policyId={selectedPolicy.id} 
                customerEmail={selectedPolicy.customer_email || ''} 
              />

              {/* Policy Communications */}
              <PolicyCommunications policyId={selectedPolicy.id} />

              {/* Payment History */}
              <PolicyPaymentHistory policyId={selectedPolicy.id} />

              {/* Policy Action History */}
              <PolicyActionHistory policyId={selectedPolicy.id} />

              {/* Policy Change History */}
              <PolicyChangeHistory />
            </div>
          )}
        </>
      )}
      
      {/* Policy Switch Dialog */}
      {selectedPolicyForSwitch && (
        <PolicySwitchDialog
          open={switchDialogOpen}
          onOpenChange={setSwitchDialogOpen}
          currentPolicy={selectedPolicyForSwitch}
          onPolicyUpdated={fetchPolicies}
        />
      )}

      {/* Cancel Policy Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={(open) => {
        setCancelDialogOpen(open);
        if (!open) {
          setCancellationReason("");
          setCancellationDetails("");
        }
      }}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Policy</AlertDialogTitle>
            <AlertDialogDescription>
              We're sorry to see you go. Please help us improve by telling us why you're cancelling.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label className="text-base font-semibold">Reason for cancellation *</Label>
              <RadioGroup value={cancellationReason} onValueChange={setCancellationReason}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="too_expensive" id="too_expensive" />
                  <Label htmlFor="too_expensive" className="font-normal cursor-pointer">
                    Too expensive / Found better price elsewhere
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="not_needed" id="not_needed" />
                  <Label htmlFor="not_needed" className="font-normal cursor-pointer">
                    No longer need coverage
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="poor_service" id="poor_service" />
                  <Label htmlFor="poor_service" className="font-normal cursor-pointer">
                    Unsatisfied with service
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="claim_denied" id="claim_denied" />
                  <Label htmlFor="claim_denied" className="font-normal cursor-pointer">
                    Claim was denied
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="poor_coverage" id="poor_coverage" />
                  <Label htmlFor="poor_coverage" className="font-normal cursor-pointer">
                    Coverage doesn't meet my needs
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other" className="font-normal cursor-pointer">
                    Other reason
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cancellation-details" className="text-sm">
                Additional details (optional)
              </Label>
              <Textarea
                id="cancellation-details"
                placeholder="Please share any additional feedback that could help us improve..."
                value={cancellationDetails}
                onChange={(e) => setCancellationDetails(e.target.value)}
                className="resize-none"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {cancellationDetails.length}/500 characters
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Keep Policy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelPolicy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!cancellationReason}
            >
              Cancel Policy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Policy Details Dialog */}
      {selectedPolicy && (
        <CustomerPolicyEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          policy={selectedPolicy}
          onSuccess={fetchPolicies}
        />
      )}
    </div>
  );
}
