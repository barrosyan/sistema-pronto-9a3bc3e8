-- Now add the unique constraint to leads
ALTER TABLE leads 
ADD CONSTRAINT leads_unique_user_campaign_name 
UNIQUE (user_id, campaign, name);