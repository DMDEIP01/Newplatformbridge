import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Settings, Trash2 } from "lucide-react";
import { CreatePerilDialog } from "./CreatePerilDialog";
import { PerilDetailsDialog, type PerilDetails, type AcceptanceCheck } from "./PerilDetailsDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Peril {
  id: string;
  name: string;
  description: string | null;
  rejection_terms: any;
  acceptance_logic: any;
  evidence_requirements: any;
  is_active: boolean;
}

export function PerilsManager() {
  const [perils, setPerils] = useState<Peril[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPeril, setSelectedPeril] = useState<Peril | null>(null);
  const [perilToDelete, setPerilToDelete] = useState<Peril | null>(null);

  useEffect(() => {
    loadPerils();
  }, []);

  const loadPerils = async () => {
    try {
      const { data, error } = await supabase
        .from("perils")
        .select("*")
        .order("name");

      if (error) throw error;
      setPerils(data || []);
    } catch (error: any) {
      toast.error("Failed to load perils", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePeril = async (perilName: string) => {
    try {
      // Initialize with default evidence requirements
      const defaultEvidence = [
        { id: "evidence-0", name: "Proof of purchase", isRequired: false, aiAssessed: false },
        { id: "evidence-1", name: "Device pictures", isRequired: false, aiAssessed: false }
      ];

      const { error } = await supabase
        .from("perils")
        .insert({
          name: perilName,
          rejection_terms: [],
          acceptance_logic: {},
          evidence_requirements: defaultEvidence
        });

      if (error) throw error;

      toast.success("Peril created successfully");
      loadPerils();
    } catch (error: any) {
      toast.error("Failed to create peril", {
        description: error.message,
      });
    }
  };

  // Transform database structure to dialog structure
  const transformPerilToDetails = (peril: Peril): PerilDetails => {
    // Transform rejection terms
    const rejectionTerms = Array.isArray(peril.rejection_terms) 
      ? peril.rejection_terms.map((term: any) => ({
          id: term.id,
          term: term.text,
          isSelected: term.isSelected || false
        }))
      : [];

    // Transform acceptance logic from object to array format
    const acceptanceLogic: AcceptanceCheck[] = [];
    if (peril.acceptance_logic && typeof peril.acceptance_logic === 'object') {
      Object.entries(peril.acceptance_logic).forEach(([category, checks]) => {
        if (Array.isArray(checks)) {
          acceptanceLogic.push({
            category,
            checks: checks.map((check: any) => ({
              id: check.id,
              check: check.text,
              isSelected: check.isRequired || false
            }))
          });
        }
      });
    }

    // Transform evidence requirements
    const evidenceRequirements = Array.isArray(peril.evidence_requirements)
      ? peril.evidence_requirements.map((req: any) => ({
          id: req.id,
          name: req.name,
          isRequired: req.isRequired || false,
          aiAssessed: req.aiAssessed || false
        }))
      : [];

    return {
      perilName: peril.name,
      rejectionTerms,
      acceptanceLogic,
      evidenceRequirements
    };
  };

  const handleConfigurePeril = (peril: Peril) => {
    setSelectedPeril(peril);
    setDetailsDialogOpen(true);
  };

  const handleSavePerilDetails = async (details: PerilDetails) => {
    if (!selectedPeril) return;

    try {
      // Transform dialog format back to database format
      const dbRejectionTerms = details.rejectionTerms?.map(term => ({
        id: term.id,
        text: term.term,
        isSelected: term.isSelected
      })) || [];

      // Transform acceptance logic from array to object format
      const dbAcceptanceLogic: Record<string, any[]> = {};
      details.acceptanceLogic?.forEach(section => {
        dbAcceptanceLogic[section.category] = section.checks.map(check => ({
          id: check.id,
          text: check.check,
          isRequired: check.isSelected
        }));
      });

      // Transform evidence requirements back to database format
      const dbEvidenceRequirements = details.evidenceRequirements?.map(req => ({
        id: req.id,
        name: req.name,
        isRequired: req.isRequired,
        aiAssessed: req.aiAssessed
      })) || [];

      const { error } = await supabase
        .from("perils")
        .update({
          rejection_terms: dbRejectionTerms,
          acceptance_logic: dbAcceptanceLogic,
          evidence_requirements: dbEvidenceRequirements,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedPeril.id);

      if (error) throw error;

      toast.success("Peril configuration saved successfully");
      loadPerils();
      setDetailsDialogOpen(false);
      setSelectedPeril(null);
    } catch (error: any) {
      toast.error("Failed to save peril configuration", {
        description: error.message,
      });
    }
  };

  const handleDeleteClick = (peril: Peril) => {
    setPerilToDelete(peril);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!perilToDelete) return;

    try {
      const { error } = await supabase
        .from("perils")
        .delete()
        .eq("id", perilToDelete.id);

      if (error) throw error;

      toast.success("Peril deleted successfully");
      loadPerils();
    } catch (error: any) {
      toast.error("Failed to delete peril", {
        description: error.message,
      });
    } finally {
      setDeleteDialogOpen(false);
      setPerilToDelete(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading perils...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Perils Configuration</CardTitle>
              <CardDescription>
                Manage peril types with rejection terms and acceptance rules
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Peril
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {perils.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No perils configured yet</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Peril
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {perils.map((peril) => (
                <div
                  key={peril.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{peril.name}</h3>
                    {peril.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {peril.description}
                      </p>
                    )}
                    <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                      <span>
                        Rejection Terms:{" "}
                        {Array.isArray(peril.rejection_terms)
                          ? peril.rejection_terms.length
                          : 0}
                      </span>
                      <span>
                        Acceptance Checks:{" "}
                        {peril.acceptance_logic &&
                        typeof peril.acceptance_logic === "object"
                          ? Object.keys(peril.acceptance_logic).length
                          : 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConfigurePeril(peril)}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Configure
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(peril)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CreatePerilDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSave={handleCreatePeril}
      />

      {selectedPeril && (
        <PerilDetailsDialog
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          perilName={selectedPeril.name}
          existingDetails={transformPerilToDetails(selectedPeril)}
          onSave={handleSavePerilDetails}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Peril</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{perilToDelete?.name}"? This action
              cannot be undone. Products using this peril will need to be updated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
