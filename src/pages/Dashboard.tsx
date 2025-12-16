import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, AlertCircle, Calendar, ArrowRight, CheckCircle, Clock, Smartphone, Laptop, Tv, Watch, Headphones, Speaker, Camera, Tablet } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";

const getDeviceIcon = (productName: string) => {
  const name = productName?.toLowerCase() || '';
  
  if (name.includes('iphone') || name.includes('phone') || name.includes('mobile')) {
    return { Icon: Smartphone, color: 'text-blue-600 dark:text-blue-400' };
  }
  if (name.includes('laptop') || name.includes('macbook') || name.includes('notebook')) {
    return { Icon: Laptop, color: 'text-purple-600 dark:text-purple-400' };
  }
  if (name.includes('tv') || name.includes('television')) {
    return { Icon: Tv, color: 'text-indigo-600 dark:text-indigo-400' };
  }
  if (name.includes('watch')) {
    return { Icon: Watch, color: 'text-rose-600 dark:text-rose-400' };
  }
  if (name.includes('headphone') || name.includes('earphone') || name.includes('earbuds')) {
    return { Icon: Headphones, color: 'text-green-600 dark:text-green-400' };
  }
  if (name.includes('speaker') || name.includes('soundbar') || name.includes('sonos') || name.includes('arc')) {
    return { Icon: Speaker, color: 'text-orange-600 dark:text-orange-400' };
  }
  if (name.includes('camera')) {
    return { Icon: Camera, color: 'text-pink-600 dark:text-pink-400' };
  }
  if (name.includes('tablet') || name.includes('ipad')) {
    return { Icon: Tablet, color: 'text-cyan-600 dark:text-cyan-400' };
  }
  
  return { Icon: Shield, color: 'text-muted-foreground' };
};

export default function Dashboard() {
  const { user } = useAuth();
  const [policies, setPolicies] = useState<any[]>([]);
  const [activeClaims, setActiveClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchAllPolicies();
      fetchActiveClaims();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data?.full_name) {
        // Extract first name from full name
        const firstName = data.full_name.split(' ')[0];
        setUserName(firstName);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching user profile:", error);
      }
    }
  };

  const fetchActiveClaims = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("claims")
        .select(`
          id,
          claim_number,
          claim_type,
          status,
          submitted_date,
          description,
          policies (
            policy_number,
            products (
              name
            )
          )
        `)
        .eq("user_id", user.id)
        .in("status", ["notified", "accepted", "repair", "inbound_logistics", "outbound_logistics"])
        .order("submitted_date", { ascending: false });

      if (error) throw error;
      setActiveClaims(data || []);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching active claims:", error);
      }
    }
  };

  const fetchAllPolicies = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("policies")
        .select(`
          id,
          policy_number,
          start_date,
          renewal_date,
          status,
          cancelled_at,
          products (
            id,
            name,
            type,
            monthly_premium,
            excess_1
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      if (data) {
        // Filter to show active policies and cancelled policies within 60 days
        const now = new Date();
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        
        const filteredPolicies = data.filter(policy => {
          if (policy.status === 'active') return true;
          if (policy.status === 'cancelled' && policy.cancelled_at) {
            const cancelledDate = new Date(policy.cancelled_at);
            return cancelledDate >= sixtyDaysAgo;
          }
          return false;
        });
        
        // Fetch covered item for each policy
        const policiesWithItems = await Promise.all(
          filteredPolicies.map(async (policy) => {
            const { data: item } = await supabase
              .from("covered_items")
              .select("product_name, model, serial_number")
              .eq("policy_id", policy.id)
              .maybeSingle();

            return {
              ...policy,
              covered_item: item,
            };
          })
        );
        
        // Sort: active policies first, then cancelled
        const sortedPolicies = policiesWithItems.sort((a, b) => {
          if (a.status === 'active' && b.status !== 'active') return -1;
          if (a.status !== 'active' && b.status === 'active') return 1;
          return 0;
        });
        
        setPolicies(sortedPolicies);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching policies:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysUntilRenewal = (renewalDate: string) => {
    const renewal = new Date(renewalDate);
    const today = new Date();
    const diffTime = renewal.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const handleRenewPolicy = async (policyId: string, currentRenewalDate: string) => {
    try {
      // Calculate new renewal date (1 year from current renewal date)
      const renewalDate = new Date(currentRenewalDate);
      const newRenewalDate = new Date(renewalDate);
      newRenewalDate.setFullYear(newRenewalDate.getFullYear() + 1);
      
      const { error } = await supabase
        .from("policies")
        .update({ 
          renewal_date: newRenewalDate.toISOString().split('T')[0]
        })
        .eq("id", policyId);

      if (error) throw error;

      toast.success("Policy renewed successfully", {
        description: `Your policy has been renewed until ${newRenewalDate.toLocaleDateString()}`,
      });
      
      // Refresh policy data
      fetchAllPolicies();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error renewing policy:", error);
      }
      toast.error("Failed to renew policy", {
        description: "Please try again or contact support.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back{userName ? `, ${userName}` : ''}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's an overview of your policies and claims
        </p>
      </div>

      {/* Active Claims */}
      {activeClaims.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Active Claims</h2>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {activeClaims.length} Active
            </Badge>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeClaims.map((claim) => {
              const claimTypeConfig = {
                breakdown: {
                  label: 'Breakdown',
                  color: 'text-blue-700 dark:text-blue-300',
                  accent: 'bg-blue-500',
                },
                damage: {
                  label: 'Damage',
                  color: 'text-orange-700 dark:text-orange-300',
                  accent: 'bg-orange-500',
                },
                theft: {
                  label: 'Theft',
                  color: 'text-rose-700 dark:text-rose-300',
                  accent: 'bg-rose-500',
                },
              }[claim.claim_type] || {
                label: claim.claim_type,
                color: 'text-gray-700 dark:text-gray-300',
                accent: 'bg-gray-500',
              };

              const statusConfig = {
                notified: { 
                  label: 'Pending Review',
                  color: 'text-amber-700 dark:text-amber-300',
                  bg: 'bg-amber-50 dark:bg-amber-950/20',
                  icon: Clock 
                },
                accepted: { 
                  label: 'Approved',
                  color: 'text-emerald-700 dark:text-emerald-300',
                  bg: 'bg-emerald-50 dark:bg-emerald-950/20',
                  icon: CheckCircle 
                },
                repair: { 
                  label: 'In Repair',
                  color: 'text-blue-700 dark:text-blue-300',
                  bg: 'bg-blue-50 dark:bg-blue-950/20',
                  icon: AlertCircle 
                },
                inbound_logistics: { 
                  label: 'In Transit',
                  color: 'text-purple-700 dark:text-purple-300',
                  bg: 'bg-purple-50 dark:bg-purple-950/20',
                  icon: ArrowRight 
                },
                outbound_logistics: { 
                  label: 'Returning',
                  color: 'text-indigo-700 dark:text-indigo-300',
                  bg: 'bg-indigo-50 dark:bg-indigo-950/20',
                  icon: ArrowRight 
                },
              }[claim.status] || { 
                label: claim.status,
                color: 'text-gray-700 dark:text-gray-300',
                bg: 'bg-gray-50 dark:bg-gray-950/20',
                icon: AlertCircle 
              };

              const StatusIcon = statusConfig.icon;

              return (
                <Card 
                  key={claim.id} 
                  className="overflow-hidden hover:shadow-lg transition-all duration-300 border animate-fade-in group"
                >
                  <div className={cn("h-1.5 w-full", claimTypeConfig.accent)} />
                  
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={cn("text-xs font-bold uppercase tracking-wider", claimTypeConfig.color)}>
                        {claimTypeConfig.label}
                      </span>
                      <Badge variant="outline" className={cn("text-xs", statusConfig.color, statusConfig.bg)}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-semibold line-clamp-1">
                      {claim.policies?.products?.name || 'N/A'}
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">Claim Number</span>
                        <span className="font-mono text-xs font-semibold">{claim.claim_number.split('-').pop()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">Policy</span>
                        <span className="font-mono text-xs font-semibold">{claim.policies?.policy_number.split('-').pop()}</span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t">
                        <span className="text-muted-foreground text-xs flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Submitted
                        </span>
                        <span className="text-xs font-medium">
                          {new Date(claim.submitted_date).toLocaleDateString('en-GB', { 
                            day: 'numeric', 
                            month: 'short'
                          })}
                        </span>
                      </div>
                    </div>
                    
                    <Link to={`/customer/claims/${claim.id}`} className="block">
                      <Button variant="outline" className="w-full" size="sm">
                        View Details
                        <ArrowRight className="ml-2 h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* All Policies */}
      {!loading && policies.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Your Policies</h2>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {policies.filter(p => p.status === 'active').length} Active
            </Badge>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {policies.map((policy) => {
              const daysUntilRenewal = calculateDaysUntilRenewal(policy.renewal_date);
              const showRenewalAlert = daysUntilRenewal <= 60 && daysUntilRenewal > 0;
              
              const policyTypeConfig = {
                extended_warranty: {
                  label: 'Extended Warranty',
                  color: 'text-blue-700 dark:text-blue-300',
                  accent: 'bg-blue-500',
                },
                insurance_lite: {
                  label: 'Insurance Lite',
                  color: 'text-purple-700 dark:text-purple-300',
                  accent: 'bg-purple-500',
                },
                insurance_max: {
                  label: 'Insurance Max',
                  color: 'text-indigo-700 dark:text-indigo-300',
                  accent: 'bg-indigo-500',
                },
              }[policy.products?.type] || {
                label: policy.products?.type || 'Policy',
                color: 'text-gray-700 dark:text-gray-300',
                accent: 'bg-gray-500',
              };

              const isActive = policy.status === 'active';
              
              return (
                <Card 
                  key={policy.id} 
                  className={cn(
                    "overflow-hidden hover:shadow-lg transition-all duration-300 border animate-fade-in",
                    !isActive && "opacity-60"
                  )}
                >
                  <div className={cn("h-1.5 w-full", policyTypeConfig.accent)} />
                  
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={cn("text-xs font-bold uppercase tracking-wider", policyTypeConfig.color)}>
                        {policyTypeConfig.label}
                      </span>
                      <Badge variant={isActive ? "default" : "destructive"} className="text-xs">
                        {policy.status.charAt(0).toUpperCase() + policy.status.slice(1)}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-semibold line-clamp-1">
                      {policy.products?.name || 'Policy'}
                    </CardTitle>
                    {policy.covered_item && (
                      <CardDescription className="text-xs mt-1 flex items-center gap-1.5">
                        {(() => {
                          const { Icon: DeviceIcon, color } = getDeviceIcon(policy.covered_item.product_name);
                          return <DeviceIcon className={cn("h-3.5 w-3.5 shrink-0", color)} />;
                        })()}
                        <span className="line-clamp-1">
                          {policy.covered_item.product_name}
                          {policy.covered_item.model && ` - ${policy.covered_item.model}`}
                        </span>
                      </CardDescription>
                    )}
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">Policy Number</span>
                        <span className="font-mono text-xs font-semibold">{policy.policy_number}</span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t">
                        <div>
                          <div className="text-muted-foreground text-xs">Premium</div>
                          <div className="font-bold">£{policy.products?.monthly_premium || 0}/mo</div>
                        </div>
                        <div className="text-right">
                          <div className="text-muted-foreground text-xs">Excess</div>
                          <div className="font-bold">£{policy.products?.excess_1 || 0}</div>
                        </div>
                      </div>
                    </div>

                    {showRenewalAlert && (
                      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-2 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                            Renewal in {daysUntilRenewal} days
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Link to="policies" className="block">
                        <Button variant="outline" className="w-full" size="sm">
                          View Details
                        </Button>
                      </Link>
                      {showRenewalAlert && (
                        <Button 
                          className="w-full" 
                          size="sm"
                          onClick={() => handleRenewPolicy(policy.id, policy.renewal_date)}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                          Renew Now
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {!loading && policies.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Policies Found</h3>
            <p className="text-muted-foreground text-center mb-6">
              You don't have any policies yet. Get started by creating your first policy.
            </p>
            <Link to="policies">
              <Button>
                View Available Policies
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
