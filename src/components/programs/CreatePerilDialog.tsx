import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface CreatePerilDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (perilName: string) => void;
}

export function CreatePerilDialog({ open, onOpenChange, onSave }: CreatePerilDialogProps) {
  const [perilName, setPerilName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!perilName.trim()) {
      toast.error("Please enter a peril name");
      return;
    }

    onSave(perilName.trim());
    setPerilName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Custom Peril</DialogTitle>
          <DialogDescription>
            Add a new peril type that can be covered by this product
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="peril-name">Peril Name *</Label>
            <Input
              id="peril-name"
              value={perilName}
              onChange={(e) => setPerilName(e.target.value)}
              placeholder="e.g., Fire Damage"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Add Peril
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
