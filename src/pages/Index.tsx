import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Users, Settings } from "lucide-react";
import { AdminReAuthDialog } from "@/components/AdminReAuthDialog";
import { useAdminSession } from "@/hooks/useAdminSession";
import { useAuth } from "@/hooks/useAuth";
import { PoweredByEIP } from "@/components/PoweredByEIP";
import refurbedLogo from "@/assets/refurbed-logo.png";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdminSessionValid, checkAdminSession, createAdminSession } = useAdminSession();
  const [showReAuthDialog, setShowReAuthDialog] = useState(false);

  const handleSystemAdminClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // If not logged in at all, redirect to auth with admin session flag
    if (!user) {
      navigate("/auth", { state: { redirectTo: "/program-configuration", createAdminSession: true } });
      return;
    }

    // Check if admin session is still valid
    if (checkAdminSession()) {
      navigate("/program-configuration");
      return;
    }

    // Otherwise, show re-auth dialog
    setShowReAuthDialog(true);
  };

  const handleReAuthSuccess = () => {
    createAdminSession();
    navigate("/program-configuration");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col items-center justify-center bg-background p-4">
        <div className="mb-12 text-center">
          <img src={refurbedLogo} alt="refurbed" className="mx-auto mb-6 h-10" />
          <h1 className="mb-2 text-4xl font-bold text-foreground">Care Portal</h1>
          <p className="text-lg text-muted-foreground">Who are you logging in as?</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 md:gap-8">
          <Link to="/auth">
            <Card className="cursor-pointer transition-all hover:scale-105 hover:shadow-lg border-border">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">I'm a Customer</CardTitle>
                <CardDescription className="text-base">
                  Login to manage your warranties, submit claims, and track your policies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" size="lg">
                  Customer Login
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link to="/retail/auth">
            <Card className="cursor-pointer transition-all hover:scale-105 hover:shadow-lg border-border">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
                  <ShoppingBag className="h-8 w-8 text-secondary" />
                </div>
                <CardTitle className="text-2xl">refurbed BackOffice</CardTitle>
                <CardDescription className="text-base">
                  Login to sell warranties, manage policies, and process claims
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" size="lg" variant="outline">
                  BackOffice Login
                </Button>
              </CardContent>
            </Card>
          </Link>

          <div onClick={handleSystemAdminClick} className="cursor-pointer">
            <Card className="cursor-pointer transition-all hover:scale-105 hover:shadow-lg h-full border-border">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Settings className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle className="text-2xl">Program Configuration</CardTitle>
                <CardDescription className="text-base">
                  Configure programs, products, and deployment settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" size="lg" variant="secondary">
                  System Admin Portal
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <AdminReAuthDialog
          open={showReAuthDialog}
          onOpenChange={setShowReAuthDialog}
          onSuccess={handleReAuthSuccess}
        />
      </div>
      
      <PoweredByEIP />
    </div>
  );
};

export default Index;
