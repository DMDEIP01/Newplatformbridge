import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, ArrowUpCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PolicyUpgradeConfirmDialog } from "@/components/PolicyUpgradeConfirmDialog";

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

export default function RetailPolicyUpgrade() {
  const { policyId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPolicy = location.state?.currentPolicy;

  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  useEffect(() => {
    if (!currentPolicy) {
      toast.error("Policy data not found");
      navigate(-1);
      return;
    }
    fetchAvailableProducts();
  }, [currentPolicy]);

  // Upgrade hierarchy: Extended Warranty → Insurance Lite/Max, Insurance Lite → Insurance Max
  const getUpgradeTypes = (currentType: string): string[] => {
    const typeLower = currentType?.toLowerCase() || "";
    if (typeLower.includes("extended") || typeLower.includes("warranty")) {
      return ["insurance_lite", "insurance_max"];
    }
    if (typeLower.includes("lite")) {
      return ["insurance_max"];
    }
    // Insurance Max has no upgrades
    return [];
  };

  const fetchAvailableProducts = async () => {
    setLoading(true);
    try {
      const currentType = currentPolicy?.products?.type || "";
      const currentTier = currentPolicy?.products?.tier || 1;
      const upgradeTypes = getUpgradeTypes(currentType);

      if (upgradeTypes.length === 0) {
        setAvailableProducts([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .eq("tier", currentTier)
        .in("type", upgradeTypes)
        .order("type", { ascending: true });

      if (error) throw error;

      setAvailableProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load available policies");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeClick = () => {
    if (!selectedProduct) return;

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

    setUpgrading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const priceDiff = selectedProduct.monthly_premium - currentPolicy.products.monthly_premium;

      const { error: updateError } = await supabase
        .from("policies")
        .update({
          product_id: selectedProduct.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentPolicy.id);

      if (updateError) throw updateError;

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
      await generatePolicyDocuments(selectedProduct, user.id);

      toast.success("Policy upgraded successfully", {
        description: `Policy has been upgraded to ${selectedProduct.name}. New documents have been issued.`,
      });

      setConfirmDialogOpen(false);
      navigate(`/retail/policies/${policyId}`);
    } catch (error) {
      console.error("Error upgrading policy:", error);
      toast.error("Failed to upgrade policy");
    } finally {
      setUpgrading(false);
    }
  };

  const generatePolicyDocuments = async (newProduct: Product, userId: string) => {
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
            user_id: userId,
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

  const formatPriceDiff = (product: Product) => {
    const diff = product.monthly_premium - currentPolicy.products.monthly_premium;
    return `+€${diff.toFixed(2)}/month`;
  };

  if (!currentPolicy) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl animate-fade-in">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Upgrade Policy</h1>
        <p className="text-muted-foreground mt-2">
          Choose a higher coverage plan. Changes take effect immediately.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current Policy */}
          <Card className="border-primary border-2">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <Badge variant="outline" className="mb-2">Current Policy</Badge>
                  <h3 className="font-semibold text-xl">{currentPolicy.products.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Policy: {currentPolicy.policy_number}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">€{currentPolicy.products.monthly_premium}</div>
                  <div className="text-sm text-muted-foreground">per month</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    €{currentPolicy.products.excess_1} excess
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {currentPolicy.products.coverage.map((item: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-success" />
                    {item}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Available Products */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Available Upgrade Options</h2>
            {availableProducts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No upgrade options available.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    This policy is already on the highest tier.
                  </p>
                </CardContent>
              </Card>
            ) : (
              availableProducts.map((product) => {
                const isSelected = selectedProduct?.id === product.id;

                return (
                  <Card
                    key={product.id}
                    className={`cursor-pointer transition-all ${
                      isSelected ? "border-primary ring-2 ring-primary" : "hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedProduct(product)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{product.name}</h3>
                            <Badge variant="outline" className="text-success">
                              <ArrowUpCircle className="h-3 w-3 mr-1" />
                              Upgrade
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{formatPriceDiff(product)}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">€{product.monthly_premium}</div>
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

          {/* Reason Section */}
          {selectedProduct && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for upgrading (optional)</Label>
                  <Textarea
                    id="reason"
                    placeholder="e.g., Need better coverage for accidental damage, Want extended protection..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Help us understand why you're upgrading to improve our services.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end sticky bottom-0 bg-background py-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => navigate(-1)} 
              disabled={upgrading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpgradeClick} 
              disabled={!selectedProduct || upgrading}
              size="lg"
            >
              {upgrading ? "Upgrading..." : "Continue"}
            </Button>
          </div>
        </div>
      )}

      {selectedProduct && (
        <PolicyUpgradeConfirmDialog
          open={confirmDialogOpen}
          onOpenChange={setConfirmDialogOpen}
          onConfirm={handleConfirmUpgrade}
          isLoading={upgrading}
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
    </div>
  );
}