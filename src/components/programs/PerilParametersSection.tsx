import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export interface PerilParameter {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  description: string;
  value: number;
}

interface PerilParametersSectionProps {
  perilName: string;
  parameters: PerilParameter[];
  onParameterChange: (key: string, value: number) => void;
}

// Map perils to their relevant parameters
export const PERIL_PARAMETER_DEFINITIONS: Record<string, Omit<PerilParameter, 'value'>[]> = {
  "Theft": [
    {
      key: "policeNotificationPeriodDays",
      label: "Police Notification Period",
      min: 0,
      max: 90,
      step: 1,
      unit: "days",
      description: "Time limit to report theft to police"
    },
    {
      key: "insurerNotificationPeriodHours",
      label: "Insurer Notification Period",
      min: 0,
      max: 240,
      step: 1,
      unit: "hours",
      description: "Time limit to notify insurer of a theft claim"
    },
    {
      key: "daysSinceLastClaim",
      label: "Days Since Last Claim",
      min: 0,
      max: 365,
      step: 1,
      unit: "days",
      description: "Minimum days required between theft claims"
    },
    {
      key: "successfullyFulfilledNotTheftClaimHardStopDays",
      label: "Claim Frequency Hard Stop",
      min: 0,
      max: 365,
      step: 1,
      unit: "days",
      description: "Maximum period between successful theft claims"
    }
  ],
  "Loss": [
    {
      key: "insurerNotificationPeriodHours",
      label: "Insurer Notification Period",
      min: 0,
      max: 240,
      step: 1,
      unit: "hours",
      description: "Time limit to notify insurer of a loss claim"
    },
    {
      key: "daysSinceLastClaim",
      label: "Days Since Last Claim",
      min: 0,
      max: 365,
      step: 1,
      unit: "days",
      description: "Minimum days required between loss claims"
    }
  ],
  "Accidental Damage": [
    {
      key: "insurerNotificationPeriodHours",
      label: "Insurer Notification Period",
      min: 0,
      max: 240,
      step: 1,
      unit: "hours",
      description: "Time limit to notify insurer of damage"
    },
    {
      key: "daysSinceLastClaim",
      label: "Days Since Last Claim",
      min: 0,
      max: 365,
      step: 1,
      unit: "days",
      description: "Minimum days required between damage claims"
    },
    {
      key: "daysSinceLastDeclinedDamageClaimDays",
      label: "Days Since Last Declined Claim",
      min: 0,
      max: 365,
      step: 1,
      unit: "days",
      description: "Waiting period after a declined damage claim"
    },
    {
      key: "successfullyFulfilledAccidentalDamageClaimHardStopDays",
      label: "Damage Claim Hard Stop",
      min: 0,
      max: 365,
      step: 1,
      unit: "days",
      description: "Maximum period between successful damage claims"
    }
  ],
  "Screen Damage": [
    {
      key: "insurerNotificationPeriodHours",
      label: "Insurer Notification Period",
      min: 0,
      max: 240,
      step: 1,
      unit: "hours",
      description: "Time limit to notify insurer of screen damage"
    },
    {
      key: "daysSinceLastClaim",
      label: "Days Since Last Claim",
      min: 0,
      max: 365,
      step: 1,
      unit: "days",
      description: "Minimum days required between screen damage claims"
    }
  ],
  "Water/Liquid Damage": [
    {
      key: "insurerNotificationPeriodHours",
      label: "Insurer Notification Period",
      min: 0,
      max: 240,
      step: 1,
      unit: "hours",
      description: "Time limit to notify insurer of liquid damage"
    },
    {
      key: "daysSinceLastClaim",
      label: "Days Since Last Claim",
      min: 0,
      max: 365,
      step: 1,
      unit: "days",
      description: "Minimum days required between liquid damage claims"
    }
  ],
  "Extended Warranty": [
    {
      key: "insurerNotificationPeriodHours",
      label: "Insurer Notification Period",
      min: 0,
      max: 240,
      step: 1,
      unit: "hours",
      description: "Time limit to notify insurer of breakdown"
    },
    {
      key: "daysSinceLastClaim",
      label: "Days Since Last Claim",
      min: 0,
      max: 365,
      step: 1,
      unit: "days",
      description: "Minimum days required between warranty claims"
    }
  ],
  "Worldwide Cover": [
    {
      key: "worldwideCoverLimitDays",
      label: "Worldwide Cover Limit",
      min: 0,
      max: 365,
      step: 1,
      unit: "days",
      description: "Maximum days of coverage when traveling worldwide"
    }
  ],
  "Unauthorized Calls": [
    {
      key: "unauthorizedCallsNotificationPeriodDays",
      label: "Notification Period",
      min: 0,
      max: 365,
      step: 1,
      unit: "days",
      description: "Time limit to report unauthorized calls"
    }
  ]
};

// Global parameters that apply to all perils
export const GLOBAL_PARAMETERS: Omit<PerilParameter, 'value'>[] = [
  {
    key: "multipleClaimsReliefAfter",
    label: "Multiple Claims Relief After",
    min: 1,
    max: 9,
    step: 1,
    unit: "claims",
    description: "Number of claims before frequency limits apply"
  },
  {
    key: "multipleClaimsMeasuredAcrossDays",
    label: "Multiple Claims Measured Across",
    min: 0,
    max: 365,
    step: 1,
    unit: "days",
    description: "Period to measure claim frequency"
  },
  {
    key: "ageOfPolicyToReliefClaimDays",
    label: "Minimum Policy Age for Claims",
    min: 0,
    max: 365,
    step: 1,
    unit: "days",
    description: "Minimum policy age before claims are accepted"
  },
  {
    key: "successfullyFulfilledClaimLimitDays",
    label: "Fulfilled Claim Limit Period",
    min: 0,
    max: 365,
    step: 1,
    unit: "days",
    description: "Period to count fulfilled claims"
  },
  {
    key: "successfullyFulfilledClaimLimitPeriodDays",
    label: "Fulfilled Claim Rolling Period",
    min: 0,
    max: 365,
    step: 1,
    unit: "days",
    description: "Rolling period for claim limit calculation"
  }
];

export function PerilParametersSection({
  perilName,
  parameters,
  onParameterChange,
}: PerilParametersSectionProps) {
  const hasParameters = parameters && parameters.length > 0;

  if (!hasParameters) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No specific parameters configured for this peril. Global product parameters will apply.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert className="border-amber-500/50 bg-amber-500/10">
        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertDescription className="text-sm text-amber-900 dark:text-amber-100">
          <strong>Note:</strong> These parameters are specific to {perilName} claims and will override global product parameters.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-lg bg-muted/30 border border-border">
        {parameters.map((param) => (
          <div key={param.key} className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <Label className="text-sm font-medium text-foreground">
                  {param.label}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {param.description}
                </p>
              </div>
              <div className="flex items-baseline gap-1 min-w-[80px] justify-end">
                <span className="text-lg font-semibold text-primary">
                  {param.value}
                </span>
                <span className="text-xs text-muted-foreground">
                  {param.unit}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Slider
                value={[param.value]}
                onValueChange={(value) => onParameterChange(param.key, value[0])}
                min={param.min}
                max={param.max}
                step={param.step}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{param.min} {param.unit}</span>
                <span>{param.max} {param.unit}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
