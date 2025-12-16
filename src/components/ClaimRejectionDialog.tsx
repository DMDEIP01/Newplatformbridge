import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RejectionTerm {
  id: string;
  term: string;
  isSelected: boolean;
}

interface PerilDetails {
  perilName: string;
  rejectionTerms: RejectionTerm[];
}

interface ClaimRejectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claimId: string;
  claimType: string;
  productId: string;
  onRejected: () => void;
}

export function ClaimRejectionDialog({
  open,
  onOpenChange,
  claimId,
  claimType,
  productId,
  onRejected
}: ClaimRejectionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rejectionTerms, setRejectionTerms] = useState<RejectionTerm[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [availablePerils, setAvailablePerils] = useState<string[]>([]);

  useEffect(() => {
    if (open && productId) {
      loadProductPerils();
    }
  }, [open, productId]);

  // Map claim types to peril names
  const getPerilNameForClaimType = (claimType: string): string[] => {
    const mapping: Record<string, string[]> = {
      breakdown: ["Breakdown", "Mechanical Breakdown", "breakdown"],
      damage: ["Accidental Damage", "Damage", "accidental damage", "damage"],
      theft: ["Theft", "theft"],
    };
    return mapping[claimType.toLowerCase()] || [];
  };

  const loadProductPerils = async () => {
    setLoading(true);
    try {
      // First, get the product's perils
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("perils")
        .eq("id", productId)
        .single();

      if (productError) throw productError;

      if (productData && productData.perils) {
        setAvailablePerils(productData.perils);
        
        // Now fetch rejection terms from the perils table
        const { data: perilsData, error: perilsError } = await supabase
          .from("perils")
          .select("name, rejection_terms")
          .in("name", productData.perils)
          .eq("is_active", true);

        if (perilsError) throw perilsError;

        const allTerms: RejectionTerm[] = [];
        const relevantPerilNames = getPerilNameForClaimType(claimType);
        
        if (perilsData) {
          perilsData.forEach((peril) => {
            // Check if this peril matches the claim type
            const isRelevantPeril = relevantPerilNames.some(name => 
              peril.name.toLowerCase().includes(name.toLowerCase())
            );
            
            if (isRelevantPeril && peril.rejection_terms) {
              const terms = peril.rejection_terms as any[];
              terms.forEach((term) => {
                // Handle both old and new format
                if (term.text) {
                  allTerms.push({
                    id: term.id,
                    term: term.text,
                    isSelected: false
                  });
                }
              });
            }
          });
        }
        
        // If no specific terms found for this claim type, show all terms as fallback
        if (allTerms.length === 0 && perilsData) {
          perilsData.forEach((peril) => {
            if (peril.rejection_terms) {
              const terms = peril.rejection_terms as any[];
              terms.forEach((term) => {
                if (term.text) {
                  allTerms.push({
                    id: term.id,
                    term: term.text,
                    isSelected: false
                  });
                }
              });
            }
          });
        }
        
        setRejectionTerms(allTerms);
      }
    } catch (error) {
      console.error("Error loading product perils:", error);
      toast.error("Failed to load rejection terms");
    } finally {
      setLoading(false);
    }
  };

  const toggleTerm = (termId: string) => {
    setRejectionTerms(terms =>
      terms.map(t => t.id === termId ? { ...t, isSelected: !t.isSelected } : t)
    );
  };

  const handleReject = async () => {
    const selectedTerms = rejectionTerms.filter(t => t.isSelected);
    
    if (selectedTerms.length === 0 && !additionalNotes.trim()) {
      toast.error("Please select at least one rejection reason or provide additional notes");
      return;
    }

    setSubmitting(true);
    try {
      const rejectionReason = [
        ...selectedTerms.map(t => t.term),
        additionalNotes.trim() && `Additional Notes: ${additionalNotes.trim()}`
      ].filter(Boolean).join("\n\n");

      const { error } = await supabase
        .from("claims")
        .update({
          decision: "rejected",
          decision_reason: rejectionReason,
          status: "rejected",
        })
        .eq("id", claimId);

      if (error) throw error;

      // Send rejection email to customer
      try {
        // Get claim details including policy_id
        const { data: claim } = await supabase
          .from("claims")
          .select("claim_number, policy_id")
          .eq("id", claimId)
          .single();

        if (claim?.policy_id) {
          // Find the claim rejected template
          const { data: template } = await supabase
            .from("communication_templates")
            .select("*")
            .eq("status", "rejected")
            .eq("type", "claim")
            .eq("is_active", true)
            .single();

          if (template) {
            // Get policy details for email
            const { data: policy } = await supabase
              .from("policies")
              .select("policy_number, customer_name, customer_email")
              .eq("id", claim.policy_id)
              .single();

            if (policy?.customer_email) {
              // Use send-templated-email for proper branding
              await supabase.functions.invoke("send-templated-email", {
                body: {
                  policyId: claim.policy_id,
                  claimId: claimId,
                  templateId: template.id,
                  status: "rejected",
                },
              });
            }
          }
        }
      } catch (emailError) {
        console.error("Error sending rejection email:", emailError);
        // Don't fail the claim rejection if email fails
      }

      toast.success("Claim rejected successfully and customer notified");
      onRejected();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error rejecting claim:", error);
      toast.error(error.message || "Failed to reject claim");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Reject Claim - Select Rejection Reasons</DialogTitle>
          <DialogDescription>
            Select applicable rejection terms for this <span className="font-semibold capitalize">{claimType}</span> claim from the product's configured rejection reasons.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {availablePerils.length > 0 && (
                  <div className="flex flex-wrap gap-2 pb-4">
                    <span className="text-sm text-muted-foreground">Covered Perils:</span>
                    {availablePerils.map((peril) => (
                      <Badge key={peril} variant="secondary">
                        {peril}
                      </Badge>
                    ))}
                  </div>
                )}

                <Separator />

                {rejectionTerms.length > 0 ? (
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Rejection Terms</Label>
                    {rejectionTerms.map((term) => (
                      <div key={term.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                        <Checkbox
                          id={term.id}
                          checked={term.isSelected}
                          onCheckedChange={() => toggleTerm(term.id)}
                          className="mt-1"
                        />
                        <label
                          htmlFor={term.id}
                          className="text-sm leading-relaxed cursor-pointer flex-1"
                        >
                          {term.term}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No rejection terms configured for this product. You can still provide custom notes below.
                  </p>
                )}

                <Separator className="my-6" />

                <div className="space-y-3">
                  <Label htmlFor="additional-notes" className="text-base font-semibold">
                    Additional Notes (Optional)
                  </Label>
                  <Textarea
                    id="additional-notes"
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder="Add any additional information about the rejection..."
                    rows={4}
                    className="resize-none"
                  />
                </div>
              </div>
            </ScrollArea>

            <DialogFooter>
              <div className="flex items-center justify-between w-full">
                <p className="text-sm text-muted-foreground">
                  {rejectionTerms.filter(t => t.isSelected).length} reason(s) selected
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleReject}
                    disabled={submitting}
                  >
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Reject Claim
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}