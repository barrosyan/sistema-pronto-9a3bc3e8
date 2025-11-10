-- Add user_id column to campaign_metrics table
ALTER TABLE public.campaign_metrics 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Set existing campaign_metrics to the first authenticated user (temporary)
UPDATE public.campaign_metrics 
SET user_id = (SELECT id FROM auth.users LIMIT 1)
WHERE user_id IS NULL;

-- Make user_id required for new campaign metrics
ALTER TABLE public.campaign_metrics 
ALTER COLUMN user_id SET NOT NULL;

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can read campaign metrics" ON public.campaign_metrics;
DROP POLICY IF EXISTS "Authenticated users can insert campaign metrics" ON public.campaign_metrics;
DROP POLICY IF EXISTS "Authenticated users can update campaign metrics" ON public.campaign_metrics;
DROP POLICY IF EXISTS "Authenticated users can delete campaign metrics" ON public.campaign_metrics;

-- Create restrictive policies based on user ownership
CREATE POLICY "Users can view their own campaign metrics"
ON public.campaign_metrics
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own campaign metrics"
ON public.campaign_metrics
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaign metrics"
ON public.campaign_metrics
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaign metrics"
ON public.campaign_metrics
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);