import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Image as ImageIcon, Receipt, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import eipLogo from "@/assets/eip-logo.png";

interface ClaimData {
  id: string;
  claim_number: string;
  status: string;
  claim_type: string;
  policies: {
    id: string;
    policy_number: string;
    customer_name: string | null;
    customer_email: string | null;
    products: {
      name: string;
    };
  };
  submitted_date: string;
}

export default function ClaimDocumentUpload() {
  const { claimId } = useParams();
  const [loading, setLoading] = useState(true);
  const [claim, setClaim] = useState<ClaimData | null>(null);
  const [claimUserId, setClaimUserId] = useState<string>("");
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({});
  const [uploadedFiles, setUploadedFiles] = useState<{ [key: string]: number }>({
    photos: 0,
    receipt: 0,
    other: 0
  });

  const [isExpired, setIsExpired] = useState(false);
  const [sendingConfirmation, setSendingConfirmation] = useState(false);

  useEffect(() => {
    if (claimId) {
      fetchClaimDetails();
    }
  }, [claimId]);

  const fetchClaimDetails = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-claim-upload-details", {
        body: { claimId },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        setLoading(false);
        return;
      }

      setClaim(data.claim);
      setClaimUserId(data.claim.user_id);
      setIsExpired(data.isExpired);
      setUploadedFiles(data.uploadedFiles);
    } catch (error: any) {
      console.error("Error fetching claim details:", error);
      toast.error("Failed to load claim details");
    } finally {
      setLoading(false);
    }
  };

  const fetchUploadedDocuments = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-claim-upload-details", {
        body: { claimId },
      });

      if (error) throw error;
      if (data.uploadedFiles) {
        setUploadedFiles(data.uploadedFiles);
      }
    } catch (error: any) {
      console.error("Error fetching documents:", error);
    }
  };

  const handleFileUpload = async (files: FileList | null, type: "photo" | "receipt" | "other") => {
    if (!files || files.length === 0 || !claim) return;

    setUploading(prev => ({ ...prev, [type]: true }));

    try {
      let successCount = 0;
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 10MB limit`);
          continue;
        }

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
          toast.error(`${file.name} is not a valid format (JPG, PNG, PDF only)`);
          continue;
        }

        // Create FormData for file upload
        const formData = new FormData();
        formData.append('file', file);
        formData.append('claimId', claim.id);
        formData.append('documentType', type);
        formData.append('claimNumber', claim.claim_number);
        formData.append('userId', claimUserId);

        // Upload via edge function
        const { data, error } = await supabase.functions.invoke('upload-claim-document', {
          body: formData,
        });

        if (error) {
          console.error('Upload error:', error);
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        if (data.error) {
          console.error('Upload error:', data.error);
          toast.error(`Failed to upload ${file.name}: ${data.error}`);
          continue;
        }

        successCount++;
      }

      if (successCount > 0) {
        toast.success(`${successCount} file(s) uploaded successfully`);
        
        // Check if automatic processing will be triggered
        const totalPhotos = uploadedFiles.photos + (type === 'photo' ? successCount : 0);
        const totalReceipts = uploadedFiles.receipt + (type === 'receipt' ? successCount : 0);
        
        if (totalPhotos > 0 && totalReceipts > 0) {
          toast.info("All documents received! Processing your claim automatically...", {
            duration: 5000,
          });
        }
        
        fetchUploadedDocuments();
        
        // Send confirmation email
        sendConfirmationEmail();
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Failed to upload files");
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  const sendConfirmationEmail = async () => {
    if (!claim || sendingConfirmation) return;

    setSendingConfirmation(true);
    try {
      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          to: claim.policies.customer_email,
          subject: `Documents Received - Claim ${claim.claim_number}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #e30613;">Documents Received</h2>
              <p>Dear ${claim.policies.customer_name || "Customer"},</p>
              <p>Thank you for uploading your documents for claim <strong>${claim.claim_number}</strong>.</p>
              <p>We have successfully received your files and our team will review them within 24-48 hours.</p>
              <p>You will receive an email update once your claim has been processed.</p>
              <p>If you need to upload additional documents or have any questions, please contact our support team.</p>
              <p style="margin-top: 30px; color: #666; font-size: 12px;">
                This is an automated confirmation. Please do not reply to this email.
              </p>
            </div>
          `,
          policyId: claim.policies.id,
          claimId: claim.id,
          communicationType: "claim"
        }
      });

      if (error) {
        console.error("Error sending confirmation email:", error);
      }
    } catch (error) {
      console.error("Failed to send confirmation email:", error);
    } finally {
      setSendingConfirmation(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading claim details...</p>
        </div>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-amber-600">Upload Link Expired</CardTitle>
            <CardDescription className="space-y-3">
              <p>This document upload link has expired (48 hours).</p>
              <p>Please log into the customer portal to upload your documents or contact support for assistance.</p>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => window.location.href = '/auth'}
              className="w-full"
            >
              Go to Customer Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-destructive">Claim Not Found</CardTitle>
            <CardDescription>
              The claim you're looking for doesn't exist or the link is invalid.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <div className="bg-background border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <img src={eipLogo} alt="EIP" className="h-8" />
          <Badge variant="outline" className="text-sm">
            {claim.status.replace(/_/g, ' ').toUpperCase()}
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Claim Info Banner */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-2xl">Upload Claim Documents</CardTitle>
            <CardDescription className="text-base">Claim #{claim.claim_number}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Policy Number</p>
                <p className="font-semibold">{claim.policies.policy_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Product</p>
                <p className="font-semibold">{claim.policies.products.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-semibold">{claim.policies.customer_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Submitted</p>
                <p className="font-semibold">{new Date(claim.submitted_date).toLocaleDateString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-900 dark:text-amber-200">
              Please upload the required documents to help us process your claim quickly. Accepted formats: JPG, PNG, PDF.
              Maximum file size: 10MB per file.
            </p>
          </CardContent>
        </Card>

        {/* Upload Sections */}
        <div className="space-y-6">
          {/* Device Photos */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-950 rounded-lg">
                    <ImageIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <CardTitle>Device Photos</CardTitle>
                    <CardDescription>Upload photos showing the damage or fault</CardDescription>
                  </div>
                </div>
                {uploadedFiles.photos > 0 && (
                  <Badge className="bg-success">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {uploadedFiles.photos} uploaded
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  id="photos-upload"
                  multiple
                  accept="image/jpeg,image/png,image/jpg"
                  capture="environment"
                  onChange={(e) => handleFileUpload(e.target.files, "photo")}
                  className="hidden"
                  disabled={uploading.photo}
                />
                <label htmlFor="photos-upload" className="cursor-pointer">
                  {uploading.photo ? (
                    <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                  ) : (
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  )}
                  <p className="text-sm font-medium mb-1">Take photo or upload</p>
                  <p className="text-xs text-muted-foreground">Camera or gallery - multiple photos accepted</p>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Receipt */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
                    <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle>Proof of Purchase</CardTitle>
                    <CardDescription>Upload receipt or invoice</CardDescription>
                  </div>
                </div>
                {uploadedFiles.receipt > 0 && (
                  <Badge className="bg-success">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {uploadedFiles.receipt} uploaded
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  id="receipt-upload"
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  capture="environment"
                  onChange={(e) => handleFileUpload(e.target.files, "receipt")}
                  className="hidden"
                  disabled={uploading.receipt}
                />
                <label htmlFor="receipt-upload" className="cursor-pointer">
                  {uploading.receipt ? (
                    <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                  ) : (
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  )}
                  <p className="text-sm font-medium mb-1">Take photo or upload</p>
                  <p className="text-xs text-muted-foreground">Camera or file - JPG, PNG, or PDF</p>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Other Documents */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-950 rounded-lg">
                    <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <CardTitle>Additional Documents</CardTitle>
                    <CardDescription>Any other supporting documents</CardDescription>
                  </div>
                </div>
                {uploadedFiles.other > 0 && (
                  <Badge className="bg-success">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {uploadedFiles.other} uploaded
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                <input
                  type="file"
                  id="other-upload"
                  multiple
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  capture="environment"
                  onChange={(e) => handleFileUpload(e.target.files, "other")}
                  className="hidden"
                  disabled={uploading.other}
                />
                <label htmlFor="other-upload" className="cursor-pointer">
                  {uploading.other ? (
                    <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
                  ) : (
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  )}
                  <p className="text-sm font-medium mb-1">Take photo or upload</p>
                  <p className="text-xs text-muted-foreground">Camera or files - multiple accepted</p>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Success Message */}
        {(uploadedFiles.photos > 0 || uploadedFiles.receipt > 0 || uploadedFiles.other > 0) && (
          <Card className="mt-6 border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-200">Documents uploaded successfully!</p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    A confirmation email has been sent to {claim.policies.customer_email}.
                    Our team will review your documents and process your claim within 24-48 hours.
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                    Note: This upload link will expire 48 hours after it was sent. After that, please use the customer portal to upload additional documents.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <div className="border-t bg-background mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            If you have any questions or need assistance, please contact our support team.
          </p>
        </div>
      </div>
    </div>
  );
}
