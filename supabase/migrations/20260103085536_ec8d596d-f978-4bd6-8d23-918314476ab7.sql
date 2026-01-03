-- Create debt payments table for payment history
CREATE TABLE public.qarz_tolovlari (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  qarzdor_id UUID NOT NULL REFERENCES public.qarzdorlar(id) ON DELETE CASCADE,
  summa NUMERIC NOT NULL DEFAULT 0,
  sana TEXT NOT NULL,
  izoh TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.qarz_tolovlari ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own qarz_tolovlari"
  ON public.qarz_tolovlari
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own qarz_tolovlari"
  ON public.qarz_tolovlari
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own qarz_tolovlari"
  ON public.qarz_tolovlari
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own qarz_tolovlari"
  ON public.qarz_tolovlari
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add new columns to qarzdorlar table
ALTER TABLE public.qarzdorlar 
ADD COLUMN holat TEXT NOT NULL DEFAULT 'tollanmagan',
ADD COLUMN qoldiq_summa NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN oxirgi_aloqa TIMESTAMP WITH TIME ZONE;