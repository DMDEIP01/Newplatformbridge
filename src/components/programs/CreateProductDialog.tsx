import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Settings, FileText, Copy } from "lucide-react";
import { VoucherConfigDialog } from "./VoucherConfigDialog";
import { CreatePerilDialog } from "./CreatePerilDialog";
import { PerilDetailsDialog, PerilDetails } from "./PerilDetailsDialog";
import { EligibilityRulesDialog, type EligibilityRules } from "./EligibilityRulesDialog";
import { ValidityRulesDialog, type ValidityRules } from "./ValidityRulesDialog";
import { RenewalRulesDialog, type RenewalRules } from "./RenewalRulesDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { useEffect } from "react";

interface CreateProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductCreated: () => void;
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

interface VoucherConfig {
  name: string;
  discountType: "amount" | "percentage" | "months";
  value: string;
  duration?: string;
}

export function CreateProductDialog({ open, onOpenChange, onProductCreated }: CreateProductDialogProps) {
  const [loading, setLoading] = useState(false);
  const [copyMode, setCopyMode] = useState(false);
  const [selectedProductToCopy, setSelectedProductToCopy] = useState<string>("");
  const [existingProducts, setExistingProducts] = useState<any[]>([]);
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
    if (open) {
      fetchExistingProducts();
    }
  }, [open]);

  const fetchExistingProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, product_id")
        .order("name");
      
      if (error) throw error;
      setExistingProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const handleCopyProduct = async () => {
    if (!selectedProductToCopy) {
      toast.error("Please select a product to copy");
      return;
    }

    setLoading(true);
    try {
      // Fetch the product details
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", selectedProductToCopy)
        .single();

      if (productError) throw productError;

      // Parse voucher strings back to VoucherConfig format
      const voucherConfigs: VoucherConfig[] = (product.voucher_options || []).map((v: string) => {
        const match = v.match(/^(.+?) - (£[\d.]+|[\d.]+%|[\d.]+ months)(?: for ([\d.]+) months)?$/);
        if (match) {
          const [, name, valueStr, duration] = match;
          let discountType: "amount" | "percentage" | "months" = "amount";
          let value = "";
          
          if (valueStr.startsWith("£")) {
            discountType = "amount";
            value = valueStr.substring(1);
          } else if (valueStr.endsWith("%")) {
            discountType = "percentage";
            value = valueStr.slice(0, -1);
          } else {
            discountType = "months";
            value = valueStr.split(" ")[0];
          }
          
          return { name, discountType, value, duration: duration || "" };
        }
        return { name: v, discountType: "amount" as const, value: "0" };
      });

      // Populate form with copied product data
      setFormData({
        name: `${product.name} (Copy)`,
        product_name_external: product.product_name_external || "",
        monthly_premium: product.monthly_premium?.toString() || "",
        premium_frequency: product.premium_frequency || "monthly",
        policy_term_years: product.policy_term_years?.toString() || "1",
        excess_1: product.excess_1?.toString() || "",
        excess_2: product.excess_2?.toString() || "",
        rrp_min: product.rrp_min?.toString() || "",
        rrp_max: product.rrp_max?.toString() || "",
        link_code: product.link_code || "",
        fulfillment_method: product.fulfillment_method || "Repair",
        device_categories: product.device_categories || [],
        payment_types: product.payment_types || [],
        voucher_options: voucherConfigs,
        coverage: product.coverage || [],
        perils: product.perils || [],
        tax_type: product.tax_type || "",
        tax_name: product.tax_name || "",
        tax_value: product.tax_value?.toString() || "",
        tax_value_type: product.tax_value_type || "percentage",
        store_commission: product.store_commission?.toString() || "5"
      });

      setPerilDetails((product.peril_details as any) || {});
      setEligibilityRules((product.eligibility_rules as unknown as EligibilityRules) || eligibilityRules);
      setValidityRules((product.validity_rules as unknown as ValidityRules) || validityRules);
      setRenewalRules((product.renewal_rules as unknown as RenewalRules) || renewalRules);
      setProductParameters((product.product_parameters as any) || productParameters);

      toast.success("Product data loaded. Review and modify as needed, then create.");
      setCopyMode(false);
    } catch (error) {
      console.error("Error copying product:", error);
      toast.error("Failed to copy product data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

      const { data: newProduct, error } = await supabase
        .from("products")
        .insert([{
          name: formData.name,
          product_id: undefined as any, // Auto-generated by trigger
          product_name_external: formData.product_name_external || null,
          type: "Standard",
          tier: 1,
          monthly_premium: parseFloat(formData.monthly_premium),
          premium_frequency: formData.premium_frequency,
          policy_term_years: parseInt(formData.policy_term_years),
          excess_1: parseFloat(formData.excess_1),
          excess_2: formData.excess_2 ? parseFloat(formData.excess_2) : 0,
          rrp_min: parseFloat(formData.rrp_min),
          rrp_max: formData.rrp_max ? parseFloat(formData.rrp_max) : null,
          link_code: formData.link_code || null,
          fulfillment_method: formData.fulfillment_method,
          device_categories: formData.device_categories,
          payment_types: formData.payment_types,
          voucher_options: voucherStrings,
          coverage: formData.coverage.length > 0 ? formData.coverage : ["Standard Coverage"],
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
        }])
        .select()
        .single();

      if (error) throw error;

      // If copying from an existing product, copy related data
      if (selectedProductToCopy && newProduct) {
        const newProductId = newProduct.id;
        
        if (newProductId) {
          // Copy communication template assignments
          const { data: templates } = await supabase
            .from("product_communication_templates")
            .select("template_id, is_active")
            .eq("product_id", selectedProductToCopy);

          if (templates && templates.length > 0) {
            await supabase
              .from("product_communication_templates")
              .insert(templates.map(t => ({
                product_id: newProductId,
                template_id: t.template_id,
                is_active: t.is_active
              })));
          }

          // Copy fulfillment assignments
          const { data: fulfillments } = await supabase
            .from("fulfillment_assignments")
            .select("repairer_id, device_category, manufacturer, model_name, is_active, program_ids")
            .eq("product_id", selectedProductToCopy);

          if (fulfillments && fulfillments.length > 0) {
            await supabase
              .from("fulfillment_assignments")
              .insert(fulfillments.map(f => ({
                product_id: newProductId,
                repairer_id: f.repairer_id,
                device_category: f.device_category,
                manufacturer: f.manufacturer,
                model_name: f.model_name,
                is_active: f.is_active,
                program_ids: f.program_ids
              })));
          }

          // Copy product promotions
          const { data: promotions } = await supabase
            .from("product_promotions")
            .select("promotion_id, is_active")
            .eq("product_id", selectedProductToCopy);

          if (promotions && promotions.length > 0) {
            await supabase
              .from("product_promotions")
              .insert(promotions.map(p => ({
                product_id: newProductId,
                promotion_id: p.promotion_id,
                is_active: p.is_active
              })));
          }
        }
      }

      toast.success("Product created successfully");
      onProductCreated();
      onOpenChange(false);
      
      // Reset form
      setFormData({
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
        device_categories: [],
        payment_types: [],
        voucher_options: [],
        coverage: [],
        perils: [],
        tax_type: "",
        tax_name: "",
        tax_value: "",
        tax_value_type: "percentage",
        store_commission: "5"
      });
      setPerilDetails({});
      setSelectedProductToCopy("");
      setCopyMode(false);
    } catch (error) {
      console.error("Error creating product:", error);
      toast.error("Failed to create product");
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
          <SheetTitle className="text-2xl">Create New Product</SheetTitle>
          <SheetDescription>
            Add a new product to the system with all necessary details
          </SheetDescription>
        </SheetHeader>

        {/* Copy Product Option */}
        <div className="px-6 py-4 border-b bg-muted/30">
          <Button
            type="button"
            onClick={() => setCopyMode(!copyMode)}
            className="w-full bg-brand-red hover:bg-brand-red-dark text-white"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy from Existing Product
          </Button>
          
          {copyMode && (
            <Alert>
              <AlertDescription>
                <div className="space-y-3">
                  <p className="text-sm">Select a product to copy all settings including communications, repairers, devices, perils, and configurations.</p>
                  <div className="flex gap-2">
                    <Select value={selectedProductToCopy} onValueChange={setSelectedProductToCopy}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select product to copy" />
                      </SelectTrigger>
                      <SelectContent>
                        {existingProducts.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} ({product.product_id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      type="button" 
                      onClick={handleCopyProduct}
                      disabled={!selectedProductToCopy || loading}
                      className="bg-brand-red hover:bg-brand-red-dark text-white"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create a Copy"}
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

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
              Create Product
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
