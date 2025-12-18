-- Add Imported At (date) to leads so we can calculate "Leads Processados" correctly
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS imported_at date;

-- Optional: keep quick lookups fast
CREATE INDEX IF NOT EXISTS idx_leads_user_campaign_imported_at
ON public.leads (user_id, campaign, imported_at);
