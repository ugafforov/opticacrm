-- Create xarajatlar (expenses) table
CREATE TABLE public.xarajatlar (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    tartib_raqam INTEGER NOT NULL DEFAULT 1,
    sana TEXT NOT NULL,
    kategoriya TEXT NOT NULL,
    tavsif TEXT,
    summa NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.xarajatlar ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own xarajatlar" 
ON public.xarajatlar 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own xarajatlar" 
ON public.xarajatlar 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own xarajatlar" 
ON public.xarajatlar 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own xarajatlar" 
ON public.xarajatlar 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_xarajatlar_updated_at
BEFORE UPDATE ON public.xarajatlar
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();