import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertCircle, ArrowLeft, ArrowRight, FileText, Upload, CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp, X } from "lucide-react";
import { analyzeReceipt, ReceiptAnalysisResult } from "@/lib/receiptAnalysis";
import { toast } from "sonner";

interface BreakdownStep5DocumentsProps {
  proofOfOwnership: File[];
  setProofOfOwnership: (files: File[]) => void;
  supportingDocuments: File[];
  setSupportingDocuments: (files: File[]) => void;
  uploading: boolean;
  insuredDevice?: {
    category?: string;
    serial?: string;
    rrp?: string;
  };
  onBack: () => void;
  onSubmit: () => void;
}

export default function BreakdownStep5Documents({
  proofOfOwnership,
  setProofOfOwnership,
  supportingDocuments,
  setSupportingDocuments,
  uploading,
  insuredDevice,
  onBack,
  onSubmit,
}: BreakdownStep5DocumentsProps) {
  const [analyzingReceipt, setAnalyzingReceipt] = useState(false);
  const [receiptAnalysis, setReceiptAnalysis] = useState<ReceiptAnalysisResult | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(true);

  const handleProofFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    console.log('Files selected:', files ? files.length : 0);
    
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      console.log('File details:', newFiles.map(f => ({ name: f.name, type: f.type, size: f.size })));
      
      setProofOfOwnership([...proofOfOwnership, ...newFiles]);

      // Trigger AI analysis on first image or PDF file uploaded
      const analyzableFile = newFiles.find(f => {
        const isImage = f.type.startsWith('image/');
        const isPdf = f.type === 'application/pdf';
        console.log(`File ${f.name}: type="${f.type}", isImage=${isImage}, isPdf=${isPdf}`);
        return isImage || isPdf;
      });
      
      if (analyzableFile && !analyzingReceipt) {
        console.log('✓ Starting receipt analysis for:', analyzableFile.name, 'Type:', analyzableFile.type);
        console.log('✓ Insured device:', insuredDevice);
        
        setAnalyzingReceipt(true);
        setReceiptAnalysis(null);
        toast.loading("Analyzing receipt with AI...", { id: 'receipt-analysis' });

        try {
          const result = await analyzeReceipt(analyzableFile, insuredDevice);
          console.log('✓ Receipt analysis result:', result);
          setReceiptAnalysis(result);
          
          toast.dismiss('receipt-analysis');
          if (result.allFieldsFound) {
            toast.success("Receipt analyzed - all required information found");
          } else {
            toast.warning("Some information could not be extracted from receipt");
          }
        } catch (error) {
          console.error('✗ Receipt analysis failed:', error);
          toast.dismiss('receipt-analysis');
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          
          if (errorMessage.includes("Rate limit")) {
            toast.error("AI rate limit exceeded. Please wait and try again.");
          } else if (errorMessage.includes("credits")) {
            toast.error("AI credits depleted. Please add credits to continue.");
          } else {
            toast.error("Receipt analysis failed: " + errorMessage);
          }
        } finally {
          setAnalyzingReceipt(false);
        }
      } else if (!analyzableFile) {
        console.log('✗ No analyzable file found in upload. File types:', newFiles.map(f => f.type));
      } else if (analyzingReceipt) {
        console.log('✗ Already analyzing a receipt, skipping...');
      }
    }
  };

  const handleRemoveProof = (indexToRemove: number) => {
    const newFiles = proofOfOwnership.filter((_, index) => index !== indexToRemove);
    setProofOfOwnership(newFiles);
    
    // Clear analysis if no receipts left
    if (newFiles.length === 0) {
      setReceiptAnalysis(null);
    }
    
    toast.success("File removed");
  };

  const handleSupportingFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSupportingDocuments([...supportingDocuments, ...Array.from(files)]);
    }
  };

  const handleRemoveSupporting = (indexToRemove: number) => {
    const newFiles = supportingDocuments.filter((_, index) => index !== indexToRemove);
    setSupportingDocuments(newFiles);
    toast.success("File removed");
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Upload proof of ownership and any other supporting documents for your claim
        </AlertDescription>
      </Alert>

      {/* Proof of Ownership - Mandatory */}
      <div className="space-y-3">
        <Label className="text-base font-semibold flex items-center gap-2">
          Proof of Ownership (Receipt/Invoice)
          <Badge variant="destructive" className="text-xs">Required</Badge>
        </Label>
        
        <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
          <Input
            id="proof-upload"
            type="file"
            accept="image/jpeg,image/jpg,image/png,application/pdf"
            onChange={handleProofFileChange}
            className="hidden"
            multiple
          />
          <Label htmlFor="proof-upload" className="cursor-pointer">
            <div className="flex flex-col items-center gap-2">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <div className="font-medium">Click to upload receipt/invoice</div>
              <div className="text-sm text-muted-foreground">
                JPG, PNG or PDF • AI will verify device details
              </div>
            </div>
          </Label>
        </div>
        
        {proofOfOwnership.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">{proofOfOwnership.length} file(s) selected:</p>
            {proofOfOwnership.map((file, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm bg-secondary/50 p-3 rounded">
                <FileText className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 truncate">{file.name}</span>
                <span className="text-muted-foreground text-xs">{(file.size / 1024).toFixed(1)} KB</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 flex-shrink-0"
                  onClick={() => handleRemoveProof(idx)}
                >
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {analyzingReceipt && (
          <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              AI is analyzing the receipt... This may take a few seconds.
            </AlertDescription>
          </Alert>
        )}

        {receiptAnalysis && (() => {
          // Count verified fields (those that match expected values - green ticks)
          const verifiedCount = [
            receiptAnalysis.validation.deviceCategory.matches,
            receiptAnalysis.validation.serialNumber.matches,
            receiptAnalysis.validation.rrp.matches,
            receiptAnalysis.validation.dateOfSale.found // Date always counts if found
          ].filter(Boolean).length;
          
          // Determine color: green (4), amber (2-3), red (0-1)
          const colorClass = verifiedCount === 4 
            ? 'green' 
            : verifiedCount >= 2 
              ? 'amber' 
              : 'red';
          
          const borderColors = {
            green: 'border-green-300 bg-green-50 dark:bg-green-950 dark:border-green-800',
            amber: 'border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-800',
            red: 'border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800'
          };
          
          const hoverColors = {
            green: 'hover:bg-green-100 dark:hover:bg-green-900',
            amber: 'hover:bg-amber-100 dark:hover:bg-amber-900',
            red: 'hover:bg-red-100 dark:hover:bg-red-900'
          };
          
          const iconBgColors = {
            green: 'bg-green-200 dark:bg-green-900',
            amber: 'bg-amber-200 dark:bg-amber-900',
            red: 'bg-red-200 dark:bg-red-900'
          };
          
          const iconColors = {
            green: 'text-green-600 dark:text-green-400',
            amber: 'text-amber-600 dark:text-amber-400',
            red: 'text-red-600 dark:text-red-400'
          };
          
          const textColors = {
            green: 'text-green-900 dark:text-green-100',
            amber: 'text-amber-900 dark:text-amber-100',
            red: 'text-red-900 dark:text-red-100'
          };
          
          const subtextColors = {
            green: 'text-green-700 dark:text-green-300',
            amber: 'text-amber-700 dark:text-amber-300',
            red: 'text-red-700 dark:text-red-300'
          };
          
          const statusText = verifiedCount === 4 
            ? 'All information verified' 
            : verifiedCount >= 2 
              ? `${verifiedCount} of 4 fields verified` 
              : 'Insufficient information';
          
          return (
            <Collapsible open={analysisOpen} onOpenChange={setAnalysisOpen}>
              <div className={`border-2 rounded-lg ${borderColors[colorClass]}`}>
                <CollapsibleTrigger className={`w-full p-4 flex items-center justify-between transition-colors ${hoverColors[colorClass]}`}>
                  <div className="flex items-center gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${iconBgColors[colorClass]}`}>
                      {verifiedCount === 4 ? (
                        <CheckCircle className={`h-5 w-5 ${iconColors[colorClass]}`} />
                      ) : verifiedCount >= 2 ? (
                        <AlertCircle className={`h-5 w-5 ${iconColors[colorClass]}`} />
                      ) : (
                        <XCircle className={`h-5 w-5 ${iconColors[colorClass]}`} />
                      )}
                    </div>
                    <div className="text-left">
                      <div className={`font-bold text-sm ${textColors[colorClass]}`}>
                        Receipt Analysis Complete
                      </div>
                      <div className={`text-xs ${subtextColors[colorClass]}`}>
                        {statusText} • Tap to view details
                      </div>
                    </div>
                  </div>
                  {analysisOpen ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-3">
                  <div className="space-y-2">
                    {/* Device Category */}
                    <div className="flex items-center justify-between p-2 bg-background/50 rounded">
                      <span className="text-sm font-medium">Device Category</span>
                      <div className="flex items-center gap-2">
                        {receiptAnalysis.validation.deviceCategory.found ? (
                          <>
                            <span className="text-sm">{receiptAnalysis.deviceCategory}</span>
                            {receiptAnalysis.validation.deviceCategory.matches ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-amber-600" />
                            )}
                          </>
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    </div>

                    {/* Serial Number */}
                    <div className="flex items-center justify-between p-2 bg-background/50 rounded">
                      <span className="text-sm font-medium">Serial Number</span>
                      <div className="flex items-center gap-2">
                        {receiptAnalysis.validation.serialNumber.found ? (
                          <>
                            <span className="text-sm truncate max-w-[150px]">{receiptAnalysis.serialNumber}</span>
                            {receiptAnalysis.validation.serialNumber.matches ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-amber-600" />
                            )}
                          </>
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    </div>

                    {/* RRP */}
                    <div className="flex items-center justify-between p-2 bg-background/50 rounded">
                      <span className="text-sm font-medium">Price (RRP)</span>
                      <div className="flex items-center gap-2">
                        {receiptAnalysis.validation.rrp.found ? (
                          <>
                            <span className="text-sm">£{receiptAnalysis.rrp}</span>
                            {receiptAnalysis.validation.rrp.matches ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-amber-600" />
                            )}
                          </>
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    </div>

                    {/* Date of Sale */}
                    <div className="flex items-center justify-between p-2 bg-background/50 rounded">
                      <span className="text-sm font-medium">Date of Sale</span>
                      <div className="flex items-center gap-2">
                        {receiptAnalysis.validation.dateOfSale.found ? (
                          <>
                            <span className="text-sm">{receiptAnalysis.dateOfSale}</span>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </>
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    </div>
                  </div>

                  {verifiedCount < 4 && (
                    <div className={`text-xs p-2 rounded ${
                      verifiedCount >= 2 
                        ? 'bg-amber-100 dark:bg-amber-900' 
                        : 'bg-red-100 dark:bg-red-900'
                    }`}>
                      {verifiedCount >= 2 
                        ? 'Some information couldn\'t be extracted. Please ensure your receipt is clear and readable.'
                        : 'Most information is missing from the receipt. Please upload a clearer image.'}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
          );
        })()}
      </div>

      {/* Other Supporting Documents - Optional */}
      <div className="space-y-3">
        <Label className="text-base font-semibold flex items-center gap-2">
          Other Supporting Documents
          <span className="text-muted-foreground font-normal text-sm">(Optional)</span>
        </Label>
        
        <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
          <Input
            id="supporting-upload"
            type="file"
            accept="image/jpeg,image/jpg,image/png,application/pdf"
            onChange={handleSupportingFileChange}
            className="hidden"
            multiple
          />
          <Label htmlFor="supporting-upload" className="cursor-pointer">
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div className="font-medium">Click to upload additional documents</div>
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
              <div key={idx} className="flex items-center gap-2 text-sm bg-secondary/50 p-3 rounded">
                <FileText className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1 truncate">{file.name}</span>
                <span className="text-muted-foreground text-xs">{(file.size / 1024).toFixed(1)} KB</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 flex-shrink-0"
                  onClick={() => handleRemoveSupporting(idx)}
                >
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button 
          onClick={onSubmit}
          disabled={proofOfOwnership.length === 0 || uploading}
          className="flex-1"
        >
          {uploading ? "Submitting..." : "Submit Claim"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
