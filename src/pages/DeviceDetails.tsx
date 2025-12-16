import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";

interface Device {
  id: string;
  manufacturer: string;
  device_category: string;
  model_name: string;
  rrp: number;
  include_in_promos: boolean;
  external_reference: string | null;
}

export default function DeviceDetails() {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    manufacturer: "",
    device_category: "",
    model_name: "",
    rrp: 0,
    include_in_promos: false,
    external_reference: "",
  });

  useEffect(() => {
    if (deviceId) {
      fetchDevice();
    }
  }, [deviceId]);

  const fetchDevice = async () => {
    try {
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .eq("id", deviceId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          manufacturer: data.manufacturer,
          device_category: data.device_category,
          model_name: data.model_name,
          rrp: data.rrp,
          include_in_promos: data.include_in_promos,
          external_reference: data.external_reference || "",
        });
      }
    } catch (error: any) {
      toast.error("Failed to load device details");
      navigate("/program-configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from("devices")
        .update({
          manufacturer: formData.manufacturer,
          device_category: formData.device_category,
          model_name: formData.model_name,
          rrp: formData.rrp,
          include_in_promos: formData.include_in_promos,
          external_reference: formData.external_reference || null,
        })
        .eq("id", deviceId);

      if (error) throw error;

      toast.success("Device updated successfully");
      navigate("/program-configuration");
    } catch (error: any) {
      toast.error("Failed to update device: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading device details...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate("/program-configuration")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Device Management
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Device Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="manufacturer">Manufacturer *</Label>
                <Input
                  id="manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) =>
                    setFormData({ ...formData, manufacturer: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="device_category">Device Category *</Label>
                <Input
                  id="device_category"
                  value={formData.device_category}
                  onChange={(e) =>
                    setFormData({ ...formData, device_category: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model_name">Model Name *</Label>
                <Input
                  id="model_name"
                  value={formData.model_name}
                  onChange={(e) =>
                    setFormData({ ...formData, model_name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rrp">RRP (£) *</Label>
                <Input
                  id="rrp"
                  type="number"
                  step="0.01"
                  value={formData.rrp}
                  onChange={(e) =>
                    setFormData({ ...formData, rrp: parseFloat(e.target.value) })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="external_reference">External Reference</Label>
                <Input
                  id="external_reference"
                  value={formData.external_reference}
                  onChange={(e) =>
                    setFormData({ ...formData, external_reference: e.target.value })
                  }
                  placeholder="Optional"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include_in_promos"
                  checked={formData.include_in_promos}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, include_in_promos: checked as boolean })
                  }
                />
                <Label htmlFor="include_in_promos" className="cursor-pointer">
                  Include in Promotions
                </Label>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/program-configuration")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
