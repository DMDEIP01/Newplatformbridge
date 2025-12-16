import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { Loader2 } from "lucide-react";

export default function RetailProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isConsultant, isRetailAgent, isClaimsAgent, isComplaintsAgent, isCommercialAgent, isBackofficeAgent, loading: roleLoading } = useRole();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (authLoading || roleLoading) return;

    const onAuthPath = location.pathname.startsWith("/retail/auth");
    let nextPath: string | null = null;

    if (!user) {
      if (!onAuthPath) nextPath = "/retail/auth";
    } else if (!(isAdmin || isConsultant || isRetailAgent || isClaimsAgent || isComplaintsAgent || isCommercialAgent || isBackofficeAgent)) {
      if (!onAuthPath) nextPath = "/retail/auth";
    } else {
      if (onAuthPath) nextPath = "/retail/dashboard";
    }

    if (nextPath && nextPath !== location.pathname) {
      navigate(nextPath, { replace: true });
    }
  }, [user, isAdmin, isConsultant, isRetailAgent, isClaimsAgent, isComplaintsAgent, isCommercialAgent, isBackofficeAgent, authLoading, roleLoading, navigate, location.pathname]);

  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !(isAdmin || isConsultant || isRetailAgent || isClaimsAgent || isComplaintsAgent || isCommercialAgent || isBackofficeAgent)) {
    return null;
  }

  return <>{children}</>;
}
