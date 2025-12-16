-- Add product_parameters column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS product_parameters jsonb DEFAULT '{
  "worldwideCoverLimitDays": 30,
  "unauthorizedCallsNotificationPeriodDays": 30,
  "insurerNotificationPeriodHours": 24,
  "policeNotificationPeriodDays": 7,
  "multipleClaimsReliefAfter": 3,
  "multipleClaimsMeasuredAcrossDays": 365,
  "daysSinceLastClaim": 180,
  "reinstatementGracePeriodDays": 30,
  "ageOfPolicyToReliefClaimDays": 30,
  "daysSinceLastDeclinedDamageClaimDays": 90,
  "policySaleConcessionDays": 30,
  "successfullyFulfilledClaimLimitDays": 365,
  "successfullyFulfilledClaimLimitPeriodDays": 365,
  "successfullyFulfilledAccidentalDamageClaimHardStopDays": 180,
  "successfullyFulfilledNotTheftClaimHardStopDays": 180
}'::jsonb;

COMMENT ON COLUMN public.products.product_parameters IS 'Product parameters that affect claim experience and eligibility rules';