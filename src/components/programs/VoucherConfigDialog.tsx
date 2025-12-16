import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface VoucherConfig {
  name: string;
  discountType: "amount" | "percentage" | "months";
  value: string;
  duration?: string; // Duration in months for amount/percentage discounts
}

interface VoucherConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (voucher: VoucherConfig) => void;
}

export function VoucherConfigDialog({ open, onOpenChange, onSave }: VoucherConfigDialogProps) {
  const [formData, setFormData] = useState<VoucherConfig>({
    name: "",
    discountType: "amount",
    value: "",
    duration: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.value) {
      toast.error("Please fill in all fields");
      return;
    }

    // Validate duration for amount/percentage discounts
    if ((formData.discountType === "amount" || formData.discountType === "percentage") && !formData.duration) {
      toast.error("Please enter the discount duration");
      return;
    }

    const numValue = parseFloat(formData.value);
    if (isNaN(numValue) || numValue <= 0) {
      toast.error("Please enter a valid value");
      return;
    }

    if (formData.discountType === "percentage" && numValue > 100) {
      toast.error("Percentage cannot exceed 100%");
      return;
    }

    if (formData.duration) {
      const durationNum = parseFloat(formData.duration);
      if (isNaN(durationNum) || durationNum <= 0) {
        toast.error("Please enter a valid duration");
        return;
      }
    }

    onSave(formData);
    
    // Reset form
    setFormData({
      name: "",
      discountType: "amount",
      value: "",
      duration: ""
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configure Voucher/Promo</DialogTitle>
          <DialogDescription>
            Set up a voucher or promotional offer with discount details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="voucher-name">Voucher Name *</Label>
            <Input
              id="voucher-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Welcome Voucher"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="discount-type">Discount Type *</Label>
            <Select 
              value={formData.discountType} 
              onValueChange={(value: "amount" | "percentage" | "months") => 
                setFormData(prev => ({ ...prev, discountType: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="amount">£ off</SelectItem>
                <SelectItem value="percentage">% off</SelectItem>
                <SelectItem value="months">Month(s) off</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">
              Value * 
              {formData.discountType === "amount" && " (£)"}
              {formData.discountType === "percentage" && " (%)"}
              {formData.discountType === "months" && " (months)"}
            </Label>
            <Input
              id="value"
              type="number"
              step={formData.discountType === "amount" ? "0.01" : "1"}
              value={formData.value}
              onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
              placeholder={
                formData.discountType === "amount" ? "10.00" :
                formData.discountType === "percentage" ? "10" : "1"
              }
              required
            />
          </div>

          {(formData.discountType === "amount" || formData.discountType === "percentage") && (
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (months) *</Label>
              <Input
                id="duration"
                type="number"
                step="1"
                min="1"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
                placeholder="e.g., 3"
                required
              />
              <p className="text-sm text-muted-foreground">
                How many months this discount applies
              </p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Add Voucher
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
