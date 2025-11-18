-- Add unique constraints for upsert operations

-- Constraint for campaign_metrics table
ALTER TABLE public.campaign_metrics 
ADD CONSTRAINT campaign_metrics_user_campaign_event_profile_key 
UNIQUE (user_id, campaign_name, event_type, profile_name);

-- Constraint for leads table
ALTER TABLE public.leads 
ADD CONSTRAINT leads_user_campaign_name_key 
UNIQUE (user_id, campaign, name);