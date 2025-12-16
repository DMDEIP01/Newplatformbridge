import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle, Upload, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ClaimFulfillmentFlow from "@/components/ClaimFulfillmentFlow";
import { generateReferenceNumber } from "@/lib/referenceGenerator";

type ClaimType = "breakdown" | "damage" | "theft" | "";

export default function RetailMakeClaimPrototype() {
  const [currentStep, setCurrentStep] = useState(0);
  const [claimType, setClaimType] = useState<ClaimType>("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [policyLoading, setPolicyLoading] = useState(false);
  const [foundPolicy, setFoundPolicy] = useState<any | null>(null);
  const [createdClaimId, setCreatedClaimId] = useState<string | null>(null);
  const [claimDecision, setClaimDecision] = useState<"accepted" | "referred" | null>(null);
  const [showFulfillment, setShowFulfillment] = useState(false);
  
  // Device confirmation states
  const [deviceCorrect, setDeviceCorrect] = useState<"yes" | "no" | "">("");
  const [deviceCategory, setDeviceCategory] = useState("");
  const [deviceSubcategory, setDeviceSubcategory] = useState("");
  const [deviceMake, setDeviceMake] = useState("");
  const [deviceModel, setDeviceModel] = useState("");
  const [deviceColor, setDeviceColor] = useState("");

  const getTotalSteps = () => {
    if (!claimType) return 7;
    if (claimType === "breakdown") return 6;
    if (claimType === "damage") return 7;
    if (claimType === "theft") return 6;
    return 7;
  };

  const getStepLabel = (step: number) => {
    const labels = {
      breakdown: ["Policy Search", "Claim Type", "Fault Details", "Documents", "Declaration", "Decision"],
      damage: ["Policy Search", "Claim Type", "Incident Info", "Damage Details", "Documents", "Declaration", "Decision"],
      theft: ["Policy Search", "Claim Type", "Item Details", "Incident Details", "Declaration", "Decision"]
    };
    return labels[claimType as keyof typeof labels]?.[step] || "Step";
  };

  const totalSteps = getTotalSteps();
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const fetchPolicy = async () => {
    if (!policyNumber.trim()) return;
    setPolicyLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("retail-policy-lookup", {
        body: { policyNumber }
      });
      
      // Handle 404 response (policy not found)
      if (error) {
        setFoundPolicy(null);
        toast.error("Policy not found");
        return;
      }
      
      if (!data || !data.policy) {
        setFoundPolicy(null);
        toast.error("Policy not found");
      } else {
        // Normalize covered_items to always be an array
        const normalizedPolicy = {
          ...data.policy,
          covered_items: Array.isArray(data.policy.covered_items) 
            ? data.policy.covered_items 
            : data.policy.covered_items 
              ? [data.policy.covered_items] 
              : []
        };
        setFoundPolicy(normalizedPolicy);
        toast.success("Policy found!");
      }
    } catch (err: any) {
      console.error("Policy lookup failed", err);
      toast.error("Failed to search policy");
      setFoundPolicy(null);
    } finally {
      setPolicyLoading(false);
    }
  };

  // Step 0: Policy Search
  const renderPolicySearch = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Search Customer Policy</h2>
        <p className="text-muted-foreground">Find the customer's policy to create a claim</p>
      </div>

      <Tabs defaultValue="policy-number" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="policy-number">Policy Number</TabsTrigger>
          <TabsTrigger value="customer-name">Customer Name</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="phone">Phone</TabsTrigger>
        </TabsList>
        
        <TabsContent value="policy-number" className="space-y-4">
          <div>
            <Label>Policy Number</Label>
            <Input placeholder="Enter policy number (e.g., EW-123456)" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} />
          </div>
        </TabsContent>

        <TabsContent value="customer-name" className="space-y-4">
          <div>
            <Label>Customer Name</Label>
            <Input placeholder="Enter customer name" />
          </div>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <div>
            <Label>Email Address</Label>
            <Input placeholder="Enter email address" />
          </div>
        </TabsContent>

        <TabsContent value="phone" className="space-y-4">
          <div>
            <Label>Phone Number</Label>
            <Input placeholder="Enter phone number" />
          </div>
        </TabsContent>
      </Tabs>

      {!foundPolicy ? (
        <Button onClick={fetchPolicy} className="w-full" disabled={policyLoading || !policyNumber.trim()}>
          {policyLoading ? "Searching..." : "Search"}
        </Button>
      ) : (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Policy Found
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Customer</p>
                <p className="font-semibold">{foundPolicy.profile?.full_name || "N/A"}</p>
                <p className="text-sm text-muted-foreground">{foundPolicy.profile?.email || "N/A"}</p>
                <p className="text-sm text-muted-foreground">{foundPolicy.profile?.phone || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Policy Details</p>
                <p className="font-semibold">{foundPolicy.policy_number}</p>
                <p className="text-sm">{foundPolicy.product?.name}</p>
                <Badge variant={foundPolicy.status === "active" ? "default" : "secondary"}>
                  {foundPolicy.status}
                </Badge>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Coverage</p>
              <div className="flex gap-2 flex-wrap">
                {foundPolicy.product?.coverage?.map((c: string) => (
                  <Badge key={c} variant="secondary">{c}</Badge>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Insured Device</p>
              {foundPolicy.covered_items && foundPolicy.covered_items.length > 0 ? (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-4">
                    <p className="font-semibold">{foundPolicy.covered_items[0].product_name}</p>
                    {foundPolicy.covered_items[0].model && (
                      <p className="text-sm text-muted-foreground">Model: {foundPolicy.covered_items[0].model}</p>
                    )}
                    {foundPolicy.covered_items[0].serial_number && (
                      <p className="text-sm text-muted-foreground">Serial: {foundPolicy.covered_items[0].serial_number}</p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <p className="text-sm text-muted-foreground">No covered items</p>
              )}
            </div>

            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Premium:</span>
                <span className="font-semibold ml-1">£{foundPolicy.product?.monthly_premium}/month</span>
              </div>
              <div>
                <span className="text-muted-foreground">Excess:</span>
                <span className="font-semibold ml-1">£{foundPolicy.product?.excess_1}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Step 1: Claim Type Selection
  const renderClaimTypeSelection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Select Claim Type</h2>
        <p className="text-muted-foreground">Choose the type of claim you need to make</p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          This policy covers: Breakdown, Accidental Damage, and Theft Protection
        </AlertDescription>
      </Alert>

      <RadioGroup value={claimType} onValueChange={(value) => setClaimType(value as ClaimType)}>
        <Card className="cursor-pointer hover:border-primary transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <RadioGroupItem value="breakdown" id="breakdown" />
              <div className="flex-1">
                <Label htmlFor="breakdown" className="text-base font-semibold cursor-pointer">
                  Breakdown / Malfunction
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Product stopped working or has a technical fault
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <RadioGroupItem value="damage" id="damage" />
              <div className="flex-1">
                <Label htmlFor="damage" className="text-base font-semibold cursor-pointer">
                  Accidental Damage
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Product was accidentally damaged
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:border-primary transition-colors">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <RadioGroupItem value="theft" id="theft" />
              <div className="flex-1">
                <Label htmlFor="theft" className="text-base font-semibold cursor-pointer">
                  Theft or Loss
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Product was stolen or lost
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </RadioGroup>
    </div>
  );

  // Step 2A: Breakdown - Fault Details
  const renderBreakdownFaultDetails = () => {
    const deviceCategories = [
      "Smartphone", "Laptop", "Tablet", "TV", "Gaming Console", "Camera", 
      "Smartwatch", "Headphones", "Home Appliance", "Other"
    ];

    const homeApplianceTypes = [
      "Washing Machine", "Dryer", "American Fridge", "Fridge", "Freezer",
      "Dishwasher", "Microwave", "Oven", "Cooker", "Hob", "Extractor Fan",
      "Vacuum Cleaner", "Other"
    ];

    const deviceMakesByCategory: Record<string, string[]> = {
      "Smartphone": ["Apple", "Samsung", "Google", "OnePlus", "Xiaomi", "Huawei", "Sony", "Motorola", "Nokia", "Other"],
      "Laptop": ["Apple", "Dell", "HP", "Lenovo", "Asus", "Acer", "MSI", "Microsoft", "Samsung", "Other"],
      "Tablet": ["Apple", "Samsung", "Microsoft", "Lenovo", "Amazon", "Huawei", "Other"],
      "TV": ["Samsung", "LG", "Sony", "Panasonic", "Philips", "TCL", "Hisense", "Sharp", "Other"],
      "Washing Machine": ["Bosch", "Samsung", "LG", "Whirlpool", "Siemens", "Miele", "Hotpoint", "Beko", "Other"],
      "Other": ["Other"]
    };

    const deviceModelsByMake: Record<string, string[]> = {
      "Apple": ["iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15", "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14", "iPhone 13", "MacBook Pro 16\"", "MacBook Pro 14\"", "MacBook Air M2", "iPad Pro 12.9\"", "iPad Pro 11\"", "iPad Air", "Other"],
      "Samsung": ["Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24", "Galaxy S23 Ultra", "Galaxy S23", "Galaxy Z Fold 5", "Galaxy Z Flip 5", "Galaxy A54", "Galaxy A34", "Other"],
      "Google": ["Pixel 8 Pro", "Pixel 8", "Pixel 7a", "Pixel 7 Pro", "Pixel 7", "Pixel Fold", "Other"],
      "OnePlus": ["OnePlus 12", "OnePlus 11", "OnePlus Nord 3", "OnePlus Nord CE 3", "Other"],
      "Xiaomi": ["Xiaomi 14 Pro", "Xiaomi 14", "Xiaomi 13T Pro", "Redmi Note 13 Pro", "Redmi Note 13", "Other"],
      "Dell": ["XPS 15", "XPS 13", "Inspiron 15", "Inspiron 14", "Latitude 14", "Alienware m16", "Other"],
      "HP": ["Spectre x360", "Envy 15", "Pavilion 15", "EliteBook 840", "ProBook 450", "Other"],
      "Lenovo": ["ThinkPad X1 Carbon", "ThinkPad T14", "IdeaPad 5", "Yoga 9i", "Legion 5", "Other"],
      "LG": ["OLED C3", "OLED B3", "NanoCell", "UltraGear Monitor", "Other"],
      "Sony": ["Bravia XR", "Bravia 8", "PlayStation 5", "WH-1000XM5", "Other"],
      "Bosch": ["Serie 8", "Serie 6", "Serie 4", "Other"],
      "Other": ["Other"]
    };

    const availableMakes = deviceCategory ? (deviceMakesByCategory[deviceCategory] || []) : [];
    const availableModels = deviceMake ? (deviceModelsByMake[deviceMake] || ["Other"]) : [];
    const deviceColors = ["Black", "White", "Silver", "Gold", "Blue", "Green", "Red", "Purple", "Pink", "Grey", "Stainless Steel", "Other"];

    const isHomeAppliance = deviceCategory === "Home Appliance";
    const areDeviceDetailsFilled = deviceCorrect === "yes" || 
      (deviceCorrect === "no" && deviceCategory && 
       (!isHomeAppliance || deviceSubcategory) && 
       deviceMake && deviceModel && deviceColor);

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Fault Details</h2>
          <p className="text-muted-foreground">Provide information about the device fault</p>
        </div>

        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Insured Device:</strong> {foundPolicy?.covered_items?.[0]?.product_name || "N/A"}
            {foundPolicy?.covered_items?.[0]?.model && ` - Model ${foundPolicy.covered_items[0].model}`}
            {foundPolicy?.covered_items?.[0]?.serial_number && ` (SN: ${foundPolicy.covered_items[0].serial_number})`}
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label>Is this the correct device? <Badge variant="destructive">Required</Badge></Label>
            <RadioGroup value={deviceCorrect} onValueChange={(value) => setDeviceCorrect(value as "yes" | "no")} className="mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="device-yes" />
                <Label htmlFor="device-yes">Yes, this is correct</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="device-no" />
                <Label htmlFor="device-no">No, I need to provide different details</Label>
              </div>
            </RadioGroup>
          </div>

          {deviceCorrect === "no" && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-base">Provide Device Details</CardTitle>
                <CardDescription>Please provide the correct device information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Device Category <Badge variant="destructive">Required</Badge></Label>
                  <Select value={deviceCategory} onValueChange={(value) => { setDeviceCategory(value); setDeviceSubcategory(""); setDeviceMake(""); setDeviceModel(""); }}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {deviceCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isHomeAppliance && (
                  <div>
                    <Label>Appliance Type <Badge variant="destructive">Required</Badge></Label>
                    <Select value={deviceSubcategory} onValueChange={setDeviceSubcategory}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select appliance type" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {homeApplianceTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Make/Brand <Badge variant="destructive">Required</Badge></Label>
                    <Select value={deviceMake} onValueChange={(value) => { setDeviceMake(value); setDeviceModel(""); }} disabled={!deviceCategory}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder={deviceCategory ? "Select brand" : "Select category first"} />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {availableMakes.map((make) => (
                          <SelectItem key={make} value={make}>{make}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Model <Badge variant="destructive">Required</Badge></Label>
                    <Select value={deviceModel} onValueChange={setDeviceModel} disabled={!deviceMake}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder={deviceMake ? "Select model" : "Select brand first"} />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {availableModels.map((model) => (
                          <SelectItem key={model} value={model}>{model}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Color <Badge variant="destructive">Required</Badge></Label>
                  <Select value={deviceColor} onValueChange={setDeviceColor}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select color" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {deviceColors.map((color) => (
                        <SelectItem key={color} value={color}>{color}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {areDeviceDetailsFilled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fault Category <Badge variant="destructive">Required</Badge></Label>
                  <Select defaultValue="hardware">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="hardware">Hardware Issues</SelectItem>
                      <SelectItem value="software">Software Issues</SelectItem>
                      <SelectItem value="performance">Performance Issues</SelectItem>
                      <SelectItem value="power">Power Issues</SelectItem>
                      <SelectItem value="connectivity">Connectivity Issues</SelectItem>
                      <SelectItem value="display">Display/Audio Issues</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Specific Issue <Badge variant="destructive">Required</Badge></Label>
                  <Select defaultValue="component">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="component">Component Failure</SelectItem>
                      <SelectItem value="overheating">Overheating</SelectItem>
                      <SelectItem value="battery">Battery Issues</SelectItem>
                      <SelectItem value="charging">Charging Problems</SelectItem>
                      <SelectItem value="buttons">Buttons Not Working</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>Problem Date <Badge variant="destructive">Required</Badge></Label>
                  <Input type="date" defaultValue="2024-01-15" />
                </div>
              </div>

              <div>
                <Label>Issue Frequency <Badge variant="destructive">Required</Badge></Label>
                <RadioGroup defaultValue="constant" className="mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="intermittent" id="freq-int" />
                    <Label htmlFor="freq-int">Intermittent</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="constant" id="freq-const" />
                    <Label htmlFor="freq-const">Constant</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>Previous Repairs <Badge variant="secondary">Optional</Badge></Label>
                <Textarea placeholder="Describe any previous repairs or attempts to fix the issue..." rows={3} />
              </div>

              <div>
                <Label>Additional Comments <Badge variant="secondary">Optional</Badge></Label>
                <Textarea placeholder="Provide any additional details..." rows={3} />
                <p className="text-xs text-muted-foreground mt-1">0 / 500 characters</p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // Step 2B: Damage - Incident Info
  const renderDamageIncidentInfo = () => {
    const deviceCategories = [
      "Smartphone", "Laptop", "Tablet", "TV", "Gaming Console", "Camera", 
      "Smartwatch", "Headphones", "Home Appliance", "Other"
    ];

    const homeApplianceTypes = [
      "Washing Machine", "Dryer", "American Fridge", "Fridge", "Freezer",
      "Dishwasher", "Microwave", "Oven", "Cooker", "Hob", "Extractor Fan",
      "Vacuum Cleaner", "Other"
    ];

    const deviceMakesByCategory: Record<string, string[]> = {
      "Smartphone": ["Apple", "Samsung", "Google", "OnePlus", "Xiaomi", "Huawei", "Sony", "Motorola", "Nokia", "Other"],
      "Laptop": ["Apple", "Dell", "HP", "Lenovo", "Asus", "Acer", "MSI", "Microsoft", "Samsung", "Other"],
      "Tablet": ["Apple", "Samsung", "Microsoft", "Lenovo", "Amazon", "Huawei", "Other"],
      "TV": ["Samsung", "LG", "Sony", "Panasonic", "Philips", "TCL", "Hisense", "Sharp", "Other"],
      "Washing Machine": ["Bosch", "Samsung", "LG", "Whirlpool", "Siemens", "Miele", "Hotpoint", "Beko", "Other"],
      "Other": ["Other"]
    };

    const deviceModelsByMake: Record<string, string[]> = {
      "Apple": ["iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15", "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14", "iPhone 13", "MacBook Pro 16\"", "MacBook Pro 14\"", "MacBook Air M2", "iPad Pro 12.9\"", "iPad Pro 11\"", "iPad Air", "Other"],
      "Samsung": ["Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24", "Galaxy S23 Ultra", "Galaxy S23", "Galaxy Z Fold 5", "Galaxy Z Flip 5", "Galaxy A54", "Galaxy A34", "Other"],
      "Google": ["Pixel 8 Pro", "Pixel 8", "Pixel 7a", "Pixel 7 Pro", "Pixel 7", "Pixel Fold", "Other"],
      "OnePlus": ["OnePlus 12", "OnePlus 11", "OnePlus Nord 3", "OnePlus Nord CE 3", "Other"],
      "Xiaomi": ["Xiaomi 14 Pro", "Xiaomi 14", "Xiaomi 13T Pro", "Redmi Note 13 Pro", "Redmi Note 13", "Other"],
      "Dell": ["XPS 15", "XPS 13", "Inspiron 15", "Inspiron 14", "Latitude 14", "Alienware m16", "Other"],
      "HP": ["Spectre x360", "Envy 15", "Pavilion 15", "EliteBook 840", "ProBook 450", "Other"],
      "Lenovo": ["ThinkPad X1 Carbon", "ThinkPad T14", "IdeaPad 5", "Yoga 9i", "Legion 5", "Other"],
      "LG": ["OLED C3", "OLED B3", "NanoCell", "UltraGear Monitor", "Other"],
      "Sony": ["Bravia XR", "Bravia 8", "PlayStation 5", "WH-1000XM5", "Other"],
      "Bosch": ["Serie 8", "Serie 6", "Serie 4", "Other"],
      "Other": ["Other"]
    };

    const availableMakes = deviceCategory ? (deviceMakesByCategory[deviceCategory] || []) : [];
    const availableModels = deviceMake ? (deviceModelsByMake[deviceMake] || ["Other"]) : [];
    const deviceColors = ["Black", "White", "Silver", "Gold", "Blue", "Green", "Red", "Purple", "Pink", "Grey", "Stainless Steel", "Other"];

    const isHomeAppliance = deviceCategory === "Home Appliance";
    const areDeviceDetailsFilled = deviceCorrect === "yes" || 
      (deviceCorrect === "no" && deviceCategory && 
       (!isHomeAppliance || deviceSubcategory) && 
       deviceMake && deviceModel && deviceColor);

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Incident Information</h2>
          <p className="text-muted-foreground">Tell us when and how the damage occurred</p>
        </div>

        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Insured Device:</strong> {foundPolicy?.covered_items?.[0]?.product_name || "N/A"}
            {foundPolicy?.covered_items?.[0]?.model && ` - Model ${foundPolicy.covered_items[0].model}`}
            {foundPolicy?.covered_items?.[0]?.serial_number && ` (SN: ${foundPolicy.covered_items[0].serial_number})`}
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label>Is this the correct device? <Badge variant="destructive">Required</Badge></Label>
            <RadioGroup value={deviceCorrect} onValueChange={(value) => setDeviceCorrect(value as "yes" | "no")} className="mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="device-yes-damage" />
                <Label htmlFor="device-yes-damage">Yes, this is correct</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="device-no-damage" />
                <Label htmlFor="device-no-damage">No, I need to provide different details</Label>
              </div>
            </RadioGroup>
          </div>

          {deviceCorrect === "no" && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-base">Provide Device Details</CardTitle>
                <CardDescription>Please provide the correct device information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Device Category <Badge variant="destructive">Required</Badge></Label>
                  <Select value={deviceCategory} onValueChange={(value) => { setDeviceCategory(value); setDeviceSubcategory(""); setDeviceMake(""); setDeviceModel(""); }}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {deviceCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isHomeAppliance && (
                  <div>
                    <Label>Appliance Type <Badge variant="destructive">Required</Badge></Label>
                    <Select value={deviceSubcategory} onValueChange={setDeviceSubcategory}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select appliance type" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {homeApplianceTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Make/Brand <Badge variant="destructive">Required</Badge></Label>
                    <Select value={deviceMake} onValueChange={(value) => { setDeviceMake(value); setDeviceModel(""); }} disabled={!deviceCategory}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder={deviceCategory ? "Select brand" : "Select category first"} />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {availableMakes.map((make) => (
                          <SelectItem key={make} value={make}>{make}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Model <Badge variant="destructive">Required</Badge></Label>
                    <Select value={deviceModel} onValueChange={setDeviceModel} disabled={!deviceMake}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder={deviceMake ? "Select model" : "Select brand first"} />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {availableModels.map((model) => (
                          <SelectItem key={model} value={model}>{model}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Color <Badge variant="destructive">Required</Badge></Label>
                  <Select value={deviceColor} onValueChange={setDeviceColor}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select color" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {deviceColors.map((color) => (
                        <SelectItem key={color} value={color}>{color}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {areDeviceDetailsFilled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Incident Date <Badge variant="destructive">Required</Badge></Label>
                  <Input type="date" defaultValue="2024-01-10" />
                </div>
                <div>
                  <Label>Incident Time <Badge variant="destructive">Required</Badge></Label>
                  <Input type="time" defaultValue="14:30" />
                </div>
              </div>

              <div>
                <Label>Describe What Happened <Badge variant="destructive">Required</Badge></Label>
                <Textarea 
                  placeholder="Describe the incident in detail (minimum 20 characters)..." 
                  rows={4}
                  defaultValue="Dropped phone while taking photo, screen cracked on impact with concrete pavement"
                />
                <p className="text-xs text-muted-foreground mt-1">80 characters (min 20 required)</p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // Step 2C: Theft - Item Details
  const renderTheftItemDetails = () => {
    const deviceCategories = [
      "Smartphone", "Laptop", "Tablet", "TV", "Gaming Console", "Camera", 
      "Smartwatch", "Headphones", "Home Appliance", "Other"
    ];

    const homeApplianceTypes = [
      "Washing Machine", "Dryer", "American Fridge", "Fridge", "Freezer",
      "Dishwasher", "Microwave", "Oven", "Cooker", "Hob", "Extractor Fan",
      "Vacuum Cleaner", "Other"
    ];

    const deviceMakesByCategory: Record<string, string[]> = {
      "Smartphone": ["Apple", "Samsung", "Google", "OnePlus", "Xiaomi", "Huawei", "Sony", "Motorola", "Nokia", "Other"],
      "Laptop": ["Apple", "Dell", "HP", "Lenovo", "Asus", "Acer", "MSI", "Microsoft", "Samsung", "Other"],
      "Tablet": ["Apple", "Samsung", "Microsoft", "Lenovo", "Amazon", "Huawei", "Other"],
      "TV": ["Samsung", "LG", "Sony", "Panasonic", "Philips", "TCL", "Hisense", "Sharp", "Other"],
      "Washing Machine": ["Bosch", "Samsung", "LG", "Whirlpool", "Siemens", "Miele", "Hotpoint", "Beko", "Other"],
      "Other": ["Other"]
    };

    const deviceModelsByMake: Record<string, string[]> = {
      "Apple": ["iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15", "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14", "iPhone 13", "MacBook Pro 16\"", "MacBook Pro 14\"", "MacBook Air M2", "iPad Pro 12.9\"", "iPad Pro 11\"", "iPad Air", "Other"],
      "Samsung": ["Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24", "Galaxy S23 Ultra", "Galaxy S23", "Galaxy Z Fold 5", "Galaxy Z Flip 5", "Galaxy A54", "Galaxy A34", "Other"],
      "Google": ["Pixel 8 Pro", "Pixel 8", "Pixel 7a", "Pixel 7 Pro", "Pixel 7", "Pixel Fold", "Other"],
      "OnePlus": ["OnePlus 12", "OnePlus 11", "OnePlus Nord 3", "OnePlus Nord CE 3", "Other"],
      "Xiaomi": ["Xiaomi 14 Pro", "Xiaomi 14", "Xiaomi 13T Pro", "Redmi Note 13 Pro", "Redmi Note 13", "Other"],
      "Dell": ["XPS 15", "XPS 13", "Inspiron 15", "Inspiron 14", "Latitude 14", "Alienware m16", "Other"],
      "HP": ["Spectre x360", "Envy 15", "Pavilion 15", "EliteBook 840", "ProBook 450", "Other"],
      "Lenovo": ["ThinkPad X1 Carbon", "ThinkPad T14", "IdeaPad 5", "Yoga 9i", "Legion 5", "Other"],
      "LG": ["OLED C3", "OLED B3", "NanoCell", "UltraGear Monitor", "Other"],
      "Sony": ["Bravia XR", "Bravia 8", "PlayStation 5", "WH-1000XM5", "Other"],
      "Bosch": ["Serie 8", "Serie 6", "Serie 4", "Other"],
      "Other": ["Other"]
    };

    const availableMakes = deviceCategory ? (deviceMakesByCategory[deviceCategory] || []) : [];
    const availableModels = deviceMake ? (deviceModelsByMake[deviceMake] || ["Other"]) : [];
    const deviceColors = ["Black", "White", "Silver", "Gold", "Blue", "Green", "Red", "Purple", "Pink", "Grey", "Stainless Steel", "Other"];

    const isHomeAppliance = deviceCategory === "Home Appliance";
    const areDeviceDetailsFilled = deviceCorrect === "yes" || 
      (deviceCorrect === "no" && deviceCategory && 
       (!isHomeAppliance || deviceSubcategory) && 
       deviceMake && deviceModel && deviceColor);

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Item Details</h2>
          <p className="text-muted-foreground">Verify or provide details of the stolen item</p>
        </div>

        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Insured Device:</strong> {foundPolicy?.covered_items?.[0]?.product_name || "N/A"}
            {foundPolicy?.covered_items?.[0]?.model && ` - Model ${foundPolicy.covered_items[0].model}`}
            {foundPolicy?.covered_items?.[0]?.serial_number && ` (SN: ${foundPolicy.covered_items[0].serial_number})`}
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label>Is this the correct device? <Badge variant="destructive">Required</Badge></Label>
            <RadioGroup value={deviceCorrect} onValueChange={(value) => setDeviceCorrect(value as "yes" | "no")} className="mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="device-yes-theft" />
                <Label htmlFor="device-yes-theft">Yes, this is correct</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="device-no-theft" />
                <Label htmlFor="device-no-theft">No, I need to provide different details</Label>
              </div>
            </RadioGroup>
          </div>

          {deviceCorrect === "no" && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-base">Provide Device Details</CardTitle>
                <CardDescription>Please provide the correct device information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Device Category <Badge variant="destructive">Required</Badge></Label>
                  <Select value={deviceCategory} onValueChange={(value) => { setDeviceCategory(value); setDeviceSubcategory(""); setDeviceMake(""); setDeviceModel(""); }}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {deviceCategories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isHomeAppliance && (
                  <div>
                    <Label>Appliance Type <Badge variant="destructive">Required</Badge></Label>
                    <Select value={deviceSubcategory} onValueChange={setDeviceSubcategory}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select appliance type" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {homeApplianceTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Make/Brand <Badge variant="destructive">Required</Badge></Label>
                    <Select value={deviceMake} onValueChange={(value) => { setDeviceMake(value); setDeviceModel(""); }} disabled={!deviceCategory}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder={deviceCategory ? "Select brand" : "Select category first"} />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {availableMakes.map((make) => (
                          <SelectItem key={make} value={make}>{make}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Model <Badge variant="destructive">Required</Badge></Label>
                    <Select value={deviceModel} onValueChange={setDeviceModel} disabled={!deviceMake}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder={deviceMake ? "Select model" : "Select brand first"} />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {availableModels.map((model) => (
                          <SelectItem key={model} value={model}>{model}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Color <Badge variant="destructive">Required</Badge></Label>
                  <Select value={deviceColor} onValueChange={setDeviceColor}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select color" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {deviceColors.map((color) => (
                        <SelectItem key={color} value={color}>{color}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {areDeviceDetailsFilled && (
            <div>
              <Label>Distinguishing Features <Badge variant="secondary">Optional</Badge></Label>
              <Textarea 
                placeholder="Any unique features, scratches, or identifying marks..." 
                rows={3}
                defaultValue="Small scratch on back panel near camera lens, custom case with blue pattern"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  // Step 3A: Breakdown - Documents
  const renderBreakdownDocuments = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Supporting Documentation</h2>
        <p className="text-muted-foreground">Upload photos and documents to support your claim</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="flex items-center gap-2 mb-2">
            Defect Photos <Badge variant="destructive">Required</Badge>
          </Label>
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground">JPG, PNG, MP4 (max 5MB per file)</p>
              </div>
            </CardContent>
          </Card>
          
          <div className="mt-2 space-y-2">
            <Card className="bg-muted/50">
              <CardContent className="py-3 flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">photo1.jpg</p>
                  <p className="text-xs text-muted-foreground">2.3 MB</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="py-3 flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">photo2.jpg</p>
                  <p className="text-xs text-muted-foreground">1.8 MB</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div>
          <Label className="flex items-center gap-2 mb-2">
            Supporting Documents <Badge variant="secondary">Optional</Badge>
          </Label>
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground">JPG, PNG, PDF (max 5MB per file)</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  // Step 3B: Damage - Damage Details
  const renderDamageFaultMatrix = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Damage Details</h2>
        <p className="text-muted-foreground">Specify the type and extent of damage</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Damage Type <Badge variant="destructive">Required</Badge></Label>
            <Select defaultValue="screen">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="screen">Screen Damage</SelectItem>
                <SelectItem value="water">Water/Liquid Damage</SelectItem>
                <SelectItem value="drop">Drop/Impact Damage</SelectItem>
                <SelectItem value="scratch">Scratch/Dent</SelectItem>
                <SelectItem value="cracked">Cracked/Broken Parts</SelectItem>
                <SelectItem value="electrical">Electrical Damage</SelectItem>
                <SelectItem value="fire">Fire/Heat Damage</SelectItem>
                <SelectItem value="other">Other Physical Damage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Affected Area <Badge variant="destructive">Required</Badge></Label>
            <Select defaultValue="display">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="display">Screen/Display</SelectItem>
                <SelectItem value="back">Back Panel/Casing</SelectItem>
                <SelectItem value="camera">Camera Lens</SelectItem>
                <SelectItem value="charging">Charging Port</SelectItem>
                <SelectItem value="buttons">Buttons/Controls</SelectItem>
                <SelectItem value="battery">Battery</SelectItem>
                <SelectItem value="internal">Internal Components</SelectItem>
                <SelectItem value="multiple">Multiple Areas</SelectItem>
                <SelectItem value="entire">Entire Device</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Severity Level <Badge variant="destructive">Required</Badge></Label>
          <Select defaultValue="moderate">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minor">Minor</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="severe">Severe</SelectItem>
              <SelectItem value="total">Total Loss</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Damage Comments <Badge variant="secondary">Optional</Badge></Label>
          <Textarea 
            placeholder="Provide additional details about the damage..." 
            rows={4}
            defaultValue="Large crack across entire screen, touch functionality partially impaired in top-right corner"
          />
          <p className="text-xs text-muted-foreground mt-1">91 / 500 characters</p>
        </div>
      </div>
    </div>
  );

  // Step 4: Damage - Upload Documents
  const renderDamageDocuments = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Upload Documentation</h2>
        <p className="text-muted-foreground">Provide photos of damage and proof of ownership</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label className="flex items-center gap-2 mb-2">
            Damage Photos <Badge variant="destructive">Required</Badge>
          </Label>
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground">JPG, PNG, MP4 (max 5MB per file)</p>
              </div>
            </CardContent>
          </Card>
          
          <div className="mt-2 space-y-2">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-muted/50">
                <CardContent className="py-3 flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">damage_photo_{i}.jpg</p>
                    <p className="text-xs text-muted-foreground">{(2.0 + i * 0.3).toFixed(1)} MB</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <Label className="flex items-center gap-2 mb-2">
            Proof of Ownership <Badge variant="destructive">Required</Badge>
          </Label>
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground">JPG, PNG, PDF (max 5MB per file)</p>
              </div>
            </CardContent>
          </Card>
          
          <div className="mt-2">
            <Card className="bg-muted/50">
              <CardContent className="py-3 flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">receipt.pdf</p>
                  <p className="text-xs text-muted-foreground">1.2 MB</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );

  // Step 4B: Theft - Incident Details
  const renderTheftIncidentDetails = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Incident Details</h2>
        <p className="text-muted-foreground">Provide information about the theft</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Theft Date <Badge variant="destructive">Required</Badge></Label>
            <Input type="date" defaultValue="2024-01-05" />
          </div>
          <div>
            <Label>Theft Time <Badge variant="destructive">Required</Badge></Label>
            <Input type="time" defaultValue="18:45" />
          </div>
        </div>

        <div>
          <Label>Location <Badge variant="destructive">Required</Badge></Label>
          <Input defaultValue="Oxford Street, London" />
        </div>

        <div>
          <Label>Description of Incident <Badge variant="destructive">Required</Badge></Label>
          <Textarea 
            placeholder="Describe what happened (minimum 20 characters)..." 
            rows={4}
            defaultValue="Phone was stolen from my bag while shopping. I noticed it was missing approximately 10 minutes after the theft occurred. CCTV footage available from store."
          />
          <p className="text-xs text-muted-foreground mt-1">155 characters (min 20 required)</p>
        </div>

        <div>
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox id="police" defaultChecked />
            <Label htmlFor="police">Police Notified</Label>
          </div>

          <div className="space-y-4 pl-6 border-l-2">
            <div>
              <Label>Police Report Number <Badge variant="destructive">Required</Badge></Label>
              <Input defaultValue="CR12345/2024" />
            </div>
            <div>
              <Label>Police Authority <Badge variant="destructive">Required</Badge></Label>
              <Input defaultValue="Metropolitan Police" />
            </div>
          </div>
        </div>

        <div>
          <Label>Witness Information <Badge variant="secondary">Optional</Badge></Label>
          <Textarea placeholder="Details of any witnesses..." rows={2} />
        </div>

        <div>
          <Label>Recovery Efforts <Badge variant="destructive">Required</Badge></Label>
          <Textarea 
            placeholder="Describe steps taken to recover the item (minimum 50 characters)..." 
            rows={3}
            defaultValue="Contacted store security immediately, reviewed CCTV footage with security team, reported to police within 2 hours, checked Find My iPhone but device was turned off, contacted nearby pawn shops and second-hand stores"
          />
          <p className="text-xs text-muted-foreground mt-1">195 characters (min 50 required)</p>
        </div>
      </div>
    </div>
  );

  // Step 5: Declaration & Signature
  const renderDeclaration = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Declaration & Signature</h2>
        <p className="text-muted-foreground">Review your claim and provide signature</p>
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-lg">Claim Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Policy Number</p>
              <p className="font-semibold">{foundPolicy?.policy_number || "EW-123456"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-semibold">{foundPolicy?.customer_name || "John Smith"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Claim Type</p>
              <p className="font-semibold capitalize">{claimType || "Not Selected"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Device</p>
              <p className="font-semibold">{foundPolicy?.covered_items?.[0]?.product_name || "N/A"}</p>
            </div>
          </div>
          {claimType === "breakdown" && (
            <div>
              <p className="text-sm text-muted-foreground">Fault Details</p>
              <p className="font-semibold">Hardware Issues - Component Failure (Moderate)</p>
            </div>
          )}
          {claimType === "damage" && (
            <div>
              <p className="text-sm text-muted-foreground">Damage Details</p>
              <p className="font-semibold">Screen Damage - Screen/Display (Moderate)</p>
            </div>
          )}
          {claimType === "theft" && (
            <div>
              <p className="text-sm text-muted-foreground">Incident Details</p>
              <p className="font-semibold">Theft on 2024-01-05 at Oxford Street, London</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Documents Uploaded</p>
            <p className="font-semibold">
              {claimType === "breakdown" && "2 files"}
              {claimType === "damage" && "4 files"}
              {claimType === "theft" && "2 files"}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-start space-x-2">
          <Checkbox id="declaration" defaultChecked />
          <Label htmlFor="declaration" className="text-sm leading-relaxed">
            I declare that the information provided is true and accurate to the best of my knowledge. 
            I understand that providing false information may result in claim rejection and policy cancellation.
          </Label>
        </div>

        <div>
          <Label className="flex items-center gap-2 mb-2">
            Your Full Name (Signature) <Badge variant="destructive">Required</Badge>
          </Label>
          <div className="relative">
            <Input placeholder="Type your full name" defaultValue="John Smith" className="pr-10" />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-5 w-5 text-muted-foreground">✍️</div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            By typing your name, you are providing a legally binding electronic signature
          </p>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          After submission, you cannot edit this claim. Please review all details carefully.
        </AlertDescription>
      </Alert>
    </div>
  );

  // Create claim when reaching decision step
  const createClaim = async () => {
    if (createdClaimId) return; // Already created
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !foundPolicy) return;

      // Get product name and program_id for claim number generation
      const { data: policyData } = await supabase
        .from("policies")
        .select("products(name), program_id")
        .eq("id", foundPolicy.id)
        .single();

      const productName = (policyData as any)?.products?.name || 'Extended Warranty';
      const programId = (policyData as any)?.program_id;

      if (!programId) {
        toast.error("Policy is not associated with a program");
        return;
      }

      // Generate claim number using program format configuration
      const claimNumber = await generateReferenceNumber(programId, 'claim_number', productName);

      const { data: claim, error } = await supabase
        .from("claims")
        .insert([{
          policy_id: foundPolicy.id,
          user_id: foundPolicy.user_id,
          claim_type: claimType as any,
          description: `${claimType} claim for ${deviceCategory}${deviceSubcategory ? ` - ${deviceSubcategory}` : ''}`,
          status: "referred" as any,
          has_receipt: false,
          claim_number: claimNumber,
        }])
        .select()
        .single();

      if (error) throw error;

      if (claim) {
        setCreatedClaimId(claim.id);
        // Simulate decision
        const isAccepted = Math.random() > 0.5;
        const decision = isAccepted ? "accepted" : "referred";
        setClaimDecision(decision);

        // Update claim with decision
        await supabase
          .from("claims")
          .update({
            decision: isAccepted ? "approved" : null,
            status: isAccepted ? "accepted" : "referred",
          })
          .eq("id", claim.id);
      }
    } catch (error: any) {
      console.error("Failed to create claim:", error);
      toast.error("Failed to create claim");
    }
  };

  // Step 6: Decision
  const renderDecision = () => {
    // Create claim when this step is first rendered
    if (!createdClaimId && foundPolicy) {
      createClaim();
    }

    if (!claimDecision) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Processing claim...</p>
          </div>
        </div>
      );
    }

    const isAccepted = claimDecision === "accepted";
    
    const getDecisionReason = () => {
      if (claimType === "breakdown") {
        return "Fault: Hardware Issues - Component Failure (Moderate). All documentation provided and verified, device verified.";
      }
      if (claimType === "damage") {
        return "Damage: Screen Damage affecting Screen/Display (Moderate). All documentation provided and verified, device verified.";
      }
      if (claimType === "theft") {
        return "All theft documentation verified, police report on file.";
      }
      return "";
    };

    return (
      <div className="space-y-6">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold mb-2">Claim Submitted Successfully</h2>
                <p className="text-muted-foreground">Your claim has been processed</p>
              </div>

              <div className="w-full max-w-md space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Claim Number</span>
                  <span className="font-semibold">CLM-2024-0042</span>
                </div>
                 <div className="flex justify-between items-center py-2 border-b">
                   <span className="text-sm text-muted-foreground">Decision</span>
                   <Badge variant={isAccepted ? "default" : "secondary"} className="capitalize">
                     {claimDecision}
                   </Badge>
                 </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant="secondary">Notified</Badge>
                </div>
              </div>

              <Alert className="border-blue-200 bg-blue-50 text-left">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Decision Reason:</strong>
                  <br />
                  {getDecisionReason()}
                </AlertDescription>
              </Alert>

              <div className="w-full bg-muted/50 rounded-lg p-4 text-left">
                <p className="font-semibold mb-2">Next Steps:</p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Customer will be contacted within 24 hours</li>
                  <li>• Email confirmation sent to john.smith@email.com</li>
                  <li>• Claim reference: CLM-2024-0042</li>
                  {isAccepted ? (
                    <li>• Claim approved - proceeding with next steps</li>
                  ) : (
                    <li>• Additional review required - customer will be contacted</li>
                  )}
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                {isAccepted && createdClaimId && (
                  <Button onClick={() => setShowFulfillment(true)}>
                    Proceed to Fulfillment
                  </Button>
                )}
                <Button variant="outline" onClick={() => {
                  setCurrentStep(0);
                  setClaimType("");
                  setFoundPolicy(null);
                  setCreatedClaimId(null);
                  setClaimDecision(null);
                  setShowFulfillment(false);
                }}>
                  Submit Another Claim
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {showFulfillment && isAccepted && createdClaimId && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Claim Fulfillment</CardTitle>
              <CardDescription>Process the approved claim fulfillment</CardDescription>
            </CardHeader>
            <CardContent>
              <ClaimFulfillmentFlow
                claimId={createdClaimId}
                claimType={claimType}
                deviceCategory={deviceSubcategory || deviceCategory}
                policyId={foundPolicy?.id || ""}
                onComplete={() => {
                  toast.success("Claim fulfillment completed");
                  setCurrentStep(0);
                  setClaimType("");
                  setFoundPolicy(null);
                  setCreatedClaimId(null);
                  setClaimDecision(null);
                  setShowFulfillment(false);
                }}
              />
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderCurrentStep = () => {
    if (currentStep === 0) return renderPolicySearch();
    if (currentStep === 1) return renderClaimTypeSelection();

    // Dynamic steps based on claim type
    if (claimType === "breakdown") {
      if (currentStep === 2) return renderBreakdownFaultDetails();
      if (currentStep === 3) return renderBreakdownDocuments();
      if (currentStep === 4) return renderDeclaration();
      if (currentStep === 5) return renderDecision();
    }

    if (claimType === "damage") {
      if (currentStep === 2) return renderDamageIncidentInfo();
      if (currentStep === 3) return renderDamageFaultMatrix();
      if (currentStep === 4) return renderDamageDocuments();
      if (currentStep === 5) return renderDeclaration();
      if (currentStep === 6) return renderDecision();
    }

    if (claimType === "theft") {
      if (currentStep === 2) return renderTheftItemDetails();
      if (currentStep === 3) return renderTheftIncidentDetails();
      if (currentStep === 4) return renderDeclaration();
      if (currentStep === 5) return renderDecision();
    }

    return <div>Select a claim type to continue</div>;
  };

  const canContinue = () => {
    if (currentStep === 0) return !!foundPolicy;
    if (currentStep === 1) return claimType !== "";
    if (currentStep === totalSteps - 1) return false; // Last step (decision)
    return true;
  };

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Make a Claim (Prototype)</CardTitle>
          <CardDescription>
            Static prototype - demonstrating layout and flow only
          </CardDescription>
          <div className="pt-4 space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {totalSteps}: {getStepLabel(currentStep)}
            </p>
          </div>
        </CardHeader>

        <CardContent className="min-h-[400px]">
          {renderCurrentStep()}
        </CardContent>

        <CardFooter className="flex justify-between border-t pt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <Button
            onClick={() => setCurrentStep(Math.min(totalSteps - 1, currentStep + 1))}
            disabled={!canContinue()}
          >
            {currentStep === totalSteps - 1 ? "Finish" : "Continue"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
