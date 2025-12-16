import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, CheckCircle, Loader2, Package, Wrench, Home, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import RepairerRecommendations from "./RepairerRecommendations";
import PaymentDetailsForm from "@/components/PaymentDetailsForm";

interface ClaimFulfillmentFlowProps {
  claimId: string;
  claimType: string;
  deviceCategory: string;
  coverageArea?: string;
  policyId: string;
  onComplete?: () => void;
}

interface FulfillmentData {
  id?: string;
  excess_paid: boolean;
  excess_amount?: number;
  excess_payment_date?: string;
  excess_payment_method?: string;
  device_value?: number;
  fulfillment_type?: string;
  appointment_date?: string;
  appointment_slot?: string;
  logistics_reference?: string;
  engineer_reference?: string;
  repairer_id?: string;
  status: string;
}

export default function ClaimFulfillmentFlow({
  claimId,
  claimType,
  deviceCategory: propDeviceCategory,
  coverageArea,
  policyId,
  onComplete,
}: ClaimFulfillmentFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [detectedDeviceCategory, setDetectedDeviceCategory] = useState<string>("");

  const [fulfillmentData, setFulfillmentData] = useState<FulfillmentData>({
    excess_paid: false,
    status: "pending_excess",
  });

  const [appointmentDate, setAppointmentDate] = useState<Date>();
  const [selectedSlot, setSelectedSlot] = useState("");
  const [policyExcess, setPolicyExcess] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [usePaymentOnFile, setUsePaymentOnFile] = useState<boolean | null>(null);
  const [policyPaymentMethod, setPolicyPaymentMethod] = useState<string | null>(null);
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardholderName: ""
  });
  const [bankDetails, setBankDetails] = useState({
    // SEPA
    iban: "",
    bic: ""
  });
  const [unavailableDates, setUnavailableDates] = useState<Date[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [claimReference, setClaimReference] = useState<string>("");
  const [claimStatus, setClaimStatus] = useState<string>("");
  const [selectedRepairerId, setSelectedRepairerId] = useState<string | null>(null);
  const [repairerName, setRepairerName] = useState<string>("");
  const navigate = useNavigate();

  // Use detected category from database, fall back to prop
  const deviceCategory = detectedDeviceCategory || propDeviceCategory;

  // Category mapping to standardize device categories
  const categoryMapping: Record<string, string> = {
    'tv': 'TVs',
    'television': 'TVs',
    'smart tv': 'TVs',
    'brown goods': 'TVs',
    'home appliances': 'Home Appliances',
    'white goods': 'Home Appliances',
    'washing machine': 'Home Appliances',
    'refrigerator': 'Home Appliances',
    'dishwasher': 'Home Appliances',
  };

  // Detect device category from database based on policy's covered item
  useEffect(() => {
    const detectDeviceCategory = async () => {
      try {
        // First get the product name from covered_items
        const { data: coveredItem } = await supabase
          .from("covered_items")
          .select("product_name")
          .eq("policy_id", policyId)
          .maybeSingle();

        if (coveredItem?.product_name) {
          const productName = coveredItem.product_name;
          console.log("Detecting device category for product:", productName);

          // Try to find matching device in devices table
          const { data: device } = await supabase
            .from("devices")
            .select("device_category, manufacturer, model_name")
            .or(`model_name.ilike.%${productName}%`)
            .limit(1);

          if (device && device.length > 0 && device[0].device_category) {
            const rawCategory = device[0].device_category;
            const normalizedCategory = categoryMapping[rawCategory.toLowerCase()] || rawCategory;
            console.log("Found device category from database:", rawCategory, "->", normalizedCategory);
            setDetectedDeviceCategory(normalizedCategory);
            return;
          }

          // Fallback: keyword-based detection if not found in devices table
          const lowerProductName = productName.toLowerCase();
          if (lowerProductName.includes('tv') || 
              lowerProductName.includes('television') || 
              lowerProductName.includes('oled') || 
              lowerProductName.includes('qled') ||
              lowerProductName.includes('led tv') ||
              lowerProductName.includes('smart tv') ||
              lowerProductName.includes('x95') ||
              lowerProductName.includes('bravia')) {
            console.log("Detected TV category from product name keywords:", productName);
            setDetectedDeviceCategory("TVs");
          } else if (lowerProductName.includes('washing') || 
                     lowerProductName.includes('dryer') || 
                     lowerProductName.includes('dishwasher') ||
                     lowerProductName.includes('refrigerator') ||
                     lowerProductName.includes('fridge') ||
                     lowerProductName.includes('oven') ||
                     lowerProductName.includes('cooker')) {
            console.log("Detected Home Appliances category from product name keywords:", productName);
            setDetectedDeviceCategory("Home Appliances");
          }
        }
      } catch (error) {
        console.error("Error detecting device category:", error);
      }
    };

    detectDeviceCategory();
  }, [policyId]);

  // Device category determines fulfillment path
  // Large items (Home Appliances, TVs, Smart TVs, Brown Goods) require in-home repair/inspection
  const requiresInHomeRepair = [
    "home appliances", 
    "tv", 
    "tvs", 
    "smart tv", 
    "smart tvs",
    "brown goods", // TVs and audio equipment
    "white goods", // Washing machines, refrigerators, etc.
    "washing machine",
    "washing machines",
    "refrigerator",
    "refrigerators",
    "dishwasher",
    "dishwashers",
    "oven",
    "ovens",
    "large appliances"
  ].includes(deviceCategory?.toLowerCase() || "");

  // Mock API: Fetch unavailable dates based on selected repairer
  const fetchUnavailableDates = async (repairerId: string | null) => {
    if (!repairerId) {
      setUnavailableDates([]);
      return;
    }
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate repairer-specific unavailable dates based on repairer ID
    const today = new Date();
    const unavailable: Date[] = [];
    
    // Use repairer ID to generate consistent but different unavailable dates
    const hash = repairerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const pattern = hash % 5; // 5 different patterns
    
    // Different availability patterns for different repairers
    for (let i = 1; i <= 30; i++) {
      const shouldBeUnavailable = 
        (pattern === 0 && i % 7 === 0) || // Every 7th day
        (pattern === 1 && i % 5 === 0) || // Every 5th day
        (pattern === 2 && (i % 3 === 0 || i % 10 === 0)) || // Every 3rd and 10th day
        (pattern === 3 && i % 4 === 0) || // Every 4th day
        (pattern === 4 && (i % 6 === 0 || i === 2)); // Every 6th day and day 2
      
      if (shouldBeUnavailable) {
        unavailable.push(new Date(today.getFullYear(), today.getMonth(), today.getDate() + i));
      }
    }
    
    console.log(`Unavailable dates for repairer ${repairerId}:`, unavailable.length, 'dates');
    setUnavailableDates(unavailable);
  };

  // Mock API: Fetch available time slots for a specific date and repairer
  const fetchAvailableSlots = async (date: Date, repairerId: string | null) => {
    setLoadingSlots(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const allSlots = [
      "09:00 - 11:00",
      "11:00 - 13:00",
      "13:00 - 15:00",
      "15:00 - 17:00",
      "17:00 - 19:00",
    ];
    
    if (!repairerId) {
      setAvailableSlots(allSlots);
      setLoadingSlots(false);
      return;
    }
    
    // Generate repairer-specific slot availability
    const hash = repairerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const dayOfMonth = date.getDate();
    let available = [...allSlots];
    
    // Different slot patterns based on repairer
    const pattern = (hash + dayOfMonth) % 4;
    
    if (pattern === 0) {
      available = available.filter((_, index) => index !== 0 && index !== 2); // Remove slots 1 & 3
    } else if (pattern === 1) {
      available = available.filter((_, index) => index !== 1 && index !== 4); // Remove slots 2 & 5
    } else if (pattern === 2) {
      available = available.filter((_, index) => index !== 3); // Remove slot 4
    }
    // pattern 3 keeps all slots
    
    console.log(`Available slots for repairer ${repairerId} on ${date.toDateString()}:`, available.length, 'slots');
    setAvailableSlots(available);
    setLoadingSlots(false);
  };

  useEffect(() => {
    loadFulfillmentData();
    loadPolicyExcess();
    loadDeviceValue();
    loadClaimDetails();
    loadPolicyPaymentMethod();
  }, [claimId]);

  // Load policy payment method to offer "use payment on file" option
  const loadPolicyPaymentMethod = async () => {
    try {
      // Get payment records for this policy to see if there's a payment method on file
      const { data: payments, error } = await supabase
        .from("payments")
        .select("reference_number")
        .eq("policy_id", policyId)
        .eq("status", "paid")
        .order("payment_date", { ascending: false })
        .limit(1);

      if (!error && payments && payments.length > 0) {
        // Payment exists on file, likely SEPA or card
        setPolicyPaymentMethod("on_file");
      }
    } catch (error: any) {
      console.error("Error loading policy payment method:", error);
    }
  };

  // Fetch unavailable dates when repairer is selected
  useEffect(() => {
    if (selectedRepairerId && currentStep === 4) {
      console.log('Fetching dates for repairer:', selectedRepairerId);
      fetchUnavailableDates(selectedRepairerId);
      setAppointmentDate(undefined); // Reset date when repairer changes
      setSelectedSlot(""); // Reset slot when repairer changes
      // Load repairer name when selected
      loadRepairerName(selectedRepairerId);
    }
  }, [selectedRepairerId, currentStep]);

  // Fetch available slots when appointment date changes
  useEffect(() => {
    if (appointmentDate && currentStep === 4 && selectedRepairerId) {
      console.log('Fetching slots for date:', appointmentDate.toDateString(), 'repairer:', selectedRepairerId);
      fetchAvailableSlots(appointmentDate, selectedRepairerId);
      setSelectedSlot(""); // Reset selected slot when date changes
    }
  }, [appointmentDate, currentStep, selectedRepairerId]);

  const loadPolicyExcess = async () => {
    try {
      const { data: policy, error } = await supabase
        .from("policies")
        .select("product:products(excess_1)")
        .eq("id", policyId)
        .single();

      if (error) throw error;

      if (policy && (policy as any).product) {
        setPolicyExcess((policy as any).product.excess_1 || 0);
        setFulfillmentData(prev => ({ 
          ...prev, 
          excess_amount: (policy as any).product.excess_1 || 0 
        }));
      }
    } catch (error: any) {
      console.error("Error loading policy excess:", error);
    }
  };

  const loadDeviceValue = async () => {
    try {
      const { data: items, error } = await supabase
        .from("covered_items")
        .select("purchase_price")
        .eq("policy_id", policyId)
        .limit(1);

      if (error) throw error;

      if (items && items.length > 0 && items[0].purchase_price) {
        const deviceValue = Number(items[0].purchase_price);
        setFulfillmentData(prev => ({ 
          ...prev, 
          device_value: deviceValue 
        }));
      }
    } catch (error: any) {
      console.error("Error loading device value:", error);
    }
  };

  const loadClaimDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("claims")
        .select("claim_number, status")
        .eq("id", claimId)
        .single();

      if (error) throw error;

      if (data) {
        setClaimReference(data.claim_number);
        setClaimStatus(data.status);
      }
    } catch (error: any) {
      console.error("Error loading claim details:", error);
    }
  };

  const loadFulfillmentData = async () => {
    try {
      const { data, error } = await supabase
        .from("claim_fulfillment" as any)
        .select("*")
        .eq("claim_id", claimId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFulfillmentData(data as unknown as FulfillmentData);
        determineCurrentStep(data as unknown as FulfillmentData);
        
        // Load repairer name if repairer_id is set
        if ((data as any).repairer_id) {
          loadRepairerName((data as any).repairer_id);
        }
      }
    } catch (error: any) {
      console.error("Error loading fulfillment:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadRepairerName = async (repairerId: string) => {
    try {
      const { data, error } = await supabase
        .from("repairers")
        .select("name, company_name")
        .eq("id", repairerId)
        .single();

      if (!error && data) {
        setRepairerName(data.company_name || data.name);
      }
    } catch (error) {
      console.error("Error loading repairer name:", error);
    }
  };

  const determineCurrentStep = (data: FulfillmentData) => {
    if (!data.excess_paid) {
      setCurrentStep(1);
    } else if (data.fulfillment_type === "voucher") {
      setCurrentStep(5);
    } else if (data.status === "scheduled") {
      setCurrentStep(5);
    } else {
      setCurrentStep(4);
    }
  };

  const saveFulfillment = async (updates: Partial<FulfillmentData>) => {
    setSaving(true);
    try {
      const dataToSave = {
        claim_id: claimId,
        ...fulfillmentData,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // Use upsert to handle both insert and update cases automatically
      const { data, error } = await supabase
        .from("claim_fulfillment" as any)
        .upsert(dataToSave as any, { 
          onConflict: 'claim_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (error) throw error;

      // Update state with the returned data
      if (data) {
        setFulfillmentData({ ...dataToSave, id: (data as any).id } as unknown as FulfillmentData);
      }

      toast({
        title: "Success",
        description: "Fulfillment updated successfully",
      });

      return true;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleExcessPaid = async () => {
    // If user hasn't made a choice yet
    if (usePaymentOnFile === null) {
      toast({
        title: "Error",
        description: "Please select a payment option",
        variant: "destructive",
      });
      return;
    }

    // If using payment on file, no validation needed
    if (usePaymentOnFile) {
      setPaymentMethod("payment_on_file");
    } else {
      // Using other method - validate card details
      if (!paymentMethod) {
        toast({
          title: "Error",
          description: "Please select a payment method",
          variant: "destructive",
        });
        return;
      }

      // Validate card details if Credit Card is selected
      if (paymentMethod === "credit_card") {
        if (!cardDetails.cardNumber || !cardDetails.expiryDate || !cardDetails.cvv || !cardDetails.cardholderName) {
          toast({
            title: "Error",
            description: "Please fill in all card details",
            variant: "destructive",
          });
          return;
        }
        
        // Mock payment processing
        setSaving(true);
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate payment processing
        setSaving(false);
        
        toast({
          title: "Success",
          description: "Payment processed successfully",
        });
      }
    }

    // Automatically determine fulfillment type based on flowchart logic
    const deviceValue = fulfillmentData.device_value;
    let fulfillmentType: string | undefined;
    let status = "awaiting_appointment";

    const finalPaymentMethod = usePaymentOnFile ? "payment_on_file" : paymentMethod;

    console.log("Fulfillment decision - Device Category:", deviceCategory, "Requires In-Home Repair:", requiresInHomeRepair, "Device Value:", deviceValue);

    // Check device category first
    if (requiresInHomeRepair) {
      // Large items (Home Appliances, TVs) → In-home repair
      fulfillmentType = "in_home_repair";
      console.log("Fulfillment type: in_home_repair (large item requiring in-home repair)");
    } else {
      // Portable devices → Check RRP
      // IMPORTANT: Only offer voucher if we have a CONFIRMED device value that is less than 150
      // If device value is unknown/not loaded, default to collection_repair (safer default)
      if (deviceValue !== undefined && deviceValue !== null && deviceValue > 0 && deviceValue < 150) {
        // RRP < 150 → Voucher replacement (only when value is confirmed)
        fulfillmentType = "voucher";
        status = "completed";
        console.log("Fulfillment type: voucher (confirmed device value < 150)");
      } else {
        // RRP >= 150 OR unknown value → Collection/In-store drop-off
        fulfillmentType = "collection_repair";
        console.log("Fulfillment type: collection_repair (device value >= 150 or unknown)");
      }
    }

    const success = await saveFulfillment({
      excess_paid: true,
      excess_payment_date: new Date().toISOString(),
      excess_payment_method: finalPaymentMethod,
      excess_amount: policyExcess,
      device_value: deviceValue || 0,
      fulfillment_type: fulfillmentType,
      status: status,
    });

    if (success) {
      setFulfillmentData({ 
        ...fulfillmentData, 
        excess_paid: true, 
        excess_payment_method: finalPaymentMethod,
        device_value: deviceValue || 0,
        fulfillment_type: fulfillmentType,
        status: status
      });
      
      if (fulfillmentType === "voucher") {
        setCurrentStep(5);
      } else {
        setCurrentStep(4);
      }
    }
  };

  const handleDeviceValue = async (value: number) => {
    // Only set voucher if we have a confirmed value less than 150
    const fulfillmentType = (value > 0 && value < 150) ? "voucher" : undefined;
    const success = await saveFulfillment({
      device_value: value,
      fulfillment_type: fulfillmentType,
      status: fulfillmentType ? "completed" : "awaiting_appointment",
    });
    if (success) {
      setFulfillmentData({ ...fulfillmentData, device_value: value, fulfillment_type: fulfillmentType });
      if (fulfillmentType === "voucher") {
        setCurrentStep(5);
      } else {
        setCurrentStep(3);
      }
    }
  };

  const handleFulfillmentType = async (type: string) => {
    const success = await saveFulfillment({
      fulfillment_type: type,
      status: "awaiting_appointment",
    });
    if (success) {
      setFulfillmentData({ ...fulfillmentData, fulfillment_type: type });
      setCurrentStep(4);
    }
  };

  const handleScheduleAppointment = async () => {
    if (!appointmentDate || !selectedSlot) {
      toast({
        title: "Error",
        description: "Please select a date and time slot",
        variant: "destructive",
      });
      return;
    }

    const reference = requiresInHomeRepair
      ? `ENG-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      : `LOG-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const updates: Partial<FulfillmentData> = {
      appointment_date: appointmentDate.toISOString(),
      appointment_slot: selectedSlot,
      status: "scheduled",
      repairer_id: selectedRepairerId || undefined,
    };

    if (requiresInHomeRepair) {
      updates.engineer_reference = reference;
    } else {
      updates.logistics_reference = reference;
    }

    const success = await saveFulfillment(updates);

    if (success) {
      // Update claim status to pending_fulfillment when appointment is booked
      try {
        await supabase
          .from("claims")
          .update({ status: "pending_fulfillment" as any })
          .eq("id", claimId);

        // Add to claim status history
        await supabase
          .from("claim_status_history")
          .insert({
            claim_id: claimId,
            status: "pending_fulfillment" as any,
            notes: `Fulfillment ${requiresInHomeRepair ? "engineer visit" : "collection"} scheduled for ${format(appointmentDate, "PPP")} at ${selectedSlot}`,
          });

        setClaimStatus("pending_fulfillment");
      } catch (error) {
        console.error("Error updating claim status:", error);
      }

      setCurrentStep(5);
      // Don't call onComplete here - let user see confirmation first
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between">
        <div className={cn("flex items-center gap-2", currentStep >= 1 && "text-primary")}>
          <CheckCircle className={cn("h-5 w-5", currentStep > 1 && "fill-primary")} />
          <span className="text-sm font-medium">Excess Payment</span>
        </div>
        <div className={cn("flex items-center gap-2", currentStep >= 4 && "text-primary")}>
          {requiresInHomeRepair ? <Home className="h-5 w-5" /> : <Package className="h-5 w-5" />}
          <span className="text-sm font-medium">Schedule {requiresInHomeRepair ? "Engineer" : "Collection"}</span>
        </div>
        <div className={cn("flex items-center gap-2", currentStep >= 5 && "text-primary")}>
          <CheckCircle className={cn("h-5 w-5", currentStep === 5 && "fill-primary")} />
          <span className="text-sm font-medium">Complete</span>
        </div>
      </div>

      {/* Step 1: Excess Payment */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Excess Payment</CardTitle>
            <CardDescription>Collect payment for the excess amount</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Policy Excess Amount:</span>
                <span className="text-2xl font-bold">€{policyExcess.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-base font-semibold">How would you like to pay the excess?</Label>
              
              <RadioGroup 
                value={usePaymentOnFile === null ? "" : usePaymentOnFile ? "on_file" : "other"} 
                onValueChange={(value) => {
                  setUsePaymentOnFile(value === "on_file");
                  if (value === "on_file") {
                    setPaymentMethod("payment_on_file");
                  } else {
                    setPaymentMethod("");
                  }
                }}
                className="space-y-3"
              >
                <div className="flex items-start space-x-3 p-4 rounded-lg border bg-background hover:bg-muted/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="on_file" id="payment-on-file" className="mt-1" />
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="payment-on-file" className="font-medium cursor-pointer">
                      Use payment details on file
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Pay using the payment method registered for this policy's premium payments. No additional details required.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-4 rounded-lg border bg-background hover:bg-muted/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="other" id="payment-other" className="mt-1" />
                  <div className="space-y-1 flex-1">
                    <Label htmlFor="payment-other" className="font-medium cursor-pointer">
                      Use a different payment method
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Pay using a different credit card
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Show payment form only when "other method" is selected */}
            {usePaymentOnFile === false && (
              <div className="pt-4 border-t space-y-4">
                <Label className="text-sm font-medium">Enter Credit Card Details</Label>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input
                      id="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      value={cardDetails.cardNumber}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\s/g, '');
                        const formatted = cleaned.replace(/(\d{4})/g, '$1 ').trim();
                        setCardDetails({ ...cardDetails, cardNumber: formatted });
                        setPaymentMethod("credit_card");
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="expiryDate">Expiry Date</Label>
                      <Input
                        id="expiryDate"
                        placeholder="MM/YY"
                        maxLength={5}
                        value={cardDetails.expiryDate}
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/\D/g, '');
                          const formatted = cleaned.replace(/(\d{2})(\d{0,2})/, '$1/$2');
                          setCardDetails({ ...cardDetails, expiryDate: formatted });
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cvv">CVV</Label>
                      <Input
                        id="cvv"
                        placeholder="123"
                        maxLength={4}
                        type="password"
                        value={cardDetails.cvv}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          setCardDetails({ ...cardDetails, cvv: value });
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cardholderName">Cardholder Name</Label>
                    <Input
                      id="cardholderName"
                      placeholder="John Doe"
                      value={cardDetails.cardholderName}
                      onChange={(e) => setCardDetails({ ...cardDetails, cardholderName: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}

            <Button 
              onClick={handleExcessPaid} 
              disabled={usePaymentOnFile === null || (usePaymentOnFile === false && !paymentMethod) || saving} 
              className="w-full"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {usePaymentOnFile ? "Confirm Payment from File" : "Confirm Credit Card Payment"}
            </Button>
          </CardContent>
        </Card>
      )}


      {/* Step 4: Schedule Appointment */}
      {currentStep === 4 && (
        <>
          {/* AI Repairer Recommendations */}
          <RepairerRecommendations 
            claimId={claimId}
            deviceCategory={deviceCategory}
            coverageArea={coverageArea}
            onSelectRepairer={(repairerId, repairerName) => {
              setSelectedRepairerId(repairerId);
              toast({
                title: "Repairer Selected",
                description: `${repairerName} has been selected for this claim`,
              });
            }}
          />

          <Separator className="my-6" />

          <Card>
            <CardHeader>
              <CardTitle>Schedule {requiresInHomeRepair ? "Engineer Visit" : "Collection"}</CardTitle>
              <CardDescription>
                Select a date and time slot for {requiresInHomeRepair ? "the engineer visit" : "device collection"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedRepairerId ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please select a repairer from the recommendations above to view their available dates and times.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Select Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {appointmentDate ? format(appointmentDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 z-50 bg-popover">
                        <Calendar 
                          mode="single" 
                          selected={appointmentDate} 
                          onSelect={setAppointmentDate}
                          disabled={(date) => {
                            const tomorrow = new Date();
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            tomorrow.setHours(0, 0, 0, 0);
                            
                            // Disable past dates
                            if (date < tomorrow) return true;
                            
                            // Disable unavailable dates (fully booked)
                            return unavailableDates.some(unavailableDate => 
                              unavailableDate.getDate() === date.getDate() &&
                              unavailableDate.getMonth() === date.getMonth() &&
                              unavailableDate.getFullYear() === date.getFullYear()
                            );
                          }}
                          fromDate={new Date(new Date().setDate(new Date().getDate() + 1))}
                          initialFocus 
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {appointmentDate && (
                    <div className="space-y-2">
                      <Label>Select Time Slot</Label>
                      {loadingSlots ? (
                        <div className="flex items-center justify-center p-4 border rounded-md">
                          <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                          <span className="text-sm text-muted-foreground">Loading available slots...</span>
                        </div>
                      ) : availableSlots.length > 0 ? (
                        <Select value={selectedSlot} onValueChange={setSelectedSlot}>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Choose a time slot" />
                          </SelectTrigger>
                          <SelectContent className="bg-popover z-50">
                            {availableSlots.map((slot) => (
                              <SelectItem key={slot} value={slot}>
                                {slot}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                          No slots available for this date. Please select another date.
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

            {!appointmentDate && selectedRepairerId && (
              <p className="text-sm text-muted-foreground">Please select a date first to see available time slots.</p>
            )}

            <Button onClick={handleScheduleAppointment} disabled={!appointmentDate || !selectedSlot || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Appointment
            </Button>
          </CardContent>
        </Card>
        </>
      )}

      {/* Step 5: Complete */}
      {currentStep === 5 && (
        <div className="space-y-6 animate-fade-in">
          {/* Hero Success Header */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-success via-success to-green-700 p-8 text-white shadow-lg">
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-3">
                <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center animate-scale-in">
                  <CheckCircle className="h-8 w-8 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-1">
                    {fulfillmentData.fulfillment_type === "voucher" ? "Voucher Issued!" : "Appointment Confirmed!"}
                  </h2>
                  <p className="text-white/90">
                    {fulfillmentData.fulfillment_type === "voucher" 
                      ? "Your replacement voucher has been successfully issued"
                      : `Your ${requiresInHomeRepair ? "engineer visit" : "collection"} has been successfully scheduled`
                    }
                  </p>
                </div>
              </div>
            </div>
            <div className="absolute right-0 top-0 h-full w-1/3 opacity-10">
              <div className="absolute right-8 top-8 h-40 w-40 rounded-full bg-white blur-3xl" />
              <div className="absolute right-16 bottom-8 h-32 w-32 rounded-full bg-white blur-2xl" />
            </div>
          </div>

          {/* Claim Reference Card */}
          <Card className="border-2 border-success/20 bg-success/5 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white dark:bg-card rounded-lg border-l-4 border-success">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                      <svg className="h-5 w-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Claim Reference</p>
                      <p className="font-mono font-bold text-lg text-primary">{claimReference}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20 px-4 py-2">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {claimStatus.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {fulfillmentData.fulfillment_type === "voucher" ? (
            /* Voucher Details */
            <Card className="border-2 animate-fade-in" style={{ animationDelay: '200ms' }}>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
                    <svg className="h-4 w-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <CardTitle className="text-lg">Voucher Details</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-6 bg-gradient-to-br from-success/10 to-success/5 border-2 border-success/20 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Voucher Value</p>
                      <p className="text-3xl font-bold text-success">€{fulfillmentData.device_value?.toFixed(2)}</p>
                    </div>
                    <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center">
                      <svg className="h-8 w-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This voucher has been issued for your claim and can be used towards any product in our range.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    What Happens Next:
                  </h3>
                  <ol className="space-y-3">
                    {[
                      "Check your email for the voucher code and redemption instructions",
                      "Visit your nearest MediaMarkt store or use the voucher online",
                      "Present the voucher code at checkout to redeem",
                      "Voucher is valid for 90 days from issue date"
                    ].map((step, index) => (
                      <li key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg hover-scale">
                        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-sm font-semibold flex-shrink-0">
                          {index + 1}
                        </span>
                        <span className="text-sm pt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <Alert className="border-warning/20 bg-warning/5">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <AlertDescription className="text-sm">
                    <strong>Important:</strong> The voucher can be used towards any product in our range. Any remaining balance will be forfeited.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          ) : (
            /* Appointment Details */
            <>
              <Card className="border-2 animate-fade-in" style={{ animationDelay: '200ms' }}>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <CardTitle className="text-lg">Appointment Details</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="p-6 bg-gradient-to-br from-success/10 to-success/5 border-2 border-success/20 rounded-lg space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-white dark:bg-card flex items-center justify-center flex-shrink-0">
                          <svg className="h-5 w-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Date</p>
                          <p className="font-semibold text-sm">
                            {fulfillmentData.appointment_date
                              ? format(new Date(fulfillmentData.appointment_date), "EEEE, MMMM d, yyyy")
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-white dark:bg-card flex items-center justify-center flex-shrink-0">
                          <svg className="h-5 w-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Time</p>
                          <p className="font-semibold text-sm">{fulfillmentData.appointment_slot || "N/A"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-white dark:bg-card flex items-center justify-center flex-shrink-0">
                          <Wrench className="h-5 w-5 text-success" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Service Provider</p>
                          <p className="font-semibold text-sm">{repairerName || "N/A"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-white dark:bg-card flex items-center justify-center flex-shrink-0">
                          <svg className="h-5 w-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Reference</p>
                          <p className="font-mono font-semibold text-sm">
                            {requiresInHomeRepair
                              ? fulfillmentData.engineer_reference
                              : fulfillmentData.logistics_reference || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {!requiresInHomeRepair && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                  {/* Pack Your Item - Left Column */}
                  <Card className="border-2 border-warning bg-warning/5 animate-fade-in h-full flex flex-col" style={{ animationDelay: '300ms' }}>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package className="h-5 w-5 text-warning" />
                        Pack Your Item Safely
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <p className="text-sm text-foreground/90 mb-4">
                        Please ensure your device is properly packaged before collection to prevent any damage during transport:
                      </p>
                      <div className="space-y-2">
                        {[
                          { icon: "📦", text: "Use original packaging if available, or a sturdy box with cushioning" },
                          { icon: "🔒", text: "Seal the box securely with strong packing tape" },
                          { icon: "🔌", text: "Remove accessories - cables, chargers, and cases" },
                          { icon: "🏷️", text: "Label clearly with your claim reference number" }
                        ].map((item, index) => (
                          <div key={index} className="flex items-start gap-2 p-3 bg-background/50 rounded-lg border border-border/50">
                            <span className="text-lg flex-shrink-0">{item.icon}</span>
                            <span className="text-sm text-foreground/80">{item.text}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Before Collection - Right Column */}
                  <Card className="border-2 border-primary/20 bg-primary/5 animate-fade-in h-full flex flex-col" style={{ animationDelay: '400ms' }}>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-primary" />
                        Before Collection
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="space-y-2">
                        {[
                          "Back up all data from your device before packing",
                          "Remove any SIM cards, memory cards, or personal accessories",
                          "Take photos of your device before packing for your records",
                          "Have the packaged device ready at least 15 minutes before collection",
                          "Someone 18+ must be present to hand over the device"
                        ].map((item, index) => (
                          <div key={index} className="flex items-start gap-2 p-3 bg-background rounded-lg border border-border/50">
                            <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-sm">{item}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {requiresInHomeRepair && (
                <Card className="border-2 border-primary/20 bg-primary/5 animate-fade-in" style={{ animationDelay: '400ms' }}>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-primary" />
                      Preparation Checklist
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        "Ensure clear access to the appliance",
                        "Have your warranty documents ready",
                        "Note any specific issues to mention to the engineer",
                        "Someone 18+ must be present during the visit"
                      ].map((item, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-white dark:bg-card rounded-lg border border-border">
                          <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="border-2 animate-fade-in" style={{ animationDelay: '500ms' }}>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <CardTitle className="text-lg">What Happens Next</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ol className="space-y-3">
                    {(requiresInHomeRepair ? [
                      "Our engineer will visit your home at the scheduled time",
                      "They will inspect and diagnose the issue with your appliance",
                      "If possible, repairs will be completed on-site",
                      "If parts are needed, we'll schedule a follow-up visit",
                      "You'll receive a confirmation email with engineer details"
                    ] : [
                      "Our courier will arrive at the scheduled time to collect your device",
                      "You'll receive tracking updates via email and SMS",
                      "Device will be assessed and repaired at our service center",
                      "Once repaired, it will be returned to you within 5-7 working days",
                      "An email confirmation with full details has been sent to you"
                    ]).map((step, index) => (
                      <li key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg hover-scale">
                        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-sm font-semibold flex-shrink-0">
                          {index + 1}
                        </span>
                        <span className="text-sm pt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              <Alert className="border-primary/20 bg-primary/5 animate-fade-in" style={{ animationDelay: '600ms' }}>
                <AlertCircle className="h-5 w-5 text-primary" />
                <AlertDescription className="text-sm">
                  <strong className="block mb-1">Need to reschedule?</strong>
                  Contact our customer service team at least 24 hours before your appointment. Cancellations within 24 hours may incur a fee.
                </AlertDescription>
              </Alert>
            </>
          )}

          <div className="flex justify-center pt-4 animate-fade-in" style={{ animationDelay: '700ms' }}>
            <Button 
              onClick={() => navigate(`/retail/claims/${claimId}/next-steps`)} 
              size="lg"
              className="shadow-brand hover-scale"
            >
              View Next Steps & Complete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
