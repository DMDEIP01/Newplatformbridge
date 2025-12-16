import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

type AppRole = "admin" | "consultant" | "customer" | "retail_agent" | "claims_agent" | "complaints_agent" | "repairer_agent" | "system_admin" | "commercial_agent" | "backoffice_agent";

export const useRole = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      if (!user) {
        setRoles([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (!error && data) {
        setRoles(data.map((r) => r.role as AppRole));
      }
      setLoading(false);
    };

    fetchRoles();
  }, [user]);

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = hasRole("admin");
  const isConsultant = hasRole("consultant");
  const isCustomer = hasRole("customer");
  const isRetailAgent = hasRole("retail_agent");
  const isClaimsAgent = hasRole("claims_agent");
  const isComplaintsAgent = hasRole("complaints_agent");
  const isRepairerAgent = hasRole("repairer_agent");
  const isSystemAdmin = hasRole("system_admin");
  const isCommercialAgent = hasRole("commercial_agent");
  const isBackofficeAgent = hasRole("backoffice_agent");

  return {
    roles,
    loading,
    hasRole,
    isAdmin,
    isConsultant,
    isCustomer,
    isRetailAgent,
    isClaimsAgent,
    isComplaintsAgent,
    isRepairerAgent,
    isSystemAdmin,
    isCommercialAgent,
    isBackofficeAgent,
  };
};
