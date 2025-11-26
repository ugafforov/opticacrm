-- Create patient history table
CREATE TABLE public.bemor_tarixi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bemor_id UUID NOT NULL REFERENCES public.linza_royxatlari(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  sana TEXT NOT NULL,
  od TEXT NOT NULL,
  os TEXT NOT NULL,
  linza_turi TEXT NOT NULL,
  telefon TEXT,
  mijoz TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.bemor_tarixi ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own bemor_tarixi" 
ON public.bemor_tarixi 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bemor_tarixi" 
ON public.bemor_tarixi 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bemor_tarixi" 
ON public.bemor_tarixi 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bemor_tarixi" 
ON public.bemor_tarixi 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for better performance when querying by bemor_id
CREATE INDEX idx_bemor_tarixi_bemor_id ON public.bemor_tarixi(bemor_id);

-- Enable realtime for the history table
ALTER PUBLICATION supabase_realtime ADD TABLE public.bemor_tarixi;