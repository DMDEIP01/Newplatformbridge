import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PinVerificationDialogProps {
  open: boolean;
  onVerified: () => void;
  onCancel: () => void;
  userEmail: string;
}

export function PinVerificationDialog({
  open,
  onVerified,
  onCancel,
  userEmail,
}: PinVerificationDialogProps) {
  const [pin, setPin] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    if (pin.length !== 4) {
      toast.error("Please enter a 4-digit PIN");
      return;
    }

    setVerifying(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("User not found");
        return;
      }

      // Get user's PIN hash
      const { data: pinData, error: fetchError } = await supabase
        .from("user_pins")
        .select("pin_hash")
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching PIN:", fetchError);
        toast.error("Failed to verify PIN");
        return;
      }

      if (!pinData) {
        toast.error("PIN not set for this user");
        return;
      }

      // Verify PIN using PostgreSQL crypt function
      const { data: verifyData, error: verifyError } = await supabase.rpc(
        "verify_pin",
        {
          user_id: user.id,
          pin_attempt: pin,
        }
      );

      if (verifyError) {
        console.error("Error verifying PIN:", verifyError);
        toast.error("Failed to verify PIN");
        return;
      }

      if (verifyData) {
        toast.success("PIN verified successfully");
        onVerified();
      } else {
        toast.error("Incorrect PIN");
        setPin("");
      }
    } catch (error) {
      console.error("PIN verification error:", error);
      toast.error("Failed to verify PIN");
    } finally {
      setVerifying(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleVerify();
    }
  };

  const handleCancel = () => {
    setPin("");
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enter Your PIN</DialogTitle>
          <DialogDescription>
            Please enter your 4-digit PIN to complete login for {userEmail}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="pin">PIN</Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              onKeyPress={handleKeyPress}
              placeholder="••••"
              className="text-center text-2xl tracking-widest"
              autoFocus
              disabled={verifying}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCancel}
              disabled={verifying}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleVerify}
              disabled={verifying || pin.length !== 4}
            >
              {verifying ? "Verifying..." : "Verify PIN"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
