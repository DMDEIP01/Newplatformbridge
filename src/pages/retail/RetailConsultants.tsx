import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const consultantSchema = z.object({
  email: z.string().email("Invalid email address"),
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default function RetailConsultants() {
  const [consultants, setConsultants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [userProgramId, setUserProgramId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    password: "",
  });

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    // Get current user's program
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get user's admin role program_id
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("program_id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (userRole) {
      setUserProgramId(userRole.program_id);
    }
    
    await fetchConsultants();
  };

  const fetchConsultants = async () => {
    // Use the security definer function to fetch consultants
    const { data, error } = await supabase
      .rpc('get_program_consultants', { 
        target_program_id: userProgramId 
      });

    if (error) {
      console.error("Error fetching consultants:", error);
      toast.error("Failed to load consultants");
    } else if (data) {
      // Map the data to match the expected structure
      const consultantsWithProfiles = data.map((consultant: any) => ({
        id: consultant.id,
        user_id: consultant.user_id,
        role: consultant.role,
        program_id: consultant.program_id,
        created_at: consultant.created_at,
        profiles: {
          full_name: consultant.full_name,
          email: consultant.email
        }
      }));
      setConsultants(consultantsWithProfiles);
    }
    setLoading(false);
  };

  const handleCreateConsultant = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const validated = consultantSchema.parse(formData);
      
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          data: {
            full_name: validated.fullName,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Add consultant role with the same program_id as the admin
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: authData.user.id,
            role: "consultant",
            program_id: userProgramId,
          });

        if (roleError) throw roleError;

        toast.success("Consultant created successfully");
        setIsDialogOpen(false);
        setFormData({ email: "", fullName: "", password: "" });
        await fetchConsultants();
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Failed to create consultant");
      }
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Consultants</h1>
          <p className="text-muted-foreground">Manage retail consultants</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Consultant
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Consultant</DialogTitle>
              <DialogDescription>Add a new retail consultant to the system</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateConsultant} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? "Creating..." : "Create Consultant"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consultants.map((consultant) => (
                <TableRow key={consultant.id}>
                  <TableCell className="font-medium">{consultant.profiles?.full_name}</TableCell>
                  <TableCell>{consultant.profiles?.email}</TableCell>
                  <TableCell className="capitalize">{consultant.role}</TableCell>
                  <TableCell>
                    <Badge variant="default">Active</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
