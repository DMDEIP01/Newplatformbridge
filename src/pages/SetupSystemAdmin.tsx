import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, ArrowLeft } from "lucide-react";

export default function SetupSystemAdmin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleGrantSystemAdmin = async () => {
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('grant-system-admin');

      if (error) {
        console.error("Error granting system admin:", error);
        toast.error("Failed to grant system admin access");
      } else if (data?.success) {
        toast.success("System admin access granted! Redirecting...");
        setTimeout(() => {
          navigate("/program-configuration");
        }, 1500);
      } else {
        toast.error("Failed to grant system admin access");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <Button
        variant="ghost"
        onClick={() => navigate("/")}
        className="absolute top-4 left-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Home
      </Button>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Setup System Admin</CardTitle>
          <CardDescription>
            Grant yourself system administrator access to configure programs and manage the entire system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user ? (
            <>
              <div className="rounded-lg border bg-muted/50 p-4 text-sm">
                <p className="font-medium mb-2">What you'll get access to:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Create and manage programs</li>
                  <li>Assign products to programs</li>
                  <li>Configure data isolation settings</li>
                  <li>Manage system-wide settings</li>
                  <li>Oversee all programs and users</li>
                </ul>
              </div>

              <Button 
                onClick={handleGrantSystemAdmin} 
                disabled={loading}
                className="w-full"
                size="lg"
              >
                <Shield className="mr-2 h-4 w-4" />
                {loading ? "Granting Access..." : "Grant System Admin Access"}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                This will give you full system administrator privileges
              </p>
            </>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">Please log in first</p>
              <Button onClick={() => navigate("/auth")} className="w-full">
                Go to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
