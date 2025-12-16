import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Program {
  id: string;
  name: string;
  description: string | null;
  data_isolation_enabled: boolean;
}

export function useUserPrograms() {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPrograms([]);
      setLoading(false);
      return;
    }

    async function fetchUserPrograms() {
      try {
        // Get programs from direct user permissions
        const { data: userPermissions } = await supabase
          .from("user_program_permissions")
          .select("program_id, programs(id, name, description, data_isolation_enabled)")
          .eq("user_id", user.id);

        // Get programs from user group permissions
        const { data: groupMembers } = await supabase
          .from("user_group_members")
          .select("group_id")
          .eq("user_id", user.id);

        const groupIds = groupMembers?.map(gm => gm.group_id) || [];
        
        let groupPermissions: any[] = [];
        if (groupIds.length > 0) {
          const { data } = await supabase
            .from("user_group_permissions")
            .select("program_id, programs(id, name, description, data_isolation_enabled)")
            .in("group_id", groupIds);
          groupPermissions = data || [];
        }

        // Combine and deduplicate programs
        const allProgramData = [
          ...(userPermissions || []),
          ...groupPermissions
        ];

        const uniquePrograms = Array.from(
          new Map(
            allProgramData
              .filter(p => p.programs)
              .map(p => [p.programs.id, p.programs])
          ).values()
        ) as Program[];

        setPrograms(uniquePrograms);
      } catch (error) {
        console.error("Error fetching user programs:", error);
        setPrograms([]);
      } finally {
        setLoading(false);
      }
    }

    fetchUserPrograms();
  }, [user]);

  const programIds = useMemo(() => programs.map(p => p.id), [programs]);
  const hasDataIsolation = useMemo(() => programs.some(p => p.data_isolation_enabled), [programs]);

  return useMemo(() => ({
    programs,
    programIds,
    hasDataIsolation,
    loading,
  }), [programs, programIds, hasDataIsolation, loading]);
}
