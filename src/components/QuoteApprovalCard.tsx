import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Image as ImageIcon, FileText, Wrench, DollarSign, AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface RepairCost {
  id: string;
  cost_type: string;
  description: string;
  amount: number;
  units?: number;
  created_at: string;
}

interface QuoteApprovalCardProps {
  fulfillmentId: string;
  claimId: string;
  claimNumber: string;
  repairerName: string;
  quoteAmount: number;
  deviceValue?: number | null;
  inspectionNotes: string;
  inspectionPhotos: string[] | null;
  repairerReport?: string[] | null;
  repairCosts?: RepairCost[];
  onApprove: () => void;
  onReject: () => void;
}

export default function QuoteApprovalCard({
  fulfillmentId,
  claimId,
  claimNumber,
  repairerName,
  quoteAmount,
  deviceValue,
  inspectionNotes,
  inspectionPhotos,
  repairerReport,
  repairCosts = [],
  onApprove,
  onReject,
}: QuoteApprovalCardProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [berFulfillmentType, setBerFulfillmentType] = useState<"ber_cash" | "ber_voucher">("ber_cash");
  const [berValue, setBerValue] = useState<string>("");
  const [reportUrls, setReportUrls] = useState<{url: string, name: string}[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);

  // Auto-load photos and reports when component mounts
  useEffect(() => {
    if (inspectionPhotos && inspectionPhotos.length > 0) {
      loadPhotos();
    }
  }, [inspectionPhotos]);

  useEffect(() => {
    if (repairerReport && repairerReport.length > 0) {
      loadReports();
    }
  }, [repairerReport]);

  const loadPhotos = async () => {
    if (!inspectionPhotos || inspectionPhotos.length === 0) return;
    
    setLoadingPhotos(true);
    try {
      const urls: string[] = [];
      for (const path of inspectionPhotos) {
        const { data } = await supabase.storage
          .from('inspection-photos')
          .createSignedUrl(path, 3600); // 1 hour expiry

        if (data?.signedUrl) {
          urls.push(data.signedUrl);
        }
      }
      setPhotoUrls(urls);
    } catch (error: any) {
      console.error("Failed to load photos:", error);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const loadReports = async () => {
    if (!repairerReport || repairerReport.length === 0) return;
    
    setLoadingReports(true);
    try {
      const reports: {url: string, name: string}[] = [];
      
      for (const path of repairerReport) {
        // Use public URL since bucket is now public
        const { data } = supabase.storage
          .from('inspection-photos')
          .getPublicUrl(path);

        if (data?.publicUrl) {
          console.log("PDF public URL:", data.publicUrl);
          const fileName = path.split('/').pop() || 'Report';
          reports.push({ url: data.publicUrl, name: fileName });
        }
      }
      setReportUrls(reports);
    } catch (error: any) {
      console.error("Failed to load reports:", error);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleApprove = async () => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("claim_fulfillment")
        .update({
          quote_status: "approved",
          status: "quote_approved",
          updated_at: new Date().toISOString(),
        })
        .eq("id", fulfillmentId);

      if (error) throw error;

      toast.success("Quote approved");
      onApprove();
    } catch (error: any) {
      toast.error("Failed to approve quote: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    if (!berValue || parseFloat(berValue) <= 0) {
      toast.error("Please enter a valid settlement value");
      return;
    }

    setProcessing(true);
    try {
      // Update claim_fulfillment with BER details and close it
      const { error: fulfillmentError } = await supabase
        .from("claim_fulfillment")
        .update({
          quote_status: "rejected",
          quote_rejection_reason: rejectionReason,
          fulfillment_type: berFulfillmentType,
          status: "completed",
          ber_reason: `Quote rejected - Settlement: €${parseFloat(berValue).toFixed(2)} via ${berFulfillmentType === "ber_cash" ? "Cash" : "Voucher"}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", fulfillmentId);

      if (fulfillmentError) throw fulfillmentError;

      // Update claim status to closed
      const { error: claimError } = await supabase
        .from("claims")
        .update({
          status: "closed",
          decision: "settled",
          decision_reason: `BER Settlement: €${parseFloat(berValue).toFixed(2)} (${berFulfillmentType === "ber_cash" ? "Cash" : "Voucher"}) - ${rejectionReason}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", claimId);

      if (claimError) throw claimError;

      toast.success("Quote rejected and claim settled with BER");
      onReject();
    } catch (error: any) {
      toast.error("Failed to process: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const totalCosts = repairCosts.reduce((sum, cost) => sum + cost.amount, 0);

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Quote Approval Required</CardTitle>
            <CardDescription>Claim: {claimNumber}</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-lg font-bold px-4 py-2">
              €{quoteAmount.toFixed(2)}
            </Badge>
            {deviceValue != null && deviceValue > 0 ? (
              <Badge 
                variant={((quoteAmount / deviceValue) * 100) > 80 ? "destructive" : ((quoteAmount / deviceValue) * 100) > 50 ? "secondary" : "default"}
                className="text-sm px-3 py-2"
              >
                {((quoteAmount / deviceValue) * 100).toFixed(0)}% of device value
              </Badge>
            ) : null}
          </div>
        </div>
        {deviceValue != null && deviceValue > 0 ? (
          <p className="text-xs text-muted-foreground mt-2">
            Device value: €{deviceValue.toFixed(2)}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Repairer Info */}
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Wrench className="h-5 w-5 text-muted-foreground" />
          <div>
            <Label className="text-muted-foreground text-xs">Repairer</Label>
            <p className="font-medium">{repairerName}</p>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <Label className="text-base font-semibold">Cost Breakdown</Label>
          </div>
          {repairCosts.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repairCosts.map((cost) => (
                    <TableRow key={cost.id}>
                      <TableCell className="capitalize font-medium">
                        {cost.cost_type.replace(/_/g, " ")}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {cost.description}
                      </TableCell>
                      <TableCell className="text-right">
                        {cost.units || 1}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        €{cost.amount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/30 font-bold">
                    <TableCell colSpan={3} className="text-right">
                      Total
                    </TableCell>
                    <TableCell className="text-right text-primary">
                      €{totalCosts.toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
              <span className="text-sm text-amber-700 dark:text-amber-400">No cost breakdown provided by repairer</span>
            </div>
          )}
        </div>

        {/* Inspection Notes */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <Label className="text-base font-semibold">Inspection Report</Label>
          </div>
          {inspectionNotes ? (
            <div className="p-4 bg-muted/30 rounded-lg border">
              <p className="whitespace-pre-wrap text-sm">{inspectionNotes}</p>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
              <span className="text-sm text-amber-700 dark:text-amber-400">No inspection report provided by repairer</span>
            </div>
          )}
        </div>

        {/* Inspection Photos */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
            <Label className="text-base font-semibold">
              Inspection Photos
              {inspectionPhotos && inspectionPhotos.length > 0 && ` (${inspectionPhotos.length})`}
            </Label>
          </div>
          {inspectionPhotos && inspectionPhotos.length > 0 ? (
            loadingPhotos ? (
              <div className="text-sm text-muted-foreground p-4 text-center border rounded-lg">Loading photos...</div>
            ) : photoUrls.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {photoUrls.map((url, index) => (
                  <div 
                    key={index} 
                    className="relative cursor-pointer group"
                    onClick={() => setSelectedPhoto(url)}
                  >
                    <img
                      src={url}
                      alt={`Inspection ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border hover:border-primary transition-colors"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <span className="text-white text-sm font-medium">View Full</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={loadPhotos}
                disabled={loadingPhotos}
              >
                <ImageIcon className="h-4 w-4 mr-2" />
                Load Photos
              </Button>
            )
          ) : (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
              <span className="text-sm text-amber-700 dark:text-amber-400">No inspection photos provided by repairer</span>
            </div>
          )}
        </div>

        {/* Photo Modal */}
        {selectedPhoto && (
          <div 
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <img
                src={selectedPhoto}
                alt="Inspection photo"
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => setSelectedPhoto(null)}
              >
                Close
              </Button>
            </div>
          </div>
        )}

        {/* Repairer Report Documents */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <Label className="text-base font-semibold">
              Repairer Documents
              {repairerReport && repairerReport.length > 0 && ` (${repairerReport.length})`}
            </Label>
          </div>
          {repairerReport && repairerReport.length > 0 ? (
            loadingReports ? (
              <div className="text-sm text-muted-foreground p-4 text-center border rounded-lg">Loading documents...</div>
            ) : reportUrls.length > 0 ? (
              <div className="space-y-2">
                {reportUrls.map((report, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {report.name}
                      </p>
                      <p className="text-xs text-muted-foreground">PDF Document</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log("Opening preview for:", report.url);
                          setSelectedPdf(report.url);
                        }}
                      >
                        Preview
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(report.url);
                          toast.success("URL copied! Paste in a new browser tab to view the PDF");
                        }}
                      >
                        Copy URL
                      </Button>
                      <a
                        href={report.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-9 px-3"
                      >
                        Open
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                <span className="text-sm text-amber-700 dark:text-amber-400">Unable to load documents</span>
              </div>
            )
          ) : (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
              <span className="text-sm text-amber-700 dark:text-amber-400">No documents provided by repairer</span>
            </div>
          )}
        </div>

        {/* PDF Preview Modal */}
        {selectedPdf && (
          <div 
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPdf(null)}
          >
            <div className="relative w-full max-w-5xl h-[90vh] bg-white rounded-lg overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center p-4 border-b bg-background">
                <span className="font-medium">PDF Preview</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(selectedPdf, '_blank')}
                  >
                    Open in New Tab
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedPdf(null)}
                  >
                    Close
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden relative">
                <iframe
                  src={selectedPdf}
                  className="w-full h-full border-0"
                  title="PDF Preview"
                  onError={() => console.log("PDF iframe failed to load")}
                />
                {/* Fallback overlay - shown if PDF doesn't load */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/90 opacity-0 pointer-events-none" id="pdf-fallback">
                  <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">Unable to preview PDF</p>
                  <Button onClick={() => window.open(selectedPdf, '_blank')}>
                    Open in New Tab
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!showRejectForm ? (
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleApprove}
              disabled={processing}
              className="flex-1"
              size="lg"
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Approve Quote
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowRejectForm(true)}
              disabled={processing}
              className="flex-1"
              size="lg"
            >
              <XCircle className="h-5 w-5 mr-2" />
              Reject Quote
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-4 border-t">
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">
                BER Settlement Required
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Since the repair quote is being rejected, please select a settlement method to close this claim.
              </p>
            </div>

            <div>
              <Label className="text-base font-semibold mb-3 block">Settlement Method</Label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setBerFulfillmentType("ber_cash")}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    berFulfillmentType === "ber_cash"
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      berFulfillmentType === "ber_cash" ? "border-primary" : "border-muted-foreground"
                    }`}>
                      {berFulfillmentType === "ber_cash" && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <span className="font-medium">BER - Cash</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    Customer receives cash settlement
                  </p>
                </div>
                <div
                  onClick={() => setBerFulfillmentType("ber_voucher")}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    berFulfillmentType === "ber_voucher"
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      berFulfillmentType === "ber_voucher" ? "border-primary" : "border-muted-foreground"
                    }`}>
                      {berFulfillmentType === "ber_voucher" && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <span className="font-medium">BER - Voucher</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    Customer receives store voucher
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label>Settlement Value (€)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={berValue}
                onChange={(e) => setBerValue(e.target.value)}
                placeholder="Enter settlement amount..."
                className="mt-1"
              />
              {deviceValue && deviceValue > 0 && berValue && parseFloat(berValue) > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {((parseFloat(berValue) / deviceValue) * 100).toFixed(0)}% of device value (€{deviceValue.toFixed(2)})
                </p>
              )}
            </div>

            <div>
              <Label>Rejection Reason</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why the quote is being rejected and BER settlement is chosen..."
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={processing || !berValue || parseFloat(berValue) <= 0}
                className="flex-1"
              >
                {processing ? "Processing..." : "Update Claim & Close"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectForm(false);
                  setRejectionReason("");
                  setBerValue("");
                  setBerFulfillmentType("ber_cash");
                }}
                disabled={processing}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
