
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Subscribers (admins who started the bot)
CREATE TABLE public.telegram_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id BIGINT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_subscribers ENABLE ROW LEVEL SECURITY;

-- Only admins can view subscribers; no public access. Service role bypasses RLS.
CREATE POLICY "Admins can view subscribers"
ON public.telegram_subscribers FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

-- Bot state (single row)
CREATE TABLE public.telegram_bot_state (
  id INT PRIMARY KEY CHECK (id = 1),
  update_offset BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.telegram_bot_state (id, update_offset) VALUES (1, 0);

ALTER TABLE public.telegram_bot_state ENABLE ROW LEVEL SECURITY;
-- No policies = no access for anyone except service_role.

-- Pending email auth (chat_id awaiting email)
CREATE TABLE public.telegram_pending_auth (
  chat_id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_pending_auth ENABLE ROW LEVEL SECURITY;
-- No policies = service_role only.
