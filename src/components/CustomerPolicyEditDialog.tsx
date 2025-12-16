import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const customerDetailsSchema = z.object({
  customerName: z.string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  customerEmail: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters"),
  customerPhone: z.string()
    .trim()
    .max(20, "Phone must be less than 20 characters")
    .optional(),
  addressLine1: z.string()
    .trim()
    .max(200, "Address line 1 must be less than 200 characters")
    .optional(),
  addressLine2: z.string()
    .trim()
    .max(200, "Address line 2 must be less than 200 characters")
    .optional(),
  city: z.string()
    .trim()
    .max(100, "City must be less than 100 characters")
    .optional(),
  postcode: z.string()
    .trim()
    .max(20, "Postcode must be less than 20 characters")
    .optional(),
});

interface CustomerPolicyEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: any;
  onSuccess: () => void;
}

export default function CustomerPolicyEditDialog({
  open,
  onOpenChange,
  policy,
  onSuccess,
}: CustomerPolicyEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    postcode: "",
  });

  useEffect(() => {
    if (policy && open) {
      setFormData({
        customerName: policy?.customer_name || "",
        customerEmail: policy?.customer_email || "",
        customerPhone: policy?.customer_phone || "",
        addressLine1: policy?.customer_address_line1 || "",
        addressLine2: policy?.customer_address_line2 || "",
        city: policy?.customer_city || "",
        postcode: policy?.customer_postcode || "",
      });
      setErrors({});
    }
  }, [policy, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      // Validate form data
      const validatedData = customerDetailsSchema.parse(formData);

      // Update policy customer fields
      const { error: policyError } = await supabase
        .from('policies')
        .update({
          customer_name: validatedData.customerName,
          customer_email: validatedData.customerEmail,
          customer_phone: validatedData.customerPhone || null,
          customer_address_line1: validatedData.addressLine1 || null,
          customer_address_line2: validatedData.addressLine2 || null,
          customer_city: validatedData.city || null,
          customer_postcode: validatedData.postcode || null,
        })
        .eq('id', policy.id);

      if (policyError) throw policyError;

      toast.success('Policy details updated successfully', {
        description: 'Your contact and address information has been updated.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        // Handle validation errors
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
        toast.error('Please check the form for errors');
      } else {
        toast.error('Failed to update policy details', {
          description: error.message || 'Please try again later.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Policy Details</DialogTitle>
          <DialogDescription>
            Update your contact information and address details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 col-span-full">
                <Label htmlFor="customerName">Full Name *</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className={errors.customerName ? "border-destructive" : ""}
                  maxLength={100}
                />
                {errors.customerName && (
                  <p className="text-sm text-destructive">{errors.customerName}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email Address *</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  className={errors.customerEmail ? "border-destructive" : ""}
                  maxLength={255}
                />
                {errors.customerEmail && (
                  <p className="text-sm text-destructive">{errors.customerEmail}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Phone Number</Label>
                <Input
                  id="customerPhone"
                  type="tel"
                  value={formData.customerPhone}
                  onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  className={errors.customerPhone ? "border-destructive" : ""}
                  maxLength={20}
                />
                {errors.customerPhone && (
                  <p className="text-sm text-destructive">{errors.customerPhone}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground">Address</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="addressLine1">Address Line 1</Label>
                <Input
                  id="addressLine1"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                  className={errors.addressLine1 ? "border-destructive" : ""}
                  maxLength={200}
                />
                {errors.addressLine1 && (
                  <p className="text-sm text-destructive">{errors.addressLine1}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="addressLine2">Address Line 2</Label>
                <Input
                  id="addressLine2"
                  value={formData.addressLine2}
                  onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                  className={errors.addressLine2 ? "border-destructive" : ""}
                  maxLength={200}
                />
                {errors.addressLine2 && (
                  <p className="text-sm text-destructive">{errors.addressLine2}</p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className={errors.city ? "border-destructive" : ""}
                    maxLength={100}
                  />
                  {errors.city && (
                    <p className="text-sm text-destructive">{errors.city}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="postcode">Postcode</Label>
                  <Input
                    id="postcode"
                    value={formData.postcode}
                    onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                    className={errors.postcode ? "border-destructive" : ""}
                    maxLength={20}
                  />
                  {errors.postcode && (
                    <p className="text-sm text-destructive">{errors.postcode}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
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
