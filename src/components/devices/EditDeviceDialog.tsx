import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Device {
  id: string;
  manufacturer: string;
  device_category: string;
  model_name: string;
  rrp: number;
  include_in_promos: boolean;
  external_reference: string | null;
  manufacturer_warranty_months: number | null;
  trade_in_faulty: number | null;
  refurb_buy: number | null;
  price_expiry: string | null;
}

interface EditDeviceDialogProps {
  device: Device | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditDeviceDialog({ device, open, onOpenChange, onSuccess }: EditDeviceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [categoryWarranty, setCategoryWarranty] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    manufacturer: "",
    device_category: "",
    model_name: "",
    rrp: "",
    include_in_promos: true,
    external_reference: "",
    manufacturer_warranty_months: "",
    trade_in_faulty: "",
    refurb_buy: "",
    price_expiry: ""
  });

  useEffect(() => {
    if (device) {
      setFormData({
        manufacturer: device.manufacturer,
        device_category: device.device_category,
        model_name: device.model_name,
        rrp: device.rrp.toString(),
        include_in_promos: device.include_in_promos,
        external_reference: device.external_reference || "",
        manufacturer_warranty_months: device.manufacturer_warranty_months?.toString() || "",
        trade_in_faulty: device.trade_in_faulty?.toString() || "",
        refurb_buy: device.refurb_buy?.toString() || "",
        price_expiry: device.price_expiry || ""
      });
      fetchCategoryWarranty(device.device_category);
    }
  }, [device]);

  const fetchCategoryWarranty = async (categoryName: string) => {
    try {
      const { data, error } = await supabase
        .from("device_categories")
        .select("manufacturer_warranty_months")
        .eq("name", categoryName)
        .single();

      if (error) throw error;
      setCategoryWarranty(data?.manufacturer_warranty_months || null);
    } catch (error) {
      console.error("Failed to load category warranty:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!device) return;

    setLoading(true);

    try {
      const warrantyMonths = formData.manufacturer_warranty_months 
        ? parseInt(formData.manufacturer_warranty_months) 
        : null;

      const { error } = await supabase
        .from("devices")
        .update({
          manufacturer: formData.manufacturer,
          device_category: formData.device_category,
          model_name: formData.model_name,
          rrp: parseFloat(formData.rrp),
          include_in_promos: formData.include_in_promos,
          external_reference: formData.external_reference || null,
          manufacturer_warranty_months: warrantyMonths,
          trade_in_faulty: formData.trade_in_faulty ? parseFloat(formData.trade_in_faulty) : null,
          refurb_buy: formData.refurb_buy ? parseFloat(formData.refurb_buy) : null,
          price_expiry: formData.price_expiry || null
        })
        .eq("id", device.id);

      if (error) throw error;

      toast.success("Device updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!device) return null;

  const effectiveWarranty = formData.manufacturer_warranty_months 
    ? parseInt(formData.manufacturer_warranty_months) 
    : categoryWarranty;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Device</DialogTitle>
          <DialogDescription>
            Update device information
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="manufacturer">Manufacturer *</Label>
              <Input
                id="manufacturer"
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                placeholder="e.g., Apple, Samsung"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="device_category">Device Category *</Label>
              <Input
                id="device_category"
                value={formData.device_category}
                onChange={(e) => setFormData({ ...formData, device_category: e.target.value })}
                placeholder="e.g., Smartphone, Tablet"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model_name">Model Name *</Label>
            <Input
              id="model_name"
              value={formData.model_name}
              onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
              placeholder="e.g., iPhone 15 Pro"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rrp">RRP (£) *</Label>
              <Input
                id="rrp"
                type="number"
                step="0.01"
                min="0"
                value={formData.rrp}
                onChange={(e) => setFormData({ ...formData, rrp: e.target.value })}
                placeholder="999.99"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="external_reference">External Reference</Label>
              <Input
                id="external_reference"
                value={formData.external_reference}
                onChange={(e) => setFormData({ ...formData, external_reference: e.target.value })}
                placeholder="External mapping code"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manufacturer_warranty_months">
              Manufacturer Warranty (months)
              {categoryWarranty && (
                <span className="text-muted-foreground font-normal ml-2">
                  — Category default: {categoryWarranty} months
                </span>
              )}
            </Label>
            <Input
              id="manufacturer_warranty_months"
              type="number"
              min="0"
              value={formData.manufacturer_warranty_months}
              onChange={(e) => setFormData({ ...formData, manufacturer_warranty_months: e.target.value })}
              placeholder={categoryWarranty ? `Leave blank to use category default (${categoryWarranty})` : "Enter warranty months"}
            />
            <p className="text-xs text-muted-foreground">
              Effective warranty: <strong>{effectiveWarranty || 12} months</strong>
              {!formData.manufacturer_warranty_months && categoryWarranty && " (from category)"}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trade_in_faulty">Trade-in Faulty (£)</Label>
              <Input
                id="trade_in_faulty"
                type="number"
                step="0.01"
                min="0"
                value={formData.trade_in_faulty}
                onChange={(e) => setFormData({ ...formData, trade_in_faulty: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="refurb_buy">Refurb Buy (£)</Label>
              <Input
                id="refurb_buy"
                type="number"
                step="0.01"
                min="0"
                value={formData.refurb_buy}
                onChange={(e) => setFormData({ ...formData, refurb_buy: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price_expiry">Price Expiry</Label>
              <Input
                id="price_expiry"
                type="date"
                value={formData.price_expiry}
                onChange={(e) => setFormData({ ...formData, price_expiry: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="include_in_promos"
              checked={formData.include_in_promos}
              onCheckedChange={(checked) => setFormData({ ...formData, include_in_promos: checked as boolean })}
            />
            <Label htmlFor="include_in_promos" className="cursor-pointer">
              Include in running promotions
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Device"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}