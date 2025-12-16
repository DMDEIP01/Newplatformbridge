import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";
import { useUserPrograms } from "@/hooks/useUserPrograms";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ShoppingCart, FileText, AlertCircle, TrendingUp, Clock, CheckCircle } from "lucide-react";

export default function RetailDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isRepairerAgent } = useRole();
  const { programIds, loading: programsLoading } = useUserPrograms();
  const [stats, setStats] = useState({
    totalPolicies: 0,
    activePolicies: 0,
    pendingClaims: 0,
    monthlyRevenue: 0,
  });
  const [repairerStats, setRepairerStats] = useState({
    totalClaims: 0,
    claimsOutOfSla: 0,
    pendingApprovalClaims: 0,
    monthlyQuoteRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!programsLoading) {
      if (isRepairerAgent) {
        fetchRepairerStats();
      } else {
        fetchStats();
      }
    }
  }, [programsLoading, programIds, isRepairerAgent, user]);

  const fetchRepairerStats = async () => {
    try {
      // Get the user's repairer_id
      const { data: profileData } = await supabase
        .from("profiles")
        .select("repairer_id")
        .eq("id", user?.id)
        .single();

      if (!profileData?.repairer_id) {
        setLoading(false);
        return;
      }

      // Fetch all fulfillment jobs for this repairer
      const { data: jobs } = await supabase
        .from("claim_fulfillment")
        .select("*, claims(status, submitted_date)")
        .eq("repairer_id", profileData.repairer_id);

      const fulfillmentJobs = jobs || [];
      const fulfillmentIds = fulfillmentJobs.map(job => job.id);

      // Fetch repair costs for this repairer's jobs
      let totalRepairCosts = 0;
      if (fulfillmentIds.length > 0) {
        const { data: costs } = await supabase
          .from("repair_costs")
          .select("amount, created_at, fulfillment_id")
          .in("fulfillment_id", fulfillmentIds);

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Sum costs from this month
        totalRepairCosts = (costs || [])
          .filter(cost => new Date(cost.created_at) >= startOfMonth)
          .reduce((sum, cost) => sum + Number(cost.amount || 0), 0);
      }

      // Calculate stats
      const totalClaims = fulfillmentJobs.length;

      // Claims out of SLA - jobs older than 48 hours that are still in progress
      const now = new Date();
      const claimsOutOfSla = fulfillmentJobs.filter(job => {
        if (['completed', 'closed', 'repaired', 'ber'].includes(job.status)) return false;
        const createdAt = new Date(job.created_at);
        const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        return hoursDiff > 48;
      }).length;

      // Pending approval claims - jobs with quote_status = 'pending'
      const pendingApprovalClaims = fulfillmentJobs.filter(
        job => job.quote_status === 'pending' || job.status === 'awaiting_quote_approval'
      ).length;

      // Monthly revenue - sum of quote_amount plus repair costs for this month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyQuoteRevenue = fulfillmentJobs
        .filter(job => new Date(job.created_at) >= startOfMonth && job.quote_amount)
        .reduce((sum, job) => sum + (job.quote_amount || 0), 0);

      setRepairerStats({
        totalClaims,
        claimsOutOfSla,
        pendingApprovalClaims,
        monthlyQuoteRevenue: monthlyQuoteRevenue + totalRepairCosts,
      });
    } catch (error) {
      console.error("Error fetching repairer stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const policiesReq = supabase.from("policies").select("id, status, product_id");
      if (programIds.length > 0) {
        policiesReq.in("program_id", programIds);
      }

      const claimsReq = supabase
        .from("claims")
        .select("id, status, policies!inner(program_id)");
      if (programIds.length > 0) {
        claimsReq.in("policies.program_id", programIds);
      }

      const [policiesRes, claimsRes] = await Promise.all([
        policiesReq,
        claimsReq,
      ]);

      const policies = policiesRes.data || [];
      const claims = claimsRes.data || [];

      setStats({
        totalPolicies: policies.length,
        activePolicies: policies.filter((p) => p.status === "active").length,
        pendingClaims: claims.filter((c) => c.status === "notified").length,
        monthlyRevenue: 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Repairer Dashboard
  if (isRepairerAgent) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("dashboard")}</h1>
          <p className="text-muted-foreground">Overview of your repair operations</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Claims</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{repairerStats.totalClaims}</div>
              <p className="text-xs text-muted-foreground">All assigned claims</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out of SLA</CardTitle>
              <Clock className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{repairerStats.claimsOutOfSla}</div>
              <p className="text-xs text-muted-foreground">Active claims &gt; 48 hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{repairerStats.pendingApprovalClaims}</div>
              <p className="text-xs text-muted-foreground">Quotes awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("monthlyRevenue")}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{repairerStats.monthlyQuoteRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Quotes submitted this month</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Default Retail Dashboard
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("dashboard")}</h1>
        <p className="text-muted-foreground">Overview of your retail operations</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalPolicies")}</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPolicies}</div>
            <p className="text-xs text-muted-foreground">All time policies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("activePolicies")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activePolicies}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("pendingClaims")}</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingClaims}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("monthlyRevenue")}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.monthlyRevenue}</div>
            <p className="text-xs text-muted-foreground">{t("thisMonth")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
