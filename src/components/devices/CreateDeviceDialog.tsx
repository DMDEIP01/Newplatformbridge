import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreateDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface CategoryWithWarranty {
  name: string;
  manufacturer_warranty_months: number;
}

export function CreateDeviceDialog({ open, onOpenChange, onSuccess }: CreateDeviceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<CategoryWithWarranty[]>([]);
  const [selectedCategoryWarranty, setSelectedCategoryWarranty] = useState<number | null>(null);
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
    if (open) {
      fetchCategories();
    }
  }, [open]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("device_categories")
        .select("name, manufacturer_warranty_months")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error("Failed to load categories:", error);
    }
  };

  const handleCategoryChange = (value: string) => {
    setFormData({ ...formData, device_category: value });
    const category = categories.find(c => c.name === value);
    setSelectedCategoryWarranty(category?.manufacturer_warranty_months || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const warrantyMonths = formData.manufacturer_warranty_months 
        ? parseInt(formData.manufacturer_warranty_months) 
        : null;

      const { error } = await supabase
        .from("devices")
        .insert({
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
        });

      if (error) throw error;

      toast.success("Device created successfully");
      onSuccess();
      onOpenChange(false);
      setFormData({
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
      setSelectedCategoryWarranty(null);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Device</DialogTitle>
          <DialogDescription>
            Add a new device to the system
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
              <Select
                value={formData.device_category}
                onValueChange={handleCategoryChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.name} value={category.name}>
                      {category.name} ({category.manufacturer_warranty_months}m warranty)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              {selectedCategoryWarranty && (
                <span className="text-muted-foreground font-normal ml-2">
                  — Category default: {selectedCategoryWarranty} months
                </span>
              )}
            </Label>
            <Input
              id="manufacturer_warranty_months"
              type="number"
              min="0"
              value={formData.manufacturer_warranty_months}
              onChange={(e) => setFormData({ ...formData, manufacturer_warranty_months: e.target.value })}
              placeholder={selectedCategoryWarranty ? `Leave blank to use category default (${selectedCategoryWarranty})` : "Enter warranty months"}
            />
            <p className="text-xs text-muted-foreground">
              Override the category default warranty period for this specific model. Leave blank to use category default.
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
              {loading ? "Creating..." : "Create Device"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}