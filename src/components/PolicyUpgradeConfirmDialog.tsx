import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, CreditCard, FileText, ArrowRight } from "lucide-react";

interface PolicyUpgradeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
  currentProduct: {
    name: string;
    monthly_premium: number;
  };
  newProduct: {
    name: string;
    monthly_premium: number;
  };
}

export function PolicyUpgradeConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  currentProduct,
  newProduct,
}: PolicyUpgradeConfirmDialogProps) {
  const premiumDiff = newProduct.monthly_premium - currentProduct.monthly_premium;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-screen h-screen max-h-screen flex flex-col rounded-none">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-2xl">Confirm Policy Upgrade</DialogTitle>
          <DialogDescription>
            Please confirm the following changes to your policy
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Product Change */}
            <div className="bg-muted/50 p-6 rounded-lg space-y-4">
              <h3 className="font-semibold text-lg">Product Change</h3>
              <div className="flex items-center justify-between text-base">
                <span className="text-muted-foreground">Current Product</span>
                <span className="font-medium">{currentProduct.name}</span>
              </div>
              <div className="flex justify-center">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex items-center justify-between text-base">
                <span className="text-muted-foreground">New Product</span>
                <span className="font-medium text-success">{newProduct.name}</span>
              </div>
            </div>

            {/* Premium Change */}
            <div className="bg-primary/5 border border-primary/20 p-6 rounded-lg space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Monthly Premium Update</h3>
              </div>
              <div className="flex items-center justify-between text-base">
                <span>Current Premium</span>
                <span>€{currentProduct.monthly_premium.toFixed(2)}/mo</span>
              </div>
              <div className="flex items-center justify-between text-base">
                <span>Change</span>
                <Badge variant="outline" className={premiumDiff > 0 ? "text-warning border-warning" : "text-success border-success"}>
                  {premiumDiff > 0 ? "+" : ""}€{premiumDiff.toFixed(2)}/mo
                </Badge>
              </div>
              <div className="flex items-center justify-between text-lg font-bold pt-2 border-t">
                <span>New Premium</span>
                <span className="text-primary">€{newProduct.monthly_premium.toFixed(2)}/mo</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The new amount will be collected from the same payment account on file.
              </p>
            </div>

            {/* Documents Notice */}
            <div className="bg-secondary/50 p-6 rounded-lg space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold text-lg">New Documents</h3>
              </div>
              <p className="text-muted-foreground">
                The following documents will be issued and saved to your policy:
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>Insurance Product Information Document (IPID)</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>Terms & Conditions</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>Policy Schedule</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "Processing..." : "Confirm Upgrade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
