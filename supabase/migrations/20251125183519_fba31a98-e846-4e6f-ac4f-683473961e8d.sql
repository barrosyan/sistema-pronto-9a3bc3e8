-- Remove constraint incorreta que não inclui user_id
ALTER TABLE campaign_metrics 
DROP CONSTRAINT IF EXISTS campaign_metrics_unique_key;

-- A constraint correta campaign_metrics_user_campaign_event_profile_key já existe