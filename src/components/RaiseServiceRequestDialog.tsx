import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface RaiseServiceRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claimId: string;
  policyId: string;
  customerName: string;
  customerEmail: string;
  onSuccess: () => void;
}

export function RaiseServiceRequestDialog({
  open,
  onOpenChange,
  claimId,
  policyId,
  customerName,
  customerEmail,
  onSuccess,
}: RaiseServiceRequestDialogProps) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim() || !details.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Not authenticated");
      }

      // Create service request
      const { error: serviceRequestError } = await supabase
        .from("service_requests")
        .insert({
          claim_id: claimId,
          policy_id: policyId,
          customer_name: customerName,
          customer_email: customerEmail,
          reason: reason,
          details: details,
          created_by: user.id,
          status: "open",
        });

      if (serviceRequestError) throw serviceRequestError;

      // Update claim status to referred_pending_info
      const { error: claimUpdateError } = await supabase
        .from("claims")
        .update({ status: "referred_pending_info" })
        .eq("id", claimId);

      if (claimUpdateError) throw claimUpdateError;

      toast({
        title: "Success",
        description: "Service request created successfully. The customer will be notified.",
      });

      setReason("");
      setDetails("");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error creating service request:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create service request",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Raise Service Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Customer</Label>
            <Input value={`${customerName} (${customerEmail})`} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Input
              id="reason"
              placeholder="e.g., Missing Proof of Purchase"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">
              Details <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="details"
              placeholder="Explain what information or documents are needed from the customer..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={6}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Service Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
