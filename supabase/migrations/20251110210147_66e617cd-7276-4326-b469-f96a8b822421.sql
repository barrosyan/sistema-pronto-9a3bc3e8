-- Add unique constraint to campaign_metrics table
ALTER TABLE campaign_metrics 
ADD CONSTRAINT campaign_metrics_unique_key 
UNIQUE (campaign_name, event_type, profile_name);