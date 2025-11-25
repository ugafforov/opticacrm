-- Add tartib_raqam column to buyurtmalar table
ALTER TABLE public.buyurtmalar 
ADD COLUMN tartib_raqam integer NOT NULL DEFAULT 1;

-- Add tartib_raqam column to linza_royxatlari table
ALTER TABLE public.linza_royxatlari 
ADD COLUMN tartib_raqam integer NOT NULL DEFAULT 1;

-- Add tartib_raqam column to linza_sotuvlari table
ALTER TABLE public.linza_sotuvlari 
ADD COLUMN tartib_raqam integer NOT NULL DEFAULT 1;

-- Update existing records with sequential tartib_raqam for buyurtmalar (per user)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as rn
  FROM public.buyurtmalar
)
UPDATE public.buyurtmalar b
SET tartib_raqam = numbered.rn
FROM numbered
WHERE b.id = numbered.id;

-- Update existing records with sequential tartib_raqam for linza_royxatlari (per user)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as rn
  FROM public.linza_royxatlari
)
UPDATE public.linza_royxatlari l
SET tartib_raqam = numbered.rn
FROM numbered
WHERE l.id = numbered.id;

-- Update existing records with sequential tartib_raqam for linza_sotuvlari (per user)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as rn
  FROM public.linza_sotuvlari
)
UPDATE public.linza_sotuvlari l
SET tartib_raqam = numbered.rn
FROM numbered
WHERE l.id = numbered.id;