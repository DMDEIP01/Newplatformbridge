import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Loader2, Clock, Mail, Upload, Sparkles, FileCheck } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { generateReferenceNumber } from "@/lib/referenceGenerator";
import { formatStatus } from "@/lib/utils";
import { faultCategories, specificIssuesByCategory } from "@/lib/faultConfig";
import { deviceCategories, brandsByCategory, modelsByCategoryAndBrand, colorOptions, screenSizeOptions } from "@/lib/deviceConfig";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ClaimType = "breakdown" | "damage" | "theft" | "";

interface PolicyDetails {
  id: string;
  policy_number: string;
  status: string;
  customer_address_line1?: string;
  customer_address_line2?: string;
  customer_city?: string;
  customer_postcode?: string;
  product: {
    name: string;
    type: string;
    monthly_premium: number;
    excess_1: number;
    coverage: string[];
    perils: string[] | null;
  };
  covered_items: Array<{
    id: string;
    product_name: string;
    serial_number: string;
    model: string;
    purchase_price: number;
  }>;
}

interface ClaimFormData {
  policyNumber: string;
  policyId?: string;
  policyDetails?: PolicyDetails;
  customerName?: string;
  customerEmail?: string;
  claimType: ClaimType | "";
  itemName: string;
  itemSerialNumber: string;
  itemPurchasePrice: string;
  incidentDate: string;
  incidentLocation: string;
  faultCategory: string;
  specificIssue: string;
}

export default function RetailMakeClaim() {
  const navigate = useNavigate();
  const location = useLocation();
  const [policyPreSelected, setPolicyPreSelected] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [searchingPolicy, setSearchingPolicy] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [createdClaimId, setCreatedClaimId] = useState<string | null>(null);
  const [submittedClaimNumber, setSubmittedClaimNumber] = useState<string>("");

  // Device verification states
  const [insuredDevice, setInsuredDevice] = useState<{
    product_name: string;
    model: string;
    serial_number: string;
    purchase_price: number;
  } | null>(null);
  const [deviceInfoConfirmed, setDeviceInfoConfirmed] = useState<string>("");
  const [itemCategory, setItemCategory] = useState("");
  const [itemMake, setItemMake] = useState("");
  const [itemModel, setItemModel] = useState("");
  const [itemModelOther, setItemModelOther] = useState(""); // For custom model entry
  const [itemColor, setItemColor] = useState("");
  const [itemSerialNumber, setItemSerialNumber] = useState("");
  const [itemPurchasePrice, setItemPurchasePrice] = useState("");
  
  // Manufacturer warranty tracking
  const [devicePurchaseDate, setDevicePurchaseDate] = useState<string | null>(null);
  const [isWithinManufacturerWarranty, setIsWithinManufacturerWarranty] = useState(false);
  const [manufacturerWarrantyMonths, setManufacturerWarrantyMonths] = useState(12); // Default 12 months
  
  // Fetch manufacturer warranty period from database
  const fetchManufacturerWarranty = async (deviceCategory: string, deviceModel?: string) => {
    try {
      // First try to get model-specific warranty
      if (deviceModel) {
        const { data: deviceData } = await supabase
          .from("devices")
          .select("manufacturer_warranty_months, device_category")
          .ilike("model_name", `%${deviceModel}%`)
          .single();
        
        if (deviceData?.manufacturer_warranty_months) {
          setManufacturerWarrantyMonths(deviceData.manufacturer_warranty_months);
          return deviceData.manufacturer_warranty_months;
        }
      }
      
      // Fall back to category default
      const { data: categoryData } = await supabase
        .from("device_categories")
        .select("manufacturer_warranty_months")
        .eq("name", deviceCategory)
        .single();
      
      const warrantyMonths = categoryData?.manufacturer_warranty_months || 12;
      setManufacturerWarrantyMonths(warrantyMonths);
      return warrantyMonths;
    } catch (error) {
      console.error("Failed to fetch warranty period:", error);
      setManufacturerWarrantyMonths(12);
      return 12;
    }
  };
  
  // Check if incident date is within manufacturer warranty
  const checkManufacturerWarranty = (incidentDate: string, purchaseDate: string | null, warrantyMonths: number = manufacturerWarrantyMonths) => {
    if (!purchaseDate || !incidentDate) return false;
    const purchase = new Date(purchaseDate);
    const incident = new Date(incidentDate);
    const warrantyEnd = new Date(purchase);
    warrantyEnd.setMonth(warrantyEnd.getMonth() + warrantyMonths);
    return incident < warrantyEnd;
  };

  // Pre-fill policy if coming from policy details page
  useEffect(() => {
    const state = location.state as { policy?: any };
    if (state?.policy) {
      const policy = state.policy;
      setPolicyPreSelected(true);
      setFormData((prev) => ({
        ...prev,
        policyNumber: policy.policy_number,
        policyId: policy.id,
        customerName: policy.customer_name || policy.profile?.full_name,
        customerEmail: policy.customer_email || policy.profile?.email,
        policyDetails: {
          id: policy.id,
          policy_number: policy.policy_number,
          status: policy.status,
          customer_address_line1: policy.customer_address_line1,
          customer_address_line2: policy.customer_address_line2,
          customer_city: policy.customer_city,
          customer_postcode: policy.customer_postcode,
          product: policy.product,
          covered_items: policy.covered_items || [],
        },
      }));
      if (policy.covered_items && policy.covered_items.length > 0) {
        const firstItem = policy.covered_items[0];
        setInsuredDevice({
          product_name: firstItem.product_name,
          model: firstItem.model,
          serial_number: firstItem.serial_number,
          purchase_price: firstItem.purchase_price || 0,
        });
        // Set device purchase date for manufacturer warranty check (prefer purchase_date over added_date)
        setDevicePurchaseDate(firstItem.purchase_date || firstItem.added_date || policy.start_date || null);
        setFormData((prev) => ({
          ...prev,
          itemPurchasePrice: firstItem.purchase_price ? firstItem.purchase_price.toString() : "",
        }));
        // Fetch manufacturer warranty based on device info
        if (firstItem.product_name) {
          fetchManufacturerWarranty(firstItem.product_name, firstItem.model);
        }
      } else {
        // Fallback to policy start date if no covered items
        setDevicePurchaseDate(policy.start_date || null);
      }
    }
  }, [location.state]);

  // Pre-fill form data when insured device is loaded, but don't auto-confirm
  useEffect(() => {
    if (insuredDevice) {
      setFormData((prev) => ({
        ...prev,
        itemName: prev.itemName || insuredDevice.product_name,
        itemSerialNumber: prev.itemSerialNumber || insuredDevice.serial_number || "",
        itemPurchasePrice: prev.itemPurchasePrice || insuredDevice.purchase_price.toString(),
      }));
    }
  }, [insuredDevice]);

  const [formData, setFormData] = useState<ClaimFormData>({
    policyNumber: "",
    claimType: "",
    itemName: "",
    itemSerialNumber: "",
    itemPurchasePrice: "",
    incidentDate: "",
    incidentLocation: "",
    faultCategory: "",
    specificIssue: "",
  });

  const totalSteps = policyPreSelected ? 5 : 6;
  const headerStep = policyPreSelected ? currentStep + 1 : currentStep;
  const progress = Math.min((headerStep / totalSteps) * 100, 100);

  const handleSearchPolicy = async () => {
    if (!formData.policyNumber.trim()) {
      toast.error("Please enter a search term");
      return;
    }

    setSearchingPolicy(true);
    setSearchResults([]);
    try {
      const searchTerm = formData.policyNumber.trim();
      
      const { data: policies, error } = await supabase
        .from("policies")
        .select(`
          id,
          policy_number,
          status,
          start_date,
          customer_name,
          customer_email,
          customer_address_line1,
          customer_address_line2,
          customer_city,
          customer_postcode,
          profiles (full_name, email),
          products (
            name,
            type,
            monthly_premium,
            excess_1,
            coverage,
            perils
          ),
          covered_items (
            id,
            product_name,
            serial_number,
            model,
            purchase_price,
            added_date,
            purchase_date
          )
        `)
        .or(`policy_number.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,customer_email.ilike.%${searchTerm}%`)
        .order('status', { ascending: true })
        .limit(20);

      if (error) {
        toast.error("Search failed");
        return;
      }

      if (!policies || policies.length === 0) {
        toast.error("No policies found");
        return;
      }

      setSearchResults(policies);
      toast.success(`Found ${policies.length} ${policies.length === 1 ? 'policy' : 'policies'}`);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Search failed");
    } finally {
      setSearchingPolicy(false);
    }
  };

  const selectPolicy = (policy: any) => {
    if (policy.status !== "active") {
      toast.error("Policy is not active");
      return;
    }

    // Handle covered_items - can be object (one-to-one) or array
    const coveredItemsArray = policy.covered_items 
      ? (Array.isArray(policy.covered_items) ? policy.covered_items : [policy.covered_items])
      : [];

    const policyDetails: PolicyDetails = {
      id: policy.id,
      policy_number: policy.policy_number,
      status: policy.status,
      customer_address_line1: policy.customer_address_line1,
      customer_address_line2: policy.customer_address_line2,
      customer_city: policy.customer_city,
      customer_postcode: policy.customer_postcode,
      product: Array.isArray(policy.products) ? policy.products[0] as any : policy.products as any,
      covered_items: coveredItemsArray as any,
    };

    const deviceData = coveredItemsArray.length > 0 ? coveredItemsArray[0] : null;
    
    // Set device purchase date for manufacturer warranty check (prefer purchase_date over added_date)
    if (deviceData?.purchase_date) {
      setDevicePurchaseDate(deviceData.purchase_date);
    } else if (deviceData?.added_date) {
      setDevicePurchaseDate(deviceData.added_date);
    } else {
      // Fallback to policy start date
      setDevicePurchaseDate(policy.start_date || null);
    }
    
    // Fetch manufacturer warranty based on device info
    if (deviceData?.product_name) {
      fetchManufacturerWarranty(deviceData.product_name, deviceData.model);
    }
      
    setFormData({
      ...formData,
      policyId: policy.id,
      policyDetails,
      customerName: policy.customer_name || policy.profiles?.full_name || "",
      customerEmail: policy.customer_email || policy.profiles?.email || "",
      itemName: deviceData?.product_name || "",
      itemSerialNumber: deviceData?.serial_number || "",
      itemPurchasePrice: deviceData?.purchase_price?.toString() || "",
    });

    if (deviceData) {
      setInsuredDevice({
        product_name: deviceData.product_name,
        model: deviceData.model || "",
        serial_number: deviceData.serial_number || "",
        purchase_price: deviceData.purchase_price || 0,
      });
    }

    setSearchResults([]);
    toast.success("Policy selected");
  };

  const handleNext = () => {
    if (validateStep(policyPreSelected ? currentStep + 1 : currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.policyId) {
          toast.error("Please search and verify the policy");
          return false;
        }
        return true;
      case 2:
        if (!formData.claimType) {
          toast.error("Please select a claim type");
          return false;
        }
        return true;
      case 3:
        if (insuredDevice && !deviceInfoConfirmed) {
          toast.error("Please confirm if the device information is correct");
          return false;
        }
        if (!insuredDevice || deviceInfoConfirmed === "incorrect") {
          if (!itemCategory || !itemMake || !itemModel || !itemColor) {
            toast.error("Please provide complete device details");
            return false;
          }
        }
        if (!formData.itemName || !formData.itemPurchasePrice) {
          toast.error("Please fill in all required item details");
          return false;
        }
        return true;
      case 4:
        if (!formData.incidentDate) {
          toast.error("Please select the incident date");
          return false;
        }
        if (!formData.incidentLocation) {
          toast.error("Please select the incident location");
          return false;
        }
        if (!formData.faultCategory || !formData.specificIssue) {
          toast.error("Please complete all fault details");
          return false;
        }
        return true;
      case 5:
        if (!formData.customerName?.trim() || !formData.customerEmail?.trim()) {
          toast.error("Please fill in customer name and email");
          return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.customerEmail)) {
          toast.error("Please enter a valid email address");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleSubmit = async () => {
    if (!formData.policyId) {
      toast.error("Policy information missing");
      return;
    }

    setSubmitting(true);
    try {
      const { data: policy, error: policyError } = await supabase
        .from("policies")
        .select("user_id")
        .eq("id", formData.policyId)
        .single();

      if (policyError || !policy) {
        toast.error("Failed to retrieve policy information");
        setSubmitting(false);
        return;
      }

      const { data: policyData, error: policyDataError } = await supabase
        .from("policies")
        .select("products(name), program_id")
        .eq("id", formData.policyId)
        .single();

      if (policyDataError) {
        console.error('Policy data error:', policyDataError);
        toast.error("Failed to fetch policy data");
        setSubmitting(false);
        return;
      }

      const productName = (policyData as any)?.products?.name || 'Extended Warranty';
      const programId = (policyData as any)?.program_id;

      if (!programId) {
        toast.error("Policy is not associated with a program");
        setSubmitting(false);
        return;
      }

      // If user updated device details, update the policy's covered_items
      if (deviceInfoConfirmed === "incorrect" && (itemCategory || itemMake || itemModel || itemPurchasePrice || itemSerialNumber)) {
        const finalModel = itemModel === "Other" ? itemModelOther : itemModel;
        const deviceProductName = itemCategory ? `${itemMake} ${itemCategory}`.trim() : (itemMake || formData.itemName);
        
        const { error: updateError } = await supabase
          .from('covered_items')
          .update({
            product_name: deviceProductName,
            model: finalModel || '',
            serial_number: itemSerialNumber || '',
            purchase_price: itemPurchasePrice ? parseFloat(itemPurchasePrice) : null
          })
          .eq('policy_id', formData.policyId);
        
        if (updateError) {
          console.error('Failed to update covered_items:', updateError);
          // Don't block claim submission, just log the error
        } else {
          console.log('Updated covered_items with new device details');
        }
      }

      // Generate claim number using program format configuration
      const claimNumber = await generateReferenceNumber(programId, 'claim_number', productName);
      setSubmittedClaimNumber(claimNumber);

      let claimDescription = `Policy: ${formData.policyDetails?.policy_number}\n`;
      claimDescription += `Customer: ${formData.customerName} (${formData.customerEmail})\n`;
      claimDescription += `Claim Type: ${formData.claimType}\n\n`;
      claimDescription += `Device: ${formData.itemName}\n`;
      claimDescription += `Serial: ${formData.itemSerialNumber || 'N/A'}\n`;
      claimDescription += `Purchase Price: €${formData.itemPurchasePrice}\n\n`;
      
      if (formData.claimType !== "breakdown") {
        claimDescription += `Incident Date: ${formData.incidentDate}\n`;
        claimDescription += `Location: ${formData.incidentLocation}\n`;
      }
      
      claimDescription += `\nFault Category: ${formData.faultCategory}\nSpecific Issue: ${formData.specificIssue}\n`;
      
      // Check if within manufacturer warranty and add note to description
      if (isWithinManufacturerWarranty) {
        claimDescription += `\n⚠️ MANUFACTURER WARRANTY NOTICE: Incident date is within ${manufacturerWarrantyMonths}-month manufacturer warranty period. Customer should be directed to manufacturer first.\n`;
      }

      // Determine initial claim status - auto-refer if within manufacturer warranty
      const initialStatus = isWithinManufacturerWarranty ? "referred" : "notified";
      const initialDecision = isWithinManufacturerWarranty ? null : null;
      const initialDecisionReason = isWithinManufacturerWarranty 
        ? `Claim within manufacturer warranty period (${manufacturerWarrantyMonths} months from purchase). Customer should contact manufacturer for warranty support.` 
        : null;

      const { data: claimData, error: claimError } = await supabase.from("claims").insert([{
        user_id: policy.user_id,
        policy_id: formData.policyId,
        claim_number: claimNumber,
        claim_type: formData.claimType as any,
        description: claimDescription,
        status: initialStatus,
        has_receipt: false,
        decision: initialDecision,
        decision_reason: initialDecisionReason,
      }]).select();

      if (claimError) {
        console.error('Claim insert error:', claimError);
        throw claimError;
      }

      if (claimData && claimData.length > 0) {
        const claimId = claimData[0].id;
        
        setCreatedClaimId(claimId);
        
        try {
          const { error: emailError } = await supabase.functions.invoke('send-claim-document-request', {
            body: {
              claimId,
              policyId: formData.policyId,
              claimNumber: claimNumber,
              customerEmail: formData.customerEmail,
              customerName: formData.customerName,
              policyNumber: formData.policyDetails?.policy_number || formData.policyNumber,
              productName: formData.policyDetails?.product?.name || 'Your Product'
            }
          });
          
          if (emailError) {
            console.error('Email send error:', emailError);
          } else {
            console.log('Document upload email sent successfully');
          }

          // Also send claim notification email
          const { data: template } = await supabase
            .from('communication_templates')
            .select('id')
            .eq('status', 'notified')
            .eq('type', 'claim')
            .eq('is_active', true)
            .single();

          if (template) {
            await supabase.functions.invoke('send-templated-email', {
              body: {
                policyId: formData.policyId,
                claimId,
                templateId: template.id,
                status: 'notified'
              }
            });
            console.log('Claim notification email sent');
          }
        } catch (emailErr) {
          console.error('Failed to send emails:', emailErr);
        }
        
        const nextStep = policyPreSelected ? 5 : 6;
        setCurrentStep(nextStep);
        
        toast.success("Claim submitted! Customer will receive an email to upload documents.");
      } else {
        console.error('No claim data returned');
        toast.error("Claim submission failed - no data returned");
      }
    } catch (error: any) {
      console.error('Claim submission error:', error);
      toast.error(error.message || "Failed to submit claim");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepContent = () => {
    const actualStep = policyPreSelected ? currentStep + 1 : currentStep;
    
    switch (actualStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="policyNumber">Find Policy *</Label>
              <div className="flex gap-2">
                <Input
                  id="policyNumber"
                  value={formData.policyNumber}
                  onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
                  placeholder="Enter policy number, customer name or email"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchPolicy()}
                />
                <Button onClick={handleSearchPolicy} disabled={searchingPolicy}>
                  {searchingPolicy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                </Button>
              </div>
            </div>

            {/* Search Results Table */}
            {searchResults.length >= 1 && !formData.policyId && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {searchResults.length} {searchResults.length === 1 ? 'Policy' : 'Policies'} Found
                  </CardTitle>
                  <CardDescription>Select a policy to make a claim</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Policy Number</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead>Premium</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {searchResults.map((policy) => {
                          const product = Array.isArray(policy.products) ? policy.products[0] : policy.products;
                          return (
                            <TableRow 
                              key={policy.id}
                              className={policy.status === 'active' ? 'cursor-pointer hover:bg-muted/50' : 'opacity-50'}
                            >
                              <TableCell className="font-medium">{policy.policy_number}</TableCell>
                              <TableCell>{policy.customer_name || policy.profiles?.full_name || 'N/A'}</TableCell>
                              <TableCell>{policy.customer_email || policy.profiles?.email || 'N/A'}</TableCell>
                              <TableCell>{product?.name || 'N/A'}</TableCell>
                              <TableCell>€{product?.monthly_premium || 0}/mo</TableCell>
                              <TableCell>
                                <Badge variant={policy.status === 'active' ? 'default' : 'secondary'}>
                                  {formatStatus(policy.status)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {policy.start_date 
                                  ? new Date(policy.start_date).toLocaleDateString() 
                                  : 'N/A'}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  disabled={policy.status !== 'active'}
                                  onClick={() => selectPolicy(policy)}
                                >
                                  Select
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {formData.policyId && formData.policyDetails && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{formData.policyDetails.product.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formData.policyDetails.product.type.replace(/_/g, ' ').toUpperCase()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setFormData({ ...formData, policyId: undefined, policyDetails: undefined });
                          setSearchResults([]);
                        }}
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Customer</p>
                      <p className="font-medium">{formData.customerName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium text-sm">{formData.customerEmail}</p>
                    </div>
                  </div>
                  {formData.policyDetails.covered_items.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Covered Devices</p>
                      <div className="space-y-2">
                        {formData.policyDetails.covered_items.map((item) => (
                          <div key={item.id} className="text-sm p-2 bg-background rounded border">
                            <p className="font-medium">{item.product_name}</p>
                            {item.model && <p className="text-muted-foreground">Model: {item.model}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 2:
        if (!formData.policyDetails?.product) {
          return (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          );
        }

        const perils = formData.policyDetails.product.perils || [];
        
        // Peril descriptions map
        const perilDescriptions: Record<string, string> = {
          "screen damage": "Covers cracked, shattered or damaged screens from accidental drops or impacts",
          "water/liquid damage": "Protection against liquid spills, submersion, and moisture damage",
          "accidental damage": "General coverage for unintentional physical damage to your device",
          "extended warranty": "Extends manufacturer warranty coverage for mechanical and electrical faults",
          "worldwide cover": "Protection extends globally when traveling abroad",
          "theft": "Coverage if your device is stolen",
          "loss": "Protection if you lose your device",
          "accessories cover": "Coverage for accessories like chargers, cases, and earbuds",
        };

        // Get description for a peril
        const getPerilDescription = (peril: string) => {
          return perilDescriptions[peril.toLowerCase()] || "Coverage included in your policy";
        };
        
        // Use perils to determine available claim types
        const hasPeril = (perilType: string) => {
          const perilsLower = perils.map(p => p.toLowerCase());
          if (perilType === "breakdown") {
            return perilsLower.some(p => 
              p.includes("breakdown") || 
              p.includes("malfunction") ||
              p.includes("mechanical") ||
              p.includes("electrical") ||
              p.includes("extended warranty") ||
              p.includes("warranty")
            );
          }
          if (perilType === "damage") {
            return perilsLower.some(p => 
              p.includes("accidental damage") || 
              p.includes("screen damage") ||
              p.includes("water") ||
              p.includes("liquid") ||
              p.includes("damage")
            );
          }
          if (perilType === "theft") {
            return perilsLower.some(p => 
              p.includes("theft") || 
              p.includes("loss") ||
              p.includes("stolen")
            );
          }
          return false;
        };

        return (
          <div className="space-y-4">
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Policy Coverage
                </CardTitle>
                <CardDescription>
                  Your policy covers the following
                </CardDescription>
              </CardHeader>
              <CardContent>
                {perils.length > 0 ? (
                  <div className="space-y-3">
                    {perils.map((peril: string, index: number) => (
                      <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-background/60 border border-border/50">
                        <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{peril}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {getPerilDescription(peril)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No coverage information available</p>
                )}
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="claimType">Claim Type *</Label>
              <Select value={formData.claimType} onValueChange={(value) => {
                setFormData({ ...formData, claimType: value as ClaimType });
                // For breakdown claims, check warranty against today's date
                if (value === "breakdown") {
                  const today = new Date().toISOString().split('T')[0];
                  const withinWarranty = checkManufacturerWarranty(today, devicePurchaseDate);
                  setIsWithinManufacturerWarranty(withinWarranty);
                } else {
                  // Reset - will be checked again when incident date is set
                  setIsWithinManufacturerWarranty(false);
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select claim type" />
                </SelectTrigger>
                <SelectContent>
                  {hasPeril("breakdown") && (
                    <SelectItem value="breakdown">Breakdown / Malfunction</SelectItem>
                  )}
                  {hasPeril("damage") && (
                    <SelectItem value="damage">Accidental Damage</SelectItem>
                  )}
                  {hasPeril("theft") && (
                    <SelectItem value="theft">Theft / Loss</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {!hasPeril("breakdown") && !hasPeril("damage") && !hasPeril("theft") && (
                <p className="text-sm text-destructive mt-2">No claim types are covered under this policy.</p>
              )}
            </div>
            
            {isWithinManufacturerWarranty && formData.claimType === "breakdown" && (
              <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  <strong>Manufacturer Warranty Notice:</strong> This device is still within the {manufacturerWarrantyMonths}-month manufacturer warranty period. 
                  This claim will be referred for review as the customer should first contact the manufacturer for warranty support. 
                  Extended warranty coverage begins after the manufacturer warranty expires.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {insuredDevice && (
              <Card className="border-2 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-base">Insured Device on Policy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Product Name</p>
                      <p className="font-medium">{insuredDevice.product_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Model</p>
                      <p className="font-medium">{insuredDevice.model || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Serial Number</p>
                      <p className="font-medium">{insuredDevice.serial_number || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Purchase Price</p>
                      <p className="font-medium">€{insuredDevice.purchase_price}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Is this information correct?</Label>
                    <RadioGroup value={deviceInfoConfirmed} onValueChange={(value: any) => setDeviceInfoConfirmed(value)}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="correct" id="correct" />
                        <Label htmlFor="correct">Yes, this is correct</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="incorrect" id="incorrect" />
                        <Label htmlFor="incorrect">No, I need to update this</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>
            )}

            {(!insuredDevice || deviceInfoConfirmed === "incorrect") && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Update Device Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(() => {
                    const availableBrands = itemCategory ? (brandsByCategory[itemCategory] || ["Other"]) : [];
                    const availableModels = itemCategory && itemMake ? (modelsByCategoryAndBrand[itemCategory]?.[itemMake] || ["Other"]) : [];
                    const isOtherModel = itemModel === "Other";
                    const isOtherColor = itemColor === "Other";
                    const isTelevision = itemCategory === "Television";
                    
                    return (
                      <>
                        <div>
                          <Label>Device Category *</Label>
                          <Select value={itemCategory} onValueChange={(v) => { setItemCategory(v); setItemMake(""); setItemModel(""); setItemModelOther(""); setItemColor(""); }}>
                            <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                            <SelectContent>{deviceCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Make/Brand *</Label>
                            <Select value={itemMake} onValueChange={(v) => { setItemMake(v); setItemModel(""); setItemModelOther(""); }} disabled={!itemCategory}>
                              <SelectTrigger className="mt-1"><SelectValue placeholder="Select brand" /></SelectTrigger>
                              <SelectContent>{availableBrands.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Model *</Label>
                            <Select value={itemModel} onValueChange={setItemModel} disabled={!itemMake}>
                              <SelectTrigger className="mt-1"><SelectValue placeholder="Select model" /></SelectTrigger>
                              <SelectContent>{availableModels.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                            </Select>
                            {isOtherModel && (
                              <Input className="mt-2" value={itemModelOther} onChange={(e) => setItemModelOther(e.target.value)} placeholder="Enter model name" />
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Serial Number</Label>
                            <Input className="mt-1" value={itemSerialNumber} onChange={(e) => setItemSerialNumber(e.target.value)} placeholder="Optional" />
                          </div>
                          <div>
                            <Label>{isTelevision ? "Screen Size *" : "Color *"}</Label>
                            <Select value={itemColor} onValueChange={setItemColor}>
                              <SelectTrigger className="mt-1"><SelectValue placeholder={isTelevision ? "Select screen size" : "Select color"} /></SelectTrigger>
                              <SelectContent>{(isTelevision ? screenSizeOptions : colorOptions).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                            </Select>
                            {isOtherColor && !isTelevision && (
                              <Input className="mt-2" placeholder="Enter color" onChange={(e) => setItemColor(e.target.value)} />
                            )}
                          </div>
                        </div>
                        <div>
                          <Label>Purchase Price (€) *</Label>
                          <Input type="number" className="mt-1" value={itemPurchasePrice} onChange={(e) => setItemPurchasePrice(e.target.value)} placeholder="0.00" />
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="incidentDate">Incident Date *</Label>
              <Input
                id="incidentDate"
                type="date"
                value={formData.incidentDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setFormData({ ...formData, incidentDate: newDate });
                  // Check manufacturer warranty
                  const withinWarranty = checkManufacturerWarranty(newDate, devicePurchaseDate);
                  setIsWithinManufacturerWarranty(withinWarranty);
                }}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            {isWithinManufacturerWarranty && (
              <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  <strong>Manufacturer Warranty Notice:</strong> The incident date falls within the 12-month manufacturer warranty period. 
                  This claim will be referred for review as the customer should first contact the manufacturer for warranty support. 
                  Extended warranty coverage begins after the manufacturer warranty expires.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="incidentLocation">Incident Location *</Label>
              <Select
                value={formData.incidentLocation}
                onValueChange={(value) => setFormData({ ...formData, incidentLocation: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="work">Work</SelectItem>
                  <SelectItem value="public_place">Public Place</SelectItem>
                  <SelectItem value="vehicle">In Vehicle</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fault Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="faultCategory">Fault Category *</Label>
                  <Select 
                    value={formData.faultCategory} 
                    onValueChange={(value) => setFormData({ ...formData, faultCategory: value, specificIssue: "" })}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select fault category" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {faultCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="specificIssue">Specific Issue *</Label>
                  <Select 
                    value={formData.specificIssue} 
                    onValueChange={(value) => setFormData({ ...formData, specificIssue: value })}
                    disabled={!formData.faultCategory}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder={formData.faultCategory ? "Select specific issue" : "Select fault category first"} />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {(specificIssuesByCategory[formData.faultCategory as keyof typeof specificIssuesByCategory] || []).map((issue) => (
                        <SelectItem key={issue} value={issue}>
                          {issue}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Review and update customer details if needed. The customer will receive an email with a link to upload supporting documents.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle>Customer Contact Details</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Update email or address if needed
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerName">Customer Name *</Label>
                    <Input
                      id="customerName"
                      value={formData.customerName || ""}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerEmail">Email *</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={formData.customerEmail || ""}
                      onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                      placeholder="email@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="addressLine1">Address Line 1</Label>
                    <Input
                      id="addressLine1"
                      value={formData.policyDetails?.customer_address_line1 || ""}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        policyDetails: {
                          ...formData.policyDetails!,
                          customer_address_line1: e.target.value
                        }
                      })}
                      placeholder="Street address"
                    />
                  </div>
                  <div>
                    <Label htmlFor="addressLine2">Address Line 2</Label>
                    <Input
                      id="addressLine2"
                      value={formData.policyDetails?.customer_address_line2 || ""}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        policyDetails: {
                          ...formData.policyDetails!,
                          customer_address_line2: e.target.value
                        }
                      })}
                      placeholder="Apartment, suite, etc."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.policyDetails?.customer_city || ""}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          policyDetails: {
                            ...formData.policyDetails!,
                            customer_city: e.target.value
                          }
                        })}
                        placeholder="City"
                      />
                    </div>
                    <div>
                      <Label htmlFor="postcode">Postcode</Label>
                      <Input
                        id="postcode"
                        value={formData.policyDetails?.customer_postcode || ""}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          policyDetails: {
                            ...formData.policyDetails!,
                            customer_postcode: e.target.value
                          }
                        })}
                        placeholder="Postcode"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Claim Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Policy Number</p>
                    <p className="font-medium">{formData.policyDetails?.policy_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Claim Type</p>
                    <p className="font-medium capitalize">{formData.claimType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Device</p>
                    <p className="font-medium">{formData.itemName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Incident Date</p>
                    <p className="font-medium">{formData.incidentDate}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 6:
        if (!createdClaimId) {
          return (
            <div className="flex items-center justify-center h-64">
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground">Processing claim...</p>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <AlertDescription>
                <p className="font-semibold">Claim Submitted Successfully</p>
                <div className="mt-3 p-3 bg-white rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Claim Number:</span>
                    <span className="text-lg font-bold text-primary">{submittedClaimNumber}</span>
                  </div>
                </div>
                <p className="text-sm mt-3">
                  An email has been sent to {formData.customerEmail} with a link to upload supporting documents.
                </p>
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  What Happens Next
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  The customer will now complete the claim process by uploading supporting documents.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/20">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="h-full w-px bg-border mt-2" />
                    </div>
                    <div className="flex-1 pb-6">
                      <h4 className="font-semibold text-sm mb-1">Claim Registered</h4>
                      <p className="text-sm text-muted-foreground">
                        Claim #{createdClaimId?.slice(0, 8)} has been created in the system
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-900/20">
                        <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="h-full w-px bg-border mt-2" />
                    </div>
                    <div className="flex-1 pb-6">
                      <h4 className="font-semibold text-sm mb-1">Email Sent to Customer</h4>
                      <p className="text-sm text-muted-foreground">
                        {formData.customerEmail} will receive a secure link to upload documents
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="rounded-full bg-purple-100 p-2 dark:bg-purple-900/20">
                        <Upload className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="h-full w-px bg-border mt-2" />
                    </div>
                    <div className="flex-1 pb-6">
                      <h4 className="font-semibold text-sm mb-1">Customer Uploads Documents</h4>
                      <p className="text-sm text-muted-foreground">
                        Photos, receipts, and any supporting evidence will be uploaded
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="rounded-full bg-orange-100 p-2 dark:bg-orange-900/20">
                        <Sparkles className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="h-full w-px bg-border mt-2" />
                    </div>
                    <div className="flex-1 pb-6">
                      <h4 className="font-semibold text-sm mb-1">AI Analysis & Verification</h4>
                      <p className="text-sm text-muted-foreground">
                        Automated analysis of documents and damage assessment
                      </p>
                    </div>
                  </div>

                  {/* Step 5 */}
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="rounded-full bg-primary/10 p-2">
                        <FileCheck className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-1">Claim Decision</h4>
                      <p className="text-sm text-muted-foreground">
                        Final decision will be made and communicated to the customer
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button onClick={() => navigate("/retail/claims")}>
                View All Claims
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  if (formData.policyId) {
                    navigate(`/retail/policies/${formData.policyId}`);
                  }
                }}
              >
                View Policy
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const stepTitles = policyPreSelected 
    ? [
        "Claim Type Selection",
        "Device Details",
        "Incident Details",
        "Contact Details",
        "Review & Submit",
      ]
    : [
        "Search Policy",
        "Claim Type Selection",
        "Device Details",
        "Incident Details",
        "Review & Submit",
        "Complete",
      ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Make a Claim</h1>
        <p className="text-muted-foreground">Submit a new claim for a customer</p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">
            Step {headerStep} of {totalSteps}: {stepTitles[headerStep - 1]}
          </span>
          <span className="text-muted-foreground">{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{stepTitles[headerStep - 1]}</CardTitle>
        </CardHeader>
        <CardContent>
          {renderStepContent()}

          <div className="flex justify-between mt-6 pt-6 border-t">
            <Button 
              variant="outline" 
              onClick={handleBack} 
              disabled={currentStep === 1 || submitting}
            >
              Back
            </Button>

            {headerStep < totalSteps ? (
              <Button onClick={handleNext}>
                Continue
              </Button>
            ) : headerStep === totalSteps && !createdClaimId ? (
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Submit Claim
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
