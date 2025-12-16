import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Image as ImageIcon, FileText, Wrench, DollarSign, AlertTriangle, CheckCircle2, XCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RepairCost {
  id: string;
  cost_type: string;
  description: string;
  amount: number;
  units?: number;
  created_at: string;
}

interface Fulfillment {
  id: string;
  inspection_notes: string | null;
  inspection_photos: string[] | null;
  repairer_report: string[] | null;
  quote_amount: number | null;
  device_value?: number | null;
  quote_status: string | null;
  quote_rejection_reason: string | null;
  status: string;
  repairers?: {
    name: string;
    company_name: string;
  } | null;
}

interface InspectionDetailsSectionProps {
  fulfillment: Fulfillment;
  repairCosts?: RepairCost[];
}

export default function InspectionDetailsSection({
  fulfillment,
  repairCosts = [],
}: InspectionDetailsSectionProps) {
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [reportUrls, setReportUrls] = useState<{ url: string; name: string; isPdf: boolean }[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (fulfillment.inspection_photos && fulfillment.inspection_photos.length > 0) {
      loadPhotos();
    }
  }, [fulfillment.inspection_photos]);

  useEffect(() => {
    if (fulfillment.repairer_report && fulfillment.repairer_report.length > 0) {
      loadReports();
    }
  }, [fulfillment.repairer_report]);

  const loadPhotos = async () => {
    if (!fulfillment.inspection_photos || fulfillment.inspection_photos.length === 0) return;
    
    setLoadingPhotos(true);
    try {
      const urls: string[] = [];
      for (const path of fulfillment.inspection_photos) {
        const { data } = await supabase.storage
          .from('inspection-photos')
          .createSignedUrl(path, 3600);

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
    if (!fulfillment.repairer_report || fulfillment.repairer_report.length === 0) return;
    
    setLoadingReports(true);
    try {
      const reports: { url: string; name: string; isPdf: boolean }[] = [];
      for (const path of fulfillment.repairer_report) {
        const { data } = await supabase.storage
          .from('inspection-photos')
          .createSignedUrl(path, 3600);

        if (data?.signedUrl) {
          const fileName = path.split('/').pop() || 'report';
          const isPdf = path.toLowerCase().endsWith('.pdf');
          reports.push({ url: data.signedUrl, name: fileName, isPdf });
        }
      }
      setReportUrls(reports);
    } catch (error: any) {
      console.error("Failed to load reports:", error);
    } finally {
      setLoadingReports(false);
    }
  };

  const totalCosts = repairCosts.reduce((sum, cost) => sum + cost.amount, 0);
  const repairerName = fulfillment.repairers?.name || fulfillment.repairers?.company_name || "Unknown Repairer";

  return (
    <div className="border-t pt-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Inspection Details</h3>
        {fulfillment.quote_status === "approved" && (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Quote Approved
          </Badge>
        )}
        {fulfillment.quote_status === "rejected" && (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Quote Rejected
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Repairer: {repairerName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quote Amount */}
          {fulfillment.quote_amount && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                <span className="text-sm font-medium">Approved Quote Amount</span>
                {fulfillment.device_value && fulfillment.device_value > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Device value: €{fulfillment.device_value.toFixed(2)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-lg font-bold px-4 py-2">
                  €{fulfillment.quote_amount.toFixed(2)}
                </Badge>
                {fulfillment.device_value && fulfillment.device_value > 0 && (
                  <Badge 
                    variant={((fulfillment.quote_amount / fulfillment.device_value) * 100) > 80 ? "destructive" : ((fulfillment.quote_amount / fulfillment.device_value) * 100) > 50 ? "secondary" : "default"}
                    className="text-sm px-3 py-2"
                  >
                    {((fulfillment.quote_amount / fulfillment.device_value) * 100).toFixed(0)}%
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Rejection Reason if rejected */}
          {fulfillment.quote_status === "rejected" && fulfillment.quote_rejection_reason && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <Label className="text-destructive text-xs">Rejection Reason</Label>
              <p className="text-sm mt-1">{fulfillment.quote_rejection_reason}</p>
            </div>
          )}

          {/* Cost Breakdown */}
          {repairCosts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <Label className="text-base font-semibold">Cost Breakdown</Label>
              </div>
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
            </div>
          )}

          {/* Inspection Report */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <Label className="text-base font-semibold">Inspection Report</Label>
            </div>
            {fulfillment.inspection_notes ? (
              <div className="p-4 bg-muted/30 rounded-lg border">
                <p className="whitespace-pre-wrap text-sm">{fulfillment.inspection_notes}</p>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                <span className="text-sm text-amber-700 dark:text-amber-400">No inspection report provided</span>
              </div>
            )}
          </div>

          {/* Inspection Photos */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
              <Label className="text-base font-semibold">
                Inspection Photos 
                {fulfillment.inspection_photos && fulfillment.inspection_photos.length > 0 && 
                  ` (${fulfillment.inspection_photos.length})`}
              </Label>
            </div>
            {fulfillment.inspection_photos && fulfillment.inspection_photos.length > 0 ? (
              loadingPhotos ? (
                <div className="text-sm text-muted-foreground p-4 text-center border rounded-lg">
                  Loading photos...
                </div>
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
                <span className="text-sm text-amber-700 dark:text-amber-400">No device photos provided</span>
              </div>
            )}
          </div>

          {/* Repairer Report Files */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <Label className="text-base font-semibold">
                Repairer Report Files
                {fulfillment.repairer_report && fulfillment.repairer_report.length > 0 && 
                  ` (${fulfillment.repairer_report.length})`}
              </Label>
            </div>
            {fulfillment.repairer_report && fulfillment.repairer_report.length > 0 ? (
              loadingReports ? (
                <div className="text-sm text-muted-foreground p-4 text-center border rounded-lg">
                  Loading report files...
                </div>
              ) : reportUrls.length > 0 ? (
                <div className="space-y-2">
                  {reportUrls.map((report, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {report.isPdf ? (
                          <FileText className="h-8 w-8 text-red-500" />
                        ) : (
                          <img 
                            src={report.url} 
                            alt={`Report ${index + 1}`}
                            className="h-12 w-12 object-cover rounded cursor-pointer"
                            onClick={() => setSelectedPhoto(report.url)}
                          />
                        )}
                        <span className="text-sm font-medium truncate max-w-[200px]">{report.name}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a href={report.url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" />
                          {report.isPdf ? "Open PDF" : "View"}
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadReports}
                  disabled={loadingReports}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Load Report Files
                </Button>
              )
            ) : (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                <span className="text-sm text-amber-700 dark:text-amber-400">No repairer report files provided</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
}
