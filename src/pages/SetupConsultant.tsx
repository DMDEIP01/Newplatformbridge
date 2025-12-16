import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, UserCog, Shield } from "lucide-react";

export default function SetupConsultant() {
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingGrant, setLoadingGrant] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCreateConsultant = async () => {
    setLoadingCreate(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-consultant");
      if (error) throw error;
      toast.success("Consultant account ready!\nEmail: consultant@test.com | Password: Test123456!");
      navigate("/retail/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to create consultant account");
    } finally {
      setLoadingCreate(false);
    }
  };

  const handleGrantToMe = async () => {
    setLoadingGrant(true);
    try {
      const { data, error } = await supabase.functions.invoke("grant-consultant");
      if (error) throw error;
      toast.success("Consultant access granted to your account");
      navigate("/retail/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to grant consultant access");
    } finally {
      setLoadingGrant(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <UserCog className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Retail Portal Setup</CardTitle>
          <CardDescription>Choose how to get consultant access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 font-semibold">Grant my account access</h3>
              <p className="mb-4 text-sm text-muted-foreground">Adds the consultant role to your currently signed-in account.</p>
              {user ? (
                <Button onClick={handleGrantToMe} className="w-full" disabled={loadingGrant}>
                  {loadingGrant ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Granting...
                    </>
                  ) : (
                    "Grant Consultant Access"
                  )}
                </Button>
              ) : (
                <div className="space-y-3">
                  <Link to="/auth">
                    <Button className="w-full">Sign in to continue</Button>
                  </Link>
                  <p className="text-xs text-muted-foreground">You must be signed in to grant access to your account.</p>
                </div>
              )}
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="mb-2 font-semibold">Create test consultant</h3>
              <p className="mb-4 text-sm text-muted-foreground">Creates consultant@test.com for demo access.</p>
              <Button onClick={handleCreateConsultant} variant="outline" className="w-full" disabled={loadingCreate}>
                {loadingCreate ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Consultant Account"
                )}
              </Button>
            </div>
          </div>

          <div className="rounded-lg bg-muted p-4 text-sm">
            <p className="mb-1 font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" /> Security
            </p>
            <p className="text-muted-foreground">
              Granting access uses your current login and is the safest option. The test account is public and for demo only.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
