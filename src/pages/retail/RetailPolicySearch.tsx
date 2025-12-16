import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Eye } from "lucide-react";
import PolicyDocumentsCard from "@/components/PolicyDocumentsCard";
import PolicyEditDialog from "@/components/PolicyEditDialog";
import { toast } from "sonner";
import { useUserPrograms } from "@/hooks/useUserPrograms";
import { formatStatus } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PolicyWithDetails {
  id: string;
  policy_number: string;
  status: string;
  start_date: string;
  renewal_date: string;
  user_id: string;
  product_id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  product: {
    name: string;
    type: string;
    monthly_premium: number;
    excess_1: number;
    excess_2: number | null;
  };
  profile: {
    full_name: string;
    email: string;
    phone: string;
    address_line1?: string;
    address_line2?: string;
    city?: string;
    postcode?: string;
  };
  covered_items: Array<{
    product_name: string;
    model: string;
    serial_number: string;
    purchase_price: number;
  }>;
  complaints?: Array<{
    id: string;
    complaint_reference: string;
    complaint_type: string;
    reason: string;
    details: string;
    status: string;
    created_at: string;
    response?: string;
    response_date?: string;
  }>;
}

export default function RetailPolicySearch() {
  const navigate = useNavigate();
  const { programIds } = useUserPrograms();
  const [searchTerm, setSearchTerm] = useState("");
  const [policies, setPolicies] = useState<PolicyWithDetails[]>([]);
  const [filteredPolicies, setFilteredPolicies] = useState<PolicyWithDetails[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPolicies = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setPolicies([]);
      setFilteredPolicies([]);
      return;
    }

    // Normalize input: remove NBSP and trim whitespace
    const q = searchQuery.replace(/\u00A0/g, ' ').trim();
    const isPolicyFormat = /^POL-/.test(q);

    setLoading(true);
    try {
      // Search by policy number (prefer exact match when looks like a policy number)
      const baseSelect = `
          id,
          policy_number,
          status,
          start_date,
          renewal_date,
          user_id,
          product_id,
          customer_name,
          customer_email,
          customer_phone,
          product:products(name, type, monthly_premium, excess_1, excess_2),
          profile:profiles!policies_user_id_fkey(full_name, email, phone, address_line1, address_line2, city, postcode),
          covered_items(product_name, model, serial_number, purchase_price)
        `;

      const policiesByNumberReq = supabase
        .from("policies")
        .select(baseSelect);

      // Add program filtering
      if (programIds.length > 0) {
        policiesByNumberReq.in("program_id", programIds);
      }

      const { data: policiesByNumber, error: error1 } = isPolicyFormat
        ? await policiesByNumberReq.eq("policy_number", q)
        : await policiesByNumberReq.ilike("policy_number", `%${q}%`);

      if (error1) throw error1;

      // Search by customer name/email/phone directly on policies
      const policiesByCustomerReq = supabase
        .from("policies")
        .select(baseSelect)
        .or(`customer_name.ilike.%${q}%,customer_email.ilike.%${q}%,customer_phone.ilike.%${q}%`);
      
      // Add program filtering
      if (programIds.length > 0) {
        policiesByCustomerReq.in("program_id", programIds);
      }

      const { data: policiesByCustomer, error: error2 } = await policiesByCustomerReq;

      if (error2) throw error2;

      // Search profiles by name, email, phone
      const { data: matchingProfiles, error: error3 } = await supabase
        .from("profiles")
        .select("id")
        .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);

      if (error3) throw error3;

      // Get policies for matching user IDs
      const userIds = matchingProfiles?.map(p => p.id) || [];
      let policiesByUser: any[] = [];

      if (userIds.length > 0) {
        const policiesByUserReq = supabase
          .from("policies")
          .select(baseSelect)
          .in("user_id", userIds);
        
        // Add program filtering
        if (programIds.length > 0) {
          policiesByUserReq.in("program_id", programIds);
        }

        const { data: userPolicies, error: error4 } = await policiesByUserReq;

        if (error4) throw error4;
        policiesByUser = userPolicies || [];
      }

      // Merge and deduplicate results
      const allPolicies = [
        ...(policiesByNumber || []), 
        ...(policiesByCustomer || []),
        ...policiesByUser
      ];
      const uniquePoliciesMap = new Map(allPolicies.map(p => [p.id, p]));
      const uniquePolicies = Array.from(uniquePoliciesMap.values());
      
      // Sort by most recent first (start_date descending)
      uniquePolicies.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

      // Normalize covered_items to always be an array
      const normalizedData = uniquePolicies.map(policy => ({
        ...policy,
        covered_items: Array.isArray(policy.covered_items) 
          ? policy.covered_items 
          : policy.covered_items 
            ? [policy.covered_items] 
            : []
      }));
      
      setPolicies(normalizedData as any);
      setFilteredPolicies(normalizedData as any);
    } catch (error: any) {
      console.error("Error searching policies:", error);
      toast.error("Failed to search policies: " + error.message);
      setPolicies([]);
      setFilteredPolicies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // No need to fetch products anymore since we removed dialogs
  }, []);

  const handleSearch = () => {
    fetchPolicies(searchTerm);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      active: "default",
      pending: "secondary",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{formatStatus(status)}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Policy Search</h1>
        <p className="text-muted-foreground">Search and manage customer policies</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Policies</CardTitle>
          <CardDescription>
            Search by policy number, customer name, email, or phone number
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter policy number, name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredPolicies.length > 0 || policies.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {filteredPolicies.length} {filteredPolicies.length === 1 ? "Policy" : "Policies"} Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Policy Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Premium</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPolicies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No policies found matching your search
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPolicies.map((policy) => (
                      <TableRow 
                        key={policy.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/retail/policies/${policy.id}`)}
                      >
                        <TableCell className="font-medium">{policy.policy_number}</TableCell>
                <TableCell>{policy.customer_name || policy.profile?.full_name || "N/A"}</TableCell>
                <TableCell>{policy.customer_email || policy.profile?.email || "N/A"}</TableCell>
                        <TableCell>{policy.product?.name || "N/A"}</TableCell>
                        <TableCell>£{policy.product?.monthly_premium || 0}/mo</TableCell>
                        <TableCell>{getStatusBadge(policy.status)}</TableCell>
                        <TableCell>{new Date(policy.start_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/retail/policies/${policy.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
          ) : null}
    </div>
  );
}
