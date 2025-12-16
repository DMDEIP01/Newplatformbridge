import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { PerilParametersSection, PERIL_PARAMETER_DEFINITIONS, GLOBAL_PARAMETERS, PerilParameter } from "./PerilParametersSection";

export interface PerilRejectionTerm {
  id: string;
  term: string;
  isSelected: boolean;
}

export interface AcceptanceCheckItem {
  id: string;
  check: string;
  isSelected: boolean;
}

export interface AcceptanceCheck {
  category: string;
  checks: AcceptanceCheckItem[];
}

export interface EvidenceRequirement {
  id: string;
  name: string;
  isRequired: boolean;
  aiAssessed: boolean;
}

export interface PerilDetails {
  perilName: string;
  rejectionTerms: PerilRejectionTerm[];
  acceptanceLogic?: AcceptanceCheck[];
  evidenceRequirements?: EvidenceRequirement[];
  parameters?: Record<string, number>;
}

const DEFAULT_PERIL_TERMS: Record<string, string[]> = {
  "Screen Damage": [
    "No external impact or physical evidence of damage found",
    "Damage caused by manufacturing defect or internal component failure (covered under warranty instead)",
    "Pre-existing damage before policy start date",
    "Damage due to intentional acts, negligence, or improper handling",
    "Screen replacement requested but device not presented for inspection",
    "Damage due to unauthorized repairs or tampering",
    "Cosmetic damage not affecting functionality (minor scratches, dents)",
    "Claim filed after policy expiration or beyond claim time limit"
  ],
  "Accidental Damage": [
    "No signs of a sudden, unintended, and unforeseen event",
    "Damage due to wear and tear, depreciation, corrosion, or aging",
    "Damage from pests, insects, or vermin",
    "Damage caused while illegally using the device or in restricted environments",
    "Damage from overloading, improper installation, or electrical fault not caused by accident",
    "Liquid damage included only if specifically covered—otherwise rejected",
    "Accessories or peripherals damaged (unless explicitly included)"
  ],
  "Loss": [
    "Device simply misplaced, with no evidence of loss circumstances (unless accidental loss explicitly included)",
    "Loss occurring in unattended or unsecured locations (e.g., left on a table / vehicle seat)",
    "Loss without a police report or required documentation",
    "Delay in reporting loss beyond required timeframe",
    "Loss occurring outside covered geography (if no worldwide cover)",
    "Loss while device was loaned, rented, or shared with someone outside the policyholder's household"
  ],
  "Theft": [
    "Theft without forcible entry evidence (unless 'theft from person' is included)",
    "Theft due to carelessness, e.g., leaving the device unattended in public",
    "Theft claims without mandatory documentation: Police report, FIR/CRN, Proof of ownership",
    "Theft by household members, employees, or acquaintances (unless explicitly covered)",
    "Theft from vehicle where device was visible or vehicle was unlocked",
    "No ability to provide IMEI, serial number, or device tracking history when required"
  ],
  "Water/Liquid Damage": [
    "Evidence of corrosion indicating long-term exposure, not a sudden incident",
    "Liquid damage suffered during intentional water exposure (pool, beach, bath) unless cover allows",
    "Damage due to submersion beyond device rating (e.g., waterproof but exceeded depth/time limits)",
    "Internal moisture without evidence of an accidental liquid event",
    "Device opened or repaired by unapproved service centers prior to assessment"
  ],
  "Extended Warranty": [
    "Failure caused by accidental damage or external impact (covered under AD, not EW)",
    "Mechanical/electrical breakdown due to wear and tear, dust buildup, or lack of maintenance",
    "Faults from software issues, viruses, or firmware modifications",
    "Parts not originally supplied by the manufacturer (third-party parts)",
    "Consumables not covered: Batteries (unless non-removable and explicitly included), Cables, Filters, Remote controls",
    "Device already out of manufacturer warranty before EW start",
    "Pre-existing internal faults"
  ],
  "Accessories Cover": [
    "Accessories not declared or not part of the original box",
    "Cosmetic damage without functional impact",
    "Wear and tear, discoloration, fraying of cables",
    "Loss or theft unless accessory-specific cover exists",
    "Third-party accessories not approved by the manufacturer",
    "Damage due to power surges if not specifically covered"
  ],
  "Worldwide Cover": [
    "Claims made outside territories not listed under the worldwide extension",
    "No supporting foreign documentation (local police report, travel proof)",
    "Evidence suggests the device was exported/sold internationally rather than used during travel",
    "Repairs performed outside authorized service centers, making assessment impossible",
    "Incidents occurring during commercial use abroad (unless allowed)"
  ]
};

const DEFAULT_ACCEPTANCE_LOGIC: Record<string, { category: string; checks: string[] }[]> = {
  "Loss": [
    {
      category: "Eligibility & Policy Checks",
      checks: [
        "Policy active at time of loss",
        "Premiums up to date",
        "Device correctly registered (IMEI, model, phone number)",
        "Within allowed claim limit (max 3 claims in 12 months)"
      ]
    },
    {
      category: "Circumstances of Loss",
      checks: [
        "Evidence the device was not left somewhere unnecessarily at risk",
        "Customer took reasonable care (not left visible or unattended in public places)",
        "Reasonable attempts were made to find the device (e.g., retracing steps, contacting venue)"
      ]
    },
    {
      category: "Required Actions",
      checks: [
        "Loss reported to Vodafone promptly to block SIM/network usage",
        "Attempt to locate device using tracking if the device supports it"
      ]
    },
    {
      category: "Supporting Evidence",
      checks: [
        "Statement describing where and how the device was lost",
        "Proof of ownership may be requested",
        "Confirmation from location/venue where reported (if applicable)"
      ]
    }
  ],
  "Theft": [
    {
      category: "Eligibility & Policy Checks",
      checks: [
        "Policy active and premiums paid",
        "Device registered",
        "Within 12-month claim limit"
      ]
    },
    {
      category: "Theft Circumstances",
      checks: [
        "Theft must be genuine, not due to negligent care",
        "Device cannot have been knowingly left somewhere visible/unattended",
        "Theft cannot be the result of knowingly taking a risk"
      ]
    },
    {
      category: "Required Actions",
      checks: [
        "Reported to network immediately (device/SIM blocked)",
        "Theft reported to police promptly",
        "Valid Crime Reference Number provided",
        "If abroad, report to local authorities and provide official reference"
      ]
    },
    {
      category: "Supporting Evidence",
      checks: [
        "Theft narrative from customer (location, time, situation)",
        "Confirmation of attempts to recover the device (tracking, contacting venue)",
        "Proof of purchase/ownership if requested"
      ]
    }
  ],
  "Accidental Damage": [
    {
      category: "Eligibility & Policy Checks",
      checks: [
        "Policy active; premiums up to date",
        "Device registered",
        "Within claim limit"
      ]
    },
    {
      category: "Nature of Damage",
      checks: [
        "Damage must prevent the device from functioning",
        "Cosmetic-only damage is not covered (scratches, dents, marks)",
        "Damage cannot be deliberate or caused by reckless behaviour"
      ]
    },
    {
      category: "Required Actions",
      checks: [
        "Customer must provide the damaged device",
        "All device security locks (e.g., Find My iPhone) must be removed before replacement is sent",
        "Customer must remove SIM and backup data"
      ]
    },
    {
      category: "Supporting Evidence",
      checks: [
        "Physical inspection: damage consistent with stated cause",
        "Device presented must match the registered IMEI/serial",
        "No modifications that void cover (mods aren't covered)"
      ]
    }
  ],
  "Extended Warranty": [
    {
      category: "Eligibility & Policy Checks",
      checks: [
        "Policy active and up to date",
        "Device registered",
        "Not exceeding claim limit"
      ]
    },
    {
      category: "Breakdown Nature",
      checks: [
        "Fault must be a genuine mechanical/electrical failure",
        "Must not be caused by: Deliberate damage, Lack of care, Unapproved modifications",
        "Software/content issues alone are not covered"
      ]
    },
    {
      category: "Required Actions",
      checks: [
        "Customer provides the faulty device for assessment",
        "Security locks removed if replacement is needed"
      ]
    },
    {
      category: "Supporting Evidence",
      checks: [
        "Inspection confirms the issue is consistent with a breakdown, not damage",
        "Device is not beyond economic repair due to pre-existing or uncovered causes"
      ]
    }
  ],
  "Accessories Cover": [
    {
      category: "Acceptance Criteria",
      checks: [
        "Accessories must have been lost/stolen/damaged with the device",
        "Total value claimed ≤ £200",
        "Proof of ownership may be required"
      ]
    }
  ]
};

const UNIVERSAL_CHECKS = [
  {
    category: "Fraud & Accuracy",
    checks: [
      "Customer information must be truthful",
      "No inconsistencies in narrative, timelines, or evidence",
      "Device provided must be the insured device",
      "No attempts to claim with a different or replaced device"
    ]
  },
  {
    category: "Policy Validity",
    checks: [
      "Address still in the UK (policy cancels otherwise)",
      "No more than 3 successful claims in a 12-month rolling window"
    ]
  },
  {
    category: "Payment",
    checks: [
      "Excess charge must be paid"
    ]
  }
];

const GENERAL_EXCLUSIONS = [
  "Fraudulent claims or manipulated documents",
  "Device with altered IMEI/serial number",
  "Pre-existing damage prior to policy activation",
  "Device purchased from unauthorized dealers or without valid proof of purchase",
  "Damage due to war, terrorism, natural disasters (unless specifically included)",
  "Use in commercial/industrial settings when policy is meant for personal use",
  "Intentional or reckless damage by the policyholder"
];

const DEFAULT_EVIDENCE_REQUIREMENTS: Record<string, string[]> = {
  "Accidental Damage": [
    "Proof of purchase",
    "Device pictures",
    "Damage description"
  ],
  "Breakdown": [
    "Proof of purchase",
    "Device pictures",
    "Fault description"
  ],
  "Extended Warranty": [
    "Proof of purchase",
    "Device pictures",
    "Fault description"
  ],
  "Loss": [
    "Proof of purchase",
    "Device pictures",
    "Police report",
    "Network report"
  ],
  "Screen Damage": [
    "Proof of purchase",
    "Device pictures"
  ],
  "Technical Support": [
    "Device pictures",
    "Issue description"
  ],
  "Theft": [
    "Proof of purchase",
    "Device pictures",
    "Police report",
    "Network report"
  ],
  "Water/Liquid Damage": [
    "Proof of purchase",
    "Device pictures"
  ]
};

interface PerilDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  perilName: string;
  existingDetails?: PerilDetails;
  onSave: (details: PerilDetails) => void;
}

export function PerilDetailsDialog({ 
  open, 
  onOpenChange, 
  perilName, 
  existingDetails,
  onSave 
}: PerilDetailsDialogProps) {
  const [rejectionTerms, setRejectionTerms] = useState<PerilRejectionTerm[]>([]);
  const [acceptanceLogic, setAcceptanceLogic] = useState<AcceptanceCheck[]>([]);
  const [evidenceRequirements, setEvidenceRequirements] = useState<EvidenceRequirement[]>([]);
  const [parameters, setParameters] = useState<PerilParameter[]>([]);
  const [newTerm, setNewTerm] = useState("");
  const [newCheckCategory, setNewCheckCategory] = useState("");
  const [newCheck, setNewCheck] = useState("");
  const [newEvidenceType, setNewEvidenceType] = useState("");
  const [selectedEvidenceFromList, setSelectedEvidenceFromList] = useState("");
  const [showGeneralExclusions, setShowGeneralExclusions] = useState(false);
  const [showUniversalChecks, setShowUniversalChecks] = useState(false);

  // Get all unique evidence types from DEFAULT_EVIDENCE_REQUIREMENTS
  const getAllAvailableEvidence = () => {
    const allEvidence = new Set<string>();
    Object.values(DEFAULT_EVIDENCE_REQUIREMENTS).forEach(evidenceList => {
      evidenceList.forEach(evidence => allEvidence.add(evidence));
    });
    return Array.from(allEvidence).sort();
  };

  useEffect(() => {
    if (open) {
      initializeTerms();
      initializeAcceptanceLogic();
      initializeEvidenceRequirements();
      initializeParameters();
    }
  }, [open, perilName, existingDetails]);

  const initializeTerms = () => {
    if (existingDetails && existingDetails.rejectionTerms.length > 0) {
      setRejectionTerms(existingDetails.rejectionTerms);
    } else {
      const defaultTerms = DEFAULT_PERIL_TERMS[perilName] || [];
      setRejectionTerms(
        defaultTerms.map((term, index) => ({
          id: `term-${index}`,
          term,
          isSelected: false
        }))
      );
    }
  };

  const initializeAcceptanceLogic = () => {
    if (existingDetails?.acceptanceLogic && existingDetails.acceptanceLogic.length > 0) {
      setAcceptanceLogic(existingDetails.acceptanceLogic);
    } else {
      const defaultLogic = DEFAULT_ACCEPTANCE_LOGIC[perilName] || [];
      setAcceptanceLogic(
        defaultLogic.map((section, sectionIdx) => ({
          category: section.category,
          checks: section.checks.map((check, checkIdx) => ({
            id: `check-${sectionIdx}-${checkIdx}`,
            check,
            isSelected: false
          }))
        }))
      );
    }
  };

  const initializeEvidenceRequirements = () => {
    // Check if existing details has evidence requirements with actual items (not just empty array)
    const hasExistingEvidence = existingDetails?.evidenceRequirements && 
                                existingDetails.evidenceRequirements.length > 0;
    
    if (hasExistingEvidence) {
      // Ensure all existing evidence has aiAssessed property
      setEvidenceRequirements(
        existingDetails.evidenceRequirements.map(e => ({
          ...e,
          aiAssessed: e.aiAssessed ?? false
        }))
      );
    } else {
      // Load defaults from DEFAULT_EVIDENCE_REQUIREMENTS or use universal defaults
      const defaultEvidence = DEFAULT_EVIDENCE_REQUIREMENTS[perilName] || [
        "Proof of purchase",
        "Device pictures"
      ];
      setEvidenceRequirements(
        defaultEvidence.map((evidence, index) => ({
          id: `evidence-${index}`,
          name: evidence,
          isRequired: false,
          aiAssessed: false
        }))
      );
    }
  };

  const initializeParameters = () => {
    const perilParamDefs = PERIL_PARAMETER_DEFINITIONS[perilName] || [];
    const allParamDefs = [...perilParamDefs, ...GLOBAL_PARAMETERS];
    
    if (existingDetails?.parameters) {
      // Load existing parameter values
      setParameters(
        allParamDefs.map(def => ({
          ...def,
          value: existingDetails.parameters?.[def.key] ?? def.min
        }))
      );
    } else {
      // Initialize with default minimum values
      setParameters(
        allParamDefs.map(def => ({
          ...def,
          value: def.min
        }))
      );
    }
  };

  const toggleTerm = (termId: string) => {
    setRejectionTerms(terms =>
      terms.map(t => t.id === termId ? { ...t, isSelected: !t.isSelected } : t)
    );
  };

  const toggleAcceptanceCheck = (categoryIndex: number, checkId: string) => {
    setAcceptanceLogic(logic =>
      logic.map((section, idx) =>
        idx === categoryIndex
          ? {
              ...section,
              checks: section.checks.map(c =>
                c.id === checkId ? { ...c, isSelected: !c.isSelected } : c
              )
            }
          : section
      )
    );
  };

  const toggleEvidence = (evidenceId: string) => {
    setEvidenceRequirements(reqs =>
      reqs.map(e => e.id === evidenceId ? { ...e, isRequired: !e.isRequired } : e)
    );
  };

  const toggleAiAssessed = (evidenceId: string) => {
    setEvidenceRequirements(reqs =>
      reqs.map(e => e.id === evidenceId ? { ...e, aiAssessed: !e.aiAssessed } : e)
    );
  };

  const markAllAsAiAssessed = () => {
    setEvidenceRequirements(reqs => reqs.map(e => ({ ...e, aiAssessed: true })));
  };

  const selectAllTerms = () => {
    setRejectionTerms(terms => terms.map(term => ({ ...term, isSelected: true })));
  };

  const deselectAllTerms = () => {
    setRejectionTerms(terms => terms.map(term => ({ ...term, isSelected: false })));
  };

  const selectAllInCategory = (categoryIndex: number) => {
    setAcceptanceLogic(logic =>
      logic.map((section, idx) =>
        idx === categoryIndex
          ? {
              ...section,
              checks: section.checks.map(check => ({ ...check, isSelected: true }))
            }
          : section
      )
    );
  };

  const deselectAllInCategory = (categoryIndex: number) => {
    setAcceptanceLogic(logic =>
      logic.map((section, idx) =>
        idx === categoryIndex
          ? {
              ...section,
              checks: section.checks.map(check => ({ ...check, isSelected: false }))
            }
          : section
      )
    );
  };

  const addCustomTerm = () => {
    if (!newTerm.trim()) return;
    
    const newRejectionTerm: PerilRejectionTerm = {
      id: `custom-${Date.now()}`,
      term: newTerm.trim(),
      isSelected: true
    };
    
    setRejectionTerms(terms => [...terms, newRejectionTerm]);
    setNewTerm("");
  };

  const addCustomCheck = () => {
    if (!newCheck.trim() || !newCheckCategory.trim()) return;

    const categoryExists = acceptanceLogic.findIndex(
      section => section.category.toLowerCase() === newCheckCategory.trim().toLowerCase()
    );

    if (categoryExists !== -1) {
      setAcceptanceLogic(logic =>
        logic.map((section, idx) =>
          idx === categoryExists
            ? {
                ...section,
                checks: [
                  ...section.checks,
                  {
                    id: `custom-check-${Date.now()}`,
                    check: newCheck.trim(),
                    isSelected: true
                  }
                ]
              }
            : section
        )
      );
    } else {
      setAcceptanceLogic(logic => [
        ...logic,
        {
          category: newCheckCategory.trim(),
          checks: [
            {
              id: `custom-check-${Date.now()}`,
              check: newCheck.trim(),
              isSelected: true
            }
          ]
        }
      ]);
    }

    setNewCheck("");
    setNewCheckCategory("");
  };

  const removeTerm = (termId: string) => {
    setRejectionTerms(terms => terms.filter(t => t.id !== termId));
  };

  const removeCheck = (categoryIndex: number, checkId: string) => {
    setAcceptanceLogic(logic =>
      logic.map((section, idx) =>
        idx === categoryIndex
          ? {
              ...section,
              checks: section.checks.filter(c => c.id !== checkId)
            }
          : section
      ).filter(section => section.checks.length > 0)
    );
  };

  const addCustomEvidence = () => {
    if (!newEvidenceType.trim()) return;
    
    const newEvidence: EvidenceRequirement = {
      id: `custom-evidence-${Date.now()}`,
      name: newEvidenceType.trim(),
      isRequired: true,
      aiAssessed: false
    };
    
    setEvidenceRequirements(reqs => [...reqs, newEvidence]);
    setNewEvidenceType("");
  };

  const removeEvidence = (evidenceId: string) => {
    setEvidenceRequirements(reqs => reqs.filter(e => e.id !== evidenceId));
  };

  const addEvidenceFromList = () => {
    if (!selectedEvidenceFromList) return;

    // Check if evidence already exists
    const exists = evidenceRequirements.some(
      e => e.name.toLowerCase() === selectedEvidenceFromList.toLowerCase()
    );

    if (exists) {
      return; // Don't add duplicates
    }

    const newEvidence: EvidenceRequirement = {
      id: `list-evidence-${Date.now()}`,
      name: selectedEvidenceFromList,
      isRequired: true,
      aiAssessed: false
    };

    setEvidenceRequirements(reqs => [...reqs, newEvidence]);
    setSelectedEvidenceFromList("");
  };

  const handleSave = () => {
    // Convert parameters array to object
    const parametersObject = parameters.reduce((acc, param) => {
      acc[param.key] = param.value;
      return acc;
    }, {} as Record<string, number>);

    onSave({
      perilName,
      rejectionTerms,
      acceptanceLogic,
      evidenceRequirements,
      parameters: parametersObject
    });
    onOpenChange(false);
  };

  const handleParameterChange = (key: string, value: number) => {
    setParameters(params => 
      params.map(p => p.key === key ? { ...p, value } : p)
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-full p-0 flex flex-col overflow-hidden">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="text-2xl">{perilName} - Configuration</SheetTitle>
          <SheetDescription>
            Configure rejection terms and acceptance criteria for this peril
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="rejection" className="flex-1 overflow-hidden flex flex-col px-6">
          <TabsList className="grid w-full grid-cols-4 mt-4">
            <TabsTrigger value="rejection">Rejection Terms</TabsTrigger>
            <TabsTrigger value="acceptance">Acceptance Logic</TabsTrigger>
            <TabsTrigger value="evidence">Evidence</TabsTrigger>
            <TabsTrigger value="parameters">Parameters</TabsTrigger>
          </TabsList>

          <TabsContent value="rejection" className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {rejectionTerms.length > 0 ? (
                  <>
                    <div className="flex justify-end gap-2 mb-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={selectAllTerms}
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={deselectAllTerms}
                      >
                        Deselect All
                      </Button>
                    </div>
                    <div className="space-y-3">
                    {rejectionTerms.map((term) => (
                      <div key={term.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                        <Checkbox
                          id={term.id}
                          checked={term.isSelected}
                          onCheckedChange={() => toggleTerm(term.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <label
                            htmlFor={term.id}
                            className="text-sm leading-relaxed cursor-pointer"
                          >
                            {term.term}
                          </label>
                        </div>
                        {term.id.startsWith("custom-") && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeTerm(term.id)}
                            className="shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No default rejection terms for this peril. Add custom terms below.
                  </p>
                )}

                <Separator className="my-6" />

                <div className="space-y-3">
                  <Label htmlFor="new-term">Add Custom Rejection Term</Label>
                  <div className="flex gap-2">
                    <Input
                      id="new-term"
                      value={newTerm}
                      onChange={(e) => setNewTerm(e.target.value)}
                      placeholder="Enter a custom rejection term..."
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCustomTerm();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={addCustomTerm}
                      size="sm"
                      disabled={!newTerm.trim()}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>General Exclusions (Apply to All Perils)</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowGeneralExclusions(!showGeneralExclusions)}
                    >
                      {showGeneralExclusions ? "Hide" : "Show"}
                    </Button>
                  </div>
                  
                  {showGeneralExclusions && (
                    <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                      {GENERAL_EXCLUSIONS.map((exclusion, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <span className="text-muted-foreground text-sm mt-0.5">•</span>
                          <p className="text-sm">{exclusion}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="acceptance" className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {acceptanceLogic.length > 0 ? (
                  <>
                    {acceptanceLogic.map((section, sectionIdx) => (
                      <Card key={sectionIdx}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                              {section.category}
                            </CardTitle>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => selectAllInCategory(sectionIdx)}
                              >
                                Select All
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => deselectAllInCategory(sectionIdx)}
                              >
                                Deselect All
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {section.checks.map((checkItem) => (
                              <div key={checkItem.id} className="flex items-start gap-3 p-2 rounded hover:bg-accent/30 transition-colors">
                                <Checkbox
                                  id={checkItem.id}
                                  checked={checkItem.isSelected}
                                  onCheckedChange={() => toggleAcceptanceCheck(sectionIdx, checkItem.id)}
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <label
                                    htmlFor={checkItem.id}
                                    className="text-sm leading-relaxed cursor-pointer"
                                  >
                                    {checkItem.check}
                                  </label>
                                </div>
                                {checkItem.id.startsWith("custom-check-") && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeCheck(sectionIdx, checkItem.id)}
                                    className="shrink-0"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    <Separator className="my-6" />

                    <div className="space-y-3">
                      <Label>Add Custom Acceptance Check</Label>
                      <div className="space-y-2">
                        <Input
                          value={newCheckCategory}
                          onChange={(e) => setNewCheckCategory(e.target.value)}
                          placeholder="Category (e.g., Required Actions)"
                        />
                        <div className="flex gap-2">
                          <Input
                            value={newCheck}
                            onChange={(e) => setNewCheck(e.target.value)}
                            placeholder="Enter a custom acceptance check..."
                            onKeyPress={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addCustomCheck();
                              }
                            }}
                          />
                          <Button
                            type="button"
                            onClick={addCustomCheck}
                            size="sm"
                            disabled={!newCheck.trim() || !newCheckCategory.trim()}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Universal Checks (Apply to All Claims)</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowUniversalChecks(!showUniversalChecks)}
                        >
                          {showUniversalChecks ? "Hide" : "Show"}
                        </Button>
                      </div>
                      
                      {showUniversalChecks && (
                        <Card className="border-primary/20 bg-primary/5">
                          <CardContent className="pt-6 space-y-4">
                            {UNIVERSAL_CHECKS.map((section, idx) => (
                              <div key={idx}>
                                <h4 className="font-medium text-sm mb-2">{section.category}</h4>
                                <ul className="space-y-1.5">
                                  {section.checks.map((check, checkIdx) => (
                                    <li key={checkIdx} className="flex items-start gap-2 text-sm">
                                      <span className="text-primary mt-0.5">•</span>
                                      <span>{check}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground mb-4">
                      No acceptance logic configured for this peril type.
                    </p>
                    <div className="space-y-3 max-w-md mx-auto">
                      <Label>Add Custom Acceptance Check</Label>
                      <div className="space-y-2">
                        <Input
                          value={newCheckCategory}
                          onChange={(e) => setNewCheckCategory(e.target.value)}
                          placeholder="Category (e.g., Required Actions)"
                        />
                        <div className="flex gap-2">
                          <Input
                            value={newCheck}
                            onChange={(e) => setNewCheck(e.target.value)}
                            placeholder="Enter a custom acceptance check..."
                          />
                          <Button
                            type="button"
                            onClick={addCustomCheck}
                            size="sm"
                            disabled={!newCheck.trim() || !newCheckCategory.trim()}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="evidence" className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {evidenceRequirements.length > 0 ? (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <p className="text-sm text-muted-foreground">
                        Select the required evidence items for this peril type
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={markAllAsAiAssessed}
                      >
                        Mark All as AI Assessed
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {evidenceRequirements.map((evidence) => (
                        <div key={evidence.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                          <div className="flex flex-col gap-2 pt-1">
                            <Checkbox
                              id={`required-${evidence.id}`}
                              checked={evidence.isRequired}
                              onCheckedChange={() => toggleEvidence(evidence.id)}
                            />
                            <Checkbox
                              id={`ai-${evidence.id}`}
                              checked={evidence.aiAssessed}
                              onCheckedChange={() => toggleAiAssessed(evidence.id)}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <label
                              htmlFor={`required-${evidence.id}`}
                              className="text-sm leading-relaxed cursor-pointer font-medium block mb-2"
                            >
                              {evidence.name}
                            </label>
                            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                              <label
                                htmlFor={`required-${evidence.id}`}
                                className="cursor-pointer flex items-center gap-1"
                              >
                                <span className={evidence.isRequired ? "text-primary font-medium" : ""}>
                                  Required
                                </span>
                              </label>
                              <label
                                htmlFor={`ai-${evidence.id}`}
                                className="cursor-pointer flex items-center gap-1"
                              >
                                <span className={evidence.aiAssessed ? "text-primary font-medium" : ""}>
                                  AI Assessed
                                </span>
                              </label>
                            </div>
                          </div>
                          {evidence.id.startsWith("custom-evidence-") && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeEvidence(evidence.id)}
                              className="shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    <Separator className="my-6" />

                    <div className="space-y-3">
                      <Label htmlFor="evidence-list">Add from Available Evidence</Label>
                      <div className="flex gap-2">
                        <Select value={selectedEvidenceFromList} onValueChange={setSelectedEvidenceFromList}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select evidence type..." />
                          </SelectTrigger>
                          <SelectContent>
                            {getAllAvailableEvidence().map((evidence) => (
                              <SelectItem key={evidence} value={evidence}>
                                {evidence}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          onClick={addEvidenceFromList}
                          size="sm"
                          disabled={!selectedEvidenceFromList}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="space-y-3">
                      <Label htmlFor="new-evidence">Add Custom Evidence Type</Label>
                      <div className="flex gap-2">
                        <Input
                          id="new-evidence"
                          value={newEvidenceType}
                          onChange={(e) => setNewEvidenceType(e.target.value)}
                          placeholder="Enter a custom evidence requirement..."
                          onKeyPress={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCustomEvidence();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          onClick={addCustomEvidence}
                          size="sm"
                          disabled={!newEvidenceType.trim()}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No evidence requirements configured for this peril.
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="parameters" className="mt-4">
            <ScrollArea className="h-[500px] pr-4">
              <PerilParametersSection
                perilName={perilName}
                parameters={parameters}
                onParameterChange={handleParameterChange}
              />
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <SheetFooter className="sticky bottom-0 bg-background border-t px-6 py-4 mt-auto">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground space-y-1">
              <div>{rejectionTerms.filter(t => t.isSelected).length} rejection term(s) selected</div>
              <div>
                {acceptanceLogic.reduce((acc, section) => acc + section.checks.filter(c => c.isSelected).length, 0)} acceptance check(s) selected
              </div>
              <div>{evidenceRequirements.filter(e => e.isRequired).length} evidence item(s) required</div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSave}>
                Save Configuration
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
