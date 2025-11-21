CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user'
);


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;


--
-- Name: handle_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: is_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;


SET default_table_access_method = heap;

--
-- Name: buyurtmalar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.buyurtmalar (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    sana text NOT NULL,
    mijoz text NOT NULL,
    od text NOT NULL,
    os text NOT NULL,
    "oyna_tури" text NOT NULL,
    oyna_narxi numeric(10,2) DEFAULT 0 NOT NULL,
    oprava_narxi numeric(10,2) DEFAULT 0 NOT NULL,
    oprava_turi text NOT NULL,
    jami_summa numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: chiqindilar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chiqindilar (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    item_id text NOT NULL,
    type text NOT NULL,
    data jsonb NOT NULL,
    deleted_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: linza_sotuvlari; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.linza_sotuvlari (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    sana text NOT NULL,
    kliyent text NOT NULL,
    linza_turi text NOT NULL,
    summa numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: tayyor_kozoynaklar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tayyor_kozoynaklar (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    sana text NOT NULL,
    tartib_raqam integer NOT NULL,
    kliyent text NOT NULL,
    kozoynak_turi text NOT NULL,
    summa numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: tekshiruvlar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tekshiruvlar (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    sana text NOT NULL,
    tartib_raqam integer NOT NULL,
    mijoz text NOT NULL,
    refraksiyametriya boolean DEFAULT false NOT NULL,
    tanometriya boolean DEFAULT false NOT NULL,
    jami_summa numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: buyurtmalar buyurtmalar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buyurtmalar
    ADD CONSTRAINT buyurtmalar_pkey PRIMARY KEY (id);


--
-- Name: chiqindilar chiqindilar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chiqindilar
    ADD CONSTRAINT chiqindilar_pkey PRIMARY KEY (id);


--
-- Name: linza_sotuvlari linza_sotuvlari_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linza_sotuvlari
    ADD CONSTRAINT linza_sotuvlari_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: tayyor_kozoynaklar tayyor_kozoynaklar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tayyor_kozoynaklar
    ADD CONSTRAINT tayyor_kozoynaklar_pkey PRIMARY KEY (id);


--
-- Name: tekshiruvlar tekshiruvlar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tekshiruvlar
    ADD CONSTRAINT tekshiruvlar_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: buyurtmalar update_buyurtmalar_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_buyurtmalar_updated_at BEFORE UPDATE ON public.buyurtmalar FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: linza_sotuvlari update_linza_sotuvlari_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_linza_sotuvlari_updated_at BEFORE UPDATE ON public.linza_sotuvlari FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: tayyor_kozoynaklar update_tayyor_kozoynaklar_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tayyor_kozoynaklar_updated_at BEFORE UPDATE ON public.tayyor_kozoynaklar FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: tekshiruvlar update_tekshiruvlar_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tekshiruvlar_updated_at BEFORE UPDATE ON public.tekshiruvlar FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: buyurtmalar buyurtmalar_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buyurtmalar
    ADD CONSTRAINT buyurtmalar_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: chiqindilar chiqindilar_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chiqindilar
    ADD CONSTRAINT chiqindilar_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: linza_sotuvlari linza_sotuvlari_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.linza_sotuvlari
    ADD CONSTRAINT linza_sotuvlari_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: tayyor_kozoynaklar tayyor_kozoynaklar_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tayyor_kozoynaklar
    ADD CONSTRAINT tayyor_kozoynaklar_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: tekshiruvlar tekshiruvlar_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tekshiruvlar
    ADD CONSTRAINT tekshiruvlar_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles Admins can delete user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete user roles" ON public.user_roles FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: profiles Admins can insert profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: user_roles Admins can insert user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert user roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: profiles Admins can update all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: user_roles Admins can view all user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all user roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: buyurtmalar Users can delete their own buyurtmalar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own buyurtmalar" ON public.buyurtmalar FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: chiqindilar Users can delete their own chiqindilar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own chiqindilar" ON public.chiqindilar FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: linza_sotuvlari Users can delete their own linza_sotuvlari; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own linza_sotuvlari" ON public.linza_sotuvlari FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: tayyor_kozoynaklar Users can delete their own tayyor_kozoynaklar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own tayyor_kozoynaklar" ON public.tayyor_kozoynaklar FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: tekshiruvlar Users can delete their own tekshiruvlar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own tekshiruvlar" ON public.tekshiruvlar FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: buyurtmalar Users can insert their own buyurtmalar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own buyurtmalar" ON public.buyurtmalar FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: chiqindilar Users can insert their own chiqindilar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own chiqindilar" ON public.chiqindilar FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: linza_sotuvlari Users can insert their own linza_sotuvlari; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own linza_sotuvlari" ON public.linza_sotuvlari FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: tayyor_kozoynaklar Users can insert their own tayyor_kozoynaklar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own tayyor_kozoynaklar" ON public.tayyor_kozoynaklar FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: tekshiruvlar Users can insert their own tekshiruvlar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own tekshiruvlar" ON public.tekshiruvlar FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: buyurtmalar Users can update their own buyurtmalar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own buyurtmalar" ON public.buyurtmalar FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: linza_sotuvlari Users can update their own linza_sotuvlari; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own linza_sotuvlari" ON public.linza_sotuvlari FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: tayyor_kozoynaklar Users can update their own tayyor_kozoynaklar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own tayyor_kozoynaklar" ON public.tayyor_kozoynaklar FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: tekshiruvlar Users can update their own tekshiruvlar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own tekshiruvlar" ON public.tekshiruvlar FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: buyurtmalar Users can view their own buyurtmalar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own buyurtmalar" ON public.buyurtmalar FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: chiqindilar Users can view their own chiqindilar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own chiqindilar" ON public.chiqindilar FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: linza_sotuvlari Users can view their own linza_sotuvlari; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own linza_sotuvlari" ON public.linza_sotuvlari FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: tayyor_kozoynaklar Users can view their own tayyor_kozoynaklar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own tayyor_kozoynaklar" ON public.tayyor_kozoynaklar FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: tekshiruvlar Users can view their own tekshiruvlar; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own tekshiruvlar" ON public.tekshiruvlar FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: buyurtmalar; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.buyurtmalar ENABLE ROW LEVEL SECURITY;

--
-- Name: chiqindilar; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chiqindilar ENABLE ROW LEVEL SECURITY;

--
-- Name: linza_sotuvlari; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.linza_sotuvlari ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: tayyor_kozoynaklar; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tayyor_kozoynaklar ENABLE ROW LEVEL SECURITY;

--
-- Name: tekshiruvlar; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tekshiruvlar ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


