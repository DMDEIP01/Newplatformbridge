import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function RetailCustomerEdit() {
  const { policyId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const customerData = location.state?.customerData;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    customer_address_line1: "",
    customer_address_line2: "",
    customer_city: "",
    customer_postcode: "",
  });

  useEffect(() => {
    if (customerData) {
      setFormData({
        customer_name: customerData.customer_name || "",
        customer_email: customerData.customer_email || "",
        customer_phone: customerData.customer_phone || "",
        customer_address_line1: customerData.customer_address_line1 || "",
        customer_address_line2: customerData.customer_address_line2 || "",
        customer_city: customerData.customer_city || "",
        customer_postcode: customerData.customer_postcode || "",
      });
    }
  }, [customerData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer_name || !formData.customer_email) {
      toast.error("Name and email are required");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("policies")
        .update({
          customer_name: formData.customer_name,
          customer_email: formData.customer_email,
          customer_phone: formData.customer_phone || null,
          customer_address_line1: formData.customer_address_line1 || null,
          customer_address_line2: formData.customer_address_line2 || null,
          customer_city: formData.customer_city || null,
          customer_postcode: formData.customer_postcode || null,
        })
        .eq("id", policyId);

      if (error) throw error;

      toast.success("Customer details updated successfully");
      navigate(`/retail/policies/${policyId}`);
    } catch (error) {
      console.error("Error updating customer:", error);
      toast.error("Failed to update customer details");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="container mx-auto p-6 max-w-3xl animate-fade-in">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="gap-2 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Edit Customer Details</h1>
        <p className="text-muted-foreground mt-2">
          Update customer information for this policy
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer_name">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customer_name"
                  value={formData.customer_name}
                  onChange={(e) => handleChange("customer_name", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customer_email"
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => handleChange("customer_email", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_phone">Phone Number</Label>
              <Input
                id="customer_phone"
                type="tel"
                value={formData.customer_phone}
                onChange={(e) => handleChange("customer_phone", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_address_line1">Address Line 1</Label>
              <Input
                id="customer_address_line1"
                value={formData.customer_address_line1}
                onChange={(e) => handleChange("customer_address_line1", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_address_line2">Address Line 2</Label>
              <Input
                id="customer_address_line2"
                value={formData.customer_address_line2}
                onChange={(e) => handleChange("customer_address_line2", e.target.value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customer_city">City</Label>
                <Input
                  id="customer_city"
                  value={formData.customer_city}
                  onChange={(e) => handleChange("customer_city", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_postcode">Postcode</Label>
                <Input
                  id="customer_postcode"
                  value={formData.customer_postcode}
                  onChange={(e) => handleChange("customer_postcode", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end mt-6 sticky bottom-0 bg-background py-4 border-t">
          <Button 
            type="button"
            variant="outline" 
            onClick={() => navigate(-1)} 
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading} size="lg">
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
