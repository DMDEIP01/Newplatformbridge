import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle, FileText, Image, Loader2, AlertTriangle, X, Upload, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { analyzeDamageWithAI } from "@/lib/aiAnalysis";
import { toast } from "sonner";

interface BreakdownStep3PhotosProps {
  defectPhotos: File[];
  setDefectPhotos: (files: File[]) => void;
  analyzingDamage: boolean;
  setAnalyzingDamage: (analyzing: boolean) => void;
  aiSuggestion: string | null;
  setAiSuggestion: (suggestion: string | null) => void;
  aiGeneratedSeverity: string | null;
  setAiGeneratedSeverity: (severity: string | null) => void;
  deviceMismatchWarning: string | null;
  setDeviceMismatchWarning: (warning: string | null) => void;
  aiPopulatedFields: Set<string>;
  setAiPopulatedFields: (fields: Set<string>) => void;
  setSeverityLevel: (level: string) => void;
  insuredDeviceCategory?: string;
  physicalDamageWarning: string | null;
  setPhysicalDamageWarning: (warning: string | null) => void;
  onBack: () => void;
  onContinue: () => void;
}

export default function BreakdownStep3Photos({
  defectPhotos,
  setDefectPhotos,
  analyzingDamage,
  setAnalyzingDamage,
  aiSuggestion,
  setAiSuggestion,
  aiGeneratedSeverity,
  setAiGeneratedSeverity,
  deviceMismatchWarning,
  setDeviceMismatchWarning,
  aiPopulatedFields,
  setAiPopulatedFields,
  setSeverityLevel,
  insuredDeviceCategory,
  physicalDamageWarning,
  setPhysicalDamageWarning,
  onBack,
  onContinue,
}: BreakdownStep3PhotosProps) {
  const [deviceMismatchOpen, setDeviceMismatchOpen] = useState(false);
  const [physicalDamageOpen, setPhysicalDamageOpen] = useState(false);
  const [aiAnalysisOpen, setAiAnalysisOpen] = useState(false);
  const [claimTypeMismatchOpen, setClaimTypeMismatchOpen] = useState(false);
  
  const handleRemovePhoto = (indexToRemove: number) => {
    const newPhotos = defectPhotos.filter((_, index) => index !== indexToRemove);
    setDefectPhotos(newPhotos);
    
    // Clear AI analysis state when removing photos
    if (newPhotos.length === 0) {
      setAiSuggestion(null);
      setAiGeneratedSeverity(null);
      setDeviceMismatchWarning(null);
      setPhysicalDamageWarning(null);
      setSeverityLevel("");
      const newPopulatedFields = new Set(aiPopulatedFields);
      newPopulatedFields.delete('severity');
      setAiPopulatedFields(newPopulatedFields);
    }
    
    toast.success("Photo removed");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    setDefectPhotos([...defectPhotos, ...newFiles]);

    // Trigger AI analysis on each new upload
    if (newFiles.length > 0) {
      setAnalyzingDamage(true);
      setAiSuggestion(null);
      setDeviceMismatchWarning(null);
      setPhysicalDamageWarning(null);

      try {
        const result = await analyzeDamageWithAI(newFiles[0], insuredDeviceCategory);
        
        // Set AI-generated severity
        setSeverityLevel(result.severityLevel);
        setAiGeneratedSeverity(result.severityLevel);
        setAiSuggestion(result.suggestion);
        
        // Mark severity as AI-populated
        const newPopulatedFields = new Set(aiPopulatedFields);
        newPopulatedFields.add('severity');
        
        // Count device identification matches for visual feedback
        let deviceMatchCount = 0;
        if (result.deviceCategory && result.deviceCategory !== "Other" && result.deviceCategory !== "Unknown") {
          deviceMatchCount++;
        }
        // Note: We only track device category from this component
        // Brand, model, color are tracked in the parent component
        
        setAiPopulatedFields(newPopulatedFields);

        // Handle device category mismatch
        if (result.deviceMismatch && result.deviceMismatchWarning) {
          setDeviceMismatchWarning(result.deviceMismatchWarning);
        }

        // Handle physical damage detection for Extended Warranty claims
        if (result.hasVisiblePhysicalDamage && result.physicalDamageDescription) {
          setPhysicalDamageWarning(
            `Physical damage detected: ${result.physicalDamageDescription}`
          );
          setClaimTypeMismatchOpen(true);
        }

        toast.success("AI analysis complete - severity level auto-selected");
      } catch (error) {
        console.error("AI analysis failed:", error);
        
        // Show specific error message to user
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMessage.includes("Rate limit")) {
          toast.error("AI rate limit exceeded. Please wait a moment and try again.");
        } else if (errorMessage.includes("credits")) {
          toast.error("AI credits depleted. Please add credits to continue.");
        } else if (errorMessage.includes("not configured")) {
          toast.error("AI service not configured. Please contact support.");
        } else {
          toast.error("AI analysis failed. You can still continue and select severity manually.");
        }
        
        // Set default severity so user can continue
        setSeverityLevel("Medium - Some features not working");
      } finally {
        setAnalyzingDamage(false);
      }
    }
    
    // Reset input so same file can be uploaded again
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Upload clear photos of the fault. AI will verify the device and assess damage severity.
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        <Label className="text-base font-semibold flex items-center gap-2">
          Photos or Videos Showing the Fault
          <Badge variant="destructive" className="text-xs">Required</Badge>
        </Label>
        
        <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
          <Input
            id="defect-photos-upload"
            type="file"
            accept="image/jpeg,image/jpg,image/png,video/mp4"
            onChange={handleFileChange}
            className="hidden"
            multiple
          />
          <Label htmlFor="defect-photos-upload" className="cursor-pointer">
            <div className="flex flex-col items-center gap-2">
              <Image className="h-12 w-12 text-muted-foreground" />
              <div className="font-medium">Click to upload photos/videos</div>
              <div className="text-sm text-muted-foreground">
                JPG, PNG or MP4 (max 5MB each)
              </div>
            </div>
          </Label>
        </div>
        
        {defectPhotos.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">{defectPhotos.length} file(s) selected:</p>
            {defectPhotos.map((file, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm bg-secondary/50 p-3 rounded">
                <FileText className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 truncate">{file.name}</span>
                <span className="text-muted-foreground text-xs">{(file.size / 1024).toFixed(1)} KB</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 flex-shrink-0"
                  onClick={() => handleRemovePhoto(idx)}
                >
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {analyzingDamage && (
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              AI is analyzing the fault... This may take a few seconds.
            </AlertDescription>
          </Alert>
        )}

        {deviceMismatchWarning && (
          <Collapsible open={deviceMismatchOpen} onOpenChange={setDeviceMismatchOpen}>
            <div className="border-2 border-destructive rounded-lg bg-destructive/5">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-destructive/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm text-destructive">Device Category Mismatch</div>
                    <div className="text-xs text-muted-foreground">Action required - Wrong device detected</div>
                  </div>
                </div>
                {deviceMismatchOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-3">
                  <div className="text-sm font-medium text-destructive">
                    {deviceMismatchWarning}
                  </div>
                  <div className="text-xs font-semibold bg-destructive/10 p-2 rounded">
                    This mismatch may delay your claim processing. Please remove the incorrect photo and upload the correct one.
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDefectPhotos([]);
                      setAiSuggestion(null);
                      setAiGeneratedSeverity(null);
                      setDeviceMismatchWarning(null);
                      setPhysicalDamageWarning(null);
                      setSeverityLevel("");
                      const newPopulatedFields = new Set(aiPopulatedFields);
                      newPopulatedFields.delete('severity');
                      setAiPopulatedFields(newPopulatedFields);
                      toast.info("Photos cleared. Please upload the correct device photo.");
                    }}
                    className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Remove All Photos & Upload Correct Device
                  </Button>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}

        {physicalDamageWarning && (
          <>
            <Collapsible open={claimTypeMismatchOpen} onOpenChange={setClaimTypeMismatchOpen}>
              <div className="border-2 border-destructive rounded-lg bg-destructive/5">
                <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-destructive/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-sm text-destructive">Claim Type Mismatch - Physical Damage Detected</div>
                      <div className="text-xs text-muted-foreground">Extended Warranty does not cover physical damage</div>
                    </div>
                  </div>
                  {claimTypeMismatchOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-3">
                    <div className="text-sm font-medium text-destructive">
                      ⚠️ {physicalDamageWarning}
                    </div>
                    <div className="text-sm bg-destructive/10 p-3 rounded space-y-2">
                      <p className="font-semibold">Extended Warranty claims typically cover:</p>
                      <ul className="list-disc ml-5 space-y-1 text-xs">
                        <li>Mechanical or electrical breakdown</li>
                        <li>Manufacturing defects after warranty expires</li>
                        <li>Normal wear and tear failures</li>
                      </ul>
                      <p className="font-semibold mt-3">Extended Warranty does NOT cover:</p>
                      <ul className="list-disc ml-5 space-y-1 text-xs">
                        <li>Physical damage (cracks, dents, scratches)</li>
                        <li>Accidental damage</li>
                        <li>Water or liquid damage</li>
                      </ul>
                    </div>
                    <div className="text-xs font-bold bg-destructive/10 p-2 rounded text-destructive">
                      This claim may be rejected. If your device has physical damage, you may need to file an Accidental Damage claim instead.
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
            
            <Collapsible open={physicalDamageOpen} onOpenChange={setPhysicalDamageOpen}>
              <div className="border-2 border-amber-300 rounded-lg bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
                <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-200 dark:bg-amber-900 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-sm text-amber-900 dark:text-amber-100">Physical Damage Details</div>
                      <div className="text-xs text-amber-700 dark:text-amber-300">View AI damage assessment</div>
                    </div>
                  </div>
                  {physicalDamageOpen ? (
                    <ChevronUp className="h-5 w-5 text-amber-600" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-amber-600" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4">
                    <div className="text-sm font-medium text-amber-900 dark:text-amber-100">
                      {physicalDamageWarning}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </>
        )}

        {aiSuggestion && !deviceMismatchWarning && !physicalDamageWarning && (
          <Collapsible open={aiAnalysisOpen} onOpenChange={setAiAnalysisOpen}>
            <div className="border-2 border-green-300 rounded-lg bg-green-50 dark:bg-green-950 dark:border-green-800">
              <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-green-100 dark:hover:bg-green-900 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-200 dark:bg-green-900 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm text-green-900 dark:text-green-100">AI Analysis Complete</div>
                    <div className="text-xs text-green-700 dark:text-green-300">Severity level auto-selected • Tap to view details</div>
                  </div>
                </div>
                {aiAnalysisOpen ? (
                  <ChevronUp className="h-5 w-5 text-green-600" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-green-600" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-2">
                  <div className="text-sm text-green-900 dark:text-green-100">
                    <strong>Analysis:</strong> {aiSuggestion}
                  </div>
                  {aiGeneratedSeverity && (
                    <div className="text-sm bg-green-100 dark:bg-green-900 p-2 rounded">
                      <strong>Auto-selected severity:</strong> {aiGeneratedSeverity}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button 
          onClick={onContinue}
          disabled={defectPhotos.length === 0 || analyzingDamage}
          className="flex-1"
        >
          {analyzingDamage ? "Analyzing..." : "Continue"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
