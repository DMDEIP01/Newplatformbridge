import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { format, startOfWeek, endOfWeek, subWeeks, isWithinInterval } from "date-fns";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function RetailReports() {
  const { isConsultant, isAdmin, isRetailAgent } = useRole();
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  const isAgentView = (isConsultant || isRetailAgent) && !isAdmin;

  useEffect(() => {
    const fetchWeeklyData = async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setCurrentUserId(user.id);

      // Get last 8 weeks
      const weeks = [];
      const today = new Date();
      for (let i = 0; i < 8; i++) {
        const weekStart = startOfWeek(subWeeks(today, i), { weekStartsOn: 1 }); // Monday
        const weekEnd = endOfWeek(subWeeks(today, i), { weekStartsOn: 1 }); // Sunday
        weeks.push({
          start: weekStart,
          end: weekEnd,
          label: `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`,
        });
      }

      // Build policies query - include cancelled_at for cancellations tracking
      let policiesQuery = supabase
        .from("policies")
        .select(`
          id,
          consultant_id,
          created_at,
          status,
          cancelled_at,
          products (monthly_premium)
        `)
        .not("consultant_id", "is", null);

      // If consultant or retail agent, filter by their own ID
      if (isAgentView) {
        policiesQuery = policiesQuery.eq("consultant_id", user.id);
      }

      const { data: policies, error: policiesError } = await policiesQuery;

      if (policiesError) {
        console.error("Error fetching policies:", policiesError);
        setLoading(false);
        return;
      }

      if (!policies || policies.length === 0) {
        setLoading(false);
        return;
      }

      // Get policy IDs for claims and complaints
      const policyIds = policies.map(p => p.id);

      // Fetch claims for these policies
      const { data: claims } = await supabase
        .from("claims")
        .select("id, policy_id, submitted_date")
        .in("policy_id", policyIds);

      // Fetch complaints for these policies
      const { data: complaints } = await supabase
        .from("complaints")
        .select("id, policy_id, created_at")
        .in("policy_id", policyIds);

      // Fetch cancellations (policies with cancelled status)
      const cancellations = policies.filter(p => p.status === "cancelled");

      // Group data by week
      const weeklyBreakdown = weeks.map(week => {
        const weekPolicies = policies.filter(p => {
          const createdDate = new Date(p.created_at);
          return isWithinInterval(createdDate, { start: week.start, end: week.end });
        });

        const weekClaims = claims?.filter(c => {
          const policy = policies.find(p => p.id === c.policy_id);
          if (!policy) return false;
          const claimDate = new Date(c.submitted_date);
          return isWithinInterval(claimDate, { start: week.start, end: week.end });
        }) || [];

        const weekComplaints = complaints?.filter(c => {
          const policy = policies.find(p => p.id === c.policy_id);
          if (!policy) return false;
          const complaintDate = new Date(c.created_at);
          return isWithinInterval(complaintDate, { start: week.start, end: week.end });
        }) || [];

        const weekCancellations = cancellations.filter(p => {
          if (!p.cancelled_at) return false;
          const cancelDate = new Date(p.cancelled_at);
          return isWithinInterval(cancelDate, { start: week.start, end: week.end });
        });

        const totalPremium = weekPolicies.reduce(
          (sum, p) => sum + (p.products?.monthly_premium || 0),
          0
        );

        return {
          week: format(week.start, "MMM d"),
          fullWeek: `${format(week.start, "MMM d")} - ${format(week.end, "MMM d, yyyy")}`,
          policies: weekPolicies.length,
          claims: weekClaims.length,
          complaints: weekComplaints.length,
          cancellations: weekCancellations.length,
          premium: totalPremium,
        };
      });

      setWeeklyData(weeklyBreakdown.reverse()); // Show oldest to newest for charts
      setLoading(false);
    };

    fetchWeeklyData();
  }, [isConsultant, isAdmin, isRetailAgent]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sales Reports</h1>
        <p className="text-muted-foreground">
          {isAgentView ? "Your weekly performance metrics" : "Weekly performance metrics"}
        </p>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales & Cancellations Trend</CardTitle>
            <CardDescription>Policies sold vs cancelled per week</CardDescription>
          </CardHeader>
          <CardContent>
            {weeklyData.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="policies" 
                    stroke="hsl(var(--primary))" 
                    name="Policies Sold"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cancellations" 
                    stroke="hsl(var(--destructive))" 
                    name="Cancellations"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Premium Value Trend</CardTitle>
            <CardDescription>Monthly premium value generated per week</CardDescription>
          </CardHeader>
          <CardContent>
            {weeklyData.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => `€${value.toFixed(2)}/mo`}
                  />
                  <Legend />
                  <Bar 
                    dataKey="premium" 
                    fill="hsl(var(--primary))" 
                    name="Premium Value"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Claims and Complaints Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Claims & Complaints Overview</CardTitle>
          <CardDescription>Weekly claims and complaints activity</CardDescription>
        </CardHeader>
        <CardContent>
          {weeklyData.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar 
                  dataKey="claims" 
                  fill="hsl(var(--chart-1))" 
                  name="Claims"
                />
                <Bar 
                  dataKey="complaints" 
                  fill="hsl(var(--chart-2))" 
                  name="Complaints"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>{isAgentView ? "My Weekly Performance" : "Weekly Performance"}</CardTitle>
          <CardDescription>
            {isAgentView 
              ? "Your detailed performance metrics by week (last 8 weeks)" 
              : "Detailed performance metrics by week (last 8 weeks)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {weeklyData.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No data available</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Week</TableHead>
                  <TableHead>Policies Sold</TableHead>
                  <TableHead>Cancellations</TableHead>
                  <TableHead>Claims Filed</TableHead>
                  <TableHead>Complaints</TableHead>
                  <TableHead>Premium Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...weeklyData].reverse().map((data, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{data.fullWeek}</TableCell>
                    <TableCell>{data.policies}</TableCell>
                    <TableCell>{data.cancellations}</TableCell>
                    <TableCell>{data.claims}</TableCell>
                    <TableCell>{data.complaints}</TableCell>
                    <TableCell>€{data.premium.toFixed(2)}/mo</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
