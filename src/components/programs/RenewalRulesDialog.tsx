import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export interface RenewalRules {
  eligibility: {
    noOutstandingPremiums: boolean;
    noFraudulentClaims: boolean;
    maxRenewals: number | null;
    maxProductAge: number | null;
  };
  window: {
    daysBeforeExpiry: number;
    gracePeriodDays: number;
    reinstatementGracePeriodDays: number;
    policySaleConcessionDays: number;
  };
  pricing: {
    type: string;
    adjustmentFactors: string[];
  };
  coverageChanges: {
    reducedCoverage: boolean;
    increasedDeductibles: boolean;
    expandedExclusions: boolean;
  };
  renewalType: {
    autoRenew: boolean;
    requiresConfirmation: boolean;
  };
  documentation: {
    proofOfCondition: boolean;
    serialNumberConfirmation: boolean;
    updatedInfo: boolean;
  };
}

interface RenewalRulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rules: RenewalRules;
  onSave: (rules: RenewalRules) => void;
}

const defaultRules: RenewalRules = {
  eligibility: {
    noOutstandingPremiums: true,
    noFraudulentClaims: true,
    maxRenewals: null,
    maxProductAge: null,
  },
  window: {
    daysBeforeExpiry: 30,
    gracePeriodDays: 10,
    reinstatementGracePeriodDays: 0,
    policySaleConcessionDays: 0,
  },
  pricing: {
    type: "same",
    adjustmentFactors: [],
  },
  coverageChanges: {
    reducedCoverage: false,
    increasedDeductibles: false,
    expandedExclusions: false,
  },
  renewalType: {
    autoRenew: false,
    requiresConfirmation: true,
  },
  documentation: {
    proofOfCondition: false,
    serialNumberConfirmation: false,
    updatedInfo: false,
  },
};

export const RenewalRulesDialog = ({ open, onOpenChange, rules, onSave }: RenewalRulesDialogProps) => {
  const [formData, setFormData] = useState<RenewalRules>(defaultRules);
  const [newAdjustmentFactor, setNewAdjustmentFactor] = useState("");

  useEffect(() => {
    if (open) {
      setFormData(rules || defaultRules);
    }
  }, [open, rules]);

  const handleSave = () => {
    onSave(formData);
    onOpenChange(false);
  };

  const addAdjustmentFactor = () => {
    if (newAdjustmentFactor.trim()) {
      setFormData(prev => ({
        ...prev,
        pricing: {
          ...prev.pricing,
          adjustmentFactors: [...prev.pricing.adjustmentFactors, newAdjustmentFactor.trim()],
        },
      }));
      setNewAdjustmentFactor("");
    }
  };

  const removeAdjustmentFactor = (index: number) => {
    setFormData(prev => ({
      ...prev,
      pricing: {
        ...prev.pricing,
        adjustmentFactors: prev.pricing.adjustmentFactors.filter((_, i) => i !== index),
      },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Renewal Rules</DialogTitle>
        </DialogHeader>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="eligibility">
            <AccordionTrigger>Renewal Eligibility</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="no-outstanding"
                  checked={formData.eligibility.noOutstandingPremiums}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    eligibility: { ...prev.eligibility, noOutstandingPremiums: checked === true }
                  }))}
                />
                <Label htmlFor="no-outstanding">No Outstanding Premiums Required</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="no-fraud"
                  checked={formData.eligibility.noFraudulentClaims}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    eligibility: { ...prev.eligibility, noFraudulentClaims: checked === true }
                  }))}
                />
                <Label htmlFor="no-fraud">No Fraudulent Claims Required</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Maximum Number of Renewals</Label>
                  <Input
                    type="number"
                    value={formData.eligibility.maxRenewals || ""}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      eligibility: { ...prev.eligibility, maxRenewals: e.target.value ? parseInt(e.target.value) : null }
                    }))}
                    placeholder="Unlimited"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Product Age (months)</Label>
                  <Input
                    type="number"
                    value={formData.eligibility.maxProductAge || ""}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      eligibility: { ...prev.eligibility, maxProductAge: e.target.value ? parseInt(e.target.value) : null }
                    }))}
                    placeholder="No limit"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="window">
            <AccordionTrigger>Renewal Window</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Days Before Expiry</Label>
                  <Input
                    type="number"
                    value={formData.window.daysBeforeExpiry}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      window: { ...prev.window, daysBeforeExpiry: parseInt(e.target.value) || 0 }
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Grace Period (days)</Label>
                  <Input
                    type="number"
                    value={formData.window.gracePeriodDays}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      window: { ...prev.window, gracePeriodDays: parseInt(e.target.value) || 0 }
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Reinstatement Grace Period (days)</Label>
                  <Input
                    type="number"
                    value={formData.window.reinstatementGracePeriodDays}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      window: { ...prev.window, reinstatementGracePeriodDays: parseInt(e.target.value) || 0 }
                    }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Policy Sale Concession Period (days)</Label>
                  <Input
                    type="number"
                    value={formData.window.policySaleConcessionDays}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      window: { ...prev.window, policySaleConcessionDays: parseInt(e.target.value) || 0 }
                    }))}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="pricing">
            <AccordionTrigger>Pricing Rules</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="space-y-2">
                <Label>Pricing Type</Label>
                <Select
                  value={formData.pricing.type}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    pricing: { ...prev.pricing, type: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="same">Same Premium</SelectItem>
                    <SelectItem value="adjusted">Adjusted Premium</SelectItem>
                    <SelectItem value="market_based">Market-Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.pricing.type === "adjusted" && (
                <div className="space-y-2">
                  <Label>Adjustment Factors</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newAdjustmentFactor}
                      onChange={(e) => setNewAdjustmentFactor(e.target.value)}
                      placeholder="e.g., Product age, Claims history"
                      onKeyPress={(e) => e.key === 'Enter' && addAdjustmentFactor()}
                    />
                    <Button type="button" onClick={addAdjustmentFactor}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.pricing.adjustmentFactors.map((factor, index) => (
                      <div key={index} className="bg-secondary text-secondary-foreground px-3 py-1 rounded-md flex items-center gap-2">
                        {factor}
                        <button onClick={() => removeAdjustmentFactor(index)} className="text-destructive">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="coverage-changes">
            <AccordionTrigger>Coverage Changes at Renewal</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reduced-coverage"
                  checked={formData.coverageChanges.reducedCoverage}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    coverageChanges: { ...prev.coverageChanges, reducedCoverage: checked === true }
                  }))}
                />
                <Label htmlFor="reduced-coverage">Coverage Reduces with Product Age</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="increased-deductibles"
                  checked={formData.coverageChanges.increasedDeductibles}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    coverageChanges: { ...prev.coverageChanges, increasedDeductibles: checked === true }
                  }))}
                />
                <Label htmlFor="increased-deductibles">Deductibles May Increase</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="expanded-exclusions"
                  checked={formData.coverageChanges.expandedExclusions}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    coverageChanges: { ...prev.coverageChanges, expandedExclusions: checked === true }
                  }))}
                />
                <Label htmlFor="expanded-exclusions">Exclusions May Expand</Label>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="renewal-type">
            <AccordionTrigger>Renewal Type</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="auto-renew"
                  checked={formData.renewalType.autoRenew}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    renewalType: { ...prev.renewalType, autoRenew: checked === true }
                  }))}
                />
                <Label htmlFor="auto-renew">Auto-Renew Enabled</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requires-confirmation"
                  checked={formData.renewalType.requiresConfirmation}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    renewalType: { ...prev.renewalType, requiresConfirmation: checked === true }
                  }))}
                />
                <Label htmlFor="requires-confirmation">Customer Confirmation Required</Label>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="documentation">
            <AccordionTrigger>Documentation Requirements</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="proof-of-condition"
                  checked={formData.documentation.proofOfCondition}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    documentation: { ...prev.documentation, proofOfCondition: checked === true }
                  }))}
                />
                <Label htmlFor="proof-of-condition">Proof of Condition Required</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="serial-confirmation"
                  checked={formData.documentation.serialNumberConfirmation}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    documentation: { ...prev.documentation, serialNumberConfirmation: checked === true }
                  }))}
                />
                <Label htmlFor="serial-confirmation">Serial Number Confirmation Required</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="updated-info"
                  checked={formData.documentation.updatedInfo}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    documentation: { ...prev.documentation, updatedInfo: checked === true }
                  }))}
                />
                <Label htmlFor="updated-info">Updated Information Required</Label>
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