import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ArrowUpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { PolicyUpgradeConfirmDialog } from "./PolicyUpgradeConfirmDialog";

const reasonSchema = z.object({
  reason: z.string()
    .max(500, "Reason must not exceed 500 characters")
    .optional(),
});

interface Product {
  id: string;
  name: string;
  type: string;
  monthly_premium: number;
  excess_1: number;
  coverage: string[];
  tier: number;
}

interface PolicySwitchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPolicy: {
    id: string;
    policy_number: string;
    user_id?: string;
    customer_name?: string;
    customer_email?: string;
    customer_address_line1?: string;
    customer_address_line2?: string;
    customer_city?: string;
    customer_postcode?: string;
    start_date?: string;
    renewal_date?: string;
    products: Product;
  };
  onPolicyUpdated: () => void;
}

export function PolicySwitchDialog({
  open,
  onOpenChange,
  currentPolicy,
  onPolicyUpdated,
}: PolicySwitchDialogProps) {
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAvailableProducts();
    }
  }, [open, currentPolicy]);

  const fetchAvailableProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("tier", { ascending: true });

      if (error) throw error;

      const currentTier = currentPolicy.products.tier;
      
      // Filter products with higher tiers (upgrades only)
      const filtered = (data || [])
        .filter((p) => p.tier > currentTier)
        .slice(0, 3); // Show up to 3 upgrade options

      setAvailableProducts(filtered);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching products:", error);
      }
      toast.error("Failed to load available policies");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeClick = () => {
    if (!selectedProduct) return;

    // Validate reason field
    const validation = reasonSchema.safeParse({ reason });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    // Show confirmation dialog
    setConfirmDialogOpen(true);
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedProduct) return;

    setSwitching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const priceDiff = selectedProduct.monthly_premium - currentPolicy.products.monthly_premium;

      // Update the policy
      const { error: updateError } = await supabase
        .from("policies")
        .update({
          product_id: selectedProduct.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentPolicy.id);

      if (updateError) throw updateError;

      // Record the policy change in history
      const { error: historyError } = await supabase
        .from("policy_change_history")
        .insert({
          user_id: user.id,
          policy_id: currentPolicy.id,
          old_product_id: currentPolicy.products.id,
          new_product_id: selectedProduct.id,
          change_type: "upgrade",
          reason: reason.trim() || null,
          old_premium: currentPolicy.products.monthly_premium,
          new_premium: selectedProduct.monthly_premium,
          premium_difference: priceDiff,
        });

      if (historyError) {
        console.error("Failed to record change history:", historyError);
      }

      // Record in policy action history
      await supabase
        .from("policy_action_history")
        .insert({
          policy_id: currentPolicy.id,
          user_id: user.id,
          action_type: "upgrade",
          action_description: `Policy upgraded from ${currentPolicy.products.name} to ${selectedProduct.name}`,
          metadata: {
            old_product: currentPolicy.products.name,
            new_product: selectedProduct.name,
            old_premium: currentPolicy.products.monthly_premium,
            new_premium: selectedProduct.monthly_premium,
            premium_difference: priceDiff,
            reason: reason.trim() || null,
          },
        });

      // Generate new policy documents
      await generatePolicyDocuments(selectedProduct);

      toast.success("Policy upgraded successfully", {
        description: `Your policy has been upgraded to ${selectedProduct.name}. New documents have been issued.`,
      });

      setConfirmDialogOpen(false);
      onPolicyUpdated();
      onOpenChange(false);
      setReason("");
      setSelectedProduct(null);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error switching policy:", error);
      }
      toast.error("Failed to switch policy");
    } finally {
      setSwitching(false);
    }
  };

  const generatePolicyDocuments = async (newProduct: Product) => {
    try {
      // Fetch policy details for document generation
      const { data: policyData } = await supabase
        .from("policies")
        .select(`
          id, policy_number, start_date, renewal_date, user_id,
          customer_name, customer_email, customer_address_line1,
          customer_address_line2, customer_city, customer_postcode,
          covered_items(product_name, model, serial_number, purchase_price)
        `)
        .eq("id", currentPolicy.id)
        .single();

      if (!policyData) {
        console.error("Failed to fetch policy data for documents");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      // Call the edge function to generate documents
      const response = await supabase.functions.invoke("generate-policy-documents", {
        body: {
          policyId: currentPolicy.id,
          policyNumber: currentPolicy.policy_number,
          customerName: policyData.customer_name || "Policyholder",
          customerEmail: policyData.customer_email || "",
          customerAddress: {
            line1: policyData.customer_address_line1 || "",
            line2: policyData.customer_address_line2 || "",
            city: policyData.customer_city || "",
            postcode: policyData.customer_postcode || "",
          },
          productName: newProduct.name,
          monthlyPremium: newProduct.monthly_premium,
          excess: newProduct.excess_1,
          startDate: policyData.start_date,
          renewalDate: policyData.renewal_date,
          coveredItems: Array.isArray(policyData.covered_items) 
            ? policyData.covered_items 
            : policyData.covered_items ? [policyData.covered_items] : [],
        },
      });

      if (response.error) {
        console.error("Error generating documents:", response.error);
      } else {
        // Record documents issued action
        await supabase
          .from("policy_action_history")
          .insert({
            policy_id: currentPolicy.id,
            user_id: user?.id,
            action_type: "documents_issued",
            action_description: "New policy documents issued following upgrade",
            metadata: {
              documents: ["IPID", "Terms & Conditions", "Policy Schedule"],
              product: newProduct.name,
            },
          });
      }
    } catch (error) {
      console.error("Error generating policy documents:", error);
    }
  };

  const getSwitchType = (product: Product) => {
    return { type: "upgrade", icon: ArrowUpCircle, color: "text-success" };
  };

  const formatPriceDiff = (product: Product) => {
    const diff = product.monthly_premium - currentPolicy.products.monthly_premium;
    return `+€${diff.toFixed(2)}/month`;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upgrade Your Policy</DialogTitle>
            <DialogDescription>
              Choose a higher coverage plan. Changes take effect immediately.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading options...</div>
          ) : (
            <div className="space-y-4">
              {/* Current Policy */}
              <Card className="border-primary">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <Badge variant="outline" className="mb-2">Current Policy</Badge>
                      <h3 className="font-semibold text-lg">{currentPolicy.products.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Policy: {currentPolicy.policy_number}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">€{currentPolicy.products.monthly_premium}</div>
                      <div className="text-sm text-muted-foreground">per month</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        €{currentPolicy.products.excess_1} excess
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {currentPolicy.products.coverage.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-success" />
                        {item}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Available Products */}
              <div className="space-y-3">
                <h4 className="font-semibold">Available Options</h4>
                {availableProducts.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <p>No upgrade options available.</p>
                    <p className="text-sm mt-2">You're already on the highest tier policy.</p>
                  </div>
                ) : (
                  availableProducts.map((product) => {
                    const switchInfo = getSwitchType(product);
                    const Icon = switchInfo.icon;
                    const isSelected = selectedProduct?.id === product.id;

                    return (
                      <Card
                        key={product.id}
                        className={`cursor-pointer transition-all ${
                          isSelected ? "border-primary ring-2 ring-primary ring-offset-2" : "hover:border-primary/50"
                        }`}
                        onClick={() => setSelectedProduct(product)}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">{product.name}</h3>
                                <Badge variant="outline" className={switchInfo.color}>
                                  <Icon className="h-3 w-3 mr-1" />
                                  {switchInfo.type}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{formatPriceDiff(product)}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-bold">€{product.monthly_premium}</div>
                              <div className="text-xs text-muted-foreground">per month</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                €{product.excess_1} excess
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {product.coverage.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-success" />
                                {item}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>

              {/* Reason for upgrading */}
              {selectedProduct && (
                <div className="space-y-2 pt-4 border-t">
                  <Label htmlFor="reason">Reason for upgrading (optional)</Label>
                  <Textarea
                    id="reason"
                    placeholder="e.g., Need better coverage for accidental damage, Want extended protection..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Help us understand why you're upgrading to improve our services.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={switching}>
              Cancel
            </Button>
            <Button onClick={handleUpgradeClick} disabled={!selectedProduct || switching}>
              {switching ? "Upgrading..." : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedProduct && (
        <PolicyUpgradeConfirmDialog
          open={confirmDialogOpen}
          onOpenChange={setConfirmDialogOpen}
          onConfirm={handleConfirmUpgrade}
          isLoading={switching}
          currentProduct={{
            name: currentPolicy.products.name,
            monthly_premium: currentPolicy.products.monthly_premium,
          }}
          newProduct={{
            name: selectedProduct.name,
            monthly_premium: selectedProduct.monthly_premium,
          }}
        />
      )}
    </>
  );
}