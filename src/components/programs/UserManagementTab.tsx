import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Save, X, CheckCircle2, Shield, Plus, Download, Upload, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreateUserDialog } from "./CreateUserDialog";
import { EditUserDialog } from "./EditUserDialog";

interface User {
  id: string;
  email: string;
  full_name: string;
}

interface Program {
  id: string;
  name: string;
}

interface UserProgramPermission {
  user_id: string;
  program_id: string;
  allowed_sections: string[];
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

export function UserManagementTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set());
  const [sectionPermissions, setSectionPermissions] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [csvUploadOpen, setCsvUploadOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [userGroupPermissions, setUserGroupPermissions] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetchUsers();
    fetchPrograms();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchUserPermissions();
      fetchUserGroupPermissions();
    }
  }, [selectedUser]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .order("full_name");

    if (error) {
      toast.error("Failed to load users");
      console.error(error);
    } else {
      setUsers(profiles || []);
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
      toast.error("Failed to load programs");
      console.error(error);
    } else {
      setPrograms(data || []);
    }
  };

  const fetchUserPermissions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_program_permissions")
      .select("program_id, allowed_sections")
      .eq("user_id", selectedUser);

    if (error) {
      console.error("Error fetching permissions:", error);
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
  };

  const fetchUserGroupPermissions = async () => {
    // Fetch user's group memberships
    const { data: memberData, error: memberError } = await supabase
      .from("user_group_members")
      .select("group_id")
      .eq("user_id", selectedUser);

    if (memberError) {
      console.error("Error fetching group memberships:", memberError);
      return;
    }

    if (!memberData || memberData.length === 0) {
      setUserGroupPermissions({});
      return;
    }

    // Fetch permissions for all groups the user belongs to
    const groupIds = memberData.map((m: any) => m.group_id);
    const { data: permData, error: permError } = await supabase
      .from("user_group_permissions")
      .select("program_id, allowed_sections")
      .in("group_id", groupIds);

    if (permError) {
      console.error("Error fetching group permissions:", permError);
      return;
    }

    // Merge permissions from all groups
    const groupPerms: Record<string, string[]> = {};
    (permData || []).forEach((perm: any) => {
      if (!groupPerms[perm.program_id]) {
        groupPerms[perm.program_id] = [];
      }
      // Merge and deduplicate sections
      const existingSections = groupPerms[perm.program_id];
      const newSections = perm.allowed_sections || [];
      groupPerms[perm.program_id] = Array.from(
        new Set([...existingSections, ...newSections])
      );
    });

    setUserGroupPermissions(groupPerms);
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

  const handleSave = async () => {
    if (!selectedUser) {
      toast.error("Please select a user");
      return;
    }

    setSaving(true);

    // Delete existing permissions for this user
    await supabase
      .from("user_program_permissions")
      .delete()
      .eq("user_id", selectedUser);

    // Insert new permissions
    const permissions = Array.from(selectedPrograms).map((programId) => ({
      user_id: selectedUser,
      program_id: programId,
      allowed_sections: (sectionPermissions[programId] || []) as any,
    }));

    const { error } = await supabase
      .from("user_program_permissions")
      .insert(permissions);

    setSaving(false);

    if (error) {
      toast.error("Failed to save permissions");
      console.error(error);
    } else {
      toast.success("User permissions saved successfully");
    }
  };

  const downloadCSVTemplate = () => {
    const headers = ["email", "password", "full_name", "phone", "address_line1", "address_line2", "city", "postcode"];
    const csvContent = headers.join(",") + "\n" +
      "john@example.com,SecurePass123,John Doe,+44 123 456 7890,123 Main St,,London,SW1A 1AA\n" +
      "jane@example.com,SecurePass456,Jane Smith,+44 987 654 3210,456 Oak Ave,Apt 2,Manchester,M1 1AA";
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "user_import_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("CSV template downloaded. Note: You must assign user groups after import.");
  };

  const handleCSVUpload = async () => {
    if (!csvFile) {
      toast.error("Please select a CSV file");
      return;
    }

    setUploading(true);

    try {
      const text = await csvFile.text();
      const lines = text.split("\n").filter((line) => line.trim());
      const headers = lines[0].split(",").map((h) => h.trim());

      const requiredHeaders = ["email", "password", "full_name"];
      const hasRequiredHeaders = requiredHeaders.every((h) => headers.includes(h));

      if (!hasRequiredHeaders) {
        throw new Error("CSV must contain email, password, and full_name columns");
      }

      const users = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        const userData: any = {};
        
        headers.forEach((header, index) => {
          userData[header] = values[index] || "";
        });

        users.push(userData);
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          action: "bulk-create",
          userData: { users },
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || "Failed to process CSV file");
      }

      const successCount = result.results.filter((r: any) => r.success).length;
      const errorCount = result.results.filter((r: any) => !r.success).length;

      toast.success(`Created ${successCount} users${errorCount > 0 ? `, ${errorCount} failed` : ""}`);
      fetchUsers();
      setCsvUploadOpen(false);
      setCsvFile(null);
    } catch (error: any) {
      console.error("CSV upload error:", error);
      toast.error(error.message || "Failed to process CSV file");
    } finally {
      setUploading(false);
    }
  };

  const handleEditUser = (userId: string) => {
    setEditUserId(userId);
    setEditUserOpen(true);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedUserData = users.find((u) => u.id === selectedUser);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">User Management</h2>
        <p className="text-muted-foreground text-sm">
          Assign users to programs and control their access to retail portal sections
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Select User</CardTitle>
              <CardDescription>Choose a user to manage their program access and permissions</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={downloadCSVTemplate} size="sm">
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
              <Button variant="outline" onClick={() => setCsvUploadOpen(true)} size="sm">
                <Upload className="mr-2 h-4 w-4" />
                Upload CSV
              </Button>
              <Button onClick={() => setCreateUserOpen(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Create User
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search Users</Label>
            <Input
              id="search"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="border rounded-lg max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow
                      key={user.id}
                      className={selectedUser === user.id ? "bg-accent" : "hover:bg-muted/50"}
                    >
                      <TableCell 
                        className="font-medium cursor-pointer"
                        onClick={() => setSelectedUser(user.id)}
                      >
                        {user.full_name}
                      </TableCell>
                      <TableCell 
                        className="text-muted-foreground cursor-pointer"
                        onClick={() => setSelectedUser(user.id)}
                      >
                        {user.email}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditUser(user.id);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {selectedUser === user.id && (
                            <Badge variant="secondary">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Selected
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CreateUserDialog
        open={createUserOpen}
        onOpenChange={setCreateUserOpen}
        onUserCreated={fetchUsers}
      />

      <EditUserDialog
        open={editUserOpen}
        onOpenChange={setEditUserOpen}
        userId={editUserId}
        onUserUpdated={fetchUsers}
      />

      <Dialog open={csvUploadOpen} onOpenChange={setCsvUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload CSV File</DialogTitle>
            <DialogDescription>
              Upload a CSV file to create multiple users at once. Make sure your CSV follows the template format.
              <br />
              <strong>Note:</strong> Users created via CSV must be assigned to user groups manually after import.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="csv-file">CSV File</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">
                Required columns: email, password, full_name. Optional: phone, address_line1, address_line2, city, postcode
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCsvUploadOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCSVUpload} disabled={!csvFile || uploading}>
                {uploading ? "Uploading..." : "Upload & Create Users"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedUser && selectedUserData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Program Access for {selectedUserData.full_name}
                </CardTitle>
                <CardDescription>
                  Assign programs and configure section permissions
                </CardDescription>
              </div>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Permissions"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {programs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No programs available. Create programs first.
              </div>
            ) : (
              <div className="space-y-6">
                {programs.map((program) => (
                  <Card key={program.id} className="border-2">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id={`program-${program.id}`}
                            checked={selectedPrograms.has(program.id)}
                            onCheckedChange={() => handleToggleProgram(program.id)}
                          />
                          <label
                            htmlFor={`program-${program.id}`}
                            className="font-semibold cursor-pointer"
                          >
                            {program.name}
                          </label>
                        </div>
                      </div>
                    </CardHeader>
                    {selectedPrograms.has(program.id) && (
                      <CardContent>
                        <div className="space-y-4">
                          {userGroupPermissions[program.id] && userGroupPermissions[program.id].length > 0 && (
                            <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                              <Label className="text-sm font-medium flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Inherited from User Group
                              </Label>
                              <div className="flex flex-wrap gap-2">
                                {RETAIL_SECTIONS.filter((s) =>
                                  userGroupPermissions[program.id].includes(s.id)
                                ).map((section) => (
                                  <Badge key={section.id} variant="secondary">
                                    {section.label}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Additional Permissions</Label>
                            <div className="grid grid-cols-2 gap-3">
                              {RETAIL_SECTIONS.map((section) => {
                                const isInherited = userGroupPermissions[program.id]?.includes(section.id);
                                return (
                                  <div
                                    key={section.id}
                                    className="flex items-center space-x-2 rounded-lg border p-3 hover:bg-accent/5"
                                  >
                                    <Checkbox
                                      id={`${program.id}-${section.id}`}
                                      checked={
                                        isInherited ||
                                        (sectionPermissions[program.id] || []).includes(section.id)
                                      }
                                      disabled={isInherited}
                                      onCheckedChange={() =>
                                        handleToggleSection(program.id, section.id)
                                      }
                                    />
                                    <label
                                      htmlFor={`${program.id}-${section.id}`}
                                      className={`text-sm cursor-pointer flex-1 ${
                                        isInherited ? "text-muted-foreground" : ""
                                      }`}
                                    >
                                      {section.label}
                                      {isInherited && " (inherited)"}
                                    </label>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
