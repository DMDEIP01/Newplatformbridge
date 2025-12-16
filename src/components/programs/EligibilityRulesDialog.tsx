import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export interface EligibilityRules {
  customer: {
    ageRequirements: { min: number | null; max: number | null };
    residencyRestrictions: string[];
    healthDeclaration: boolean;
    noPriorClaims: boolean;
  };
  product: {
    productTypes: string[];
    brandRestrictions: string[];
    maxProductAge: number | null;
    maxValue: number | null;
    minValue: number | null;
    usageType: string;
    preExistingConditions: string;
  };
  verification: {
    proofOfPurchase: boolean;
    serialNumber: boolean;
    inspectionRequired: boolean;
  };
}

interface EligibilityRulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rules: EligibilityRules;
  onSave: (rules: EligibilityRules) => void;
}

const defaultRules: EligibilityRules = {
  customer: {
    ageRequirements: { min: null, max: null },
    residencyRestrictions: [],
    healthDeclaration: false,
    noPriorClaims: false,
  },
  product: {
    productTypes: [],
    brandRestrictions: [],
    maxProductAge: null,
    maxValue: null,
    minValue: null,
    usageType: "personal",
    preExistingConditions: "not_covered",
  },
  verification: {
    proofOfPurchase: true,
    serialNumber: false,
    inspectionRequired: false,
  },
};

export const EligibilityRulesDialog = ({ open, onOpenChange, rules, onSave }: EligibilityRulesDialogProps) => {
  const [formData, setFormData] = useState<EligibilityRules>(defaultRules);
  const [newRestriction, setNewRestriction] = useState("");
  const [newProductType, setNewProductType] = useState("");
  const [newBrand, setNewBrand] = useState("");

  useEffect(() => {
    if (open) {
      setFormData(rules || defaultRules);
    }
  }, [open, rules]);

  const handleSave = () => {
    onSave(formData);
    onOpenChange(false);
  };

  const addRestriction = () => {
    if (newRestriction.trim()) {
      setFormData(prev => ({
        ...prev,
        customer: {
          ...prev.customer,
          residencyRestrictions: [...prev.customer.residencyRestrictions, newRestriction.trim()],
        },
      }));
      setNewRestriction("");
    }
  };

  const removeRestriction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      customer: {
        ...prev.customer,
        residencyRestrictions: prev.customer.residencyRestrictions.filter((_, i) => i !== index),
      },
    }));
  };

  const addProductType = () => {
    if (newProductType.trim()) {
      setFormData(prev => ({
        ...prev,
        product: {
          ...prev.product,
          productTypes: [...prev.product.productTypes, newProductType.trim()],
        },
      }));
      setNewProductType("");
    }
  };

  const removeProductType = (index: number) => {
    setFormData(prev => ({
      ...prev,
      product: {
        ...prev.product,
        productTypes: prev.product.productTypes.filter((_, i) => i !== index),
      },
    }));
  };

  const addBrand = () => {
    if (newBrand.trim()) {
      setFormData(prev => ({
        ...prev,
        product: {
          ...prev.product,
          brandRestrictions: [...prev.product.brandRestrictions, newBrand.trim()],
        },
      }));
      setNewBrand("");
    }
  };

  const removeBrand = (index: number) => {
    setFormData(prev => ({
      ...prev,
      product: {
        ...prev.product,
        brandRestrictions: prev.product.brandRestrictions.filter((_, i) => i !== index),
      },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Eligibility Rules</DialogTitle>
        </DialogHeader>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="customer">
            <AccordionTrigger>Customer Eligibility</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Minimum Age</Label>
                  <Input
                    type="number"
                    value={formData.customer.ageRequirements.min || ""}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      customer: {
                        ...prev.customer,
                        ageRequirements: { ...prev.customer.ageRequirements, min: e.target.value ? parseInt(e.target.value) : null }
                      }
                    }))}
                    placeholder="No minimum"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Maximum Age</Label>
                  <Input
                    type="number"
                    value={formData.customer.ageRequirements.max || ""}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      customer: {
                        ...prev.customer,
                        ageRequirements: { ...prev.customer.ageRequirements, max: e.target.value ? parseInt(e.target.value) : null }
                      }
                    }))}
                    placeholder="No maximum"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Residency Restrictions</Label>
                <div className="flex gap-2">
                  <Input
                    value={newRestriction}
                    onChange={(e) => setNewRestriction(e.target.value)}
                    placeholder="e.g., UK, EU"
                    onKeyPress={(e) => e.key === 'Enter' && addRestriction()}
                  />
                  <Button type="button" onClick={addRestriction}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.customer.residencyRestrictions.map((restriction, index) => (
                    <div key={index} className="bg-secondary text-secondary-foreground px-3 py-1 rounded-md flex items-center gap-2">
                      {restriction}
                      <button onClick={() => removeRestriction(index)} className="text-destructive">×</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="health-declaration"
                  checked={formData.customer.healthDeclaration}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    customer: { ...prev.customer, healthDeclaration: checked === true }
                  }))}
                />
                <Label htmlFor="health-declaration">Require Health Declaration</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="no-prior-claims"
                  checked={formData.customer.noPriorClaims}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    customer: { ...prev.customer, noPriorClaims: checked === true }
                  }))}
                />
                <Label htmlFor="no-prior-claims">No Prior Claims Required</Label>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="product">
            <AccordionTrigger>Product Eligibility</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="space-y-2">
                <Label>Product Types</Label>
                <div className="flex gap-2">
                  <Input
                    value={newProductType}
                    onChange={(e) => setNewProductType(e.target.value)}
                    placeholder="e.g., TV, Smartphone"
                    onKeyPress={(e) => e.key === 'Enter' && addProductType()}
                  />
                  <Button type="button" onClick={addProductType}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.product.productTypes.map((type, index) => (
                    <div key={index} className="bg-secondary text-secondary-foreground px-3 py-1 rounded-md flex items-center gap-2">
                      {type}
                      <button onClick={() => removeProductType(index)} className="text-destructive">×</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Brand Restrictions</Label>
                <div className="flex gap-2">
                  <Input
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    placeholder="e.g., Samsung, Apple"
                    onKeyPress={(e) => e.key === 'Enter' && addBrand()}
                  />
                  <Button type="button" onClick={addBrand}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.product.brandRestrictions.map((brand, index) => (
                    <div key={index} className="bg-secondary text-secondary-foreground px-3 py-1 rounded-md flex items-center gap-2">
                      {brand}
                      <button onClick={() => removeBrand(index)} className="text-destructive">×</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Product Age (days)</Label>
                  <Input
                    type="number"
                    value={formData.product.maxProductAge || ""}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      product: { ...prev.product, maxProductAge: e.target.value ? parseInt(e.target.value) : null }
                    }))}
                    placeholder="e.g., 30"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Usage Type</Label>
                  <Select
                    value={formData.product.usageType}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      product: { ...prev.product, usageType: value }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Value (£)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.product.minValue || ""}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      product: { ...prev.product, minValue: e.target.value ? parseFloat(e.target.value) : null }
                    }))}
                    placeholder="No minimum"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Value (£)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.product.maxValue || ""}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      product: { ...prev.product, maxValue: e.target.value ? parseFloat(e.target.value) : null }
                    }))}
                    placeholder="No maximum"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Pre-existing Conditions</Label>
                <Select
                  value={formData.product.preExistingConditions}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    product: { ...prev.product, preExistingConditions: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_covered">Not Covered</SelectItem>
                    <SelectItem value="covered_with_inspection">Covered with Inspection</SelectItem>
                    <SelectItem value="covered">Fully Covered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="verification">
            <AccordionTrigger>Verification Requirements</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="proof-of-purchase"
                  checked={formData.verification.proofOfPurchase}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    verification: { ...prev.verification, proofOfPurchase: checked === true }
                  }))}
                />
                <Label htmlFor="proof-of-purchase">Proof of Purchase Required</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="serial-number"
                  checked={formData.verification.serialNumber}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    verification: { ...prev.verification, serialNumber: checked === true }
                  }))}
                />
                <Label htmlFor="serial-number">Serial Number Required</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="inspection-required"
                  checked={formData.verification.inspectionRequired}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    verification: { ...prev.verification, inspectionRequired: checked === true }
                  }))}
                />
                <Label htmlFor="inspection-required">Inspection Required</Label>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Rules</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};