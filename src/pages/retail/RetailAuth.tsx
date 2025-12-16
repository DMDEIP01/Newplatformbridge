import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, ShoppingBag, AlertCircle, ClipboardList, Crown, Wrench, Briefcase, Folders } from "lucide-react";
import { PinVerificationDialog } from "@/components/PinVerificationDialog";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const roleAccounts = [
  { 
    role: "retail_agent", 
    email: "retailagent@mediamarkt.ie", 
    password: "Test123456!", 
    fullName: "James Ryan (Retail Agent)",
    label: "Retail Agent",
    icon: ShoppingBag
  },
  { 
    role: "claims_agent", 
    email: "claimsagent@mediamarkt.ie", 
    password: "Test123456!", 
    fullName: "Sarah Walsh (Claims Agent)",
    label: "Claims Agent",
    icon: AlertCircle
  },
  { 
    role: "complaints_agent", 
    email: "agent1@mediamarkt.ie", 
    password: "Test123456!", 
    fullName: "Emma O'Connor (Complaints Agent)",
    label: "Complaints Agent",
    icon: ClipboardList
  },
  { 
    role: "repairer_agent", 
    email: "repairer@mediamarkt.ie", 
    password: "Test123456!", 
    fullName: "Tom Murphy (Repairer Agent)",
    label: "Repairer Agent",
    icon: Wrench
  },
  { 
    role: "commercial_agent", 
    email: "commercial@mediamarkt.ie", 
    password: "Test123456!", 
    fullName: "David Kelly (Commercial Agent)",
    label: "Commercial Agent",
    icon: Briefcase
  },
  { 
    role: "backoffice_agent", 
    email: "backoffice@mediamarkt.ie", 
    password: "Test123456!", 
    fullName: "Lisa Murphy (Backoffice Operations)",
    label: "Backoffice Operations",
    icon: Folders
  },
  { 
    role: "admin", 
    email: "admin@mediamarkt.ie", 
    password: "Test123456!", 
    fullName: "Michael Brennan (Program Admin)",
    label: "Program Admin",
    icon: Crown
  },
];

interface Repairer {
  id: string;
  name: string;
  company_name: string;
}

export default function RetailAuth() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [showRepairerDialog, setShowRepairerDialog] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pendingUserEmail, setPendingUserEmail] = useState("");
  const [repairers, setRepairers] = useState<Repairer[]>([]);
  const [selectedRepairer, setSelectedRepairer] = useState<string>("");
  const [loadingRepairers, setLoadingRepairers] = useState(false);
  const [pendingAccount, setPendingAccount] = useState<typeof roleAccounts[0] | null>(null);

  useEffect(() => {
    if (showRepairerDialog) {
      fetchRepairers();
    }
  }, [showRepairerDialog]);

  const fetchRepairers = async () => {
    setLoadingRepairers(true);
    try {
      const { data, error } = await supabase
        .from("repairers")
        .select("id, name, company_name")
        .eq("is_active", true)
        .order("company_name");

      if (error) throw error;
      setRepairers(data || []);
    } catch (error: any) {
      toast.error("Failed to load repairers: " + error.message);
    } finally {
      setLoadingRepairers(false);
    }
  };

  const handleQuickLogin = async (account: typeof roleAccounts[0]) => {
    // If repairer_agent, show repairer selection dialog
    if (account.role === "repairer_agent") {
      setPendingAccount(account);
      setShowRepairerDialog(true);
      return;
    }

    // For other roles, proceed with normal login
    await performLogin(account, null);
  };

  const handleRepairerLogin = async () => {
    if (!selectedRepairer || !pendingAccount) {
      toast.error("Please select a repairer");
      return;
    }

    await performLogin(pendingAccount, selectedRepairer);
  };

  const performLogin = async (account: typeof roleAccounts[0], repairerId: string | null) => {
    try {
      await supabase.functions.invoke("grant-role", {
        body: { 
          email: account.email, 
          password: account.password, 
          fullName: account.fullName, 
          role: account.role 
        },
        headers: { "x-exclusive": "true" },
      });
      await signIn(account.email, account.password);

      // If repairer_agent, update profile with repairer_id
      if (account.role === "repairer_agent" && repairerId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from("profiles")
            .update({ repairer_id: repairerId })
            .eq("id", user.id);
        }
      }

      // Show PIN verification dialog
      setPendingUserEmail(account.email);
      setShowRepairerDialog(false);
      setShowPinDialog(true);
    } catch (error: any) {
      console.error("Login failed:", error);
      toast.error("Failed to sign in: " + (error.message || "Unknown error"));
    }
  };

  const handlePinVerified = () => {
    setShowPinDialog(false);
    toast.success(`Access granted`);
    navigate("/retail/dashboard", { replace: true });
  };

  const handlePinCancel = async () => {
    setShowPinDialog(false);
    setPendingUserEmail("");
    // Sign out the user
    await supabase.auth.signOut();
    toast.info("Login cancelled");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link to="/" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to portal selection
          </Link>
          <img src="/eip-logo.png" alt="EIP" className="mx-auto mb-4 h-12" />
          <CardTitle className="text-2xl">Retail Portal</CardTitle>
          <CardDescription>Choose a profile to sign in instantly</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {roleAccounts.map((account) => {
              const Icon = account.icon;
              return (
                <Button
                  key={account.role}
                  type="button"
                  variant="secondary"
                  onClick={() => handleQuickLogin(account)}
                  className="justify-start h-auto py-3"
                >
                  <Icon className="mr-2 h-4 w-4 flex-shrink-0" />
                  <span className="text-left">{account.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showRepairerDialog} onOpenChange={setShowRepairerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Repairer Company</DialogTitle>
            <DialogDescription>
              Choose which repairer company you're logging in for
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="repairer">Repairer Company</Label>
              <Select
                value={selectedRepairer}
                onValueChange={setSelectedRepairer}
                disabled={loadingRepairers}
              >
                <SelectTrigger id="repairer">
                  <SelectValue placeholder={loadingRepairers ? "Loading..." : "Select a repairer"} />
                </SelectTrigger>
                <SelectContent>
                  {repairers.map((repairer) => (
                    <SelectItem key={repairer.id} value={repairer.id}>
                      {repairer.company_name} ({repairer.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowRepairerDialog(false);
                  setPendingAccount(null);
                  setSelectedRepairer("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleRepairerLogin}
                disabled={!selectedRepairer || loadingRepairers}
              >
                Sign In
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PinVerificationDialog
        open={showPinDialog}
        onVerified={handlePinVerified}
        onCancel={handlePinCancel}
        userEmail={pendingUserEmail}
      />
    </div>
  );
}
