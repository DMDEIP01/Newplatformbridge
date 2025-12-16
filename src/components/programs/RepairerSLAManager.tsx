import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Clock, TrendingUp, Star, Trash2, Plus } from "lucide-react";

const DEVICE_CATEGORIES = [
  "Smartphones",
  "Tablets",
  "Laptops",
  "Smartwatches",
  "Headphones",
  "Gaming Consoles",
  "Cameras",
  "Home Appliances"
];

interface SLA {
  id: string;
  device_category: string;
  response_time_hours: number;
  repair_time_hours: number;
  availability_hours: string;
  quality_score: number;
  success_rate: number;
  notes: string | null;
}

interface RepairerSLAManagerProps {
  repairerId: string;
  specializations: string[];
}

export default function RepairerSLAManager({ repairerId, specializations }: RepairerSLAManagerProps) {
  const [slas, setSlas] = useState<SLA[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSla, setNewSla] = useState({
    device_category: "",
    response_time_hours: 24,
    repair_time_hours: 72,
    availability_hours: "9am-5pm Mon-Fri",
    quality_score: 0,
    success_rate: 0,
    notes: "",
  });

  useEffect(() => {
    loadSLAs();
  }, [repairerId]);

  const loadSLAs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("repairer_slas")
        .select("*")
        .eq("repairer_id", repairerId)
        .order("device_category");

      if (error) throw error;
      setSlas(data || []);
    } catch (error) {
      console.error("Error loading SLAs:", error);
      toast.error("Failed to load SLAs");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSLA = async () => {
    if (!newSla.device_category) {
      toast.error("Please select a device category");
      return;
    }

    try {
      const { error } = await supabase
        .from("repairer_slas")
        .insert({
          repairer_id: repairerId,
          ...newSla,
          notes: newSla.notes || null,
        });

      if (error) throw error;

      toast.success("SLA added successfully");
      setShowAddForm(false);
      setNewSla({
        device_category: "",
        response_time_hours: 24,
        repair_time_hours: 72,
        availability_hours: "9am-5pm Mon-Fri",
        quality_score: 0,
        success_rate: 0,
        notes: "",
      });
      loadSLAs();
    } catch (error: any) {
      console.error("Error adding SLA:", error);
      if (error.code === "23505") {
        toast.error("SLA already exists for this category");
      } else {
        toast.error("Failed to add SLA");
      }
    }
  };

  const handleDeleteSLA = async (slaId: string) => {
    try {
      const { error } = await supabase
        .from("repairer_slas")
        .delete()
        .eq("id", slaId);

      if (error) throw error;

      toast.success("SLA deleted successfully");
      loadSLAs();
    } catch (error) {
      console.error("Error deleting SLA:", error);
      toast.error("Failed to delete SLA");
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading SLAs...</div>;
  }

  // Only show categories that match the repairer's specializations and aren't already covered
  const availableCategories = specializations.filter(
    cat => !slas.some(sla => sla.device_category === cat)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Service Level Agreements</h3>
          <p className="text-sm text-muted-foreground">
            Configure SLA metrics for each device category
          </p>
        </div>
        {availableCategories.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add SLA
          </Button>
        )}
      </div>

      {showAddForm && availableCategories.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-base">Add New SLA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Device Category *</Label>
                <Select
                  value={newSla.device_category}
                  onValueChange={(value) => setNewSla({ ...newSla, device_category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Response Time (hours)</Label>
                <Input
                  type="number"
                  min="1"
                  value={newSla.response_time_hours}
                  onChange={(e) => setNewSla({ ...newSla, response_time_hours: parseInt(e.target.value) || 24 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Repair Time (hours)</Label>
                <Input
                  type="number"
                  min="1"
                  value={newSla.repair_time_hours}
                  onChange={(e) => setNewSla({ ...newSla, repair_time_hours: parseInt(e.target.value) || 72 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Availability Hours</Label>
                <Input
                  value={newSla.availability_hours}
                  onChange={(e) => setNewSla({ ...newSla, availability_hours: e.target.value })}
                  placeholder="e.g., 9am-5pm Mon-Fri"
                />
              </div>

              <div className="space-y-2">
                <Label>Quality Score (0-5)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={newSla.quality_score}
                  onChange={(e) => setNewSla({ ...newSla, quality_score: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Success Rate (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={newSla.success_rate}
                  onChange={(e) => setNewSla({ ...newSla, success_rate: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={newSla.notes}
                onChange={(e) => setNewSla({ ...newSla, notes: e.target.value })}
                placeholder="Additional notes or special conditions..."
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button type="button" onClick={handleAddSLA}>
                Add SLA
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setNewSla({
                    device_category: "",
                    response_time_hours: 24,
                    repair_time_hours: 72,
                    availability_hours: "9am-5pm Mon-Fri",
                    quality_score: 0,
                    success_rate: 0,
                    notes: "",
                  });
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {slas.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              No SLAs configured yet. Click "Add SLA" to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {slas.map((sla) => (
            <Card key={sla.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{sla.device_category}</CardTitle>
                    <CardDescription className="mt-1">{sla.availability_hours}</CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSLA(sla.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Response:</span>
                  <span className="font-medium">{sla.response_time_hours}h</span>
                  <span className="text-muted-foreground ml-2">Repair:</span>
                  <span className="font-medium">{sla.repair_time_hours}h</span>
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Quality:</span>
                    <span className="font-medium">{sla.quality_score.toFixed(1)}/5.0</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Success:</span>
                    <span className="font-medium">{sla.success_rate.toFixed(1)}%</span>
                  </div>
                </div>

                {sla.notes && (
                  <p className="text-sm text-muted-foreground border-t pt-3">
                    {sla.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
