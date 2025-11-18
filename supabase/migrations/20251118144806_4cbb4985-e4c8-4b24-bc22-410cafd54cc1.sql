-- Add company field to campaigns table
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS company text;