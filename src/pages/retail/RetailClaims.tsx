import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserPrograms } from "@/hooks/useUserPrograms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { formatStatus } from "@/lib/utils";

export default function RetailClaims() {
  const navigate = useNavigate();
  const { programIds } = useUserPrograms();
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchClaims = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setClaims([]);
      return;
    }

    setLoading(true);
    try {
      // Search by claim number
      const claimsByNumberReq = supabase
        .from("claims")
        .select(`
          *,
          policies!inner (
            policy_number,
            program_id,
            covered_items!covered_items_policy_id_fkey (product_name, model, serial_number, purchase_price)
          ),
          profiles (full_name, email)
        `)
        .ilike("claim_number", `%${searchQuery}%`)
        .order("submitted_date", { ascending: false });
      
      if (programIds.length > 0) {
        claimsByNumberReq.in("policies.program_id", programIds);
      }

      const { data: claimsByNumber, error: error1 } = await claimsByNumberReq;

      if (error1) throw error1;

      // Search by policy number or customer info on policies
      const policiesReq = supabase
        .from("policies")
        .select("id")
        .or(`policy_number.ilike.%${searchQuery}%,customer_name.ilike.%${searchQuery}%,customer_email.ilike.%${searchQuery}%`);
      
      if (programIds.length > 0) {
        policiesReq.in("program_id", programIds);
      }

      const { data: matchingPolicies, error: error2 } = await policiesReq;

      if (error2) throw error2;

      const policyIds = matchingPolicies?.map(p => p.id) || [];
      let claimsByPolicy: any[] = [];

      if (policyIds.length > 0) {
        const { data: policyClaims, error: error3 } = await supabase
          .from("claims")
          .select(`
            *,
            policies (
              policy_number,
              program_id,
              covered_items!covered_items_policy_id_fkey (product_name, model, serial_number, purchase_price)
            ),
            profiles (full_name, email)
          `)
          .in("policy_id", policyIds)
          .order("submitted_date", { ascending: false });

        if (error3) throw error3;
        claimsByPolicy = policyClaims || [];
      }

      // Search profiles by name or email
      const { data: matchingProfiles, error: error4 } = await supabase
        .from("profiles")
        .select("id")
        .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);

      if (error4) throw error4;

      const userIds = matchingProfiles?.map(p => p.id) || [];
      let claimsByUser: any[] = [];

      if (userIds.length > 0) {
        const { data: userClaims, error: error5 } = await supabase
          .from("claims")
          .select(`
            *,
            policies (
              policy_number,
              program_id,
              covered_items!covered_items_policy_id_fkey (product_name, model, serial_number, purchase_price)
            ),
            profiles (full_name, email)
          `)
          .in("user_id", userIds)
          .order("submitted_date", { ascending: false });

        if (error5) throw error5;
        claimsByUser = userClaims || [];
      }

      // Merge and deduplicate results by claim ID
      const allClaims = [...(claimsByNumber || []), ...claimsByPolicy, ...claimsByUser];
      const uniqueClaimsMap = new Map();
      
      allClaims.forEach(claim => {
        if (!uniqueClaimsMap.has(claim.id)) {
          uniqueClaimsMap.set(claim.id, claim);
        }
      });
      
      const uniqueClaims = Array.from(uniqueClaimsMap.values());

      setClaims(uniqueClaims);
    } catch (error: any) {
      console.error("Error fetching claims:", error);
      toast.error("Failed to search claims");
      setClaims([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchClaims(searchTerm);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Claims Management</h1>
        <p className="text-muted-foreground">Search and process customer claims</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Claims</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search by claim number, policy number, customer name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Button onClick={handleSearch} disabled={loading || !searchTerm.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>

          {claims.length === 0 && !loading && searchTerm && (
            <p className="text-center text-muted-foreground py-8">
              No claims found matching your search.
            </p>
          )}

          {claims.length === 0 && !searchTerm && (
            <p className="text-center text-muted-foreground py-8">
              Enter a search term to find claims.
            </p>
          )}

          {claims.length > 0 && (
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Policy Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.map((claim) => (
                <TableRow 
                  key={claim.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/retail/claims/${claim.id}`)}
                >
                  <TableCell className="font-medium">{claim.claim_number}</TableCell>
                  <TableCell>
                    <div>
                      <div>{claim.profiles?.full_name || "N/A"}</div>
                      <div className="text-sm text-muted-foreground">{claim.profiles?.email || "N/A"}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div>{claim.policies?.policy_number}</div>
                      {claim.policies?.covered_items && (
                        <div className="text-sm text-muted-foreground">
                          {claim.policies.covered_items.product_name}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{claim.claim_type?.replace("_", " ")}</TableCell>
                  <TableCell>
                    <Badge variant={claim.status === "approved" ? "default" : "secondary"}>
                      {formatStatus(claim.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(claim.submitted_date), "MMM dd, yyyy")}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/retail/claims/${claim.id}`);
                      }}
                    >
                      View Details
                    </Button>
                  </TableCell>
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
