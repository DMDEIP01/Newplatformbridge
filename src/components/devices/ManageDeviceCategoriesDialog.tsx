import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Save, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ManageDeviceCategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface DeviceCategory {
  id: string;
  name: string;
  is_active: boolean;
  manufacturer_warranty_months: number;
}

export function ManageDeviceCategoriesDialog({ open, onOpenChange, onSuccess }: ManageDeviceCategoriesDialogProps) {
  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [applyingToDevices, setApplyingToDevices] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [newWarrantyMonths, setNewWarrantyMonths] = useState("12");
  const [editingWarranty, setEditingWarranty] = useState<{ [key: string]: string }>({});
  const [deviceCounts, setDeviceCounts] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    if (open) {
      fetchCategories();
      fetchDeviceCounts();
    }
  }, [open]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("device_categories")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setCategories(data || []);
      // Initialize editing state
      const warrantyState: { [key: string]: string } = {};
      data?.forEach(cat => {
        warrantyState[cat.id] = cat.manufacturer_warranty_months.toString();
      });
      setEditingWarranty(warrantyState);
    } catch (error: any) {
      toast.error("Failed to load categories");
    }
  };

  const fetchDeviceCounts = async () => {
    try {
      const { data, error } = await supabase
        .from("devices")
        .select("device_category");

      if (error) throw error;
      
      const counts: { [key: string]: number } = {};
      data?.forEach(device => {
        counts[device.device_category] = (counts[device.device_category] || 0) + 1;
      });
      setDeviceCounts(counts);
    } catch (error: any) {
      console.error("Failed to fetch device counts:", error);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("device_categories")
        .insert({ 
          name: newCategory.trim(),
          manufacturer_warranty_months: parseInt(newWarrantyMonths) || 12
        });

      if (error) throw error;

      toast.success("Category added successfully");
      setNewCategory("");
      setNewWarrantyMonths("12");
      fetchCategories();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (category: DeviceCategory) => {
    try {
      const { error } = await supabase
        .from("device_categories")
        .update({ is_active: !category.is_active })
        .eq("id", category.id);

      if (error) throw error;

      toast.success(`Category ${category.is_active ? 'deactivated' : 'activated'}`);
      fetchCategories();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleUpdateWarranty = async (category: DeviceCategory) => {
    const newMonths = parseInt(editingWarranty[category.id]);
    if (isNaN(newMonths) || newMonths < 0) {
      toast.error("Please enter a valid warranty period");
      return;
    }

    try {
      const { error } = await supabase
        .from("device_categories")
        .update({ manufacturer_warranty_months: newMonths })
        .eq("id", category.id);

      if (error) throw error;

      toast.success("Warranty period updated");
      fetchCategories();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleApplyWarrantyToDevices = async (category: DeviceCategory) => {
    const warrantyMonths = parseInt(editingWarranty[category.id]);
    if (isNaN(warrantyMonths) || warrantyMonths < 0) {
      toast.error("Please enter a valid warranty period");
      return;
    }

    setApplyingToDevices(category.id);
    try {
      // First update the category itself
      const { error: categoryError } = await supabase
        .from("device_categories")
        .update({ manufacturer_warranty_months: warrantyMonths })
        .eq("id", category.id);

      if (categoryError) throw categoryError;

      // Then update all devices in this category
      const { data: updatedDevices, error: devicesError } = await supabase
        .from("devices")
        .update({ manufacturer_warranty_months: warrantyMonths })
        .eq("device_category", category.name)
        .select();

      if (devicesError) throw devicesError;

      const deviceCount = updatedDevices?.length || 0;
      toast.success(`Warranty period applied to ${deviceCount} device${deviceCount !== 1 ? 's' : ''} in ${category.name}`);
      fetchCategories();
      fetchDeviceCounts();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setApplyingToDevices(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Device Categories</DialogTitle>
          <DialogDescription>
            Add or manage device categories and their default manufacturer warranty periods. 
            Use "Apply to Devices" to update all devices in a category.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <form onSubmit={handleAddCategory} className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Enter new category name..."
                  disabled={loading}
                />
              </div>
              <div className="w-32">
                <Input
                  type="number"
                  min="0"
                  value={newWarrantyMonths}
                  onChange={(e) => setNewWarrantyMonths(e.target.value)}
                  placeholder="Warranty"
                  disabled={loading}
                />
              </div>
              <Button type="submit" disabled={loading || !newCategory.trim()}>
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Warranty period is in months (default: 12)
            </p>
          </form>

          <div className="space-y-2">
            <Label>Existing Categories</Label>
            <div className="max-h-96 overflow-y-auto space-y-2 border rounded-md p-4">
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No categories found
                </p>
              ) : (
                categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex flex-col p-3 bg-muted/50 rounded-md gap-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="font-medium">{category.name}</span>
                        {!category.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        {deviceCounts[category.name] > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {deviceCounts[category.name]} device{deviceCounts[category.name] !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(category)}
                      >
                        {category.is_active ? (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Deactivate
                          </>
                        ) : (
                          "Activate"
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Label className="text-xs text-muted-foreground">Warranty:</Label>
                        <Input
                          type="number"
                          min="0"
                          className="w-20 h-8"
                          value={editingWarranty[category.id] || ""}
                          onChange={(e) => setEditingWarranty({
                            ...editingWarranty,
                            [category.id]: e.target.value
                          })}
                        />
                        <span className="text-xs text-muted-foreground">months</span>
                      </div>
                      {editingWarranty[category.id] !== category.manufacturer_warranty_months.toString() && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => handleUpdateWarranty(category)}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          Save Category
                        </Button>
                      )}
                      {deviceCounts[category.name] > 0 && (
                        <Button
                          variant="default"
                          size="sm"
                          className="h-8"
                          onClick={() => handleApplyWarrantyToDevices(category)}
                          disabled={applyingToDevices === category.id}
                        >
                          {applyingToDevices === category.id ? (
                            <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-1" />
                          )}
                          Apply to {deviceCounts[category.name]} Device{deviceCounts[category.name] !== 1 ? 's' : ''}
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              "Apply to Devices" will update all devices in the category. Individual devices can still be edited separately.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}