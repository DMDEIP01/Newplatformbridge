import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const COUNTRIES = [
  "United Kingdom", "Germany", "France", "Spain", "Italy", "Netherlands", 
  "Belgium", "Austria", "Switzerland", "Poland", "Sweden", "Norway", 
  "Denmark", "Finland", "Ireland", "Portugal", "Greece", "Czech Republic",
  "Hungary", "Romania", "Bulgaria", "Croatia", "Slovakia", "Slovenia",
  "Lithuania", "Latvia", "Estonia", "Luxembourg", "Malta", "Cyprus",
  "United States", "Canada", "Australia", "New Zealand", "Japan",
  "South Korea", "Singapore", "India", "China", "Brazil", "Mexico",
  "Argentina", "South Africa", "Egypt", "United Arab Emirates", "Saudi Arabia",
  "Turkey", "Russia", "Ukraine", "Israel"
];

interface CreateRepairerDialogProps {
  onRepairerCreated: () => void;
}

export default function CreateRepairerDialog({ onRepairerCreated }: CreateRepairerDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    company_name: "",
    contact_email: "",
    contact_phone: "",
    address_line1: "",
    address_line2: "",
    city: "",
    postcode: "",
    country: "",
    coverage_areas: "",
    specializations: "",
    connectivity_type: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("repairers").insert({
        name: formData.name,
        company_name: formData.company_name,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone || null,
        address_line1: formData.address_line1 || null,
        address_line2: formData.address_line2 || null,
        city: formData.city || null,
        postcode: formData.postcode || null,
        country: formData.country || null,
        coverage_areas: formData.coverage_areas ? formData.coverage_areas.split(",").map(a => a.trim()) : [],
        specializations: formData.specializations ? formData.specializations.split(",").map(s => s.trim()) : [],
        connectivity_type: formData.connectivity_type || null,
      });

      if (error) throw error;

      toast.success("Repairer company created successfully");
      setOpen(false);
      setFormData({
        name: "",
        company_name: "",
        contact_email: "",
        contact_phone: "",
        address_line1: "",
        address_line2: "",
        city: "",
        postcode: "",
        country: "",
        coverage_areas: "",
        specializations: "",
        connectivity_type: "",
      });
      onRepairerCreated();
    } catch (error: any) {
      console.error("Error creating repairer:", error);
      toast.error(error.message || "Failed to create repairer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Repairer Company
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Repairer Company</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Contact Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact_email">Email *</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                required
              />
            </div>
          <div>
            <Label htmlFor="connectivity_type">Connectivity Type</Label>
            <Select
              value={formData.connectivity_type}
              onValueChange={(value) => setFormData({ ...formData, connectivity_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select connectivity type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EIP API">EIP API</SelectItem>
                <SelectItem value="EIP SFTP">EIP SFTP</SelectItem>
                <SelectItem value="EIP Portal">EIP Portal</SelectItem>
                <SelectItem value="Repairer SFTP">Repairer SFTP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
              <Label htmlFor="contact_phone">Phone</Label>
              <Input
                id="contact_phone"
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address_line1">Address Line 1</Label>
            <Input
              id="address_line1"
              value={formData.address_line1}
              onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="address_line2">Address Line 2</Label>
            <Input
              id="address_line2"
              value={formData.address_line2}
              onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="postcode">Postcode</Label>
              <Input
                id="postcode"
                value={formData.postcode}
                onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Select
                value={formData.country}
                onValueChange={(value) => setFormData({ ...formData, country: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="coverage_areas">Coverage Areas (comma-separated)</Label>
            <Textarea
              id="coverage_areas"
              value={formData.coverage_areas}
              onChange={(e) => setFormData({ ...formData, coverage_areas: e.target.value })}
              placeholder="e.g. North London, South East"
            />
          </div>

          <div>
            <Label htmlFor="specializations">Specializations (comma-separated)</Label>
            <Textarea
              id="specializations"
              value={formData.specializations}
              onChange={(e) => setFormData({ ...formData, specializations: e.target.value })}
              placeholder="e.g. Smartphones, Laptops, Tablets"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Repairer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
