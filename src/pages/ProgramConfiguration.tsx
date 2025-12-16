import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Settings2, Package, Smartphone, Users, Wrench, Building2, Clock, LogOut, Palette } from "lucide-react";
import { ProgramsList } from "@/components/programs/ProgramsList";
import { ProgramProductsManager } from "@/components/programs/ProgramProductsManager";
import { DevicesList } from "@/components/devices/DevicesList";
import { PromotionsManager } from "@/components/programs/PromotionsManager";
import { UserManagementTab } from "@/components/programs/UserManagementTab";
import { UserGroupsManager } from "@/components/programs/UserGroupsManager";
import { PerilsManager } from "@/components/programs/PerilsManager";
import { FulfillmentManager } from "@/components/programs/FulfillmentManager";
import { RepairersManager } from "@/components/programs/RepairersManager";
import { ClaimsSLAManager } from "@/components/programs/ClaimsSLAManager";
import { CommunicationsManager } from "@/components/programs/CommunicationsManager";
import { ReferenceFormatsManager } from "@/components/programs/ReferenceFormatsManager";
import { BrandingManager } from "@/components/programs/BrandingManager";
import { PoweredByEIP } from "@/components/PoweredByEIP";
import { useAuth } from "@/hooks/useAuth";
import { useAdminSession } from "@/hooks/useAdminSession";
import { AdminReAuthDialog } from "@/components/AdminReAuthDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function ProgramConfiguration() {
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();
  const { isAdminSessionValid, checkAdminSession, createAdminSession, clearAdminSession } = useAdminSession();
  const [activeTab, setActiveTab] = useState("programs");
  const [productSubTab, setProductSubTab] = useState("products");
  const [fulfillmentSubTab, setFulfillmentSubTab] = useState("repairers");
  const [accessControlSubTab, setAccessControlSubTab] = useState("groups");
  const [showReAuthDialog, setShowReAuthDialog] = useState(false);

  // Check admin session on mount and redirect if not valid
  useEffect(() => {
    // Wait for auth to load before checking
    if (loading) return;
    
    if (!user) {
      navigate("/auth", { state: { redirectTo: "/program-configuration", createAdminSession: true }, replace: true });
      return;
    }

    if (!checkAdminSession()) {
      setShowReAuthDialog(true);
    }
  }, [user, loading, navigate, checkAdminSession]);

  useEffect(() => {
    // Listen for device categories management request
    const handleOpenDeviceCategories = () => {
      setActiveTab("devices");
      // Small delay to ensure tab switch happens first
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('trigger-category-dialog'));
      }, 100);
    };

    window.addEventListener('open-device-categories', handleOpenDeviceCategories);
    return () => window.removeEventListener('open-device-categories', handleOpenDeviceCategories);
  }, []);

  const handleReAuthSuccess = () => {
    createAdminSession();
    setShowReAuthDialog(false);
  };

  const handleReAuthCancel = () => {
    setShowReAuthDialog(false);
    navigate("/");
  };

  const handleSignOut = () => {
    clearAdminSession();
    signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with User Profile */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
            <h1 className="text-xl font-bold text-foreground">Program Configuration</h1>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user?.email?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-background z-50" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.user_metadata?.full_name || "Admin User"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <p className="text-muted-foreground">
            Manage programs, products, and deployment settings
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-8 max-w-7xl">
            <TabsTrigger value="programs" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Programs
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="claims-sla" className="gap-2">
              <Clock className="h-4 w-4" />
              Claims SLA
            </TabsTrigger>
            <TabsTrigger value="reference-formats" className="gap-2">
              <Building2 className="h-4 w-4" />
              References
            </TabsTrigger>
            <TabsTrigger value="devices" className="gap-2">
              <Smartphone className="h-4 w-4" />
              Devices
            </TabsTrigger>
            <TabsTrigger value="fulfillment" className="gap-2">
              <Wrench className="h-4 w-4" />
              Fulfillment
            </TabsTrigger>
            <TabsTrigger value="access-control" className="gap-2">
              <Users className="h-4 w-4" />
              Access
            </TabsTrigger>
            <TabsTrigger value="branding" className="gap-2">
              <Palette className="h-4 w-4" />
              Branding
            </TabsTrigger>
          </TabsList>

          <TabsContent value="programs" className="space-y-6">
            <ProgramsList />
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <Tabs value={productSubTab} onValueChange={setProductSubTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 max-w-2xl">
                <TabsTrigger value="products">Products</TabsTrigger>
                <TabsTrigger value="perils">Perils</TabsTrigger>
                <TabsTrigger value="promotions">Promotions</TabsTrigger>
                <TabsTrigger value="communications">Communications</TabsTrigger>
              </TabsList>

              <TabsContent value="products">
                <ProgramProductsManager />
              </TabsContent>

              <TabsContent value="perils">
                <PerilsManager />
              </TabsContent>

              <TabsContent value="promotions">
                <PromotionsManager />
              </TabsContent>

              <TabsContent value="communications">
                <CommunicationsManager />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="claims-sla" className="space-y-6">
            <ClaimsSLAManager />
          </TabsContent>

          <TabsContent value="reference-formats" className="space-y-6">
            <ReferenceFormatsManager />
          </TabsContent>

          <TabsContent value="devices" className="space-y-6">
            <DevicesList />
          </TabsContent>

          <TabsContent value="fulfillment" className="space-y-6">
            <Tabs value={fulfillmentSubTab} onValueChange={setFulfillmentSubTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="repairers">Repairers</TabsTrigger>
                <TabsTrigger value="routes">Fulfillment Route Manager</TabsTrigger>
              </TabsList>

              <TabsContent value="repairers">
                <RepairersManager />
              </TabsContent>

              <TabsContent value="routes">
                <FulfillmentManager />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="access-control" className="space-y-6">
            <Tabs value={accessControlSubTab} onValueChange={setAccessControlSubTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="groups">User Groups</TabsTrigger>
                <TabsTrigger value="users">User Management</TabsTrigger>
              </TabsList>

              <TabsContent value="groups">
                <UserGroupsManager />
              </TabsContent>

              <TabsContent value="users">
                <UserManagementTab />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="branding" className="space-y-6">
            <BrandingManager />
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <PoweredByEIP />

      <AdminReAuthDialog
        open={showReAuthDialog}
        onOpenChange={(open) => {
          if (!open) handleReAuthCancel();
        }}
        onSuccess={handleReAuthSuccess}
      />
    </div>
  );
}
