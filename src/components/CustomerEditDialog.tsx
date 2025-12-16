import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CustomerEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policyId: string;
  customerData: {
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    customer_address_line1?: string;
    customer_address_line2?: string;
    customer_city?: string;
    customer_postcode?: string;
  };
  onUpdate: () => void;
}

export default function CustomerEditDialog({
  open,
  onOpenChange,
  policyId,
  customerData,
  onUpdate,
}: CustomerEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: customerData.customer_name || "",
    customer_email: customerData.customer_email || "",
    customer_phone: customerData.customer_phone || "",
    customer_address_line1: customerData.customer_address_line1 || "",
    customer_address_line2: customerData.customer_address_line2 || "",
    customer_city: customerData.customer_city || "",
    customer_postcode: customerData.customer_postcode || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("policies")
        .update({
          customer_name: formData.customer_name,
          customer_email: formData.customer_email,
          customer_phone: formData.customer_phone,
          customer_address_line1: formData.customer_address_line1,
          customer_address_line2: formData.customer_address_line2,
          customer_city: formData.customer_city,
          customer_postcode: formData.customer_postcode,
        })
        .eq("id", policyId);

      if (error) throw error;

      toast.success("Customer information updated successfully");
      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating customer information:", error);
      toast.error("Failed to update customer information");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Customer Information</DialogTitle>
          <DialogDescription>
            Update the customer's contact details and address
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer_name">Full Name</Label>
              <Input
                id="customer_name"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                placeholder="Enter full name"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer_email">Email Address</Label>
                <Input
                  id="customer_email"
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_phone">Phone Number</Label>
                <Input
                  id="customer_phone"
                  type="tel"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  placeholder="+353 1 234 5678"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_address_line1">Address Line 1</Label>
              <Input
                id="customer_address_line1"
                value={formData.customer_address_line1}
                onChange={(e) => setFormData({ ...formData, customer_address_line1: e.target.value })}
                placeholder="Street address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_address_line2">Address Line 2</Label>
              <Input
                id="customer_address_line2"
                value={formData.customer_address_line2}
                onChange={(e) => setFormData({ ...formData, customer_address_line2: e.target.value })}
                placeholder="Apartment, suite, etc. (optional)"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer_city">City</Label>
                <Input
                  id="customer_city"
                  value={formData.customer_city}
                  onChange={(e) => setFormData({ ...formData, customer_city: e.target.value })}
                  placeholder="City"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_postcode">Postcode</Label>
                <Input
                  id="customer_postcode"
                  value={formData.customer_postcode}
                  onChange={(e) => setFormData({ ...formData, customer_postcode: e.target.value })}
                  placeholder="Postcode"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
