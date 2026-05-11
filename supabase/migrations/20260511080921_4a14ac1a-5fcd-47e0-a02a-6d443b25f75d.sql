-- Revoke EXECUTE on trigger-only SECURITY DEFINER functions from anon/PUBLIC
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM anon, authenticated, PUBLIC;