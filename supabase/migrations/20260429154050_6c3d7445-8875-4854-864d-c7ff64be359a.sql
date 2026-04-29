
-- Sozlamalar
CREATE TABLE public.telegram_settings (
  id INT PRIMARY KEY CHECK (id = 1),
  source_user_id UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.telegram_settings (id, source_user_id) VALUES (1, NULL);

ALTER TABLE public.telegram_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage telegram settings" ON public.telegram_settings
FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Ruxsat berilganlar
CREATE TABLE public.telegram_allowed_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT,
  telegram_chat_id BIGINT UNIQUE,
  phone TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (telegram_chat_id IS NOT NULL OR phone IS NOT NULL)
);

ALTER TABLE public.telegram_allowed_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage allowed users" ON public.telegram_allowed_users
FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Subscribers jadvalini soddalashtiramiz: email/user_id majburiy emas
ALTER TABLE public.telegram_subscribers
  DROP CONSTRAINT IF EXISTS telegram_subscribers_user_id_fkey;
ALTER TABLE public.telegram_subscribers ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.telegram_subscribers ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.telegram_subscribers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.telegram_subscribers ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.telegram_subscribers ADD COLUMN IF NOT EXISTS username TEXT;
