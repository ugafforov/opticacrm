-- Create buyurtmalar (orders) table
CREATE TABLE public.buyurtmalar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sana TEXT NOT NULL,
  mijoz TEXT NOT NULL,
  od TEXT NOT NULL,
  os TEXT NOT NULL,
  oyna_tури TEXT NOT NULL,
  oyna_narxi DECIMAL(10,2) NOT NULL DEFAULT 0,
  oprava_narxi DECIMAL(10,2) NOT NULL DEFAULT 0,
  oprava_turi TEXT NOT NULL,
  jami_summa DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tekshiruvlar (examinations) table
CREATE TABLE public.tekshiruvlar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sana TEXT NOT NULL,
  tartib_raqam INTEGER NOT NULL,
  mijoz TEXT NOT NULL,
  refraksiyametriya BOOLEAN NOT NULL DEFAULT false,
  tanometriya BOOLEAN NOT NULL DEFAULT false,
  jami_summa DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create linza_sotuvlari (lens sales) table
CREATE TABLE public.linza_sotuvlari (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sana TEXT NOT NULL,
  kliyent TEXT NOT NULL,
  linza_turi TEXT NOT NULL,
  summa DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tayyor_kozoynaklar (ready glasses) table
CREATE TABLE public.tayyor_kozoynaklar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sana TEXT NOT NULL,
  tartib_raqam INTEGER NOT NULL,
  kliyent TEXT NOT NULL,
  kozoynak_turi TEXT NOT NULL,
  summa DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create chiqindilar (trash) table
CREATE TABLE public.chiqindilar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  type TEXT NOT NULL,
  data JSONB NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.buyurtmalar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tekshiruvlar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linza_sotuvlari ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tayyor_kozoynaklar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chiqindilar ENABLE ROW LEVEL SECURITY;

-- RLS Policies for buyurtmalar
CREATE POLICY "Users can view their own buyurtmalar"
  ON public.buyurtmalar FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own buyurtmalar"
  ON public.buyurtmalar FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own buyurtmalar"
  ON public.buyurtmalar FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own buyurtmalar"
  ON public.buyurtmalar FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for tekshiruvlar
CREATE POLICY "Users can view their own tekshiruvlar"
  ON public.tekshiruvlar FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tekshiruvlar"
  ON public.tekshiruvlar FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tekshiruvlar"
  ON public.tekshiruvlar FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tekshiruvlar"
  ON public.tekshiruvlar FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for linza_sotuvlari
CREATE POLICY "Users can view their own linza_sotuvlari"
  ON public.linza_sotuvlari FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own linza_sotuvlari"
  ON public.linza_sotuvlari FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own linza_sotuvlari"
  ON public.linza_sotuvlari FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own linza_sotuvlari"
  ON public.linza_sotuvlari FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for tayyor_kozoynaklar
CREATE POLICY "Users can view their own tayyor_kozoynaklar"
  ON public.tayyor_kozoynaklar FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tayyor_kozoynaklar"
  ON public.tayyor_kozoynaklar FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tayyor_kozoynaklar"
  ON public.tayyor_kozoynaklar FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tayyor_kozoynaklar"
  ON public.tayyor_kozoynaklar FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for chiqindilar
CREATE POLICY "Users can view their own chiqindilar"
  ON public.chiqindilar FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chiqindilar"
  ON public.chiqindilar FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chiqindilar"
  ON public.chiqindilar FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_buyurtmalar_updated_at
  BEFORE UPDATE ON public.buyurtmalar
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_tekshiruvlar_updated_at
  BEFORE UPDATE ON public.tekshiruvlar
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_linza_sotuvlari_updated_at
  BEFORE UPDATE ON public.linza_sotuvlari
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_tayyor_kozoynaklar_updated_at
  BEFORE UPDATE ON public.tayyor_kozoynaklar
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();