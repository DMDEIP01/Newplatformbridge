import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowLeft, ArrowRight } from "lucide-react";

interface BreakdownStep4FaultDetailsProps {
  faultCategory: string;
  setFaultCategory: (value: string) => void;
  specificIssue: string;
  setSpecificIssue: (value: string) => void;
  severityLevel: string;
  setSeverityLevel: (value: string) => void;
  problemDate: string;
  setProblemDate: (value: string) => void;
  issueFrequency: "intermittent" | "constant" | "";
  setIssueFrequency: (value: "intermittent" | "constant") => void;
  additionalComments: string;
  setAdditionalComments: (value: string) => void;
  aiPopulatedFields: Set<string>;
  aiSuggestion: string | null;
  onBack: () => void;
  onContinue: () => void;
  // Warranty check props
  isWithinManufacturerWarranty?: boolean;
  manufacturerWarrantyMonths?: number;
  onProblemDateChange?: (date: string) => void;
}

import { faultCategories, specificIssuesByCategory, severityLevels } from "@/lib/faultConfig";

export default function BreakdownStep4FaultDetails({
  faultCategory,
  setFaultCategory,
  specificIssue,
  setSpecificIssue,
  severityLevel,
  setSeverityLevel,
  problemDate,
  setProblemDate,
  issueFrequency,
  setIssueFrequency,
  additionalComments,
  setAdditionalComments,
  aiPopulatedFields,
  aiSuggestion,
  onBack,
  onContinue,
  isWithinManufacturerWarranty = false,
  manufacturerWarrantyMonths = 12,
  onProblemDateChange,
}: BreakdownStep4FaultDetailsProps) {
  const availableIssues = faultCategory ? (specificIssuesByCategory[faultCategory] || []) : [];

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Provide details about the fault. {severityLevel ? 'Severity has been assessed by AI.' : 'Upload a photo on the previous step for AI severity assessment.'}
        </AlertDescription>
      </Alert>

      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Fault Details</CardTitle>
          <CardDescription>
            Select the specific fault details to help us process your claim faster
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="faultCategory" className="text-sm font-semibold">
              Fault Category
              <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
            </Label>
            <Select 
              value={faultCategory} 
              onValueChange={(value) => {
                setFaultCategory(value);
                setSpecificIssue("");
              }}
            >
              <SelectTrigger id="faultCategory" className="mt-2 bg-background">
                <SelectValue placeholder="Select fault category" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {faultCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="specificIssue" className="text-sm font-semibold">
              Specific Issue
              <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
            </Label>
            <Select 
              value={specificIssue} 
              onValueChange={setSpecificIssue}
              disabled={!faultCategory}
            >
              <SelectTrigger id="specificIssue" className="mt-2 bg-background">
                <SelectValue placeholder={faultCategory ? "Select specific issue" : "Select fault category first"} />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {availableIssues.map((issue) => (
                  <SelectItem key={issue} value={issue}>
                    {issue}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {severityLevel && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-semibold">AI-Assessed Severity: {severityLevel}</p>
                  {aiSuggestion && (
                    <p className="text-xs text-muted-foreground">
                      💡 {aiSuggestion}
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor="problemDate" className="text-sm font-semibold">
              When did the problem first occur?
              <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
            </Label>
            <Input
              id="problemDate"
              type="date"
              value={problemDate}
              onChange={(e) => {
                setProblemDate(e.target.value);
                onProblemDateChange?.(e.target.value);
              }}
              max={new Date().toISOString().split('T')[0]}
              className="mt-2"
            />
            {isWithinManufacturerWarranty && (
              <Alert className="mt-3 border-red-500 bg-red-50 dark:bg-red-950">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  <strong>Warning - Manufacturer Warranty Period:</strong> The problem date falls within the manufacturer's {manufacturerWarrantyMonths}-month warranty period from your device purchase date.
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li>Please contact the manufacturer first for warranty support before submitting an extended warranty claim.</li>
                    <li><strong>Continuing with this claim may result in your claim being rejected.</strong></li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div>
            <Label htmlFor="issueFrequency" className="text-sm font-semibold">
              Is the issue intermittent or constant?
              <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
            </Label>
            <Select value={issueFrequency} onValueChange={(value: "intermittent" | "constant") => setIssueFrequency(value)}>
              <SelectTrigger id="issueFrequency" className="mt-2 bg-background">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="intermittent">Intermittent - Happens sometimes</SelectItem>
                <SelectItem value="constant">Constant - Happens all the time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="additionalComments" className="text-sm font-semibold">
              Additional Comments
              <span className="text-muted-foreground font-normal ml-2">(Optional)</span>
            </Label>
            <Textarea
              id="additionalComments"
              placeholder="Any additional details about the fault that might help us..."
              className="mt-2 min-h-[100px]"
              value={additionalComments}
              onChange={(e) => setAdditionalComments(e.target.value)}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {additionalComments.length}/500 characters
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button 
          onClick={onContinue}
          disabled={!faultCategory || !specificIssue || !problemDate || !issueFrequency}
          className="flex-1"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
