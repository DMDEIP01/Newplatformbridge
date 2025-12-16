import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Database, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SeedData() {
  const [loading, setLoading] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const navigate = useNavigate();

  const handleSeedData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("You must be logged in to seed data");
        return;
      }

      const { data, error } = await supabase.functions.invoke("seed-demo-data", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast.success("Demo data created successfully!");
      setSeeded(true);
      
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error("Error seeding data:", error);
      }
      toast.error(error.message || "Failed to create demo data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Database className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle>Load Demo Data</CardTitle>
          <CardDescription>
            Create sample policies, claims, and payments to explore the portal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!seeded ? (
            <>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>This will create:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>2 active insurance policies</li>
                  <li>1 sample claim in progress</li>
                  <li>Multiple payment records</li>
                  <li>Covered items and claim history</li>
                </ul>
              </div>
              <Button 
                onClick={handleSeedData} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Demo Data...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Load Demo Data
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate("/")}
                className="w-full"
              >
                Skip for Now
              </Button>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-3 bg-success/10 rounded-full">
                  <CheckCircle className="h-12 w-12 text-success" />
                </div>
              </div>
              <div>
                <p className="font-semibold text-lg">Demo Data Created!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Redirecting to dashboard...
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
