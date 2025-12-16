import { Shield, FileText, Home, AlertCircle, CreditCard, Menu, LogOut, History, MessageSquare } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { LanguageToggle } from "@/components/LanguageToggle";
import { PoweredByEIP } from "@/components/PoweredByEIP";
import refurbedLogo from "@/assets/refurbed-logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const navigation = [
  { name: "dashboard", href: "/customer", icon: Home },
  { name: "myPolicies", href: "/customer/policies", icon: Shield },
  { name: "myDocuments", href: "/customer/documents", icon: FileText },
  { name: "makeAClaim", href: "/customer/claim", icon: AlertCircle },
  { name: "claimHistory", href: "/customer/claims", icon: History },
  { name: "payments", href: "/customer/payments", icon: CreditCard },
  { name: "complaints", href: "/customer/complaints", icon: MessageSquare },
  { name: "serviceRequest", href: "/customer/support", icon: MessageSquare },
];

const routeLabels: Record<string, string> = {
  customer: "dashboard",
  policies: "myPolicies",
  documents: "myDocuments",
  claim: "makeAClaim",
  claims: "claimHistory",
  payments: "payments",
  complaints: "complaints",
  support: "serviceRequest",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { t } = useTranslation();

  const getBreadcrumbs = () => {
    const paths = location.pathname.split("/").filter(Boolean);
    const breadcrumbs = [];
    
    for (let i = 0; i < paths.length; i++) {
      const path = "/" + paths.slice(0, i + 1).join("/");
      const labelKey = routeLabels[paths[i]] || paths[i];
      breadcrumbs.push({ path, label: t(labelKey as any) });
    }
    
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  const NavLinks = () => (
    <>
      {navigation.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.name}
            to={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ease-in-out",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:translate-x-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
            onClick={() => setOpen(false)}
          >
            <Icon className="h-5 w-5" />
            {t(item.name as any)}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container flex h-16 items-center gap-4">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex h-16 items-center border-b px-6">
                <img src={refurbedLogo} alt="refurbed" className="h-6 w-auto" />
                <span className="ml-3 text-lg font-bold">{t("carePortal")}</span>
              </div>
              <nav className="flex flex-col gap-1 p-4">
                <NavLinks />
              </nav>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-3">
            <img src={refurbedLogo} alt="refurbed" className="h-6 w-auto" />
            <span className="text-lg font-bold">{t("carePortal")}</span>
          </div>

          <div className="ml-auto flex items-center gap-4">
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
                      {user?.user_metadata?.full_name || "User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t("signOut")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="container flex flex-1">
        {/* Sidebar */}
        <aside className="hidden w-64 shrink-0 border-r md:block sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto scroll-smooth scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
          <nav className="flex flex-col gap-1 p-4">
            <NavLinks />
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {breadcrumbs.length > 0 && (
            <Breadcrumb className="mb-4">
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => (
                  <div key={crumb.path} className="flex items-center">
                    <BreadcrumbItem>
                      {index === breadcrumbs.length - 1 ? (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link to={crumb.path}>{crumb.label}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                  </div>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          )}
          {children}
        </main>
      </div>

      {/* Footer */}
      <PoweredByEIP />
    </div>
  );
}