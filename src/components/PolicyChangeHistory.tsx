import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpCircle, ArrowDownCircle, Minus, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PolicyChange {
  id: string;
  changed_at: string;
  change_type: "upgrade" | "downgrade" | "switch";
  reason: string | null;
  old_premium: number;
  new_premium: number;
  premium_difference: number;
  old_product: {
    name: string;
    type: string;
  };
  new_product: {
    name: string;
    type: string;
  };
  policies: {
    policy_number: string;
  };
}

export function PolicyChangeHistory() {
  const { user } = useAuth();
  const [changes, setChanges] = useState<PolicyChange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchChangeHistory();
    }
  }, [user]);

  const fetchChangeHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("policy_change_history")
        .select(`
          id,
          changed_at,
          change_type,
          reason,
          old_premium,
          new_premium,
          premium_difference,
          old_product:products!policy_change_history_old_product_id_fkey(name, type),
          new_product:products!policy_change_history_new_product_id_fkey(name, type),
          policies!policy_change_history_policy_id_fkey(policy_number)
        `)
        .eq("user_id", user?.id)
        .order("changed_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setChanges(data as any || []);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching policy change history:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const getChangeIcon = (type: string) => {
    switch (type) {
      case "upgrade":
        return <ArrowUpCircle className="h-4 w-4 text-success" />;
      case "downgrade":
        return <ArrowDownCircle className="h-4 w-4 text-warning" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getChangeBadge = (type: string) => {
    const variants = {
      upgrade: "default",
      downgrade: "secondary",
      switch: "outline",
    } as const;

    return (
      <Badge variant={variants[type as keyof typeof variants] || "outline"}>
        {type}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading history...</div>
        </CardContent>
      </Card>
    );
  }

  if (changes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Policy Change History
          </CardTitle>
          <CardDescription>Track your policy switches and changes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">
            No policy changes yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Policy Change History
        </CardTitle>
        <CardDescription>Your recent policy switches and changes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {changes.map((change) => (
            <div
              key={change.id}
              className="flex flex-col gap-3 p-4 border rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {getChangeIcon(change.change_type)}
                  <div>
                    <div className="font-medium">
                      {change.old_product.name} → {change.new_product.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Policy: {change.policies.policy_number}
                    </div>
                  </div>
                </div>
                {getChangeBadge(change.change_type)}
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Old: </span>
                  <span className="font-medium">£{change.old_premium}/mo</span>
                </div>
                <div>
                  <span className="text-muted-foreground">New: </span>
                  <span className="font-medium">£{change.new_premium}/mo</span>
                </div>
                <div>
                  <span className={change.premium_difference > 0 ? "text-warning" : "text-success"}>
                    {change.premium_difference > 0 ? "+" : ""}£{change.premium_difference.toFixed(2)}/mo
                  </span>
                </div>
              </div>

              {change.reason && (
                <div className="text-sm bg-muted/50 p-3 rounded">
                  <div className="font-medium text-muted-foreground mb-1">Reason:</div>
                  <div>{change.reason}</div>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDate(change.changed_at)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
