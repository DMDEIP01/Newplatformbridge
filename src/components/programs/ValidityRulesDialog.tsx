import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export interface ValidityRules {
  effectiveStart: {
    type: string;
    waitingPeriodDays: number;
    requiresActivation: boolean;
  };
  expiration: {
    type: string;
    termMonths: number | null;
    eventBased: string | null;
  };
  activation: {
    registrationRequired: boolean;
    proofOfPurchaseUpload: boolean;
    serialNumberRequired: boolean;
  };
  coverage: {
    includedTypes: string[];
    excludedTypes: string[];
    territorialLimits: string[];
  };
  cancellation: {
    freeLookPeriodDays: number;
    proRatedRefunds: boolean;
  };
  transferability: {
    allowed: boolean;
    conditions: string;
  };
}

interface ValidityRulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rules: ValidityRules;
  onSave: (rules: ValidityRules) => void;
}

const defaultRules: ValidityRules = {
  effectiveStart: {
    type: "immediate",
    waitingPeriodDays: 0,
    requiresActivation: false,
  },
  expiration: {
    type: "fixed_term",
    termMonths: 12,
    eventBased: null,
  },
  activation: {
    registrationRequired: false,
    proofOfPurchaseUpload: false,
    serialNumberRequired: false,
  },
  coverage: {
    includedTypes: [],
    excludedTypes: [],
    territorialLimits: [],
  },
  cancellation: {
    freeLookPeriodDays: 14,
    proRatedRefunds: true,
  },
  transferability: {
    allowed: false,
    conditions: "",
  },
};

export const ValidityRulesDialog = ({ open, onOpenChange, rules, onSave }: ValidityRulesDialogProps) => {
  const [formData, setFormData] = useState<ValidityRules>(defaultRules);
  const [newIncludedType, setNewIncludedType] = useState("");
  const [newExcludedType, setNewExcludedType] = useState("");
  const [newTerritorialLimit, setNewTerritorialLimit] = useState("");

  useEffect(() => {
    if (open) {
      setFormData(rules || defaultRules);
    }
  }, [open, rules]);

  const handleSave = () => {
    onSave(formData);
    onOpenChange(false);
  };

  const addIncludedType = () => {
    if (newIncludedType.trim()) {
      setFormData(prev => ({
        ...prev,
        coverage: {
          ...prev.coverage,
          includedTypes: [...prev.coverage.includedTypes, newIncludedType.trim()],
        },
      }));
      setNewIncludedType("");
    }
  };

  const removeIncludedType = (index: number) => {
    setFormData(prev => ({
      ...prev,
      coverage: {
        ...prev.coverage,
        includedTypes: prev.coverage.includedTypes.filter((_, i) => i !== index),
      },
    }));
  };

  const addExcludedType = () => {
    if (newExcludedType.trim()) {
      setFormData(prev => ({
        ...prev,
        coverage: {
          ...prev.coverage,
          excludedTypes: [...prev.coverage.excludedTypes, newExcludedType.trim()],
        },
      }));
      setNewExcludedType("");
    }
  };

  const removeExcludedType = (index: number) => {
    setFormData(prev => ({
      ...prev,
      coverage: {
        ...prev.coverage,
        excludedTypes: prev.coverage.excludedTypes.filter((_, i) => i !== index),
      },
    }));
  };

  const addTerritorialLimit = () => {
    if (newTerritorialLimit.trim()) {
      setFormData(prev => ({
        ...prev,
        coverage: {
          ...prev.coverage,
          territorialLimits: [...prev.coverage.territorialLimits, newTerritorialLimit.trim()],
        },
      }));
      setNewTerritorialLimit("");
    }
  };

  const removeTerritorialLimit = (index: number) => {
    setFormData(prev => ({
      ...prev,
      coverage: {
        ...prev.coverage,
        territorialLimits: prev.coverage.territorialLimits.filter((_, i) => i !== index),
      },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Validity Rules</DialogTitle>
        </DialogHeader>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="effective-start">
            <AccordionTrigger>Effective Start</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="space-y-2">
                <Label>Start Type</Label>
                <Select
                  value={formData.effectiveStart.type}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    effectiveStart: { ...prev.effectiveStart, type: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="waiting_period">After Waiting Period</SelectItem>
                    <SelectItem value="activation">After Activation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.effectiveStart.type === "waiting_period" && (
                <div className="space-y-2">
                  <Label>Waiting Period (days)</Label>
                  <Input
                    type="number"
                    value={formData.effectiveStart.waitingPeriodDays}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      effectiveStart: { ...prev.effectiveStart, waitingPeriodDays: parseInt(e.target.value) || 0 }
                    }))}
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requires-activation"
                  checked={formData.effectiveStart.requiresActivation}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    effectiveStart: { ...prev.effectiveStart, requiresActivation: checked === true }
                  }))}
                />
                <Label htmlFor="requires-activation">Requires Activation</Label>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="expiration">
            <AccordionTrigger>Expiration</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="space-y-2">
                <Label>Expiration Type</Label>
                <Select
                  value={formData.expiration.type}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    expiration: { ...prev.expiration, type: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed_term">Fixed Term</SelectItem>
                    <SelectItem value="event_based">Event-Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.expiration.type === "fixed_term" && (
                <div className="space-y-2">
                  <Label>Term Length (months)</Label>
                  <Input
                    type="number"
                    value={formData.expiration.termMonths || ""}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      expiration: { ...prev.expiration, termMonths: e.target.value ? parseInt(e.target.value) : null }
                    }))}
                  />
                </div>
              )}

              {formData.expiration.type === "event_based" && (
                <div className="space-y-2">
                  <Label>Event Description</Label>
                  <Input
                    value={formData.expiration.eventBased || ""}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      expiration: { ...prev.expiration, eventBased: e.target.value }
                    }))}
                    placeholder="e.g., 100,000 miles, 5 service calls"
                  />
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="activation">
            <AccordionTrigger>Activation Requirements</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="registration-required"
                  checked={formData.activation.registrationRequired}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    activation: { ...prev.activation, registrationRequired: checked === true }
                  }))}
                />
                <Label htmlFor="registration-required">Registration Required</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="proof-upload"
                  checked={formData.activation.proofOfPurchaseUpload}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    activation: { ...prev.activation, proofOfPurchaseUpload: checked === true }
                  }))}
                />
                <Label htmlFor="proof-upload">Proof of Purchase Upload Required</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="serial-required"
                  checked={formData.activation.serialNumberRequired}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    activation: { ...prev.activation, serialNumberRequired: checked === true }
                  }))}
                />
                <Label htmlFor="serial-required">Serial Number Required</Label>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="coverage">
            <AccordionTrigger>Coverage Scope</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="space-y-2">
                <Label>Included Coverage Types</Label>
                <div className="flex gap-2">
                  <Input
                    value={newIncludedType}
                    onChange={(e) => setNewIncludedType(e.target.value)}
                    placeholder="e.g., Mechanical breakdown, Accidental damage"
                    onKeyPress={(e) => e.key === 'Enter' && addIncludedType()}
                  />
                  <Button type="button" onClick={addIncludedType}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.coverage.includedTypes.map((type, index) => (
                    <div key={index} className="bg-secondary text-secondary-foreground px-3 py-1 rounded-md flex items-center gap-2">
                      {type}
                      <button onClick={() => removeIncludedType(index)} className="text-destructive">×</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Excluded Coverage Types</Label>
                <div className="flex gap-2">
                  <Input
                    value={newExcludedType}
                    onChange={(e) => setNewExcludedType(e.target.value)}
                    placeholder="e.g., Cosmetic damage, Water damage"
                    onKeyPress={(e) => e.key === 'Enter' && addExcludedType()}
                  />
                  <Button type="button" onClick={addExcludedType}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.coverage.excludedTypes.map((type, index) => (
                    <div key={index} className="bg-secondary text-secondary-foreground px-3 py-1 rounded-md flex items-center gap-2">
                      {type}
                      <button onClick={() => removeExcludedType(index)} className="text-destructive">×</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Territorial Limits</Label>
                <div className="flex gap-2">
                  <Input
                    value={newTerritorialLimit}
                    onChange={(e) => setNewTerritorialLimit(e.target.value)}
                    placeholder="e.g., UK only, EU countries"
                    onKeyPress={(e) => e.key === 'Enter' && addTerritorialLimit()}
                  />
                  <Button type="button" onClick={addTerritorialLimit}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.coverage.territorialLimits.map((limit, index) => (
                    <div key={index} className="bg-secondary text-secondary-foreground px-3 py-1 rounded-md flex items-center gap-2">
                      {limit}
                      <button onClick={() => removeTerritorialLimit(index)} className="text-destructive">×</button>
                    </div>
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="cancellation">
            <AccordionTrigger>Cancellation Rules</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="space-y-2">
                <Label>Free-Look Period (days)</Label>
                <Input
                  type="number"
                  value={formData.cancellation.freeLookPeriodDays}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    cancellation: { ...prev.cancellation, freeLookPeriodDays: parseInt(e.target.value) || 0 }
                  }))}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pro-rated-refunds"
                  checked={formData.cancellation.proRatedRefunds}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    cancellation: { ...prev.cancellation, proRatedRefunds: checked === true }
                  }))}
                />
                <Label htmlFor="pro-rated-refunds">Pro-Rated Refunds Allowed</Label>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="transferability">
            <AccordionTrigger>Transferability</AccordionTrigger>
            <AccordionContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="transferable"
                  checked={formData.transferability.allowed}
                  onCheckedChange={(checked) => setFormData(prev => ({
                    ...prev,
                    transferability: { ...prev.transferability, allowed: checked === true }
                  }))}
                />
                <Label htmlFor="transferable">Coverage is Transferable</Label>
              </div>

              {formData.transferability.allowed && (
                <div className="space-y-2">
                  <Label>Transfer Conditions</Label>
                  <Textarea
                    value={formData.transferability.conditions}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      transferability: { ...prev.transferability, conditions: e.target.value }
                    }))}
                    placeholder="Describe conditions for transfer..."
                    rows={3}
                  />
                </div>
              )}
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