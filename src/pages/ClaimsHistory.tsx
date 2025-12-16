import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { AlertCircle, CheckCircle, Clock, XCircle, FileText, ChevronRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslation } from "@/hooks/useTranslation";
import { formatStatus } from "@/lib/utils";

interface Claim {
  id: string;
  claim_number: string;
  claim_type: "breakdown" | "damage" | "theft";
  description: string;
  status: string;
  decision: string | null;
  decision_reason: string | null;
  submitted_date: string;
  has_receipt: boolean;
  product_condition?: string;
  policies: {
    policy_number: string;
    products: {
      name: string;
      type: string;
      excess_1: number;
    };
  };
}

export default function ClaimsHistory() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  const statusConfig = {
    notified: { label: t("underReview"), color: "bg-blue-500", icon: Clock },
    approved: { label: t("approved"), color: "bg-success", icon: CheckCircle },
    rejected: { label: t("rejected"), color: "bg-destructive", icon: XCircle },
    paid: { label: t("paid"), color: "bg-success", icon: CheckCircle },
  };

  const decisionConfig = {
    accepted: { label: t("accepted"), color: "success" },
    rejected: { label: t("rejected"), color: "destructive" },
    referred: { label: t("referredForReview"), color: "warning" },
  };

  const claimTypeLabels = {
    breakdown: t("breakdownMalfunction"),
    damage: t("accidentalDamage"),
    theft: t("theftLoss"),
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First get user's policies, then get claims for those policies
      const { data: userPolicies } = await supabase
        .from("policies")
        .select("id")
        .eq("user_id", user.id);

      if (!userPolicies || userPolicies.length === 0) {
        setClaims([]);
        return;
      }

      const policyIds = userPolicies.map(p => p.id);

      // Query claims only for user's own policies
      const { data, error } = await supabase
        .from("claims")
        .select(`
          id,
          claim_number,
          claim_type,
          description,
          status,
          decision,
          decision_reason,
          submitted_date,
          has_receipt,
          product_condition,
          policies!inner (
            policy_number,
            products!inner (
              name,
              type,
              excess_1
            )
          )
        `)
        .in("policy_id", policyIds)
        .order("submitted_date", { ascending: false });

      if (error) throw error;
      setClaims(data || []);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching claims:", error);
      }
      toast.error("Failed to load claims history");
    } finally {
      setLoading(false);
    }
  };

  const handleClaimClick = (claimId: string) => {
    navigate(`/customer/claim/${claimId}`);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{t("claimsHistory")}</h1>
          <p className="text-muted-foreground mt-1">{t("loadingYourClaims")}</p>
        </div>
      </div>
    );
  }

  if (claims.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{t("claimsHistory")}</h1>
          <p className="text-muted-foreground mt-1">{t("claimHistory")}</p>
        </div>
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            {t("noClaimsDescription")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Claims History</h1>
        <p className="text-muted-foreground mt-1">
          View all your submitted claims and their current status
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Claims</CardTitle>
          <CardDescription>
            {claims.length} {claims.length === 1 ? "claim" : "claims"} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim Number</TableHead>
                  <TableHead>Policy</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Decision</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.map((claim) => {
                  const statusInfo = statusConfig[claim.status as keyof typeof statusConfig];
                  const StatusIcon = statusInfo?.icon || AlertCircle;
                  
                  return (
                    <TableRow 
                      key={claim.id} 
                      className="hover:bg-secondary/50 cursor-pointer transition-colors"
                      onClick={() => handleClaimClick(claim.id)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span>{claim.claim_number}</span>
                            {claim.decision_reason && (
                              <span className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                {claim.decision_reason}
                              </span>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{claim.policies.policy_number}</span>
                          <span className="text-xs text-muted-foreground">
                            {claim.policies.products.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {claimTypeLabels[claim.claim_type]}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`h-4 w-4 ${statusInfo?.color ? `text-${statusInfo.color}` : ""}`} />
                          <span className="text-sm">
                            {statusInfo?.label || claim.status}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {claim.decision ? (
                          <Badge 
                            variant={
                              claim.decision === "accepted" ? "default" :
                              claim.decision === "rejected" ? "destructive" :
                              "secondary"
                            }
                          >
                            {decisionConfig[claim.decision as keyof typeof decisionConfig]?.label || claim.decision}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Pending</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(claim.submitted_date), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        {claim.has_receipt ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
