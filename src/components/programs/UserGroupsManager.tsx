import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Plus, Save, Edit, Trash2, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface UserGroup {
  id: string;
  name: string;
  description: string | null;
}

interface Program {
  id: string;
  name: string;
}

const RETAIL_SECTIONS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "sales", label: "New Sale" },
  { id: "policy_search", label: "Policy Search" },
  { id: "make_claim", label: "Make a Claim" },
  { id: "claims", label: "Claims" },
  { id: "claims_management", label: "Claims Management" },
  { id: "complaints_management", label: "Complaints Management" },
  { id: "repairer_jobs", label: "My Repair Jobs" },
  { id: "service_request", label: "Service Request" },
  { id: "reports", label: "Reports" },
  { id: "consultants", label: "Consultants" },
];

export function UserGroupsManager() {
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<UserGroup | null>(null);
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set());
  const [sectionPermissions, setSectionPermissions] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    fetchGroups();
    fetchPrograms();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_groups")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Failed to load user groups");
      console.error(error);
    } else {
      setGroups(data || []);
    }
    setLoading(false);
  };

  const fetchPrograms = async () => {
    const { data, error } = await supabase
      .from("programs")
      .select("id, name")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error(error);
    } else {
      setPrograms(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Group name is required");
      return;
    }

    setSaving(true);

    try {
      if (editingGroup) {
        const { error } = await supabase
          .from("user_groups")
          .update({
            name: formData.name,
            description: formData.description || null,
          })
          .eq("id", editingGroup.id);

        if (error) throw error;
        toast.success("User group updated");
      } else {
        const { error } = await supabase
          .from("user_groups")
          .insert({
            name: formData.name,
            description: formData.description || null,
          });

        if (error) throw error;
        toast.success("User group created");
      }

      fetchGroups();
      setDialogOpen(false);
      setFormData({ name: "", description: "" });
      setEditingGroup(null);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to save user group");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (group: UserGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (groupId: string) => {
    if (!confirm("Are you sure you want to delete this user group?")) return;

    const { error } = await supabase
      .from("user_groups")
      .delete()
      .eq("id", groupId);

    if (error) {
      toast.error("Failed to delete user group");
      console.error(error);
    } else {
      toast.success("User group deleted");
      fetchGroups();
    }
  };

  const handleManagePermissions = async (group: UserGroup) => {
    setSelectedGroup(group);
    setLoading(true);

    const { data, error } = await supabase
      .from("user_group_permissions")
      .select("program_id, allowed_sections")
      .eq("group_id", group.id);

    if (error) {
      console.error(error);
    } else {
      const programIds = new Set<string>();
      const permissions: Record<string, string[]> = {};

      (data || []).forEach((perm: any) => {
        programIds.add(perm.program_id);
        permissions[perm.program_id] = perm.allowed_sections || [];
      });

      setSelectedPrograms(programIds);
      setSectionPermissions(permissions);
    }

    setLoading(false);
    setPermissionsDialogOpen(true);
  };

  const handleToggleProgram = (programId: string) => {
    const newSet = new Set(selectedPrograms);
    if (newSet.has(programId)) {
      newSet.delete(programId);
      const newPerms = { ...sectionPermissions };
      delete newPerms[programId];
      setSectionPermissions(newPerms);
    } else {
      newSet.add(programId);
      setSectionPermissions({ ...sectionPermissions, [programId]: [] });
    }
    setSelectedPrograms(newSet);
  };

  const handleToggleSection = (programId: string, sectionId: string) => {
    const currentSections = sectionPermissions[programId] || [];
    const newSections = currentSections.includes(sectionId)
      ? currentSections.filter((s) => s !== sectionId)
      : [...currentSections, sectionId];

    setSectionPermissions({
      ...sectionPermissions,
      [programId]: newSections,
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedGroup) return;

    setSaving(true);

    // Delete existing permissions
    await supabase
      .from("user_group_permissions")
      .delete()
      .eq("group_id", selectedGroup.id);

    // Insert new permissions
    const permissions = Array.from(selectedPrograms).map((programId) => ({
      group_id: selectedGroup.id,
      program_id: programId,
      allowed_sections: (sectionPermissions[programId] || []) as any,
    }));

    const { error } = await supabase
      .from("user_group_permissions")
      .insert(permissions);

    setSaving(false);

    if (error) {
      toast.error("Failed to save permissions");
      console.error(error);
    } else {
      toast.success("Group permissions saved");
      setPermissionsDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2">User Groups</h2>
          <p className="text-muted-foreground text-sm">
            Create user groups and assign program permissions that users can inherit
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create User Group
        </Button>
      </div>

      {loading && groups.length === 0 ? (
        <div className="text-center py-8">Loading user groups...</div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No user groups yet. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      {group.name}
                    </CardTitle>
                    {group.description && (
                      <CardDescription className="mt-2">{group.description}</CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleManagePermissions(group)}
                    className="flex-1"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Permissions
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(group)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(group.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Edit User Group" : "Create User Group"}</DialogTitle>
            <DialogDescription>
              {editingGroup
                ? "Update the user group details"
                : "Create a new user group to organize user permissions"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Group Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Store Managers, Customer Service"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the purpose of this group..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editingGroup ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Permissions - {selectedGroup?.name}</DialogTitle>
            <DialogDescription>
              Configure which programs and sections this group can access
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {programs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No programs available. Create programs first.
              </div>
            ) : (
              programs.map((program) => (
                <Card key={program.id} className="border-2">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id={`perm-${program.id}`}
                        checked={selectedPrograms.has(program.id)}
                        onCheckedChange={() => handleToggleProgram(program.id)}
                      />
                      <label
                        htmlFor={`perm-${program.id}`}
                        className="font-semibold cursor-pointer"
                      >
                        {program.name}
                      </label>
                    </div>
                  </CardHeader>
                  {selectedPrograms.has(program.id) && (
                    <CardContent>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Allowed Sections</Label>
                        <div className="grid grid-cols-2 gap-3">
                          {RETAIL_SECTIONS.map((section) => (
                            <div
                              key={section.id}
                              className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent/5"
                            >
                              <Checkbox
                                id={`perm-${program.id}-${section.id}`}
                                checked={(sectionPermissions[program.id] || []).includes(
                                  section.id
                                )}
                                onCheckedChange={() =>
                                  handleToggleSection(program.id, section.id)
                                }
                              />
                              <label
                                htmlFor={`perm-${program.id}-${section.id}`}
                                className="text-sm cursor-pointer flex-1"
                              >
                                {section.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermissionsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePermissions} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Permissions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
