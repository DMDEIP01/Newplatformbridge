import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CheckCircle, Calendar, Clock, Phone, Mail, MessageSquare, Package, Home, Wrench, AlertCircle, Download, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";


interface ClaimDetails {
  claim_number: string;
  claim_type: string;
  status: string;
  submitted_date: string;
  policies: {
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    products: {
      name: string;
      device_categories: string[];
    };
  };
}

interface FulfillmentDetails {
  fulfillment_type: string;
  appointment_date: string;
  appointment_slot: string;
  logistics_reference: string;
  engineer_reference: string;
  device_value: number;
  repairer_id: string;
}

export default function RetailClaimNextSteps() {
  const { claimId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [claim, setClaim] = useState<ClaimDetails | null>(null);
  const [fulfillment, setFulfillment] = useState<FulfillmentDetails | null>(null);

  useEffect(() => {
    loadClaimAndFulfillment();
  }, [claimId]);

  const loadClaimAndFulfillment = async () => {
    try {
      // Load claim details
      const { data: claimData, error: claimError } = await supabase
        .from("claims")
        .select(`
          claim_number,
          claim_type,
          status,
          submitted_date,
          policies (
            customer_name,
            customer_email,
            customer_phone,
            products (
              name,
              device_categories
            )
          )
        `)
        .eq("id", claimId)
        .single();

      if (claimError) throw claimError;

      // Load fulfillment details
      const { data: fulfillmentData, error: fulfillmentError } = await supabase
        .from("claim_fulfillment")
        .select("*")
        .eq("claim_id", claimId)
        .single();

      if (fulfillmentError && fulfillmentError.code !== "PGRST116") {
        throw fulfillmentError;
      }

      setClaim(claimData as any);
      setFulfillment(fulfillmentData as any);
    } catch (error) {
      console.error("Error loading claim details:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!claim || !fulfillment) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Unable to load claim details. Please try again.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate("/retail/claims")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Claims
        </Button>
      </div>
    );
  }

  const deviceCategory = claim.policies.products?.device_categories?.[0] || "";
  const requiresInHomeRepair = ["home appliances", "tv", "tvs", "smart tv", "smart tvs"].includes(
    deviceCategory.toLowerCase()
  );
  const isVoucher = fulfillment.fulfillment_type === "voucher";

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/retail/claims")}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Claims
        </Button>

        {/* Success Banner */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-success via-success/90 to-success/80 p-8 text-white shadow-lg">
          <div className="relative z-10 flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <CheckCircle className="h-8 w-8" />
              </div>
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">Claim Processed Successfully!</h1>
              <p className="text-white/90 text-lg">
                {isVoucher
                  ? "Your replacement voucher has been issued"
                  : `Your ${requiresInHomeRepair ? "engineer appointment" : "device collection"} has been scheduled`}
              </p>
            </div>
          </div>
          <div className="absolute right-0 top-0 h-full w-1/3 opacity-10">
            <div className="absolute right-8 top-8 h-40 w-40 rounded-full bg-white blur-3xl" />
            <div className="absolute right-16 bottom-8 h-32 w-32 rounded-full bg-white blur-2xl" />
          </div>
        </div>

        {/* Claim Reference Card */}
        <Card className="border-2 border-success/20 bg-success/5">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white dark:bg-card rounded-lg border">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Claim Reference</p>
                <p className="font-mono font-bold text-xl text-primary">{claim.claim_number}</p>
              </div>
              <div className="p-4 bg-white dark:bg-card rounded-lg border">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Status</p>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  {claim.status.replace(/_/g, " ").toUpperCase()}
                </Badge>
              </div>
              <div className="p-4 bg-white dark:bg-card rounded-lg border">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Customer</p>
                <p className="font-semibold">{claim.policies.customer_name}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isVoucher ? (
          /* Voucher Path */
          <>
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-success" />
                  Voucher Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-6 bg-gradient-to-br from-success/10 to-success/5 border-2 border-success/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Voucher Value</p>
                      <p className="text-4xl font-bold text-success">€{fulfillment.device_value?.toFixed(2)}</p>
                    </div>
                    <CheckCircle className="h-16 w-16 text-success/20" />
                  </div>
                </div>

                <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
                  <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertDescription>
                    <strong>Email Sent:</strong> Voucher code and redemption instructions have been sent to {claim.policies.customer_email}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  How to Redeem Your Voucher
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { icon: Mail, title: "Check Your Email", desc: "Your voucher code and full instructions have been sent to your registered email address" },
                    { icon: Package, title: "Visit Store or Online", desc: "Use the voucher at any MediaMarkt store or on our website" },
                    { icon: CheckCircle, title: "Apply at Checkout", desc: "Present or enter your voucher code during checkout" },
                    { icon: Clock, title: "Valid for 90 Days", desc: "Use within 90 days from the issue date" }
                  ].map((step, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <step.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">{step.title}</h4>
                        <p className="text-sm text-muted-foreground">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Alert className="border-warning/20 bg-warning/5">
              <AlertCircle className="h-4 w-4 text-warning" />
              <AlertDescription>
                <strong>Important:</strong> The voucher can be used towards any product. Any remaining balance will be forfeited.
              </AlertDescription>
            </Alert>
          </>
        ) : (
          /* Repair/Collection Path */
          <>
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {requiresInHomeRepair ? <Home className="h-5 w-5 text-primary" /> : <Package className="h-5 w-5 text-primary" />}
                  {requiresInHomeRepair ? "Engineer Appointment Details" : "Collection Details"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Date</p>
                      <p className="font-semibold">
                        {fulfillment.appointment_date
                          ? format(new Date(fulfillment.appointment_date), "EEEE, MMMM d, yyyy")
                          : "Not scheduled"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Time</p>
                      <p className="font-semibold">{fulfillment.appointment_slot || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Reference</p>
                      <p className="font-mono font-semibold text-sm">
                        {requiresInHomeRepair ? fulfillment.engineer_reference : fulfillment.logistics_reference}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                  What Happens Next
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(requiresInHomeRepair ? [
                    { step: 1, text: "Our engineer will visit your home at the scheduled time" },
                    { step: 2, text: "They will inspect and diagnose the issue with your appliance" },
                    { step: 3, text: "If possible, repairs will be completed on-site during the visit" },
                    { step: 4, text: "If parts are needed, we'll order them and schedule a follow-up visit" },
                    { step: 5, text: "You'll receive a confirmation email with engineer details 24 hours before the appointment" },
                    { step: 6, text: "Engineer will call 30 minutes before arrival" }
                  ] : [
                    { step: 1, text: "Our courier will arrive at the scheduled time to collect your device" },
                    { step: 2, text: "Ensure your device is properly packaged and ready for collection" },
                    { step: 3, text: "You'll receive tracking updates via email and SMS throughout the process" },
                    { step: 4, text: "Device will be assessed and repaired at our authorized service center" },
                    { step: 5, text: "Once repaired, it will be returned to you within 5-7 working days" },
                    { step: 6, text: "You'll receive confirmation 24 hours before the return delivery" }
                  ]).map((item) => (
                    <div key={item.step} className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors">
                      <span className="flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex-shrink-0">
                        {item.step}
                      </span>
                      <span className="text-sm pt-0.5">{item.text}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {!requiresInHomeRepair && (
              <Card className="border-warning/20 bg-warning/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="h-5 w-5 text-warning" />
                    Before Collection - Important Checklist
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      "Back up all data from your device before packing",
                      "Remove SIM cards, memory cards, and any personal accessories",
                      "Use original packaging if available, or a sturdy box with cushioning",
                      "Label the package clearly with your claim reference number",
                      "Take photos of the device before packing for your records",
                      "Have the packaged device ready at least 15 minutes before collection",
                      "Someone 18+ must be present to hand over the device"
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 bg-white dark:bg-card rounded-lg border">
                        <CheckCircle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {requiresInHomeRepair && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wrench className="h-5 w-5 text-primary" />
                    Before the Engineer Arrives
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      "Ensure clear access to the appliance",
                      "Have your warranty and purchase documents ready",
                      "Note any specific issues to mention to the engineer",
                      "Clear the area around the appliance",
                      "Ensure pets are secured in another room",
                      "Someone 18+ must be present during the visit"
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 bg-white dark:bg-card rounded-lg border">
                        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Contact & Support Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Need Help or Want to Make Changes?
            </CardTitle>
            <CardDescription>
              Our customer service team is here to help you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1">Call Us</h4>
                    <p className="text-sm text-muted-foreground mb-2">Mon-Fri: 9:00 AM - 6:00 PM</p>
                    <p className="font-mono font-semibold text-primary">1800 449 449</p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg border">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1">Email Support</h4>
                    <p className="text-sm text-muted-foreground mb-2">Response within 24 hours</p>
                    <p className="font-semibold text-primary">support@mediamarkt.ie</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <Alert className="border-primary/20 bg-primary/5">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertDescription>
                <strong className="block mb-1">Need to reschedule?</strong>
                Contact us at least 24 hours before your appointment. Late cancellations may incur a fee.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={() => navigate("/retail/claims")} 
            className="flex-1"
            size="lg"
          >
            Return to Claims Dashboard
          </Button>
          <Button 
            variant="outline"
            onClick={() => window.print()}
            className="flex-1"
            size="lg"
          >
            <Download className="mr-2 h-4 w-4" />
            Print This Page
          </Button>
        </div>
      </div>
    );
}
