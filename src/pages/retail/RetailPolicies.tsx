import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserPrograms } from "@/hooks/useUserPrograms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search } from "lucide-react";
import { format } from "date-fns";
import { formatStatus } from "@/lib/utils";

export default function RetailPolicies() {
  const navigate = useNavigate();
  const { programIds, loading: programsLoading } = useUserPrograms();
  const [policies, setPolicies] = useState<any[]>([]);
  const [filteredPolicies, setFilteredPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!programsLoading) {
      fetchPolicies();
    }
  }, [programsLoading, programIds]);

  const fetchPolicies = async () => {
    const query = supabase
      .from("policies")
      .select(`
        *,
        products (name, monthly_premium),
        profiles (full_name, email)
      `)
      .order("created_at", { ascending: false });

    if (programIds.length > 0) {
      query.in("program_id", programIds);
    }

    const { data, error } = await query;

    if (!error && data) {
      setPolicies(data);
      setFilteredPolicies(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    const filtered = policies.filter((policy) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        policy.policy_number.toLowerCase().includes(searchLower) ||
        policy.profiles?.full_name?.toLowerCase().includes(searchLower) ||
        policy.profiles?.email?.toLowerCase().includes(searchLower) ||
        policy.products?.name?.toLowerCase().includes(searchLower)
      );
    });
    setFilteredPolicies(filtered);
  }, [searchTerm, policies]);

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
        <h1 className="text-3xl font-bold">All Policies</h1>
        <p className="text-muted-foreground">View and manage all sold policies</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by policy number, customer name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Policy Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Premium</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPolicies.map((policy) => (
                <TableRow 
                  key={policy.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/retail/policies/${policy.id}`)}
                >
                  <TableCell className="font-medium">{policy.policy_number}</TableCell>
                  <TableCell>
                    <div>
                      <div>{policy.profiles?.full_name || "N/A"}</div>
                      <div className="text-sm text-muted-foreground">{policy.profiles?.email || "N/A"}</div>
                    </div>
                  </TableCell>
                  <TableCell>{policy.products?.name}</TableCell>
                  <TableCell>€{policy.products?.monthly_premium}/mo</TableCell>
                  <TableCell>
                    <Badge variant={policy.status === "active" ? "default" : "secondary"}>
                      {formatStatus(policy.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(policy.start_date), "MMM dd, yyyy")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
