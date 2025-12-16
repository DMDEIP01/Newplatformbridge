import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { PasswordChangeDialog } from "@/components/PasswordChangeDialog";
import { LanguageToggle } from "@/components/LanguageToggle";
import { PoweredByEIP } from "@/components/PoweredByEIP";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import refurbedLogo from "@/assets/refurbed-logo.png";
import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  AlertCircle,
  BarChart3,
  LogOut,
  Users,
  Search,
  Headphones,
  ClipboardList,
  Gavel,
  Wrench,
  RefreshCw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function RetailLayout() {
  const { user, signOut } = useAuth();
  const { isAdmin, isConsultant, isRetailAgent, isClaimsAgent, isComplaintsAgent, isRepairerAgent, isCommercialAgent, isBackofficeAgent } = useRole();
  const { t } = useTranslation();
  const location = useLocation();
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPasswordChangeRequired();
  }, []);

  const checkPasswordChangeRequired = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("must_change_password")
        .eq("id", user.id)
        .single();

      if (data?.must_change_password) {
        setMustChangePassword(true);
      }
    }
    setLoading(false);
  };

  const handlePasswordChanged = () => {
    setMustChangePassword(false);
  };

  // Define all nav items with role-based visibility
  const allNavItems = [
    { to: "/retail/dashboard", icon: LayoutDashboard, label: t("dashboard"), roles: ["admin", "retail_agent", "claims_agent", "complaints_agent", "repairer_agent", "commercial_agent", "backoffice_agent"] },
    { to: "/retail/sales", icon: ShoppingCart, label: t("newSale"), roles: ["admin", "retail_agent"] },
    { to: "/retail/policy-search", icon: Search, label: t("policySearch"), roles: ["admin", "retail_agent", "claims_agent", "complaints_agent"] },
    { to: "/retail/make-claim", icon: FileText, label: t("makeAClaim"), roles: ["admin", "retail_agent", "claims_agent"] },
    { to: "/retail/claims", icon: AlertCircle, label: t("claims"), roles: ["admin", "retail_agent", "claims_agent"] },
    { to: "/retail/claims-management", icon: Gavel, label: t("claimsManagement"), roles: ["admin", "claims_agent", "complaints_agent"] },
    { to: "/retail/complaints", icon: ClipboardList, label: t("createComplaint"), roles: ["admin", "retail_agent", "claims_agent"] },
    { to: "/retail/complaints-management", icon: ClipboardList, label: t("complaintsManagement"), roles: ["admin", "complaints_agent"] },
    { to: "/retail/repairer-jobs", icon: Wrench, label: t("myRepairJobs"), roles: ["admin", "repairer_agent"] },
    { to: "/retail/trade-in-costs", icon: RefreshCw, label: "Trade-In Costs", roles: ["admin", "repairer_agent"] },
    { to: "/retail/service-request", icon: Headphones, label: t("serviceRequest"), roles: ["admin", "retail_agent", "claims_agent", "commercial_agent", "backoffice_agent"] },
    { to: "/retail/reports", icon: BarChart3, label: t("reports"), roles: ["admin", "retail_agent", "consultant"] },
    { to: "/retail/consultants", icon: Users, label: t("consultants"), roles: ["admin"] },
  ];

  // Filter nav items based on user's role
  const navItems = allNavItems.filter((item) => {
    if (isAdmin) return true;
    if (isConsultant && item.roles.includes("consultant")) return true;
    if (isRetailAgent && item.roles.includes("retail_agent")) return true;
    if (isClaimsAgent && item.roles.includes("claims_agent")) return true;
    if (isComplaintsAgent && item.roles.includes("complaints_agent")) return true;
    if (isRepairerAgent && item.roles.includes("repairer_agent")) return true;
    if (isCommercialAgent && item.roles.includes("commercial_agent")) return true;
    if (isBackofficeAgent && item.roles.includes("backoffice_agent")) return true;
    return false;
  });

  return (
    <div className="flex min-h-screen flex-col">
      <PasswordChangeDialog 
        open={mustChangePassword} 
        onPasswordChanged={handlePasswordChanged}
      />
      
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/retail/dashboard" className="flex items-center space-x-3">
            <img src={refurbedLogo} alt="refurbed" className="h-6" />
            <span className="text-sm font-medium text-muted-foreground">{t("retailPortal")}</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
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
                      {user?.user_metadata?.full_name || "Retail User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut("/")} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t("signOut")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="w-64 border-r bg-muted/30">
          <nav className="space-y-1 p-4">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                activeClassName="bg-primary text-primary-foreground"
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>

      {/* Footer */}
      <PoweredByEIP />
    </div>
  );
}