-- Alter total_count column to accept decimal values
ALTER TABLE campaign_metrics 
ALTER COLUMN total_count TYPE NUMERIC USING total_count::NUMERIC;