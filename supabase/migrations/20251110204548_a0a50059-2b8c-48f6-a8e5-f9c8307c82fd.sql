-- Create campaign_metrics table
CREATE TABLE IF NOT EXISTS public.campaign_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  profile_name TEXT NOT NULL,
  total_count INTEGER DEFAULT 0,
  daily_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign TEXT NOT NULL,
  linkedin TEXT,
  name TEXT NOT NULL,
  position TEXT,
  company TEXT,
  status TEXT NOT NULL CHECK (status IN ('positive', 'negative', 'pending')),
  
  -- Positive lead fields
  positive_response_date TEXT,
  transfer_date TEXT,
  status_details TEXT,
  comments TEXT,
  follow_up_1_date TEXT,
  follow_up_1_comments TEXT,
  follow_up_2_date TEXT,
  follow_up_2_comments TEXT,
  follow_up_3_date TEXT,
  follow_up_3_comments TEXT,
  follow_up_4_date TEXT,
  follow_up_4_comments TEXT,
  observations TEXT,
  meeting_schedule_date TEXT,
  meeting_date TEXT,
  proposal_date TEXT,
  proposal_value NUMERIC,
  sale_date TEXT,
  sale_value NUMERIC,
  profile TEXT,
  classification TEXT,
  attended_webinar BOOLEAN DEFAULT false,
  whatsapp TEXT,
  stand_day TEXT,
  pavilion TEXT,
  stand TEXT,
  
  -- Negative lead fields
  negative_response_date TEXT,
  had_follow_up BOOLEAN DEFAULT false,
  follow_up_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public read access (data is managed by the system)
CREATE POLICY "Anyone can read campaign metrics"
  ON public.campaign_metrics
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert campaign metrics"
  ON public.campaign_metrics
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update campaign metrics"
  ON public.campaign_metrics
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete campaign metrics"
  ON public.campaign_metrics
  FOR DELETE
  USING (true);

CREATE POLICY "Anyone can read leads"
  ON public.leads
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert leads"
  ON public.leads
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update leads"
  ON public.leads
  FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete leads"
  ON public.leads
  FOR DELETE
  USING (true);

-- Create indexes for better performance
CREATE INDEX idx_campaign_metrics_campaign_name ON public.campaign_metrics(campaign_name);
CREATE INDEX idx_campaign_metrics_profile_name ON public.campaign_metrics(profile_name);
CREATE INDEX idx_leads_campaign ON public.leads(campaign);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_name ON public.leads(name);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_campaign_metrics_updated_at
  BEFORE UPDATE ON public.campaign_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();