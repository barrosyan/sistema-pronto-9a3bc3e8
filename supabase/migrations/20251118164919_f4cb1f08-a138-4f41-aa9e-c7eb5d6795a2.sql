-- Add unique constraint to campaigns table for user_id and name
ALTER TABLE public.campaigns 
ADD CONSTRAINT campaigns_user_id_name_key UNIQUE (user_id, name);