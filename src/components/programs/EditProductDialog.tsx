import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Settings, FileText } from "lucide-react";
import { VoucherConfigDialog } from "./VoucherConfigDialog";
import { CreatePerilDialog } from "./CreatePerilDialog";
import { PerilDetailsDialog, PerilDetails } from "./PerilDetailsDialog";
import { EligibilityRulesDialog, type EligibilityRules } from "./EligibilityRulesDialog";
import { ValidityRulesDialog, type ValidityRules } from "./ValidityRulesDialog";
import { RenewalRulesDialog, type RenewalRules } from "./RenewalRulesDialog";

interface EditProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductUpdated: () => void;
  productId: string | null;
}

interface VoucherConfig {
  name: string;
  discountType: "amount" | "percentage" | "months";
  value: string;
  duration?: string;
}

const DEVICE_CATEGORIES = [
  "Mobile Phones",
  "Laptops",
  "Tablets",
  "TVs",
  "Cameras",
  "Watches",
  "Headphones",
  "Speakers",
  "Gaming Consoles",
  "Home Appliances"
];

const PAYMENT_TYPES = [
  "Credit Card (CC)",
  "Debit Card",
  "Bank Transfer",
  "PayPal",
  "Apple Pay",
  "Google Pay"
];

const PERIL_OPTIONS = [
  "Screen Damage",
  "Worldwide Cover",
  "Water/Liquid Damage",
  "Accidental Damage",
  "Accessories Cover",
  "Extended Warranty",
  "Loss",
  "Theft",
  "Technical Support"
];

export function EditProductDialog({ open, onOpenChange, onProductUpdated, productId }: EditProductDialogProps) {
  const [loading, setLoading] = useState(false);
  const [voucherDialogOpen, setVoucherDialogOpen] = useState(false);
  const [perilDialogOpen, setPerilDialogOpen] = useState(false);
  const [perilDetailsDialogOpen, setPerilDetailsDialogOpen] = useState(false);
  const [selectedPeril, setSelectedPeril] = useState<string>("");
  const [perilDetails, setPerilDetails] = useState<Record<string, PerilDetails>>({});
  const [eligibilityDialogOpen, setEligibilityDialogOpen] = useState(false);
  const [validityDialogOpen, setValidityDialogOpen] = useState(false);
  const [renewalDialogOpen, setRenewalDialogOpen] = useState(false);
  
  const [eligibilityRules, setEligibilityRules] = useState<EligibilityRules>({
    customer: { ageRequirements: { min: null, max: null }, residencyRestrictions: [], healthDeclaration: false, noPriorClaims: false },
    product: { productTypes: [], brandRestrictions: [], maxProductAge: null, maxValue: null, minValue: null, usageType: "personal", preExistingConditions: "not_covered" },
    verification: { proofOfPurchase: true, serialNumber: false, inspectionRequired: false }
  });
  
  const [validityRules, setValidityRules] = useState<ValidityRules>({
    effectiveStart: { type: "immediate", waitingPeriodDays: 0, requiresActivation: false },
    expiration: { type: "fixed_term", termMonths: 12, eventBased: null },
    activation: { registrationRequired: false, proofOfPurchaseUpload: false, serialNumberRequired: false },
    coverage: { includedTypes: [], excludedTypes: [], territorialLimits: [] },
    cancellation: { freeLookPeriodDays: 14, proRatedRefunds: true },
    transferability: { allowed: false, conditions: "" }
  });
  
  const [renewalRules, setRenewalRules] = useState<RenewalRules>({
    eligibility: { noOutstandingPremiums: true, noFraudulentClaims: true, maxRenewals: null, maxProductAge: null },
    window: { daysBeforeExpiry: 30, gracePeriodDays: 10, reinstatementGracePeriodDays: 0, policySaleConcessionDays: 0 },
    pricing: { type: "same", adjustmentFactors: [] },
    coverageChanges: { reducedCoverage: false, increasedDeductibles: false, expandedExclusions: false },
    renewalType: { autoRenew: false, requiresConfirmation: true },
    documentation: { proofOfCondition: false, serialNumberConfirmation: false, updatedInfo: false }
  });

  const [productParameters, setProductParameters] = useState({
    worldwideCoverLimitDays: 30,
    unauthorizedCallsNotificationPeriodDays: 30,
    insurerNotificationPeriodHours: 24,
    policeNotificationPeriodDays: 7,
    multipleClaimsReliefAfter: 3,
    multipleClaimsMeasuredAcrossDays: 365,
    daysSinceLastClaim: 180,
    reinstatementGracePeriodDays: 30,
    ageOfPolicyToReliefClaimDays: 30,
    daysSinceLastDeclinedDamageClaimDays: 90,
    policySaleConcessionDays: 30,
    successfullyFulfilledClaimLimitDays: 365,
    successfullyFulfilledClaimLimitPeriodDays: 365,
    successfullyFulfilledAccidentalDamageClaimHardStopDays: 180,
    successfullyFulfilledNotTheftClaimHardStopDays: 180,
  });

  const [formData, setFormData] = useState({
    name: "",
    product_name_external: "",
    monthly_premium: "",
    premium_frequency: "monthly",
    policy_term_years: "1",
    excess_1: "",
    excess_2: "",
    rrp_min: "",
    rrp_max: "",
    link_code: "",
    fulfillment_method: "Repair",
    device_categories: [] as string[],
    payment_types: [] as string[],
    voucher_options: [] as VoucherConfig[],
    coverage: [] as string[],
    perils: [] as string[],
    tax_type: "",
    tax_name: "",
    tax_value: "",
    tax_value_type: "percentage",
    store_commission: "5"
  });

  useEffect(() => {
    if (open && productId) {
      loadProduct();
    }
  }, [open, productId]);

  const loadProduct = async () => {
    if (!productId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (error) {
      toast.error("Failed to load product");
      console.error(error);
    } else if (data) {
      // Parse vouchers from string array back to VoucherConfig
      const voucherConfigs: VoucherConfig[] = (data.voucher_options || []).map((v: string) => {
        // Parse format: "Name - £10 for 3 months" or "Name - 10% for 2 months" or "Name - 1 months"
        const parts = v.split(" - ");
        const name = parts[0];
        const rest = parts[1] || "";
        
        let discountType: "amount" | "percentage" | "months" = "amount";
        let value = "";
        let duration = "";

        if (rest.includes("£")) {
          discountType = "amount";
          value = rest.replace("£", "").split(" ")[0];
          const forMatch = rest.match(/for (\d+) months/);
          if (forMatch) duration = forMatch[1];
        } else if (rest.includes("%")) {
          discountType = "percentage";
          value = rest.replace("%", "").split(" ")[0];
          const forMatch = rest.match(/for (\d+) months/);
          if (forMatch) duration = forMatch[1];
        } else if (rest.includes("months")) {
          discountType = "months";
          value = rest.split(" ")[0];
        }

        return { name, discountType, value, duration };
      });

      setFormData({
        name: data.name || "",
        product_name_external: data.product_name_external || "",
        monthly_premium: data.monthly_premium?.toString() || "",
        premium_frequency: data.premium_frequency || "monthly",
        policy_term_years: data.policy_term_years?.toString() || "1",
        excess_1: data.excess_1?.toString() || "",
        excess_2: data.excess_2?.toString() || "0",
        rrp_min: data.rrp_min?.toString() || "",
        rrp_max: data.rrp_max?.toString() || "",
        link_code: data.link_code || "",
        fulfillment_method: data.fulfillment_method || "Repair",
        device_categories: data.device_categories || [],
        payment_types: data.payment_types || [],
        voucher_options: voucherConfigs,
        coverage: data.coverage || [],
        perils: data.perils || [],
        tax_type: data.tax_type || "",
        tax_name: data.tax_name || "",
        tax_value: data.tax_value?.toString() || "",
        tax_value_type: data.tax_value_type || "percentage",
        store_commission: data.store_commission?.toString() || "5"
      });
      
      // Load rules with proper defaults
      if (data.eligibility_rules && typeof data.eligibility_rules === 'object' && Object.keys(data.eligibility_rules).length > 0) {
        const loadedRules = data.eligibility_rules as any;
        if (loadedRules.customer || loadedRules.product || loadedRules.verification) {
          setEligibilityRules(loadedRules as unknown as EligibilityRules);
        }
      }
      if (data.validity_rules && typeof data.validity_rules === 'object' && Object.keys(data.validity_rules).length > 0) {
        const loadedRules = data.validity_rules as any;
        if (loadedRules.effectiveStart || loadedRules.expiration || loadedRules.activation) {
          setValidityRules(loadedRules as unknown as ValidityRules);
        }
      }
      if (data.renewal_rules && typeof data.renewal_rules === 'object' && Object.keys(data.renewal_rules).length > 0) {
        const loadedRules = data.renewal_rules as any;
        if (loadedRules.eligibility || loadedRules.window || loadedRules.pricing) {
          setRenewalRules(loadedRules as unknown as RenewalRules);
        }
      }
      
      // Load peril details
      if (data.peril_details && typeof data.peril_details === 'object') {
        setPerilDetails(data.peril_details as unknown as Record<string, PerilDetails>);
      }

      // Load product parameters
      if (data.product_parameters && typeof data.product_parameters === 'object') {
        setProductParameters({
          worldwideCoverLimitDays: (data.product_parameters as any).worldwideCoverLimitDays ?? 30,
          unauthorizedCallsNotificationPeriodDays: (data.product_parameters as any).unauthorizedCallsNotificationPeriodDays ?? 30,
          insurerNotificationPeriodHours: (data.product_parameters as any).insurerNotificationPeriodHours ?? 24,
          policeNotificationPeriodDays: (data.product_parameters as any).policeNotificationPeriodDays ?? 7,
          multipleClaimsReliefAfter: (data.product_parameters as any).multipleClaimsReliefAfter ?? 3,
          multipleClaimsMeasuredAcrossDays: (data.product_parameters as any).multipleClaimsMeasuredAcrossDays ?? 365,
          daysSinceLastClaim: (data.product_parameters as any).daysSinceLastClaim ?? 180,
          reinstatementGracePeriodDays: (data.product_parameters as any).reinstatementGracePeriodDays ?? 30,
          ageOfPolicyToReliefClaimDays: (data.product_parameters as any).ageOfPolicyToReliefClaimDays ?? 30,
          daysSinceLastDeclinedDamageClaimDays: (data.product_parameters as any).daysSinceLastDeclinedDamageClaimDays ?? 90,
          policySaleConcessionDays: (data.product_parameters as any).policySaleConcessionDays ?? 30,
          successfullyFulfilledClaimLimitDays: (data.product_parameters as any).successfullyFulfilledClaimLimitDays ?? 365,
          successfullyFulfilledClaimLimitPeriodDays: (data.product_parameters as any).successfullyFulfilledClaimLimitPeriodDays ?? 365,
          successfullyFulfilledAccidentalDamageClaimHardStopDays: (data.product_parameters as any).successfullyFulfilledAccidentalDamageClaimHardStopDays ?? 180,
          successfullyFulfilledNotTheftClaimHardStopDays: (data.product_parameters as any).successfullyFulfilledNotTheftClaimHardStopDays ?? 180,
        });
      }
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!productId) return;
    
    // Basic validation
    if (!formData.name || !formData.monthly_premium || !formData.excess_1 || !formData.rrp_min) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      // Convert voucher configs to string array for storage
      const voucherStrings = formData.voucher_options.map(v => {
        const valueDisplay = v.discountType === "amount" ? `£${v.value}` : 
                            v.discountType === "percentage" ? `${v.value}%` : 
                            `${v.value} months`;
        const durationText = v.duration ? ` for ${v.duration} months` : "";
        return `${v.name} - ${valueDisplay}${durationText}`;
      });

      const { error } = await supabase
        .from("products")
        .update({
          name: formData.name,
          product_name_external: formData.product_name_external || null,
          monthly_premium: parseFloat(formData.monthly_premium),
          premium_frequency: formData.premium_frequency,
          policy_term_years: parseInt(formData.policy_term_years),
          excess_1: parseFloat(formData.excess_1),
          excess_2: parseFloat(formData.excess_2),
          rrp_min: parseFloat(formData.rrp_min),
          rrp_max: formData.rrp_max ? parseFloat(formData.rrp_max) : null,
          link_code: formData.link_code || null,
          fulfillment_method: formData.fulfillment_method,
          device_categories: formData.device_categories,
          payment_types: formData.payment_types,
          voucher_options: voucherStrings,
          coverage: formData.coverage,
          perils: formData.perils,
          peril_details: JSON.parse(JSON.stringify(perilDetails)),
          tax_type: formData.tax_type || null,
          tax_name: formData.tax_name || null,
          tax_value: formData.tax_value ? parseFloat(formData.tax_value) : null,
          tax_value_type: formData.tax_value_type || null,
          store_commission: parseFloat(formData.store_commission),
          eligibility_rules: eligibilityRules as any,
          validity_rules: validityRules as any,
          renewal_rules: renewalRules as any,
          product_parameters: productParameters as any
        })
        .eq("id", productId);

      if (error) throw error;

      toast.success("Product updated successfully");
      onProductUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Failed to update product");
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceCategoryToggle = (category: string) => {
    setFormData(prev => ({
      ...prev,
      device_categories: prev.device_categories.includes(category)
        ? prev.device_categories.filter(c => c !== category)
        : [...prev.device_categories, category]
    }));
  };

  const handlePaymentTypeToggle = (type: string) => {
    setFormData(prev => ({
      ...prev,
      payment_types: prev.payment_types.includes(type)
        ? prev.payment_types.filter(t => t !== type)
        : [...prev.payment_types, type]
    }));
  };

  const handleAddVoucher = (voucher: VoucherConfig) => {
    setFormData(prev => ({
      ...prev,
      voucher_options: [...prev.voucher_options, voucher]
    }));
    toast.success("Voucher added");
  };

  const handleRemoveVoucher = (index: number) => {
    setFormData(prev => ({
      ...prev,
      voucher_options: prev.voucher_options.filter((_, i) => i !== index)
    }));
  };

  const handlePerilToggle = (peril: string) => {
    setFormData(prev => ({
      ...prev,
      perils: prev.perils.includes(peril)
        ? prev.perils.filter(p => p !== peril)
        : [...prev.perils, peril]
    }));
  };

  const handleAddCustomPeril = (perilName: string) => {
    if (formData.perils.includes(perilName)) {
      toast.error("This peril already exists");
      return;
    }
    setFormData(prev => ({
      ...prev,
      perils: [...prev.perils, perilName]
    }));
    toast.success("Custom peril added");
  };

  const handleConfigurePeril = (perilName: string) => {
    setSelectedPeril(perilName);
    setPerilDetailsDialogOpen(true);
  };

  const handleSavePerilDetails = (details: PerilDetails) => {
    setPerilDetails(prev => ({
      ...prev,
      [details.perilName]: details
    }));
    toast.success(`${details.perilName} rejection terms configured`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-full p-0 flex flex-col overflow-hidden">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="text-2xl">Edit Product</SheetTitle>
          <SheetDescription>
            Update product details and configuration
          </SheetDescription>
        </SheetHeader>

        {loading && !formData.name ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="product_name_external">Product Name External</Label>
                  <Input
                    id="product_name_external"
                    value={formData.product_name_external}
                    onChange={(e) => setFormData(prev => ({ ...prev, product_name_external: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Pricing & Terms</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthly_premium">Premium *</Label>
                  <Input
                    id="monthly_premium"
                    type="number"
                    step="0.01"
                    value={formData.monthly_premium}
                    onChange={(e) => setFormData(prev => ({ ...prev, monthly_premium: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="premium_frequency">Premium Frequency *</Label>
                  <Select value={formData.premium_frequency} onValueChange={(value) => setFormData(prev => ({ ...prev, premium_frequency: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="policy_term_years">Policy Term (Years) *</Label>
                  <Select value={formData.policy_term_years} onValueChange={(value) => setFormData(prev => ({ ...prev, policy_term_years: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(y => (
                        <SelectItem key={y} value={y.toString()}>{y} Year{y > 1 ? 's' : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="excess_1">Excess 1 *</Label>
                  <Input
                    id="excess_1"
                    type="number"
                    step="0.01"
                    value={formData.excess_1}
                    onChange={(e) => setFormData(prev => ({ ...prev, excess_1: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="excess_2">Excess 2</Label>
                  <Input
                    id="excess_2"
                    type="number"
                    step="0.01"
                    value={formData.excess_2}
                    onChange={(e) => setFormData(prev => ({ ...prev, excess_2: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="link_code">Link Code</Label>
                  <Input
                    id="link_code"
                    value={formData.link_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, link_code: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store_commission">Store Commission (%)</Label>
                  <Input
                    id="store_commission"
                    type="number"
                    step="0.01"
                    value={formData.store_commission}
                    onChange={(e) => setFormData(prev => ({ ...prev, store_commission: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Price Range */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">RRP Range</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rrp_min">RRP Min *</Label>
                  <Input
                    id="rrp_min"
                    type="number"
                    step="0.01"
                    value={formData.rrp_min}
                    onChange={(e) => setFormData(prev => ({ ...prev, rrp_min: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rrp_max">RRP Max</Label>
                  <Input
                    id="rrp_max"
                    type="number"
                    step="0.01"
                    value={formData.rrp_max}
                    onChange={(e) => setFormData(prev => ({ ...prev, rrp_max: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Fulfillment */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Fulfillment</h3>
              <div className="space-y-2">
                <Label htmlFor="fulfillment_method">Fulfillment Method *</Label>
                <Select value={formData.fulfillment_method} onValueChange={(value) => setFormData(prev => ({ ...prev, fulfillment_method: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Exchange">Exchange</SelectItem>
                    <SelectItem value="Repair">Repair</SelectItem>
                    <SelectItem value="Both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tax Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Tax Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tax_type">Tax Type</Label>
                  <Select value={formData.tax_type} onValueChange={(value) => setFormData(prev => ({ ...prev, tax_type: value, tax_name: value === "IPT" ? "" : prev.tax_name }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tax type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IPT">IPT</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.tax_type === "Other" && (
                  <div className="space-y-2">
                    <Label htmlFor="tax_name">Tax Name</Label>
                    <Input
                      id="tax_name"
                      value={formData.tax_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, tax_name: e.target.value }))}
                      placeholder="Enter tax name"
                    />
                  </div>
                )}
                {formData.tax_type && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="tax_value">Tax Value</Label>
                      <Input
                        id="tax_value"
                        type="number"
                        step="0.01"
                        value={formData.tax_value}
                        onChange={(e) => setFormData(prev => ({ ...prev, tax_value: e.target.value }))}
                        placeholder="Enter value"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tax_value_type">Tax Value Type</Label>
                      <Select value={formData.tax_value_type} onValueChange={(value) => setFormData(prev => ({ ...prev, tax_value_type: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="amount">Amount</SelectItem>
                          <SelectItem value="percentage">Percentage</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                </div>
              </div>

              {/* Policy Rules */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Policy Rules
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEligibilityDialogOpen(true)}
                    className="w-full"
                  >
                    Configure Eligibility Rules
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setValidityDialogOpen(true)}
                    className="w-full"
                  >
                    Configure Validity Rules
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRenewalDialogOpen(true)}
                    className="w-full"
                  >
                    Configure Renewal Rules
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  {eligibilityRules?.customer?.ageRequirements?.min || eligibilityRules?.customer?.ageRequirements?.max ? 
                    `✓ Eligibility rules configured` : `- No eligibility rules`} • 
                  {(validityRules?.effectiveStart?.waitingPeriodDays ?? 0) > 0 ? 
                    ` Waiting period: ${validityRules.effectiveStart.waitingPeriodDays} days` : ` Immediate coverage`} • 
                  {renewalRules?.renewalType?.autoRenew ? ` Auto-renewal enabled` : ` Manual renewal`}
              </div>
            </div>

            {/* Device Categories */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Device Categories</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-device-categories'))}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Category
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {DEVICE_CATEGORIES.map((category) => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category}`}
                      checked={formData.device_categories.includes(category)}
                      onCheckedChange={() => handleDeviceCategoryToggle(category)}
                    />
                    <Label htmlFor={`category-${category}`} className="cursor-pointer">
                      {category}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Types */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Payment Types</h3>
              <div className="grid grid-cols-2 gap-3">
                {PAYMENT_TYPES.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`payment-${type}`}
                      checked={formData.payment_types.includes(type)}
                      onCheckedChange={() => handlePaymentTypeToggle(type)}
                    />
                    <Label htmlFor={`payment-${type}`} className="cursor-pointer">
                      {type}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Vouchers and Promos */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Voucher and Promo Options</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setVoucherDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Promotion
                </Button>
              </div>
              
              {formData.voucher_options.length === 0 ? (
                <p className="text-sm text-muted-foreground">No promotions configured. Click "Add Promotion" to create one.</p>
              ) : (
                <div className="space-y-2">
                  {formData.voucher_options.map((voucher, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{voucher.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {voucher.discountType === "amount" && `£${voucher.value} off`}
                          {voucher.discountType === "percentage" && `${voucher.value}% off`}
                          {voucher.discountType === "months" && `${voucher.value} month(s) off`}
                          {voucher.duration && ` for ${voucher.duration} months`}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveVoucher(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <VoucherConfigDialog
              open={voucherDialogOpen}
              onOpenChange={setVoucherDialogOpen}
              onSave={handleAddVoucher}
            />

            {/* Perils */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Perils Covered</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPerilDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Peril
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {PERIL_OPTIONS.map((peril) => (
                  <div key={peril} className="flex items-center justify-between p-2 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`peril-${peril}`}
                        checked={formData.perils.includes(peril)}
                        onCheckedChange={() => handlePerilToggle(peril)}
                      />
                      <Label htmlFor={`peril-${peril}`} className="cursor-pointer">
                        {peril}
                      </Label>
                    </div>
                    {formData.perils.includes(peril) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleConfigurePeril(peril)}
                        title="Configure rejection terms"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {formData.perils.filter(p => !PERIL_OPTIONS.includes(p)).map((customPeril) => (
                  <div key={customPeril} className="flex items-center justify-between p-2 border rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`peril-${customPeril}`}
                        checked={true}
                        onCheckedChange={() => handlePerilToggle(customPeril)}
                      />
                      <Label htmlFor={`peril-${customPeril}`} className="cursor-pointer">
                        {customPeril} (Custom)
                      </Label>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleConfigurePeril(customPeril)}
                      title="Configure rejection terms"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <CreatePerilDialog
              open={perilDialogOpen}
              onOpenChange={setPerilDialogOpen}
              onSave={handleAddCustomPeril}
            />

            <PerilDetailsDialog
              open={perilDetailsDialogOpen}
              onOpenChange={setPerilDetailsDialogOpen}
              perilName={selectedPeril}
              existingDetails={perilDetails[selectedPeril]}
              onSave={handleSavePerilDetails}
            />
            
            <EligibilityRulesDialog
              open={eligibilityDialogOpen}
              onOpenChange={setEligibilityDialogOpen}
              rules={eligibilityRules}
              onSave={setEligibilityRules}
            />
            
            <ValidityRulesDialog
              open={validityDialogOpen}
              onOpenChange={setValidityDialogOpen}
              rules={validityRules}
              onSave={setValidityRules}
            />
            
            <RenewalRulesDialog
              open={renewalDialogOpen}
              onOpenChange={setRenewalDialogOpen}
              rules={renewalRules}
              onSave={setRenewalRules}
            />

            <SheetFooter className="sticky bottom-0 bg-background border-t px-6 py-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Product
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
