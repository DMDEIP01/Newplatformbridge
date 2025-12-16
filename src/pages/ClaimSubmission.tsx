import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle, XCircle, Upload, FileText, Image, Signature, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import BreakdownStep2Device from "@/components/claim/BreakdownStep2Device";
import BreakdownStep3Photos from "@/components/claim/BreakdownStep3Photos";
import BreakdownStep4FaultDetails from "@/components/claim/BreakdownStep4FaultDetails";
import BreakdownStep5Documents from "@/components/claim/BreakdownStep5Documents";
import ClaimFulfillmentFlow from "@/components/ClaimFulfillmentFlow";
import { faultCategories, specificIssuesByCategory, severityLevels } from "@/lib/faultConfig";

type ClaimType = "breakdown" | "damage" | "theft" | "";
type ClaimDecision = "accepted" | "rejected" | "referred" | "";

interface Policy {
  id: string;
  policy_number: string;
  start_date?: string;
  products: {
    name: string;
    type: string;
    coverage: string[];
    perils: string[] | null;
  };
}

interface CoveredDevice {
  product_name: string;
  model: string;
  serial_number: string;
  purchase_price: number | null;
  purchase_date: string | null;
  added_date: string | null;
}

export default function ClaimSubmission() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(0);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [claimType, setClaimType] = useState<ClaimType>("");
  const [submittedClaimId, setSubmittedClaimId] = useState<string | null>(null);
  
  // Insured device from policy
  const [insuredDevice, setInsuredDevice] = useState<CoveredDevice | null>(null);
  
  // Claimed device details (what user says they're claiming for)
  const [claimedDeviceName, setClaimedDeviceName] = useState("");
  const [claimedDeviceModel, setClaimedDeviceModel] = useState("");
  const [claimedDeviceSerial, setClaimedDeviceSerial] = useState("");
  
  // Step 2: Reason for Claim (Extended Warranty - Breakdown)
  const [description, setDescription] = useState("");
  const [problemDate, setProblemDate] = useState("");
  const [issueFrequency, setIssueFrequency] = useState<"intermittent" | "constant" | "">("");
  const [previousRepairs, setPreviousRepairs] = useState("");
  
  // Fault Matrix for Breakdown Claims
  const [faultCategory, setFaultCategory] = useState("");
  const [specificIssue, setSpecificIssue] = useState("");
  const [severityLevel, setSeverityLevel] = useState("");
  const [additionalComments, setAdditionalComments] = useState("");
  
  // Step 3: Incident Information (Accidental Damage)
  const [incidentDate, setIncidentDate] = useState("");
  const [incidentTime, setIncidentTime] = useState("");
  const [incidentDescription, setIncidentDescription] = useState("");
  
  // Step 4: Extent of Damage (Accidental Damage)
  const [damageDescription, setDamageDescription] = useState("");
  
  // Fault Matrix for Damage Claims
  const [damageType, setDamageType] = useState("");
  const [damageArea, setDamageArea] = useState("");
  const [damageSeverity, setDamageSeverity] = useState("");
  const [damageComments, setDamageComments] = useState("");
  const [damagePhotos, setDamagePhotos] = useState<File[]>([]);
  
  // Step 5: Supporting Documentation
  const [defectPhotos, setDefectPhotos] = useState<File[]>([]);
  const [supportingDocuments, setSupportingDocuments] = useState<File[]>([]);
  const [proofOfOwnership, setProofOfOwnership] = useState<File[]>([]);
  
  // AI Analysis states
  const [analyzingDamage, setAnalyzingDamage] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiPopulatedFields, setAiPopulatedFields] = useState<Set<string>>(new Set());
  const [aiGeneratedSeverity, setAiGeneratedSeverity] = useState<string | null>(null);
  const [deviceMismatchWarning, setDeviceMismatchWarning] = useState<string | null>(null);
  const [physicalDamageWarning, setPhysicalDamageWarning] = useState<string | null>(null);
  const [deviceAnalysisOpen, setDeviceAnalysisOpen] = useState(false); // Start collapsed
  const [physicalDamageOpen, setPhysicalDamageOpen] = useState(false); // Start collapsed
  
  // Manufacturer warranty tracking
  const [manufacturerWarrantyMonths, setManufacturerWarrantyMonths] = useState(12);
  const [isWithinManufacturerWarranty, setIsWithinManufacturerWarranty] = useState(false);
  
  // Fetch manufacturer warranty period from database
  const fetchManufacturerWarranty = async (deviceCategory: string, deviceModel?: string) => {
    try {
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
      return 12;
    }
  };
  
  // Check if incident date is within manufacturer warranty
  const checkManufacturerWarranty = (incidentDateStr: string, purchaseDate: string | null) => {
    if (!purchaseDate || !incidentDateStr) return false;
    const purchase = new Date(purchaseDate);
    const incident = new Date(incidentDateStr);
    const warrantyEnd = new Date(purchase);
    warrantyEnd.setMonth(warrantyEnd.getMonth() + manufacturerWarrantyMonths);
    return incident < warrantyEnd;
  };
  
  // Theft/Loss Claim - Step 3: Item Details
  const [deviceInfoConfirmed, setDeviceInfoConfirmed] = useState<"" | "correct" | "incorrect">("");
  const [itemCategory, setItemCategory] = useState("");
  const [itemMake, setItemMake] = useState("");
  const [itemModel, setItemModel] = useState("");
  const [itemModelOther, setItemModelOther] = useState(""); // For custom model entry
  const [itemSerialNumber, setItemSerialNumber] = useState("");
  const [itemColor, setItemColor] = useState("");
  const [itemColorOther, setItemColorOther] = useState(""); // For custom color/screen size entry
  const [itemFeatures, setItemFeatures] = useState("");
  const [itemPurchasePrice, setItemPurchasePrice] = useState(""); // Retail value
  const [itemPhotos, setItemPhotos] = useState<File[]>([]);
  const [itemOwnershipDocs, setItemOwnershipDocs] = useState<File[]>([]);
  
  // Theft/Loss Claim - Step 4: Incident Details
  const [theftDate, setTheftDate] = useState("");
  const [theftTime, setTheftTime] = useState("");
  const [theftLocation, setTheftLocation] = useState("");
  const [theftDescription, setTheftDescription] = useState("");
  const [policeNotified, setPoliceNotified] = useState(false);
  const [policeReportNumber, setPoliceReportNumber] = useState("");
  const [policeAuthority, setPoliceAuthority] = useState("");
  const [witnessInfo, setWitnessInfo] = useState("");
  
  // Theft/Loss Claim - Step 5: Recovery Efforts
  const [recoveryEfforts, setRecoveryEfforts] = useState("");
  
  // Theft/Loss Claim - Step 6: Supporting Documentation
  const [policeReport, setPoliceReport] = useState<File[]>([]);
  const [theftItemPhotos, setTheftItemPhotos] = useState<File[]>([]);
  const [theftOwnershipProof, setTheftOwnershipProof] = useState<File[]>([]);
  const [otherEvidence, setOtherEvidence] = useState<File[]>([]);
  
  // Declarations & Signature
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  
  const [uploading, setUploading] = useState(false);
  const [decision, setDecision] = useState<ClaimDecision>("");

  // Get total steps based on claim type
  const getTotalSteps = () => {
    if (claimType === "breakdown") return 7; // Policy, Type, Device, Photos, Fault Details, Docs, Decision
    if (claimType === "damage") return 8; // Policy, Type, Photo Upload, Incident, Damage, Docs, Signature, Decision
    if (claimType === "theft") return 6; // Policy, Type, Item Details, Incident, Signature, Decision
    return 7; // Default
  };

  const getStepLabel = (stepIndex: number) => {
    if (claimType === "breakdown") {
      const labels = ["Policy", "Type", "Device", "Photos", "Fault", "Docs", "Complete"];
      return labels[stepIndex] || "";
    }
    if (claimType === "damage") {
      const labels = ["Policy", "Type", "Photos", "Incident", "Damage", "Docs", "Sign", "Decision"];
      return labels[stepIndex] || "";
    }
    if (claimType === "theft") {
      const labels = ["Policy", "Type", "Item", "Incident", "Signature", "Decision"];
      return labels[stepIndex] || "";
    }
    // Default for breakdown
    const labels = ["Policy", "Type", "Device", "Photos", "Fault", "Docs", "Complete"];
    return labels[stepIndex] || "";
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("policies")
        .select(`
          id,
          policy_number,
          start_date,
          products (
            name,
            type,
            coverage,
            perils
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "active");

      if (error) throw error;
      setPolicies(data || []);
      
      // Check if a policy was pre-selected from navigation state
      const preSelectedPolicyId = location.state?.policyId;
      if (preSelectedPolicyId && data?.some(p => p.id === preSelectedPolicyId)) {
        setSelectedPolicy(preSelectedPolicyId);
        fetchInsuredDevice(preSelectedPolicyId);
        setStep(1); // Skip to claim type selection
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

  const getSelectedPolicyData = () => {
    return policies.find(p => p.id === selectedPolicy);
  };

  const fetchInsuredDevice = async (policyId: string) => {
    try {
      const { data, error } = await supabase
        .from("covered_items")
        .select("product_name, model, serial_number, purchase_price, purchase_date, added_date")
        .eq("policy_id", policyId)
        .maybeSingle();

      if (error) throw error;
      setInsuredDevice(data);
      
      // Fetch manufacturer warranty based on device info
      if (data?.product_name) {
        fetchManufacturerWarranty(data.product_name, data.model || undefined);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching insured device:", error);
      }
      toast.error("Failed to load insured device details");
    }
  };

  const validateDeviceMatch = (): { matches: boolean; reason: string } => {
    if (!insuredDevice) {
      return { matches: false, reason: "No insured device found on policy" };
    }

    const mismatches: string[] = [];

    if (claimedDeviceName.toLowerCase().trim() !== insuredDevice.product_name.toLowerCase().trim()) {
      mismatches.push("Device name mismatch");
    }

    if (claimedDeviceModel.toLowerCase().trim() !== insuredDevice.model.toLowerCase().trim()) {
      mismatches.push("Model mismatch");
    }

    if (claimedDeviceSerial.trim() && insuredDevice.serial_number.trim() && 
        claimedDeviceSerial.toLowerCase().trim() !== insuredDevice.serial_number.toLowerCase().trim()) {
      mismatches.push("Serial number mismatch");
    }

    if (mismatches.length > 0) {
      return { 
        matches: false, 
        reason: `Device verification failed: ${mismatches.join(", ")}. Claimed device does not match insured device on policy.`
      };
    }

    return { matches: true, reason: "Device verified successfully" };
  };

  const isClaimTypeAllowed = (type: ClaimType) => {
    const policy = getSelectedPolicyData();
    if (!policy || !type) return false;

    const perils = policy.products.perils || [];
    const perilsLower = perils.map(p => p.toLowerCase());
    
    // Check perils first if available
    if (perils.length > 0) {
      if (type === "breakdown") {
        return perilsLower.some(p => 
          p.includes("breakdown") || 
          p.includes("malfunction") ||
          p.includes("mechanical") ||
          p.includes("electrical") ||
          p.includes("extended warranty") ||
          p.includes("warranty")
        );
      }
      if (type === "damage") {
        return perilsLower.some(p => 
          p.includes("accidental damage") || 
          p.includes("screen damage") ||
          p.includes("water") ||
          p.includes("liquid") ||
          p.includes("damage")
        );
      }
      if (type === "theft") {
        return perilsLower.some(p => 
          p.includes("theft") || 
          p.includes("loss") ||
          p.includes("stolen")
        );
      }
      return false;
    }
    
    // Fallback to product type logic if no perils defined
    const productType = policy.products.type;
    
    if (productType === "extended_warranty") {
      return type === "breakdown";
    }
    
    if (productType === "insurance_lite") {
      return type === "damage";
    }
    
    if (productType === "insurance_max") {
      return true;
    }
    
    return false;
  };

  const handleSubmit = async () => {
    // Validate claim type is allowed for policy
    if (!isClaimTypeAllowed(claimType)) {
      toast.error("This claim type is not covered by your selected policy");
      return;
    }

    // Validate based on claim type
    if (claimType === "breakdown") {
      // Validate fault matrix fields
      if (!faultCategory || !specificIssue) {
        toast.error("Please complete all fault details (category and issue)");
        return;
      }

      if (!problemDate || !issueFrequency) {
        toast.error("Please provide problem date and frequency");
        return;
      }

      // Validate mandatory photos for breakdown
      if (defectPhotos.length === 0) {
        toast.error("Please upload at least one photo showing the defect");
        return;
      }

      // Validate device info confirmation
      if (insuredDevice && !deviceInfoConfirmed) {
        toast.error("Please confirm if the device information is correct");
        return;
      }

      // Only validate dropdowns if no insured device OR user said device info is incorrect
      if (!insuredDevice || deviceInfoConfirmed === "incorrect") {
        if (!itemCategory || !itemMake || !itemModel || !itemColor || !itemPurchasePrice) {
          toast.error("Please provide complete device details (category, make, model, color, purchase price)");
          return;
        }
        if (itemModel === "Other" && !itemModelOther) {
          toast.error("Please enter the model name");
          return;
        }
      }
    } else if (claimType === "damage") {
      // Validate incident information
      if (!incidentDate || !incidentTime) {
        toast.error("Please provide incident date and time");
        return;
      }

      // Validate damage fault matrix
      if (!damageType || !damageArea) {
        toast.error("Please complete all damage details (type and area)");
        return;
      }

      // Validate mandatory photos for damage
      if (damagePhotos.length === 0) {
        toast.error("Please upload at least one photo showing the damage");
        return;
      }

      // Validate proof of ownership
      if (proofOfOwnership.length === 0) {
        toast.error("Please upload proof of ownership (receipt or invoice)");
        return;
      }

      // Validate terms agreement
      if (!agreeToTerms) {
        toast.error("You must agree to the terms");
        return;
      }

      // Validate device info confirmation
      if (insuredDevice && !deviceInfoConfirmed) {
        toast.error("Please confirm if the device information is correct");
        return;
      }

      // Only validate dropdowns if no insured device OR user said device info is incorrect
      if (!insuredDevice || deviceInfoConfirmed === "incorrect") {
        if (!itemCategory || !itemMake || !itemModel || !itemColor || !itemPurchasePrice) {
          toast.error("Please provide complete device details (category, make, model, color, purchase price)");
          return;
        }
        if (itemModel === "Other" && !itemModelOther) {
          toast.error("Please enter the model name");
          return;
        }
      }
    } else if (claimType === "theft") {
      // Validate device info confirmation
      if (insuredDevice && !deviceInfoConfirmed) {
        toast.error("Please confirm if the device information is correct");
        return;
      }

      // Only validate dropdowns if no insured device OR user said device info is incorrect
      if (!insuredDevice || deviceInfoConfirmed === "incorrect") {
        if (!itemCategory || !itemMake || !itemModel || !itemColor || !itemPurchasePrice) {
          toast.error("Please provide complete item details (category, make, model, color, purchase price)");
          return;
        }
        if (itemModel === "Other" && !itemModelOther) {
          toast.error("Please enter the model name");
          return;
        }
      }
      
      // Validate mandatory item photos
      if (itemPhotos.length === 0) {
        toast.error("Please upload at least one photo of the item");
        return;
      }
      
      // Validate mandatory item ownership docs
      if (itemOwnershipDocs.length === 0) {
        toast.error("Please upload proof of ownership (receipt or invoice)");
        return;
      }
      
      // Validate incident details
      if (!theftDate || !theftTime || !theftLocation) {
        toast.error("Please provide complete incident details");
        return;
      }
      
      if (!theftDescription || theftDescription.length < 20) {
        toast.error("Please provide a detailed description of the incident (at least 20 characters)");
        return;
      }
      
      // Validate police notification details
      if (policeNotified && (!policeReportNumber || !policeAuthority)) {
        toast.error("Please provide police report number and authority contact details");
        return;
      }
      
      // Validate recovery efforts
      if (!recoveryEfforts || recoveryEfforts.length < 50) {
        toast.error("Please describe recovery efforts in detail (at least 50 characters)");
        return;
      }
      
      // Validate mandatory documents
      if (policeNotified && policeReport.length === 0) {
        toast.error("Please upload the police report");
        return;
      }
      
      if (theftItemPhotos.length === 0) {
        toast.error("Please upload at least one photo of the stolen/lost item");
        return;
      }
      
      if (theftOwnershipProof.length === 0) {
        toast.error("Please upload proof of ownership");
        return;
      }
      
      // Validate terms agreement
      if (!agreeToTerms) {
        toast.error("You must agree to the terms");
        return;
      }
      
      if (!signatureName) {
        toast.error("Please provide your signature");
        return;
      }

      // Validate device matches insured device
      if (!claimedDeviceName || !claimedDeviceModel) {
        toast.error("Please provide claimed device details");
        return;
      }
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to submit a claim");
        return;
      }

      // Upload all files based on claim type
      const uploadedFiles: string[] = [];
      let allFiles: File[] = [];
      
      if (claimType === "breakdown") {
        allFiles = [...defectPhotos, ...proofOfOwnership, ...supportingDocuments];
      } else if (claimType === "damage") {
        allFiles = [...damagePhotos, ...proofOfOwnership];
      } else if (claimType === "theft") {
        allFiles = [...itemPhotos, ...itemOwnershipDocs, ...policeReport, ...theftItemPhotos, ...theftOwnershipProof, ...otherEvidence];
      }
      
      for (const file of allFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('claim-receipts')
          .upload(fileName, file);

        if (uploadError) {
          if (import.meta.env.DEV) {
            console.error("Upload error:", uploadError);
          }
          toast.error(`Failed to upload ${file.name}`);
          return;
        }

        uploadedFiles.push(fileName);
      }

      // Verify all files were uploaded
      if (uploadedFiles.length !== allFiles.length) {
        console.error(`File upload mismatch: expected ${allFiles.length}, got ${uploadedFiles.length}`);
        toast.error(`Only ${uploadedFiles.length} of ${allFiles.length} files were uploaded. Please try again.`);
        return;
      }
      
      console.log(`Successfully uploaded ${uploadedFiles.length} files:`, allFiles.map(f => f.name));

      // Validate device match
      const deviceValidation = validateDeviceMatch();
      
      // Simple decision logic with device validation
      let claimDecision: ClaimDecision = "accepted";
      let decisionReason = "";
      
      // First check device validation for all claim types
      if (!deviceValidation.matches) {
        claimDecision = "referred";
        decisionReason = deviceValidation.reason;
      } else if (claimType === "breakdown") {
        // Check manufacturer warranty for breakdown claims - use purchase_date, fall back to added_date
        const effectivePurchaseDate = insuredDevice?.purchase_date || insuredDevice?.added_date || null;
        const withinWarranty = checkManufacturerWarranty(problemDate, effectivePurchaseDate);
        
        if (withinWarranty) {
          claimDecision = "rejected";
          decisionReason = `Device is still within the manufacturer's ${manufacturerWarrantyMonths}-month warranty period. Please contact the manufacturer for warranty support before submitting an extended warranty claim.`;
        } else if (defectPhotos.length === 0) {
          claimDecision = "referred";
          decisionReason = "Claim requires supporting documentation - photos of defect needed";
        } else {
          claimDecision = "accepted";
          decisionReason = `Fault: ${faultCategory} - ${specificIssue} (${severityLevel}). All documentation provided and verified, device verified`;
        }
      } else if (claimType === "damage") {
        if (damagePhotos.length === 0 || proofOfOwnership.length === 0) {
          claimDecision = "referred";
          decisionReason = "Claim requires complete documentation";
        } else {
          claimDecision = "accepted";
          decisionReason = `Damage: ${damageType} affecting ${damageArea} (${damageSeverity}). All required documentation provided and verified, device verified`;
        }
      } else if (claimType === "theft") {
        if (!policeNotified) {
          claimDecision = "referred";
          decisionReason = "Theft claims require police notification and report";
        } else if (policeReport.length === 0 || theftItemPhotos.length === 0 || theftOwnershipProof.length === 0) {
          claimDecision = "referred";
          decisionReason = "Claim requires complete documentation";
        } else {
          claimDecision = "accepted";
          decisionReason = "All documentation provided and verified, device verified";
        }
      }

      // Generate claim number
      const claimNumber = `CLM-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Create claim description based on type with device details
      let claimDescription = "";
      
      // Get device info - prefer user-entered details, fallback to claimed device
      const deviceCategory = itemCategory || claimedDeviceName;
      const deviceMake = itemMake || "";
      const deviceModel = itemModel === "Other" ? itemModelOther : (itemModel || claimedDeviceModel);
      const deviceColor = itemColor || "";
      const deviceSerial = itemSerialNumber || claimedDeviceSerial;
      const devicePurchasePrice = itemPurchasePrice || "";
      
      if (claimType === "breakdown") {
        claimDescription = `Device Category: ${deviceCategory}\nMake/Brand: ${deviceMake}\nModel: ${deviceModel}\nColor: ${deviceColor}\nSerial Number: ${deviceSerial || 'Not provided'}\nPurchase Price: ${devicePurchasePrice ? `€${devicePurchasePrice}` : 'Not provided'}\nProblem Date: ${problemDate}\nFrequency: ${issueFrequency}\nFault Category: ${faultCategory}\nSpecific Issue: ${specificIssue}\nSeverity: ${severityLevel}\n${additionalComments ? `Additional Comments: ${additionalComments}\n` : ''}Previous Repairs: ${previousRepairs || 'None'}`;
      } else if (claimType === "damage") {
        claimDescription = `Device Category: ${deviceCategory}\nMake/Brand: ${deviceMake}\nModel: ${deviceModel}\nColor: ${deviceColor}\nSerial Number: ${deviceSerial || 'Not provided'}\nPurchase Price: ${devicePurchasePrice ? `€${devicePurchasePrice}` : 'Not provided'}\nIncident Date: ${incidentDate} ${incidentTime}\nDamage Type: ${damageType}\nAffected Area: ${damageArea}\nSeverity: ${damageSeverity}\n${damageComments ? `Additional Comments: ${damageComments}` : ''}`;
      } else if (claimType === "theft") {
        claimDescription = `Device Category: ${deviceCategory}\nMake/Brand: ${deviceMake}\nModel: ${deviceModel}\nColor: ${deviceColor}\nSerial Number: ${deviceSerial || 'Not provided'}\nPurchase Price: ${devicePurchasePrice ? `€${devicePurchasePrice}` : 'Not provided'}\nFeatures: ${itemFeatures || 'None specified'}\nTheft Date: ${theftDate} ${theftTime}\nLocation: ${theftLocation}\nIncident: ${theftDescription}\nPolice Notified: ${policeNotified ? 'Yes' : 'No'}\nPolice Report: ${policeReportNumber || 'N/A'}\nRecovery Efforts: ${recoveryEfforts}`;
      }

      // Create claim record - status should match decision for referred claims
      let claimStatus: "notified" | "rejected" | "referred";
      if (claimDecision === "accepted") {
        claimStatus = "notified";
      } else if (claimDecision === "referred") {
        claimStatus = "referred";
      } else {
        claimStatus = "rejected";
      }
      
      // Add AI severity to description if different from user selection
      if (aiGeneratedSeverity) {
        const userSeverity = claimType === "breakdown" ? severityLevel : damageSeverity;
        if (userSeverity && aiGeneratedSeverity !== userSeverity) {
          claimDescription += `\nAI Suggested Severity: ${aiGeneratedSeverity}`;
        }
      }

      // If user updated device details, update the policy's covered_items
      if (deviceInfoConfirmed === "incorrect" && (itemCategory || itemMake || itemModel || itemPurchasePrice || itemSerialNumber)) {
        const finalModel = itemModel === "Other" ? itemModelOther : itemModel;
        const productName = itemCategory ? `${itemMake} ${itemCategory}`.trim() : (itemMake || claimedDeviceName);
        
        const { error: updateError } = await supabase
          .from('covered_items')
          .update({
            product_name: productName,
            model: finalModel || claimedDeviceModel,
            serial_number: itemSerialNumber || '',
            purchase_price: itemPurchasePrice ? parseFloat(itemPurchasePrice) : null
          })
          .eq('policy_id', selectedPolicy);
        
        if (updateError) {
          console.error('Failed to update covered_items:', updateError);
          // Don't block claim submission, just log the error
        } else {
          console.log('Updated covered_items with new device details');
        }
      }

      const { data: claimData, error: claimError } = await supabase
        .from('claims')
        .insert([{
          user_id: user.id,
          policy_id: selectedPolicy,
          claim_number: claimNumber,
          claim_type: claimType,
          description: claimDescription,
          product_condition: claimType === "breakdown" && issueFrequency === "constant" ? "severe" : "moderate",
          has_receipt: uploadedFiles.length > 0,
          status: claimStatus,
          decision: claimDecision,
          decision_reason: decisionReason || null,
        }] as any)
        .select()
        .single();

      if (claimError) {
        if (import.meta.env.DEV) {
          console.error("Claim error:", claimError);
        }
        toast.error("Failed to submit claim");
        return;
      }

      // Save document records for all uploaded files with AI analysis metadata
      if (uploadedFiles.length > 0 && claimData) {
        const documentInserts = await Promise.all(allFiles.map(async (file, index) => {
          let docType: 'photo' | 'receipt' | 'other' = 'other';
          let docSubtype: 'receipt' | 'other' = 'other';
          let metadata: any = {};
          
          if (claimType === "breakdown") {
            if (defectPhotos.includes(file)) {
              docType = 'photo';
              docSubtype = 'other';
              // If this is the first photo, capture AI analysis results
              if (defectPhotos[0] === file && aiSuggestion) {
                metadata.ai_analysis = {
                  assessment: aiSuggestion,
                  severityLevel: aiGeneratedSeverity || severityLevel,
                  deviceCategory: itemCategory,
                  deviceMismatch: !!deviceMismatchWarning,
                  mismatchWarning: deviceMismatchWarning,
                  hasVisiblePhysicalDamage: !!physicalDamageWarning,
                  physicalDamageDescription: physicalDamageWarning,
                  timestamp: new Date().toISOString()
                };
              }
            } else if (proofOfOwnership.includes(file) || supportingDocuments.includes(file)) {
              docType = 'receipt';
              docSubtype = 'receipt';
            }
          } else if (claimType === "damage") {
            if (damagePhotos.includes(file)) {
              docType = 'photo';
              docSubtype = 'other';
              // If this is the first photo, capture AI analysis results
              if (damagePhotos[0] === file && aiSuggestion) {
                metadata.ai_analysis = {
                  assessment: aiSuggestion,
                  severityLevel: aiGeneratedSeverity || damageSeverity,
                  damageType: damageType,
                  deviceCategory: itemCategory,
                  deviceMismatch: !!deviceMismatchWarning,
                  mismatchWarning: deviceMismatchWarning,
                  hasVisiblePhysicalDamage: !!physicalDamageWarning,
                  physicalDamageDescription: physicalDamageWarning,
                  timestamp: new Date().toISOString()
                };
              }
            } else if (proofOfOwnership.includes(file)) {
              docType = 'receipt';
              docSubtype = 'receipt';
            }
          } else if (claimType === "theft") {
            if (itemPhotos.includes(file) || theftItemPhotos.includes(file)) {
              docType = 'photo';
              docSubtype = 'other';
            } else if (itemOwnershipDocs.includes(file) || theftOwnershipProof.includes(file) || policeReport.includes(file)) {
              docType = 'receipt';
              docSubtype = 'receipt';
            } else if (otherEvidence.includes(file)) {
              docType = 'other';
              docSubtype = 'other';
            }
          }
          
          return {
            user_id: user.id,
            claim_id: claimData.id,
            document_type: docType,
            document_subtype: docSubtype,
            file_name: file.name,
            file_path: uploadedFiles[index],
            file_size: file.size,
            metadata: Object.keys(metadata).length > 0 ? metadata : {}
          };
        }));
        
        console.log(`Inserting ${documentInserts.length} documents for claim ${claimData.id}:`, documentInserts.map(d => ({ type: d.document_type, subtype: d.document_subtype, name: d.file_name })));
        
        const { error: docInsertError } = await supabase.from('documents').insert(documentInserts);
        
        if (docInsertError) {
          console.error('Error inserting documents:', docInsertError);
          toast.error('Warning: Some documents may not have been saved');
        } else {
          console.log('All documents inserted successfully');
        }
      }

      setSubmittedClaimId(claimData.id);
      setDecision(claimDecision);
      setStep(getTotalSteps() - 1);
      toast.success("Claim submitted successfully");

      // Send claim notification email
      try {
        // Get the 'notified' template
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
              policyId: selectedPolicy,
              claimId: claimData.id,
              templateId: template.id,
              status: 'notified'
            }
          });
          console.log('Claim notification email sent');
        }
      } catch (emailError) {
        console.error('Failed to send claim notification email:', emailError);
        // Don't show error to user - claim was still submitted successfully
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error submitting claim:", error);
      }
      toast.error("An error occurred while submitting your claim");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photos' | 'documents' | 'damage' | 'ownership' | 'item-photos' | 'item-ownership' | 'police-report' | 'theft-photos' | 'theft-ownership' | 'theft-evidence') => {
    const files = Array.from(e.target.files || []);
    
    for (const file of files) {
      // Validate file type - police report must be PDF only
      if (type === 'police-report') {
        if (file.type !== 'application/pdf') {
          toast.error("Police report must be in PDF format.");
          return;
        }
      } else {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
          toast.error("Invalid file type. Please upload JPG, PNG, or PDF files only.");
          return;
        }
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File too large. Maximum size is 5MB.");
        return;
      }
    }
    
    if (type === 'photos') {
      setDefectPhotos(prev => [...prev, ...files]);
      // AI analysis for breakdown photos
      if (files.length > 0 && files[0].type.startsWith('image/')) {
        await analyzeImage(files[0], 'breakdown');
      }
    } else if (type === 'documents') {
      setSupportingDocuments(prev => [...prev, ...files]);
    } else if (type === 'damage') {
      setDamagePhotos(prev => [...prev, ...files]);
      // AI analysis for damage photos
      if (files.length > 0 && files[0].type.startsWith('image/')) {
        await analyzeImage(files[0], 'damage');
      }
    } else if (type === 'ownership') {
      setProofOfOwnership(prev => [...prev, ...files]);
    } else if (type === 'item-photos') {
      setItemPhotos(prev => [...prev, ...files]);
    } else if (type === 'item-ownership') {
      setItemOwnershipDocs(prev => [...prev, ...files]);
    } else if (type === 'police-report') {
      setPoliceReport(prev => [...prev, ...files]);
    } else if (type === 'theft-photos') {
      setTheftItemPhotos(prev => [...prev, ...files]);
    } else if (type === 'theft-ownership') {
      setTheftOwnershipProof(prev => [...prev, ...files]);
    } else if (type === 'theft-evidence') {
      setOtherEvidence(prev => [...prev, ...files]);
    }
  };

  const analyzeImage = async (file: File, claimTypeContext: 'breakdown' | 'damage') => {
    setAnalyzingDamage(true);
    setAiSuggestion(null);
    setDeviceMismatchWarning(null);
    
    try {
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          
          // Map product name to standard category for comparison
          let insuredCategory = "";
          if (insuredDevice?.product_name) {
            const productName = insuredDevice.product_name.toLowerCase();
            if (productName.includes("phone") || productName.includes("smartphone")) {
              insuredCategory = "Smartphone";
            } else if (productName.includes("tablet") || productName.includes("ipad")) {
              insuredCategory = "Tablet";
            } else if (productName.includes("laptop") || productName.includes("notebook")) {
              insuredCategory = "Laptop";
            } else if (productName.includes("desktop") || productName.includes("pc")) {
              insuredCategory = "Desktop Computer";
            } else if (productName.includes("watch")) {
              insuredCategory = "Smart Watch";
            } else if (productName.includes("headphone") || productName.includes("earphone") || productName.includes("earbud")) {
              insuredCategory = "Headphones";
            } else if (productName.includes("camera")) {
              insuredCategory = "Camera";
            } else if (productName.includes("console") || productName.includes("playstation") || productName.includes("xbox")) {
              insuredCategory = "Gaming Console";
            } else if (productName.includes("tv") || productName.includes("television")) {
              insuredCategory = "Smart TV";
            } else if (productName.includes("appliance") || productName.includes("fridge") || productName.includes("washer") || productName.includes("dryer")) {
              insuredCategory = "Home Appliance";
            }
          }
          
          const { data, error } = await supabase.functions.invoke('analyze-device', {
            body: { 
              imageBase64: base64,
              insuredDeviceCategory: insuredCategory
            }
          });

          if (error) {
            console.error('AI analysis error:', error);
            toast.error('Could not analyze device. Please fill in details manually.');
          } else if (data) {
            // Check for device mismatch
            if (data.deviceMismatch && data.mismatchWarning) {
              setDeviceMismatchWarning(data.mismatchWarning);
              toast.warning(data.mismatchWarning, {
                duration: 10000,
                action: {
                  label: "Continue Anyway",
                  onClick: () => {
                    console.log("User acknowledged device mismatch");
                  }
                }
              });
            } else {
              setDeviceMismatchWarning(null);
            }

            // Check for physical damage in extended warranty claims
            const policy = getSelectedPolicyData();
            const isExtendedWarranty = policy?.products?.type === "extended_warranty";
            const isBreakdownClaim = claimType === "breakdown";
            
            if (data.hasVisiblePhysicalDamage && data.physicalDamageDescription && isExtendedWarranty && isBreakdownClaim) {
              const damageWarning = `Physical damage detected: ${data.physicalDamageDescription}. Extended Warranty does not cover physical damage - only mechanical/electrical breakdowns.`;
              setPhysicalDamageWarning(damageWarning);
              toast.error("Physical damage detected - Extended Warranty may not cover this", {
                duration: 10000,
              });
            } else {
              setPhysicalDamageWarning(null);
            }
            
            // Auto-populate device fields and count matches
            const fieldsPopulated = new Set<string>();
            let deviceMatchCount = 0;
            
            if (data.deviceCategory && data.deviceCategory !== "Other" && data.deviceCategory !== "Unknown") {
              setItemCategory(data.deviceCategory);
              if (!claimedDeviceName) {
                setClaimedDeviceName(data.deviceCategory);
              }
              fieldsPopulated.add('category');
              deviceMatchCount++;
            }
            
            if (data.brand && data.brand !== "Unknown") {
              setItemMake(data.brand);
              fieldsPopulated.add('brand');
              deviceMatchCount++;
            }
            
            if (data.model && data.model !== "Unknown") {
              setItemModel(data.model);
              if (!claimedDeviceModel) {
                setClaimedDeviceModel(data.model);
              }
              fieldsPopulated.add('model');
              deviceMatchCount++;
            }
            
            if (data.color && data.color !== "Unknown") {
              setItemColor(data.color);
              fieldsPopulated.add('color');
              deviceMatchCount++;
            }
            
            // Auto-populate fault matrix fields
            if (data.faultCategory) {
              setFaultCategory(data.faultCategory);
              fieldsPopulated.add('fault category');
            }
            
            if (data.specificIssue) {
              setSpecificIssue(data.specificIssue);
              fieldsPopulated.add('specific issue');
            }
            
            if (data.severityLevel) {
              setAiGeneratedSeverity(data.severityLevel);
              if (claimTypeContext === 'breakdown') {
                setSeverityLevel(data.severityLevel);
              } else {
                setDamageSeverity(data.severityLevel);
              }
              fieldsPopulated.add('severity');
            }
            
            setAiPopulatedFields(fieldsPopulated);
            setAiSuggestion(data.explanation);
            
            const populated = Array.from(fieldsPopulated).join(', ');
            
            // Provide feedback based on match quality
            if (deviceMatchCount === 4) {
              toast.success(`✓ Excellent match! AI identified all 4 key details: ${populated}`);
            } else if (deviceMatchCount >= 2) {
              toast.warning(`⚠ Partial match (${deviceMatchCount}/4 fields). AI identified: ${populated}. Please verify and fill missing details.`, {
                duration: 6000
              });
            } else if (deviceMatchCount > 0) {
              toast.error(`⚠ Poor match (${deviceMatchCount}/4 fields). AI identified: ${populated}. Please verify all device details carefully.`, {
                duration: 8000
              });
            } else {
              toast.error('AI could not identify device details. Please fill in manually.', {
                duration: 5000
              });
            }
          }
        } catch (err) {
          console.error('Analysis error:', err);
          toast.error('AI analysis failed. Please fill in details manually.');
        } finally {
          setAnalyzingDamage(false);
        }
      };
      
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('File read error:', err);
      setAnalyzingDamage(false);
      toast.error('Could not read image file');
    }
  };

  const renderStep0 = () => {
    if (loading) {
      return <div className="text-center py-8">Loading your policies...</div>;
    }

    if (policies.length === 0) {
      return (
        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have any active policies. Please contact support or purchase a policy first.
            </AlertDescription>
          </Alert>
          <Button variant="outline" onClick={() => navigate("/")} className="w-full">
            Return to Dashboard
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <Label className="text-base font-semibold">Select the policy for this claim</Label>
          <Select 
            value={selectedPolicy} 
            onValueChange={(value) => {
              setSelectedPolicy(value);
              fetchInsuredDevice(value);
            }}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Choose a policy" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {policies.map((policy) => (
                <SelectItem key={policy.id} value={policy.id}>
                  {policy.policy_number} - {policy.products.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedPolicy && insuredDevice && (
          <Alert className="border-primary/50 bg-primary/5">
            <AlertDescription>
              <strong>Coverage:</strong> {getSelectedPolicyData()?.products.coverage.join(", ")}
              <br />
              <strong className="mt-2 block">Insured Device:</strong> {insuredDevice.product_name} {insuredDevice.model} ({insuredDevice.serial_number})
            </AlertDescription>
          </Alert>
        )}

        <Button 
          className="w-full" 
          disabled={!selectedPolicy || !insuredDevice}
          onClick={() => setStep(1)}
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  };

  const renderStep1 = () => {
    const policy = getSelectedPolicyData();
    const perils = policy?.products.perils || [];
    
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

    const getPerilDescription = (peril: string) => {
      return perilDescriptions[peril.toLowerCase()] || "Coverage included in your policy";
    };
    
    return (
      <div className="space-y-6">
        {perils.length > 0 && (
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Your Policy Coverage
              </CardTitle>
              <CardDescription>
                Your policy covers the following
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {perils.map((peril: string, index: number) => (
                  <div key={index} className="flex items-start gap-3 p-2.5 rounded-lg bg-background/60 border border-border/50">
                    <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{peril}</p>
                      <p className="text-xs text-muted-foreground">
                        {getPerilDescription(peril)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div>
          <Label className="text-base font-semibold">What type of claim are you making?</Label>
          <RadioGroup value={claimType} onValueChange={(value) => setClaimType(value as ClaimType)} className="mt-3 space-y-3">
            <div className={cn(
              "flex items-center space-x-3 rounded-lg border p-4",
              isClaimTypeAllowed("breakdown") 
                ? "cursor-pointer hover:bg-secondary/50" 
                : "opacity-40 cursor-not-allowed"
            )}>
              <RadioGroupItem 
                value="breakdown" 
                id="breakdown" 
                disabled={!isClaimTypeAllowed("breakdown")}
              />
              <Label 
                htmlFor="breakdown" 
                className={cn(
                  "flex-1",
                  isClaimTypeAllowed("breakdown") ? "cursor-pointer" : "cursor-not-allowed"
                )}
              >
                <div className="font-medium">Breakdown / Malfunction</div>
                <div className="text-sm text-muted-foreground">Product stopped working or not functioning properly</div>
              </Label>
            </div>
            <div className={cn(
              "flex items-center space-x-3 rounded-lg border p-4",
              isClaimTypeAllowed("damage") 
                ? "cursor-pointer hover:bg-secondary/50" 
                : "opacity-40 cursor-not-allowed"
            )}>
              <RadioGroupItem 
                value="damage" 
                id="damage"
                disabled={!isClaimTypeAllowed("damage")}
              />
              <Label 
                htmlFor="damage" 
                className={cn(
                  "flex-1",
                  isClaimTypeAllowed("damage") ? "cursor-pointer" : "cursor-not-allowed"
                )}
              >
                <div className="font-medium">Accidental Damage</div>
                <div className="text-sm text-muted-foreground">Product was accidentally damaged</div>
              </Label>
            </div>
            <div className={cn(
              "flex items-center space-x-3 rounded-lg border p-4",
              isClaimTypeAllowed("theft") 
                ? "cursor-pointer hover:bg-secondary/50" 
                : "opacity-40 cursor-not-allowed"
            )}>
              <RadioGroupItem 
                value="theft" 
                id="theft"
                disabled={!isClaimTypeAllowed("theft")}
              />
              <Label 
                htmlFor="theft" 
                className={cn(
                  "flex-1",
                  isClaimTypeAllowed("theft") ? "cursor-pointer" : "cursor-not-allowed"
                )}
              >
                <div className="font-medium">Theft or Loss</div>
                <div className="text-sm text-muted-foreground">Product was stolen or lost</div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {!isClaimTypeAllowed("damage") && !isClaimTypeAllowed("theft") && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your {policy?.products.name} policy only covers breakdown/malfunction claims.
              Upgrade to Insurance Max for accidental damage and theft coverage.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button 
            className="flex-1" 
            disabled={!claimType || !isClaimTypeAllowed(claimType)}
            onClick={() => setStep(2)}
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderPhotoUploadStep = () => {
    const isBreakdown = claimType === "breakdown";
    const isDamage = claimType === "damage";
    
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">
            {isBreakdown ? "Upload Device Photos" : "Upload Damage Photos"}
          </h3>
          <p className="text-sm text-muted-foreground">
            Upload photos so our AI can automatically detect the device and assess the {isBreakdown ? "fault" : "damage"}
          </p>
        </div>

        {analyzingDamage && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              AI is analyzing your photos to detect device details and assess {isBreakdown ? "the fault" : "damage severity"}...
            </AlertDescription>
          </Alert>
        )}

        {deviceMismatchWarning && (
          <Alert className="bg-orange-50 border-orange-300 border-2 dark:bg-orange-950 dark:border-orange-700">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <AlertDescription className="text-orange-900 dark:text-orange-100 font-medium">
              {deviceMismatchWarning}
            </AlertDescription>
          </Alert>
        )}

        {physicalDamageWarning && (
          <Collapsible open={physicalDamageOpen} onOpenChange={setPhysicalDamageOpen}>
            <div className="bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-800 border-2 rounded-lg">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between transition-colors hover:bg-red-100 dark:hover:bg-red-900">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-red-200 dark:bg-red-900">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm text-red-900 dark:text-red-100">
                      Extended Warranty Exclusion - Physical Damage
                    </div>
                    <div className="text-xs text-red-700 dark:text-red-300">
                      Physical damage detected • Tap to view details
                    </div>
                  </div>
                </div>
                {physicalDamageOpen ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-2 text-red-900 dark:text-red-100">
                  <p className="font-semibold">{physicalDamageWarning}</p>
                  <div className="text-sm mt-3 bg-red-100 dark:bg-red-900/50 p-3 rounded">
                    <p className="font-semibold mb-1">Extended Warranty covers:</p>
                    <ul className="list-disc ml-5 space-y-1 text-xs">
                      <li>Mechanical or electrical breakdown</li>
                      <li>Manufacturing defects after warranty expires</li>
                      <li>Normal wear and tear failures</li>
                    </ul>
                    <p className="font-semibold mt-2 mb-1">Extended Warranty does NOT cover:</p>
                    <ul className="list-disc ml-5 space-y-1 text-xs">
                      <li>Physical damage (cracks, dents, scratches)</li>
                      <li>Accidental damage or drops</li>
                      <li>Water or liquid damage</li>
                    </ul>
                    <p className="font-bold mt-2 text-red-700 dark:text-red-300">
                      ⚠️ This claim may be rejected. Consider filing an Accidental Damage claim instead if your device has physical damage.
                    </p>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}

        {aiSuggestion && (() => {
          // Verify device category against policy's covered item
          const policyDeviceCategory = insuredDevice?.product_name?.toLowerCase() || '';
          const detectedCategory = itemCategory.toLowerCase();
          
          // Check if categories match (allowing for partial matches)
          const categoriesMatch = policyDeviceCategory && detectedCategory && 
            (policyDeviceCategory.includes(detectedCategory) || 
             detectedCategory.includes(policyDeviceCategory) ||
             policyDeviceCategory === detectedCategory);
          
          // Determine color scheme based on device match
          let colorScheme = {
            bg: 'bg-green-50 dark:bg-green-950',
            border: 'border-green-300 dark:border-green-800',
            hover: 'hover:bg-green-100 dark:hover:bg-green-900',
            iconBg: 'bg-green-200 dark:bg-green-900',
            icon: 'text-green-600 dark:text-green-400',
            text: 'text-green-900 dark:text-green-100',
            subtext: 'text-green-700 dark:text-green-300'
          };
          
          let statusIcon = CheckCircle;
          let statusText = "Device matches policy";
          
          if (!categoriesMatch) {
            colorScheme = {
              bg: 'bg-amber-50 dark:bg-amber-950',
              border: 'border-amber-300 dark:border-amber-800',
              hover: 'hover:bg-amber-100 dark:hover:bg-amber-900',
              iconBg: 'bg-amber-200 dark:bg-amber-900',
              icon: 'text-amber-600 dark:text-amber-400',
              text: 'text-amber-900 dark:text-amber-100',
              subtext: 'text-amber-700 dark:text-amber-300'
            };
            statusIcon = AlertCircle;
            statusText = "Device category mismatch";
          }
          
          if (!policyDeviceCategory || !detectedCategory) {
            colorScheme = {
              bg: 'bg-blue-50 dark:bg-blue-950',
              border: 'border-blue-300 dark:border-blue-800',
              hover: 'hover:bg-blue-100 dark:hover:bg-blue-900',
              iconBg: 'bg-blue-200 dark:bg-blue-900',
              icon: 'text-blue-600 dark:text-blue-400',
              text: 'text-blue-900 dark:text-blue-100',
              subtext: 'text-blue-700 dark:text-blue-300'
            };
            statusText = "Device analysis completed";
          }
          
          const StatusIcon = statusIcon;
          
          return (
            <Collapsible open={deviceAnalysisOpen} onOpenChange={setDeviceAnalysisOpen}>
              <div className={`${colorScheme.bg} ${colorScheme.border} border-2 rounded-lg`}>
                <CollapsibleTrigger className={`w-full p-4 flex items-center justify-between transition-colors ${colorScheme.hover}`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colorScheme.iconBg}`}>
                      <StatusIcon className={`h-5 w-5 ${colorScheme.icon}`} />
                    </div>
                    <div className="text-left">
                      <div className={`font-bold text-sm ${colorScheme.text}`}>
                        AI Device Verification
                      </div>
                      <div className={`text-xs ${colorScheme.subtext}`}>
                        {statusText} • Tap to view details
                      </div>
                    </div>
                  </div>
                  {deviceAnalysisOpen ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-2">
                    <div className={`text-sm ${colorScheme.text}`}>
                      <strong>Device Verification:</strong>
                    </div>
                    <div className={`text-xs ${colorScheme.subtext} space-y-1`}>
                      <div>Policy Device: <span className="font-semibold">{insuredDevice?.product_name || 'Unknown'}</span></div>
                      <div>Detected Device: <span className="font-semibold">{itemCategory || 'Not specified'}</span></div>
                      <div className="mt-2">
                        {categoriesMatch && "✓ Device category matches the insured item"}
                        {!categoriesMatch && policyDeviceCategory && detectedCategory && "⚠ Warning: Detected device does not match the insured device category"}
                        {(!policyDeviceCategory || !detectedCategory) && "ℹ Please verify the device details"}
                      </div>
                    </div>
                    <div className={`mt-3 text-sm ${colorScheme.text}`}>
                      <strong>AI Analysis:</strong>
                    </div>
                    <div className={`text-sm ${colorScheme.subtext}`}>
                      {aiSuggestion}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })()}

        <div className="space-y-3">
          <Label className="text-base font-semibold flex items-center gap-2">
            {isBreakdown ? "Photos of the Defect/Issue" : "Photos of the Damage"}
            <Badge variant="destructive" className="text-xs">Required</Badge>
          </Label>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Upload clear photos showing the {isBreakdown ? "defect or issue" : "damage"}. AI will analyze to help speed up your claim.
            </AlertDescription>
          </Alert>
          
          <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
            <Input
              id="photo-upload"
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              onChange={(e) => handleFileChange(e, isBreakdown ? 'photos' : 'damage')}
              className="hidden"
              multiple
            />
            <Label htmlFor="photo-upload" className="cursor-pointer">
              <div className="flex flex-col items-center gap-2">
                <Image className="h-12 w-12 text-muted-foreground" />
                <div className="font-medium">Click to upload photos</div>
                <div className="text-sm text-muted-foreground">
                  JPG or PNG (max 5MB each)
                </div>
              </div>
            </Label>
          </div>
          
          {((isBreakdown && defectPhotos.length > 0) || (isDamage && damagePhotos.length > 0)) && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {isBreakdown ? defectPhotos.length : damagePhotos.length} file(s) selected:
              </p>
              {(isBreakdown ? defectPhotos : damagePhotos).map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm bg-secondary/50 p-2 rounded">
                  <FileText className="h-4 w-4" />
                  <span className="flex-1">{file.name}</span>
                  <span className="text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button 
            onClick={() => setStep(3)}
            disabled={
              (isBreakdown && defectPhotos.length === 0) || 
              (isDamage && damagePhotos.length === 0)
            }
            className="flex-1"
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderStep3 = () => {
    // Common device selection section for all claim types
    const renderDeviceSelection = () => {
      const deviceCategories = [
        "Smartphone",
        "Laptop",
        "Tablet",
        "TV",
        "Washing Machine",
        "Fridge",
        "Microwave",
        "Dishwasher",
        "Gaming Console",
        "Camera",
        "Smartwatch",
        "Headphones",
        "Other"
      ];

      const deviceMakesByCategory: Record<string, string[]> = {
        "Smartphone": ["Apple", "Samsung", "Google", "OnePlus", "Xiaomi", "Huawei", "Sony", "Motorola", "Nokia", "Other"],
        "Laptop": ["Apple", "Dell", "HP", "Lenovo", "Asus", "Acer", "MSI", "Microsoft", "Samsung", "Other"],
        "Tablet": ["Apple", "Samsung", "Microsoft", "Lenovo", "Amazon", "Huawei", "Other"],
        "TV": ["Samsung", "LG", "Sony", "Panasonic", "Philips", "TCL", "Hisense", "Sharp", "Other"],
        "Washing Machine": ["Bosch", "Samsung", "LG", "Whirlpool", "Siemens", "Miele", "Hotpoint", "Beko", "Other"],
        "Fridge": ["Samsung", "LG", "Bosch", "Whirlpool", "Siemens", "Beko", "Hotpoint", "Liebherr", "Other"],
        "Microwave": ["Samsung", "Panasonic", "Sharp", "LG", "Bosch", "Whirlpool", "Other"],
        "Dishwasher": ["Bosch", "Siemens", "Miele", "Samsung", "LG", "Beko", "Hotpoint", "Other"],
        "Gaming Console": ["Sony", "Microsoft", "Nintendo", "Other"],
        "Camera": ["Canon", "Nikon", "Sony", "Fujifilm", "Panasonic", "Olympus", "Other"],
        "Smartwatch": ["Apple", "Samsung", "Garmin", "Fitbit", "Huawei", "Fossil", "Other"],
        "Headphones": ["Apple", "Sony", "Bose", "Sennheiser", "JBL", "Beats", "Samsung", "Other"],
        "Other": ["Other"]
      };

      // Model options by category and brand (like RetailSales)
      const modelsByBrand: Record<string, string[]> = {
        // Smartphones
        "Apple-Smartphone": ["iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15", "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14", "iPhone SE", "Other"],
        "Samsung-Smartphone": ["Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24", "Galaxy S23", "Galaxy Z Fold 5", "Galaxy Z Flip 5", "Galaxy A54", "Other"],
        "Google-Smartphone": ["Pixel 8 Pro", "Pixel 8", "Pixel 7a", "Pixel Fold", "Other"],
        "OnePlus-Smartphone": ["OnePlus 12", "OnePlus 11", "OnePlus Nord 3", "Other"],
        "Xiaomi-Smartphone": ["Xiaomi 14 Pro", "Xiaomi 13", "Redmi Note 13", "Other"],
        "Huawei-Smartphone": ["P60 Pro", "Mate 50", "Nova 11", "Other"],
        "Sony-Smartphone": ["Xperia 1 V", "Xperia 5 V", "Xperia 10 V", "Other"],
        "Motorola-Smartphone": ["Edge 40 Pro", "Edge 40", "Moto G", "Other"],
        
        // Tablets
        "Apple-Tablet": ["iPad Pro 12.9\"", "iPad Pro 11\"", "iPad Air", "iPad 10th Gen", "iPad mini", "Other"],
        "Samsung-Tablet": ["Galaxy Tab S9 Ultra", "Galaxy Tab S9+", "Galaxy Tab S9", "Galaxy Tab A9", "Other"],
        "Microsoft-Tablet": ["Surface Pro 9", "Surface Go 3", "Other"],
        "Amazon-Tablet": ["Fire HD 10", "Fire HD 8", "Fire 7", "Other"],
        "Lenovo-Tablet": ["Tab P12", "Tab M10", "Tab M8", "Other"],
        "Huawei-Tablet": ["MatePad Pro", "MatePad", "Other"],
        
        // Laptops
        "Apple-Laptop": ["MacBook Pro 16\"", "MacBook Pro 14\"", "MacBook Air 15\"", "MacBook Air 13\"", "Other"],
        "Dell-Laptop": ["XPS 15", "XPS 13", "Inspiron 15", "Latitude 14", "Precision", "Other"],
        "HP-Laptop": ["Spectre x360", "Envy 15", "Pavilion", "EliteBook", "Other"],
        "Lenovo-Laptop": ["ThinkPad X1", "IdeaPad", "Legion", "Yoga", "Other"],
        "Asus-Laptop": ["ZenBook", "VivoBook", "ROG", "TUF Gaming", "Other"],
        "Acer-Laptop": ["Swift", "Aspire", "Predator", "Nitro", "Other"],
        "Microsoft-Laptop": ["Surface Laptop 5", "Surface Laptop Studio", "Other"],
        "MSI-Laptop": ["GE", "GS", "GL", "Prestige", "Other"],
        
        // Smartwatches
        "Apple-Smartwatch": ["Apple Watch Ultra 2", "Apple Watch Series 9", "Apple Watch SE", "Other"],
        "Samsung-Smartwatch": ["Galaxy Watch 6 Classic", "Galaxy Watch 6", "Galaxy Watch FE", "Other"],
        "Garmin-Smartwatch": ["Fenix 7", "Epix", "Forerunner", "Venu", "Other"],
        "Fitbit-Smartwatch": ["Sense 2", "Versa 4", "Charge 6", "Other"],
        "Huawei-Smartwatch": ["Watch GT 4", "Watch Fit", "Other"],
        "Fossil-Smartwatch": ["Gen 6", "Sport", "Other"],
        
        // Headphones
        "Apple-Headphones": ["AirPods Max", "AirPods Pro 2", "AirPods 3", "AirPods 2", "Other"],
        "Sony-Headphones": ["WH-1000XM5", "WH-1000XM4", "WF-1000XM5", "LinkBuds", "Other"],
        "Bose-Headphones": ["QuietComfort Ultra", "QuietComfort 45", "Sport", "Other"],
        "Sennheiser-Headphones": ["Momentum 4", "HD 660S", "IE 600", "Other"],
        "JBL-Headphones": ["Live Pro 2", "Tune", "Reflect", "Other"],
        "Samsung-Headphones": ["Galaxy Buds2 Pro", "Galaxy Buds2", "Galaxy Buds FE", "Other"],
        "Beats-Headphones": ["Studio Pro", "Solo 4", "Fit Pro", "Other"],
        
        // Cameras
        "Canon-Camera": ["EOS R5", "EOS R6", "EOS R10", "PowerShot", "Other"],
        "Nikon-Camera": ["Z9", "Z8", "Z6 III", "Z5", "Other"],
        "Sony-Camera": ["Alpha 1", "A7 IV", "A7C", "ZV-E10", "Other"],
        "Fujifilm-Camera": ["X-T5", "X-S20", "X-H2", "X100V", "Other"],
        "Panasonic-Camera": ["Lumix GH6", "Lumix S5", "G100", "Other"],
        "Olympus-Camera": ["OM-1", "E-M10", "Other"],
        
        // Gaming Consoles
        "Sony-Gaming Console": ["PlayStation 5", "PlayStation 5 Digital", "PlayStation 4", "Other"],
        "Microsoft-Gaming Console": ["Xbox Series X", "Xbox Series S", "Xbox One", "Other"],
        "Nintendo-Gaming Console": ["Switch OLED", "Switch", "Switch Lite", "Other"],
        
        // TVs
        "Samsung-TV": ["QN95C Neo QLED", "S95C OLED", "QN90C", "Crystal UHD", "The Frame", "Other"],
        "LG-TV": ["OLED G3", "OLED C3", "QNED", "NanoCell", "Other"],
        "Sony-TV": ["Bravia XR A95K", "X95K", "X90K", "X85K", "Other"],
        "Panasonic-TV": ["MZ2000 OLED", "LZ2000", "MX950", "Other"],
        "Philips-TV": ["OLED+908", "OLED808", "The One", "Other"],
        "Hisense-TV": ["U8K ULED", "U7K", "A7K", "Other"],
        "TCL-TV": ["C845 Mini LED", "C745", "P745", "Other"],
        
        // Home Appliances
        "Samsung-Washing Machine": ["Bespoke AI", "ecobubble", "QuickDrive", "Other"],
        "LG-Washing Machine": ["TurboWash", "AI DD", "TWINWash", "Other"],
        "Bosch-Washing Machine": ["Serie 8", "Serie 6", "Serie 4", "Other"],
        "Siemens-Washing Machine": ["iQ700", "iQ500", "iQ300", "Other"],
        "Whirlpool-Washing Machine": ["6th Sense", "Supreme Care", "Other"],
        "Miele-Washing Machine": ["W1", "Classic", "Other"],
        
        "Samsung-Fridge": ["Bespoke", "Family Hub", "Side by Side", "Other"],
        "LG-Fridge": ["InstaView", "DoorCooling+", "Other"],
        "Bosch-Fridge": ["Serie 8", "Serie 6", "Serie 4", "Other"],
        
        "Samsung-Dishwasher": ["Bespoke", "DW60R", "Other"],
        "Bosch-Dishwasher": ["Serie 8", "Serie 6", "Serie 4", "Other"],
        "Siemens-Dishwasher": ["iQ700", "iQ500", "Other"],
        "Miele-Dishwasher": ["G7000", "G5000", "Other"],
      };

      const availableMakes = itemCategory ? (deviceMakesByCategory[itemCategory] || []) : [];
      const modelKey = itemMake && itemCategory ? `${itemMake}-${itemCategory}` : "";
      const availableModels = modelKey ? (modelsByBrand[modelKey] || ["Other"]) : [];
      const deviceColors = ["Black", "White", "Silver", "Gold", "Blue", "Green", "Red", "Purple", "Pink", "Grey", "Stainless Steel", "Other"];

      // Auto-populate when user confirms device info is correct
      const handleDeviceConfirmation = (value: "correct" | "incorrect") => {
        setDeviceInfoConfirmed(value);
        if (value === "correct" && insuredDevice) {
          // Auto-populate from insured device
          setItemModel(insuredDevice.model);
          setItemSerialNumber(insuredDevice.serial_number || "");
          // Note: We don't have category, make, or color in covered_items, 
          // so user still needs to select those even if info is "correct"
        } else if (value === "incorrect") {
          // Clear fields for manual entry
          setItemCategory("");
          setItemMake("");
          setItemModel("");
          setItemModelOther("");
          setItemSerialNumber("");
          setItemColor("");
          setItemPurchasePrice("");
        }
      };

      return (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Device Information</CardTitle>
            <CardDescription>
              Confirm or update the device you're claiming for
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {insuredDevice && (
              <div className="space-y-4">
                <Alert className="bg-primary/5 border-primary/20">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <strong className="block">Insured Device on Policy:</strong>
                      <div className="text-sm space-y-0.5">
                        <div><strong>Product:</strong> {insuredDevice.product_name}</div>
                        <div><strong>Model:</strong> {insuredDevice.model}</div>
                        {insuredDevice.serial_number && (
                          <div><strong>Serial Number:</strong> {insuredDevice.serial_number}</div>
                        )}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>

                <div>
                  <Label className="text-sm font-semibold mb-3 block">
                    Is this the correct device information?
                    <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
                  </Label>
                  <RadioGroup 
                    value={deviceInfoConfirmed} 
                    onValueChange={(value) => handleDeviceConfirmation(value as "correct" | "incorrect")}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-secondary/50 cursor-pointer">
                      <RadioGroupItem value="correct" id="device-correct" />
                      <Label htmlFor="device-correct" className="flex-1 cursor-pointer">
                        <div className="font-medium">Yes, this is correct</div>
                        <div className="text-xs text-muted-foreground">Use this device information</div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-secondary/50 cursor-pointer">
                      <RadioGroupItem value="incorrect" id="device-incorrect" />
                      <Label htmlFor="device-incorrect" className="flex-1 cursor-pointer">
                        <div className="font-medium">No, I need to update the details</div>
                        <div className="text-xs text-muted-foreground">Select different device details</div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}

            {(!insuredDevice || deviceInfoConfirmed === "incorrect") && (
              <>
                <div>
                  <Label htmlFor="itemCategory" className="text-sm font-semibold">
                    Device Category
                    <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
                    {aiPopulatedFields.has('category') && (
                      <Badge variant="outline" className="ml-2 text-xs bg-green-50 text-green-700 border-green-200">
                        ✓ AI Detected
                      </Badge>
                    )}
                  </Label>
                  <Select 
                    value={itemCategory} 
                    onValueChange={(value) => {
                      setItemCategory(value);
                      setItemMake("");
                      setItemModel("");
                      setItemModelOther("");
                    }}
                  >
                    <SelectTrigger id="itemCategory" className="mt-2">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {deviceCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="itemMake" className="text-sm font-semibold">
                      Make/Brand
                      <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
                      {aiPopulatedFields.has('brand') && (
                        <Badge variant="outline" className="ml-2 text-xs bg-green-50 text-green-700 border-green-200">
                          ✓ AI Detected
                        </Badge>
                      )}
                    </Label>
                    <Select 
                      value={itemMake} 
                      onValueChange={(value) => {
                        setItemMake(value);
                        setItemModel("");
                        setItemModelOther("");
                      }}
                      disabled={!itemCategory}
                    >
                      <SelectTrigger id="itemMake" className="mt-2">
                        <SelectValue placeholder={itemCategory ? "Select brand" : "Select category first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMakes.map((make) => (
                          <SelectItem key={make} value={make}>
                            {make}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="itemModel" className="text-sm font-semibold">
                      Model
                      <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
                      {aiPopulatedFields.has('model') && (
                        <Badge variant="outline" className="ml-2 text-xs bg-green-50 text-green-700 border-green-200">
                          ✓ AI Detected
                        </Badge>
                      )}
                    </Label>
                    <Select 
                      value={itemModel} 
                      onValueChange={(value) => {
                        setItemModel(value);
                        if (value !== "Other") {
                          setItemModelOther("");
                        }
                      }}
                      disabled={!itemMake}
                    >
                      <SelectTrigger id="itemModel" className="mt-2">
                        <SelectValue placeholder={itemMake ? "Select model" : "Select brand first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Show manual model input if "Other" is selected */}
                {itemModel === "Other" && (
                  <div>
                    <Label htmlFor="itemModelOther" className="text-sm font-semibold">
                      Enter Model Name
                      <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
                    </Label>
                    <Input
                      id="itemModelOther"
                      placeholder="e.g., iPhone 15 Pro Max 256GB"
                      className="mt-2"
                      value={itemModelOther}
                      onChange={(e) => setItemModelOther(e.target.value)}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="itemSerialNumber" className="text-sm font-semibold">
                      Serial Number / IMEI
                    </Label>
                    <Input
                      id="itemSerialNumber"
                      placeholder="If available"
                      className="mt-2"
                      value={itemSerialNumber}
                      onChange={(e) => setItemSerialNumber(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Optional but helps verification</p>
                  </div>

                  <div>
                    <Label htmlFor="itemColor" className="text-sm font-semibold">
                      Color
                      <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
                      {aiPopulatedFields.has('color') && (
                        <Badge variant="outline" className="ml-2 text-xs bg-green-50 text-green-700 border-green-200">
                          ✓ AI Detected
                        </Badge>
                      )}
                    </Label>
                    <Select value={itemColor} onValueChange={setItemColor}>
                      <SelectTrigger id="itemColor" className="mt-2">
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                      <SelectContent>
                        {deviceColors.map((color) => (
                          <SelectItem key={color} value={color}>
                            {color}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="itemPurchasePrice" className="text-sm font-semibold">
                    Purchase Price / Retail Value
                    <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
                  </Label>
                  <div className="relative mt-2">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                    <Input
                      id="itemPurchasePrice"
                      type="number"
                      placeholder="0.00"
                      className="pl-7"
                      value={itemPurchasePrice}
                      onChange={(e) => setItemPurchasePrice(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Original purchase price of the device</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      );
    };

    // Theft claim - Item Details
    if (claimType === "theft") {
      return (
        <div className="space-y-6">
          {renderDeviceSelection()}
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Provide detailed information about the stolen/lost item to help us process your claim
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              Photos of the Item
              <Badge variant="destructive" className="text-xs">Required</Badge>
            </Label>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Upload photos showing the item before the incident (if available)
              </AlertDescription>
            </Alert>
            
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
              <Input
                id="item-photos-upload"
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={(e) => handleFileChange(e, 'item-photos')}
                className="hidden"
                multiple
              />
              <Label htmlFor="item-photos-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-2">
                  <Image className="h-12 w-12 text-muted-foreground" />
                  <div className="font-medium">Click to upload photos</div>
                  <div className="text-sm text-muted-foreground">
                    JPG or PNG (max 5MB each)
                  </div>
                </div>
              </Label>
            </div>
            
            {itemPhotos.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{itemPhotos.length} file(s) selected:</p>
                {itemPhotos.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm bg-secondary/50 p-2 rounded">
                    <FileText className="h-4 w-4" />
                    <span className="flex-1">{file.name}</span>
                    <span className="text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              Proof of Ownership (Receipts, Invoices)
              <Badge variant="destructive" className="text-xs">Required</Badge>
            </Label>
            
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
              <Input
                id="item-ownership-upload"
                type="file"
                accept="image/jpeg,image/jpg,image/png,application/pdf"
                onChange={(e) => handleFileChange(e, 'item-ownership')}
                className="hidden"
                multiple
              />
              <Label htmlFor="item-ownership-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-2">
                  <FileText className="h-12 w-12 text-muted-foreground" />
                  <div className="font-medium">Click to upload documents</div>
                  <div className="text-sm text-muted-foreground">
                    JPG, PNG or PDF (max 5MB each)
                  </div>
                </div>
              </Label>
            </div>
            
            {itemOwnershipDocs.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{itemOwnershipDocs.length} file(s) selected:</p>
                {itemOwnershipDocs.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm bg-secondary/50 p-2 rounded">
                    <FileText className="h-4 w-4" />
                    <span className="flex-1">{file.name}</span>
                    <span className="text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button 
              onClick={() => setStep(4)}
              disabled={
                (insuredDevice ? !deviceInfoConfirmed : (!itemCategory || !itemMake || !itemModel || !itemColor)) ||
                (deviceInfoConfirmed === "incorrect" && (!itemCategory || !itemMake || !itemModel || !itemColor)) ||
                itemPhotos.length === 0 || 
                itemOwnershipDocs.length === 0
              }
              className="flex-1"
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }
    
    // Breakdown claim - Reason for Claim
    if (claimType === "breakdown") {
      const availableIssues = faultCategory ? (specificIssuesByCategory[faultCategory as keyof typeof specificIssuesByCategory] || []) : [];

      return (
        <div className="space-y-6">
          {renderDeviceSelection()}
          
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Fault Details</CardTitle>
              <CardDescription>
                Select the specific fault details to help us process your claim faster
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="faultCategory" className="text-sm font-semibold">
                  Fault Category
                  <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
                </Label>
                <Select 
                  value={faultCategory} 
                  onValueChange={(value) => {
                    setFaultCategory(value);
                    setSpecificIssue("");
                  }}
                >
                  <SelectTrigger id="faultCategory" className="mt-2 bg-background">
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
                <Label htmlFor="specificIssue" className="text-sm font-semibold">
                  Specific Issue
                  <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
                </Label>
                <Select 
                  value={specificIssue} 
                  onValueChange={setSpecificIssue}
                  disabled={!faultCategory}
                >
                  <SelectTrigger id="specificIssue" className="mt-2 bg-background">
                    <SelectValue placeholder={faultCategory ? "Select specific issue" : "Select fault category first"} />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {availableIssues.map((issue) => (
                      <SelectItem key={issue} value={issue}>
                        {issue}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {severityLevel && (
                <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-semibold">AI-Assessed Severity: {severityLevel}</p>
                      {aiSuggestion && (
                        <p className="text-xs text-muted-foreground">
                          💡 {aiSuggestion}
                        </p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="additionalComments" className="text-sm font-semibold">
                  Additional Comments
                  <span className="text-muted-foreground font-normal ml-2">(Optional)</span>
                </Label>
                <Textarea
                  id="additionalComments"
                  placeholder="Any additional details about the fault that might help us..."
                  className="mt-2 min-h-[100px]"
                  value={additionalComments}
                  onChange={(e) => setAdditionalComments(e.target.value)}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {additionalComments.length}/500 characters
                </p>
              </div>
            </CardContent>
          </Card>

          <div>
            <Label htmlFor="problemDate" className="text-base font-semibold">
              Date When Problem First Occurred
              <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
            </Label>
            <Input
              id="problemDate"
              type="date"
              className="mt-2"
              value={problemDate}
              onChange={(e) => {
                setProblemDate(e.target.value);
                // Check manufacturer warranty - use purchase_date, fall back to added_date, then policy start_date
                const selectedPolicyData = policies.find(p => p.id === selectedPolicy);
                const effectivePurchaseDate = insuredDevice?.purchase_date || insuredDevice?.added_date || selectedPolicyData?.start_date || null;
                const withinWarranty = checkManufacturerWarranty(e.target.value, effectivePurchaseDate);
                setIsWithinManufacturerWarranty(withinWarranty);
                console.log('Warranty check:', { problemDate: e.target.value, effectivePurchaseDate, withinWarranty, manufacturerWarrantyMonths });
              }}
              max={new Date().toISOString().split('T')[0]}
            />
            {isWithinManufacturerWarranty && (
              <Alert className="mt-3 border-amber-500 bg-amber-50 dark:bg-amber-950">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  <strong>Manufacturer Warranty Notice:</strong> The problem date falls within the manufacturer's {manufacturerWarrantyMonths}-month warranty period from your device purchase date. 
                  Please contact the manufacturer first for warranty support before submitting an extended warranty claim.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div>
            <Label className="text-base font-semibold">
              Is the Issue Intermittent or Constant?
              <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
            </Label>
            <RadioGroup value={issueFrequency} onValueChange={(value) => setIssueFrequency(value as "intermittent" | "constant")} className="mt-3 space-y-3">
              <div className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-secondary/50">
                <RadioGroupItem value="intermittent" id="intermittent" />
                <Label htmlFor="intermittent" className="flex-1 cursor-pointer">
                  <div className="font-medium">Intermittent</div>
                  <div className="text-sm text-muted-foreground">Problem occurs occasionally</div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-secondary/50">
                <RadioGroupItem value="constant" id="constant" />
                <Label htmlFor="constant" className="flex-1 cursor-pointer">
                  <div className="font-medium">Constant</div>
                  <div className="text-sm text-muted-foreground">Problem occurs all the time</div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="previousRepairs" className="text-base font-semibold">
              Any Previous Repairs Attempted?
            </Label>
            <Textarea
              id="previousRepairs"
              placeholder="Describe any self-repairs or repairs at an authorized service center (optional)"
              className="mt-2 min-h-[100px]"
              value={previousRepairs}
              onChange={(e) => setPreviousRepairs(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">Leave blank if no repairs have been attempted</p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button 
              onClick={() => setStep(4)}
              disabled={
                (insuredDevice ? !deviceInfoConfirmed : (!itemCategory || !itemMake || !itemModel || !itemColor)) ||
                (deviceInfoConfirmed === "incorrect" && (!itemCategory || !itemMake || !itemModel || !itemColor)) ||
                !faultCategory || 
                !specificIssue || 
                !problemDate || 
                !issueFrequency
              }
              className="flex-1"
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    // Damage claim - Incident Information
    console.log('Step 3 Damage Claim - Current State:', {
      insuredDevice: !!insuredDevice,
      deviceInfoConfirmed,
      itemCategory,
      itemMake,
      itemModel,
      itemColor,
      incidentDate,
      incidentTime,
      incidentDescription: incidentDescription?.substring(0, 30) + '...',
      incidentDescriptionLength: incidentDescription?.length,
      validationChecks: {
        needsDeviceConfirmation: insuredDevice && !deviceInfoConfirmed,
        needsDeviceFields: !insuredDevice || deviceInfoConfirmed === "incorrect",
        hasAllDeviceFields: !!(itemCategory && itemMake && itemModel && itemColor),
        hasIncidentDate: !!incidentDate,
        hasIncidentTime: !!incidentTime,
        hasIncidentDescription: !!incidentDescription,
        incidentDescriptionLongEnough: incidentDescription?.length >= 20
      }
    });

    return (
      <div className="space-y-6">
        {renderDeviceSelection()}

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Tell us when and how the damage occurred
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="incidentDate" className="text-base font-semibold">
              Date of Incident
              <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
            </Label>
            <Input
              id="incidentDate"
              type="date"
              className="mt-2"
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <Label htmlFor="incidentTime" className="text-base font-semibold">
              Time of Incident
              <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
            </Label>
            <Input
              id="incidentTime"
              type="time"
              className="mt-2"
              value={incidentTime}
              onChange={(e) => setIncidentTime(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="incidentDescription" className="text-base font-semibold">
            How Did the Damage Occur?
            <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
          </Label>
          <Textarea
            id="incidentDescription"
            placeholder="Please describe exactly how the damage happened (e.g., dropped from table, water spill, etc.)"
            className="mt-2 min-h-[150px]"
            value={incidentDescription}
            onChange={(e) => setIncidentDescription(e.target.value)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Provide as much detail as possible. Minimum 20 characters required.
          </p>
        </div>

        {/* Validation feedback */}
        {(() => {
          const needsDeviceConfirmation = insuredDevice && !deviceInfoConfirmed;
          const needsDeviceFields = !insuredDevice || deviceInfoConfirmed === "incorrect";
          const missingDeviceFields = needsDeviceFields && (!itemCategory || !itemMake || !itemModel || !itemColor);
          const missingIncidentFields = !incidentDate || !incidentTime || !incidentDescription || (incidentDescription && incidentDescription.length < 20);
          
          return (needsDeviceConfirmation || missingDeviceFields || missingIncidentFields) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please complete all required fields:
                {needsDeviceConfirmation && <div>• Confirm device information (correct/incorrect)</div>}
                {needsDeviceFields && !itemCategory && <div>• Device category</div>}
                {needsDeviceFields && !itemMake && <div>• Device make/brand</div>}
                {needsDeviceFields && !itemModel && <div>• Device model</div>}
                {needsDeviceFields && !itemColor && <div>• Device color</div>}
                {!incidentDate && <div>• Date of incident</div>}
                {!incidentTime && <div>• Time of incident</div>}
                {!incidentDescription && <div>• Incident description</div>}
                {incidentDescription && incidentDescription.length < 20 && <div>• Incident description must be at least 20 characters (currently {incidentDescription.length})</div>}
              </AlertDescription>
            </Alert>
          );
        })()}

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button 
            onClick={() => {
              console.log('Step 3 Continue clicked:', {
                insuredDevice: !!insuredDevice,
                deviceInfoConfirmed,
                itemCategory,
                itemMake,
                itemModel,
                itemColor,
                incidentDate,
                incidentTime,
                incidentDescriptionLength: incidentDescription?.length
              });
              setStep(4);
            }}
            disabled={
              // If there's an insured device, must confirm it
              (insuredDevice && !deviceInfoConfirmed) ||
              // If no insured device OR user says incorrect, need device fields
              ((!insuredDevice || deviceInfoConfirmed === "incorrect") && (!itemCategory || !itemMake || !itemModel || !itemColor)) ||
              // Always need incident fields
              !incidentDate ||
              !incidentTime ||
              !incidentDescription ||
              incidentDescription.length < 20
            }
            className="flex-1"
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderStep4DamageDetails = () => {
    // Damage claim - Extent of Damage
    if (claimType !== "damage") return null;
    
    return (
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Describe the damage in detail to help us process your claim
          </AlertDescription>
        </Alert>

        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Damage Details</CardTitle>
            <CardDescription>
              Select the specific damage details to help us assess your claim
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="damageType" className="text-sm font-semibold">
                Type of Damage
                <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
              </Label>
              <Select 
                value={damageType} 
                onValueChange={(value) => {
                  setDamageType(value);
                  setDamageArea("");
                }}
              >
                <SelectTrigger id="damageType" className="mt-2 bg-background">
                  <SelectValue placeholder="Select damage type" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="Screen Damage">Screen Damage</SelectItem>
                  <SelectItem value="Water/Liquid Damage">Water/Liquid Damage</SelectItem>
                  <SelectItem value="Drop/Impact Damage">Drop/Impact Damage</SelectItem>
                  <SelectItem value="Scratch/Dent">Scratch/Dent</SelectItem>
                  <SelectItem value="Cracked/Broken Parts">Cracked/Broken Parts</SelectItem>
                  <SelectItem value="Electrical Damage">Electrical Damage</SelectItem>
                  <SelectItem value="Fire/Heat Damage">Fire/Heat Damage</SelectItem>
                  <SelectItem value="Other Physical Damage">Other Physical Damage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="damageArea" className="text-sm font-semibold">
                Affected Area/Component
                <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
              </Label>
              <Select value={damageArea} onValueChange={setDamageArea}>
                <SelectTrigger id="damageArea" className="mt-2 bg-background">
                  <SelectValue placeholder="Select affected area" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="Screen/Display">Screen/Display</SelectItem>
                  <SelectItem value="Back Panel/Casing">Back Panel/Casing</SelectItem>
                  <SelectItem value="Camera Lens">Camera Lens</SelectItem>
                  <SelectItem value="Charging Port">Charging Port</SelectItem>
                  <SelectItem value="Buttons/Controls">Buttons/Controls</SelectItem>
                  <SelectItem value="Battery">Battery</SelectItem>
                  <SelectItem value="Internal Components">Internal Components</SelectItem>
                  <SelectItem value="Hinges/Connectors">Hinges/Connectors</SelectItem>
                  <SelectItem value="Multiple Areas">Multiple Areas</SelectItem>
                  <SelectItem value="Entire Device">Entire Device</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {damageSeverity && (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-semibold">AI-Assessed Severity: {damageSeverity}</p>
                    {aiSuggestion && (
                      <p className="text-xs text-muted-foreground">
                        💡 {aiSuggestion}
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="damageComments" className="text-sm font-semibold">
                Additional Comments
                <span className="text-muted-foreground font-normal ml-2">(Optional)</span>
              </Label>
              <Textarea
                id="damageComments"
                placeholder="Any additional details about the damage that might help us..."
                className="mt-2 min-h-[100px]"
                value={damageComments}
                onChange={(e) => setDamageComments(e.target.value)}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {damageComments.length}/500 characters
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button 
            onClick={() => setStep(5)}
            disabled={!damageType || !damageArea}
            className="flex-1"
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderStep4TheftIncident = () => {
    // Theft claim - Incident Details
    if (claimType === "theft") {
      return (
        <div className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Provide complete details about when and where the theft/loss occurred
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="theftDate" className="text-base font-semibold">
                Date of Theft/Loss
                <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
              </Label>
              <Input
                id="theftDate"
                type="date"
                className="mt-2"
                value={theftDate}
                onChange={(e) => setTheftDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <Label htmlFor="theftTime" className="text-base font-semibold">
                Time of Theft/Loss
                <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
              </Label>
              <Input
                id="theftTime"
                type="time"
                className="mt-2"
                value={theftTime}
                onChange={(e) => setTheftTime(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="theftLocation" className="text-base font-semibold">
              Location Where Theft/Loss Occurred
              <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
            </Label>
            <Input
              id="theftLocation"
              placeholder="Full address or specific location details"
              className="mt-2"
              value={theftLocation}
              onChange={(e) => setTheftLocation(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="theftDescription" className="text-base font-semibold">
              Description of How the Theft/Loss Happened
              <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
            </Label>
            <Textarea
              id="theftDescription"
              placeholder="Provide detailed information about the circumstances of the theft or loss..."
              className="mt-2 min-h-[150px]"
              value={theftDescription}
              onChange={(e) => setTheftDescription(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">Minimum 20 characters</p>
          </div>

          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="police" 
                checked={policeNotified}
                onCheckedChange={(checked) => setPoliceNotified(checked === true)}
              />
              <Label htmlFor="police" className="text-sm cursor-pointer leading-relaxed font-medium">
                Law enforcement was notified
              </Label>
            </div>

            {policeNotified && (
              <>
                <div>
                  <Label htmlFor="policeReportNumber" className="text-base font-semibold">
                    Police Report Number
                    <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
                  </Label>
                  <Input
                    id="policeReportNumber"
                    placeholder="Enter the police report or case number"
                    className="mt-2"
                    value={policeReportNumber}
                    onChange={(e) => setPoliceReportNumber(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="policeAuthority" className="text-base font-semibold">
                    Contact Details of Reporting Authority
                    <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
                  </Label>
                  <Input
                    id="policeAuthority"
                    placeholder="Station name, phone number, and location"
                    className="mt-2"
                    value={policeAuthority}
                    onChange={(e) => setPoliceAuthority(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          {policeNotified && (
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                Copy of Police Report
                <Badge variant="destructive" className="text-xs">Required</Badge>
              </Label>
              <Alert className="border-warning">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Police report must be uploaded as a PDF document
                </AlertDescription>
              </Alert>
              
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                <Input
                  id="police-report-upload"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => handleFileChange(e, 'police-report')}
                  className="hidden"
                  multiple
                />
                <Label htmlFor="police-report-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-12 w-12 text-muted-foreground" />
                    <div className="font-medium">Click to upload police report</div>
                    <div className="text-sm text-muted-foreground">
                      PDF only (max 5MB)
                    </div>
                  </div>
                </Label>
              </div>
              
              {policeReport.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{policeReport.length} file(s) selected:</p>
                  {policeReport.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm bg-secondary/50 p-2 rounded">
                      <FileText className="h-4 w-4" />
                      <span className="flex-1">{file.name}</span>
                      <span className="text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button 
              onClick={() => setStep(4)}
              disabled={!theftDate || !theftTime || !theftLocation || !theftDescription || theftDescription.length < 20 || (policeNotified && (!policeReportNumber || !policeAuthority || policeReport.length === 0))}
              className="flex-1"
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }
    
    // Breakdown claim - Supporting Documentation
    if (claimType === "breakdown") {
      return (
        <div className="space-y-6">
          {defectPhotos.length > 0 && (
            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Using {defectPhotos.length} photo(s) uploaded in Step 2 for this claim.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <Label className="text-base font-semibold">
              Supporting Documents
            </Label>
            <p className="text-sm text-muted-foreground">
              Repair invoices, service reports, or correspondence with manufacturer/retailer (optional)
            </p>
            
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
              <Input
                id="documents-upload"
                type="file"
                accept="image/jpeg,image/jpg,image/png,application/pdf"
                onChange={(e) => handleFileChange(e, 'documents')}
                className="hidden"
                multiple
              />
              <Label htmlFor="documents-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-2">
                  <FileText className="h-12 w-12 text-muted-foreground" />
                  <div className="font-medium">Click to upload supporting documents</div>
                  <div className="text-sm text-muted-foreground">
                    JPG, PNG or PDF (max 5MB each)
                  </div>
                </div>
              </Label>
            </div>
            
            {supportingDocuments.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{supportingDocuments.length} file(s) selected:</p>
                {supportingDocuments.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm bg-secondary/50 p-2 rounded">
                    <FileText className="h-4 w-4" />
                    <span className="flex-1">{file.name}</span>
                    <span className="text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={uploading}
              className="flex-1"
            >
              {uploading ? "Submitting..." : "Submit Claim"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    // Damage claim - Extent of Damage
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="incidentDate" className="text-base font-semibold">
              Date of the Incident
              <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
            </Label>
            <Input
              id="incidentDate"
              type="date"
              className="mt-2"
              value={incidentDate}
              onChange={(e) => setIncidentDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <Label htmlFor="incidentTime" className="text-base font-semibold">
              Time of the Incident
              <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
            </Label>
            <Input
              id="incidentTime"
              type="time"
              className="mt-2"
              value={incidentTime}
              onChange={(e) => setIncidentTime(e.target.value)}
            />
          </div>
        </div>

        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Damage Details</CardTitle>
            <CardDescription>
              Select the specific damage details to help us assess your claim
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="damageType" className="text-sm font-semibold">
                Type of Damage
                <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
              </Label>
              <Select 
                value={damageType} 
                onValueChange={(value) => {
                  setDamageType(value);
                  setDamageArea("");
                }}
              >
                <SelectTrigger id="damageType" className="mt-2 bg-background">
                  <SelectValue placeholder="Select damage type" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="Screen Damage">Screen Damage</SelectItem>
                  <SelectItem value="Water/Liquid Damage">Water/Liquid Damage</SelectItem>
                  <SelectItem value="Drop/Impact Damage">Drop/Impact Damage</SelectItem>
                  <SelectItem value="Scratch/Dent">Scratch/Dent</SelectItem>
                  <SelectItem value="Cracked/Broken Parts">Cracked/Broken Parts</SelectItem>
                  <SelectItem value="Electrical Damage">Electrical Damage</SelectItem>
                  <SelectItem value="Fire/Heat Damage">Fire/Heat Damage</SelectItem>
                  <SelectItem value="Other Physical Damage">Other Physical Damage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="damageArea" className="text-sm font-semibold">
                Affected Area/Component
                <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
              </Label>
              <Select value={damageArea} onValueChange={setDamageArea}>
                <SelectTrigger id="damageArea" className="mt-2 bg-background">
                  <SelectValue placeholder="Select affected area" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="Screen/Display">Screen/Display</SelectItem>
                  <SelectItem value="Back Panel/Casing">Back Panel/Casing</SelectItem>
                  <SelectItem value="Camera Lens">Camera Lens</SelectItem>
                  <SelectItem value="Charging Port">Charging Port</SelectItem>
                  <SelectItem value="Buttons/Controls">Buttons/Controls</SelectItem>
                  <SelectItem value="Battery">Battery</SelectItem>
                  <SelectItem value="Internal Components">Internal Components</SelectItem>
                  <SelectItem value="Hinges/Connectors">Hinges/Connectors</SelectItem>
                  <SelectItem value="Multiple Areas">Multiple Areas</SelectItem>
                  <SelectItem value="Entire Device">Entire Device</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="damageSeverity" className="text-sm font-semibold">
                Severity of Damage
                <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
                {aiPopulatedFields.has('severity') && (
                  <Badge variant="outline" className="ml-2 text-xs bg-green-50 text-green-700 border-green-200">
                    ✓ AI Detected
                  </Badge>
                )}
              </Label>
              <Select value={damageSeverity} onValueChange={setDamageSeverity}>
                <SelectTrigger id="damageSeverity" className="mt-2 bg-background">
                  <SelectValue placeholder="Select damage severity" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="Total Loss - Device unusable">Total Loss - Device unusable</SelectItem>
                  <SelectItem value="Severe - Major damage, limited functionality">Severe - Major damage, limited functionality</SelectItem>
                  <SelectItem value="Moderate - Significant damage, partial functionality">Moderate - Significant damage, partial functionality</SelectItem>
                  <SelectItem value="Minor - Cosmetic damage, fully functional">Minor - Cosmetic damage, fully functional</SelectItem>
                </SelectContent>
              </Select>
              {aiSuggestion && (
                <p className="text-xs text-muted-foreground mt-2">
                  💡 AI analyzed the damage photo and suggested this severity level
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="damageComments" className="text-sm font-semibold">
                Additional Comments
                <span className="text-muted-foreground font-normal ml-2">(Optional)</span>
              </Label>
              <Textarea
                id="damageComments"
                placeholder="Any additional details about the damage that might help us..."
                className="mt-2 min-h-[100px]"
                value={damageComments}
                onChange={(e) => setDamageComments(e.target.value)}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {damageComments.length}/500 characters
              </p>
            </div>
          </CardContent>
        </Card>

        {damagePhotos.length > 0 && (
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Using {damagePhotos.length} photo(s) uploaded in Step 2 for this claim.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button 
            onClick={() => setStep(5)}
            disabled={!incidentDate || !incidentTime || !damageType || !damageArea || !damageSeverity}
            className="flex-1"
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderStep5DamageDocs = () => {
    console.log('🔍 DEBUG Step 5 Damage Docs - Render:', { 
      step, 
      claimType, 
      proofOfOwnershipCount: proofOfOwnership.length,
      supportingDocsCount: supportingDocuments.length
    });
    
    return (
      <div className="space-y-6">
        {/* Debug Panel */}
        <div className="bg-muted border-2 border-dashed border-muted-foreground/30 p-4 rounded-lg text-sm space-y-1 font-mono">
          <div className="font-bold text-base mb-2">🔍 Debug Information</div>
          <div><strong>Current Step:</strong> {step} (Internal Index)</div>
          <div><strong>Claim Type:</strong> {claimType}</div>
          <div><strong>Proof of Ownership Files:</strong> {proofOfOwnership.length} uploaded</div>
          <div><strong>Supporting Documents:</strong> {supportingDocuments.length} uploaded</div>
          <div><strong>Function Rendering:</strong> renderStep5DamageDocs()</div>
        </div>

        <Alert className="bg-primary/10 border-primary">
          <AlertCircle className="h-5 w-5 text-primary" />
          <AlertDescription className="font-semibold text-base">
            📋 REQUIRED: Upload at least one proof of ownership document to continue
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="flex items-start gap-2">
            <Badge variant="destructive" className="text-xs mt-1">Required</Badge>
            <div>
              <Label htmlFor="proof-upload-visible" className="text-base font-semibold block cursor-pointer">
                Proof of Ownership
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Upload receipt, invoice, or proof of purchase for the damaged device
              </p>
            </div>
          </div>
          
          <div className="border-2 border-primary rounded-lg p-6 bg-primary/5">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-primary text-primary-foreground">
                <Upload className="h-8 w-8" />
              </div>
              <div className="font-semibold text-lg">Choose Files to Upload</div>
              <Input
                id="proof-upload-visible"
                type="file"
                accept="image/jpeg,image/jpg,image/png,application/pdf"
                onChange={(e) => {
                  console.log('📁 File input changed:', e.target.files?.length, 'files');
                  console.log('📁 Files:', e.target.files);
                  handleFileChange(e, 'ownership');
                }}
                className="w-full max-w-md cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                multiple
              />
              <div className="text-sm text-muted-foreground text-center">
                JPG, PNG or PDF • Maximum 5MB per file • Multiple files allowed
              </div>
            </div>
          </div>
          
          {proofOfOwnership.length > 0 ? (
            <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <p className="font-medium text-green-800 dark:text-green-200 mb-2">
                  {proofOfOwnership.length} file(s) uploaded successfully
                </p>
                <div className="space-y-2">
                  {proofOfOwnership.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm bg-white/50 dark:bg-black/20 p-2 rounded">
                      <FileText className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1 truncate">{file.name}</span>
                      <span className="text-muted-foreground whitespace-nowrap">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please upload at least one proof of ownership document to continue
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="space-y-4">
          <Label className="text-base font-semibold">
            Supporting Documents <span className="text-muted-foreground font-normal">(Optional)</span>
          </Label>
          <p className="text-sm text-muted-foreground">
            Any additional documents that support your claim
          </p>
          
          <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
            <Input
              id="documents-upload-damage"
              type="file"
              accept="image/jpeg,image/jpg,image/png,application/pdf"
              onChange={(e) => handleFileChange(e, 'documents')}
              className="hidden"
              multiple
            />
            <Label htmlFor="documents-upload-damage" className="cursor-pointer">
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-12 w-12 text-muted-foreground" />
                <div className="font-medium">Click to upload supporting documents</div>
                <div className="text-sm text-muted-foreground">
                  JPG, PNG or PDF (max 5MB each)
                </div>
              </div>
            </Label>
          </div>
          
          {supportingDocuments.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{supportingDocuments.length} file(s) selected:</p>
              {supportingDocuments.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm bg-secondary/50 p-2 rounded">
                  <FileText className="h-4 w-4" />
                  <span className="flex-1">{file.name}</span>
                  <span className="text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Requirements Checklist */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="font-semibold text-sm flex items-center gap-2">
              <span className="text-lg">📋</span> Requirements to Continue:
            </div>
            <div className={cn(
              "flex items-center gap-3 text-sm p-3 rounded-md",
              proofOfOwnership.length > 0 
                ? "bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800" 
                : "bg-background border-2 border-dashed"
            )}>
              {proofOfOwnership.length > 0 ? (
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
              )}
              <span className="font-medium">
                {proofOfOwnership.length > 0 ? '✓ ' : ''}
                Upload at least 1 proof of ownership document
              </span>
            </div>
          </div>

          {proofOfOwnership.length === 0 && (
            <Alert className="bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                ⚠️ You must upload at least one proof of ownership document before continuing
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(4)} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button 
              onClick={() => {
                console.log('✅ Continue clicked from step 5, ownership files:', proofOfOwnership.length);
                if (proofOfOwnership.length > 0) {
                  setStep(6);
                } else {
                  console.error('❌ Cannot continue - no ownership documents uploaded');
                }
              }}
              disabled={proofOfOwnership.length === 0}
              className="flex-1"
              title={proofOfOwnership.length === 0 ? "Upload proof of ownership to enable this button" : "Continue to next step"}
            >
              {proofOfOwnership.length === 0 ? "Continue (Upload Required)" : "Continue"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderStep5TheftSignature = () => {
    // Theft claim - Declaration & Signature
    if (claimType === "theft") {
      return (
        <div className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please review your claim details and confirm the information is accurate
            </AlertDescription>
          </Alert>

          <div className="space-y-4 p-4 bg-secondary/30 rounded-lg">
            <h3 className="font-semibold">Claim Summary</h3>
            <div className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Item:</span> <span className="font-medium">{itemMake} {itemModel}</span></div>
              <div><span className="text-muted-foreground">Theft/Loss Date:</span> <span className="font-medium">{theftDate} {theftTime}</span></div>
              <div><span className="text-muted-foreground">Location:</span> <span className="font-medium">{theftLocation}</span></div>
              <div><span className="text-muted-foreground">Police Notified:</span> <span className="font-medium">{policeNotified ? 'Yes' : 'No'}</span></div>
              <div><span className="text-muted-foreground">Documentation:</span> <span className="font-medium">{itemPhotos.length} photo(s), {itemOwnershipDocs.length + policeReport.length} document(s)</span></div>
            </div>
          </div>

          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="terms" 
                checked={agreeToTerms}
                onCheckedChange={(checked) => setAgreeToTerms(checked === true)}
              />
              <Label htmlFor="terms" className="text-sm cursor-pointer leading-relaxed">
                I confirm that the information provided in this claim is true and accurate to the best of my knowledge. I understand that providing false information may result in claim denial and policy cancellation.
              </Label>
            </div>
          </div>

          <div>
            <Label htmlFor="signature" className="text-base font-semibold flex items-center gap-2">
              <Signature className="h-5 w-5" />
              Full Name (Digital Signature)
              <Badge variant="destructive" className="text-xs">Required</Badge>
            </Label>
            <Input
              id="signature"
              type="text"
              placeholder="Type your full name"
              className="mt-2"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Date of submission: {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(4)} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!agreeToTerms || !signatureName || uploading}
              className="flex-1"
            >
              {uploading ? "Submitting..." : "Submit Claim"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }
    
    // Breakdown claim - Declaration & Signature
    if (claimType === "breakdown") {
      return (
        <div className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please review your claim details and confirm the information is accurate
            </AlertDescription>
          </Alert>

          <div className="space-y-4 p-4 bg-secondary/30 rounded-lg">
            <h3 className="font-semibold">Claim Summary</h3>
            <div className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Problem Date:</span> <span className="font-medium">{problemDate}</span></div>
              <div><span className="text-muted-foreground">Issue Type:</span> <span className="font-medium capitalize">{issueFrequency}</span></div>
              <div><span className="text-muted-foreground">Documentation:</span> <span className="font-medium">{defectPhotos.length} photo(s), {supportingDocuments.length} supporting document(s)</span></div>
            </div>
          </div>

          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="terms" 
                checked={agreeToTerms}
                onCheckedChange={(checked) => setAgreeToTerms(checked === true)}
              />
              <Label htmlFor="terms" className="text-sm cursor-pointer leading-relaxed">
                I confirm that the information provided in this claim is true and accurate to the best of my knowledge. I understand that providing false information may result in claim denial and policy cancellation.
              </Label>
            </div>
          </div>

          <div>
            <Label htmlFor="signature" className="text-base font-semibold flex items-center gap-2">
              <Signature className="h-5 w-5" />
              Full Name (Digital Signature)
              <Badge variant="destructive" className="text-xs">Required</Badge>
            </Label>
            <Input
              id="signature"
              type="text"
              placeholder="Type your full name"
              className="mt-2"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Date of submission: {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(4)} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!agreeToTerms || !signatureName || uploading}
              className="flex-1"
            >
              {uploading ? "Submitting..." : "Submit Claim"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    // Damage claim - Supporting Documentation (Proof of Ownership)
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-base font-semibold flex items-center gap-2">
            Receipts, Invoices, or Proof of Ownership
            <Badge variant="destructive" className="text-xs">Required</Badge>
          </Label>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please upload proof of purchase or ownership for the damaged item
            </AlertDescription>
          </Alert>
          
          <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
            <Input
              id="ownership-upload"
              type="file"
              accept="image/jpeg,image/jpg,image/png,application/pdf"
              onChange={(e) => handleFileChange(e, 'ownership')}
              className="hidden"
              multiple
            />
            <Label htmlFor="ownership-upload" className="cursor-pointer">
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-12 w-12 text-muted-foreground" />
                <div className="font-medium">Click to upload receipts/invoices</div>
                <div className="text-sm text-muted-foreground">
                  JPG, PNG or PDF (max 5MB each)
                </div>
              </div>
            </Label>
          </div>
          
          {proofOfOwnership.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{proofOfOwnership.length} file(s) selected:</p>
              {proofOfOwnership.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm bg-secondary/50 p-2 rounded">
                  <FileText className="h-4 w-4" />
                  <span className="flex-1">{file.name}</span>
                  <span className="text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep(4)} className="flex-1">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button 
            onClick={() => setStep(6)}
            disabled={proofOfOwnership.length === 0}
            className="flex-1"
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const renderStep6DamageSignature = () => {
    // Damage claim - Declaration & Signature
    if (claimType === "damage") {
      return (
        <div className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please review your claim details and confirm the information is accurate
            </AlertDescription>
          </Alert>

          <div className="space-y-4 p-4 bg-secondary/30 rounded-lg">
            <h3 className="font-semibold">Claim Summary</h3>
            <div className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Incident Date:</span> <span className="font-medium">{incidentDate} {incidentTime}</span></div>
              <div><span className="text-muted-foreground">Documentation:</span> <span className="font-medium">{damagePhotos.length} photo(s), {proofOfOwnership.length} proof document(s)</span></div>
            </div>
          </div>

          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="terms" 
                checked={agreeToTerms}
                onCheckedChange={(checked) => setAgreeToTerms(checked === true)}
              />
              <Label htmlFor="terms" className="text-sm cursor-pointer leading-relaxed">
                I confirm that the information provided in this claim is true and accurate to the best of my knowledge. I understand that providing false information may result in claim denial and policy cancellation.
              </Label>
            </div>
          </div>

          <div>
            <Label htmlFor="signature" className="text-base font-semibold flex items-center gap-2">
              <Signature className="h-5 w-5" />
              Full Name (Digital Signature)
              <Badge variant="destructive" className="text-xs">Required</Badge>
            </Label>
            <Input
              id="signature"
              type="text"
              placeholder="Type your full name"
              className="mt-2"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Date of submission: {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(5)} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!agreeToTerms || !signatureName || uploading}
              className="flex-1"
            >
              {uploading ? "Submitting..." : "Submit Claim"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      );
    }

    // Decision page (for breakdown claims, this is step 5; for damage claims, this is step 6)
    // This should not be rendered here, use renderDecision instead
    return null;
  };

  const renderStep6 = () => {
    return null;
  };

  const renderDecision = () => {
    const isAccepted = decision === "accepted";
    const isRejected = decision === "rejected";
    const isReferred = decision === "referred";

    return (
      <div className="space-y-6">
        <Alert className={
          isAccepted ? "border-success bg-success/10" :
          isRejected ? "border-destructive bg-destructive/10" :
          "border-warning bg-warning/10"
        }>
          <div className="flex items-start gap-4">
            {isAccepted && <CheckCircle className="h-6 w-6 text-success mt-0.5" />}
            {isRejected && <XCircle className="h-6 w-6 text-destructive mt-0.5" />}
            {isReferred && <AlertCircle className="h-6 w-6 text-warning mt-0.5" />}
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-1">
                {isAccepted && "Claim Accepted"}
                {isRejected && "Claim Rejected"}
                {isReferred && "Claim Referred for Review"}
              </h3>
              <AlertDescription>
                {isAccepted && "Your claim has been approved. Complete the fulfillment process below."}
                {isRejected && "Unfortunately, your claim cannot be processed at this time. This may be due to insufficient documentation or coverage limitations."}
                {isReferred && "Your claim requires additional review by our team. We'll contact you within 2-3 business days."}
              </AlertDescription>
            </div>
          </div>
        </Alert>

        {isAccepted && submittedClaimId && (
          <ClaimFulfillmentFlow
            claimId={submittedClaimId}
            claimType={claimType}
            deviceCategory={insuredDevice?.product_name || itemCategory}
            policyId={selectedPolicy}
            onComplete={() => navigate("/customer/claims")}
          />
        )}

        {!isAccepted && (
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/")} className="flex-1">
              Return to Dashboard
            </Button>
            {isReferred && (
              <Button variant="outline" className="flex-1">
                Contact Support
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Make a Claim</h1>
        <p className="text-muted-foreground mt-1">
          Submit your claim in a few simple steps
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {Array.from({ length: getTotalSteps() }, (_, i) => i).map((s) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border-2 font-semibold text-xs",
                step >= s ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"
              )}>
                {s + 1}
              </div>
              {s < getTotalSteps() - 1 && (
                <div className={cn(
                  "h-0.5 flex-1 mx-1",
                  step > s ? "bg-primary" : "bg-border"
                )} />
              )}
            </div>
          ))}
        </div>
        <div className={cn(
          "grid gap-1 mt-2 text-xs", 
          claimType === "damage" ? "grid-cols-8" : "grid-cols-6"
        )}>
          {Array.from({ length: getTotalSteps() }, (_, i) => i).map((s) => (
            <span key={s} className={cn("text-center", step >= s ? "text-foreground font-medium" : "text-muted-foreground")}>
              {getStepLabel(s)}
            </span>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 0 && "Step 1: Select Policy"}
            {step === 1 && "Step 2: Select Claim Type"}
            {step === 2 && claimType === "breakdown" && "Step 3: Confirm Device"}
            {step === 2 && claimType === "damage" && "Step 3: Upload Photos for AI Analysis"}
            {step === 2 && claimType === "theft" && "Step 3: Details of Stolen/Lost Item"}
            {step === 3 && claimType === "breakdown" && "Step 4: Upload Photos of Fault"}
            {step === 3 && claimType === "damage" && "Step 4: Incident Information"}
            {step === 3 && claimType === "theft" && "Step 4: Incident Details"}
            {step === 4 && claimType === "breakdown" && "Step 5: Fault Details"}
            {step === 4 && claimType === "damage" && "Step 5: Extent of Damage"}
            {step === 4 && claimType === "theft" && "Step 5: Declaration & Signature"}
            {step === 5 && claimType === "breakdown" && "Step 6: Supporting Documentation"}
            {step === 5 && claimType === "damage" && "Step 6: Upload Required Documents"}
            {step === 5 && claimType === "theft" && "Claim Decision"}
            {step === 6 && claimType === "breakdown" && "Claim Decision"}
            {step === 6 && claimType === "damage" && "Step 7: Declaration & Signature"}
            {step === 6 && claimType === "theft" && "Claim Decision"}
            {step === 7 && claimType === "damage" && "Claim Decision"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && claimType === "breakdown" && (
            <BreakdownStep2Device
              insuredDevice={insuredDevice}
              deviceInfoConfirmed={deviceInfoConfirmed}
              setDeviceInfoConfirmed={setDeviceInfoConfirmed}
              claimedDeviceName={claimedDeviceName}
              setClaimedDeviceName={setClaimedDeviceName}
              claimedDeviceModel={claimedDeviceModel}
              setClaimedDeviceModel={setClaimedDeviceModel}
              itemCategory={itemCategory}
              setItemCategory={setItemCategory}
              itemMake={itemMake}
              setItemMake={setItemMake}
              itemModel={itemModel}
              setItemModel={setItemModel}
              itemColor={itemColor}
              setItemColor={setItemColor}
              itemColorOther={itemColorOther}
              setItemColorOther={setItemColorOther}
              itemSerialNumber={itemSerialNumber}
              setItemSerialNumber={setItemSerialNumber}
              purchasePrice={itemPurchasePrice}
              setPurchasePrice={setItemPurchasePrice}
              onBack={() => setStep(1)}
              onContinue={() => setStep(3)}
            />
          )}
          {step === 2 && claimType === "damage" && renderPhotoUploadStep()}
          {step === 2 && claimType === "theft" && renderStep3()}
          {step === 3 && claimType === "breakdown" && (
            <BreakdownStep3Photos
              defectPhotos={defectPhotos}
              setDefectPhotos={setDefectPhotos}
              analyzingDamage={analyzingDamage}
              setAnalyzingDamage={setAnalyzingDamage}
              aiSuggestion={aiSuggestion}
              setAiSuggestion={setAiSuggestion}
              aiGeneratedSeverity={aiGeneratedSeverity}
              setAiGeneratedSeverity={setAiGeneratedSeverity}
              deviceMismatchWarning={deviceMismatchWarning}
              setDeviceMismatchWarning={setDeviceMismatchWarning}
              physicalDamageWarning={physicalDamageWarning}
              setPhysicalDamageWarning={setPhysicalDamageWarning}
              aiPopulatedFields={aiPopulatedFields}
              setAiPopulatedFields={setAiPopulatedFields}
              setSeverityLevel={setSeverityLevel}
              insuredDeviceCategory={insuredDevice?.product_name}
              onBack={() => setStep(2)}
              onContinue={() => setStep(4)}
            />
          )}
          {step === 3 && claimType === "damage" && renderStep3()}
          {step === 3 && claimType === "theft" && renderStep3()}
          {step === 4 && claimType === "breakdown" && (
            <BreakdownStep4FaultDetails
              faultCategory={faultCategory}
              setFaultCategory={setFaultCategory}
              specificIssue={specificIssue}
              setSpecificIssue={setSpecificIssue}
              severityLevel={severityLevel}
              setSeverityLevel={setSeverityLevel}
              problemDate={problemDate}
              setProblemDate={setProblemDate}
              issueFrequency={issueFrequency}
              setIssueFrequency={setIssueFrequency}
              additionalComments={additionalComments}
              setAdditionalComments={setAdditionalComments}
              aiPopulatedFields={aiPopulatedFields}
              aiSuggestion={aiSuggestion}
              onBack={() => setStep(3)}
              onContinue={() => setStep(5)}
              isWithinManufacturerWarranty={isWithinManufacturerWarranty}
              manufacturerWarrantyMonths={manufacturerWarrantyMonths}
              onProblemDateChange={(date) => {
                const selectedPolicyData = policies.find(p => p.id === selectedPolicy);
                const effectivePurchaseDate = insuredDevice?.purchase_date || insuredDevice?.added_date || selectedPolicyData?.start_date || null;
                const withinWarranty = checkManufacturerWarranty(date, effectivePurchaseDate);
                setIsWithinManufacturerWarranty(withinWarranty);
              }}
            />
          )}
          {step === 4 && claimType === "theft" && renderStep4TheftIncident()}
          {step === 4 && claimType === "damage" && renderStep4DamageDetails()}
          {step === 5 && claimType === "breakdown" && (
            <BreakdownStep5Documents
              proofOfOwnership={proofOfOwnership}
              setProofOfOwnership={setProofOfOwnership}
              supportingDocuments={supportingDocuments}
              setSupportingDocuments={setSupportingDocuments}
              uploading={uploading}
              insuredDevice={
                // Use UPDATED device details if user changed them, otherwise use original policy device
                deviceInfoConfirmed === "incorrect" 
                  ? {
                      category: itemCategory || undefined,
                      serial: itemSerialNumber || undefined,
                      rrp: itemPurchasePrice || undefined
                    }
                  : {
                      category: insuredDevice?.product_name,
                      serial: insuredDevice?.serial_number,
                      rrp: insuredDevice?.purchase_price?.toString() || undefined
                    }
              }
              onBack={() => setStep(4)}
              onSubmit={handleSubmit}
            />
          )}
          {step === 5 && claimType === "damage" && (
            <BreakdownStep5Documents
              proofOfOwnership={proofOfOwnership}
              setProofOfOwnership={setProofOfOwnership}
              supportingDocuments={supportingDocuments}
              setSupportingDocuments={setSupportingDocuments}
              uploading={uploading}
              insuredDevice={{
                category: insuredDevice?.product_name,
                serial: insuredDevice?.serial_number,
                rrp: insuredDevice?.purchase_price?.toString() || undefined
              }}
              onBack={() => setStep(4)}
              onSubmit={() => setStep(6)}
            />
          )}
          {step === 5 && claimType === "theft" && renderStep5TheftSignature()}
          {step === 6 && claimType === "breakdown" && renderDecision()}
          {step === 6 && claimType === "damage" && renderStep6DamageSignature()}
          {step === 6 && claimType === "theft" && renderDecision()}
          {step === 7 && claimType === "damage" && renderDecision()}
        </CardContent>
      </Card>
    </div>
  );
}
