-- linza_royxatlari jadvaliga tugilan_yili ustunini qo'shish
ALTER TABLE public.linza_royxatlari
ADD COLUMN tugilan_yili INTEGER;

-- bemor_tarixi jadvaliga ham tugilan_yili ustunini qo'shish
ALTER TABLE public.bemor_tarixi
ADD COLUMN tugilan_yili INTEGER;