import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Upload, CheckCircle, FileText, Image as ImageIcon, Receipt } from "lucide-react";
import { formatStatus } from "@/lib/utils";

interface ClaimData {
  id: string;
  claim_number: string;
  status: string;
  description: string;
  submitted_date: string;
  policies: {
    policy_number: string;
    customer_name: string;
    customer_email: string;
    products: {
      name: string;
    };
  };
}

export default function RetailClaimDocumentUpload() {
  const { claimId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [claim, setClaim] = useState<ClaimData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState({
    photos: false,
    receipt: false,
    other: false,
  });

  useEffect(() => {
    fetchClaimDetails();
  }, [claimId]);

  const fetchClaimDetails = async () => {
    if (!claimId) return;

    try {
      const { data, error } = await supabase
        .from("claims")
        .select(`
          id,
          claim_number,
          status,
          description,
          submitted_date,
          policies!inner (
            policy_number,
            customer_name,
            customer_email,
            products!inner (
              name
            )
          )
        `)
        .eq("id", claimId)
        .single();

      if (error) throw error;
      setClaim(data);
    } catch (error: any) {
      console.error("Error fetching claim:", error);
      toast({
        title: "Error",
        description: "Failed to load claim details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (
    files: FileList | null,
    documentType: "photo" | "receipt" | "other"
  ) => {
    if (!files || files.length === 0 || !claim) return;

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || "anonymous";

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split(".").pop();
        const fileName = `${claim.claim_number}-${documentType}-${Date.now()}-${i}.${fileExt}`;
        const filePath = `claims/${claim.id}/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Create document record
        const { error: dbError } = await supabase.from("documents").insert({
          user_id: userId,
          claim_id: claim.id,
          policy_id: null,
          document_type: documentType === "receipt" ? "receipt" : "photo",
          document_subtype: documentType === "receipt" ? "receipt" : "other",
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
        });

        if (dbError) throw dbError;
      }

      setUploadedDocs((prev) => ({ ...prev, [documentType + "s"]: true }));

      toast({
        title: "Success",
        description: `${files.length} file(s) uploaded successfully`,
      });
    } catch (error: any) {
      console.error("Error uploading files:", error);
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Claim Not Found</CardTitle>
            <CardDescription>
              The claim you're looking for doesn't exist or has been removed.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-t-4 border-t-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Upload Claim Documents</CardTitle>
                <CardDescription className="text-lg mt-2">
                  Claim #{claim.claim_number}
                </CardDescription>
              </div>
              <div className="bg-primary/10 px-4 py-2 rounded-lg">
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-semibold">{formatStatus(claim.status)}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Policy Number</p>
                <p className="font-medium">{claim.policies.policy_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Product</p>
                <p className="font-medium">{claim.policies.products.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-medium">{claim.policies.customer_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Submitted</p>
                <p className="font-medium">
                  {new Date(claim.submitted_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Instructions */}
        <Alert>
          <AlertDescription>
            Please upload the required documents to help us process your claim quickly.
            Accepted formats: JPG, PNG, PDF. Maximum file size: 10MB per file.
          </AlertDescription>
        </Alert>

        {/* Upload Sections */}
        <div className="grid gap-6">
          {/* Photos Upload */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ImageIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Device Photos</CardTitle>
                  <CardDescription>
                    Upload photos showing the damage or fault
                  </CardDescription>
                </div>
                {uploadedDocs.photos && (
                  <CheckCircle className="h-6 w-6 text-green-500 ml-auto" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Label htmlFor="photos" className="cursor-pointer">
                <div className="border-2 border-dashed rounded-lg p-6 hover:bg-accent transition-colors">
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Multiple photos accepted
                    </p>
                  </div>
                </div>
              </Label>
              <Input
                id="photos"
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files, "photo")}
                disabled={uploading}
              />
            </CardContent>
          </Card>

          {/* Receipt Upload */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Proof of Purchase</CardTitle>
                  <CardDescription>
                    Upload your receipt or invoice
                  </CardDescription>
                </div>
                {uploadedDocs.receipt && (
                  <CheckCircle className="h-6 w-6 text-green-500 ml-auto" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Label htmlFor="receipt" className="cursor-pointer">
                <div className="border-2 border-dashed rounded-lg p-6 hover:bg-accent transition-colors">
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, JPG, or PNG accepted
                    </p>
                  </div>
                </div>
              </Label>
              <Input
                id="receipt"
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files, "receipt")}
                disabled={uploading}
              />
            </CardContent>
          </Card>

          {/* Other Documents Upload */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Additional Documents</CardTitle>
                  <CardDescription>
                    Any other supporting documents (optional)
                  </CardDescription>
                </div>
                {uploadedDocs.other && (
                  <CheckCircle className="h-6 w-6 text-green-500 ml-auto" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Label htmlFor="other" className="cursor-pointer">
                <div className="border-2 border-dashed rounded-lg p-6 hover:bg-accent transition-colors">
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Multiple files accepted
                    </p>
                  </div>
                </div>
              </Label>
              <Input
                id="other"
                type="file"
                multiple
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files, "other")}
                disabled={uploading}
              />
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <p className="text-sm text-muted-foreground">
                You can upload more documents later if needed
              </p>
              <Button
                onClick={() => {
                  toast({
                    title: "Documents Submitted",
                    description: "Thank you! We'll review your claim shortly.",
                  });
                  navigate(`/retail/claims/${claimId}`);
                }}
                size="lg"
              >
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

