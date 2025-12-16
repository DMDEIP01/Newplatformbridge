import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { formatStatus } from "@/lib/utils";

interface Payment {
  id: string;
  amount: number;
  payment_type: string;
  payment_date: string | null;
  status: string;
  reference_number: string;
  created_at: string;
}

interface PolicyPaymentHistoryProps {
  policyId: string;
  promotionalPremium?: number | null;
  originalPremium?: number | null;
  promoName?: string | null;
  promoType?: string | null;
  discountValue?: number | null;
  freeMonths?: number | null;
  policyStartDate?: string | null;
}

export const PolicyPaymentHistory = ({ 
  policyId,
  promotionalPremium,
  originalPremium,
  promoName,
  promoType,
  discountValue,
  freeMonths,
  policyStartDate
}: PolicyPaymentHistoryProps) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("policy_id", policyId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setPayments(data);
      }
      setLoading(false);
    };

    fetchPayments();
  }, [policyId]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      paid: "default",
      pending: "secondary",
      failed: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{formatStatus(status)}</Badge>;
  };

  const getPaymentTypeLabel = (type: string) => {
    return type === "premium" ? "Premium" : "Excess";
  };

  const hasPromo = promotionalPremium !== null && promotionalPremium !== undefined;
  const hasFreeMonthsPromo = promoType === 'free_months' && freeMonths && freeMonths > 0;
  const effectivePremium = hasPromo ? promotionalPremium : originalPremium;

  // Calculate free months expiry date
  const getFreeMonthsExpiryDate = () => {
    if (!policyStartDate || !freeMonths) return null;
    const startDate = new Date(policyStartDate);
    const expiryDate = new Date(startDate);
    expiryDate.setMonth(expiryDate.getMonth() + freeMonths);
    return expiryDate;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
        {(hasPromo || hasFreeMonthsPromo) && promoName && (
          <CardDescription className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="bg-success/10 text-success border-success/30">
              {promoName}
            </Badge>
            <span className="text-sm">
              {promoType === 'percentage_discount' && discountValue && `${discountValue}% discount applied`}
              {promoType === 'fixed_discount' && discountValue && `€${discountValue.toFixed(2)} discount applied`}
              {promoType === 'free_months' && freeMonths && (() => {
                const expiryDate = getFreeMonthsExpiryDate();
                if (expiryDate) {
                  return `First ${freeMonths} month(s) free - expires ${expiryDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
                }
                return `First ${freeMonths} month(s) free`;
              })()}
            </span>
          </CardDescription>
        )}
        {effectivePremium && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-muted-foreground">Effective Premium:</span>
            {hasPromo && originalPremium ? (
              <div className="flex items-center gap-2">
                <span className="text-sm line-through text-muted-foreground">€{originalPremium.toFixed(2)}</span>
                <span className="text-lg font-bold text-success">€{promotionalPremium!.toFixed(2)}/mo</span>
              </div>
            ) : (
              <span className="text-lg font-bold text-primary">€{effectivePremium.toFixed(2)}/mo</span>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="text-muted-foreground text-sm">No payment history available.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    {payment.payment_date
                      ? format(new Date(payment.payment_date), "dd MMM yyyy")
                      : format(new Date(payment.created_at), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>{getPaymentTypeLabel(payment.payment_type)}</TableCell>
                  <TableCell>€{payment.amount.toFixed(2)}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {payment.reference_number}
                  </TableCell>
                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};