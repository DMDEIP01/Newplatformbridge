import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Users, CheckCircle, AlertCircle } from "lucide-react";

export default function SeedRetailData() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const seedData = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("You must be logged in");
        return;
      }

      const response = await supabase.functions.invoke("seed-retail-data", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;

      setResult({
        success: true,
        message: response.data.message || "Mock data created successfully!",
      });
      toast.success("Mock data created!");
    } catch (error: any) {
      console.error("Error seeding data:", error);
      setResult({
        success: false,
        message: error.message || "Failed to seed data",
      });
      toast.error("Failed to create mock data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Seed Retail Portal Data</h1>
        <p className="text-muted-foreground mt-1">
          Create mock customer accounts for testing the retail portal
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Generate Mock Customers
          </CardTitle>
          <CardDescription>
            Creates mock customer accounts, repairer companies, and retail agents for testing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong className="block mb-2">This will create:</strong>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>6 retail agents (retail, claims, complaints agents & admin)</li>
                <li>5 repairer companies with user accounts</li>
                <li>5 mock customer accounts</li>
                <li>1-2 active policies per customer</li>
                <li>Covered devices on each policy</li>
                <li>Random claims (30% chance per policy)</li>
                <li>Complete profile information for all users</li>
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                All customers use password: <code className="bg-secondary px-1 py-0.5 rounded">Test123456!</code>
              </p>
            </AlertDescription>
          </Alert>

          {result && (
            <Alert className={result.success ? "border-success bg-success/10" : "border-destructive bg-destructive/10"}>
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}

          <div className="bg-secondary/30 p-4 rounded-lg">
            <p className="text-sm font-semibold mb-2">Sample Customer Emails:</p>
            <ul className="text-xs space-y-1 text-muted-foreground font-mono">
              <li>• john.smith@email.com</li>
              <li>• mary.johnson@email.com</li>
              <li>• james.williams@email.com</li>
              <li>• sarah.brown@email.com</li>
              <li>• michael.davis@email.com</li>
            </ul>
          </div>

          <Button 
            onClick={seedData} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Mock Data...
              </>
            ) : (
              <>
                <Users className="mr-2 h-4 w-4" />
                Generate Mock Customers
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            You can run this multiple times. Existing customers will be skipped.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
