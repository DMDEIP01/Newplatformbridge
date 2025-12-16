import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FileText, Download, Loader2, Eye, X } from "lucide-react";
import { toast } from "sonner";

interface Document {
  id: string;
  file_name: string;
  file_path: string;
  document_subtype: string;
  uploaded_date: string;
  metadata?: any;
}

interface PolicyDocumentsCardProps {
  policyId: string;
  customerEmail: string;
}

export default function PolicyDocumentsCard({ policyId, customerEmail }: PolicyDocumentsCardProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [policyId]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id, file_name, file_path, document_subtype, uploaded_date, metadata')
        .eq('policy_id', policyId)
        .eq('document_type', 'policy')
        .order('uploaded_date', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const getDocumentContent = (doc: Document): string | null => {
    const metadata = doc.metadata as any;
    return metadata?.content || null;
  };

  const handlePreview = (doc: Document) => {
    const content = getDocumentContent(doc);
    if (!content) {
      toast.error('Document content not available for preview');
      return;
    }
    setPreviewDoc(doc);
    setPreviewOpen(true);
  };

  const handleDownload = async (doc: Document) => {
    try {
      // Get HTML content from metadata
      const htmlContent = getDocumentContent(doc);

      if (!htmlContent) {
        toast.error('Document content not available');
        return;
      }

      // Create blob and download
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Document downloaded');
    } catch (error: any) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const getDocumentLabel = (subtype: string) => {
    const labels: Record<string, string> = {
      ipid: 'IPID',
      terms_conditions: 'Terms & Conditions',
      policy_schedule: 'Policy Schedule',
      receipt: 'Receipt',
      other: 'Document',
    };
    return labels[subtype] || 'Document';
  };

  const formatDocumentContent = (content: string): string => {
    // If content is already HTML, return as-is
    if (content.includes('<html') || content.includes('<!DOCTYPE')) {
      return content;
    }
    
    // Convert plain text to styled HTML
    const lines = content.split('\n');
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; }
          h1 { color: #E31E24; border-bottom: 2px solid #E31E24; padding-bottom: 10px; }
          h2 { color: #333; margin-top: 30px; }
          .section { margin-bottom: 20px; }
          .info-block { background: #f8f8f8; padding: 15px; border-left: 4px solid #E31E24; margin: 15px 0; }
          .highlight { color: #E31E24; font-weight: bold; }
        </style>
      </head>
      <body>
    `;
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) {
        html += '<br>';
      } else if (trimmed.match(/^[A-Z\s&]+$/)) {
        // All caps = heading
        html += `<h1>${trimmed}</h1>`;
      } else if (trimmed.match(/^=+$/)) {
        // Skip separator lines
      } else if (trimmed.startsWith('✓') || trimmed.startsWith('✗') || trimmed.startsWith('!')) {
        html += `<p>${trimmed}</p>`;
      } else if (trimmed.includes(':') && !trimmed.startsWith('http')) {
        const [label, ...rest] = trimmed.split(':');
        html += `<p><strong>${label}:</strong>${rest.join(':')}</p>`;
      } else if (trimmed.match(/^\d+\./)) {
        html += `<p>${trimmed}</p>`;
      } else {
        html += `<p>${trimmed}</p>`;
      }
    });
    
    html += '</body></html>';
    return html;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Policy Documents</CardTitle>
          <CardDescription>
            View and download policy documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No documents available</p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{getDocumentLabel(doc.document_subtype)}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(doc.uploaded_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(doc)}
                      disabled={!getDocumentContent(doc)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full-screen Document Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[100vw] w-[100vw] max-h-[100vh] h-[100vh] p-0 rounded-none">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-lg font-semibold">
                    {previewDoc ? getDocumentLabel(previewDoc.document_subtype) : 'Document Preview'}
                  </h2>
                  {previewDoc && (
                    <p className="text-sm text-muted-foreground">
                      {previewDoc.file_name}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {previewDoc && (
                  <Button variant="outline" size="sm" onClick={() => handleDownload(previewDoc)}>
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => setPreviewOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            {/* Document Preview Content */}
            <div className="flex-1 overflow-hidden bg-muted/30">
              {previewDoc && getDocumentContent(previewDoc) && (
                <iframe
                  srcDoc={formatDocumentContent(getDocumentContent(previewDoc)!)}
                  className="w-full h-full border-0 bg-white"
                  sandbox="allow-same-origin"
                  title="Document Preview"
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}