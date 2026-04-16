
-- =============================================
-- Fix all RLS policies to use 'authenticated' role instead of 'public'
-- =============================================

-- bemor_tarixi
DROP POLICY IF EXISTS "Users can create their own bemor_tarixi" ON public.bemor_tarixi;
DROP POLICY IF EXISTS "Users can delete their own bemor_tarixi" ON public.bemor_tarixi;
DROP POLICY IF EXISTS "Users can update their own bemor_tarixi" ON public.bemor_tarixi;
DROP POLICY IF EXISTS "Users can view their own bemor_tarixi" ON public.bemor_tarixi;

CREATE POLICY "Users can create their own bemor_tarixi" ON public.bemor_tarixi FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own bemor_tarixi" ON public.bemor_tarixi FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own bemor_tarixi" ON public.bemor_tarixi FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own bemor_tarixi" ON public.bemor_tarixi FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- buyurtmalar
DROP POLICY IF EXISTS "Users can delete their own buyurtmalar" ON public.buyurtmalar;
DROP POLICY IF EXISTS "Users can insert their own buyurtmalar" ON public.buyurtmalar;
DROP POLICY IF EXISTS "Users can update their own buyurtmalar" ON public.buyurtmalar;
DROP POLICY IF EXISTS "Users can view their own buyurtmalar" ON public.buyurtmalar;

CREATE POLICY "Users can delete their own buyurtmalar" ON public.buyurtmalar FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own buyurtmalar" ON public.buyurtmalar FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own buyurtmalar" ON public.buyurtmalar FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own buyurtmalar" ON public.buyurtmalar FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- chiqindilar
DROP POLICY IF EXISTS "Users can delete their own chiqindilar" ON public.chiqindilar;
DROP POLICY IF EXISTS "Users can insert their own chiqindilar" ON public.chiqindilar;
DROP POLICY IF EXISTS "Users can update their own chiqindilar" ON public.chiqindilar;
DROP POLICY IF EXISTS "Users can view their own chiqindilar" ON public.chiqindilar;

CREATE POLICY "Users can delete their own chiqindilar" ON public.chiqindilar FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own chiqindilar" ON public.chiqindilar FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own chiqindilar" ON public.chiqindilar FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own chiqindilar" ON public.chiqindilar FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- linza_royxatlari
DROP POLICY IF EXISTS "Users can delete their own linza_royxatlari" ON public.linza_royxatlari;
DROP POLICY IF EXISTS "Users can insert their own linza_royxatlari" ON public.linza_royxatlari;
DROP POLICY IF EXISTS "Users can update their own linza_royxatlari" ON public.linza_royxatlari;
DROP POLICY IF EXISTS "Users can view their own linza_royxatlari" ON public.linza_royxatlari;

CREATE POLICY "Users can delete their own linza_royxatlari" ON public.linza_royxatlari FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own linza_royxatlari" ON public.linza_royxatlari FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own linza_royxatlari" ON public.linza_royxatlari FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own linza_royxatlari" ON public.linza_royxatlari FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- linza_sotuvlari
DROP POLICY IF EXISTS "Users can delete their own linza_sotuvlari" ON public.linza_sotuvlari;
DROP POLICY IF EXISTS "Users can insert their own linza_sotuvlari" ON public.linza_sotuvlari;
DROP POLICY IF EXISTS "Users can update their own linza_sotuvlari" ON public.linza_sotuvlari;
DROP POLICY IF EXISTS "Users can view their own linza_sotuvlari" ON public.linza_sotuvlari;

CREATE POLICY "Users can delete their own linza_sotuvlari" ON public.linza_sotuvlari FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own linza_sotuvlari" ON public.linza_sotuvlari FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own linza_sotuvlari" ON public.linza_sotuvlari FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own linza_sotuvlari" ON public.linza_sotuvlari FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- qarz_tolovlari
DROP POLICY IF EXISTS "Users can delete their own qarz_tolovlari" ON public.qarz_tolovlari;
DROP POLICY IF EXISTS "Users can insert their own qarz_tolovlari" ON public.qarz_tolovlari;
DROP POLICY IF EXISTS "Users can update their own qarz_tolovlari" ON public.qarz_tolovlari;
DROP POLICY IF EXISTS "Users can view their own qarz_tolovlari" ON public.qarz_tolovlari;

CREATE POLICY "Users can delete their own qarz_tolovlari" ON public.qarz_tolovlari FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own qarz_tolovlari" ON public.qarz_tolovlari FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own qarz_tolovlari" ON public.qarz_tolovlari FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own qarz_tolovlari" ON public.qarz_tolovlari FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- qarzdorlar
DROP POLICY IF EXISTS "Users can delete their own qarzdorlar" ON public.qarzdorlar;
DROP POLICY IF EXISTS "Users can insert their own qarzdorlar" ON public.qarzdorlar;
DROP POLICY IF EXISTS "Users can update their own qarzdorlar" ON public.qarzdorlar;
DROP POLICY IF EXISTS "Users can view their own qarzdorlar" ON public.qarzdorlar;

CREATE POLICY "Users can delete their own qarzdorlar" ON public.qarzdorlar FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own qarzdorlar" ON public.qarzdorlar FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own qarzdorlar" ON public.qarzdorlar FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own qarzdorlar" ON public.qarzdorlar FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- tayyor_kozoynaklar
DROP POLICY IF EXISTS "Users can delete their own tayyor_kozoynaklar" ON public.tayyor_kozoynaklar;
DROP POLICY IF EXISTS "Users can insert their own tayyor_kozoynaklar" ON public.tayyor_kozoynaklar;
DROP POLICY IF EXISTS "Users can update their own tayyor_kozoynaklar" ON public.tayyor_kozoynaklar;
DROP POLICY IF EXISTS "Users can view their own tayyor_kozoynaklar" ON public.tayyor_kozoynaklar;

CREATE POLICY "Users can delete their own tayyor_kozoynaklar" ON public.tayyor_kozoynaklar FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tayyor_kozoynaklar" ON public.tayyor_kozoynaklar FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tayyor_kozoynaklar" ON public.tayyor_kozoynaklar FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own tayyor_kozoynaklar" ON public.tayyor_kozoynaklar FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- tekshiruvlar
DROP POLICY IF EXISTS "Users can delete their own tekshiruvlar" ON public.tekshiruvlar;
DROP POLICY IF EXISTS "Users can insert their own tekshiruvlar" ON public.tekshiruvlar;
DROP POLICY IF EXISTS "Users can update their own tekshiruvlar" ON public.tekshiruvlar;
DROP POLICY IF EXISTS "Users can view their own tekshiruvlar" ON public.tekshiruvlar;

CREATE POLICY "Users can delete their own tekshiruvlar" ON public.tekshiruvlar FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tekshiruvlar" ON public.tekshiruvlar FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tekshiruvlar" ON public.tekshiruvlar FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own tekshiruvlar" ON public.tekshiruvlar FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- xarajatlar
DROP POLICY IF EXISTS "Users can delete their own xarajatlar" ON public.xarajatlar;
DROP POLICY IF EXISTS "Users can insert their own xarajatlar" ON public.xarajatlar;
DROP POLICY IF EXISTS "Users can update their own xarajatlar" ON public.xarajatlar;
DROP POLICY IF EXISTS "Users can view their own xarajatlar" ON public.xarajatlar;

CREATE POLICY "Users can delete their own xarajatlar" ON public.xarajatlar FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own xarajatlar" ON public.xarajatlar FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own xarajatlar" ON public.xarajatlar FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own xarajatlar" ON public.xarajatlar FOR SELECT TO authenticated USING (auth.uid() = user_id);
