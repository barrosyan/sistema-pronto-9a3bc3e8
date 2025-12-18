-- Create table for weekly detail notes
CREATE TABLE public.weekly_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  profile_name TEXT NOT NULL,
  week_start_date DATE NOT NULL,
  observacoes TEXT,
  problemas_tecnicos TEXT,
  ajustes_na_pesquisa TEXT,
  analise_comparativa TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, profile_name, week_start_date)
);

-- Enable RLS
ALTER TABLE public.weekly_details ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own weekly details"
ON public.weekly_details
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly details"
ON public.weekly_details
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly details"
ON public.weekly_details
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly details"
ON public.weekly_details
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all weekly details"
ON public.weekly_details
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_weekly_details_updated_at
BEFORE UPDATE ON public.weekly_details
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();