import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Calendar, Bell, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import PaymentDetailsForm from "@/components/PaymentDetailsForm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Policy {
  id: string;
  policy_number: string;
  products: {
    name: string;
    monthly_premium: number;
  };
  covered_item?: {
    product_name: string;
    model: string | null;
  } | null;
}

const paymentHistory = [
  { date: "2024-01-17", type: "Excess Payment", amount: 20.00, status: "paid", ref: "EXC-001" },
  { date: "2024-01-15", type: "Monthly Premium", amount: 3.99, status: "paid", ref: "PRM-024" },
  { date: "2023-12-15", type: "Monthly Premium", amount: 3.99, status: "paid", ref: "PRM-023" },
  { date: "2023-11-15", type: "Monthly Premium", amount: 3.99, status: "paid", ref: "PRM-022" },
];

const upcomingPayment = {
  date: "2024-02-15",
  amount: 3.99,
  type: "Monthly Premium",
};

interface PendingExcess {
  id: string;
  claim_number: string;
  claim_type: string;
  submitted_date: string;
  policies: {
    policy_number: string;
    products: {
      name: string;
      excess_1: number;
      type: string;
    };
  };
}

interface FulfillmentSelection {
  claimId: string;
  claimNumber: string;
  claimType: string;
  productType: string;
}

export default function Payments() {
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [paymentDebitDate, setPaymentDebitDate] = useState("1");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [iban, setIban] = useState("");
  const [bic, setBic] = useState("");
  const [pendingExcessPayments, setPendingExcessPayments] = useState<PendingExcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [fulfillmentDialog, setFulfillmentDialog] = useState<FulfillmentSelection | null>(null);
  const [selectedFulfillment, setSelectedFulfillment] = useState<string>("");
  const [emailReminder, setEmailReminder] = useState(true);
  const [smsReminder, setSmsReminder] = useState(false);
  const [reminderDays, setReminderDays] = useState(7);
  const [userId, setUserId] = useState<string | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("all");

  useEffect(() => {
    fetchUserPolicies();
    fetchPendingExcessPayments();
    fetchUserPreferences();
  }, []);

  const fetchUserPolicies = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("policies")
        .select(`
          id,
          policy_number,
          products (
            name,
            monthly_premium
          ),
          covered_items (
            product_name,
            model
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const formattedPolicies = (data || []).map(p => ({
        ...p,
        covered_item: p.covered_items as unknown as Policy['covered_item']
      }));
      
      setPolicies(formattedPolicies);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching policies:", error);
      }
    }
  };

  const fetchUserPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUserId(user.id);

      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setEmailReminder(data.payment_email_reminder);
        setSmsReminder(data.payment_sms_reminder);
        setReminderDays(data.payment_reminder_days);
      } else {
        // Create default preferences
        const { error: insertError } = await supabase
          .from("user_preferences")
          .insert([{
            user_id: user.id,
            payment_email_reminder: true,
            payment_sms_reminder: false,
            payment_reminder_days: 7,
          }]);

        if (insertError) throw insertError;
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching preferences:", error);
      }
    }
  };

  const updatePreference = async (field: string, value: boolean | number) => {
    if (!userId) {
      toast.error("Please wait while we load your preferences");
      return;
    }

    try {
      const { error } = await supabase
        .from("user_preferences")
        .upsert({ 
          user_id: userId,
          [field]: value 
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast.success("Preference saved", {
        description: "Your reminder settings have been updated.",
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error updating preference:", error);
      }
      toast.error("Failed to save preference. Please try again.");
    }
  };

  const fetchPendingExcessPayments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("claims")
        .select(`
          id,
          claim_number,
          claim_type,
          submitted_date,
          policies!inner (
            policy_number,
            products!inner (
              name,
              excess_1,
              type
            )
          )
        `)
        .eq("user_id", user.id)
        .eq("decision", "accepted")
        .eq("status", "notified");

      if (error) throw error;
      setPendingExcessPayments(data || []);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching pending excess payments:", error);
      }
      toast.error("Failed to load pending payments");
    } finally {
      setLoading(false);
    }
  };

  const handlePayExcess = async (claim: PendingExcess) => {
    setProcessingPayment(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create payment record
      const { error: paymentError } = await supabase
        .from("payments")
        .insert([{
          user_id: user.id,
          claim_id: claim.id,
        payment_type: "excess",
        amount: claim.policies.products.excess_1,
          status: "paid",
          reference_number: `EXC-${Date.now()}`,
          payment_date: new Date().toISOString(),
        }] as any);

      if (paymentError) throw paymentError;

      toast.success("Payment successful", {
        description: `Excess payment of £${claim.policies.products.excess_1.toFixed(2)} has been processed.`,
      });

      // Show fulfillment selection dialog
      setFulfillmentDialog({
        claimId: claim.id,
        claimNumber: claim.claim_number,
        claimType: claim.claim_type,
        productType: claim.policies.products.type,
      });

      // Refresh pending payments
      fetchPendingExcessPayments();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error processing payment:", error);
      }
      toast.error("Payment failed. Please try again.");
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleFulfillmentSelection = async () => {
    if (!selectedFulfillment || !fulfillmentDialog) {
      toast.error("Please select a fulfillment option");
      return;
    }

    try {
      // Update claim status based on selection
      const newStatus = selectedFulfillment === "repair" ? "inbound_logistics" : "inbound_logistics";
      
      const { error } = await supabase
        .from("claims")
        .update({ status: newStatus })
        .eq("id", fulfillmentDialog.claimId);

      if (error) throw error;

      // Add status history
      await supabase
        .from("claim_status_history")
        .insert({
          claim_id: fulfillmentDialog.claimId,
          status: newStatus,
          notes: `Customer selected ${selectedFulfillment} for fulfillment`,
        });

      toast.success("Fulfillment option selected", {
        description: `Your ${selectedFulfillment} request has been submitted. We'll arrange collection soon.`,
      });

      setFulfillmentDialog(null);
      setSelectedFulfillment("");
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error updating fulfillment:", error);
      }
      toast.error("Failed to update fulfillment option");
    }
  };

  const getFulfillmentOptions = (claimType: string, productType: string) => {
    // Theft claims always get replacement
    if (claimType === "theft") {
      return [
        { value: "replacement", label: "Replacement", description: "We'll send you a replacement product" }
      ];
    }
    
    // Extended warranty (breakdown) and damage claims can be repaired or replaced
    if (claimType === "breakdown" || claimType === "damage") {
      return [
        { value: "repair", label: "Repair", description: "We'll repair your product if possible" },
        { value: "replacement", label: "Replacement", description: "We'll replace your product if repair isn't possible" }
      ];
    }

    // Default to both options
    return [
      { value: "repair", label: "Repair", description: "We'll repair your product if possible" },
      { value: "replacement", label: "Replacement", description: "We'll replace your product if repair isn't possible" }
    ];
  };

  const handleUpdatePayment = () => {
    setIsPaymentDialogOpen(true);
  };

  const handleSavePaymentDetails = () => {
    // Validate payment details based on selected method
    if (paymentMethod === "card" || paymentMethod === "credit_card") {
      if (!cardholderName || !cardNumber || !expiryDate || !cvv) {
        toast.error("Please fill in all card details");
        return;
      }
    } else if (paymentMethod === "sepa_debit") {
      if (!iban || !bic) {
        toast.error("Please fill in IBAN and BIC details");
        return;
      }
    }

    // In a real app, this would securely process the payment details
    const methodName = paymentMethod === "sepa_debit" ? "SEPA Direct Debit" : "Credit/Debit Card";
    toast.success(`Payment method updated to ${methodName}`, {
      description: `Your payment details have been saved securely. Payments will be taken on the ${paymentDebitDate}${paymentDebitDate === "1" ? "st" : paymentDebitDate === "2" ? "nd" : paymentDebitDate === "3" ? "rd" : "th"} of each month.`,
    });
    setIsPaymentDialogOpen(false);
    
    // Clear the form
    setCardNumber("");
    setExpiryDate("");
    setCvv("");
    setCardholderName("");
    setIban("");
    setBic("");
  };

  const handleSetReminder = async (days: number) => {
    setReminderDays(days);
    await updatePreference("payment_reminder_days", days);
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, "");
    const formatted = cleaned.match(/.{1,4}/g)?.join(" ") || cleaned;
    return formatted.slice(0, 19); // Max 16 digits + 3 spaces
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  return (
    <>
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground mt-1">View and manage your payments</p>
        </div>
        
        {policies.length > 0 && (
          <div className="w-full sm:w-64">
            <Select value={selectedPolicyId} onValueChange={setSelectedPolicyId}>
              <SelectTrigger className="bg-background border">
                <SelectValue placeholder="Select a policy" />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                <SelectItem value="all">All Policies</SelectItem>
                {policies.map((policy) => (
                  <SelectItem key={policy.id} value={policy.id} className="py-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-sm">
                        {policy.policy_number} - {policy.products.name}
                      </span>
                      {policy.covered_item && (
                        <span className="text-xs text-muted-foreground">
                          {policy.covered_item.product_name}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Selected Policy Summary */}
      {selectedPolicyId !== "all" && policies.find(p => p.id === selectedPolicyId) && (
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Viewing payments for</p>
                <p className="font-semibold">
                  {policies.find(p => p.id === selectedPolicyId)?.policy_number} - {policies.find(p => p.id === selectedPolicyId)?.products.name}
                </p>
                {policies.find(p => p.id === selectedPolicyId)?.covered_item && (
                  <p className="text-sm text-muted-foreground">
                    {policies.find(p => p.id === selectedPolicyId)?.covered_item?.product_name}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Monthly Premium</p>
                <p className="text-xl font-bold">£{policies.find(p => p.id === selectedPolicyId)?.products.monthly_premium.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Excess Payments */}
      {!loading && pendingExcessPayments.filter(p => selectedPolicyId === "all" || p.policies.policy_number === policies.find(pol => pol.id === selectedPolicyId)?.policy_number).length > 0 && (
        <Alert className="border-warning bg-warning/10">
          <AlertCircle className="h-5 w-5 text-warning" />
          <AlertDescription>
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-base text-foreground mb-2">
                  Excess Payment Required - {pendingExcessPayments.filter(p => selectedPolicyId === "all" || p.policies.policy_number === policies.find(pol => pol.id === selectedPolicyId)?.policy_number).length} pending {pendingExcessPayments.filter(p => selectedPolicyId === "all" || p.policies.policy_number === policies.find(pol => pol.id === selectedPolicyId)?.policy_number).length === 1 ? "payment" : "payments"}
                </p>
                <p className="text-sm">Complete your payment to proceed with claim processing</p>
              </div>
              
              {pendingExcessPayments.filter(p => selectedPolicyId === "all" || p.policies.policy_number === policies.find(pol => pol.id === selectedPolicyId)?.policy_number).map((claim) => (
                <Card key={claim.id} className="border-warning/50">
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="font-semibold text-lg">{claim.claim_number}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {claim.policies.policy_number} • {claim.policies.products.name}
                        </div>
                      </div>
                      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                        <div className="bg-primary/10 px-6 py-3 rounded-lg border-2 border-primary/30">
                        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Excess Amount</div>
                        <div className="text-3xl font-bold text-primary">£{claim.policies.products.excess_1.toFixed(2)}</div>
                        </div>
                        <Button
                          size="lg"
                          onClick={() => handlePayExcess(claim)}
                          disabled={processingPayment}
                          className="w-full md:w-auto"
                        >
                          {processingPayment ? "Processing..." : "Pay Now"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {!loading && pendingExcessPayments.filter(p => selectedPolicyId === "all" || p.policies.policy_number === policies.find(pol => pol.id === selectedPolicyId)?.policy_number).length === 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            No pending excess payments {selectedPolicyId !== "all" ? "for this policy " : ""}at this time.
          </AlertDescription>
        </Alert>
      )}

      {/* Upcoming Payment */}
      {(selectedPolicyId === "all" || policies.find(p => p.id === selectedPolicyId)) && (
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-warning" />
                  Next Payment Due
                </CardTitle>
                <CardDescription className="mt-1">
                  {selectedPolicyId !== "all" ? "15th of next month" : upcomingPayment.date}
                </CardDescription>
              </div>
              <Badge className="bg-warning text-warning-foreground">Upcoming</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                {selectedPolicyId !== "all" ? "Monthly Premium" : upcomingPayment.type}
              </span>
              <span className="text-2xl font-bold">
                £{selectedPolicyId !== "all" 
                  ? policies.find(p => p.id === selectedPolicyId)?.products.monthly_premium.toFixed(2) 
                  : upcomingPayment.amount.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border">
              <Switch id="reminder" checked={emailReminder} onCheckedChange={(checked) => {
                setEmailReminder(checked);
                updatePreference("payment_email_reminder", checked);
              }} />
              <Label htmlFor="reminder" className="cursor-pointer">
                <div className="font-medium">Set Payment Reminder</div>
                <div className="text-sm text-muted-foreground">Get notified before payment is due</div>
              </Label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Method
          </CardTitle>
          <CardDescription>Manage your payment details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">Visa ending in 4242</div>
                <div className="text-sm text-muted-foreground">Expires 12/2025</div>
              </div>
            </div>
            <Badge variant="outline">Default</Badge>
          </div>
          <Button variant="outline" className="w-full" onClick={handleUpdatePayment}>
            Change Payment Method
          </Button>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Your past premium and excess payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {paymentHistory.map((payment, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-success/10 rounded">
                    <CheckCircle className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <div className="font-medium">{payment.type}</div>
                    <div className="text-sm text-muted-foreground">
                      {payment.date} • Ref: {payment.ref}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">£{payment.amount.toFixed(2)}</div>
                  <Badge variant="outline" className="text-xs border-success text-success">
                    {payment.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reminder Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Reminder Preferences
          </CardTitle>
          <CardDescription>Choose how you'd like to be reminded about payments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email-reminder" className="cursor-pointer">
              <div className="font-medium">Email Reminders</div>
              <div className="text-sm text-muted-foreground">Receive payment reminders via email</div>
            </Label>
            <Switch 
              id="email-reminder" 
              checked={emailReminder}
              onCheckedChange={(checked) => {
                setEmailReminder(checked);
                updatePreference("payment_email_reminder", checked);
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="sms-reminder" className="cursor-pointer">
              <div className="font-medium">SMS Reminders</div>
              <div className="text-sm text-muted-foreground">Receive payment reminders via text message</div>
            </Label>
            <Switch 
              id="sms-reminder"
              checked={smsReminder}
              onCheckedChange={(checked) => {
                setSmsReminder(checked);
                updatePreference("payment_sms_reminder", checked);
              }}
            />
          </div>
          <div className="pt-2">
            <Label htmlFor="days-before" className="text-sm text-muted-foreground">
              Remind me (days before payment)
            </Label>
            <div className="flex gap-2 mt-2">
              {[3, 7, 14].map((days) => (
                <Button 
                  key={days} 
                  variant={reminderDays === days ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSetReminder(days)}
                >
                  {days} days
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    
    {/* Payment Details Dialog */}
    <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Payment Method</DialogTitle>
          <DialogDescription>
            Switch your payment method or update your payment details. Your information is processed securely.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <PaymentDetailsForm
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            paymentDebitDate={paymentDebitDate}
            onPaymentDebitDateChange={setPaymentDebitDate}
            iban={iban}
            bic={bic}
            onIbanChange={setIban}
            onBicChange={setBic}
            cardNumber={cardNumber}
            expiryDate={expiryDate}
            cvv={cvv}
            cardholderName={cardholderName}
            onCardNumberChange={setCardNumber}
            onExpiryDateChange={setExpiryDate}
            onCvvChange={setCvv}
            onCardholderNameChange={setCardholderName}
            showTitle={false}
            availableMethods={["card", "sepa_debit"]}
            required
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSavePaymentDetails}>Save Payment Method</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Fulfillment Selection Dialog */}
    <Dialog open={!!fulfillmentDialog} onOpenChange={(open) => !open && setFulfillmentDialog(null)}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Select Fulfillment Option</DialogTitle>
          <DialogDescription>
            Choose how you'd like us to handle your claim for {fulfillmentDialog?.claimNumber}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <RadioGroup value={selectedFulfillment} onValueChange={setSelectedFulfillment}>
            <div className="space-y-3">
              {fulfillmentDialog && getFulfillmentOptions(fulfillmentDialog.claimType, fulfillmentDialog.productType).map((option) => (
                <div key={option.value} className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-secondary/50 cursor-pointer">
                  <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                  <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-muted-foreground">{option.description}</div>
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
          {fulfillmentDialog?.claimType === "theft" && (
            <Alert className="mt-4">
              <AlertDescription>
                For theft claims, replacement is the only available option.
              </AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setFulfillmentDialog(null)}>
            Cancel
          </Button>
          <Button onClick={handleFulfillmentSelection} disabled={!selectedFulfillment}>
            Confirm Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
