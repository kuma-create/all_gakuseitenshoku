--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8
-- Dumped by pg_dump version 17.5

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now(),
    actor text NOT NULL,
    role text NOT NULL,
    action text NOT NULL,
    target text NOT NULL,
    ip_address text NOT NULL,
    title text,
    description text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.activity_logs OWNER TO postgres;

--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: idx_activity_logs_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_logs_action ON public.activity_logs USING btree (action);


--
-- Name: idx_activity_logs_actor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_logs_actor ON public.activity_logs USING btree (actor);


--
-- Name: idx_activity_logs_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_logs_role ON public.activity_logs USING btree (role);


--
-- Name: idx_activity_logs_timestamp; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_logs_timestamp ON public.activity_logs USING btree ("timestamp");


--
-- Name: activity_logs update_activity_logs_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_activity_logs_updated_at BEFORE UPDATE ON public.activity_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activity_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: activity_logs admin_only; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_only ON public.activity_logs USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: activity_logs admins_can_read_logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admins_can_read_logs ON public.activity_logs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = 'admin'::text)))));


--
-- Name: TABLE activity_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.activity_logs TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.activity_logs TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.activity_logs TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.activity_logs TO admin;


--
-- PostgreSQL database dump complete
--

