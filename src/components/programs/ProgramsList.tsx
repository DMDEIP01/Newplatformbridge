import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Settings, Trash2 } from "lucide-react";
import { CreateProgramDialog } from "./CreateProgramDialog";
import { EditProgramDialog } from "./EditProgramDialog";

interface Program {
  id: string;
  name: string;
  description: string | null;
  data_isolation_enabled: boolean;
  is_active: boolean;
  created_at: string;
}

export function ProgramsList() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);

  const fetchPrograms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("programs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load programs");
      console.error(error);
    } else {
      setPrograms(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this program? This action cannot be undone.")) {
      return;
    }

    const { error } = await supabase
      .from("programs")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to delete program");
      console.error(error);
    } else {
      toast.success("Program deleted successfully");
      fetchPrograms();
    }
  };

  const handleToggleActive = async (program: Program) => {
    const { error } = await supabase
      .from("programs")
      .update({ is_active: !program.is_active })
      .eq("id", program.id);

    if (error) {
      toast.error("Failed to update program");
      console.error(error);
    } else {
      toast.success(`Program ${!program.is_active ? "activated" : "deactivated"}`);
      fetchPrograms();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Programs</h2>
          <p className="text-muted-foreground text-sm">
            Create and manage deployment programs
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Program
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading programs...</div>
      ) : programs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">No programs created yet</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Program
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {programs.map((program) => (
            <Card key={program.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle>{program.name}</CardTitle>
                    {program.description && (
                      <CardDescription>{program.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={program.is_active ? "default" : "secondary"}>
                      {program.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Data Isolation</span>
                    <Badge variant="outline">
                      {program.data_isolation_enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingProgram(program)}
                      className="flex-1"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(program)}
                      className="flex-1"
                    >
                      {program.is_active ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(program.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateProgramDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchPrograms}
      />

      {editingProgram && (
        <EditProgramDialog
          program={editingProgram}
          open={!!editingProgram}
          onOpenChange={(open) => !open && setEditingProgram(null)}
          onSuccess={fetchPrograms}
        />
      )}
    </div>
  );
}
