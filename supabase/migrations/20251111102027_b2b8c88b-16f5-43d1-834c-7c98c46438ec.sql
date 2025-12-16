-- Remove the incorrect policy that was trying to apply RLS to a view
-- Views don't support RLS policies directly
-- The view already inherits permissions from the underlying tables

-- The sales_stats view will automatically use the RLS policies from the policies table
-- So consultants and admins can already access it based on existing policies