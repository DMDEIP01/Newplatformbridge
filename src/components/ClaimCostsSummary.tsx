import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, Receipt, Wrench, CreditCard, Gift } from "lucide-react";

interface RepairCost {
  id: string;
  cost_type: string;
  description: string;
  amount: number;
  units?: number;
  created_at: string;
}

interface Fulfillment {
  id: string;
  quote_amount: number | null;
  quote_status: string | null;
  fulfillment_type: string | null;
  ber_reason: string | null;
  excess_amount: number | null;
  excess_paid: boolean;
  device_value: number | null;
  status: string;
  repairers?: {
    name: string;
    company_name: string;
  } | null;
}

interface ClaimCostsSummaryProps {
  fulfillment: Fulfillment | null;
  repairCosts: RepairCost[];
  claimDecision?: string | null;
  claimDecisionReason?: string | null;
}

export default function ClaimCostsSummary({
  fulfillment,
  repairCosts,
  claimDecision,
  claimDecisionReason,
}: ClaimCostsSummaryProps) {
  const totalRepairCosts = repairCosts.reduce((sum, cost) => sum + cost.amount, 0);
  const repairerName = fulfillment?.repairers?.name || fulfillment?.repairers?.company_name || "Unknown Repairer";
  
  // Determine settlement type and value from BER reason or decision reason
  let settlementValue = 0;
  let settlementType = "";
  
  if (fulfillment?.ber_reason) {
    const match = fulfillment.ber_reason.match(/€([\d.]+)/);
    if (match) {
      settlementValue = parseFloat(match[1]);
    }
    if (fulfillment.fulfillment_type === "ber_cash") {
      settlementType = "Cash Settlement";
    } else if (fulfillment.fulfillment_type === "ber_voucher") {
      settlementType = "Voucher Settlement";
    }
  }

  const isBerSettlement = fulfillment?.fulfillment_type?.startsWith("ber_");
  const isRepairCompleted = fulfillment?.status === "completed" && !isBerSettlement;

  return (
    <div className="border-t pt-6">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Claim Costs Summary</h3>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Cost Breakdown</CardTitle>
            {isBerSettlement ? (
              <Badge variant="secondary" className="gap-1">
                {fulfillment?.fulfillment_type === "ber_cash" ? (
                  <CreditCard className="h-3 w-3" />
                ) : (
                  <Gift className="h-3 w-3" />
                )}
                BER Settlement
              </Badge>
            ) : isRepairCompleted ? (
              <Badge variant="default" className="gap-1">
                <Wrench className="h-3 w-3" />
                Repair Completed
              </Badge>
            ) : (
              <Badge variant="outline">In Progress</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Device Value */}
          {fulfillment?.device_value && fulfillment.device_value > 0 && (
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
              <span className="text-sm text-muted-foreground">Device Value</span>
              <span className="font-medium">€{fulfillment.device_value.toFixed(2)}</span>
            </div>
          )}

          {/* Repairer Costs */}
          {repairCosts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Repairer Costs ({repairerName})</span>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repairCosts.map((cost) => (
                      <TableRow key={cost.id}>
                        <TableCell className="capitalize font-medium">
                          {cost.cost_type.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {cost.description}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          €{cost.amount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/30 font-bold">
                      <TableCell colSpan={2} className="text-right">
                        Repairer Total
                      </TableCell>
                      <TableCell className="text-right">
                        €{totalRepairCosts.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* BER Settlement */}
          {isBerSettlement && settlementValue > 0 && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {fulfillment?.fulfillment_type === "ber_cash" ? (
                    <CreditCard className="h-5 w-5 text-primary" />
                  ) : (
                    <Gift className="h-5 w-5 text-primary" />
                  )}
                  <div>
                    <span className="font-medium">{settlementType}</span>
                    {fulfillment?.device_value && fulfillment.device_value > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {((settlementValue / fulfillment.device_value) * 100).toFixed(0)}% of device value
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-xl font-bold text-primary">€{settlementValue.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Approved Quote Amount */}
          {fulfillment?.quote_status === "approved" && fulfillment.quote_amount && !isBerSettlement && (
            <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-green-600 dark:text-green-500" />
                  <div>
                    <span className="font-medium">Approved Repair Quote</span>
                    {fulfillment.device_value && fulfillment.device_value > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {((fulfillment.quote_amount / fulfillment.device_value) * 100).toFixed(0)}% of device value
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-xl font-bold text-green-600 dark:text-green-500">
                  €{fulfillment.quote_amount.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Excess Payment */}
          {fulfillment?.excess_amount && fulfillment.excess_amount > 0 && (
            <div className="flex justify-between items-center p-3 border rounded-lg">
              <div>
                <span className="text-sm font-medium">Excess Payment</span>
                <p className="text-xs text-muted-foreground">
                  {fulfillment.excess_paid ? "Paid by customer" : "Pending payment"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">€{fulfillment.excess_amount.toFixed(2)}</span>
                <Badge variant={fulfillment.excess_paid ? "default" : "secondary"} className="text-xs">
                  {fulfillment.excess_paid ? "Paid" : "Pending"}
                </Badge>
              </div>
            </div>
          )}

          {/* Total Summary */}
          <div className="border-t pt-4 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-base font-semibold">Total Claim Cost</span>
              <span className="text-2xl font-bold text-primary">
                €{(isBerSettlement ? settlementValue : (fulfillment?.quote_amount || totalRepairCosts)).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Decision Reason */}
          {claimDecisionReason && (
            <div className="p-3 bg-muted/30 rounded-lg border mt-4">
              <span className="text-xs text-muted-foreground block mb-1">Settlement Notes</span>
              <p className="text-sm">{claimDecisionReason}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
