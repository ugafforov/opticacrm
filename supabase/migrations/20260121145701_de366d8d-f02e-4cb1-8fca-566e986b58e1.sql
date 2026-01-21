-- Add oxirgi_aloqa column to linza_royxatlari table for tracking last contact
ALTER TABLE public.linza_royxatlari 
ADD COLUMN oxirgi_aloqa timestamp with time zone DEFAULT NULL;