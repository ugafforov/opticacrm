-- Create table for linza royxatlari (lens registry)
CREATE TABLE IF NOT EXISTS public.linza_royxatlari (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sana TEXT NOT NULL,
  mijoz TEXT NOT NULL,
  od TEXT NOT NULL,
  os TEXT NOT NULL,
  telefon TEXT NOT NULL,
  linza_turi TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.linza_royxatlari ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for linza_royxatlari
CREATE POLICY "Users can view their own linza_royxatlari"
ON public.linza_royxatlari
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own linza_royxatlari"
ON public.linza_royxatlari
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own linza_royxatlari"
ON public.linza_royxatlari
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own linza_royxatlari"
ON public.linza_royxatlari
FOR DELETE
USING (auth.uid() = user_id);