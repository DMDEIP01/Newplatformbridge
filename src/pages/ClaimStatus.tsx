import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, Package, Wrench, TruckIcon, Home, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const statuses = [
  { id: 1, name: "Claim Received", date: "Nov 1, 2025", completed: true, icon: CheckCircle },
  { id: 2, name: "Claim Assessed", date: "Nov 3, 2025", completed: true, icon: CheckCircle },
  { id: 3, name: "Inbound Logistics", date: "Nov 5, 2025", completed: true, icon: TruckIcon },
  { id: 4, name: "Repair", date: "Nov 7, 2025", completed: false, current: true, icon: Wrench },
  { id: 5, name: "Outbound Logistics", date: "", completed: false, icon: Package },
  { id: 6, name: "Claim Closed", date: "", completed: false, icon: Home },
];

export default function ClaimStatus() {
  const navigate = useNavigate();
  
  const handleContactSupport = () => {
    navigate("/support");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Claim Status</h1>
        <p className="text-muted-foreground mt-1">Track the progress of your claim</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Claim #CLM-2024-001</CardTitle>
              <CardDescription className="mt-1">Samsung 55" Smart TV</CardDescription>
            </div>
            <Badge className="bg-accent text-accent-foreground">In Repair</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Claim Type:</span>
              <span className="font-medium">Breakdown / Malfunction</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Submitted:</span>
              <span className="font-medium">November 1, 2025</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Excess Paid:</span>
              <span className="font-medium">£20.00</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Progress Timeline</CardTitle>
          <CardDescription>Your claim is being processed</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Horizontal Timeline */}
          <div className="relative">
            {/* Progress Line Container */}
            <div className="absolute top-12 left-0 right-0 h-1 flex items-center px-8">
              <div className="w-full h-0.5 bg-border relative">
                {/* Animated Progress Line */}
                <div 
                  className="absolute top-0 left-0 h-full bg-primary transition-all duration-500"
                  style={{ width: `${(statuses.filter(s => s.completed).length / (statuses.length - 1)) * 100}%` }}
                />
              </div>
            </div>

            {/* Status Steps */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 relative">
              {statuses.map((status, index) => {
                const Icon = status.icon;
                const isCompleted = status.completed;
                const isCurrent = status.current;
                
                return (
                  <div key={status.id} className="flex flex-col items-center text-center">
                    {/* Icon Circle */}
                    <div className={cn(
                      "relative z-10 flex h-24 w-24 items-center justify-center rounded-full border-4 bg-background transition-all duration-300",
                      isCompleted && "border-primary bg-primary/10 shadow-lg shadow-primary/20",
                      isCurrent && "border-primary bg-primary text-primary-foreground animate-pulse shadow-xl shadow-primary/40 scale-110",
                      !isCompleted && !isCurrent && "border-border bg-muted"
                    )}>
                      {isCurrent ? (
                        <Clock className="h-10 w-10" />
                      ) : (
                        <Icon className={cn(
                          "h-10 w-10 transition-colors",
                          isCompleted && "text-primary",
                          !isCompleted && !isCurrent && "text-muted-foreground"
                        )} />
                      )}
                      {isCompleted && !isCurrent && (
                        <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-success text-success-foreground border-2 border-background">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                    </div>
                    
                    {/* Status Name */}
                    <h3 className={cn(
                      "font-semibold text-sm mt-4 px-2",
                      (isCompleted || isCurrent) ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {status.name}
                    </h3>
                    
                    {/* Date */}
                    {status.date && (
                      <span className="text-xs text-muted-foreground mt-1">
                        {status.date}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Current Status Description */}
            {statuses.find(s => s.current) && (
              <div className="mt-8 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm text-center">
                  <span className="font-semibold">Current Status: </span>
                  Your product is currently being repaired by our technicians. Estimated completion: 2-3 business days.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>Contact our support team if you have questions</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" className="w-full" onClick={handleContactSupport}>
            Contact Support
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
