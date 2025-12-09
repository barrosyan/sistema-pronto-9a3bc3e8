-- Create daily_metrics table with reference to campaign_metrics
CREATE TABLE public.daily_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_metric_id UUID NOT NULL REFERENCES public.campaign_metrics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_daily_metrics_campaign_metric_id ON public.daily_metrics(campaign_metric_id);
CREATE INDEX idx_daily_metrics_date ON public.daily_metrics(date);
CREATE INDEX idx_daily_metrics_user_id ON public.daily_metrics(user_id);

-- Create unique constraint to prevent duplicates
CREATE UNIQUE INDEX idx_daily_metrics_unique ON public.daily_metrics(campaign_metric_id, date);

-- Enable Row Level Security
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own daily metrics"
ON public.daily_metrics
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily metrics"
ON public.daily_metrics
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily metrics"
ON public.daily_metrics
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily metrics"
ON public.daily_metrics
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_daily_metrics_updated_at
BEFORE UPDATE ON public.daily_metrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add start_date and end_date columns to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;