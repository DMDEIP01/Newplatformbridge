import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, TrendingUp, CheckCircle2, Loader2, CalendarIcon, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Recommendation {
  repairer_id: string;
  repairer_name: string;
  rank: number;
  score: number;
  reasoning: string;
  key_advantages: string[];
}

interface RepairerData {
  id: string;
  name: string;
  connectivity_type: string;
  slas: Array<{
    response_time_hours: number;
    repair_time_hours: number;
    quality_score: number;
    success_rate: number;
  }>;
}

interface RepairerRecommendationsProps {
  claimId: string;
  deviceCategory?: string;
  coverageArea?: string;
  onSelectRepairer?: (repairerId: string, repairerName: string) => void;
}

export default function RepairerRecommendations({
  claimId,
  deviceCategory,
  coverageArea,
  onSelectRepairer
}: RepairerRecommendationsProps) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [overallAnalysis, setOverallAnalysis] = useState<string>("");
  const [hasResults, setHasResults] = useState(false);
  const [repairersData, setRepairersData] = useState<RepairerData[]>([]);
  const [selectedRepairerId, setSelectedRepairerId] = useState<string | null>(null);

  // Auto-fetch recommendations when component loads
  useEffect(() => {
    console.log("RepairerRecommendations mounted with:", { claimId, deviceCategory, coverageArea });
    fetchRecommendations();
  }, [claimId]); // Re-fetch if claimId changes

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      // Fetch claim to get proper device category and coverage
      const { data: claimData, error: claimError } = await supabase
        .from('claims')
        .select(`
          *,
          policies!inner(
            customer_postcode,
            customer_city,
            products!inner(device_categories)
          )
        `)
        .eq('id', claimId)
        .single();

      if (claimError) {
        console.error("Error fetching claim:", claimError);
        toast.error("Failed to fetch claim details");
        setLoading(false);
        return;
      }

      // Fetch covered item for device detection
      const { data: coveredItem } = await supabase
        .from("covered_items")
        .select("product_name, model")
        .eq("policy_id", claimData.policy_id)
        .single();

      // Detect device category - FIRST check the devices table for authoritative category
      let detectedCategory = deviceCategory || "";
      
      if (coveredItem?.product_name && !detectedCategory) {
        // Try to find the device in the devices table by model name for accurate category
        const { data: deviceMatch } = await supabase
          .from("devices")
          .select("device_category, manufacturer, model_name")
          .or(`model_name.ilike.%${coveredItem.model || ''}%,model_name.ilike.%${coveredItem.product_name}%`)
          .limit(1)
          .single();
        
        if (deviceMatch?.device_category) {
          console.log("Found device category from devices table:", deviceMatch.device_category);
          // Map device categories to repairer specializations
          const categoryMapping: { [key: string]: string } = {
            'TV': 'TVs',
            'Brown Goods': 'TVs', // Brown goods typically includes TVs
            'Smart TV': 'TVs',
            'Laptop': 'Laptops',
            'Notebook': 'Laptops',
            'Mobile Phone': 'Mobile Phones',
            'Smartphone': 'Mobile Phones',
            'Tablet': 'Tablets',
            'Camera': 'Cameras',
            'Gaming Console': 'Gaming Consoles',
            'White Goods': 'Home Appliances',
            'Washing Machine': 'Home Appliances',
            'Refrigerator': 'Home Appliances',
          };
          detectedCategory = categoryMapping[deviceMatch.device_category] || deviceMatch.device_category;
        }
      }
      
      // Fallback to keyword-based detection if devices table didn't match
      if (!detectedCategory && coveredItem?.product_name) {
        const productName = coveredItem.product_name.toLowerCase();
        if (productName.includes("laptop") || productName.includes("macbook") || productName.includes("notebook")) {
          detectedCategory = "Laptops";
        } else if (productName.includes("phone") || productName.includes("iphone") || productName.includes("samsung galaxy") || productName.includes("pixel")) {
          detectedCategory = "Mobile Phones";
        } else if (productName.includes("tablet") || productName.includes("ipad")) {
          detectedCategory = "Tablets";
        } else if (
          productName.includes("tv") || 
          productName.includes("television") || 
          productName.includes("bravia") ||
          productName.includes("oled") ||
          productName.includes("qled") ||
          productName.includes("qned") ||
          productName.includes("nanocell") ||
          productName.includes("led tv") ||
          productName.includes("smart display") ||
          productName.includes("x95k") ||
          productName.includes("x90") ||
          productName.includes("a80") ||
          productName.includes("c1") ||
          productName.includes("c2") ||
          productName.includes("g2")
        ) {
          detectedCategory = "TVs";
        } else if (productName.includes("camera")) {
          detectedCategory = "Cameras";
        } else if (productName.includes("washing") || productName.includes("dishwasher") || productName.includes("fridge") || productName.includes("oven")) {
          detectedCategory = "Home Appliances";
        } else if (productName.includes("console") || productName.includes("playstation") || productName.includes("xbox") || productName.includes("nintendo")) {
          detectedCategory = "Gaming Consoles";
        }
      }

      // Fallback to product device categories
      if (!detectedCategory && claimData.policies?.products?.device_categories?.length > 0) {
        detectedCategory = claimData.policies.products.device_categories[0];
      }
      
      console.log("Final detected device category:", detectedCategory);

      // Get coverage area - prioritize city over postcode
      const customerCoverage = coverageArea || claimData.policies?.customer_city || claimData.policies?.customer_postcode;

      console.log("Calling edge function with:", { 
        claimId, 
        deviceCategory: detectedCategory, 
        coverageArea: customerCoverage 
      });

      const { data, error } = await supabase.functions.invoke('claims-fulfillment-advisor', {
        body: { 
          claimId, 
          deviceCategory: detectedCategory,
          coverageArea: customerCoverage
        }
      });

      if (error) {
        if (error.message?.includes("Rate limits exceeded")) {
          toast.error("Rate limits exceeded. Please try again later.");
        } else if (error.message?.includes("Payment required")) {
          toast.error("AI credits required. Please add credits to your workspace.");
        } else {
          throw error;
        }
        return;
      }

      if (data?.recommendations) {
        console.log("Received recommendations:", data.recommendations);
        console.log("Received repairers data:", data.eligibleRepairers);
        
        setRecommendations(data.recommendations.recommendations || []);
        setOverallAnalysis(data.recommendations.overall_analysis || "");
        setRepairersData(data.eligibleRepairers || []);
        setHasResults(true);
        toast.success("AI recommendations generated");
      } else {
        console.warn("No recommendations in response:", data);
      }
    } catch (error: any) {
      console.error("Error fetching recommendations:", error);
      toast.error(error.message || "Failed to fetch recommendations");
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
      case 2: return "bg-gray-500/10 text-gray-700 border-gray-500/20";
      case 3: return "bg-orange-500/10 text-orange-700 border-orange-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getRankLabel = (rank: number) => {
    switch (rank) {
      case 1: return "Best Match";
      case 2: return "Strong Alternative";
      case 3: return "Good Option";
      default: return `Rank ${rank}`;
    }
  };

  const getRepairerData = (recommendation: Recommendation) => {
    console.log("Looking for repairer with ID:", recommendation.repairer_id);
    console.log("Available repairers:", repairersData.map(r => ({ id: r.id, name: r.name })));
    
    // Use the ID from the recommendation directly
    const repairer = repairersData.find(r => r.id === recommendation.repairer_id);
    
    console.log("Found repairer:", repairer);
    return repairer;
  };

  const calculateNextAppointment = (recommendation: Recommendation) => {
    const repairer = getRepairerData(recommendation);
    if (!repairer?.slas?.[0]) return "Contact for availability";
    
    const responseHours = repairer.slas[0].response_time_hours || 24;
    const nextAvailable = new Date();
    nextAvailable.setHours(nextAvailable.getHours() + responseHours);
    
    const daysFromNow = Math.ceil(responseHours / 24);
    if (daysFromNow === 0) return "Available today";
    if (daysFromNow === 1) return "Available tomorrow";
    return `Available in ${daysFromNow} days`;
  };

  const handleSelectRepairer = (rec: Recommendation) => {
    console.log("Selecting repairer:", rec);
    const repairer = getRepairerData(rec);
    
    if (!repairer) {
      toast.error(`Could not find repairer data for ${rec.repairer_name}`);
      console.error("Repairer not found in data. Recommendation:", rec);
      console.error("Available repairers:", repairersData);
      return;
    }
    
    if (onSelectRepairer) {
      setSelectedRepairerId(repairer.id);
      onSelectRepairer(repairer.id, rec.repairer_name);
      toast.success(`Selected ${rec.repairer_name}`);
    } else {
      console.warn("onSelectRepairer callback not provided");
    }
  };

  return (
    <div className="space-y-4">
      {loading && !hasResults && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6 pb-6 flex items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm font-medium">Analyzing repairers and generating AI recommendations...</p>
          </CardContent>
        </Card>
      )}

      {hasResults && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI-Powered Repairer Recommendations
            </h3>
            <p className="text-sm text-muted-foreground">
              Intelligent suggestions based on SLA metrics and claim requirements
            </p>
          </div>
          <Button
            onClick={fetchRecommendations}
            disabled={loading}
            size="sm"
            variant="outline"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Refresh
              </>
            )}
          </Button>
        </div>
      )}

      {hasResults && overallAnalysis && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Overall Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{overallAnalysis}</p>
          </CardContent>
        </Card>
      )}

      {hasResults && recommendations.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              No suitable repairers found matching your criteria
            </p>
          </CardContent>
        </Card>
      )}

      {recommendations.length > 0 && (
        <div className="space-y-4">
          {recommendations.map((rec) => {
            const repairer = getRepairerData(rec);
            const isSelected = repairer?.id === selectedRepairerId;
            
            return (
              <Card 
                key={rec.repairer_id} 
                className={cn(
                  "border-l-4 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] pointer-events-auto",
                  isSelected && "ring-2 ring-primary shadow-lg scale-[1.02]"
                )}
                style={{
                  borderLeftColor: rec.rank === 1 ? 'rgb(234 179 8)' : rec.rank === 2 ? 'rgb(107 114 128)' : 'rgb(249 115 22)'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  console.log("Card clicked!");
                  handleSelectRepairer(rec);
                }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg">{rec.repairer_name}</CardTitle>
                        <Badge className={getRankColor(rec.rank)}>
                          {getRankLabel(rec.rank)}
                        </Badge>
                        {isSelected && (
                          <Badge className="bg-primary/10 text-primary border-primary/20">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Selected
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        <CardDescription className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Match Score: {rec.score.toFixed(0)}%
                        </CardDescription>
                        <CardDescription className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          {calculateNextAppointment(rec)}
                        </CardDescription>
                      </div>
                    </div>
                    {!isSelected && (
                      <div className="text-sm text-muted-foreground italic">
                        Click to select
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!repairer && (
                    <Alert className="border-warning/20 bg-warning/5">
                      <AlertCircle className="h-4 w-4 text-warning" />
                      <AlertDescription className="text-sm">
                        Repairer data not found. This may affect appointment scheduling.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Why This Repairer?</h4>
                    <p className="text-sm text-muted-foreground">{rec.reasoning}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Key Advantages</h4>
                    <ul className="space-y-1">
                      {rec.key_advantages.map((advantage, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                          <span>{advantage}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
