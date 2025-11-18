-- Add source field to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source text DEFAULT 'Kontax';