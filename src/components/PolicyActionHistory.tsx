import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowUpCircle, FileText, CreditCard, XCircle, RefreshCw, Clock, Activity, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PolicyAction {
  id: string;
  action_type: string;
  action_description: string;
  old_value: any;
  new_value: any;
  metadata: any;
  created_at: string;
}

interface PolicyActionHistoryProps {
  policyId: string;
}

export function PolicyActionHistory({ policyId }: PolicyActionHistoryProps) {
  const [actions, setActions] = useState<PolicyAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (policyId) {
      fetchActionHistory();
    }
  }, [policyId]);

  const fetchActionHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("policy_action_history")
        .select("*")
        .eq("policy_id", policyId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setActions(data || []);
    } catch (error) {
      console.error("Error fetching policy action history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case "upgrade":
        return <ArrowUpCircle className="h-4 w-4 text-success" />;
      case "documents_issued":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "premium_change":
        return <CreditCard className="h-4 w-4 text-primary" />;
      case "cancellation":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "renewal":
        return <RefreshCw className="h-4 w-4 text-success" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActionBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      upgrade: "default",
      documents_issued: "secondary",
      premium_change: "outline",
      cancellation: "destructive",
      renewal: "default",
    };

    return (
      <Badge variant={variants[type] || "outline"} className="capitalize">
        {type.replace(/_/g, " ")}
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

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-secondary/50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Policy Action History
                  {actions.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {actions.length}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  {actions.length === 0 
                    ? "No actions recorded yet" 
                    : `${actions.length} action${actions.length === 1 ? "" : "s"} recorded`}
                </CardDescription>
              </div>
              {isOpen ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            {actions.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">
                No actions recorded yet
              </div>
            ) : (
              <div className="space-y-4">
                {actions.map((action) => (
                  <div
                    key={action.id}
                    className="flex flex-col gap-2 p-4 border rounded-lg hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getActionIcon(action.action_type)}
                        <div>
                          <div className="font-medium">{action.action_description}</div>
                        </div>
                      </div>
                      {getActionBadge(action.action_type)}
                    </div>

                    {action.metadata && Object.keys(action.metadata).length > 0 && (
                      <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                        {action.metadata.old_product && action.metadata.new_product && (
                          <div className="flex items-center gap-2">
                            <span>{action.metadata.old_product}</span>
                            <span>→</span>
                            <span className="font-medium">{action.metadata.new_product}</span>
                          </div>
                        )}
                        {action.metadata.old_premium !== undefined && action.metadata.new_premium !== undefined && (
                          <div className="flex items-center gap-4 mt-1">
                            <span>€{action.metadata.old_premium}/mo → €{action.metadata.new_premium}/mo</span>
                            {action.metadata.premium_difference !== undefined && (
                              <span className={action.metadata.premium_difference > 0 ? "text-warning" : "text-success"}>
                                ({action.metadata.premium_difference > 0 ? "+" : ""}€{action.metadata.premium_difference.toFixed(2)}/mo)
                              </span>
                            )}
                          </div>
                        )}
                        {action.metadata.documents && (
                          <div className="mt-1">
                            Documents: {action.metadata.documents.join(", ")}
                          </div>
                        )}
                        {action.metadata.reason && (
                          <div className="mt-1">Reason: {action.metadata.reason}</div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(action.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
