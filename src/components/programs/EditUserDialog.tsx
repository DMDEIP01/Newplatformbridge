import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  onUserUpdated: () => void;
}

export function EditUserDialog({ open, onOpenChange, userId, onUserUpdated }: EditUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [userGroups, setUserGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    postcode: "",
    groupId: "",
  });

  useEffect(() => {
    if (open) {
      fetchUserGroups();
    }
    if (userId && open) {
      fetchUserData();
    }
  }, [userId, open]);

  const fetchUserGroups = async () => {
    const { data, error } = await supabase
      .from("user_groups")
      .select("id, name")
      .order("name");

    if (error) {
      console.error(error);
    } else {
      setUserGroups(data || []);
    }
  };

  const fetchUserData = async () => {
    if (!userId) return;

    // Fetch profile data
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching user:", error);
      toast.error("Failed to load user data");
      return;
    }

    // Fetch user group membership
    const { data: memberData } = await supabase
      .from("user_group_members")
      .select("group_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      setFormData({
        email: data.email || "",
        fullName: data.full_name || "",
        phone: data.phone || "",
        addressLine1: data.address_line1 || "",
        addressLine2: data.address_line2 || "",
        city: data.city || "",
        postcode: data.postcode || "",
        groupId: memberData?.group_id || "",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId || !formData.email || !formData.fullName) {
      toast.error("Email and full name are required");
      return;
    }

    if (!formData.groupId) {
      toast.error("User group is required");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          action: "update",
          userData: {
            userId: userId,
            email: formData.email,
            fullName: formData.fullName,
            phone: formData.phone,
            addressLine1: formData.addressLine1,
            addressLine2: formData.addressLine2,
            city: formData.city,
            postcode: formData.postcode,
            groupId: formData.groupId,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || "Failed to update user");
      }

      toast.success("User updated successfully");
      onUserUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(error.message || "Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user account details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-fullName">Full Name *</Label>
              <Input
                id="edit-fullName"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+44 123 456 7890"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-postcode">Postcode</Label>
              <Input
                id="edit-postcode"
                value={formData.postcode}
                onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                placeholder="SW1A 1AA"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit-groupId">User Group *</Label>
              <Select value={formData.groupId || "none"} onValueChange={(value) => setFormData({ ...formData, groupId: value === "none" ? "" : value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user group..." />
                </SelectTrigger>
                <SelectContent>
                  {userGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit-addressLine1">Address Line 1</Label>
              <Input
                id="edit-addressLine1"
                value={formData.addressLine1}
                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                placeholder="123 Main Street"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit-addressLine2">Address Line 2</Label>
              <Input
                id="edit-addressLine2"
                value={formData.addressLine2}
                onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                placeholder="Apartment, suite, etc."
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit-city">City</Label>
              <Input
                id="edit-city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="London"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
