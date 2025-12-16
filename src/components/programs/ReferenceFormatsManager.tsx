import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Settings, Hash, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ReferenceFormat {
  format: string;
  description: string;
}

interface ReferenceFormats {
  policy_number?: ReferenceFormat;
  claim_number?: ReferenceFormat;
  service_request?: ReferenceFormat;
  complaint_reference?: ReferenceFormat;
  payment_reference?: ReferenceFormat;
  imei_serial?: ReferenceFormat;
  postcode?: ReferenceFormat;
  [key: string]: ReferenceFormat | undefined;
}

interface FormatOption {
  value: string;
  label: string;
  example: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  { value: "{product_prefix}-{sequence:6}", label: "Product Prefix + 6 digits", example: "EW-000001" },
  { value: "{prefix}-{year}-{sequence:4}", label: "Prefix + Year + 4 digits", example: "POL-2024-0001" },
  { value: "{prefix}-{sequence:8}", label: "Prefix + 8 digits", example: "CLM-00000001" },
  { value: "{sequence:10}", label: "10 digits only", example: "0000000001" },
  { value: "{prefix}{year}{sequence:6}", label: "Prefix + Year + 6 digits (no separator)", example: "SR20240001" },
  { value: "{country_code}-{sequence:5}", label: "Country Code + 5 digits", example: "DE-00001" },
];

const FIELD_TYPES = [
  { key: "policy_number", label: "Policy Number", defaultFormat: "{product_prefix}-{sequence:6}" },
  { key: "claim_number", label: "Claim Number", defaultFormat: "{product_prefix}-{sequence:6}" },
  { key: "service_request", label: "Service Request Reference", defaultFormat: "{prefix}-{year}-{sequence:4}" },
  { key: "complaint_reference", label: "Complaint Reference", defaultFormat: "{prefix}-{year}-{sequence:6}" },
  { key: "payment_reference", label: "Payment Reference", defaultFormat: "{prefix}-{sequence:8}" },
  { key: "imei_serial", label: "IMEI/Serial Number Format", defaultFormat: "{sequence:15}" },
  { key: "postcode", label: "Postcode Format", defaultFormat: "{country_code}-{sequence:5}" },
];

export function ReferenceFormatsManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [programs, setPrograms] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [formats, setFormats] = useState<ReferenceFormats>({});
  const [editingField, setEditingField] = useState<string | null>(null);

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .order("name");

      if (error) throw error;
      
      setPrograms(data || []);
      if (data && data.length > 0) {
        setSelectedProgramId(data[0].id);
        loadProgramFormats(data[0]);
      }
    } catch (error: any) {
      toast.error("Failed to load programs");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadProgramFormats = (program: any) => {
    const defaultFormats: ReferenceFormats = {};
    FIELD_TYPES.forEach(field => {
      defaultFormats[field.key] = {
        format: field.defaultFormat,
        description: `${field.label} format`
      };
    });

    if (program.reference_formats) {
      setFormats({ ...defaultFormats, ...program.reference_formats });
    } else {
      setFormats(defaultFormats);
    }
  };

  const handleProgramChange = (programId: string) => {
    setSelectedProgramId(programId);
    const program = programs.find(p => p.id === programId);
    if (program) {
      loadProgramFormats(program);
    }
  };

  const handleUpdateFormat = async (fieldKey: string, newFormat: string) => {
    if (!selectedProgramId) {
      toast.error("Please select a program");
      return;
    }

    setSaving(fieldKey);
    try {
      const updatedFormats = {
        ...formats,
        [fieldKey]: {
          ...formats[fieldKey],
          format: newFormat
        }
      };

      const { error } = await supabase
        .from("programs")
        .update({ reference_formats: updatedFormats as any })
        .eq("id", selectedProgramId);

      if (error) throw error;

      setFormats(updatedFormats);
      setEditingField(null);
      toast.success(`${FIELD_TYPES.find(f => f.key === fieldKey)?.label} format updated`);
    } catch (error: any) {
      toast.error("Failed to update format");
      console.error(error);
    } finally {
      setSaving(null);
    }
  };

  const getExampleOutput = (format: string): string => {
    const option = FORMAT_OPTIONS.find(opt => opt.value === format);
    return option?.example || "Example output";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Reference Format Configuration</CardTitle>
              <CardDescription className="mt-1">
                Configure number formats for policies, claims, and other reference fields
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Program Selection */}
          <div className="space-y-2">
            <Label>Program</Label>
            <Select value={selectedProgramId} onValueChange={handleProgramChange}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Select a program" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Alert>
            <Hash className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Available Variables:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                <li><code>{"{product_prefix}"}</code> - EW, IL, or IM based on product type</li>
                <li><code>{"{prefix}"}</code> - Custom prefix (e.g., POL, CLM, SR)</li>
                <li><code>{"{year}"}</code> - Current year (e.g., 2024)</li>
                <li><code>{"{sequence:N}"}</code> - Sequential number with N digits</li>
                <li><code>{"{country_code}"}</code> - Country code (e.g., DE, UK)</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Format Configuration Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Field Type</TableHead>
                  <TableHead>Current Format</TableHead>
                  <TableHead className="w-[200px]">Example Output</TableHead>
                  <TableHead className="w-[100px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {FIELD_TYPES.map((field) => (
                  <TableRow key={field.key}>
                    <TableCell className="font-medium">{field.label}</TableCell>
                    <TableCell>
                      {editingField === field.key ? (
                        <Select
                          value={formats[field.key]?.format || field.defaultFormat}
                          onValueChange={(value) => {
                            setFormats({
                              ...formats,
                              [field.key]: {
                                ...formats[field.key],
                                format: value
                              }
                            });
                          }}
                        >
                          <SelectTrigger className="w-full bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            {FORMAT_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{option.label}</span>
                                  <span className="text-xs text-muted-foreground">{option.example}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {formats[field.key]?.format || field.defaultFormat}
                        </code>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {getExampleOutput(formats[field.key]?.format || field.defaultFormat)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {editingField === field.key ? (
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            onClick={() => handleUpdateFormat(field.key, formats[field.key]?.format || field.defaultFormat)}
                            disabled={saving === field.key}
                          >
                            {saving === field.key ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Save className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingField(null)}
                            disabled={saving === field.key}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingField(field.key)}
                        >
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
