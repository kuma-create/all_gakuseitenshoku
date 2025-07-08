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

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA public;


ALTER SCHEMA public OWNER TO pg_database_owner;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: application_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.application_status AS ENUM (
    '未対応',
    '書類選考中',
    '一次面接調整中',
    '一次面接済',
    '二次面接調整中',
    '二次面接済',
    '最終面接調整中',
    '最終面接済',
    '内定',
    '内定辞退',
    '不採用',
    'スカウト承諾'
);


ALTER TYPE public.application_status OWNER TO postgres;

--
-- Name: event_format; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.event_format AS ENUM (
    'online',
    'onsite',
    'hybrid'
);


ALTER TYPE public.event_format OWNER TO postgres;

--
-- Name: grandprix_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.grandprix_type AS ENUM (
    'case',
    'webtest',
    'bizscore'
);


ALTER TYPE public.grandprix_type OWNER TO postgres;

--
-- Name: offer_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.offer_status AS ENUM (
    'pending',
    'accepted',
    'rejected'
);


ALTER TYPE public.offer_status OWNER TO postgres;

--
-- Name: question_category; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.question_category AS ENUM (
    'web_lang',
    'web_math',
    'case',
    'biz_battle',
    'spi_language'
);


ALTER TYPE public.question_category OWNER TO postgres;

--
-- Name: role_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.role_enum AS ENUM (
    'student',
    'company',
    'company_admin',
    'admin'
);


ALTER TYPE public.role_enum OWNER TO postgres;

--
-- Name: section_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.section_type AS ENUM (
    'quant',
    'verbal',
    'english',
    'logical'
);


ALTER TYPE public.section_type OWNER TO postgres;

--
-- Name: selection_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.selection_type AS ENUM (
    'fulltime',
    'internship_short',
    'event'
);


ALTER TYPE public.selection_type OWNER TO postgres;

--
-- Name: session_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.session_status AS ENUM (
    'in_progress',
    'submitted',
    'graded'
);


ALTER TYPE public.session_status OWNER TO postgres;

--
-- Name: test_code; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.test_code AS ENUM (
    'spi',
    'tamatebako',
    'case',
    'bizscore'
);


ALTER TYPE public.test_code OWNER TO postgres;

--
-- Name: accept_offer(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.accept_offer(p_scout_id uuid) RETURNS TABLE(room_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  v_company_id uuid;
  v_student_id uuid;
  v_room_id   uuid;
begin
  -- 対象スカウトの company_id / student_id を取得
  select company_id, student_id
    into v_company_id, v_student_id
  from scouts
  where id = p_scout_id;

  -- 既存チャットルームがあれば取得
  select id
    into v_room_id
  from chat_rooms
  where company_id = v_company_id
    and student_id = v_student_id
  limit 1;

  -- 無ければ新規作成
  if v_room_id is null then
    insert into chat_rooms (company_id, student_id)
    values (v_company_id, v_student_id)
    returning id into v_room_id;
  end if;

  -- scouts を更新
  update scouts
  set    status       = 'accepted',
         chat_room_id = v_room_id
  where  id = p_scout_id;

  -- 返却値
  return query select v_room_id;
end;
$$;


ALTER FUNCTION public.accept_offer(p_scout_id uuid) OWNER TO postgres;

--
-- Name: add_creator_to_members(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.add_creator_to_members() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.created_by is null then
    return new;
  end if;

  insert into public.company_members(company_id, user_id, role)
  values (new.id, new.created_by, 'admin')
  on conflict do nothing;   -- 二重挿入防止

  return new;
end; $$;


ALTER FUNCTION public.add_creator_to_members() OWNER TO postgres;

--
-- Name: add_owner_to_company_members(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.add_owner_to_company_members() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  insert into company_members (company_id, user_id, role)
  values (new.id, new.user_id, 'owner');
  return new;
end;
$$;


ALTER FUNCTION public.add_owner_to_company_members() OWNER TO postgres;

--
-- Name: auto_grade_answer(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.auto_grade_answer(p_question_id uuid, p_answer_raw jsonb) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
declare
  v_q        question_bank%rowtype;
  v_text     text;
  v_hit      int := 0;
  kw         text;
begin
  select * into v_q from question_bank where id = p_question_id;

  -- 択一 ―――――――――――――――――――――――――――――――――
  if v_q.category in ('web_lang','web_math') then
    return case
      when (p_answer_raw->>'choice')::int = v_q.correct_choice then 1
      else 0
    end;
  end if;

  -- 自由記述 ――――――――――――――――――――――――――――――
  v_text := lower(coalesce(p_answer_raw->>'text',''));

  if v_q.expected_kw is null then
    return 0;
  end if;

  foreach kw in array v_q.expected_kw loop
    if v_text like '%' || lower(kw) || '%' then
      v_hit := v_hit + 1;
    end if;
  end loop;

  return (v_hit::numeric /
          greatest(array_length(v_q.expected_kw,1),1)) * 5;  -- ×5 点
end;
$$;


ALTER FUNCTION public.auto_grade_answer(p_question_id uuid, p_answer_raw jsonb) OWNER TO postgres;

--
-- Name: avg_response_time(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.avg_response_time() RETURNS TABLE(avg_response_sec double precision)
    LANGUAGE sql STABLE
    AS $$
  with replies as (
    select
      m2.created_at - m1.created_at as diff
    from messages m1
    join messages m2
      on m2.chat_room_id = m1.chat_room_id
      and m1.sender_id <> m2.sender_id
      and m2.created_at > m1.created_at
  )
  select avg(extract(epoch from diff)) as avg_response_sec
  from replies;
$$;


ALTER FUNCTION public.avg_response_time() OWNER TO postgres;

--
-- Name: avg_response_time_sec(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.avg_response_time_sec() RETURNS TABLE(avg_response_sec numeric)
    LANGUAGE sql
    AS $$
  select avg(extract(epoch from (answered_at - created_at))) as avg_response_sec
  from   messages
  where  answered_at is not null;
$$;


ALTER FUNCTION public.avg_response_time_sec() OWNER TO postgres;

--
-- Name: calculate_profile_completion(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_profile_completion(p_user_id uuid) RETURNS numeric
    LANGUAGE sql SECURITY DEFINER
    AS $$
  select
    (
      (full_name        is not null)::int +
      (avatar_url       is not null)::int +
      (prefecture       is not null)::int +
      (graduation_month is not null)::int +  -- ← 修正
      (about            is not null)::int
    )::numeric / 5
  from student_profiles
  where user_id = p_user_id;
$$;


ALTER FUNCTION public.calculate_profile_completion(p_user_id uuid) OWNER TO postgres;

--
-- Name: calculate_resume_completion(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_resume_completion(p_user_id uuid) RETURNS TABLE(score numeric, missing text[])
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_resume record;
  v_basic  jsonb;
  v_pr     jsonb;
  v_cond   jsonb;
  v_filled int  := 0;
  v_miss   text[] := '{}';
  k        text;
BEGIN
  /* 1) 最新行を 1 件取得 --------------------------------------------- */
  SELECT form_data
    INTO v_resume
    FROM public.resumes
   WHERE user_id = p_user_id
   ORDER BY updated_at DESC NULLS LAST,
            created_at DESC NULLS LAST,
            id DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::numeric, '{}'::text[];
    RETURN;
  END IF;

  /* 2) ネスト取得 ----------------------------------------------------- */
  v_basic := v_resume.form_data -> 'basic';
  v_pr    := v_resume.form_data -> 'pr';
  v_cond  := v_resume.form_data -> 'conditions';

  /* 3) basic 7 -------------------------------------------------------- */
  FOREACH k IN ARRAY
    ARRAY['lastName','firstName','lastNameKana','firstNameKana',
          'birthdate','gender','address']
  LOOP
    IF COALESCE(TRIM(v_basic ->> k), '') <> '' THEN
      v_filled := v_filled + 1;
    ELSE
      v_miss := ARRAY_APPEND(v_miss, k);
    END IF;
  END LOOP;

  /* 4) pr 3 ----------------------------------------------------------- */
  FOREACH k IN ARRAY ARRAY['title','content','motivation'] LOOP
    IF COALESCE(TRIM(v_pr ->> k), '') <> '' THEN
      v_filled := v_filled + 1;
    ELSE
      v_miss := ARRAY_APPEND(v_miss, k);
    END IF;
  END LOOP;

  /* 5) 条件 5（配列 4 + workStyle 1） -------------------------------- */
  FOREACH k IN ARRAY
    ARRAY['jobTypes','locations','industries','workPreferences']
  LOOP
    IF JSONB_ARRAY_LENGTH(COALESCE(v_cond -> k, '[]')) > 0 THEN
      v_filled := v_filled + 1;
    ELSE
      v_miss := ARRAY_APPEND(v_miss, k);
    END IF;
  END LOOP;

  IF COALESCE(TRIM(v_cond ->> 'workStyle'), '') <> '' THEN
    v_filled := v_filled + 1;
  ELSE
    v_miss := ARRAY_APPEND(v_miss, 'workStyle');
  END IF;

  /* 6) スコア算出 ----------------------------------------------------- */
  RETURN QUERY
    SELECT ROUND(v_filled::numeric / 15, 4), v_miss;
END;
$$;


ALTER FUNCTION public.calculate_resume_completion(p_user_id uuid) OWNER TO postgres;

--
-- Name: calculate_work_history_completion(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_work_history_completion(p_user_id uuid) RETURNS TABLE(score numeric, missing text[])
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_resume   record;
  v_arr      jsonb[];
  v_work     jsonb;
  v_filled   int := 0;
  v_total    int := 0;
  v_miss     text[] := '{}';
BEGIN
  /* 1. レジュメ行取得 */
  SELECT work_experiences
    INTO v_resume
    FROM public.resumes
   WHERE user_id = p_user_id
   LIMIT 1;

  IF NOT FOUND
     OR v_resume.work_experiences IS NULL
     OR jsonb_typeof(v_resume.work_experiences) <> 'array'
     OR jsonb_array_length(v_resume.work_experiences) = 0 THEN
    RETURN QUERY SELECT 0::numeric, '{}'::text[];
    RETURN;
  END IF;

  v_arr := ARRAY(SELECT jsonb_array_elements(v_resume.work_experiences));

  /* 2. 行ごとに必須 5 項目をチェック */
  FOREACH v_work IN ARRAY v_arr LOOP
    -- company
    v_total := v_total + 1;
    IF COALESCE(TRIM(v_work ->> 'company'), '') <> '' THEN
      v_filled := v_filled + 1;
    ELSE
      v_miss := ARRAY_APPEND(v_miss, 'company');
    END IF;

    -- position
    v_total := v_total + 1;
    IF COALESCE(TRIM(v_work ->> 'position'), '') <> '' THEN
      v_filled := v_filled + 1;
    ELSE
      v_miss := ARRAY_APPEND(v_miss, 'position');
    END IF;

    -- startDate
    v_total := v_total + 1;
    IF COALESCE(TRIM(v_work ->> 'startDate'), '') <> '' THEN
      v_filled := v_filled + 1;
    ELSE
      v_miss := ARRAY_APPEND(v_miss, 'startDate');
    END IF;

    -- endDate or isCurrent
    v_total := v_total + 1;
    IF (COALESCE(TRIM(v_work ->> 'endDate'), '') <> '')
       OR ((v_work ->> 'isCurrent')::boolean IS TRUE) THEN
      v_filled := v_filled + 1;
    ELSE
      v_miss := ARRAY_APPEND(v_miss, 'endDate');
    END IF;

    -- description
    v_total := v_total + 1;
    IF COALESCE(TRIM(v_work ->> 'description'), '') <> '' THEN
      v_filled := v_filled + 1;
    ELSE
      v_miss := ARRAY_APPEND(v_miss, 'description');
    END IF;
  END LOOP;

  /* 3. スコア算出 */
  IF v_total = 0 THEN
    RETURN QUERY SELECT 0::numeric, v_miss;
  ELSE
    RETURN QUERY
      SELECT ROUND(v_filled::numeric / v_total, 4) AS score,
             v_miss                               AS missing;
  END IF;
END;
$$;


ALTER FUNCTION public.calculate_work_history_completion(p_user_id uuid) OWNER TO postgres;

--
-- Name: count_unread(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.count_unread() RETURNS integer
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select count(*)
  from public.notifications
  where user_id = auth.uid()
    and is_read = false;
$$;


ALTER FUNCTION public.count_unread() OWNER TO postgres;

--
-- Name: count_unread(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.count_unread(_uid uuid) RETURNS bigint
    LANGUAGE sql
    AS $$
  select count(*) from notifications
  where user_id = _uid and is_read = false;
$$;


ALTER FUNCTION public.count_unread(_uid uuid) OWNER TO postgres;

--
-- Name: create_referral_code(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_referral_code() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  new_code text;
begin
  new_code := substring(encode(gen_random_bytes(4), 'hex') for 8); -- 8桁16進
  insert into referral_codes(user_id, code)
    values (auth.uid(), new_code)
    on conflict (user_id)         -- ← 制約が付いたので衝突解決できる
    do update set code = excluded.code
    returning code into new_code;
  return new_code;
end;
$$;


ALTER FUNCTION public.create_referral_code() OWNER TO postgres;

--
-- Name: custom_access_token_hook(uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.custom_access_token_hook(uid uuid, email text, claims jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  r text;
begin
  -- user_roles からロール取得
  select role into r
  from   public.user_roles
  where  user_id = uid;

  if r is null then
    r := 'student';
  end if;

  -- 既存 claims (claims) にマージして返す
  return coalesce(claims, '{}'::jsonb)
         || jsonb_build_object(
              'role',      r,
              'is_admin',  (r = 'admin')
            );
exception
  when others then
    raise notice '[custom_access_token_hook] %', sqlerrm;
    -- 何があっても NULL を返さない
    return jsonb_build_object('hook_error', sqlerrm);
end;
$$;


ALTER FUNCTION public.custom_access_token_hook(uid uuid, email text, claims jsonb) OWNER TO postgres;

--
-- Name: dashboard_overview(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.dashboard_overview() RETURNS TABLE(students integer, companies integer, applications integer, scouts integer)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select
    (select count(*) from student_profiles),   -- public スキーマ
    (select count(*) from companies),
    (select count(*) from applications),
    (select count(*) from scouts);
$$;


ALTER FUNCTION public.dashboard_overview() OWNER TO postgres;

--
-- Name: enqueue_email_notification(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.enqueue_email_notification() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  -- channel='email' の行だけ送信
  if (NEW.channel = 'email') then
    perform
      supabase_functions.http_request(
        -- あなたのプロジェクト URL に置き換え
        'https://cpinzmlynykyrxdvkshl.supabase.co/functions/v1/send-email',
        'POST',
        'application/json',
        json_build_object(
          'notification_id', NEW.id,
          'user_id',         NEW.user_id
        )::text
      );
  end if;
  return NEW;
end;
$$;


ALTER FUNCTION public.enqueue_email_notification() OWNER TO postgres;

--
-- Name: ensure_user_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.ensure_user_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.user_id is null then
    new.user_id := new.id;      -- id をそのままコピー
  end if;
  return new;
end;
$$;


ALTER FUNCTION public.ensure_user_id() OWNER TO postgres;

--
-- Name: f_create_student_profile(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.f_create_student_profile() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  insert into public.student_profiles(id, auth_user_id, full_name, created_at)
  values (new.id, new.id, new.raw_user_meta_data->>'full_name', now())
  on conflict (id) do update
      set auth_user_id = excluded.auth_user_id;
  return new;
end;
$$;


ALTER FUNCTION public.f_create_student_profile() OWNER TO postgres;

--
-- Name: filling_company_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.filling_company_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET row_security TO 'off'
    AS $$
begin
  -- jobs に紐づく company_id を自動で埋める
  new.company_id := (
    select company_id
    from   public.jobs
    where  id = new.job_id
    limit  1
  );
  return new;
end;
$$;


ALTER FUNCTION public.filling_company_id() OWNER TO postgres;

--
-- Name: fn_create_profile_from_student(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_create_profile_from_student() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.student_profiles (user_id, full_name)
  VALUES (NEW.user_id, NEW.name)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.fn_create_profile_from_student() OWNER TO postgres;

--
-- Name: fn_notify_send_email(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_notify_send_email() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  perform net.http_post(
    'https://cpinzmlynykyrxdvkshl.functions.supabase.co/send-email',
    to_jsonb(NEW),
    '{}'::jsonb,                     -- params
    jsonb_build_object(              -- headers
      'Content-Type', 'application/json'
    ),
    1000
  );
  return NEW;
end;
$$;


ALTER FUNCTION public.fn_notify_send_email() OWNER TO postgres;

--
-- Name: fn_offer_approved_notify(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_offer_approved_notify() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
  target_uid uuid;
  comp_name  text;
begin
  ----------------------------------------------------------------
  -- 1. Company メール宛先 (代表 Auth UID) を取得
  ----------------------------------------------------------------
  select cm.user_id, c.name into target_uid, comp_name
  from public.company_members cm
  join public.companies       c on c.id = cm.company_id
  where cm.company_id = NEW.company_id
  limit 1;

  if target_uid is null then
    -- 宛先が無い場合は何もしない
    return new;
  end if;

  ----------------------------------------------------------------
  -- 2. notifications に挿入 → 既存トリガでメール送信される
  ----------------------------------------------------------------
  insert into public.notifications(
      user_id,
      title,
      message,
      channel,
      notification_type,
      send_status)
  values (
      target_uid,
      'オファーが承認されました',
      '学生がオファーを承認しました。チャットで詳細を確認してください。',
      'email',
      'offer',
      null               -- ← send_status = NULL で既存トリガが発火
  );

  return new;
end;
$$;


ALTER FUNCTION public.fn_offer_approved_notify() OWNER TO postgres;

--
-- Name: fn_scout_accepted_notify(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_scout_accepted_notify() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
  target_uid uuid;
  comp_name  text;
begin
  select cm.user_id, c.name
    into target_uid, comp_name
  from public.company_members cm
  join public.companies       c on c.id = cm.company_id
  where cm.company_id = NEW.company_id
  limit 1;

  if target_uid is null then
    return NEW;
  end if;

  insert into public.notifications(
      user_id,
      title,
      message,
      channel,
      notification_type,
      send_status)               -- ★ ここを pending に
  values (
      target_uid,
      'スカウトが受諾されました',
      '学生がスカウトを受諾しました。チャットで詳細を確認してください。',
      'email',
      'scout_accepted',
      'pending'                  -- ★ NULL → 'pending'
  );

  return NEW;
end;
$$;


ALTER FUNCTION public.fn_scout_accepted_notify() OWNER TO postgres;

--
-- Name: get_leaderboard(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_leaderboard(p_limit integer DEFAULT 100) RETURNS TABLE(student_id uuid, total_score numeric, rank integer, full_name text, avatar text)
    LANGUAGE sql
    AS $$
  select gr.student_id,
         gr.total_score,
         gr.rank,
         sp.full_name,
         sp.avatar                       -- ← avatar 列に合わせて
    from gp_rank gr
    left join student_profiles sp on sp.id = gr.student_id
   order by gr.rank
   limit p_limit
$$;


ALTER FUNCTION public.get_leaderboard(p_limit integer) OWNER TO postgres;

--
-- Name: get_my_chat_rooms(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_my_chat_rooms(p_user uuid) RETURNS TABLE(id uuid, company_id uuid, student_id uuid, updated_at timestamp with time zone, company_name text, company_logo text, last_message text, last_created timestamp with time zone, is_unread boolean)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $$
  with my_companies as (
    select company_id
    from public.company_members
    where user_id = p_user
  )
  , my_rooms as (
    select cr.*
    from public.chat_rooms cr
    where cr.student_id = (
            select id from public.student_profiles where user_id = p_user
          )
       or cr.company_id in (select company_id from my_companies)
  )
  , latest as (
    select distinct on (m.chat_room_id) *
    from public.messages m
    where m.chat_room_id in (select id from my_rooms)
    order by m.chat_room_id, m.created_at desc
  )
  select
    r.id,
    r.company_id,
    r.student_id,
    r.updated_at,
    c.name  as company_name,
    c.logo  as company_logo,
    l.content     as last_message,
    l.created_at  as last_created,
    (not l.is_read) and l.sender_id <> p_user as is_unread
  from my_rooms r
  join public.companies c on c.id = r.company_id
  left join latest l       on l.chat_room_id = r.id
  order by r.updated_at desc;
$$;


ALTER FUNCTION public.get_my_chat_rooms(p_user uuid) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: chat_rooms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_rooms (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    company_id uuid,
    student_id uuid,
    job_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    scout_id uuid
);


ALTER TABLE public.chat_rooms OWNER TO postgres;

--
-- Name: get_or_create_chat_room_from_scout(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_or_create_chat_room_from_scout(p_scout_id uuid) RETURNS public.chat_rooms
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  v_room chat_rooms;
begin
  -- scouts から company_id, student_id を取得
  select s.company_id, s.student_id
    into v_room
    from scouts s
   where s.id = p_scout_id;

  -- 既にあるか確認
  select * into v_room
    from chat_rooms
   where company_id = v_room.company_id
     and student_id = v_room.student_id
   limit 1;

  if v_room.id is null then
    insert into chat_rooms(company_id, student_id)
      values (v_room.company_id, v_room.student_id)
      returning * into v_room;
  end if;

  return v_room;
end;
$$;


ALTER FUNCTION public.get_or_create_chat_room_from_scout(p_scout_id uuid) OWNER TO postgres;

--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_role(p_uid uuid) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select role
  from user_roles
  where user_id = p_uid
  limit 1
$$;


ALTER FUNCTION public.get_user_role(p_uid uuid) OWNER TO postgres;

--
-- Name: grade_session(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.grade_session(p_session_id uuid) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
declare
  v_total numeric;
begin
  -- 問別採点
  update session_answers sa
  set score = auto_grade_answer(sa.question_id, sa.answer_raw),
      is_correct = (score = 1)
  where sa.session_id = p_session_id;

  -- session 集計
  select sum(score) into v_total
    from session_answers
   where session_id = p_session_id;

  update challenge_sessions
  set ended_at    = now(),
      elapsed_sec = extract(epoch from now()-started_at)::int,
      score       = v_total,
      status      = 'graded'
  where id = p_session_id;

  return v_total;
end;
$$;


ALTER FUNCTION public.grade_session(p_session_id uuid) OWNER TO postgres;

--
-- Name: grade_webtest(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.grade_webtest(p_submission_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  total   int := 0;
  correct int := 0;
  q       record;
  ans     jsonb;
begin
  select answers into ans
    from challenge_submissions
    where id = p_submission_id;

  for q in
    select id, correct_choice
    from   webtest_questions
    where  challenge_id = (
      select challenge_id from challenge_submissions where id = p_submission_id
    )
  loop
    total := total + 1;
    if (ans ->> q.id::text)::int = q.correct_choice then
      correct := correct + 1;
    end if;
  end loop;

  update challenge_submissions
  set    auto_score  = (correct * 100.0 / total)::int,
         final_score = (correct * 100.0 / total)::int,
         score_source = 'auto',
         status = '採点済'
  where  id = p_submission_id;
end;
$$;


ALTER FUNCTION public.grade_webtest(p_submission_id uuid) OWNER TO postgres;

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  -- ここで user_roles / companies へ自由に書き込み
  insert into public.user_roles (user_id, role)
       values (new.id, 'company')
  on conflict (user_id) do update set role = excluded.role;

  insert into public.companies (user_id, name, status)
       values (new.id,
               new.raw_user_meta_data->>'full_name',
               '承認待ち')
  on conflict (user_id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

--
-- Name: increment_job_view(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.increment_job_view(_job_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  update jobs set views = views + 1 where id = _job_id;
end;
$$;


ALTER FUNCTION public.increment_job_view(_job_id uuid) OWNER TO postgres;

--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE
    AS $$ select auth.jwt() ->> 'role' = 'admin' $$;


ALTER FUNCTION public.is_admin() OWNER TO postgres;

--
-- Name: is_application_owner(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_application_owner(p_student_id uuid) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $$
  SELECT EXISTS (
    SELECT 1
      FROM student_profiles
     WHERE id      = p_student_id
       AND user_id = auth.uid()
  );
$$;


ALTER FUNCTION public.is_application_owner(p_student_id uuid) OWNER TO postgres;

--
-- Name: is_chat_participant(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_chat_participant(room_id uuid) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  select exists (
    select 1 from chat_rooms
    where id = room_id
      and (
        student_id = auth.uid() or
        is_company_member(company_id) or
        is_admin()
      )
  )
$$;


ALTER FUNCTION public.is_chat_participant(room_id uuid) OWNER TO postgres;

--
-- Name: is_company(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_company() RETURNS boolean
    LANGUAGE sql STABLE
    AS $$ select auth.jwt() ->> 'role' = 'company' $$;


ALTER FUNCTION public.is_company() OWNER TO postgres;

--
-- Name: is_company_member(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_company_member(c_id uuid) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET row_security TO 'off'
    AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.company_members
     WHERE user_id   = auth.uid()
       AND company_id = c_id
  );
$$;


ALTER FUNCTION public.is_company_member(c_id uuid) OWNER TO postgres;

--
-- Name: is_student(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_student() RETURNS boolean
    LANGUAGE sql STABLE
    AS $$ select auth.jwt() ->> 'role' = 'student' $$;


ALTER FUNCTION public.is_student() OWNER TO postgres;

--
-- Name: jwt_custom_claims_hook(jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.jwt_custom_claims_hook(event jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
declare
  base jsonb := event->'claims';                           -- デフォルト (iss / sub / exp …)
  meta jsonb := coalesce(event->'user_metadata', '{}'::jsonb);
begin
  -- user_metadata.role があれば上書き
  if meta ? 'role' then
    base := jsonb_set(base, '{role}', meta->'role', true);
  end if;

  -- 必要なら追加クレームをここでセット
  -- 例: company_id など
  -- if meta ? 'company_id' then
  --   base := jsonb_set(base, '{company_id}', meta->'company_id', true);
  -- end if;

  return jsonb_build_object('claims', base);
end;
$$;


ALTER FUNCTION public.jwt_custom_claims_hook(event jsonb) OWNER TO postgres;

--
-- Name: jwt_custom_claims_hook(uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.jwt_custom_claims_hook(uid uuid, email text, claims jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
declare
  out_claims jsonb;
begin
  -- ここで user_roles や companies を JOIN してカスタム claims を構築
  select jsonb_build_object(
    'role'  , coalesce(r.role, 'student'),
    'company_id', c.id,
    'password_updated_at', u.password_updated_at
  )
  into out_claims
  from auth.users u
  left join public.user_roles r on r.user_id = uid
  left join public.companies  c on c.user_id = uid;

  -- ↑ ↑ ↑ ここのロジックがバグっていると全部おかしくなる ↑ ↑ ↑

  return out_claims;
end;
$$;


ALTER FUNCTION public.jwt_custom_claims_hook(uid uuid, email text, claims jsonb) OWNER TO postgres;

--
-- Name: log_activity(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_activity() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  _actor uuid := auth.uid();
  _role  text := public.get_user_role(_actor);
  _target text;
begin
  -- 削除時だけ OLD.id、それ以外は NEW.id
  _target := TG_TABLE_NAME || ':' ||
             (case when TG_OP = 'DELETE' then OLD.id else NEW.id end);

  insert into public.activity_logs(actor, role, action, target)
  values (_actor, coalesce(_role, 'unknown'), TG_OP, _target);

  -- 通常は row をそのまま返す
  if TG_OP = 'DELETE' then
    return OLD;
  else
    return NEW;
  end if;
end;
$$;


ALTER FUNCTION public.log_activity() OWNER TO postgres;

--
-- Name: log_role_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_role_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  insert into public.role_change_log (user_id, old_role, new_role)
  values (old.user_id, old.role, new.role);
  return new;
end $$;


ALTER FUNCTION public.log_role_change() OWNER TO postgres;

--
-- Name: notify_on_chat_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.notify_on_chat_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  target_user uuid;
begin
  -- auth.users.id を取得
  select sp.user_id
    into target_user
    from public.chat_rooms       cr
    join public.student_profiles sp on sp.id = cr.student_id
   where cr.id = new.chat_room_id;

  if target_user is not null and target_user <> new.sender_id then
    insert into public.notifications (
      user_id,
      notification_type,   -- ★ ここを必ず入れる
      title,
      message
    )
    values (
      target_user,
      'chat',              -- ★ 任意の固定値 or 動的に決めても OK
      '新着チャットがあります',
      substr(coalesce(new.content, ''), 1, 40)
    );
  end if;

  return new;
end;
$$;


ALTER FUNCTION public.notify_on_chat_insert() OWNER TO postgres;

--
-- Name: notify_on_scout_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.notify_on_scout_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  uid uuid;
begin
  -- student_profiles から Auth UID を取得
  select auth_user_id into uid
  from   public.student_profiles
  where  id = new.student_id;

  if uid is null then
    -- UID が無い学生は通知だけスキップ（scout は残す）
    raise notice 'auth UID not found for student %', new.student_id;
    return new;
  end if;

  insert into public.notifications (
    id,          user_id,     title,  message,
    notification_type,        related_id,
    is_read,     channel,     send_status
  ) values (
    gen_random_uuid(),
    uid,
    '新しいスカウトが届きました',
    '企業からスカウトが届いています。詳細を確認してください。',
    'scout',
    new.id,
    false,
    'in_app',   -- email / in_app / both のいずれか
    'sent'
  );

  return new;
end;
$$;


ALTER FUNCTION public.notify_on_scout_insert() OWNER TO postgres;

--
-- Name: prepare_session_answers(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prepare_session_answers(p_session_uuid uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
/*
  1. p_session_uuid で指定された challenge_sessions を取得
  2. その challenge に紐づく question_id をすべて拾う
  3. session_answers に (session_id, question_id) を一括 INSERT
*/
begin
  insert into public.session_answers (session_id, question_id)
  select
    p_session_uuid,
    cq.question_id
  from public.challenge_sessions cs
  join public.challenge_questions cq on cq.challenge_id = cs.challenge_id
  where cs.id = p_session_uuid
  on conflict do nothing;   -- 既に入っていれば無視
end;
$$;


ALTER FUNCTION public.prepare_session_answers(p_session_uuid uuid) OWNER TO postgres;

--
-- Name: queue_email_notification(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.queue_email_notification() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  -- net.http_post を呼び出す（戻り値はジョブ ID）
  perform net.http_post(
    'https://cpinzmlynykyrxdvkshl.supabase.co/functions/v1/send-email'::text,
    jsonb_build_object('Content-Type','application/json'),
    jsonb_build_object(
      'user_id',           new.user_id,
      'notification_type', new.notification_type,
      'related_id',        new.related_id,
      'channel',           new.channel
    )
  );
  return new;
end;
$$;


ALTER FUNCTION public.queue_email_notification() OWNER TO postgres;

--
-- Name: scout_to_application(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.scout_to_application() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
  app_exists boolean;
begin
  -- 承諾以外は無視
  if (new.status <> '承諾') then
    return new;
  end if;

  -- すでに applications 行があるか?
  select exists (
    select 1
    from applications
    where student_id = new.student_id
      and job_id     = new.job_id
  ) into app_exists;

  if not app_exists then
    insert into applications (
      id,
      student_id,
      job_id,
      status,
      applied_at,
      company_id
    )
    values (
      gen_random_uuid(),
      new.student_id,
      new.job_id,
      'スカウト承諾',
      new.accepted_at,
      (select company_id from jobs where id = new.job_id)
    );
  end if;

  return new;
end;
$$;


ALTER FUNCTION public.scout_to_application() OWNER TO postgres;

--
-- Name: set_answered_at_on_company_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_answered_at_on_company_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    AS $$
declare
  is_company boolean;
begin
  /* 会社ユーザか判定 : company_members に存在するか  */
  select exists (
    select 1
    from public.company_members
    where user_id = new.sender_id
  )
  into is_company;

  if is_company then
    /* まだ answered_at が NULL の学生メッセージにタイムスタンプを付与 */
    update public.messages
    set    answered_at = new.created_at
    where  chat_room_id = new.chat_room_id
      and  answered_at  is null
      and  sender_id not in (
            select user_id
            from public.company_members
          );
  end if;

  return new;
end;
$$;


ALTER FUNCTION public.set_answered_at_on_company_insert() OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end; $$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

--
-- Name: start_webtest_session(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.start_webtest_session(p_challenge_id uuid, p_student_id uuid) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
declare
  v_session_id uuid := gen_random_uuid();
begin
  -- ① セッション行
  insert into challenge_sessions(id, challenge_id, student_id)
    values (v_session_id, p_challenge_id, p_student_id);

  -- ② 言語20
  insert into session_answers(session_id, question_id)
  select v_session_id, q.id
    from question_bank q
   where q.category = 'web_lang'
   order by random()
   limit 20;

  -- ③ 非言語20
  insert into session_answers(session_id, question_id)
  select v_session_id, q.id
    from question_bank q
   where q.category = 'web_math'
   order by random()
   limit 20;

  return v_session_id;
end;
$$;


ALTER FUNCTION public.start_webtest_session(p_challenge_id uuid, p_student_id uuid) OWNER TO postgres;

--
-- Name: start_webtest_session_balanced(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.start_webtest_session_balanced(p_challenge_id uuid, p_student_id uuid) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
declare
  v_session_id uuid := gen_random_uuid();
begin
  insert into challenge_sessions(id, challenge_id, student_id)
  values (v_session_id, p_challenge_id, p_student_id);

  /* 言語：easy≦2 ×10問 ＋ 3≦hard ×10問 */
  insert into session_answers(session_id, question_id)
  select v_session_id, id
    from (
      (select id from question_bank
        where category='web_lang' and difficulty<=2
        order by random() limit 10)
      union all
      (select id from question_bank
        where category='web_lang' and difficulty>=3
        order by random() limit 10)
    ) s;

  /* 非言語：同様に 10＋10 */
  insert into session_answers(session_id, question_id)
  select v_session_id, id
    from (
      (select id from question_bank
        where category='web_math' and difficulty<=2
        order by random() limit 10)
      union all
      (select id from question_bank
        where category='web_math' and difficulty>=3
        order by random() limit 10)
    ) s;

  return v_session_id;
end;
$$;


ALTER FUNCTION public.start_webtest_session_balanced(p_challenge_id uuid, p_student_id uuid) OWNER TO postgres;

--
-- Name: sync_user_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_user_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.user_id is null then
    new.user_id := new.id;
  end if;
  return new;
end;
$$;


ALTER FUNCTION public.sync_user_id() OWNER TO postgres;

--
-- Name: sync_user_roles(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_user_roles() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'student')          -- ★必要なら動的に決めてもOK
  on conflict do nothing;             -- ★UPDATE しない
  return new;
end;
$$;


ALTER FUNCTION public.sync_user_roles() OWNER TO postgres;

--
-- Name: trigger_send_email(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_send_email() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if new.channel in ('email','both') then
    -- ★ URL を正式パスに変更
    perform net.http_post(
      'https://cpinzmlynykyrxdvkshl.functions.supabase.co/functions/v1/send-email',
      jsonb_build_object(
        'id',      new.id,
        'user_id', new.user_id,
        'title',   new.title,
        'message', new.message
      ),
      null,
      '{"Content-Type":"application/json"}'::jsonb,
      10000        -- timeout 10 秒
    );
  end if;
  return new;
end;
$$;


ALTER FUNCTION public.trigger_send_email() OWNER TO postgres;

--
-- Name: update_modified_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_modified_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  -- updated_at カラムがある時だけセット
  if exists (
    select 1
    from information_schema.columns
    where table_schema = tg_table_schema
      and table_name   = tg_table_name
      and column_name  = 'updated_at'
  ) then
    new.updated_at = now();
  end if;
  return new;
end; $$;


ALTER FUNCTION public.update_modified_column() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

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
-- Name: admins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admins (
    id uuid NOT NULL,
    email text,
    created_at timestamp without time zone DEFAULT now(),
    last_sign_in_at timestamp with time zone
);


ALTER TABLE public.admins OWNER TO postgres;

--
-- Name: applications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid,
    job_id uuid,
    status public.application_status DEFAULT '未対応'::public.application_status,
    created_at timestamp with time zone DEFAULT now(),
    applied_at date DEFAULT CURRENT_DATE,
    interest_level smallint,
    self_pr text,
    last_activity timestamp with time zone DEFAULT now(),
    resume_url text,
    company_id uuid,
    CONSTRAINT applications_interest_level_check CHECK (((interest_level >= 0) AND (interest_level <= 100)))
);


ALTER TABLE public.applications OWNER TO postgres;

--
-- Name: student_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    full_name text,
    university text,
    faculty text,
    department text,
    birth_date date,
    gender text,
    pr_text text,
    created_at timestamp with time zone DEFAULT now(),
    last_name text,
    first_name text,
    last_name_kana text,
    first_name_kana text,
    phone text,
    address text,
    admission_month date,
    graduation_month date,
    research_theme text,
    qualification_text text,
    skill_text text,
    language_skill text,
    pr_title text,
    pr_body text,
    strength1 text,
    strength2 text,
    strength3 text,
    motive text,
    desired_industries text[],
    desired_positions text[] DEFAULT '{}'::text[],
    desired_locations text[] DEFAULT '{}'::text[],
    work_style text,
    employment_type text,
    salary_range text,
    work_style_options text[] DEFAULT '{}'::text[],
    preference_note text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'アクティブ'::text NOT NULL,
    has_internship_experience boolean DEFAULT false NOT NULL,
    interests text[] DEFAULT '{}'::text[] NOT NULL,
    about text,
    experience jsonb DEFAULT '[]'::jsonb,
    join_ipo boolean DEFAULT false,
    postal_code character varying(8),
    avatar_url text,
    hometown text,
    address_line text,
    city text,
    prefecture text,
    is_completed boolean DEFAULT false,
    preferred_industries text[] DEFAULT '{}'::text[],
    auth_user_id uuid,
    skills text[] DEFAULT '{}'::text[],
    qualifications text[] DEFAULT '{}'::text[],
    referral_source text
);


ALTER TABLE public.student_profiles OWNER TO postgres;

--
-- Name: applicants_view; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.applicants_view AS
 SELECT a.id AS application_id,
    a.status,
    a.created_at AS application_date,
    a.student_id,
    a.job_id,
    a.company_id,
    sp.user_id,
    sp.last_name,
    sp.first_name,
    sp.last_name_kana,
    sp.first_name_kana,
    sp.full_name,
    sp.avatar_url AS profile_image,
    sp.university,
    sp.faculty,
    sp.department,
    sp.graduation_month,
    sp.hometown,
    sp.phone,
    sp.postal_code,
    sp.prefecture,
    sp.city,
    sp.address_line,
    sp.gender,
    sp.birth_date,
    sp.desired_positions,
    sp.work_style_options,
    sp.desired_locations,
    sp.work_style,
    sp.employment_type,
    sp.preferred_industries,
    sp.skills,
    sp.qualifications,
    sp.language_skill AS languages,
    sp.pr_text,
    sp.experience AS work_experience,
    sp.has_internship_experience
   FROM (public.applications a
     LEFT JOIN public.student_profiles sp ON ((sp.id = a.student_id)));


ALTER VIEW public.applicants_view OWNER TO postgres;

--
-- Name: bizscore_questions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bizscore_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_no integer,
    question text,
    weight numeric DEFAULT 1.0
);


ALTER TABLE public.bizscore_questions OWNER TO postgres;

--
-- Name: challenge_questions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.challenge_questions (
    challenge_id uuid NOT NULL,
    question_id uuid NOT NULL,
    order_no integer,
    weight integer DEFAULT 1
);


ALTER TABLE public.challenge_questions OWNER TO postgres;

--
-- Name: challenge_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.challenge_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    challenge_id uuid,
    student_id uuid,
    started_at timestamp with time zone DEFAULT now(),
    ended_at timestamp with time zone,
    score numeric,
    elapsed_sec integer,
    status public.session_status DEFAULT 'in_progress'::public.session_status
);


ALTER TABLE public.challenge_sessions OWNER TO postgres;

--
-- Name: challenge_submissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.challenge_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    challenge_id uuid NOT NULL,
    student_id uuid NOT NULL,
    answer text NOT NULL,
    status text DEFAULT 'submitted'::text NOT NULL,
    score integer,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    auto_score integer,
    final_score integer,
    score_source text,
    answers jsonb,
    session_id uuid NOT NULL
);


ALTER TABLE public.challenge_submissions OWNER TO postgres;

--
-- Name: challenges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    word_limit integer,
    deadline timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    category text DEFAULT 'webtest'::text NOT NULL,
    company text,
    time_limit_min integer DEFAULT 40 NOT NULL,
    question_count integer DEFAULT 40 NOT NULL,
    start_date timestamp with time zone DEFAULT now() NOT NULL,
    student_id uuid,
    score numeric DEFAULT 0 NOT NULL,
    type public.grandprix_type DEFAULT 'case'::public.grandprix_type NOT NULL,
    event_id uuid,
    created_by uuid DEFAULT auth.uid() NOT NULL,
    answer_video_url text,
    time_limit_s integer DEFAULT 900 NOT NULL,
    test_code public.test_code,
    section_type public.section_type
);


ALTER TABLE public.challenges OWNER TO postgres;

--
-- Name: COLUMN challenges.answer_video_url; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.challenges.answer_video_url IS '解説動画（YouTube 等）への URL';


--
-- Name: companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    name text NOT NULL,
    description text,
    website text,
    logo text,
    created_at timestamp with time zone DEFAULT now(),
    cover_image_url text,
    industry text,
    founded_year integer,
    employee_count integer,
    location text,
    recruit_website text,
    status text DEFAULT '承認待ち'::text NOT NULL,
    contact_email character varying,
    phone character varying,
    address text,
    video_url text,
    tagline text,
    representative text,
    founded_on date,
    capital_jpy bigint,
    revenue_jpy bigint,
    headquarters text,
    cover_image text,
    created_by uuid
);


ALTER TABLE public.companies OWNER TO postgres;

--
-- Name: company_business_areas; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_business_areas (
    company_id uuid NOT NULL,
    ordinal integer NOT NULL,
    area text
);


ALTER TABLE public.company_business_areas OWNER TO postgres;

--
-- Name: company_favorites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.company_favorites OWNER TO postgres;

--
-- Name: company_philosophy; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_philosophy (
    company_id uuid NOT NULL,
    ordinal integer NOT NULL,
    paragraph text
);


ALTER TABLE public.company_philosophy OWNER TO postgres;

--
-- Name: company_positions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_positions (
    company_id uuid NOT NULL,
    ordinal integer NOT NULL,
    "position" text
);


ALTER TABLE public.company_positions OWNER TO postgres;

--
-- Name: company_recruit_info; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_recruit_info (
    company_id uuid NOT NULL,
    message text
);


ALTER TABLE public.company_recruit_info OWNER TO postgres;

--
-- Name: company_reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_reviews (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    company_id uuid,
    rating numeric(2,1),
    title text,
    body text,
    role text,
    tenure_years integer,
    posted_at timestamp with time zone DEFAULT now(),
    rating_growth numeric,
    rating_worklife numeric,
    rating_selection numeric,
    rating_culture numeric,
    user_id uuid
);


ALTER TABLE public.company_reviews OWNER TO postgres;

--
-- Name: companies_view; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.companies_view AS
 SELECT c.id,
    c.name,
    c.tagline,
    c.logo,
    c.cover_image_url,
    c.industry,
    c.representative,
    c.founded_year,
    c.capital_jpy,
    c.revenue_jpy,
    c.employee_count,
    c.headquarters,
    COALESCE(ph.philosophy, '[]'::json) AS philosophy,
    COALESCE(ba.business_areas, '[]'::json) AS business_areas,
    COALESCE(pos.positions, '[]'::json) AS positions,
    rec.message AS recruit_message,
    (COALESCE(rt.avg_rating, (0)::numeric))::numeric(3,2) AS rating,
    COALESCE(fv.favorite_count, (0)::bigint) AS favorite_count,
    c.video_url,
    c.cover_image
   FROM ((((((public.companies c
     LEFT JOIN LATERAL ( SELECT json_agg(cp.paragraph ORDER BY cp.ordinal) AS philosophy
           FROM public.company_philosophy cp
          WHERE (cp.company_id = c.id)) ph ON (true))
     LEFT JOIN LATERAL ( SELECT json_agg(cba.area ORDER BY cba.ordinal) AS business_areas
           FROM public.company_business_areas cba
          WHERE (cba.company_id = c.id)) ba ON (true))
     LEFT JOIN LATERAL ( SELECT json_agg(cp2."position" ORDER BY cp2.ordinal) AS positions
           FROM public.company_positions cp2
          WHERE (cp2.company_id = c.id)) pos ON (true))
     LEFT JOIN public.company_recruit_info rec ON ((rec.company_id = c.id)))
     LEFT JOIN LATERAL ( SELECT (avg(cr.rating))::numeric(3,2) AS avg_rating
           FROM public.company_reviews cr
          WHERE (cr.company_id = c.id)) rt ON (true))
     LEFT JOIN LATERAL ( SELECT count(*) AS favorite_count
           FROM public.company_favorites cf
          WHERE (cf.company_id = c.id)) fv ON (true));


ALTER VIEW public.companies_view OWNER TO postgres;

--
-- Name: company_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_events (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    company_id uuid,
    title text,
    type text,
    datetime timestamp with time zone,
    location text,
    url text
);


ALTER TABLE public.company_events OWNER TO postgres;

--
-- Name: company_favorite_counts; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.company_favorite_counts AS
 SELECT company_favorites.company_id,
    count(*) AS favorite_count
   FROM public.company_favorites
  GROUP BY company_favorites.company_id;


ALTER VIEW public.company_favorite_counts OWNER TO postgres;

--
-- Name: company_highlights; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_highlights (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    company_id uuid,
    ordinal integer,
    icon text,
    title text,
    body text
);


ALTER TABLE public.company_highlights OWNER TO postgres;

--
-- Name: company_interviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_interviews (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    company_id uuid,
    question text,
    answer_hint text,
    experience_text text,
    graduation_year integer,
    posted_at timestamp with time zone DEFAULT now(),
    selection_category text,
    phase text,
    user_id uuid
);


ALTER TABLE public.company_interviews OWNER TO postgres;

--
-- Name: company_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.company_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'recruiter'::text NOT NULL,
    invited_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.company_members OWNER TO postgres;

--
-- Name: event_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_details (
    selection_id uuid NOT NULL,
    event_date date,
    capacity integer,
    format text,
    venue text,
    target_grad_years integer[],
    sessions jsonb,
    contact_email text,
    notes text,
    job_id uuid,
    is_online boolean
);


ALTER TABLE public.event_details OWNER TO postgres;

--
-- Name: event_participants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    student_id uuid NOT NULL,
    status text DEFAULT 'reserved'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.event_participants OWNER TO postgres;

--
-- Name: events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(120) NOT NULL,
    description text,
    event_date date NOT NULL,
    event_type character varying(24) DEFAULT 'online'::character varying,
    cover_image text,
    status character varying(12) DEFAULT 'draft'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.events OWNER TO postgres;

--
-- Name: features; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.features (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.features OWNER TO postgres;

--
-- Name: fulltime_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fulltime_details (
    selection_id uuid,
    is_ongoing boolean DEFAULT true,
    job_id uuid NOT NULL,
    working_days text,
    salary_min numeric,
    salary_max numeric
);


ALTER TABLE public.fulltime_details OWNER TO postgres;

--
-- Name: gp_rank; Type: MATERIALIZED VIEW; Schema: public; Owner: postgres
--

CREATE MATERIALIZED VIEW public.gp_rank AS
 WITH monthly_totals AS (
         SELECT s.student_id,
            c.type AS category,
            date_trunc('month'::text, s.created_at) AS month,
            sum(COALESCE(s.final_score, s.auto_score, 0)) AS total_score
           FROM (public.challenge_submissions s
             JOIN public.challenges c ON ((c.id = s.challenge_id)))
          WHERE (s.status = '採点済み'::text)
          GROUP BY s.student_id, c.type, (date_trunc('month'::text, s.created_at))
        )
 SELECT rank() OVER (PARTITION BY monthly_totals.month, monthly_totals.category ORDER BY monthly_totals.total_score DESC) AS rank,
    monthly_totals.student_id,
    monthly_totals.category,
    monthly_totals.month,
    monthly_totals.total_score
   FROM monthly_totals
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.gp_rank OWNER TO postgres;

--
-- Name: internship_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.internship_details (
    selection_id uuid NOT NULL,
    start_date date,
    end_date date,
    duration_weeks integer,
    work_days_per_week integer,
    is_paid boolean,
    allowance text,
    target_grad_years integer[],
    format public.event_format,
    sessions jsonb,
    capacity integer,
    selection_flow jsonb,
    perks text,
    contact_email text,
    notes text,
    job_id uuid
);


ALTER TABLE public.internship_details OWNER TO postgres;

--
-- Name: job_app_count; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.job_app_count AS
SELECT
    NULL::text AS job_title,
    NULL::bigint AS cnt;


ALTER VIEW public.job_app_count OWNER TO postgres;

--
-- Name: job_interests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_interests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    job_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.job_interests OWNER TO postgres;

--
-- Name: job_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_tags (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    job_id uuid NOT NULL,
    tag text NOT NULL
);


ALTER TABLE public.job_tags OWNER TO postgres;

--
-- Name: jobs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    title text NOT NULL,
    description text,
    requirements text,
    location text,
    work_type text,
    salary_range text,
    published boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    cover_image_url text,
    is_recommended boolean DEFAULT false NOT NULL,
    views integer DEFAULT 0 NOT NULL,
    published_until date,
    selection_type public.selection_type,
    application_deadline date,
    category text DEFAULT '本選考'::text,
    start_date date,
    user_id uuid DEFAULT auth.uid() NOT NULL
);


ALTER TABLE public.jobs OWNER TO postgres;

--
-- Name: media_authors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.media_authors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    display_name text NOT NULL,
    bio text,
    avatar_url text
);


ALTER TABLE public.media_authors OWNER TO postgres;

--
-- Name: media_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.media_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    "order" integer DEFAULT 0
);


ALTER TABLE public.media_categories OWNER TO postgres;

--
-- Name: media_posts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.media_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    excerpt text,
    content_md text,
    content_html text,
    cover_image_url text,
    status text DEFAULT 'draft'::text NOT NULL,
    published_at timestamp with time zone,
    author_id uuid,
    category_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    preview_token uuid DEFAULT extensions.uuid_generate_v4()
);

ALTER TABLE ONLY public.media_posts FORCE ROW LEVEL SECURITY;


ALTER TABLE public.media_posts OWNER TO postgres;

--
-- Name: media_posts_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.media_posts_tags (
    post_id uuid NOT NULL,
    tag_id uuid NOT NULL
);


ALTER TABLE public.media_posts_tags OWNER TO postgres;

--
-- Name: media_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.media_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL
);


ALTER TABLE public.media_tags OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    chat_room_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    content text NOT NULL,
    is_read boolean DEFAULT false,
    attachment_url text,
    created_at timestamp with time zone DEFAULT now(),
    answered_at timestamp with time zone
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    notification_type character varying(50) NOT NULL,
    related_id uuid NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    channel text DEFAULT 'in_app'::text,
    send_status text,
    send_after timestamp with time zone DEFAULT now(),
    error_reason text,
    url text,
    CONSTRAINT notifications_channel_check CHECK ((channel = ANY (ARRAY['email'::text, 'in_app'::text, 'both'::text])))
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: qualifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.qualifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.qualifications OWNER TO postgres;

--
-- Name: question_bank; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.question_bank (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category public.question_category,
    stem text NOT NULL,
    choices jsonb,
    correct_choice integer,
    expected_kw text[],
    difficulty integer DEFAULT 3,
    explanation text,
    created_at timestamp with time zone DEFAULT now(),
    challenge_id uuid,
    weight numeric DEFAULT 1.0,
    grand_type public.grandprix_type DEFAULT 'case'::public.grandprix_type NOT NULL,
    order_no integer,
    stem_img_url text,
    choices_img jsonb
);


ALTER TABLE public.question_bank OWNER TO postgres;

--
-- Name: referral_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.referral_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    code text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.referral_codes OWNER TO postgres;

--
-- Name: referral_uses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.referral_uses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referral_code_id uuid NOT NULL,
    referred_user_id uuid,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.referral_uses OWNER TO postgres;

--
-- Name: resumes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.resumes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    desired_job_title text,
    summary text,
    skills jsonb,
    experiences jsonb,
    educations jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    form_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    work_experiences jsonb DEFAULT '[]'::jsonb NOT NULL
);


ALTER TABLE public.resumes OWNER TO postgres;

--
-- Name: role_change_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_change_log (
    id bigint NOT NULL,
    user_id uuid,
    old_role text,
    new_role text,
    changed_by text DEFAULT current_setting('request.jwt.claim.email'::text, true),
    query text DEFAULT current_query(),
    changed_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.role_change_log OWNER TO postgres;

--
-- Name: role_change_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.role_change_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_change_log_id_seq OWNER TO postgres;

--
-- Name: role_change_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.role_change_log_id_seq OWNED BY public.role_change_log.id;


--
-- Name: scout_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.scout_templates (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    is_global boolean DEFAULT false,
    "position" text,
    offer_range text,
    job_id uuid
);


ALTER TABLE public.scout_templates OWNER TO postgres;

--
-- Name: COLUMN scout_templates."position"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.scout_templates."position" IS 'テンプレ既定の提示ポジション';


--
-- Name: COLUMN scout_templates.offer_range; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.scout_templates.offer_range IS 'テンプレ既定のオファー額レンジ（万円）例: 400-600';


--
-- Name: scouts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.scouts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    student_id uuid NOT NULL,
    job_id uuid,
    message text NOT NULL,
    status character varying(50) DEFAULT 'sent'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_read boolean DEFAULT false NOT NULL,
    offer_amount text,
    offer_position text,
    accepted_at timestamp with time zone,
    declined_at timestamp with time zone,
    chat_room_id uuid,
    company_member_id uuid NOT NULL,
    CONSTRAINT chk_scout_status CHECK ((((status)::text = ANY ((ARRAY['draft'::character varying, 'sent'::character varying, 'opened'::character varying, 'replied'::character varying, 'archived'::character varying, 'accepted'::character varying, 'declined'::character varying])::text[])) AND (((status)::text <> ALL ((ARRAY['accepted'::character varying, 'declined'::character varying])::text[])) OR (((status)::text = 'accepted'::text) AND (accepted_at IS NOT NULL)) OR (((status)::text = 'declined'::text) AND (declined_at IS NOT NULL)))))
);


ALTER TABLE public.scouts OWNER TO postgres;

--
-- Name: COLUMN scouts.offer_amount; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.scouts.offer_amount IS '提示レンジ（万円）例: 400-600';


--
-- Name: COLUMN scouts.offer_position; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.scouts.offer_position IS '提示ポジション名';


--
-- Name: selections_view; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.selections_view AS
 SELECT j.id,
    j.company_id,
    j.title,
    j.description,
    j.location,
    j.published,
    j.views,
    j.selection_type,
    j.application_deadline,
    j.cover_image_url,
    j.created_at,
    f.working_days,
    f.salary_min,
    f.salary_max,
    i.start_date,
    i.end_date,
    i.duration_weeks,
    i.work_days_per_week,
    i.allowance,
    e.event_date,
    e.capacity,
    e.venue,
    e.format,
    e.is_online
   FROM (((public.jobs j
     LEFT JOIN public.fulltime_details f ON ((f.job_id = j.id)))
     LEFT JOIN public.internship_details i ON ((i.job_id = j.id)))
     LEFT JOIN public.event_details e ON ((e.job_id = j.id)));


ALTER VIEW public.selections_view OWNER TO postgres;

--
-- Name: session_answers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session_answers (
    session_id uuid NOT NULL,
    question_id uuid NOT NULL,
    answer_raw jsonb,
    is_correct boolean,
    score numeric,
    elapsed_sec integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.session_answers OWNER TO postgres;

--
-- Name: skills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.skills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.skills OWNER TO postgres;

--
-- Name: student_applications_view; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.student_applications_view AS
 SELECT a.id,
    a.student_id,
    a.job_id,
    a.status,
    a.created_at AS applied_date,
    a.company_id,
    false AS has_unread_messages,
    0 AS unread_count,
    j.title,
    c.name AS company_name,
    c.location,
    NULL::text AS company_logo,
    NULL::text AS work_style
   FROM ((public.applications a
     JOIN public.jobs j ON ((j.id = a.job_id)))
     JOIN public.companies c ON ((c.id = a.company_id)));


ALTER VIEW public.student_applications_view OWNER TO postgres;

--
-- Name: student_profiles_backup; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_profiles_backup (
    id uuid,
    user_id uuid,
    full_name text,
    university text,
    faculty text,
    department text,
    birth_date date,
    gender text,
    pr_text text,
    created_at timestamp with time zone,
    last_name text,
    first_name text,
    last_name_kana text,
    first_name_kana text,
    phone text,
    address text,
    admission_month date,
    graduation_month date,
    research_theme text,
    qualification_text text,
    skill_text text,
    language_skill text,
    pr_title text,
    pr_body text,
    strength1 text,
    strength2 text,
    strength3 text,
    motive text,
    desired_industries text[],
    desired_positions text[],
    desired_locations text[],
    work_style text,
    employment_type text,
    salary_range text,
    work_style_options text[],
    preference_note text,
    updated_at timestamp with time zone,
    status text,
    has_internship_experience boolean,
    interests text[],
    about text,
    experience jsonb,
    join_ipo boolean,
    postal_code character varying(8),
    avatar_url text,
    hometown text,
    address_line text,
    city text,
    prefecture text,
    is_completed boolean,
    preferred_industries text[],
    auth_user_id uuid,
    skills text[],
    qualifications text[]
);


ALTER TABLE public.student_profiles_backup OWNER TO postgres;

--
-- Name: student_qualifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_qualifications (
    student_id uuid NOT NULL,
    qualification_id uuid NOT NULL
);


ALTER TABLE public.student_qualifications OWNER TO postgres;

--
-- Name: student_skills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.student_skills (
    student_id uuid NOT NULL,
    skill_id uuid NOT NULL
);


ALTER TABLE public.student_skills OWNER TO postgres;

--
-- Name: user_companies; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.user_companies AS
 SELECT DISTINCT company_members.user_id,
    company_members.company_id
   FROM public.company_members;


ALTER VIEW public.user_companies OWNER TO postgres;

--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    user_id uuid NOT NULL,
    role character varying(50) DEFAULT 'student'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- Name: user_signups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_signups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    referral_source text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_signups OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password text,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['student'::text, 'company'::text, 'admin'::text])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: v_messages_with_sender; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_messages_with_sender AS
 SELECT m.id,
    m.chat_room_id,
    m.sender_id,
    m.content,
    m.is_read,
    m.attachment_url,
    m.created_at,
    m.answered_at,
    p.full_name AS sender_full_name,
    p.avatar_url AS sender_avatar_url
   FROM (public.messages m
     LEFT JOIN public.student_profiles p ON ((p.id = m.sender_id)));


ALTER VIEW public.v_messages_with_sender OWNER TO postgres;

--
-- Name: webtest_questions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.webtest_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    challenge_id uuid,
    order_no integer,
    question text,
    choice1 text,
    choice2 text,
    choice3 text,
    choice4 text,
    correct_choice integer,
    CONSTRAINT webtest_questions_correct_choice_check CHECK (((correct_choice >= 1) AND (correct_choice <= 4)))
);


ALTER TABLE public.webtest_questions OWNER TO postgres;

--
-- Name: role_change_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_change_log ALTER COLUMN id SET DEFAULT nextval('public.role_change_log_id_seq'::regclass);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: bizscore_questions bizscore_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bizscore_questions
    ADD CONSTRAINT bizscore_questions_pkey PRIMARY KEY (id);


--
-- Name: challenge_questions challenge_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.challenge_questions
    ADD CONSTRAINT challenge_questions_pkey PRIMARY KEY (challenge_id, question_id);


--
-- Name: challenge_sessions challenge_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.challenge_sessions
    ADD CONSTRAINT challenge_sessions_pkey PRIMARY KEY (id);


--
-- Name: challenge_submissions challenge_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.challenge_submissions
    ADD CONSTRAINT challenge_submissions_pkey PRIMARY KEY (id);


--
-- Name: challenge_submissions challenge_submissions_session_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.challenge_submissions
    ADD CONSTRAINT challenge_submissions_session_id_unique UNIQUE (session_id);


--
-- Name: challenges challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.challenges
    ADD CONSTRAINT challenges_pkey PRIMARY KEY (id);


--
-- Name: chat_rooms chat_rooms_company_student_job_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_company_student_job_key UNIQUE (company_id, student_id, job_id);


--
-- Name: chat_rooms chat_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: companies companies_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_user_id_unique UNIQUE (user_id);


--
-- Name: company_business_areas company_business_areas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_business_areas
    ADD CONSTRAINT company_business_areas_pkey PRIMARY KEY (company_id, ordinal);


--
-- Name: company_events company_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_events
    ADD CONSTRAINT company_events_pkey PRIMARY KEY (id);


--
-- Name: company_favorites company_favorites_company_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_favorites
    ADD CONSTRAINT company_favorites_company_id_user_id_key UNIQUE (company_id, user_id);


--
-- Name: company_favorites company_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_favorites
    ADD CONSTRAINT company_favorites_pkey PRIMARY KEY (id);


--
-- Name: company_highlights company_highlights_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_highlights
    ADD CONSTRAINT company_highlights_pkey PRIMARY KEY (id);


--
-- Name: company_interviews company_interviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_interviews
    ADD CONSTRAINT company_interviews_pkey PRIMARY KEY (id);


--
-- Name: company_members company_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_members
    ADD CONSTRAINT company_members_pkey PRIMARY KEY (id);


--
-- Name: company_members company_members_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_members
    ADD CONSTRAINT company_members_unique UNIQUE (company_id, user_id);


--
-- Name: company_philosophy company_philosophy_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_philosophy
    ADD CONSTRAINT company_philosophy_pkey PRIMARY KEY (company_id, ordinal);


--
-- Name: company_positions company_positions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_positions
    ADD CONSTRAINT company_positions_pkey PRIMARY KEY (company_id, ordinal);


--
-- Name: company_recruit_info company_recruit_info_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_recruit_info
    ADD CONSTRAINT company_recruit_info_pkey PRIMARY KEY (company_id);


--
-- Name: company_reviews company_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_reviews
    ADD CONSTRAINT company_reviews_pkey PRIMARY KEY (id);


--
-- Name: event_details event_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_details
    ADD CONSTRAINT event_details_pkey PRIMARY KEY (selection_id);


--
-- Name: event_participants event_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_participants
    ADD CONSTRAINT event_participants_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: features features_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.features
    ADD CONSTRAINT features_pkey PRIMARY KEY (id);


--
-- Name: fulltime_details fulltime_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fulltime_details
    ADD CONSTRAINT fulltime_details_pkey PRIMARY KEY (job_id);


--
-- Name: internship_details internship_details_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internship_details
    ADD CONSTRAINT internship_details_pkey PRIMARY KEY (selection_id);


--
-- Name: job_interests job_interests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_interests
    ADD CONSTRAINT job_interests_pkey PRIMARY KEY (id);


--
-- Name: job_interests job_interests_student_id_job_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_interests
    ADD CONSTRAINT job_interests_student_id_job_id_key UNIQUE (student_id, job_id);


--
-- Name: job_tags job_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_tags
    ADD CONSTRAINT job_tags_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: media_authors media_authors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_authors
    ADD CONSTRAINT media_authors_pkey PRIMARY KEY (id);


--
-- Name: media_categories media_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_categories
    ADD CONSTRAINT media_categories_pkey PRIMARY KEY (id);


--
-- Name: media_categories media_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_categories
    ADD CONSTRAINT media_categories_slug_key UNIQUE (slug);


--
-- Name: media_posts media_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_posts
    ADD CONSTRAINT media_posts_pkey PRIMARY KEY (id);


--
-- Name: media_posts media_posts_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_posts
    ADD CONSTRAINT media_posts_slug_key UNIQUE (slug);


--
-- Name: media_posts_tags media_posts_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_posts_tags
    ADD CONSTRAINT media_posts_tags_pkey PRIMARY KEY (post_id, tag_id);


--
-- Name: media_tags media_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_tags
    ADD CONSTRAINT media_tags_pkey PRIMARY KEY (id);


--
-- Name: media_tags media_tags_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_tags
    ADD CONSTRAINT media_tags_slug_key UNIQUE (slug);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: qualifications qualifications_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.qualifications
    ADD CONSTRAINT qualifications_name_key UNIQUE (name);


--
-- Name: qualifications qualifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.qualifications
    ADD CONSTRAINT qualifications_pkey PRIMARY KEY (id);


--
-- Name: question_bank question_bank_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_pkey PRIMARY KEY (id);


--
-- Name: referral_codes referral_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_code_key UNIQUE (code);


--
-- Name: referral_codes referral_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_pkey PRIMARY KEY (id);


--
-- Name: referral_codes referral_codes_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_user_id_key UNIQUE (user_id);


--
-- Name: referral_uses referral_uses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_uses
    ADD CONSTRAINT referral_uses_pkey PRIMARY KEY (id);


--
-- Name: resumes resumes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resumes
    ADD CONSTRAINT resumes_pkey PRIMARY KEY (id);


--
-- Name: resumes resumes_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resumes
    ADD CONSTRAINT resumes_user_id_key UNIQUE (user_id);


--
-- Name: resumes resumes_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resumes
    ADD CONSTRAINT resumes_user_id_unique UNIQUE (user_id);


--
-- Name: role_change_log role_change_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_change_log
    ADD CONSTRAINT role_change_log_pkey PRIMARY KEY (id);


--
-- Name: scout_templates scout_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scout_templates
    ADD CONSTRAINT scout_templates_pkey PRIMARY KEY (id);


--
-- Name: scouts scouts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scouts
    ADD CONSTRAINT scouts_pkey PRIMARY KEY (id);


--
-- Name: session_answers session_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session_answers
    ADD CONSTRAINT session_answers_pkey PRIMARY KEY (session_id, question_id);


--
-- Name: skills skills_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_name_key UNIQUE (name);


--
-- Name: skills skills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (id);


--
-- Name: student_profiles student_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_pkey PRIMARY KEY (id);


--
-- Name: student_profiles student_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_user_id_key UNIQUE (user_id);


--
-- Name: student_qualifications student_qualifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_qualifications
    ADD CONSTRAINT student_qualifications_pkey PRIMARY KEY (student_id, qualification_id);


--
-- Name: student_skills student_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_skills
    ADD CONSTRAINT student_skills_pkey PRIMARY KEY (student_id, skill_id);


--
-- Name: challenge_sessions uniq_once_per_chall; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.challenge_sessions
    ADD CONSTRAINT uniq_once_per_chall UNIQUE (challenge_id, student_id);


--
-- Name: chat_rooms unique_chat_room; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT unique_chat_room UNIQUE (company_id, student_id);


--
-- Name: scouts unique_scout; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scouts
    ADD CONSTRAINT unique_scout UNIQUE (company_id, student_id, job_id);


--
-- Name: event_details uq_event_job; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_details
    ADD CONSTRAINT uq_event_job UNIQUE (job_id);


--
-- Name: fulltime_details uq_fulltime_job; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fulltime_details
    ADD CONSTRAINT uq_fulltime_job UNIQUE (job_id);


--
-- Name: internship_details uq_internship_job; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internship_details
    ADD CONSTRAINT uq_internship_job UNIQUE (job_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id);


--
-- Name: user_roles user_roles_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);


--
-- Name: user_signups user_signups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_signups
    ADD CONSTRAINT user_signups_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webtest_questions webtest_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webtest_questions
    ADD CONSTRAINT webtest_questions_pkey PRIMARY KEY (id);


--
-- Name: challenges_created_by_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX challenges_created_by_idx ON public.challenges USING btree (created_by);


--
-- Name: chat_rooms_scout_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX chat_rooms_scout_id_idx ON public.chat_rooms USING btree (scout_id);


--
-- Name: company_interviews_company_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX company_interviews_company_idx ON public.company_interviews USING btree (company_id);


--
-- Name: company_reviews_company_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX company_reviews_company_idx ON public.company_reviews USING btree (company_id);


--
-- Name: gp_rank_month_category_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX gp_rank_month_category_idx ON public.gp_rank USING btree (month, category);


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
-- Name: idx_applications_job_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_applications_job_id ON public.applications USING btree (job_id);


--
-- Name: idx_applications_student_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_applications_student_id ON public.applications USING btree (student_id);


--
-- Name: idx_company_members_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_company_members_company ON public.company_members USING btree (company_id);


--
-- Name: idx_jobs_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jobs_company_id ON public.jobs USING btree (company_id);


--
-- Name: idx_jobs_published_until; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_jobs_published_until ON public.jobs USING btree (published_until);


--
-- Name: idx_messages_chat_room_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_chat_room_id ON public.messages USING btree (chat_room_id);


--
-- Name: idx_messages_room_unread; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_room_unread ON public.messages USING btree (chat_room_id, is_read) WHERE (is_read = false);


--
-- Name: idx_messages_sender_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_sender_id ON public.messages USING btree (sender_id);


--
-- Name: idx_notifications_pending; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_pending ON public.notifications USING btree (send_status, channel, send_after) WHERE (send_status = 'pending'::text);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_scouts_company_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scouts_company_created ON public.scouts USING btree (company_id, created_at DESC);


--
-- Name: idx_scouts_company_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scouts_company_id ON public.scouts USING btree (company_id);


--
-- Name: idx_scouts_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scouts_student ON public.scouts USING btree (student_id);


--
-- Name: idx_scouts_student_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scouts_student_id ON public.scouts USING btree (student_id);


--
-- Name: idx_student_profiles_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_student_profiles_user_id ON public.student_profiles USING btree (user_id);


--
-- Name: idx_templates_company; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_templates_company ON public.scout_templates USING btree (company_id);


--
-- Name: idx_unique_submission; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_unique_submission ON public.challenge_submissions USING btree (challenge_id, student_id);


--
-- Name: jobs_start_date_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX jobs_start_date_idx ON public.jobs USING btree (start_date);


--
-- Name: jobs_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX jobs_user_id_idx ON public.jobs USING btree (user_id);


--
-- Name: notifications_user_isread_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notifications_user_isread_idx ON public.notifications USING btree (user_id, is_read);


--
-- Name: student_profiles_postal_code_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX student_profiles_postal_code_idx ON public.student_profiles USING btree (postal_code);


--
-- Name: uq_company_members_company_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_company_members_company_user ON public.company_members USING btree (company_id, user_id);


--
-- Name: job_app_count _RETURN; Type: RULE; Schema: public; Owner: postgres
--

CREATE OR REPLACE VIEW public.job_app_count AS
 SELECT j.title AS job_title,
    count(a.id) AS cnt
   FROM (public.jobs j
     LEFT JOIN public.applications a ON ((a.job_id = j.id)))
  GROUP BY j.id;


--
-- Name: companies trg_add_creator_to_members; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_add_creator_to_members AFTER INSERT ON public.companies FOR EACH ROW EXECUTE FUNCTION public.add_creator_to_members();


--
-- Name: companies trg_company_after_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_company_after_insert AFTER INSERT ON public.companies FOR EACH ROW EXECUTE FUNCTION public.add_owner_to_company_members();


--
-- Name: student_profiles trg_ensure_user_id; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_ensure_user_id BEFORE INSERT OR UPDATE ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION public.ensure_user_id();


--
-- Name: events trg_events_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_events_updated BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: applications trg_fill_company_id; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_fill_company_id BEFORE INSERT ON public.applications FOR EACH ROW EXECUTE FUNCTION public.filling_company_id();


--
-- Name: user_roles trg_log_role_change; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_log_role_change AFTER UPDATE ON public.user_roles FOR EACH ROW WHEN (((old.role)::text IS DISTINCT FROM (new.role)::text)) EXECUTE FUNCTION public.log_role_change();


--
-- Name: notifications trg_notifications_email; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_notifications_email AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.enqueue_email_notification();


--
-- Name: notifications trg_notify_email_queue; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_notify_email_queue AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.queue_email_notification();


--
-- Name: messages trg_notify_on_chat_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_notify_on_chat_insert AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.notify_on_chat_insert();


--
-- Name: scouts trg_notify_on_scout_insert; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_notify_on_scout_insert AFTER INSERT ON public.scouts FOR EACH ROW EXECUTE FUNCTION public.notify_on_scout_insert();


--
-- Name: scouts trg_scout_accepted_notify; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_scout_accepted_notify AFTER UPDATE ON public.scouts FOR EACH ROW WHEN ((((new.status)::text = 'accepted'::text) AND ((old.status)::text IS DISTINCT FROM (new.status)::text))) EXECUTE FUNCTION public.fn_scout_accepted_notify();


--
-- Name: scouts trg_scout_to_application; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_scout_to_application AFTER INSERT OR UPDATE OF status ON public.scouts FOR EACH ROW EXECUTE FUNCTION public.scout_to_application();


--
-- Name: notifications trg_send_email; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_send_email AFTER INSERT ON public.notifications FOR EACH ROW WHEN (((new.channel = 'email'::text) AND ((new.send_status IS NULL) OR (new.send_status = 'pending'::text)))) EXECUTE FUNCTION public.fn_notify_send_email();


--
-- Name: messages trg_set_answered_at_company; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_set_answered_at_company BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.set_answered_at_on_company_insert();


--
-- Name: features trg_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.features FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: student_profiles trg_set_user_id; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_set_user_id BEFORE INSERT ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION public.sync_user_id();


--
-- Name: activity_logs update_activity_logs_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_activity_logs_updated_at BEFORE UPDATE ON public.activity_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: applications update_applications_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_applications_modtime BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: chat_rooms update_chat_rooms_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_chat_rooms_modtime BEFORE UPDATE ON public.chat_rooms FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: jobs update_jobs_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_jobs_modtime BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: scouts update_scouts_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_scouts_modtime BEFORE UPDATE ON public.scouts FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: student_profiles update_student_profiles_modtime; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_student_profiles_modtime BEFORE UPDATE ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: admins admins_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);


--
-- Name: applications applications_company_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_company_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: applications applications_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: applications applications_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.student_profiles(id) ON DELETE CASCADE;


--
-- Name: challenge_questions challenge_questions_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.challenge_questions
    ADD CONSTRAINT challenge_questions_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.challenges(id) ON DELETE CASCADE;


--
-- Name: challenge_questions challenge_questions_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.challenge_questions
    ADD CONSTRAINT challenge_questions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.question_bank(id) ON DELETE CASCADE;


--
-- Name: challenge_sessions challenge_sessions_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.challenge_sessions
    ADD CONSTRAINT challenge_sessions_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.challenges(id) ON DELETE CASCADE;


--
-- Name: challenge_sessions challenge_sessions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.challenge_sessions
    ADD CONSTRAINT challenge_sessions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.student_profiles(id) ON DELETE CASCADE;


--
-- Name: challenge_submissions challenge_submissions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.challenge_submissions
    ADD CONSTRAINT challenge_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.student_profiles(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: challenges challenges_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.challenges
    ADD CONSTRAINT challenges_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.student_profiles(user_id) ON DELETE CASCADE;


--
-- Name: chat_rooms chat_rooms_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: chat_rooms chat_rooms_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL;


--
-- Name: chat_rooms chat_rooms_scout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_scout_id_fkey FOREIGN KEY (scout_id) REFERENCES public.scouts(id) ON DELETE CASCADE;


--
-- Name: chat_rooms chat_rooms_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.student_profiles(id) ON DELETE CASCADE;


--
-- Name: companies companies_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: company_business_areas company_business_areas_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_business_areas
    ADD CONSTRAINT company_business_areas_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_events company_events_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_events
    ADD CONSTRAINT company_events_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_favorites company_favorites_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_favorites
    ADD CONSTRAINT company_favorites_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_favorites company_favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_favorites
    ADD CONSTRAINT company_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: company_highlights company_highlights_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_highlights
    ADD CONSTRAINT company_highlights_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_interviews company_interviews_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_interviews
    ADD CONSTRAINT company_interviews_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_interviews company_interviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_interviews
    ADD CONSTRAINT company_interviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: company_members company_members_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_members
    ADD CONSTRAINT company_members_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_members company_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_members
    ADD CONSTRAINT company_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: company_philosophy company_philosophy_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_philosophy
    ADD CONSTRAINT company_philosophy_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_positions company_positions_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_positions
    ADD CONSTRAINT company_positions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_recruit_info company_recruit_info_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_recruit_info
    ADD CONSTRAINT company_recruit_info_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_reviews company_reviews_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_reviews
    ADD CONSTRAINT company_reviews_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_reviews company_reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.company_reviews
    ADD CONSTRAINT company_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: event_participants event_participants_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_participants
    ADD CONSTRAINT event_participants_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.student_profiles(id) ON DELETE CASCADE;


--
-- Name: event_details fk_event_job; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_details
    ADD CONSTRAINT fk_event_job FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: fulltime_details fk_fulltime_job; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fulltime_details
    ADD CONSTRAINT fk_fulltime_job FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: internship_details fk_internship_job; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internship_details
    ADD CONSTRAINT fk_internship_job FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: scouts fk_scouts_company; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scouts
    ADD CONSTRAINT fk_scouts_company FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: scouts fk_scouts_student; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scouts
    ADD CONSTRAINT fk_scouts_student FOREIGN KEY (student_id) REFERENCES public.student_profiles(id);


--
-- Name: scout_templates fk_templates_company; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scout_templates
    ADD CONSTRAINT fk_templates_company FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: internship_details internship_details_selection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.internship_details
    ADD CONSTRAINT internship_details_selection_id_fkey FOREIGN KEY (selection_id) REFERENCES public.jobs(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: job_interests job_interests_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_interests
    ADD CONSTRAINT job_interests_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: job_interests job_interests_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_interests
    ADD CONSTRAINT job_interests_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.student_profiles(id) ON DELETE CASCADE;


--
-- Name: job_tags job_tags_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_tags
    ADD CONSTRAINT job_tags_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: jobs jobs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: jobs jobs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: media_authors media_authors_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_authors
    ADD CONSTRAINT media_authors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: media_posts media_posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_posts
    ADD CONSTRAINT media_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.media_authors(id) ON DELETE SET NULL;


--
-- Name: media_posts media_posts_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_posts
    ADD CONSTRAINT media_posts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.media_categories(id) ON DELETE SET NULL;


--
-- Name: media_posts_tags media_posts_tags_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_posts_tags
    ADD CONSTRAINT media_posts_tags_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.media_posts(id) ON DELETE CASCADE;


--
-- Name: media_posts_tags media_posts_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.media_posts_tags
    ADD CONSTRAINT media_posts_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.media_tags(id) ON DELETE CASCADE;


--
-- Name: messages messages_chat_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_chat_room_id_fkey FOREIGN KEY (chat_room_id) REFERENCES public.chat_rooms(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: question_bank question_bank_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.challenges(id) ON DELETE CASCADE;


--
-- Name: referral_codes referral_codes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: referral_uses referral_uses_referral_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_uses
    ADD CONSTRAINT referral_uses_referral_code_id_fkey FOREIGN KEY (referral_code_id) REFERENCES public.referral_codes(id) ON DELETE CASCADE;


--
-- Name: referral_uses referral_uses_referred_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.referral_uses
    ADD CONSTRAINT referral_uses_referred_user_id_fkey FOREIGN KEY (referred_user_id) REFERENCES auth.users(id);


--
-- Name: resumes resumes_user_id_profile_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resumes
    ADD CONSTRAINT resumes_user_id_profile_fkey FOREIGN KEY (user_id) REFERENCES public.student_profiles(user_id) ON DELETE CASCADE;


--
-- Name: scout_templates scout_templates_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scout_templates
    ADD CONSTRAINT scout_templates_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: scout_templates scout_templates_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scout_templates
    ADD CONSTRAINT scout_templates_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL;


--
-- Name: scouts scouts_chat_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scouts
    ADD CONSTRAINT scouts_chat_room_id_fkey FOREIGN KEY (chat_room_id) REFERENCES public.chat_rooms(id);


--
-- Name: scouts scouts_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scouts
    ADD CONSTRAINT scouts_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: scouts scouts_company_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scouts
    ADD CONSTRAINT scouts_company_member_id_fkey FOREIGN KEY (company_member_id) REFERENCES public.company_members(id) ON DELETE CASCADE;


--
-- Name: scouts scouts_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scouts
    ADD CONSTRAINT scouts_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL;


--
-- Name: scouts scouts_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scouts
    ADD CONSTRAINT scouts_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.student_profiles(id) ON DELETE CASCADE;


--
-- Name: session_answers session_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session_answers
    ADD CONSTRAINT session_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.question_bank(id) ON DELETE CASCADE;


--
-- Name: session_answers session_answers_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session_answers
    ADD CONSTRAINT session_answers_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.challenge_sessions(id) ON DELETE CASCADE;


--
-- Name: student_profiles student_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: student_qualifications student_qualifications_qualification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_qualifications
    ADD CONSTRAINT student_qualifications_qualification_id_fkey FOREIGN KEY (qualification_id) REFERENCES public.qualifications(id) ON DELETE CASCADE;


--
-- Name: student_qualifications student_qualifications_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_qualifications
    ADD CONSTRAINT student_qualifications_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.student_profiles(id) ON DELETE CASCADE;


--
-- Name: student_skills student_skills_skill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_skills
    ADD CONSTRAINT student_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skills(id) ON DELETE CASCADE;


--
-- Name: student_skills student_skills_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.student_skills
    ADD CONSTRAINT student_skills_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.student_profiles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_signups user_signups_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_signups
    ADD CONSTRAINT user_signups_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: webtest_questions webtest_questions_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webtest_questions
    ADD CONSTRAINT webtest_questions_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.challenges(id) ON DELETE CASCADE;


--
-- Name: challenge_submissions Admins can grade; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can grade" ON public.challenge_submissions FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = 'admin'::text))))) WITH CHECK (true);


--
-- Name: features Admins full access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins full access" ON public.features USING (((auth.role() = 'service_role'::text) OR ((auth.jwt() ->> 'role'::text) = 'admin'::text)));


--
-- Name: notifications Admins insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins insert" ON public.notifications FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = 'admin'::text)))));


--
-- Name: features Admins manage features; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins manage features" ON public.features USING ((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = 'admin'::text)))));


--
-- Name: challenge_submissions Admins read all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins read all" ON public.challenge_submissions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = 'admin'::text)))));


--
-- Name: question_bank Allow read for all users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow read for all users" ON public.question_bank FOR SELECT USING (true);


--
-- Name: job_tags Anyone can view job tags; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view job tags" ON public.job_tags FOR SELECT USING (true);


--
-- Name: challenge_questions Authenticated can insert challenge_questions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated can insert challenge_questions" ON public.challenge_questions FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: resumes Company can read resumes of their applicants; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Company can read resumes of their applicants" ON public.resumes FOR SELECT TO authenticated USING ((user_id IN ( SELECT applications.student_id
   FROM public.applications
  WHERE (applications.company_id = auth.uid()))));


--
-- Name: company_favorites Favorites: Allow delete by owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Favorites: Allow delete by owner" ON public.company_favorites FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: company_favorites Favorites: Allow insert by owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Favorites: Allow insert by owner" ON public.company_favorites FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: company_favorites Favorites: Allow select for authenticated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Favorites: Allow select for authenticated" ON public.company_favorites FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: referral_codes Owner can read own codes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Owner can read own codes" ON public.referral_codes FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: referral_uses Owner can read own uses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Owner can read own uses" ON public.referral_uses FOR SELECT USING ((auth.uid() = ( SELECT rc.user_id
   FROM public.referral_codes rc
  WHERE (rc.id = referral_uses.referral_code_id))));


--
-- Name: media_categories Public read media_categories; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public read media_categories" ON public.media_categories FOR SELECT USING (true);


--
-- Name: session_answers Student can fetch own answers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Student can fetch own answers" ON public.session_answers USING ((session_id IN ( SELECT challenge_sessions.id
   FROM public.challenge_sessions
  WHERE (challenge_sessions.student_id = auth.uid()))));


--
-- Name: challenge_sessions Student can see own session; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Student can see own session" ON public.challenge_sessions USING ((student_id = auth.uid()));


--
-- Name: scouts Students can update scout status; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Students can update scout status" ON public.scouts FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.student_profiles
  WHERE ((student_profiles.id = scouts.student_id) AND (student_profiles.user_id = auth.uid())))));


--
-- Name: scouts Students can view and respond to scouts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Students can view and respond to scouts" ON public.scouts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.student_profiles
  WHERE ((student_profiles.id = scouts.student_id) AND (student_profiles.user_id = auth.uid())))));


--
-- Name: user_signups Users can insert their own signup row; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own signup row" ON public.user_signups FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: notifications Users can mark notifications as read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can mark notifications as read" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_signups Users can select their own signup row; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can select their own signup row" ON public.user_signups FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notifications Users can view own notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: activity_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: companies admin_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_all ON public.companies USING (((auth.jwt() ->> 'role'::text) = 'admin'::text)) WITH CHECK (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: user_roles admin_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_all ON public.user_roles USING (((auth.jwt() ->> 'role'::text) = 'admin'::text)) WITH CHECK (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: jobs admin_can_do_anything; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_can_do_anything ON public.jobs TO admin USING (true) WITH CHECK (true);


--
-- Name: events admin_full_access; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_full_access ON public.events TO authenticated USING ((auth.role() = 'admin'::text)) WITH CHECK ((auth.role() = 'admin'::text));


--
-- Name: activity_logs admin_only; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_only ON public.activity_logs USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: admins admin_only; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_only ON public.admins USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: challenge_questions admin_only; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_only ON public.challenge_questions USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: job_tags admin_only; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_only ON public.job_tags USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: question_bank admin_only; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_only ON public.question_bank USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: session_answers admin_only; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_only ON public.session_answers USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: users admin_only; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_only ON public.users FOR SELECT USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: challenge_sessions admin_or_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_or_owner ON public.challenge_sessions USING ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (student_id = auth.uid())));


--
-- Name: challenge_submissions admin_or_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_or_owner ON public.challenge_submissions USING ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (student_id = auth.uid())));


--
-- Name: challenges admin_or_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_or_owner ON public.challenges USING ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (student_id = auth.uid())));


--
-- Name: companies admin_or_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_or_owner ON public.companies USING ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (user_id = auth.uid())));


--
-- Name: job_interests admin_or_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_or_owner ON public.job_interests USING ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (student_id = auth.uid())));


--
-- Name: notifications admin_or_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_or_owner ON public.notifications USING ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (user_id = auth.uid())));


--
-- Name: resumes admin_or_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_or_owner ON public.resumes USING ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (user_id = auth.uid())));


--
-- Name: scout_templates admin_or_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_or_owner ON public.scout_templates USING ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (company_id = auth.uid())));


--
-- Name: scouts admin_or_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_or_owner ON public.scouts USING ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (student_id = auth.uid())));


--
-- Name: user_roles admin_or_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_or_owner ON public.user_roles USING ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (user_id = auth.uid())));


--
-- Name: user_signups admin_or_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_or_owner ON public.user_signups USING ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (user_id = auth.uid())));


--
-- Name: companies admin_or_owner_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admin_or_owner_write ON public.companies USING ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (user_id = auth.uid())));


--
-- Name: admins; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

--
-- Name: activity_logs admins_can_read_logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY admins_can_read_logs ON public.activity_logs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = 'admin'::text)))));


--
-- Name: resumes allow all select for resumes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "allow all select for resumes" ON public.resumes FOR SELECT USING (true);


--
-- Name: resumes allow select for all users; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "allow select for all users" ON public.resumes FOR SELECT USING (true);


--
-- Name: applications app_student_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY app_student_insert ON public.applications FOR INSERT WITH CHECK ((student_id IN ( SELECT student_profiles.id
   FROM public.student_profiles
  WHERE (student_profiles.user_id = auth.uid()))));


--
-- Name: applications app_student_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY app_student_select ON public.applications FOR SELECT USING ((student_id IN ( SELECT student_profiles.id
   FROM public.student_profiles
  WHERE (student_profiles.user_id = auth.uid()))));


--
-- Name: applications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

--
-- Name: question_bank authenticated_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY authenticated_insert ON public.question_bank FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: media_posts author read draft; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "author read draft" ON public.media_posts FOR SELECT USING (((status = 'published'::text) OR (auth.uid() = ( SELECT media_authors.user_id
   FROM public.media_authors
  WHERE (media_authors.id = media_posts.author_id)))));


--
-- Name: media_posts author update own post; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "author update own post" ON public.media_posts FOR UPDATE USING ((auth.uid() = ( SELECT media_authors.user_id
   FROM public.media_authors
  WHERE (media_authors.id = media_posts.author_id))));


--
-- Name: challenge_questions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.challenge_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: challenge_sessions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.challenge_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: challenge_submissions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: challenges; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: challenges challenges_authenticated_write; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY challenges_authenticated_write ON public.challenges TO authenticated USING (true) WITH CHECK (true);


--
-- Name: challenges challenges_insert_auth; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY challenges_insert_auth ON public.challenges FOR INSERT TO authenticated WITH CHECK ((created_by = auth.uid()));


--
-- Name: challenges challenges_rw_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY challenges_rw_owner ON public.challenges TO authenticated USING ((created_by = auth.uid())) WITH CHECK ((created_by = auth.uid()));


--
-- Name: chat_rooms; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

--
-- Name: company_members cm_company_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY cm_company_select ON public.company_members FOR SELECT USING ((company_id IN ( SELECT user_companies.company_id
   FROM public.user_companies
  WHERE (user_companies.user_id = auth.uid()))));


--
-- Name: company_members cm_self_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY cm_self_insert ON public.company_members FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: company_members cm_self_only; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY cm_self_only ON public.company_members TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: companies; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

--
-- Name: companies companies_admin_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY companies_admin_all ON public.companies TO supabase_auth_admin USING (true) WITH CHECK (true);


--
-- Name: companies companies_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY companies_select ON public.companies FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.company_members
  WHERE ((company_members.company_id = companies.id) AND (company_members.user_id = auth.uid())))));


--
-- Name: resumes company can read all resumes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "company can read all resumes" ON public.resumes FOR SELECT TO authenticated USING (true);


--
-- Name: scouts company can read own scouts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "company can read own scouts" ON public.scouts FOR SELECT USING ((company_member_id = ( SELECT company_members.id
   FROM public.company_members
  WHERE (company_members.user_id = auth.uid())
 LIMIT 1)));


--
-- Name: scouts company can update own scouts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "company can update own scouts" ON public.scouts FOR UPDATE USING ((company_member_id = ( SELECT company_members.id
   FROM public.company_members
  WHERE (company_members.user_id = auth.uid())
 LIMIT 1)));


--
-- Name: chat_rooms company member can insert chat room; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "company member can insert chat room" ON public.chat_rooms FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.company_members
  WHERE ((company_members.company_id = chat_rooms.company_id) AND (company_members.user_id = auth.uid())))));


--
-- Name: scouts company read scouts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "company read scouts" ON public.scouts FOR SELECT USING ((job_id IN ( SELECT jobs.id
   FROM public.jobs
  WHERE (jobs.company_id = auth.uid()))));


--
-- Name: jobs company user can insert jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "company user can insert jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK ((company_id IN ( SELECT companies.id
   FROM public.companies
  WHERE (companies.user_id = auth.uid()))));


--
-- Name: companies company_admin can select own company; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "company_admin can select own company" ON public.companies FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: chat_rooms company_can_access_their_chat_rooms; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY company_can_access_their_chat_rooms ON public.chat_rooms USING ((EXISTS ( SELECT 1
   FROM public.company_members cu
  WHERE ((cu.company_id = chat_rooms.company_id) AND (cu.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.company_members cu
  WHERE ((cu.company_id = chat_rooms.company_id) AND (cu.user_id = auth.uid())))));


--
-- Name: jobs company_can_manage_own_jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY company_can_manage_own_jobs ON public.jobs USING ((company_id IN ( SELECT companies.id
   FROM public.companies
  WHERE (companies.user_id = auth.uid())))) WITH CHECK ((company_id IN ( SELECT companies.id
   FROM public.companies
  WHERE (companies.user_id = auth.uid()))));


--
-- Name: company_favorites; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.company_favorites ENABLE ROW LEVEL SECURITY;

--
-- Name: scouts company_manage_scouts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY company_manage_scouts ON public.scouts TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.companies c
  WHERE ((c.id = scouts.company_id) AND (c.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.company_members m
  WHERE ((m.company_id = scouts.company_id) AND (m.user_id = auth.uid())))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.companies c
  WHERE ((c.id = scouts.company_id) AND (c.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.company_members m
  WHERE ((m.company_id = scouts.company_id) AND (m.user_id = auth.uid()))))));


--
-- Name: scout_templates company_manage_templates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY company_manage_templates ON public.scout_templates TO authenticated USING ((is_global OR (EXISTS ( SELECT 1
   FROM public.company_members cm
  WHERE ((cm.user_id = auth.uid()) AND (cm.company_id = cm.company_id)))))) WITH CHECK ((is_global OR (EXISTS ( SELECT 1
   FROM public.company_members cm
  WHERE ((cm.user_id = auth.uid()) AND (cm.company_id = cm.company_id))))));


--
-- Name: company_members; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

--
-- Name: scout_templates company_owner_manage_templates; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY company_owner_manage_templates ON public.scout_templates TO authenticated USING ((is_global OR (EXISTS ( SELECT 1
   FROM public.companies c
  WHERE ((c.id = scout_templates.company_id) AND (c.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.company_members m
  WHERE ((m.company_id = scout_templates.company_id) AND (m.user_id = auth.uid())))))) WITH CHECK ((is_global OR (EXISTS ( SELECT 1
   FROM public.companies c
  WHERE ((c.id = scout_templates.company_id) AND (c.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.company_members m
  WHERE ((m.company_id = scout_templates.company_id) AND (m.user_id = auth.uid()))))));


--
-- Name: company_recruit_info; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.company_recruit_info ENABLE ROW LEVEL SECURITY;

--
-- Name: challenge_questions cq_any_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY cq_any_insert ON public.challenge_questions FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: challenge_questions cq_any_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY cq_any_select ON public.challenge_questions FOR SELECT TO authenticated USING (true);


--
-- Name: challenge_questions cq_authenticated_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY cq_authenticated_delete ON public.challenge_questions FOR DELETE TO authenticated USING (true);


--
-- Name: challenge_questions cq_authenticated_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY cq_authenticated_insert ON public.challenge_questions FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: challenge_questions cq_insert_debug; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY cq_insert_debug ON public.challenge_questions FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: challenge_questions cq_owner_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY cq_owner_insert ON public.challenge_questions FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.challenges c
  WHERE ((c.id = challenge_questions.challenge_id) AND (c.created_by = auth.uid())))));


--
-- Name: challenge_questions cq_owner_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY cq_owner_select ON public.challenge_questions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.challenges c
  WHERE ((c.id = challenge_questions.challenge_id) AND (c.created_by = auth.uid())))));


--
-- Name: challenge_questions cq_select_auth; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY cq_select_auth ON public.challenge_questions FOR SELECT TO authenticated USING (true);


--
-- Name: company_recruit_info cri_self_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY cri_self_all ON public.company_recruit_info TO authenticated USING ((company_id IN ( SELECT companies.id
   FROM public.companies
  WHERE (companies.user_id = auth.uid())))) WITH CHECK ((company_id IN ( SELECT companies.id
   FROM public.companies
  WHERE (companies.user_id = auth.uid()))));


--
-- Name: event_participants ep_student_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ep_student_insert ON public.event_participants FOR INSERT WITH CHECK ((student_id IN ( SELECT student_profiles.id
   FROM public.student_profiles
  WHERE (student_profiles.user_id = auth.uid()))));


--
-- Name: event_participants ep_student_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY ep_student_select ON public.event_participants FOR SELECT USING ((student_id IN ( SELECT student_profiles.id
   FROM public.student_profiles
  WHERE (student_profiles.user_id = auth.uid()))));


--
-- Name: event_participants; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- Name: features; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;

--
-- Name: companies insert own company; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "insert own company" ON public.companies FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: notifications insert_own_notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY insert_own_notifications ON public.notifications FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_roles insert_own_role_once; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY insert_own_role_once ON public.user_roles FOR INSERT WITH CHECK (((auth.uid() = user_id) AND (NOT (EXISTS ( SELECT 1
   FROM public.user_roles r2
  WHERE (r2.user_id = auth.uid()))))));


--
-- Name: job_interests; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.job_interests ENABLE ROW LEVEL SECURITY;

--
-- Name: job_tags; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.job_tags ENABLE ROW LEVEL SECURITY;

--
-- Name: jobs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: media_posts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.media_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: media_posts media_posts_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY media_posts_insert_own ON public.media_posts FOR INSERT WITH CHECK ((auth.uid() = ( SELECT media_authors.user_id
   FROM public.media_authors
  WHERE (media_authors.id = media_posts.author_id))));


--
-- Name: media_posts_tags; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.media_posts_tags ENABLE ROW LEVEL SECURITY;

--
-- Name: media_posts_tags media_posts_tags_insert_if_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY media_posts_tags_insert_if_owner ON public.media_posts_tags FOR INSERT WITH CHECK ((auth.uid() = ( SELECT a.user_id
   FROM (public.media_authors a
     JOIN public.media_posts p ON ((p.author_id = a.id)))
  WHERE (p.id = media_posts_tags.post_id))));


--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications owner_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY owner_read ON public.notifications FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: messages participant_can_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY participant_can_insert ON public.messages FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.chat_rooms cr
  WHERE ((cr.id = messages.chat_room_id) AND ((EXISTS ( SELECT 1
           FROM public.student_profiles sp
          WHERE ((sp.id = cr.student_id) AND (sp.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM public.company_members cm
          WHERE ((cm.company_id = cr.company_id) AND (cm.user_id = auth.uid())))))))));


--
-- Name: messages participant_can_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY participant_can_select ON public.messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.chat_rooms cr
  WHERE ((cr.id = messages.chat_room_id) AND ((EXISTS ( SELECT 1
           FROM public.student_profiles sp
          WHERE ((sp.id = cr.student_id) AND (sp.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM public.company_members cm
          WHERE ((cm.company_id = cr.company_id) AND (cm.user_id = auth.uid())))))))));


--
-- Name: messages participant_can_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY participant_can_update ON public.messages FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.chat_rooms cr
  WHERE ((cr.id = messages.chat_room_id) AND ((EXISTS ( SELECT 1
           FROM public.student_profiles sp
          WHERE ((sp.id = cr.student_id) AND (sp.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM public.company_members cm
          WHERE ((cm.company_id = cr.company_id) AND (cm.user_id = auth.uid()))))))))) WITH CHECK (true);


--
-- Name: companies public read companies; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "public read companies" ON public.companies FOR SELECT USING (true);


--
-- Name: job_tags public read job_tags; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "public read job_tags" ON public.job_tags FOR SELECT USING (true);


--
-- Name: media_posts public read published posts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "public read published posts" ON public.media_posts FOR SELECT USING ((status = 'published'::text));


--
-- Name: resumes public read resumes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "public read resumes" ON public.resumes FOR SELECT TO authenticated USING (true);


--
-- Name: jobs public_can_view_published_jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY public_can_view_published_jobs ON public.jobs FOR SELECT USING ((published = true));


--
-- Name: question_bank; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles read_own_role; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY read_own_role ON public.user_roles FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: resumes resume_owner_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY resume_owner_all ON public.resumes USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = ANY ((ARRAY['company'::character varying, 'company_admin'::character varying])::text[]))))))) WITH CHECK ((user_id = auth.uid()));


--
-- Name: resumes resume_owner_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY resume_owner_insert ON public.resumes FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: resumes resume_owner_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY resume_owner_update ON public.resumes FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: resumes resume_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY resume_select ON public.resumes FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = ANY ((ARRAY['company'::character varying, 'company_admin'::character varying])::text[])))))));


--
-- Name: resumes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

--
-- Name: resumes resumes_owner; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY resumes_owner ON public.resumes USING ((auth.uid() = user_id));


--
-- Name: resumes resumes_readable_by_company; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY resumes_readable_by_company ON public.resumes FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = ANY ((ARRAY['company'::character varying, 'company_admin'::character varying])::text[]))))) OR (user_id = auth.uid())));


--
-- Name: scout_templates; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.scout_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: scouts; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.scouts ENABLE ROW LEVEL SECURITY;

--
-- Name: companies select own company; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "select own company" ON public.companies FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: notifications select own notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "select own notifications" ON public.notifications FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: chat_rooms select_chat_rooms_participants; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY select_chat_rooms_participants ON public.chat_rooms FOR SELECT TO authenticated USING (((auth.uid() IN ( SELECT student_profiles.user_id
   FROM public.student_profiles
  WHERE (student_profiles.id = chat_rooms.student_id))) OR (auth.uid() IN ( SELECT company_members.user_id
   FROM public.company_members
  WHERE (company_members.company_id = chat_rooms.company_id)))));


--
-- Name: notifications select_own_notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY select_own_notifications ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles select_own_role; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY select_own_role ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: events select_published_events; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY select_published_events ON public.events FOR SELECT USING (((status)::text = 'published'::text));


--
-- Name: challenges select_webtest_authenticated; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY select_webtest_authenticated ON public.challenges FOR SELECT TO authenticated USING (((student_id IS NULL) AND (category = 'webtest'::text) AND (start_date <= now()) AND ((deadline IS NULL) OR (deadline >= now()))));


--
-- Name: users self_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY self_insert ON public.users FOR INSERT WITH CHECK ((id = auth.uid()));


--
-- Name: users self_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY self_update ON public.users FOR UPDATE USING ((id = auth.uid()));


--
-- Name: student_profiles server insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "server insert" ON public.student_profiles FOR INSERT TO authenticator WITH CHECK (true);


--
-- Name: jobs service_role_can_update_is_recommended; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY service_role_can_update_is_recommended ON public.jobs FOR UPDATE TO service_role USING (true) WITH CHECK (true);


--
-- Name: session_answers; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.session_answers ENABLE ROW LEVEL SECURITY;

--
-- Name: student_profiles sp_company_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sp_company_read ON public.student_profiles FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = ANY ((ARRAY['company'::character varying, 'company_admin'::character varying])::text[]))))) OR (COALESCE((auth.jwt() ->> 'role'::text), ''::text) = 'admin'::text)));


--
-- Name: student_profiles sp_owner_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sp_owner_insert ON public.student_profiles FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: student_profiles sp_owner_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sp_owner_select ON public.student_profiles FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: student_profiles sp_owner_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sp_owner_update ON public.student_profiles FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: chat_rooms student can insert chat room; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "student can insert chat room" ON public.chat_rooms FOR INSERT WITH CHECK ((student_id = ( SELECT sp.id
   FROM public.student_profiles sp
  WHERE (sp.user_id = auth.uid())
 LIMIT 1)));


--
-- Name: session_answers student owns answer; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "student owns answer" ON public.session_answers USING ((EXISTS ( SELECT 1
   FROM public.challenge_sessions cs
  WHERE ((cs.id = session_answers.session_id) AND (cs.student_id = auth.uid())))));


--
-- Name: chat_rooms student_can_read_their_chat_rooms; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY student_can_read_their_chat_rooms ON public.chat_rooms FOR SELECT USING ((student_id = auth.uid()));


--
-- Name: chat_rooms student_can_write_their_chat_rooms; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY student_can_write_their_chat_rooms ON public.chat_rooms USING ((student_id = auth.uid())) WITH CHECK ((student_id = auth.uid()));


--
-- Name: student_profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: scouts student_read_own_scouts; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY student_read_own_scouts ON public.scouts FOR SELECT USING ((student_id = auth.uid()));


--
-- Name: session_answers students insert own session answers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "students insert own session answers" ON public.session_answers FOR INSERT WITH CHECK ((session_id IN ( SELECT challenge_sessions.id
   FROM public.challenge_sessions
  WHERE (challenge_sessions.student_id = ( SELECT student_profiles.id
           FROM public.student_profiles
          WHERE (student_profiles.user_id = auth.uid()))))));


--
-- Name: challenge_sessions students insert own sessions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "students insert own sessions" ON public.challenge_sessions FOR INSERT WITH CHECK ((student_id = ( SELECT student_profiles.id
   FROM public.student_profiles
  WHERE (student_profiles.user_id = auth.uid()))));


--
-- Name: challenge_sessions students manage own sessions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "students manage own sessions" ON public.challenge_sessions USING ((student_id IN ( SELECT student_profiles.id
   FROM public.student_profiles
  WHERE (student_profiles.user_id = auth.uid())))) WITH CHECK ((student_id IN ( SELECT student_profiles.id
   FROM public.student_profiles
  WHERE (student_profiles.user_id = auth.uid()))));


--
-- Name: session_answers students select own session answers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "students select own session answers" ON public.session_answers FOR SELECT USING ((session_id IN ( SELECT challenge_sessions.id
   FROM public.challenge_sessions
  WHERE (challenge_sessions.student_id = ( SELECT student_profiles.id
           FROM public.student_profiles
          WHERE (student_profiles.user_id = auth.uid()))))));


--
-- Name: challenge_sessions students select own sessions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "students select own sessions" ON public.challenge_sessions FOR SELECT USING ((student_id = ( SELECT student_profiles.id
   FROM public.student_profiles
  WHERE (student_profiles.user_id = auth.uid()))));


--
-- Name: session_answers students update own session answers; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "students update own session answers" ON public.session_answers FOR UPDATE USING ((session_id IN ( SELECT challenge_sessions.id
   FROM public.challenge_sessions
  WHERE (challenge_sessions.student_id = ( SELECT student_profiles.id
           FROM public.student_profiles
          WHERE (student_profiles.user_id = auth.uid()))))));


--
-- Name: challenge_sessions students update own sessions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "students update own sessions" ON public.challenge_sessions FOR UPDATE USING ((student_id = ( SELECT student_profiles.id
   FROM public.student_profiles
  WHERE (student_profiles.user_id = auth.uid()))));


--
-- Name: student_profiles students_insert_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY students_insert_own ON public.student_profiles FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: student_profiles students_select_admin; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY students_select_admin ON public.student_profiles FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = 'admin'::text)))) OR (auth.role() = 'service_role'::text)));


--
-- Name: student_profiles students_select_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY students_select_own ON public.student_profiles FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: student_profiles students_update_own; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY students_update_own ON public.student_profiles FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: companies update own company; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "update own company" ON public.companies FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: notifications update own notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "update own notifications" ON public.notifications FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: notifications update_is_read; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY update_is_read ON public.notifications FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_roles user can read own role; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "user can read own role" ON public.user_roles FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles user_roles_admin_all; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY user_roles_admin_all ON public.user_roles TO supabase_admin, supabase_auth_admin USING (true) WITH CHECK (true);


--
-- Name: user_roles user_roles_block_delete; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY user_roles_block_delete ON public.user_roles FOR DELETE TO authenticated USING (false);


--
-- Name: user_roles user_roles_block_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY user_roles_block_update ON public.user_roles FOR UPDATE TO authenticated USING (false);


--
-- Name: user_roles user_roles_insert_once; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY user_roles_insert_once ON public.user_roles FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: user_signups; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_signups ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: companies 企業メンバーだけが更新; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "企業メンバーだけが更新" ON public.companies FOR UPDATE USING ((public.is_company_member(id) OR ((auth.jwt() ->> 'role'::text) = 'admin'::text))) WITH CHECK ((public.is_company_member(id) OR ((auth.jwt() ->> 'role'::text) = 'admin'::text)));


--
-- Name: companies 公開読み取り; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "公開読み取り" ON public.companies FOR SELECT USING (true);


--
-- Name: job_interests 学生本人のみ削除; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "学生本人のみ削除" ON public.job_interests FOR DELETE USING (((student_id = auth.uid()) OR public.is_admin()));


--
-- Name: job_interests 学生本人のみ参照; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "学生本人のみ参照" ON public.job_interests FOR SELECT USING (((student_id = auth.uid()) OR public.is_admin()));


--
-- Name: job_interests 学生本人のみ追加; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "学生本人のみ追加" ON public.job_interests FOR INSERT WITH CHECK (((student_id = auth.uid()) OR public.is_admin()));


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;


--
-- Name: FUNCTION accept_offer(p_scout_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.accept_offer(p_scout_id uuid) TO anon;
GRANT ALL ON FUNCTION public.accept_offer(p_scout_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.accept_offer(p_scout_id uuid) TO service_role;


--
-- Name: FUNCTION add_creator_to_members(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.add_creator_to_members() TO anon;
GRANT ALL ON FUNCTION public.add_creator_to_members() TO authenticated;
GRANT ALL ON FUNCTION public.add_creator_to_members() TO service_role;


--
-- Name: FUNCTION add_owner_to_company_members(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.add_owner_to_company_members() TO anon;
GRANT ALL ON FUNCTION public.add_owner_to_company_members() TO authenticated;
GRANT ALL ON FUNCTION public.add_owner_to_company_members() TO service_role;


--
-- Name: FUNCTION auto_grade_answer(p_question_id uuid, p_answer_raw jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.auto_grade_answer(p_question_id uuid, p_answer_raw jsonb) TO anon;
GRANT ALL ON FUNCTION public.auto_grade_answer(p_question_id uuid, p_answer_raw jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.auto_grade_answer(p_question_id uuid, p_answer_raw jsonb) TO service_role;


--
-- Name: FUNCTION avg_response_time(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.avg_response_time() TO anon;
GRANT ALL ON FUNCTION public.avg_response_time() TO authenticated;
GRANT ALL ON FUNCTION public.avg_response_time() TO service_role;


--
-- Name: FUNCTION avg_response_time_sec(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.avg_response_time_sec() TO anon;
GRANT ALL ON FUNCTION public.avg_response_time_sec() TO authenticated;
GRANT ALL ON FUNCTION public.avg_response_time_sec() TO service_role;


--
-- Name: FUNCTION calculate_profile_completion(p_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.calculate_profile_completion(p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.calculate_profile_completion(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.calculate_profile_completion(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION calculate_resume_completion(p_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.calculate_resume_completion(p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.calculate_resume_completion(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.calculate_resume_completion(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION calculate_work_history_completion(p_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.calculate_work_history_completion(p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.calculate_work_history_completion(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.calculate_work_history_completion(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION count_unread(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.count_unread() TO anon;
GRANT ALL ON FUNCTION public.count_unread() TO authenticated;
GRANT ALL ON FUNCTION public.count_unread() TO service_role;


--
-- Name: FUNCTION count_unread(_uid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.count_unread(_uid uuid) TO anon;
GRANT ALL ON FUNCTION public.count_unread(_uid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.count_unread(_uid uuid) TO service_role;


--
-- Name: FUNCTION create_referral_code(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.create_referral_code() TO anon;
GRANT ALL ON FUNCTION public.create_referral_code() TO authenticated;
GRANT ALL ON FUNCTION public.create_referral_code() TO service_role;


--
-- Name: FUNCTION custom_access_token_hook(uid uuid, email text, claims jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.custom_access_token_hook(uid uuid, email text, claims jsonb) TO anon;
GRANT ALL ON FUNCTION public.custom_access_token_hook(uid uuid, email text, claims jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.custom_access_token_hook(uid uuid, email text, claims jsonb) TO service_role;
GRANT ALL ON FUNCTION public.custom_access_token_hook(uid uuid, email text, claims jsonb) TO supabase_auth_admin;


--
-- Name: FUNCTION dashboard_overview(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.dashboard_overview() TO anon;
GRANT ALL ON FUNCTION public.dashboard_overview() TO authenticated;
GRANT ALL ON FUNCTION public.dashboard_overview() TO service_role;


--
-- Name: FUNCTION enqueue_email_notification(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.enqueue_email_notification() TO anon;
GRANT ALL ON FUNCTION public.enqueue_email_notification() TO authenticated;
GRANT ALL ON FUNCTION public.enqueue_email_notification() TO service_role;


--
-- Name: FUNCTION ensure_user_id(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.ensure_user_id() TO anon;
GRANT ALL ON FUNCTION public.ensure_user_id() TO authenticated;
GRANT ALL ON FUNCTION public.ensure_user_id() TO service_role;


--
-- Name: FUNCTION f_create_student_profile(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.f_create_student_profile() TO anon;
GRANT ALL ON FUNCTION public.f_create_student_profile() TO authenticated;
GRANT ALL ON FUNCTION public.f_create_student_profile() TO service_role;


--
-- Name: FUNCTION filling_company_id(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.filling_company_id() TO anon;
GRANT ALL ON FUNCTION public.filling_company_id() TO authenticated;
GRANT ALL ON FUNCTION public.filling_company_id() TO service_role;


--
-- Name: FUNCTION fn_create_profile_from_student(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.fn_create_profile_from_student() TO anon;
GRANT ALL ON FUNCTION public.fn_create_profile_from_student() TO authenticated;
GRANT ALL ON FUNCTION public.fn_create_profile_from_student() TO service_role;


--
-- Name: FUNCTION fn_notify_send_email(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.fn_notify_send_email() TO anon;
GRANT ALL ON FUNCTION public.fn_notify_send_email() TO authenticated;
GRANT ALL ON FUNCTION public.fn_notify_send_email() TO service_role;


--
-- Name: FUNCTION fn_offer_approved_notify(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.fn_offer_approved_notify() TO anon;
GRANT ALL ON FUNCTION public.fn_offer_approved_notify() TO authenticated;
GRANT ALL ON FUNCTION public.fn_offer_approved_notify() TO service_role;


--
-- Name: FUNCTION fn_scout_accepted_notify(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.fn_scout_accepted_notify() TO anon;
GRANT ALL ON FUNCTION public.fn_scout_accepted_notify() TO authenticated;
GRANT ALL ON FUNCTION public.fn_scout_accepted_notify() TO service_role;


--
-- Name: FUNCTION get_leaderboard(p_limit integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_leaderboard(p_limit integer) TO anon;
GRANT ALL ON FUNCTION public.get_leaderboard(p_limit integer) TO authenticated;
GRANT ALL ON FUNCTION public.get_leaderboard(p_limit integer) TO service_role;


--
-- Name: FUNCTION get_my_chat_rooms(p_user uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_my_chat_rooms(p_user uuid) TO anon;
GRANT ALL ON FUNCTION public.get_my_chat_rooms(p_user uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_my_chat_rooms(p_user uuid) TO service_role;


--
-- Name: TABLE chat_rooms; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.chat_rooms TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.chat_rooms TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.chat_rooms TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.chat_rooms TO admin;


--
-- Name: FUNCTION get_or_create_chat_room_from_scout(p_scout_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_or_create_chat_room_from_scout(p_scout_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_or_create_chat_room_from_scout(p_scout_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_or_create_chat_room_from_scout(p_scout_id uuid) TO service_role;


--
-- Name: FUNCTION get_user_role(p_uid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_user_role(p_uid uuid) TO anon;
GRANT ALL ON FUNCTION public.get_user_role(p_uid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_role(p_uid uuid) TO service_role;


--
-- Name: FUNCTION grade_session(p_session_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.grade_session(p_session_id uuid) TO anon;
GRANT ALL ON FUNCTION public.grade_session(p_session_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.grade_session(p_session_id uuid) TO service_role;


--
-- Name: FUNCTION grade_webtest(p_submission_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.grade_webtest(p_submission_id uuid) TO anon;
GRANT ALL ON FUNCTION public.grade_webtest(p_submission_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.grade_webtest(p_submission_id uuid) TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;
GRANT ALL ON FUNCTION public.handle_new_user() TO supabase_admin;


--
-- Name: FUNCTION increment_job_view(_job_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.increment_job_view(_job_id uuid) TO anon;
GRANT ALL ON FUNCTION public.increment_job_view(_job_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.increment_job_view(_job_id uuid) TO service_role;


--
-- Name: FUNCTION is_admin(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_admin() TO anon;
GRANT ALL ON FUNCTION public.is_admin() TO authenticated;
GRANT ALL ON FUNCTION public.is_admin() TO service_role;


--
-- Name: FUNCTION is_application_owner(p_student_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_application_owner(p_student_id uuid) TO anon;
GRANT ALL ON FUNCTION public.is_application_owner(p_student_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_application_owner(p_student_id uuid) TO service_role;


--
-- Name: FUNCTION is_chat_participant(room_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_chat_participant(room_id uuid) TO anon;
GRANT ALL ON FUNCTION public.is_chat_participant(room_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_chat_participant(room_id uuid) TO service_role;


--
-- Name: FUNCTION is_company(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_company() TO anon;
GRANT ALL ON FUNCTION public.is_company() TO authenticated;
GRANT ALL ON FUNCTION public.is_company() TO service_role;


--
-- Name: FUNCTION is_company_member(c_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_company_member(c_id uuid) TO anon;
GRANT ALL ON FUNCTION public.is_company_member(c_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_company_member(c_id uuid) TO service_role;


--
-- Name: FUNCTION is_student(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.is_student() TO anon;
GRANT ALL ON FUNCTION public.is_student() TO authenticated;
GRANT ALL ON FUNCTION public.is_student() TO service_role;


--
-- Name: FUNCTION jwt_custom_claims_hook(event jsonb); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.jwt_custom_claims_hook(event jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.jwt_custom_claims_hook(event jsonb) TO service_role;
GRANT ALL ON FUNCTION public.jwt_custom_claims_hook(event jsonb) TO supabase_auth_admin;


--
-- Name: FUNCTION jwt_custom_claims_hook(uid uuid, email text, claims jsonb); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.jwt_custom_claims_hook(uid uuid, email text, claims jsonb) TO anon;
GRANT ALL ON FUNCTION public.jwt_custom_claims_hook(uid uuid, email text, claims jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.jwt_custom_claims_hook(uid uuid, email text, claims jsonb) TO service_role;


--
-- Name: FUNCTION log_activity(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.log_activity() TO anon;
GRANT ALL ON FUNCTION public.log_activity() TO authenticated;
GRANT ALL ON FUNCTION public.log_activity() TO service_role;


--
-- Name: FUNCTION log_role_change(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.log_role_change() TO anon;
GRANT ALL ON FUNCTION public.log_role_change() TO authenticated;
GRANT ALL ON FUNCTION public.log_role_change() TO service_role;


--
-- Name: FUNCTION notify_on_chat_insert(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.notify_on_chat_insert() TO anon;
GRANT ALL ON FUNCTION public.notify_on_chat_insert() TO authenticated;
GRANT ALL ON FUNCTION public.notify_on_chat_insert() TO service_role;


--
-- Name: FUNCTION notify_on_scout_insert(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.notify_on_scout_insert() TO anon;
GRANT ALL ON FUNCTION public.notify_on_scout_insert() TO authenticated;
GRANT ALL ON FUNCTION public.notify_on_scout_insert() TO service_role;


--
-- Name: FUNCTION prepare_session_answers(p_session_uuid uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.prepare_session_answers(p_session_uuid uuid) TO anon;
GRANT ALL ON FUNCTION public.prepare_session_answers(p_session_uuid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.prepare_session_answers(p_session_uuid uuid) TO service_role;


--
-- Name: FUNCTION queue_email_notification(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.queue_email_notification() TO anon;
GRANT ALL ON FUNCTION public.queue_email_notification() TO authenticated;
GRANT ALL ON FUNCTION public.queue_email_notification() TO service_role;


--
-- Name: FUNCTION scout_to_application(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.scout_to_application() TO anon;
GRANT ALL ON FUNCTION public.scout_to_application() TO authenticated;
GRANT ALL ON FUNCTION public.scout_to_application() TO service_role;


--
-- Name: FUNCTION set_answered_at_on_company_insert(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_answered_at_on_company_insert() TO anon;
GRANT ALL ON FUNCTION public.set_answered_at_on_company_insert() TO authenticated;
GRANT ALL ON FUNCTION public.set_answered_at_on_company_insert() TO service_role;


--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;


--
-- Name: FUNCTION start_webtest_session(p_challenge_id uuid, p_student_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.start_webtest_session(p_challenge_id uuid, p_student_id uuid) TO anon;
GRANT ALL ON FUNCTION public.start_webtest_session(p_challenge_id uuid, p_student_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.start_webtest_session(p_challenge_id uuid, p_student_id uuid) TO service_role;


--
-- Name: FUNCTION start_webtest_session_balanced(p_challenge_id uuid, p_student_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.start_webtest_session_balanced(p_challenge_id uuid, p_student_id uuid) TO anon;
GRANT ALL ON FUNCTION public.start_webtest_session_balanced(p_challenge_id uuid, p_student_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.start_webtest_session_balanced(p_challenge_id uuid, p_student_id uuid) TO service_role;


--
-- Name: FUNCTION sync_user_id(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sync_user_id() TO anon;
GRANT ALL ON FUNCTION public.sync_user_id() TO authenticated;
GRANT ALL ON FUNCTION public.sync_user_id() TO service_role;


--
-- Name: FUNCTION sync_user_roles(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.sync_user_roles() TO anon;
GRANT ALL ON FUNCTION public.sync_user_roles() TO authenticated;
GRANT ALL ON FUNCTION public.sync_user_roles() TO service_role;


--
-- Name: FUNCTION trigger_send_email(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.trigger_send_email() TO anon;
GRANT ALL ON FUNCTION public.trigger_send_email() TO authenticated;
GRANT ALL ON FUNCTION public.trigger_send_email() TO service_role;


--
-- Name: FUNCTION update_modified_column(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_modified_column() TO anon;
GRANT ALL ON FUNCTION public.update_modified_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_modified_column() TO service_role;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;


--
-- Name: TABLE activity_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.activity_logs TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.activity_logs TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.activity_logs TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.activity_logs TO admin;


--
-- Name: TABLE admins; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.admins TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.admins TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.admins TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.admins TO admin;


--
-- Name: TABLE applications; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.applications TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.applications TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.applications TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.applications TO admin;


--
-- Name: TABLE student_profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.student_profiles TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.student_profiles TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.student_profiles TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.student_profiles TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.student_profiles TO authenticator;


--
-- Name: COLUMN student_profiles.full_name; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT(full_name) ON TABLE public.student_profiles TO authenticated;


--
-- Name: COLUMN student_profiles.university; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT(university) ON TABLE public.student_profiles TO authenticated;


--
-- Name: TABLE applicants_view; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.applicants_view TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.applicants_view TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.applicants_view TO service_role;


--
-- Name: TABLE bizscore_questions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.bizscore_questions TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.bizscore_questions TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.bizscore_questions TO service_role;


--
-- Name: TABLE challenge_questions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.challenge_questions TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.challenge_questions TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.challenge_questions TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.challenge_questions TO admin;


--
-- Name: TABLE challenge_sessions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.challenge_sessions TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.challenge_sessions TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.challenge_sessions TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.challenge_sessions TO admin;


--
-- Name: TABLE challenge_submissions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.challenge_submissions TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.challenge_submissions TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.challenge_submissions TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.challenge_submissions TO admin;


--
-- Name: TABLE challenges; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.challenges TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.challenges TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.challenges TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.challenges TO admin;


--
-- Name: TABLE companies; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.companies TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.companies TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.companies TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.companies TO admin;


--
-- Name: TABLE company_business_areas; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_business_areas TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_business_areas TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_business_areas TO service_role;


--
-- Name: TABLE company_favorites; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_favorites TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_favorites TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_favorites TO service_role;


--
-- Name: TABLE company_philosophy; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_philosophy TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_philosophy TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_philosophy TO service_role;


--
-- Name: TABLE company_positions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_positions TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_positions TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_positions TO service_role;


--
-- Name: TABLE company_recruit_info; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_recruit_info TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_recruit_info TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_recruit_info TO service_role;


--
-- Name: TABLE company_reviews; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_reviews TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_reviews TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_reviews TO service_role;


--
-- Name: TABLE companies_view; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.companies_view TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.companies_view TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.companies_view TO service_role;


--
-- Name: TABLE company_events; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_events TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_events TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_events TO service_role;


--
-- Name: TABLE company_favorite_counts; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_favorite_counts TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_favorite_counts TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_favorite_counts TO service_role;


--
-- Name: TABLE company_highlights; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_highlights TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_highlights TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_highlights TO service_role;


--
-- Name: TABLE company_interviews; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_interviews TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_interviews TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_interviews TO service_role;


--
-- Name: TABLE company_members; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_members TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_members TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.company_members TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.company_members TO admin;


--
-- Name: TABLE event_details; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.event_details TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.event_details TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.event_details TO service_role;


--
-- Name: TABLE event_participants; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.event_participants TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.event_participants TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.event_participants TO service_role;


--
-- Name: TABLE events; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.events TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.events TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.events TO service_role;


--
-- Name: TABLE features; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.features TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.features TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.features TO service_role;


--
-- Name: TABLE fulltime_details; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.fulltime_details TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.fulltime_details TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.fulltime_details TO service_role;


--
-- Name: TABLE gp_rank; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.gp_rank TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.gp_rank TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.gp_rank TO service_role;


--
-- Name: TABLE internship_details; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.internship_details TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.internship_details TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.internship_details TO service_role;


--
-- Name: TABLE job_app_count; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.job_app_count TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.job_app_count TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.job_app_count TO service_role;


--
-- Name: TABLE job_interests; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.job_interests TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.job_interests TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.job_interests TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.job_interests TO admin;


--
-- Name: TABLE job_tags; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.job_tags TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.job_tags TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.job_tags TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.job_tags TO admin;


--
-- Name: TABLE jobs; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.jobs TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.jobs TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.jobs TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.jobs TO admin;


--
-- Name: COLUMN jobs.selection_type; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(selection_type) ON TABLE public.jobs TO authenticated;
GRANT UPDATE(selection_type) ON TABLE public.jobs TO service_role;


--
-- Name: COLUMN jobs.application_deadline; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(application_deadline) ON TABLE public.jobs TO authenticated;
GRANT UPDATE(application_deadline) ON TABLE public.jobs TO service_role;


--
-- Name: TABLE media_authors; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.media_authors TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.media_authors TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.media_authors TO service_role;


--
-- Name: TABLE media_categories; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.media_categories TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.media_categories TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.media_categories TO service_role;


--
-- Name: TABLE media_posts; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.media_posts TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.media_posts TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.media_posts TO service_role;


--
-- Name: TABLE media_posts_tags; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.media_posts_tags TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.media_posts_tags TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.media_posts_tags TO service_role;


--
-- Name: TABLE media_tags; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.media_tags TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.media_tags TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.media_tags TO service_role;


--
-- Name: TABLE messages; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.messages TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.messages TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.messages TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.messages TO admin;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.notifications TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.notifications TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.notifications TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.notifications TO admin;


--
-- Name: TABLE qualifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.qualifications TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.qualifications TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.qualifications TO service_role;


--
-- Name: TABLE question_bank; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.question_bank TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.question_bank TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.question_bank TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.question_bank TO admin;


--
-- Name: TABLE referral_codes; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.referral_codes TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.referral_codes TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.referral_codes TO service_role;


--
-- Name: TABLE referral_uses; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.referral_uses TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.referral_uses TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.referral_uses TO service_role;


--
-- Name: TABLE resumes; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.resumes TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.resumes TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.resumes TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.resumes TO admin;


--
-- Name: TABLE role_change_log; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.role_change_log TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.role_change_log TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.role_change_log TO service_role;


--
-- Name: SEQUENCE role_change_log_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.role_change_log_id_seq TO anon;
GRANT ALL ON SEQUENCE public.role_change_log_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.role_change_log_id_seq TO service_role;


--
-- Name: TABLE scout_templates; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.scout_templates TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.scout_templates TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.scout_templates TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.scout_templates TO admin;


--
-- Name: TABLE scouts; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.scouts TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.scouts TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.scouts TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.scouts TO admin;


--
-- Name: TABLE selections_view; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.selections_view TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.selections_view TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.selections_view TO service_role;


--
-- Name: TABLE session_answers; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.session_answers TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.session_answers TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.session_answers TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.session_answers TO admin;


--
-- Name: TABLE skills; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.skills TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.skills TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.skills TO service_role;


--
-- Name: TABLE student_applications_view; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.student_applications_view TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.student_applications_view TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.student_applications_view TO service_role;


--
-- Name: TABLE student_profiles_backup; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.student_profiles_backup TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.student_profiles_backup TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.student_profiles_backup TO service_role;


--
-- Name: TABLE student_qualifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.student_qualifications TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.student_qualifications TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.student_qualifications TO service_role;


--
-- Name: TABLE student_skills; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.student_skills TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.student_skills TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.student_skills TO service_role;


--
-- Name: TABLE user_companies; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.user_companies TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.user_companies TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.user_companies TO service_role;


--
-- Name: TABLE user_roles; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.user_roles TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.user_roles TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_roles TO authenticated;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_roles TO admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.user_roles TO supabase_auth_admin;
GRANT SELECT,INSERT,UPDATE ON TABLE public.user_roles TO supabase_admin;


--
-- Name: TABLE user_signups; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.user_signups TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.user_signups TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.user_signups TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.user_signups TO admin;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.users TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.users TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.users TO service_role;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.users TO admin;


--
-- Name: TABLE v_messages_with_sender; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.v_messages_with_sender TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.v_messages_with_sender TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.v_messages_with_sender TO service_role;


--
-- Name: TABLE webtest_questions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.webtest_questions TO anon;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.webtest_questions TO authenticated;
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.webtest_questions TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLES TO service_role;


--
-- PostgreSQL database dump complete
--

