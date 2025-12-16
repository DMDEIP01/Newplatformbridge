import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface PolicyEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: any;
  products: any[];
  onSuccess: () => void;
}

export default function PolicyEditDialog({
  open,
  onOpenChange,
  policy,
  products,
  onSuccess,
}: PolicyEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerName: policy?.customer_name || policy?.profile?.full_name || "",
    customerEmail: policy?.customer_email || policy?.profile?.email || "",
    customerPhone: policy?.customer_phone || policy?.profile?.phone || "",
    addressLine1: policy?.customer_address_line1 || policy?.profile?.address_line1 || "",
    addressLine2: policy?.customer_address_line2 || policy?.profile?.address_line2 || "",
    city: policy?.customer_city || policy?.profile?.city || "",
    postcode: policy?.customer_postcode || policy?.profile?.postcode || "",
    productId: policy?.product_id || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Update policy customer fields
      const { error: policyCustomerError } = await supabase
        .from('policies' as any)
        .update({
          customer_name: formData.customerName,
          customer_email: formData.customerEmail,
          customer_phone: formData.customerPhone,
          customer_address_line1: formData.addressLine1,
          customer_address_line2: formData.addressLine2,
          customer_city: formData.city,
          customer_postcode: formData.postcode,
        } as any)
        .eq('id', policy.id);

      if (policyCustomerError) throw policyCustomerError;

      // Check if product changed (upgrade/downgrade)
      if (formData.productId !== policy.product_id) {
        const oldProduct = products.find(p => p.id === policy.product_id);
        const newProduct = products.find(p => p.id === formData.productId);

        if (!oldProduct || !newProduct) {
          throw new Error('Selected product not found');
        }

        // Update policy
        const { error: policyError } = await supabase
          .from('policies')
          .update({ product_id: formData.productId })
          .eq('id', policy.id);

        if (policyError) throw policyError;

        // Record the change in history
        const { error: historyError } = await supabase
          .from('policy_change_history')
          .insert({
            policy_id: policy.id,
            user_id: policy.user_id,
            old_product_id: policy.product_id,
            new_product_id: formData.productId,
            change_type: newProduct.tier > oldProduct.tier ? 'upgrade' : 'downgrade',
            old_premium: oldProduct.monthly_premium,
            new_premium: newProduct.monthly_premium,
            premium_difference: newProduct.monthly_premium - oldProduct.monthly_premium,
            reason: 'Policy updated by consultant',
          });

        if (historyError) throw historyError;

        toast.success('Policy updated and change recorded');
      } else {
        toast.success('Customer details updated successfully');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating policy:', error);
      toast.error(error.message || 'Failed to update policy');
    } finally {
      setLoading(false);
    }
  };

  const currentProduct = products.find(p => p.id === policy?.product_id);
  const selectedProduct = products.find(p => p.id === formData.productId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Policy</DialogTitle>
          <DialogDescription>
            Update customer details or upgrade/downgrade the policy
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold">Customer Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Full Name *</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email *</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone</Label>
                <Input
                  id="customerPhone"
                  type="tel"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="addressLine1">Address Line 1</Label>
              <Input
                id="addressLine1"
                value={formData.addressLine1}
                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressLine2">Address Line 2</Label>
              <Input
                id="addressLine2"
                value={formData.addressLine2}
                onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode</Label>
                <Input
                  id="postcode"
                  value={formData.postcode}
                  onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Policy Product</h3>
            <div className="space-y-2">
              <Label htmlFor="productId">Coverage Tier</Label>
              <Select
                value={formData.productId}
                onValueChange={(value) => setFormData({ ...formData, productId: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - £{product.monthly_premium}/mo (Tier {product.tier})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.productId !== policy?.product_id && selectedProduct && currentProduct && (
              <div className="p-4 bg-accent/50 rounded-lg border">
                <p className="font-medium mb-2">
                  {selectedProduct.tier > currentProduct.tier ? '⬆️ Upgrade' : '⬇️ Downgrade'}
                </p>
                <div className="text-sm space-y-1">
                  <p>Current: {currentProduct.name} (£{currentProduct.monthly_premium}/mo)</p>
                  <p>New: {selectedProduct.name} (£{selectedProduct.monthly_premium}/mo)</p>
                  <p className="font-medium">
                    Premium change: {selectedProduct.monthly_premium > currentProduct.monthly_premium ? '+' : ''}
                    £{(selectedProduct.monthly_premium - currentProduct.monthly_premium).toFixed(2)}/mo
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
