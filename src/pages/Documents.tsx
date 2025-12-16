import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Eye } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatStatus } from "@/lib/utils";

export default function Documents() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("");
  const [previewDocument, setPreviewDocument] = useState<any>(null);

  // Fetch user's policies
  const { data: policies, isLoading: policiesLoading } = useQuery({
    queryKey: ["user-policies", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("policies")
        .select("id, policy_number, status, product_id, products(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch documents for selected policy
  const { data: documents, isLoading: documentsLoading } = useQuery({
    queryKey: ["policy-documents", selectedPolicyId],
    queryFn: async () => {
      if (!selectedPolicyId) return [];
      
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("policy_id", selectedPolicyId)
        .eq("document_type", "policy")
        .order("uploaded_date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedPolicyId,
  });

  // Auto-select first policy if only one exists
  useEffect(() => {
    if (policies && policies.length === 1 && !selectedPolicyId) {
      setSelectedPolicyId(policies[0].id);
    }
  }, [policies, selectedPolicyId]);

  const getDocumentContent = (doc: any): string | null => {
    if (!doc?.metadata) return null;
    
    // Handle case where metadata might be a string
    const metadata = typeof doc.metadata === 'string' 
      ? JSON.parse(doc.metadata) 
      : doc.metadata;
    
    return metadata?.content || null;
  };

  const handlePreview = (doc: any) => {
    console.log('Preview document:', doc);
    console.log('Metadata:', doc?.metadata);
    console.log('Content:', getDocumentContent(doc));
    setPreviewDocument(doc);
  };

  const handleDownload = async (doc: any) => {
    const content = getDocumentContent(doc);
    if (content) {
      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(0)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (policiesLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("documents")}</h1>
        <p className="text-muted-foreground mt-1">View and download your policy documents</p>
      </div>

      {/* Policy Selector */}
      {policies && policies.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Policy</CardTitle>
            <CardDescription>Choose which policy's documents you want to view</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedPolicyId} onValueChange={setSelectedPolicyId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a policy" />
              </SelectTrigger>
              <SelectContent>
                {policies.map((policy: any) => (
                  <SelectItem key={policy.id} value={policy.id}>
                    {policy.policy_number} - {policy.products?.name} ({formatStatus(policy.status)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Policy Documents */}
      {selectedPolicyId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Policy Documents
            </CardTitle>
            <CardDescription>
              Documents for policy {policies?.find(p => p.id === selectedPolicyId)?.policy_number}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {documentsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : documents && documents.length > 0 ? (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{doc.document_subtype?.replace(/_/g, " ").toUpperCase()}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatFileSize(doc.file_size)} • {formatDate(doc.uploaded_date)}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handlePreview(doc)}
                        title="Preview document"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDownload(doc)}
                        title="Download document"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No documents available for this policy</p>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedPolicyId && policies && policies.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">Please select a policy to view documents</p>
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewDocument} onOpenChange={() => setPreviewDocument(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {previewDocument?.document_subtype?.replace(/_/g, " ").toUpperCase()}
            </DialogTitle>
            <DialogDescription>
              Policy {policies?.find(p => p.id === selectedPolicyId)?.policy_number}
            </DialogDescription>
          </DialogHeader>
          {(() => {
            const content = getDocumentContent(previewDocument);
            if (content) {
              return (
                <iframe
                  srcDoc={content}
                  className="w-full min-h-[60vh] border-0"
                  title="Document Preview"
                />
              );
            }
            return (
              <p className="text-muted-foreground text-center py-8">
                No preview available for this document
              </p>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
