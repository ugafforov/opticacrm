-- Create qarzdorlar table for tracking debtors
CREATE TABLE public.qarzdorlar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tartib_raqam INTEGER NOT NULL DEFAULT 1,
  sana TEXT NOT NULL,
  mijoz TEXT NOT NULL,
  telefon TEXT,
  qarz_summasi NUMERIC NOT NULL DEFAULT 0,
  izoh TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.qarzdorlar ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own qarzdorlar"
ON public.qarzdorlar
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own qarzdorlar"
ON public.qarzdorlar
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own qarzdorlar"
ON public.qarzdorlar
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own qarzdorlar"
ON public.qarzdorlar
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_qarzdorlar_updated_at
BEFORE UPDATE ON public.qarzdorlar
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();