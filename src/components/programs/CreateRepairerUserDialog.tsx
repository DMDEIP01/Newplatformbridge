import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

interface Repairer {
  id: string;
  name: string;
  company_name: string;
}

interface CreateRepairerUserDialogProps {
  onUserCreated: () => void;
}

export default function CreateRepairerUserDialog({ onUserCreated }: CreateRepairerUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [repairers, setRepairers] = useState<Repairer[]>([]);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    repairerId: "",
  });

  useEffect(() => {
    if (open) {
      loadRepairers();
    }
  }, [open]);

  const loadRepairers = async () => {
    const { data, error } = await supabase
      .from("repairers")
      .select("id, name, company_name")
      .eq("is_active", true)
      .order("company_name");

    if (!error && data) {
      setRepairers(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Call edge function to create user with repairer_agent role
      const { data, error } = await supabase.functions.invoke("grant-role", {
        body: {
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          role: "repairer_agent",
        },
      });

      if (error) throw error;

      // Update the user's profile with repairer_id
      if (data?.user_id) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ repairer_id: formData.repairerId })
          .eq("id", data.user_id);

        if (profileError) throw profileError;
      }

      toast.success("Repairer user account created successfully");
      setOpen(false);
      setFormData({
        email: "",
        password: "",
        fullName: "",
        repairerId: "",
      });
      onUserCreated();
    } catch (error: any) {
      console.error("Error creating repairer user:", error);
      toast.error(error.message || "Failed to create repairer user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Repairer User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Repairer User Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="repairer">Repairer Company *</Label>
            <Select
              value={formData.repairerId}
              onValueChange={(value) => setFormData({ ...formData, repairerId: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select repairer company" />
              </SelectTrigger>
              <SelectContent>
                {repairers.map((repairer) => (
                  <SelectItem key={repairer.id} value={repairer.id}>
                    {repairer.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
