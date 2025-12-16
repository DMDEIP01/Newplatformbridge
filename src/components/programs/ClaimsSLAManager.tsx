import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Clock, Save, Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { Database } from "@/integrations/supabase/types";

type ClaimStatus = Database["public"]["Enums"]["claim_status"];
type ClaimSLA = Database["public"]["Tables"]["claims_sla"]["Row"];
type ClaimSLAInsert = Database["public"]["Tables"]["claims_sla"]["Insert"];

const CLAIM_STATUSES: ClaimStatus[] = [
  "notified",
  "accepted",
  "rejected",
  "referred",
  "inbound_logistics",
  "repair",
  "outbound_logistics",
  "closed",
  "referred_pending_info",
  "excess_due",
  "excess_paid_fulfillment_pending",
  "fulfillment_inspection_booked",
  "estimate_received",
  "fulfillment_outcome",
  "referred_info_received"
];

const formatStatusLabel = (status: string) => {
  return status
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export function ClaimsSLAManager() {
  const queryClient = useQueryClient();
  const [selectedProgram, setSelectedProgram] = useState<string | "all">("all");
  const [slaValues, setSlaValues] = useState<Record<string, { hours: number; description: string; isActive: boolean }>>({});

  const { data: programs } = useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: existingSLAs, isLoading } = useQuery({
    queryKey: ["claims-sla", selectedProgram],
    queryFn: async () => {
      let query = supabase
        .from("claims_sla")
        .select("*");
      
      if (selectedProgram !== "all") {
        query = query.eq("program_id", selectedProgram);
      } else {
        query = query.is("program_id", null);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ClaimSLA[];
    },
  });

  useEffect(() => {
    if (existingSLAs) {
      const values: Record<string, { hours: number; description: string; isActive: boolean }> = {};
      existingSLAs.forEach((sla) => {
        values[sla.claim_status] = {
          hours: sla.sla_hours,
          description: sla.description || "",
          isActive: sla.is_active
        };
      });
      setSlaValues(values);
    }
  }, [existingSLAs]);

  const saveSLAMutation = useMutation({
    mutationFn: async ({ status, hours, description, isActive }: { 
      status: ClaimStatus; 
      hours: number; 
      description: string;
      isActive: boolean;
    }) => {
      const existingSLA = existingSLAs?.find(s => s.claim_status === status);
      
      if (existingSLA) {
        const { error } = await supabase
          .from("claims_sla")
          .update({
            sla_hours: hours,
            description,
            is_active: isActive,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingSLA.id);
        
        if (error) throw error;
      } else {
        const newSLA: ClaimSLAInsert = {
          claim_status: status,
          sla_hours: hours,
          description,
          is_active: isActive,
          program_id: selectedProgram === "all" ? null : selectedProgram
        };
        
        const { error } = await supabase
          .from("claims_sla")
          .insert(newSLA);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claims-sla"] });
      toast.success("SLA saved successfully");
    },
    onError: (error) => {
      toast.error("Failed to save SLA: " + error.message);
    }
  });

  const handleSave = (status: ClaimStatus) => {
    const values = slaValues[status];
    if (!values || values.hours <= 0) {
      toast.error("Please enter a valid SLA in hours");
      return;
    }
    
    saveSLAMutation.mutate({
      status,
      hours: values.hours,
      description: values.description,
      isActive: values.isActive
    });
  };

  const handleSLAChange = (status: string, field: "hours" | "description" | "isActive", value: any) => {
    setSlaValues(prev => ({
      ...prev,
      [status]: {
        ...prev[status],
        hours: prev[status]?.hours || 24,
        description: prev[status]?.description || "",
        isActive: prev[status]?.isActive !== undefined ? prev[status].isActive : true,
        [field]: value
      }
    }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Claims SLA Management
            </CardTitle>
            <CardDescription>
              Set service level agreements for each claim status
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="program-select" className="text-sm font-medium">
              Apply to:
            </Label>
            <Select value={selectedProgram} onValueChange={setSelectedProgram}>
              <SelectTrigger id="program-select" className="w-[250px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs (Default)</SelectItem>
                {programs?.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading SLAs...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim Status</TableHead>
                <TableHead>SLA (Hours)</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CLAIM_STATUSES.map((status) => {
                const currentSLA = slaValues[status];
                return (
                  <TableRow key={status}>
                    <TableCell className="font-medium">
                      {formatStatusLabel(status)}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        placeholder="24"
                        value={currentSLA?.hours || ""}
                        onChange={(e) => handleSLAChange(status, "hours", parseInt(e.target.value) || 0)}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Optional description"
                        value={currentSLA?.description || ""}
                        onChange={(e) => handleSLAChange(status, "description", e.target.value)}
                        className="w-full"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={currentSLA?.isActive !== false}
                        onCheckedChange={(checked) => handleSLAChange(status, "isActive", checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleSave(status)}
                        disabled={!currentSLA?.hours || currentSLA.hours <= 0}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
