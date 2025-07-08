--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8
-- Dumped by pg_dump version 17.5

CREATE SCHEMA public;
COMMENT ON SCHEMA public IS 'standard public schema';

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--



--
-- Name: application_status; Type: TYPE; Schema: public; Owner: -
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


--
-- Name: event_format; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.event_format AS ENUM (
    'online',
    'onsite',
    'hybrid'
);


--
-- Name: grandprix_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.grandprix_type AS ENUM (
    'case',
    'webtest',
    'bizscore'
);


--
-- Name: offer_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.offer_status AS ENUM (
    'pending',
    'accepted',
    'rejected'
);


--
-- Name: question_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.question_category AS ENUM (
    'web_lang',
    'web_math',
    'case',
    'biz_battle',
    'spi_language'
);


--
-- Name: role_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.role_enum AS ENUM (
    'student',
    'company',
    'company_admin',
    'admin'
);


--
-- Name: section_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.section_type AS ENUM (
    'quant',
    'verbal',
    'english',
    'logical'
);


--
-- Name: selection_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.selection_type AS ENUM (
    'fulltime',
    'internship_short',
    'event'
);


--
-- Name: session_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.session_status AS ENUM (
    'in_progress',
    'submitted',
    'graded'
);


--
-- Name: test_code; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.test_code AS ENUM (
    'spi',
    'tamatebako',
    'case',
    'bizscore'
);


--
-- Name: accept_offer(uuid); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: add_creator_to_members(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: add_owner_to_company_members(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: auto_grade_answer(uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: avg_response_time(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: avg_response_time_sec(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.avg_response_time_sec() RETURNS TABLE(avg_response_sec numeric)
    LANGUAGE sql
    AS $$
  select avg(extract(epoch from (answered_at - created_at))) as avg_response_sec
  from   messages
  where  answered_at is not null;
$$;


--
-- Name: calculate_profile_completion(uuid); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: calculate_resume_completion(uuid); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: calculate_work_history_completion(uuid); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: count_unread(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: count_unread(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.count_unread(_uid uuid) RETURNS bigint
    LANGUAGE sql
    AS $$
  select count(*) from notifications
  where user_id = _uid and is_read = false;
$$;


--
-- Name: create_referral_code(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: custom_access_token_hook(uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: dashboard_overview(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: enqueue_email_notification(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: ensure_user_id(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: f_create_student_profile(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: filling_company_id(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: fn_create_profile_from_student(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: fn_notify_send_email(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: fn_offer_approved_notify(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: fn_scout_accepted_notify(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: get_leaderboard(integer); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: get_my_chat_rooms(uuid); Type: FUNCTION; Schema: public; Owner: -
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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: chat_rooms; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: get_or_create_chat_room_from_scout(uuid); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: get_user_role(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_role(p_uid uuid) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select role
  from user_roles
  where user_id = p_uid
  limit 1
$$;


--
-- Name: grade_session(uuid); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: grade_webtest(uuid); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: increment_job_view(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_job_view(_job_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  update jobs set views = views + 1 where id = _job_id;
end;
$$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE
    AS $$ select auth.jwt() ->> 'role' = 'admin' $$;


--
-- Name: is_application_owner(uuid); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: is_chat_participant(uuid); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: is_company(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_company() RETURNS boolean
    LANGUAGE sql STABLE
    AS $$ select auth.jwt() ->> 'role' = 'company' $$;


--
-- Name: is_company_member(uuid); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: is_student(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_student() RETURNS boolean
    LANGUAGE sql STABLE
    AS $$ select auth.jwt() ->> 'role' = 'student' $$;


--
-- Name: jwt_custom_claims_hook(jsonb); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: jwt_custom_claims_hook(uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: log_activity(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: log_role_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_role_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  insert into public.role_change_log (user_id, old_role, new_role)
  values (old.user_id, old.role, new.role);
  return new;
end $$;


--
-- Name: notify_on_chat_insert(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: notify_on_scout_insert(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: prepare_session_answers(uuid); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: queue_email_notification(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: scout_to_application(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: set_answered_at_on_company_insert(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end; $$;


--
-- Name: start_webtest_session(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: start_webtest_session_balanced(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: sync_user_id(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: sync_user_roles(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: trigger_send_email(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: update_modified_column(); Type: FUNCTION; Schema: public; Owner: -
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


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admins (
    id uuid NOT NULL,
    email text,
    created_at timestamp without time zone DEFAULT now(),
    last_sign_in_at timestamp with time zone
);


--
-- Name: applications; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: student_profiles; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: applicants_view; Type: VIEW; Schema: public; Owner: -
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


--
-- Name: bizscore_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bizscore_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_no integer,
    question text,
    weight numeric DEFAULT 1.0
);


--
-- Name: challenge_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.challenge_questions (
    challenge_id uuid NOT NULL,
    question_id uuid NOT NULL,
    order_no integer,
    weight integer DEFAULT 1
);


--
-- Name: challenge_sessions; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: challenge_submissions; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: challenges; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: COLUMN challenges.answer_video_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.challenges.answer_video_url IS '解説動画（YouTube 等）への URL';


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: company_business_areas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_business_areas (
    company_id uuid NOT NULL,
    ordinal integer NOT NULL,
    area text
);


--
-- Name: company_favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: company_philosophy; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_philosophy (
    company_id uuid NOT NULL,
    ordinal integer NOT NULL,
    paragraph text
);


--
-- Name: company_positions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_positions (
    company_id uuid NOT NULL,
    ordinal integer NOT NULL,
    "position" text
);


--
-- Name: company_recruit_info; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_recruit_info (
    company_id uuid NOT NULL,
    message text
);


--
-- Name: company_reviews; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: companies_view; Type: VIEW; Schema: public; Owner: -
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


--
-- Name: company_events; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: company_favorite_counts; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.company_favorite_counts AS
 SELECT company_favorites.company_id,
    count(*) AS favorite_count
   FROM public.company_favorites
  GROUP BY company_favorites.company_id;


--
-- Name: company_highlights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_highlights (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    company_id uuid,
    ordinal integer,
    icon text,
    title text,
    body text
);


--
-- Name: company_interviews; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: company_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'recruiter'::text NOT NULL,
    invited_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: event_details; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: event_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    student_id uuid NOT NULL,
    status text DEFAULT 'reserved'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: features; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.features (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fulltime_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fulltime_details (
    selection_id uuid,
    is_ongoing boolean DEFAULT true,
    job_id uuid NOT NULL,
    working_days text,
    salary_min numeric,
    salary_max numeric
);


--
-- Name: gp_rank; Type: MATERIALIZED VIEW; Schema: public; Owner: -
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


--
-- Name: internship_details; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: job_app_count; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.job_app_count AS
SELECT
    NULL::text AS job_title,
    NULL::bigint AS cnt;


--
-- Name: job_interests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_interests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    job_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: job_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_tags (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    job_id uuid NOT NULL,
    tag text NOT NULL
);


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: media_authors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media_authors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    display_name text NOT NULL,
    bio text,
    avatar_url text
);


--
-- Name: media_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    "order" integer DEFAULT 0
);


--
-- Name: media_posts; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: media_posts_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media_posts_tags (
    post_id uuid NOT NULL,
    tag_id uuid NOT NULL
);


--
-- Name: media_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: qualifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qualifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL
);


--
-- Name: question_bank; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: referral_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    code text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: referral_uses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_uses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referral_code_id uuid NOT NULL,
    referred_user_id uuid,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: resumes; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: role_change_log; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: role_change_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.role_change_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: role_change_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.role_change_log_id_seq OWNED BY public.role_change_log.id;


--
-- Name: scout_templates; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: COLUMN scout_templates."position"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scout_templates."position" IS 'テンプレ既定の提示ポジション';


--
-- Name: COLUMN scout_templates.offer_range; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scout_templates.offer_range IS 'テンプレ既定のオファー額レンジ（万円）例: 400-600';


--
-- Name: scouts; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: COLUMN scouts.offer_amount; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scouts.offer_amount IS '提示レンジ（万円）例: 400-600';


--
-- Name: COLUMN scouts.offer_position; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.scouts.offer_position IS '提示ポジション名';


--
-- Name: selections_view; Type: VIEW; Schema: public; Owner: -
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


--
-- Name: session_answers; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL
);


--
-- Name: student_applications_view; Type: VIEW; Schema: public; Owner: -
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


--
-- Name: student_profiles_backup; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: student_qualifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_qualifications (
    student_id uuid NOT NULL,
    qualification_id uuid NOT NULL
);


--
-- Name: student_skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_skills (
    student_id uuid NOT NULL,
    skill_id uuid NOT NULL
);


--
-- Name: user_companies; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.user_companies AS
 SELECT DISTINCT company_members.user_id,
    company_members.company_id
   FROM public.company_members;


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    user_id uuid NOT NULL,
    role character varying(50) DEFAULT 'student'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_signups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_signups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    referral_source text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    password text,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['student'::text, 'company'::text, 'admin'::text])))
);


--
-- Name: v_messages_with_sender; Type: VIEW; Schema: public; Owner: -
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


--
-- Name: webtest_questions; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: role_change_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_change_log ALTER COLUMN id SET DEFAULT nextval('public.role_change_log_id_seq'::regclass);


--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.activity_logs (id, "timestamp", actor, role, action, target, ip_address, title, description, metadata, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: admins; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.admins (id, email, created_at, last_sign_in_at) FROM stdin;
\.


--
-- Data for Name: applications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.applications (id, student_id, job_id, status, created_at, applied_at, interest_level, self_pr, last_activity, resume_url, company_id) FROM stdin;
\.


--
-- Data for Name: bizscore_questions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bizscore_questions (id, order_no, question, weight) FROM stdin;
\.


--
-- Data for Name: challenge_questions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.challenge_questions (challenge_id, question_id, order_no, weight) FROM stdin;
6ad34e5d-d4a0-4cee-aeb1-4f775a769743	7abc111d-ce4e-496c-a4c7-a34a6429ac5f	1	1
6ad34e5d-d4a0-4cee-aeb1-4f775a769743	cfc01be3-c1f5-4844-8ad9-ef019cf25ef5	2	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	416ba43d-8822-4993-8b75-f2aac409805e	1	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	8c41993f-3b58-4a8b-9e72-3a10471a75ef	2	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	11c84282-4aa3-4b87-9d80-58f8410b297d	3	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	3979bb92-cd1c-42b2-96a0-6c676be850f7	4	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	9fbc3156-21fe-45b3-bb65-ed77c963ce76	5	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	09c9e28e-20d0-45a0-9f6b-2cc3601d5b72	6	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	46baa1b1-600f-40ec-8206-49b41326056d	7	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	91a66189-170c-4240-b502-a39ebbd0b045	8	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	43b05e72-2413-4f6e-af63-6486e8d2beba	9	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	11028ae9-bdb4-4fcc-a520-d411bfafefe2	10	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	061fadb0-8eeb-4327-b228-6054c8485d1c	11	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	01a5a91b-6d28-47a8-9861-634dd5e3acfd	12	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	8218d278-fdf3-4e21-af1c-1d4a084c8552	13	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	b92b5cab-3e3a-4008-9571-751233856337	14	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	740ad915-4411-486a-8b32-f41a6abce3bf	15	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	72a6b5f7-5394-4d39-94be-c4885ed6f581	16	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	0926f31e-d832-468d-bc3f-861abff2b179	17	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	808e1cd6-c8d6-4610-b215-d71f93ea5e5f	18	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	78f71b83-cd8d-4680-93a6-b87d5cb90524	19	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	f32f04f2-dd5b-4587-be7b-c7dc768ea437	20	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	3d9e54b6-0878-406d-be66-8bb8791234ee	21	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	d49b77ab-2d64-4f37-b004-3c159b00b85d	22	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	1f7353f8-939b-44e7-a871-018e731504d3	23	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	8049d265-b323-4086-9620-36d1a4427a8c	24	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	362b036a-1a59-4d15-88f6-e0dd5e398f47	25	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	40242408-a6e0-44a5-b4ce-d939b6cbffa5	26	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	5880ba8a-1ba1-499a-b753-f3e51f997193	27	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	b2dc24c3-eddf-496b-b9f7-7e9ba003f0c2	28	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	d562aa6c-699a-4058-858b-852aff98d4fe	29	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	8738f26e-b35e-42ea-b008-b504bfe5963a	30	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	65a65de9-ff76-4bc0-8326-840e24a4a1ed	31	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	15e68b4b-4c07-4db3-a020-c60be706732c	32	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	983f5a2f-94a2-46b6-a63a-64521e5249b1	33	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	32a34d63-0cc8-438a-a407-63fea8638c60	34	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	cec304c9-2248-44fa-9a87-1f73b08184cc	35	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	696004eb-5a36-42a4-83aa-b6d597c57e1a	36	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	31c303bf-b2da-4f02-bc24-c9376288eb40	37	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	000dd49d-7288-4319-a387-838974db9f62	38	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	e1788fa2-8809-41bd-bffd-cd099471d914	39	1
7d82e2df-fd4b-4c61-9d1c-e52466566555	750a066b-7133-4d0b-a281-c9f9cb06f1e3	40	1
\.


--
-- Data for Name: challenge_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.challenge_sessions (id, challenge_id, student_id, started_at, ended_at, score, elapsed_sec, status) FROM stdin;
2bcdf6fc-6f31-429f-812d-90d9369b8cca	6ad34e5d-d4a0-4cee-aeb1-4f775a769743	036c17b8-4000-41df-b00f-d00ab6efde39	2025-06-18 02:14:35.589+00	\N	1	\N	in_progress
cc74838a-703e-4748-9200-c38137261499	6ad34e5d-d4a0-4cee-aeb1-4f775a769743	039527ca-2a5a-4e10-8ebb-cf63aca72d07	2025-06-18 08:12:22.045+00	\N	0	\N	in_progress
7c960ece-b049-441b-8efc-a2326f1a9183	7d82e2df-fd4b-4c61-9d1c-e52466566555	76907e4c-ee31-4378-bc6c-c526130a3cb3	2025-07-08 07:48:46.418+00	\N	\N	\N	in_progress
b69feee6-eaee-4e3f-8184-83b8227e6924	6ad34e5d-d4a0-4cee-aeb1-4f775a769743	76907e4c-ee31-4378-bc6c-c526130a3cb3	2025-07-08 07:50:39.783+00	\N	\N	\N	in_progress
\.


--
-- Data for Name: challenge_submissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.challenge_submissions (id, challenge_id, student_id, answer, status, score, comment, created_at, updated_at, auto_score, final_score, score_source, answers, session_id) FROM stdin;
12ed588d-de9f-4a7c-be57-134d04b6d1af	6ad34e5d-d4a0-4cee-aeb1-4f775a769743	036c17b8-4000-41df-b00f-d00ab6efde39	テストです	採点済	60	テストです	2025-06-18 02:14:59.061484+00	2025-06-18 02:14:59.061484+00	\N	\N	\N	{}	2bcdf6fc-6f31-429f-812d-90d9369b8cca
d69b012a-68bd-4f2f-8224-21d0fd5c62c2	6ad34e5d-d4a0-4cee-aeb1-4f775a769743	039527ca-2a5a-4e10-8ebb-cf63aca72d07		未採点	\N	\N	2025-06-18 08:46:14.562915+00	2025-06-18 08:46:14.562915+00	\N	\N	\N	{"7abc111d-ce4e-496c-a4c7-a34a6429ac5f": "無印良品店の売上を3年で20％向上させる施策を考えてください。\\n\\nテスト"}	cc74838a-703e-4748-9200-c38137261499
\.


--
-- Data for Name: challenges; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.challenges (id, title, description, word_limit, deadline, created_at, updated_at, category, company, time_limit_min, question_count, start_date, student_id, score, type, event_id, created_by, answer_video_url, time_limit_s, test_code, section_type) FROM stdin;
6ad34e5d-d4a0-4cee-aeb1-4f775a769743	売上向上系ケース　初級編	ケース面接頻出の売上向上系ケースお題になります。	500	2025-08-31 14:59:00+00	2025-06-18 02:12:19.97992+00	2025-06-18 02:12:19.97992+00	case	\N	40	40	2025-06-18 02:12:19.97992+00	\N	0	case	\N	bf842b9e-630f-4694-bd9d-64812894d9df	https://youtu.be/dNnRZtHZQxc	900	\N	\N
7d82e2df-fd4b-4c61-9d1c-e52466566555	【SPI】言語問題 ①	SPI形式の言語問題です	\N	2025-11-30 14:59:00+00	2025-06-28 05:27:51.968679+00	2025-06-28 05:27:51.968679+00	webtest	\N	40	40	2025-06-28 05:27:51.968679+00	\N	0	webtest	\N	f5763843-120e-4aea-9e8a-b3deeab22c80	\N	900	\N	\N
\.


--
-- Data for Name: chat_rooms; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.chat_rooms (id, company_id, student_id, job_id, created_at, updated_at, scout_id) FROM stdin;
\.

COPY public.users (id, email, password, role, created_at) FROM stdin;
\.
--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.companies (id, user_id, name, description, website, logo, created_at, cover_image_url, industry, founded_year, employee_count, location, recruit_website, status, contact_email, phone, address, video_url, tagline, representative, founded_on, capital_jpy, revenue_jpy, headquarters, cover_image, created_by) FROM stdin;
5ce59fda-6b6a-4039-ad7f-e371e0408689	60a03c48-4cfd-4d3c-8ebf-57e90ace9b7b	株式会社ビヨンドボーダーズ	\N	\N	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/company-logos/logos/1751444829435.png	2025-06-30 05:45:50.306738+00	\N	サービス,コンサルティング	2015	50	東京都目黒区青葉台3-1-18 青葉台タワーANNEX 4階	\N	承認待ち	\N	\N	\N	\N	\N	本間 陽介	\N	\N	\N	\N	\N	\N
694fca7d-3c55-4517-bb91-17e93ce3a9e0	c6e093e9-bc2f-4555-9ca7-b0d9d93f0a94	株式会社SFIDA X Group	\N	\N	\N	2025-07-04 05:24:44.7362+00	\N	\N	\N	\N	\N	\N	承認待ち	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
0190db01-c466-47a0-b093-a42b564bc28b	1d109812-a8ba-4a52-a2a3-23a31bf8c5a6	株式会社トレードワークス	\N	\N	\N	2025-07-07 00:26:35.553719+00	\N	\N	\N	\N	\N	\N	承認待ち	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
94356398-fc4d-4f7f-8025-89b074a17ce8	a5274d3a-9a8c-47ba-8593-3d31e38dd190	Xvolve Group	\N	\N	\N	2025-07-07 07:11:37.673693+00	\N	\N	\N	\N	\N	\N	承認待ち	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
b3be207f-2766-455e-857a-77e424ce4943	6dee4175-a9e5-4cc3-8089-5008d380ef9a	テイラー株式会社	\N	\N	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/company-logos/logos/1751614319868.png	2025-07-02 05:02:38.685408+00	\N	IT・通信,コンサルティング	2021	30	東京都港区海岸1-7-1	\N	承認待ち	\N	\N	\N	https://www.youtube.com/watch?v=zoMS29MNgRs	\N	柴田 陽	\N	\N	\N	\N	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/company-covers/covers/1751852978831.png	\N
28d5461b-7b35-4c00-93b7-8c94f2133458	0b5f7833-a5fe-4c95-883a-173ca6aa6cb0	株式会社ジーニー	\N	\N	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/company-logos/logos/1751857265787.png	2025-07-01 10:04:30.210669+00	\N	IT・通信,広告・マーケティング	2010	877	東京都新宿区西新宿6-8-1 住友不動産新宿オークタワー 6階	\N	承認待ち	\N	\N	\N	\N	「誰もがマーケティングで成功できる世界を創る」、1,000名規模×急成長×ITミドルベンチャー企業にて共に事業を創造しませんか？	工藤 智昭	\N	10000	1132000	\N	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/company-covers/covers/1751857295132.jpg	\N
cfa94e4b-2a46-46ee-9660-3998361a85df	697303d7-8553-4b47-88fb-20805e0cc3d4	デモ用	\N	\N	\N	2025-06-18 05:56:30.60497+00	\N	\N	\N	\N	\N	\N	承認待ち	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
f8451e51-511d-4ca3-a120-70710bb2b664	09e3242d-bf28-4184-bacc-65ccdb0310da	株式会社Make Culture	\N	\N	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/company-logos/logos/1750660088424.png	2025-06-23 06:26:17.79576+00	\N	サービス,コンサルティング	2023	5	神奈川県三浦郡葉山町長柄310-6	\N	承認待ち	\N	\N	\N	\N	文化の破壊と創造	熊崎 友	\N	500	2000	\N	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/company-covers/covers/1750765624828.png	\N
fbff0781-8fca-447d-a294-d63051ae3f2d	03f367cb-dc70-4619-abaa-c82140143254	株式会社丸井グループ	\N	\N	\N	2025-06-27 00:41:34.958139+00	\N	\N	\N	\N	\N	\N	承認待ち	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
67d80832-9f55-4e01-84a8-b6c76e0ab851	01b5861b-bb4a-4002-be08-71db750bb24e	X Mile株式会社	\N	\N	\N	2025-07-01 10:03:37.175104+00	\N	\N	\N	\N	\N	\N	承認待ち	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: company_business_areas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.company_business_areas (company_id, ordinal, area) FROM stdin;
28d5461b-7b35-4c00-93b7-8c94f2133458	0	広告プラットフォーム事業/マーケティングSaaS事業/海外事業/デジタルPR事業
28d5461b-7b35-4c00-93b7-8c94f2133458	1	【広告プラットフォーム事業】 Webサイトやスマートフォンアプリ上に、各々の閲覧者に合った広告を瞬時に選択し表示させる 技術（アドテクノロジー）を使って、インターネットメディアや広告主の広告収益や効果を 最大化させるアドプラットフォームを提供しています。
28d5461b-7b35-4c00-93b7-8c94f2133458	2	【マーケティングSaaS事業】 集客から販促、受注までを通貫して実行・管理できる唯一の国産セールス&マーケティング プラットフォーム「GENIEE Marketing Cloud」を提供しています。営業管理ツール、チャット型Web接客プラットフォーム、マーケティングオートメーション、サイト内検索ASP等があります。
28d5461b-7b35-4c00-93b7-8c94f2133458	3	【海外事業】 現在、アジアを中心に５つの国際拠点を置き、ジーニープロダクトに加え、Googleを始めとした グローバル企業のプロダクトを扱う認定パートナーとして、現地企業、グローバル企業、 日系企業にサービスを提供しています。
f8451e51-511d-4ca3-a120-70710bb2b664	0	学生転職
f8451e51-511d-4ca3-a120-70710bb2b664	1	DXコンサルタント
5ce59fda-6b6a-4039-ad7f-e371e0408689	0	(1) 《海外不動産検索ポータルサイト事業》  世界各国の不動産を検索できるポータルWEBサイトを日本語・英語・中国語・台湾語で運 営しています。現在、約 68000 件の物件情報が掲載されており、世界中の人が自国以外の 不動産も快適に探せるサービスを目指しています。  https://ja.sekaiproperty.com/    
5ce59fda-6b6a-4039-ad7f-e371e0408689	1	(2)《海外不動産＆インバウンド向け不動産売買エージェント事業》  セカイプロパティでの不動産情報提供のみならず、海外の不動産を売買したい日本人のお 客様や、日本国内の物件を購入されたい外国人のお客様のために、物件購入の情報提供から 購入サポート、管理・売却・海外での納税代行まで、日本語／英語にてワンストップでサー ビス提供しています。当社は株式会社じげん（東証プライム上場：証券コード3679）のグループ企業です。
b3be207f-2766-455e-857a-77e424ce4943	0	必要な機能だけを呼び出し、自社の業務要件にテイラーメイドされたシステムを構築することができるHeadless ERPを開発
b3be207f-2766-455e-857a-77e424ce4943	1	日本市場においてはProfessional Serviceという事業にて、お客様の課題解決に踏み込んでサポート
\.


--
-- Data for Name: company_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.company_events (id, company_id, title, type, datetime, location, url) FROM stdin;
\.


--
-- Data for Name: company_favorites; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.company_favorites (id, company_id, user_id, created_at) FROM stdin;
\.


--
-- Data for Name: company_highlights; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.company_highlights (id, company_id, ordinal, icon, title, body) FROM stdin;
4a7073b5-2637-4c59-b8a3-e07d6a80be22	f8451e51-511d-4ca3-a120-70710bb2b664	0	growth	新卒一期生	代表直下で成長することができます！
3d33f401-5ddf-4c6c-915a-8aaccd88dcc7	5ce59fda-6b6a-4039-ad7f-e371e0408689	0	growth	【なぜ今BBにジョインすべきか？】	海外事業に特化しているため、100%世界と携わりながらキャリアを形成できます。\nまた数千万円の商材を国内トップ層のお客様にご案内する、非常に難易度が高く、圧倒的な成長に直結する環境です。\n年齢問わず、また社員やインターン生関係なく、結果にコミットしている方には成長機会やチャンスが与えられる環境です。
8418fc02-544d-430d-a883-1914b57e82af	b3be207f-2766-455e-857a-77e424ce4943	0	growth	McKinsey出身の連続起業家とメルカリのR&D責任者が、キャリアの集大成として起業	弊社はマッキンゼー出身で楽天にスマポ（現楽天ペイメント）を売却した連続起業家の柴田陽と、メルカリの研究開発組織の責任者をつとめた高橋三徳が共同創業した、技術者中心のB2Bソフトウェア企業です。
bc73320f-f122-439e-be6b-5df0b517d562	b3be207f-2766-455e-857a-77e424ce4943	1	innovation	世界的なスタートアップ・アクセラレータ「Y Combinator」に日本拠点の会社として15年ぶりに採択	2022年には世界的なスタートアップ・アクセラレータ「Yコンビネーター」に日本拠点の会社として15年ぶりに採択されました。2025年にはシリーズAラウンドにより、累計2,200万米ドル（約34億円）の資金調達を完了しております。
48d7d96b-bf3b-47c9-820b-25b9e3b47621	b3be207f-2766-455e-857a-77e424ce4943	2	innovation	グローバルに展開する日本発のプロダクト「Tailor Platform」	いわゆるERPシステム（基幹システム。受発注や在庫、会計、組織などを統合的に管理するビジネスアプリケーション群）において、システムの柔軟性・拡張性を飛躍的に高めた「Headless ERP」を世界で初めてローンチし、日本の大企業および米国の中堅〜大企業へ向けて展開しています。
706fab60-9244-47ae-a9dc-c7c0024da0d2	b3be207f-2766-455e-857a-77e424ce4943	3	remote	パフォーマンス重視の組織（フレックス・フルリモート）	テイラーではフレックス、フルリモートをベースとしてパフォーマンスを最大限に発揮いただける環境づくりに注力しています。（数ヶ月に一度、任意参加でのオフラインイベントあり）
a95eb7e2-2534-4435-a65f-ecec94ff812d	28d5461b-7b35-4c00-93b7-8c94f2133458	0	growth	経営者と近い環境で学びの多い日々	若手のうちから経営と近い距離で“自ら戦略を練り実行まで責任を持つ”、所謂事業を動かす経験が積めます。\nまた、9つの事業部×5つの職種の掛け合わせから、GENIEE1社でも幅広い選択肢が取れます。\nあらゆる業界/職種で通用するスキルを身に着けることも可能です。
4679648f-d737-4bbb-a9d3-3998b2908102	28d5461b-7b35-4c00-93b7-8c94f2133458	1	innovation	構造的に若手からマネジメントや事業開発に携わりやすい環境	創業プロダクト（広告プラットフォーム事業）では国内トップのシェア取りつつも、\nその基盤に依存するだけでなく、積極的なM＆Aにより事業の「種」を取得し、新たな事業拡大に取り組んでいます。\n連結従業員数が1千名を超え企業規模は年々拡大していますが、他事業展開をしていることから、\nマネジメントや1→10の事業開発をへ挑戦できる機会が多い環境です。
013e119d-bc03-4127-9514-e04aaa1872e2	28d5461b-7b35-4c00-93b7-8c94f2133458	2	culture	社員に大事にしてほしい価値基準	Valueは、ジーニーが創業時から何を大事にしてきたか、どういった価値観を持っているかを\n明文化したものであり、事業に取り組む姿勢を示しています。\n個々人のバックグラウンドによらず社員全員が共通認識を持ち、密なコミュニケーションと\n最大限のチームワークで、これからも新たな価値を提供していきます。\n1. Ownership\n2. Commitment\n3. Challenge\n4. Logic\n5. Standardization\n6. Customer Value\n7. Collaboration\n8. Open mind\n9. Well-being
ea60da2a-cd88-4cf1-a2e4-60c940a21f4d	28d5461b-7b35-4c00-93b7-8c94f2133458	3	benefits	生活面での支援制度や福利厚生などが充実させ、社員の働きやすさを重視	下記は福利厚生の一部\n・家賃補助（30,000円の家賃補助を支給）\n・書籍購入補助（半期 30,000 円まで）\n・リフレッシュ手当（毎月 5,000 円まで）\n・部活動手当（毎月 5,000 円まで）\n・シャッフルランチ/ディナー手当（四半期毎に1人当たり昼食1,000円夕食5,000円まで） 
\.


--
-- Data for Name: company_interviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.company_interviews (id, company_id, question, answer_hint, experience_text, graduation_year, posted_at, selection_category, phase, user_id) FROM stdin;
\.


--
-- Data for Name: company_members; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.company_members (id, company_id, user_id, role, invited_at, created_at) FROM stdin;
9c7942e3-2730-476c-885e-e2870e6421bf	f8451e51-511d-4ca3-a120-70710bb2b664	09e3242d-bf28-4184-bacc-65ccdb0310da	recruiter	2025-06-25 05:44:04.544999+00	2025-06-25 05:44:04.544999+00
96eb0dd6-58a2-46f1-86d8-e4c690dddde7	5ce59fda-6b6a-4039-ad7f-e371e0408689	60a03c48-4cfd-4d3c-8ebf-57e90ace9b7b	owner	2025-07-07 07:35:00.39146+00	2025-07-07 07:35:00.39146+00
632983e7-7725-4551-88b7-b644abdaf3aa	694fca7d-3c55-4517-bb91-17e93ce3a9e0	c6e093e9-bc2f-4555-9ca7-b0d9d93f0a94	owner	2025-07-07 07:35:00.39146+00	2025-07-07 07:35:00.39146+00
1d4297b1-1c16-4833-9d28-82a483988c2f	28d5461b-7b35-4c00-93b7-8c94f2133458	0b5f7833-a5fe-4c95-883a-173ca6aa6cb0	owner	2025-07-07 07:35:00.39146+00	2025-07-07 07:35:00.39146+00
f5011d1d-42cf-438b-88de-073eb232a43e	0190db01-c466-47a0-b093-a42b564bc28b	1d109812-a8ba-4a52-a2a3-23a31bf8c5a6	owner	2025-07-07 07:35:00.39146+00	2025-07-07 07:35:00.39146+00
8ae21b88-4778-401c-afe0-8d47c828859a	94356398-fc4d-4f7f-8025-89b074a17ce8	a5274d3a-9a8c-47ba-8593-3d31e38dd190	owner	2025-07-07 07:35:00.39146+00	2025-07-07 07:35:00.39146+00
826b4024-d3a3-4870-ad0c-570b3bb95246	b3be207f-2766-455e-857a-77e424ce4943	6dee4175-a9e5-4cc3-8089-5008d380ef9a	owner	2025-07-07 07:35:00.39146+00	2025-07-07 07:35:00.39146+00
c713523f-22a1-4e66-8187-d762e8e0559d	cfa94e4b-2a46-46ee-9660-3998361a85df	697303d7-8553-4b47-88fb-20805e0cc3d4	owner	2025-07-07 07:35:00.39146+00	2025-07-07 07:35:00.39146+00
e44253ae-83e8-4fbb-b9a4-4d505aaad344	fbff0781-8fca-447d-a294-d63051ae3f2d	03f367cb-dc70-4619-abaa-c82140143254	owner	2025-07-07 07:35:00.39146+00	2025-07-07 07:35:00.39146+00
7d7c4b94-f421-4158-b608-793590568cd0	67d80832-9f55-4e01-84a8-b6c76e0ab851	01b5861b-bb4a-4002-be08-71db750bb24e	owner	2025-07-07 07:35:00.39146+00	2025-07-07 07:35:00.39146+00
\.


--
-- Data for Name: company_philosophy; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.company_philosophy (company_id, ordinal, paragraph) FROM stdin;
f8451e51-511d-4ca3-a120-70710bb2b664	0	文化の破壊と創造
5ce59fda-6b6a-4039-ad7f-e371e0408689	0	“幸せでつながる未来”を世界中で。\n\nWorking towards a prosperous future,\nacross the world.\n\n不動産が見せてくれる夢、未来、可能性。\nその想いは、私たちの見えないところで伝播し、世界中の人々に繋がっています。\n私たちは、その想いの連鎖が永遠につながる未来を、世界中で作りたい。\nワクワクする未来を叶えたい。\n世界中が幸せで繋がる未来を世界中で。
b3be207f-2766-455e-857a-77e424ce4943	0	Empower every company to deploy any ideas / 誰もがデプロイできる社会を創る
28d5461b-7b35-4c00-93b7-8c94f2133458	0	誰もがマーケティングで成功できる世界を創る
\.


--
-- Data for Name: company_positions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.company_positions (company_id, ordinal, "position") FROM stdin;
\.


--
-- Data for Name: company_recruit_info; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.company_recruit_info (company_id, message) FROM stdin;
f8451e51-511d-4ca3-a120-70710bb2b664	
5ce59fda-6b6a-4039-ad7f-e371e0408689	ビヨンドボーダーズでは\n共にチャレンジしてくれる仲間を待っています！
b3be207f-2766-455e-857a-77e424ce4943	Y Combinator出身のスタートアップで働くことは、グローバルで見れば王道とも言えるキャリアパスです。\nYC出身スタートアップとして日本唯一の新卒採用を行うテイラーへのチャレンジをお待ちしております。
28d5461b-7b35-4c00-93b7-8c94f2133458	自分たちで「No.1」をつくれ　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　　\n創業プロダクトでは日本一を手にしましたが、まだまだ挑戦できる環境がジーニーにはあります。\n今この場所で挑戦できることを財産にしつつ、同じ目標の仲間たちと共に世界的な\nテクノロジー企業を一緒に創っていきましょう。
\.


--
-- Data for Name: company_reviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.company_reviews (id, company_id, rating, title, body, role, tenure_years, posted_at, rating_growth, rating_worklife, rating_selection, rating_culture, user_id) FROM stdin;
\.


--
-- Data for Name: event_details; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.event_details (selection_id, event_date, capacity, format, venue, target_grad_years, sessions, contact_email, notes, job_id, is_online) FROM stdin;
\.


--
-- Data for Name: event_participants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.event_participants (id, event_id, student_id, status, created_at) FROM stdin;
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.events (id, title, description, event_date, event_type, cover_image, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: features; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.features (id, title, content, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: fulltime_details; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fulltime_details (selection_id, is_ongoing, job_id, working_days, salary_min, salary_max) FROM stdin;
d0eb6491-026c-4d23-95b8-c426a4864162	t	d0eb6491-026c-4d23-95b8-c426a4864162	s	\N	\N
2b011dad-4741-4df8-a094-b7f0752794e6	t	2b011dad-4741-4df8-a094-b7f0752794e6	テスト	\N	\N
6bf903b0-e102-45aa-9910-c1a2d2c79e8a	t	6bf903b0-e102-45aa-9910-c1a2d2c79e8a	シフト制	\N	\N
af7f8fbc-8267-4383-8314-2d8c14d7e6d7	t	af7f8fbc-8267-4383-8314-2d8c14d7e6d7	シフト制	\N	\N
\.


--
-- Data for Name: internship_details; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.internship_details (selection_id, start_date, end_date, duration_weeks, work_days_per_week, is_paid, allowance, target_grad_years, format, sessions, capacity, selection_flow, perks, contact_email, notes, job_id) FROM stdin;
be9a7b47-0d8e-4718-a30d-14e5eb8d0f4b	2025-08-18	2025-08-29	2	5	t	20万円 / 10日間・MVP選出者にシリコンバレーツアー招待・交通費支給（※遠方にお住まいの方は往復交通費、宿泊費支給）	\N	\N	\N	\N	\N	\N	\N	\N	be9a7b47-0d8e-4718-a30d-14e5eb8d0f4b
3eb0608c-ed07-4854-a233-c1559f3d7233	2025-08-18	2025-08-29	2	5	t	20万円 / 10日間・MVP選出者にシリコンバレーツアー招待・交通費支給（※遠方にお住まいの方は往復交通費、宿泊費支給）	\N	\N	\N	\N	\N	\N	\N	\N	3eb0608c-ed07-4854-a233-c1559f3d7233
23f12c2b-4037-4cd0-bda2-253136f46c6b	2025-08-22	2025-09-13	\N	\N	t	宿泊費/交通費一部支給 ※遠方よりご参加いただく方を対象	\N	\N	\N	\N	\N	\N	\N	\N	23f12c2b-4037-4cd0-bda2-253136f46c6b
\.


--
-- Data for Name: job_interests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.job_interests (id, student_id, job_id, created_at) FROM stdin;
\.


--
-- Data for Name: job_tags; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.job_tags (id, job_id, tag) FROM stdin;
\.


--
-- Data for Name: jobs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.jobs (id, company_id, title, description, requirements, location, work_type, salary_range, published, created_at, cover_image_url, is_recommended, views, published_until, selection_type, application_deadline, category, start_date, user_id) FROM stdin;
2b011dad-4741-4df8-a094-b7f0752794e6	f8451e51-511d-4ca3-a120-70710bb2b664	新卒代一期生として、経営者直下で事業グロース	テスト		テスト	正社員	テスト	f	2025-06-25 04:49:57.152297+00	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/job-covers/09e3242d-bf28-4184-bacc-65ccdb0310da/3cf76299-a5d0-4e1d-8806-cd19dbc07f6a.png	f	11	\N	fulltime	\N	本選考	\N	09e3242d-bf28-4184-bacc-65ccdb0310da
d0eb6491-026c-4d23-95b8-c426a4864162	cfa94e4b-2a46-46ee-9660-3998361a85df	a	s		s	正社員	s	f	2025-06-18 05:59:08.353504+00	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/job-covers/697303d7-8553-4b47-88fb-20805e0cc3d4/076f8b9c-53e7-41cd-97b9-32c918e42691.jpg	f	5	\N	fulltime	\N	本選考	\N	697303d7-8553-4b47-88fb-20805e0cc3d4
6bf903b0-e102-45aa-9910-c1a2d2c79e8a	5ce59fda-6b6a-4039-ad7f-e371e0408689	【2026卒向け】営業職┃東証一部上場子会社のグローバル不動産ベンチャー【海外不動産販売営業】※25歳でチームリーダー、28歳で役員への昇進実績あり	■業務概要：海外不動産の販売 \n \n■販売する商材 \n・商品：海外不動産 (フィリピン・マレーシア・カンボジア等の東南アジアが中心) \n・商品価格帯：1物件1000万~3000万円が中心。 \n・商品補足：投資用として購入する方が多く、居住用としても販売しています。 \n  大手海外デベロッパーの正規代理販売会社として、リッツカールトンやシェラトン等のホテルレジデンスまで取り扱っております。\n現在の取引国は12カ国ほど。今後東南アジアだけでなくアメリカ等もエリアを拡大予定です。\n\n■お客様 \n・日本全国内の日本人 \n・お客様層：年収3000万以上の経営者・事業主・富裕層の方々\n\n■お仕事の流れ \n・完全反響型 \n  集客はマーケティングチームが広告運用やセミナー・メルマガにて集客 \n  多い月で新規問い合わせが1000件ほどございます。 \n  ↓ \n・問い合わせ・過去問い合わせリードリストにアプローチし商談を調整 \n  ↓ \n・商談（オンライン7割：オフライン3割） \n  ↓ \n・メールや社用LINE・お電話にて定期フォロー \n  ↓ \n・現地物件視察のアレンジ（必要な方のみ） \n  ↓ \n・ご契約手続きの手配\n\n■売上目標 \n・ノルマはありませんがチーム・個人で目標が設定されています。 \n・月2件ほど成約があれば達成 \n・目標金額以上の売上月の場合は達成インセンティブ＋余剰額 × 1% \n  ※実績：営業6名  2023年度下半期   6ヶ月連続達成1名│4ヶ月達成1名│3ヶ月達成2名 \n・年間150万円程度のインセンティブも目指せます。\n\n■どのようにしたら受注できるのか \nお客様層はファミリー層＜経営者の方が多く、お忙しい方が多いため \n法人営業のように商談時間の限られたお時間で、どれだけお客様のニーズや聞きたい情報\nを提供できるか、 \nお客様に信頼して頂けるかが鍵になります。 \nそのため \n・第一印象の徹底 \n・海外や日本の物件情報や、不動産市場の知識インプット \n・商談前のお客様情報リサーチ \nを行っています。\n\n■未経験の方が1人前になっていく過程モデル \n取扱物件や不動産基礎知識のインプット（入社1週間程度） \nアポイント獲得レクチャー \n↓ \nアポイント獲得のためのアプローチ開始 \n↓ \n商談ロープレ \n先輩社員の商談に同席 \n先輩社員に同席してもらい商談開始（入社後1ヶ月〜2ヶ月） \n↓ \n基本的な知識や話術を身につけ、 \n先輩社員に商談同席してもらい成約ができるようになる（入社後2ヶ月〜5ヶ月） \n↓ \nイレギュラーな質問にも対応できるようになり、 \n1人で商談から成約ができるようになる（入社後3ヶ月〜6ヶ月） \n↓ \n目標を逆算しながら売上を達成できるようになる（入社後4ヶ月〜7ヶ月） \n自社にないサービスや商品も、社内で相談したり協力しながらお客様のニーズに最適なサ\nービスを提供できるようになる。 \n \n上記の過程を経て、「お客様の期待を超えられる営業」を目指して頂きます。\n\n■やりがい \n・お客様層が経営者・商材単価も効果なため、自身の視座も上がり、ワンランク上の営業ス\nキルが身につきます。 \n・物件の内覧を希望されるお客様への同行など、短期での海外出張のチャンスもあります。  \n  （基本的には海外支社のメンバーが対応するための日本国内のみでの活躍ももちろん可\n能です。）\n\n■入社後の教育体制・環境 \n・上⻑が1名つき育成していきます。 \n・オンボーディング：不動産業界知識・物件知識等インプット＋ロープレ練習 \n・デイリーMTG：1〜2ヶ月マンツーで実施します \n・一人立ち目安：3ヶ月-6ヶ月\n\n社歴、役職、年齢に関係なく、社員みんなが和気あいあいと働ける職場です。 \n不動産業界未経験者がほとんどで、ホテルフロントや食品法人営業等様々な業界から飛び込み、現在活躍しています。 \n平均年齢は26歳と若くエネルギッシュな雰囲気です。 \n男性：女性比率：8：2	■あらかじめ持っていてほしい要素 \nマインド面 \n・誠実さ（お客様にも、社内にも、自分にも嘘をつかない。） \n・ポジティブ志向（他責＜自責。失敗してもバネにできる。） \n・意欲と行動が伴う（目指す理想像に向けて行動できる・挑戦できる。） \n・協調性（自分の意見を持ち、伝える力がある。みんなの成功を素直に喜べる。）\n\nスキル面 \n・第一印象の印象管理（接するお客様層がビジネスのプロが多いため、妥協のない印象管理\nを目指します。） \n・コミュニケーション力（聞く力・質問に対して論理的かつ端的に伝える力）\n\n■入社して高められる要素 \n・ワンランク上のプレゼンテーション力 \n・課題発見力 \n・情報収集力 \n・ひらめき・アイデア力D21	東京都目黒区青葉台3丁目1-18青葉台タワーannex 4階	正社員	年俸制  月給  267,858円  年収  3,750,000＋インセンティブ	t	2025-07-02 09:10:45.686282+00	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/job-covers/60a03c48-4cfd-4d3c-8ebf-57e90ace9b7b/fa38a7ae-8e38-4b8e-8d13-aa05c8191456.JPG	f	4	\N	fulltime	\N	本選考	\N	60a03c48-4cfd-4d3c-8ebf-57e90ace9b7b
af7f8fbc-8267-4383-8314-2d8c14d7e6d7	5ce59fda-6b6a-4039-ad7f-e371e0408689	【2027卒向け】営業職┃東証一部上場子会社のグローバル不動産ベンチャー【海外不動産販売営業】※25歳でチームリーダー、28歳で役員への昇進実績あり	■業務概要：海外不動産の販売 \n \n■販売する商材 \n・商品：海外不動産 (フィリピン・マレーシア・カンボジア等の東南アジアが中心) \n・商品価格帯：1物件1000万~3000万円が中心。 \n・商品補足：投資用として購入する方が多く、居住用としても販売しています。 \n  大手海外デベロッパーの正規代理販売会社として、リッツカールトンやシェラトン等のホテルレジデンスまで取り扱っております。\n現在の取引国は12カ国ほど。今後東南アジアだけでなくアメリカ等もエリアを拡大予定です。\n\n■お客様 \n・日本全国内の日本人 \n・お客様層：年収3000万以上の経営者・事業主・富裕層の方々\n\n■お仕事の流れ \n・完全反響型 \n  集客はマーケティングチームが広告運用やセミナー・メルマガにて集客 \n  多い月で新規問い合わせが1000件ほどございます。 \n  ↓ \n・問い合わせ・過去問い合わせリードリストにアプローチし商談を調整 \n  ↓ \n・商談（オンライン7割：オフライン3割） \n  ↓ \n・メールや社用LINE・お電話にて定期フォロー \n  ↓ \n・現地物件視察のアレンジ（必要な方のみ） \n  ↓ \n・ご契約手続きの手配\n\n■売上目標 \n・ノルマはありませんがチーム・個人で目標が設定されています。 \n・月2件ほど成約があれば達成 \n・目標金額以上の売上月の場合は達成インセンティブ＋余剰額 × 1% \n  ※実績：営業6名  2023年度下半期   6ヶ月連続達成1名│4ヶ月達成1名│3ヶ月達成2名 \n・年間150万円程度のインセンティブも目指せます。\n\n■どのようにしたら受注できるのか \nお客様層はファミリー層＜経営者の方が多く、お忙しい方が多いため \n法人営業のように商談時間の限られたお時間で、どれだけお客様のニーズや聞きたい情報\nを提供できるか、 \nお客様に信頼して頂けるかが鍵になります。 \nそのため \n・第一印象の徹底 \n・海外や日本の物件情報や、不動産市場の知識インプット \n・商談前のお客様情報リサーチ \nを行っています。\n\n■未経験の方が1人前になっていく過程モデル \n取扱物件や不動産基礎知識のインプット（入社1週間程度） \nアポイント獲得レクチャー \n↓ \nアポイント獲得のためのアプローチ開始 \n↓ \n商談ロープレ \n先輩社員の商談に同席 \n先輩社員に同席してもらい商談開始（入社後1ヶ月〜2ヶ月） \n↓ \n基本的な知識や話術を身につけ、 \n先輩社員に商談同席してもらい成約ができるようになる（入社後2ヶ月〜5ヶ月） \n↓ \nイレギュラーな質問にも対応できるようになり、 \n1人で商談から成約ができるようになる（入社後3ヶ月〜6ヶ月） \n↓ \n目標を逆算しながら売上を達成できるようになる（入社後4ヶ月〜7ヶ月） \n自社にないサービスや商品も、社内で相談したり協力しながらお客様のニーズに最適なサ\nービスを提供できるようになる。 \n \n上記の過程を経て、「お客様の期待を超えられる営業」を目指して頂きます。\n\n■やりがい \n・お客様層が経営者・商材単価も効果なため、自身の視座も上がり、ワンランク上の営業ス\nキルが身につきます。 \n・物件の内覧を希望されるお客様への同行など、短期での海外出張のチャンスもあります。  \n  （基本的には海外支社のメンバーが対応するための日本国内のみでの活躍ももちろん可\n能です。）\n\n■入社後の教育体制・環境 \n・上⻑が1名つき育成していきます。 \n・オンボーディング：不動産業界知識・物件知識等インプット＋ロープレ練習 \n・デイリーMTG：1〜2ヶ月マンツーで実施します \n・一人立ち目安：3ヶ月-6ヶ月\n\n社歴、役職、年齢に関係なく、社員みんなが和気あいあいと働ける職場です。 \n不動産業界未経験者がほとんどで、ホテルフロントや食品法人営業等様々な業界から飛び込み、現在活躍しています。 \n平均年齢は26歳と若くエネルギッシュな雰囲気です。 \n男性：女性比率：8：2	あらかじめ持っていてほしい要素 \nマインド面 \n・誠実さ（お客様にも、社内にも、自分にも嘘をつかない。） \n・ポジティブ志向（他責＜自責。失敗してもバネにできる。） \n・意欲と行動が伴う（目指す理想像に向けて行動できる・挑戦できる。） \n・協調性（自分の意見を持ち、伝える力がある。みんなの成功を素直に喜べる。）\n\nスキル面 \n・第一印象の印象管理（接するお客様層がビジネスのプロが多いため、妥協のない印象管理\nを目指します。） \n・コミュニケーション力（聞く力・質問に対して論理的かつ端的に伝える力）\n\n■入社して高められる要素 \n・ワンランク上のプレゼンテーション力 \n・課題発見力 \n・情報収集力 \n・ひらめき・アイデア力D21	東京都目黒区青葉台3丁目1-18青葉台タワーannex 4階	正社員	年俸制  月給  267,858円  年収  3,750,000＋インセンティブ	t	2025-07-02 09:15:11.753122+00	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/job-covers/60a03c48-4cfd-4d3c-8ebf-57e90ace9b7b/1e0320cd-df15-4f04-be23-7f6400c965a5.JPG	f	15	\N	fulltime	\N	本選考	\N	60a03c48-4cfd-4d3c-8ebf-57e90ace9b7b
3eb0608c-ed07-4854-a233-c1559f3d7233	b3be207f-2766-455e-857a-77e424ce4943	【Software Engineer 】Summer Internship 2025 at a YC Startup ー MVPはシリコンバレーへご招待 ー	テイラーはY Combinator出身スタートアップとして日本で唯一の新卒採用を始めます(※ 2025/06時点・当社調べ)。\nその一環として、Tailor Platformを使い2週間でアプリケーションを企画・開発していただくプログラム「Summer Internship 2025 at a YC Startup」を開催します。\n\n▪️ あなたのアイデアを10日間で具現化する\n「Tailor Platformを使って2週間でアプリケーションを企画、開発してください。」これが本インターンのミッションです。\n本インターンではチームを組成し、そのチームで1つのアウトプットを出していただきます。\n学年不問、さまざまな強みをもった方々にご参加いただけるよう、我々も選考に全力を注ぎます。\nそして期間を通してテイラーのValueを体現したとされるMVPにはシリコンバレーツアーのご招待を予定してます！\n\n▪️このインターンを通して得られる経験\n「価値あるアプリケーションを作る、チーム開発経験」\nSoftware Engineerの役割は「Tailor Platformを使ったアプリケーション開発を主導し、システムの設計・実装に責任を持つ」ことです。\n\n・アプリケーション設計・開発\n　Tailor Platformを用いたアプリケーション設計と高速開発を体験\n・チーム開発で仕様を詰めていく開発プロセス\n　PdM・Consultantとの連携を通じ、仕様を“決める側”としても関わる\n・デバッグ・改善・品質向上プロセス\n　動くものを作るだけでなく、継続的に改善・ブラッシュアップする\n・クライアントに届けるプロダクト開発\n　「価値を提供する」を意識したプロダクト開発経験\n\n▪️報酬\n20万円 / 10日間\nMVP選出者にシリコンバレーツアー招待	・テイラーのミッション、バリューに共感していただける方\n・2026年4月以降に卒業予定の高専・短大・大学・大学院・専門学校の学生\n※学年、学部、学科は不問です	東京都港区	インターン	\N	t	2025-07-07 02:16:49.474665+00	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/job-covers/6dee4175-a9e5-4cc3-8089-5008d380ef9a/851223a8-b7d9-49c0-8436-1bfae7b42041.jpg	f	37	\N	internship_short	2025-07-15	インターン	2025-08-18	6dee4175-a9e5-4cc3-8089-5008d380ef9a
23f12c2b-4037-4cd0-bda2-253136f46c6b	28d5461b-7b35-4c00-93b7-8c94f2133458	【2daysインターンシップ後は特別本選考ルートへご招待！】1,000名規模×急成長中×ITミドルベンチャーで共に事業戦略を考えてみませんか？	※ご応募後に、今後の説明会やインターンシップ選考をご案内いたします\n弊社は「誰もがマーケティングで成功できる世界を創る」のBusiness Purposeとともに、\n世界的なテクノロジー企業を本気で目指す急成長中のIT企業です。\n\nインターンシップでは、GENIEE事業の過去事例を基に戦略立案型のワークを\n体験していただきます。顧客のマーケティング課題に真剣に向き合いながら、\n当日は事業開発社員や事業責任者から、手厚くフィードバックさせていただき、\nご自身の今後にも役立つコンテンツとなっておりますので、是非この機会にご参加ください！\n\n〈こんな方は是非ご参加ください！〉\n\n・事業づくりや企業の課題解決/マーケティングに興味がある方\n・第二成長フェーズで一緒に会社の成長を創り上げていくことに興味がある方\n・挑戦環境に身をおき、若手のうちから裁量をもって成長したい方\n・早期からマネジメントを経験したい方\n・何事もやるからにはNo.1を目指していきたい人、そのような経験がある方\n・ITベンチャーでの就職を検討している人/夏～秋時期のインターンを探している方\n\n■概要詳細\n・開催場所：ジーニー本社（東京都新宿区西新宿）\n・開催日程：8/22-23(金土)、8/29-30(金土)、9/7-8(日月)、9/12-13(金土)\n・昼軽食/夕食付き\n・宿泊費/交通費一部支給 ※遠方よりご参加いただく方を対象\n\n■インターン参加特典\n・特別早期選考のご案内\n・早期内定の可能性あり\n\n■プログラム（予定）\n・業界/企業理解\n・事業戦略立案型のグループワーク\n　※事業開発経験がある社員がワーク内容を徹底サポート\n　　アウトプットに対する最終フィードバックには役員が登壇いたします！\n・現場社員との交流\n\n■参加フロー\nインターンシップへ参加された方は、その後優先的に特別早期選考にご招待いたします！\n説明会参加 → 適性検査 → 一次面接 → インターンシップ参加\n\n■採用担当からのおすすめポイント\n・昨年度も実施し、満足度5点満点中4.8を記録する大人気イベントです。\n・高難度の課題に取り組み、若手から周囲に差を付けて成長したい人、\n　経営に近い事業作りや企業の課題解決/マーケティングに興味がある人は是非ご参加ください！\n\n上記ご確認いただき、是非皆さまからのご応募をお待ちしております！	2027年卒の方（2027年3月卒業予定の大学生もしくは大学院生の方が対象）	本社（東京都新宿区西新宿6-8-1 住友不動産新宿オークタワー5/6階）	インターン	\N	t	2025-07-07 03:38:03.420824+00	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/job-covers/0b5f7833-a5fe-4c95-883a-173ca6aa6cb0/ca9a9dbf-f27e-4bd3-98c1-f7a4e06ff308.jpg	f	58	\N	internship_short	2025-08-31	インターン	2025-08-22	0b5f7833-a5fe-4c95-883a-173ca6aa6cb0
be9a7b47-0d8e-4718-a30d-14e5eb8d0f4b	b3be207f-2766-455e-857a-77e424ce4943	【Consultant / Product Manager】Summer Internship 2025 at a YC Startup ー MVPはシリコンバレーへご招待 ー	テイラーはY Combinator出身スタートアップとして日本で唯一の新卒採用を始めます(※ 2025/06時点・当社調べ)。\nその一環として、Tailor Platformを使い2週間でアプリケーションを企画・開発していただくプログラム「Summer Internship 2025 at a YC Startup」を開催します。\n\n=============================\nあなたのアイデアを10日間で具現化する\n=============================\n「Tailor Platformを使って2週間でアプリケーションを企画、開発してください。」これが本インターンのミッションです。\n本インターンではチームを組成し、そのチームで1つのアウトプットを出していただきます。\n学年不問、さまざまな強みをもった方々にご参加いただけるよう、我々も選考に全力を注ぎます。\nそして期間を通してテイラーのValueを体現したとされるMVPにはシリコンバレーツアーのご招待を予定してます！\n\n=============================\nこのインターンを通して得られる経験\n=============================\nこのインターンシップではSoftware Engineer、Consultant、Product Manager、いずれか3職種での就業に興味がある方のご応募をお待ちしております。（実務経験、学部・学科・学年は不問）\n応募時にどのポジションに興味があるかをお伺いしますが、実際にチームメンバーと相談しながら役割を定義していただきます。\n\n▪️コンサルタント：「仮説構築、戦略立案、実行プロセスを10日で経験」\nコンサルタントの役割はクライアントの現状を分析し課題を特定、具体的な解決策を立案し、実行までの一連のプロセスを推進することです。\n\n・仮説思考と課題整理\n　ユーザー課題・業界構造のリサーチをもとに、課題を論理的に整理\n・戦略立案プロセスの体験\n　新規プロジェクト立ち上げにおける企画～要件定義の意思決定を経験\n・資料作成・プレゼンテーション実践\n　スライド構成・ストーリーテリングを通じて、提案の「伝え方」を実践\n・チームでの仮説検証・検討プロセス\n　多様なバックグラウンドを持つメンバーとの対話で俯瞰的な視点を持つ\n\n▪️Product Manager\n「制約を武器に。MVP開発における意思決定の実践」\nProduct Managerの役割は「クライアントのニーズを深く理解し、企画・要件定義・開発ディレクションを通してアプリケーションを作る」ことです。\n\n・クライアントに向き合った課題定義\n　インタビューなどを通じて本質的な課題を特定\n・要件定義・MVP設計\n　制約の中で“本当に必要な機能”に絞り、実装仕様に落とし込む\n・開発推進・フィードバックサイクル\n　チームで協働し、開発を推進しながら改善サイクルを回す\n・意思決定のロジック構築\n　何を・なぜ優先するか、限られたリソースの中で意思決定を行う\n\n=============================\n報酬\n=============================\n20万円 / 10日間\nMVP選出者にシリコンバレーツアー招待	・テイラーのミッション、バリューに共感していただける方\n・2026年4月以降に卒業予定の高専・短大・大学・大学院・専門学校の学生\n※学年、学部、学科は不問です	東京都港区	インターン	\N	t	2025-07-07 02:12:44.939862+00	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/job-covers/6dee4175-a9e5-4cc3-8089-5008d380ef9a/70713418-fc96-4d2b-8452-0cea894ee587.jpg	f	14	\N	internship_short	2025-07-15	インターン	2025-08-18	6dee4175-a9e5-4cc3-8089-5008d380ef9a
\.


--
-- Data for Name: media_authors; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.media_authors (id, user_id, display_name, bio, avatar_url) FROM stdin;
8808c51e-f25b-468e-afb4-dbf639d72d28	f5763843-120e-4aea-9e8a-b3deeab22c80	y.kumazaki@makeculture.jp	\N	\N
\.


--
-- Data for Name: media_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.media_categories (id, name, slug, "order") FROM stdin;
c0b4adda-95cb-4003-9b79-fbd3e784f676	ニュース	news	0
cf6a25e0-9dea-459d-9225-97cb734598fa	イベント	events	0
74114e4f-9f4c-45ff-af96-6a1e26668ef0	就活	shukatsu	0
572d3dcc-618e-4767-92ec-fb22011cfb73	大学生活	campus-life	0
\.


--
-- Data for Name: media_posts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.media_posts (id, title, slug, excerpt, content_md, content_html, cover_image_url, status, published_at, author_id, category_id, created_at, updated_at, deleted_at, preview_token) FROM stdin;
d0f4babd-fa0d-4651-a33f-3ca400812447	【大学1年生向け】1年生だからこそインターンについて知ろう！	firstyear	大学1年生向けにインターンシップとは何かやインターンの種類を解説しつつ、大学1年生だからこそ参加すべきメリットについて記載しています。\n周りの大学生と圧倒的な差をつけ自分のキャリアを構築したい大学1年生はぜひ本記事を読んでインターンシップを検討してみてください。\n	\N	<p>今回は、大学1年生の皆さんに向けて、「インターンシップってなんだろう」という基本的な説明から、インターンのメリット、注意点、始め方までを解説しています。</p><p>インターンという言葉は聞いたことがあるけれども詳しくは分からない、または、インターンを経験して大きく成長したいと考えている学生の方々など、多くの人に参考になる内容となっています。ぜひご一読ください!</p><h2>インターンシップって何？</h2><p>インターンシップとは、企業が学生に提供する「職業体験の機会」です。アルバイトや副業など収入を目的とした仕事とは異なり、自分の適性のある仕事が何かを判断したり、ビジネスを深く理解し、スキルや経験を積むことが目的です。</p><p>企業側からも、優秀な学生との接点を増やしたり、職業体験を通して企業と学生のミスマッチを減らすことができ、有益な制度となっています。</p><p>これまでインターンシップは職業体験の場として位置付けられてきましたが、近年、企業が優秀な学生との接点を採用活動の一環として捉え、インターンシップからの直接採用に繋げる動きが出てきました。これを受け、政府がインターンからの採用を容認しています。</p><p>そのため、インターン中の業務成績や獲得したスキルなどは、今後の就職活動でより重視されることになります。</p><h2>インターンシップの種類</h2><p>インターンは、大学生が自分の適性や関心のある職業を明確にし、ミスマッチのないキャリア選択を行う上で絶好の機会といえます。しかし、インターンの目的は開催企業によって異なり、いくつかの種類が存在します。大学1年生におすすめのインターンもあるため、ここでインターンの種類について解説します。</p><h3>1dayインターン</h3><p>1dayインターンは、名前の通り1日で完結するインターンです。実務経験やスキルの獲得を目的とするよりは、企業説明会や職場見学、簡単な業務体験などを通して、会社の雰囲気を体感することが主な目的です。</p><p>1dayインターンは、多くの場合企業の選考プロセスの一部として行われ、自社の魅力を幅広く伝えることもねらいの一つです。実際のオフィス環境や社員との相性など、就労環境を知ることができるため、主に就職活動に直結する大学3年生にとって効果的なインターンといえます。</p><h3>短期インターン</h3><p>短期インターンは、2日から2週間程度の短期間で行われるインターンです。会社の雰囲気や職場見学に加え、グループワークや実践的な業務体験ができることが魅力です。</p><p>グループワークやディスカッションを通じて、事業開発、新規サービス開発、市場調査・分析などの実務を擬似体験し、ビジネスの実態に触れることができます。積極的なコミュニケーション力や優れた発想力など、自身の長所をアピールできれば、採用に繋がる可能性も高まります。</p><h3>長期インターン</h3><p>長期インターンは、主にスタートアップ企業が用意している1ヶ月から最長で年単位の期間で実施されるインターンです。長期インターンでは、実際の社員と同等の業務に従事し、ビジネススキルや強みを徹底的に磨くことができます。</p><p>中にはクライアント業務など企業が重視する重要な業務に携わる機会もあり、リアルな職場環境や業務内容を体感できることが大きな魅力の一つです。学生と長期にわたり一緒に挑戦を重ねたいと考える企業も多いため、キャリア形成の視点から大学1年生におすすめのインターン形態といえます。</p><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-1920x1080_v-frms_webp_0ca4f99f-624e-480f-8ec4-05dbe6832a62.png" alt=""><p></p><h2>大学1年生がインターンシップに参加するメリット</h2><p>インターンシップは大学3年生など就職活動真っ只中の学生が参加するものであると考えた方も多いかもしれません。しかしながら長期インターンを中心に大学1年生だからこそ始めるべきであるインターンのメリットがありますので解説していきます。</p><h3>大学では学べない知識やスキルを学べる</h3><p>インターンシップでは、大学の講義では学ぶことのできない、よりリアルで実践的な知識やスキルを身につけることができます。大学で過去の成功事例や理論を学び知識を蓄えることも重要ですが、それをどのように活用していくか、現実の世界やビジネスがどのように機能しているのかを実地で学ぶことで、スピード感のある実践的な成長が期待できます。</p><h3>将来のキャリアプランを決めるきっかけになる</h3><p>ビジネスを実際に体験することで、自分の適性や興味を持てる業界・職種を見つけることができ、将来のキャリアをイメージしやすくなります。日本では、新卒入社後に初めてビジネスを経験する人が多いため、自分のやりたいことと合わない場合や、会社の環境に適応できない場合など、早期離職率が高くなる傾向があります。</p><p>キャリアについて、自分に合ったものを選択するためには、ある程度の自己分析とビジネスへの理解が必要不可欠です。そのために、インターンシップは最適な手段の一つといえるでしょう。</p><h3>人脈の広がりや優秀な仲間と出会える</h3><p>インターンを通じて、インターン先の社員だけでなく、クライアント企業の社員や経営者など、トップレベルの社会人との出会いがあるかもしれません。真摯な態度で仕事に取り組む大学生は、社会人以上に可愛がってもらえることも多く、それが大きな財産になるでしょう。</p><p>また、共にインターンに励む仲間との交流は、就職活動のアドバイスやキャリアについての相談に留まらず、一緒に起業するきっかけにもなる可能性があります。</p><h2>インターンシップに参加する上での注意点</h2><p>大学1年生からインターンを始めることには多くのメリットがありますが、インターンに参加したために学業やプライベートが疎かになってしまっては本末転倒です。インターンに参加する前に、自分のスケジュールや目標を整理し、学業との両立が可能かどうかを慎重に見極める必要があります。</p><p>特に大学1年生は大学生活に慣れ、単位取得を優先的に考える必要があります。またサークルやバイトなどやりたいこともたくさん出てくるでしょう。</p><p>新しい生活に馴染む前にインターンに参加し全てが中途半端になってしまうことは好ましくありません。</p><p>そのため、まずは大学1年生としての計画を立て、その上で、インターンに参加する明確な目的意識を持つことが重要です。自分がなぜインターンがしたいのか、インターンを通して何を得たいのかを明確にした上で、インターンシップへの参加を検討することをおすすめします。</p><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-1920x1080_v-frms_webp_2b72d531-45e8-4e79-8be3-2534719f5f54.png" alt=""><h2>インターンシップの探し方</h2><p>いざインターンを始めたいと思っても、その探し方が分からなければ意味がありません。インターンの探し方にはいくつかの方法とコツがありますので、参考にしてみてください。</p><h3>知り合いからの紹介</h3><p>インターンシップに参加したい企業が決まっている学生や、すでにインターンシップに参加している先輩や知人がいる場合は、知り合いからの紹介でインターンに応募することをおすすめします。</p><p>信頼できる情報源から直接話を聞くことで、自分の希望に合ったインターンかどうかの判断がしやすくなります。また、学業との両立など、実際にインターンを効果的に進められるかどうかの見極めにも役立ちます。</p><p>さらに、インターンを共に頑張る仲間がいることは、自分のモチベーション維持にもつながり、インターン生活をより充実したものにしてくれるでしょう。</p><h3>企業への直接応募</h3><p>参加したい企業や業界、やりたい仕事などがすでに明確に決まっている人は、企業への直接応募も選択肢の一つです。志望する企業や業界が絞り込めていれば、インターネットを使ってインターン実施企業を探すことができます。これにより、自分の希望とのミスマッチが起きにくく、充実したインターン生活をスタートさせられるでしょう。</p><p>また、企業側からしても、直接応募してくる学生は強い関心を持っていることが伝わるため、一緒に働きたいと思ってもらえる良いきっかけにもなります。</p><h3>インターン情報サイトからの応募</h3><p>明確にやりたいことが決まっていなかったり、志望企業が定まっていない学生には、インターン情報がまとまっている専門サイトからの応募がおすすめです。</p><p>インターン専門サイトには多くの企業情報が掲載されているため、企業の比較検討がとても容易になります。また、自身の希望する業界や働き方に応じて企業を選択できるため、ミスマッチが起こりにくいのも特徴の一つです。</p><p>希望の企業が見つかった際には、サイト内からそのまま応募や選考プロセスに進むことができるので、スピーディーにインターンをスタートさせることができるでしょう。</p><h2>大学1年生だからこそインターンを検討しよう</h2><p>今回は、大学1年生の皆さんに向けて、インターンシップの概要や、参加によるメリット、注意点、探し方などについて解説してきました。</p><p>大学1年生という早い段階でインターンシップに参加することで、多くの利点を得ることができます。周りの学生と大きな差をつけ、充実した学生生活を送るためにも、この記事を参考にしてインターンシップへの参加を検討してみてはいかがでしょうか。</p>	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/media/covers/1751431461546-16rnx9.png	published	\N	8808c51e-f25b-468e-afb4-dbf639d72d28	572d3dcc-618e-4767-92ec-fb22011cfb73	2025-07-02 04:46:41.897702+00	2025-07-02 04:51:33.867+00	\N	6c5c9238-8690-4585-9057-fee60a824da7
b7f28068-6475-45e2-8577-fc12cfb0c9ae	【大学生の起業は難しい？】学生起業のメリットとデメリットを知ろう！	startup	大学生による学生起業の始め方をわかりやすく解説！メリットやデメリット、必要なスキルから成功事例までを網羅。起業に興味のある学生必見の情報が満載です。将来の選択肢の一つとして、ぜひ参考にしてみてください。	\N	<p>初めまして！ Make Cultureの坂入です！</p><p>自分は学生時代に1回起業を試み失敗しましたが、現在株式会社Make Cultureを再び創業し活動しております。そんな私だからこそ、起業のメリットとデメリット、起業までにやっておくべきことを解説していければと思います。</p><p>すでに起業しようか悩んでいる方や将来起業を目指している方、起業に少しだけ興味があるという方など、起業への思いは人それぞれだと思います。大学生のうちからビジネスに興味があるという学生が増えてきている中で、ためになる情報をまとめていますのでぜひ参考にしてみてください！</p><h2>なぜ失敗したのか</h2><p>インターンについてのメリットやデメリットを解説する前に、私自身が過去に経験した起業の失敗について説明します。実体験に基づく内容ですので、起業に挑戦したい学生だけでなく、少しでも興味のある人は今後の方向性を決める際の参考にしてみてください。</p><p>結論からお話しすると、私の最大の失敗要因は適切な金銭管理ができていなかったことです。私は当時、現在のXやLINEに似たSNS媒体を開発し、ユーザーに向けて広告を配信したい企業から広告料を頂くというビジネスモデルで起業しました。一緒に起業したエンジニアの高い技術力と、投稿に対するセキュリティの強さが評価され、質の高い媒体として複数の企業から大型の受注も決まっていました。</p><p>しかし、ある日、会社の資金が急激に減少していることに気づきました。原因を調査してみると、一緒に活動していたエンジニアが横領していたことが判明しました。当人に連絡を取ったところ、そのまま音信不通となってしまい、資金を持ち逃げされたため会社を畳まざるを得なくなったのです。</p><p>本来であれば自分で厳重に管理すべき資金を、社内で簡単にアクセスできる状態にしてしまったことで、順調に成長していた会社が一瞬にして崩壊したという経験は、人生で最もつらい出来事でした。</p><p>起業は、成功を重ねていたとしても、一つの過ちですべてが失われる可能性があります。起業に挑戦する前に、そのメリットとデメリットをしっかりと理解しておくことが大切です。</p><img src="https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/media/inline-images/21w9ws5vw3z.svg"><h2>大学生が起業するメリット</h2><p>初めに大学生が起業するメリットをまとめました。起業は社会人になってからでも可能ですが、大学生だからこそ起業するメリットもいくつかあります。</p><h3>①将来に繋がる大きなアドバンテージを得れる</h3><p>起業することで、経営者や大企業の部長クラスなど、普段は関わることのできない人たちと出会うことができます。社会をより深く知っている先輩方との会話は、起業だけでなく人生において大きなアドバンテージとなります。また、学生であれば注目してもらえる機会も多く、社会人から起業するよりも大きな認知を得ることも可能です。</p><p>さらに、起業することでより多くのビジネス経験を得られるとともに、成功すればお金や時間の余裕が桁違いになります。早期に会社を売却し、時間とお金を手に入れることで、自由に生きたり新しい事業を始めたりと、様々な可能性を広げることができます。大学生のうちから始めることで、成功時のアドバンテージもより大きくなるでしょう。</p><h3>②学生に特化した支援を受けられる</h3><p>社会人で起業すると、金銭的な問題などリスクが多いだけでなく、起業支援の制度が少なく自力が求められます。もちろん学生起業にもリスクは伴いますが、学生のうちであれば様々な支援を受けることができます。近年、起業を応援している大学も増えており、専門家やオフィスの紹介、同じ大学の経営者コミュニティへの招待など、様々な制度が用意されています。</p><p>サポートを受けることで、通常よりもリスクを抑えた起業が可能であり、成功へと繋がります。</p><h3>③失敗しても起業経験が無駄にならない</h3><p>起業は全ての人が成功するとは限らず、失敗するケースも少なくありません。そんな中で学生起業の場合は、失敗したとしてもそれを挑戦意欲と経験として評価してもらえることが多く、起業経験が無駄になりません。就活の際には大きなアピールポイントとなったり、再度起業を志す際の糧になったりと、大きなメリットになります。</p><p>また、社会人になってから起業することを考えると、今までの稼ぎが0になるリスクや家庭や生活を犠牲にしなければいけないなど、大きなリスクと責任が伴います。一方、学生起業の場合は保護者のサポートを受けるなど他者を頼り、小さなリスクで始められるだけでなく、失敗したときのダメージが少なくなります。</p><h2>学生起業のデメリット</h2><p>ここまで起業のメリットを解説してきましたが、起業にはデメリットも少なくありません。メリットとデメリットの両方を理解した上で起業について考えることが大切です。</p><h3>①学業との両立が難しい</h3><p>起業をすれば、確実に仕事に時間を取られることとなり、学業が疎かになりがちです。特に、起業してからしばらくは利益を出し安定させるためにも、より多くのタスクを消化する必要があったり、社員数も少ない中で自分で勉強し解決しないといけない業務があったりと、とにかく時間が必要です。</p><p>学生の本業である学業を疎かにし成績が悪くなると留年につながるため、最低限は学業に時間を割く必要があり、時間の使い方が重要になります。自分の優先すべきことが何かを判断し、親や周囲の人間の理解を得なければ、起業と学業の両立は難しいでしょう。</p><h3>②社会経験の少なさから失敗することも多い</h3><p>支援制度がいくら優れているといっても、自身の知識や経験の差は社会人と比べ大きく、事業における判断やトラブルの対処などが遅れ、失敗へとつながることも多いでしょう。企業に属していれば、わからないことは上司や同僚などに相談し解決できますが、学生起業の場合は自身で解決しないといけないことが多く、挫折してしまう可能性も高まります。また、マネジメントや財務、法務などの経営に未経験で進むことも多いため、失敗はつきものです。</p><p>挫折せずに学生起業を続けるには、弛まぬ努力はもちろんのことながら、失敗してもめげない心持ちが大切だと言えます。</p><h3>③プライベート時間が取りづらい</h3><p>学生起業は、より多くの時間と労力がかかるため、プライベートの時間は必然的に少なくなります。大学生はサークルや遊び、趣味などやりたいことも多くなりがちであり、周囲の学生が楽しんでいる様子を片目に、ビジネスを行うことにもどかしさを感じることもあるでしょう。</p><p>起業は多くのメリットがある一方で、自分のプライベートや自由な時間がなくなる場合も多いため、相当な覚悟が必要になるのです。</p><h3>④起業に必要な資金を用意できない</h3><p>起業には何かとお金が必要になります。従業員を雇ったりオフィスを借りたりと、事業を大きくしようと思えば思うほど固定費は大きくなっていきます。社会人と違って稼ぐ能力や経験を持っていない分、学生起業におけるお金の問題はより深い悩みとなることでしょう。</p><p>また、資金調達をして会社のお金を補填する手段もありますが、学生は実績がないため融資を受けにくく、自己資金での運営を考えなくてはいけません。</p><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-1920x1080_v-frms_webp_bf78fbb4-3f73-469f-9ab2-02732b3d3f7e.png" alt=""><h2>学生起業に必要な能力は？</h2><p>ここまでの解説で学生起業のメリットとデメリットを理解し、実際に起業してみたいなと感じた学生もいるかと思います。では、実際に起業をするにあたって必要な能力とは何があるのでしょうか。スキルはいくらあっても困るものではありませんが、その中でも特に必要な能力を解説します。</p><h3>①プレゼンテーション力</h3><p>プレゼンテーション能力は間違いなく必要なスキルの一つです。起業し自身のサービスや強みを持っていても、相手に伝えることができなければ意味がありません。また、学生企業という注目を浴びる中で、自身の想いをうまく表現できなければ、多くの人に助けてもらう機会を失うことにもつながります。</p><h3>②ロジカルシンキング</h3><p>学生起業であっても、1人の起業家として論理的に話せるかや物事の本質をしっかりと考えられているかは周囲の人から見られており、ロジカルシンキングは必要不可欠な能力といえます。話が通じていないなや論点がずれているなと思われれば、ビジネスチャンスを提供してもらえる機会を失い、成功を逃すことにも繋がります。</p><p>また、会社の方針や事業の悩みを解決するにあたって、本質的な課題に気付けなければ正しい方向へは進めません。物事を論理的に考える能力は、起業に必要不可欠だと言えるでしょう。</p><h3>③創造性・独自性</h3><p>創造性は学生起業だからこそ持っておくべき能力と言えます。学生のみでありながら起業するという挑戦は、それだけでも魅力的なものです。だからこそ、誰でもできるビジネスやお金稼ぎだけを考えた起業は面白みがなく、学生や自分だからこそ持ってる能力や思いを活かしたビジネスをする必要があります。一見人から見ると無謀な挑戦だとしても、それを形にしていくことがビジネスの面白さであり、創造性や独創性は忘れてはいけません。</p><h2>起業するまでにやっておいた方がいいこと</h2><p>学生起業に必要な能力についての解説を読み、実際に起業したいなと思った人もいれば、自分には難しそうと感じた人もいると思います。そんな皆さんに、起業する前にやっておくべきことをいくつかピックアップしましたので、今後のキャリアや起業について考えてもらえればと思います。</p><h3>①長期インターン</h3><p>長期インターンは、学生のうちに実際の企業で社会人と同等の業務を経験できる制度です。自分で0から始めるには経験もスキルも足りないと感じる人は、まず長期インターンで実際のビジネスを学び、スキルアップすると良いでしょう。</p><p>また、起業するか悩んでいる人や少しでも興味がある人にも、長期インターンはおすすめです。実際のビジネスを学ぶことで、起業した後の動きが明確になるだけでなく、そもそもどんな分野で起業するかを決めることもできます。長期インターンでは、能力をつけられるだけでなく人脈も広がり、きっと起業後の助けになるでしょう。</p><p>長期インターンについてもう少し知りたい方は、下記のnoteも参考にしてみてください。</p><p>URL：<a target="_blank" rel="" href="https://note.com/make_culture/n/nf40ea45b53d5">https://note.com/make_culture/n/nf40ea45b53d5</a></p><h3>②ビジネスコンテスト</h3><p>ビジネスコンテストとは、自分のサービス案を発表し、主催の経営者や投資家などから評価を受け、優秀賞などを決めるコンテストです。少しでも形にしたいアイデアがある人には特におすすめです。ビジネスコンテストに出ることで、自分のアイデアの評価を受けることができるのみでなく、優秀賞を受賞すればそのまま融資を受け起業できることもあります。</p><p>自分の今の実力を図る絶好の機会となりますので、起業したい人や興味がある人はぜひ調べてみてください。</p><h3>③小規模で始めてみる</h3><p>せどりやアフィリエイト広告、SNSなど、初期費用をかけずに1人で始めることのできるビジネスに挑戦し、成功できるビジョンが見えてから起業する方法もおすすめです。リスクを取らずに小規模で始めれば、失敗したときのダメージも小さくなります。1人で売り上げを立てることができれば、間違いなく起業して上手くいく可能性も高くなるでしょう。</p><p>実際、1人でできる副業などから始め起業している起業家も多く存在します。</p><h2>学生起業についてよく知ろう</h2><p>学生起業をしたいと考えている方は、メリットやデメリットなどの情報をしっかりと認識することが大切です。どんなに優れたアイデアや能力があっても、何も知らない状態でビジネスの世界に飛び込めば、失敗の可能性も高まります。今悩んでいる人や動き出したい人は、今一度自分の中で起業の選択肢が適切なのかを考えると同時に、本記事を読むなどしっかりと情報収集することを心がけてください。</p>	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/media/covers/1751431837000-g24pty.png	published	\N	8808c51e-f25b-468e-afb4-dbf639d72d28	572d3dcc-618e-4767-92ec-fb22011cfb73	2025-07-02 04:51:10.999741+00	2025-07-02 04:51:42.172+00	\N	17693a34-2caa-41e7-ae15-816ede4681a2
ed697910-71bd-412f-a25a-bf0275712260	【稼ぎたい学生注目】大学生の稼げるバイトを紹介！！	earnmoney	大学生活で多くの人が直面するお金の問題に対して稼げるバイトの紹介や注意する点などを解説しています。\n楽しい大学生活を送るために必要なバイトの稼げるコツをしっかりと押さえ、豊かな学生ライフを送りましょう。	\N	<p>学生生活は素晴らしい経験の連続ですが、お金の問題で思い描いた大学生活を送れないなんてもったいない。今回は、そんなお金の悩みを解決するため、大学生がバイトで効率的に稼ぐコツをご紹介します。</p><p>せっかくの学生時代を、お金がないから満足に過ごせない、なんて後悔したくありませんよね。友達と遊ぶためのお金がほしい、一人暮らしをしているから生活のためにお金が必要、大学や資格勉強にお金がかかるなどいろんな人がいるかと思います。</p><p>この記事を参考に、学業とプライベートを両立しながら、華やかな大学生活を送りましょう!</p><h2><strong>大学生の平均的な収入は?</strong></h2><p>そもそも日本の大学生は月にいくらほど稼いでいるのでしょうか？</p><p>日本学生支援機構の調査（※1）によると令和2年の大学生の平均月収は約3万であり、年収換算すると約36万円ほどと言われています。</p><p>出典元：<br>※1）独立行政法人 日本学生支援機構<br><a target="_blank" rel="" href="https://www.jasso.go.jp/statistics/gakusei_chosa/2020.html">https://www.jasso.go.jp/statistics/gakusei_chosa/2020.html</a></p><p>しかし、この金額では足りないと感じる人も多いはず。一人暮らしの生活費、サークル活動の費用、友人とのレジャーにかかるお金など、目的によって必要な金額は人それぞれ異なります。自分の生活スタイルに合わせて、月々どの程度の収入が理想的かを算出することが大切です。</p><p></p><h2><strong>自分に必要な金額を考えよう</strong></h2><p>前述した通り自分の生活で1ヶ月どのくらいのお金が必要なのかを把握していますか？お金がたくさんあって困ることはありませんが、お金を稼ぐことに熱中した結果満足に遊ぶことができなくなったり学業が疎かになったりしてしまっては本末転倒です。</p><p>自分に必要な額面を把握した上で、人よりも稼ぎたいと思っている方はより効率よく稼ぐ方法を考える必要があります。1日の時間はみんな同じ中で稼ぐために長く働くという選択は必ずしも正しくはありません。</p><p>健康的で楽しい大学生活とバイト生活を両立するためにも賢く効率的に稼ぐ方法を探す必要があります。</p><p></p><h2><strong>高時給のバイトで効率よく稼ぐ</strong></h2><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-1920x1080_v-frms_webp_bf89d692-f27b-4300-8d74-6a0c78dd32fa.png" alt=""><p>効率よく稼ぐ一番の近道は、時給の高いバイトを選ぶことです。ここでは、おすすめの高時給バイトをご紹介します。</p><h3><strong>1. 身体を使う肉体労働系</strong></h3><p>体力を必要とする仕事は通常のオフィスワークや飲食店でのバイトなどより時給が高い傾向にあります。</p><p><u>参考：</u><a target="_blank" rel="" href="https://www.mhlw.go.jp/content/000817351.pdf"><u>https://www.mhlw.go.jp/content/000817351.pdf</u></a></p><p>例えば引越しでの荷物運搬や建設現場での作業などフィジカルが必要な仕事は、内容はハードでも時給換算すると割りの良いバイトといえます。</p><p>またキャバクラのボーイやクラブのSPなど何かとトラブル対応が必要になる仕事も高時給です。</p><h3><strong>2. 単発のアルバイト</strong></h3><p>単発バイトも効率よく稼げるバイトの一つと言えるでしょう。特に時期によって需要が高まる試験監督やイベントのスタッフなどは継続的に続くわけではない分一般的な長期バイトと比較しても時給がよくなる傾向にあります。</p><p>また単発バイトの良さは複数のバイトを掛け持ちしながらも自分のスケジュールに合わせて数をこなすことが可能なため収入を増やすと言う意味合いで人気が高いです。</p><p>友達や大切な人の記念日で急遽お金が必要になったときなどのスポット需要にはもってこいでしょう。</p><h3><strong>3. 成果報酬型のインターン <s>(時給とのダブルワークも)</s></strong></h3><p>成果報酬型の仕事も時給を超えて収入を得る方法の一つです。</p><p>通常のアルバイトは時間に対する給料をもらいますが、成果報酬型では自分の出した結果や営業成績に対して報酬が出ます。</p><p>自分の力量次第で上限なしで稼いでいけるため中には社会人と同等の給与を稼いでいる学生もいます。</p><p>また、バイトと違って社会人と遜色のない業務内容を経験できることからインターンでの経験は唯一無二のガクチカとしても使えるため、稼げる上に就職活動でも有利になるというまさに一石二鳥の働き方です。</p><p>インターンでどう稼いでいくのかをもっと知りたいという方は下記のnoteを参考にしてみてください！！</p><p><a target="_blank" rel="" href="https://note.com/make_culture/n/nf40ea45b53d5"><u>https://note.com/make_culture/n/nf40ea45b53d5</u></a></p><p></p><h2><strong>バイトで稼ぐ際の注意点</strong></h2><p>バイトで収入を得る際は、扶養控除の上限(103万円)に注意が必要です。扶養控除を受けている場合、この金額を超えると扶養から外れ、自身で税金を支払わねばなりません。つまり、103万円を境に、手取り額が逆転する可能性があるのです。</p><p>このような制度の理解を怠ると、多く働いた分、かえって損をする恐れがあります。103万円以内に収めるか、成果報酬型のインターンなど税金対策ができる働き方を選ぶなど、賢明な判断が求められます。</p><p></p><h2><strong>賢く稼いでバイトとやりたいことを両立しよう</strong></h2><p>今回は大学生が稼げるバイトの紹介と稼ぐ上での注意点を解説してきました。</p><p>学生生活を過ごしていく中で多くの人がお金の問題に直面するかと思います。お金があればできることもたくさんあるのは事実ですが、お金を稼ぐことがメインになってしまってはいけません。学生生活を楽しむことを念頭においた上でバイトとやりたいことを両立できる学生生活を送りましょう。</p>	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/media/covers/1751432158053-yhjq4e.png	published	\N	8808c51e-f25b-468e-afb4-dbf639d72d28	572d3dcc-618e-4767-92ec-fb22011cfb73	2025-07-02 04:56:17.018192+00	2025-07-02 04:56:17.018192+00	\N	2f01cf97-ef5a-473e-a869-b9a6baac2c89
ce072770-3182-441d-ae9b-c9106ce57965	【大学1年生必見！】大学1年生向けバイトの始め方やおすすめバイトをご紹介！	大学1年生必見-大学1年生向けバイトの始め方やおすすめバイトをご紹介	華々しい大学生活をスタートさせたい大学1年生の君にアルバイトの始め時や学業との両立方法、おすすめのバイトを紹介しています。\n楽しい大学生活を送るために必要なバイトの基礎情報をしっかりと押さえ、豊かな学生ライフを送りましょう。\n	\N	<p>初めまして！<br>Make Cultureの上田です！<br>今回は大学生1年生がバイトを検討する際に知っておいた方がいい情報をまとめました</p><p>『新生活をスタートさせたけど大学生って何かとお金がかかるしこのままで大丈夫かな、、、』<br>この記事を読んでくれているみんなもそんな悩みを持っていませんか？</p><p>大学生の多くが入学してから「お金の悩み」に直面すると思います。<br>『楽しそうなイベントがたくさんあるのにお金がなくて参加できない！！！』<br>なんてことにはなりたくないあなたに、大学生がバイトするメリットや学業との両立方法、おすすめのバイトまでこの記事にまとめました。</p><p>大学生活をより華々しいものにするためにぜひ参考にしてみてください</p><h2>バイトを始めるタイミング</h2><p>大学生活を楽しむのにバイトをすることは大切ですが、バイトを始めて忙しくなり周囲に馴染めなかったなんてことがあっては本末転倒です。<br>そのため新1年生がバイトを始めるタイミングとしては『大学生活に慣れてきた5月、6月がおすすめ』です。</p><p>4月中は大学の授業が始まったりサークルなどの新歓があったりと何かと忙しくなるでしょう。まずは大学で自分のやりたいことをしっかり見つけることが大切です。<br>とはいえ、あまりにもバイトを始めるのが遅いとその間のお金はどうしたらいいんだろうという課題に直面します。またバイトの同僚も大学生活の中でかけがえのない仲間になる存在なので早めに関係性を築くことも重要でしょう。</p><p>大学生活に慣れ始めた入学後1、2ヶ月後を目処に検討してみてください。</p><h2>バイトと学業の両立</h2><p>クラスメイトとの付き合いやサークル活動などイベントを全力で楽しむためには、自由に使えるお金を増やす必要があります。しかしお金を稼ぐためにバイトを増やし、授業や勉強を疎かにしてはいけないのでバイトと学業をうまく両立させることが大切です。<br>先輩たちがどのようなスケジュールでバイトを入れているのかや1週間の予定をうまく組むコツなどを確認していきましょう！</p><p>そもそも大学生はどのくらいの時間バイトしているのでしょうか。<br>文部科学省国立教育研究所の発表によると（※1）大学生の平均的なバイトの時間は週9.3時間です。</p><p>出典元：<br>（※1）文部科学省国立教育研究所<a target="_blank" rel="" href="https://www.nier.go.jp/05_kenkyu_seika/pdf06/gakusei_chousa_gaiyou.pdf">https://www.nier.go.jp/05<u>kenkyu</u>seika/pdf06/gakusei<u>chousa</u>gaiyou.pdf</a></p><p>バイトの種類によっても変わりますが、だいたい1回あたり4〜5時間のシフトを週に2回程度であれば無理のない両立が可能になるでしょう。</p><p>もちろん大学の忙しさやサークルの合宿、テスト期間など大学生活の予定は変動的です。自分の予定と照らし合わせちょっと余裕を持ったスケジュールを組む必要があります。</p><h2>大学1年生におすすめのバイト</h2><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-1920x1080_v-frms_webp_fb4457e0-da5b-46ef-9d77-14c08c26a687.png" alt=""><h3>塾講師</h3><p>塾講師は時給が高く人気のバイトの一つになっています。</p><p>特に大学1年生の場合は自身が受験勉強してきた期間が近くブランクがないため、新鮮な情報を現役受験生に伝えることができるでしょう。<br>また塾講師は生徒の学校の時間に合わせてスケジュールを組む必要があるため、学業との両立が取りやすくなります。</p><p>塾講師に必要なスキルとして生徒との信頼を築く深いコミュニケーションスキルや自身の知識をわかりやすく伝えるプレゼン能力があげられます。<br>この能力は社会に出ても役立つスキルであり、単にお金を稼ぐというだけではなく自分の能力を高める意味合いでも価値のあるバイトになるでしょう。</p><h3>コンビニ</h3><p>コンビニは家や大学の周りにあり、シフトの融通がつきやすいため人気のバイトの1つになっています。</p><p>コンビニは24時間営業であり自分のスケジュールに合わせてシフトを入れることができます。家や大学の周りにもあるため利便性がよく効率よくバイトを行うことが可能です。</p><p>コンビニの仕事内容は多岐に渡り、接客や品出し、受発注、店内清掃など様々です。時間内で多岐にわたる業務をこなすためには、効率や生産性を考える必要があり、これは社会人になっても必須になってくるため身につけておいて損のない能力となるでしょう。</p><h3>飲食店</h3><p>飲食店は自分の好きなことを仕事にしやすく人気のバイトの1つになっています。</p><p>おしゃれなカフェや賑やかな居酒屋、一風変わったコンセプトバーなど自分の好きな世界観で働くことができます。<br>また学生のバイトも多く、大学生活のスタートと同時に価値観の合う仲間を見つけることもできるでしょう。</p><p>飲食店のバイトは接客業務や商品提供、会計管理などの多岐にわたる業務を1日の中でより多くのお客様に提供する必要があります。自分のやるべきことをしっかりと把握した上で考えて動く能力と一人一人のお客様と向き合うコミュニケーション能力をバランスよく鍛えられることでしょう。</p><h3>長期インターン</h3><p>とにかく稼ぎたいやバイトではできない成長を遂げたいと考える人は長期インターンも選択肢の1つです。<br>長期インターンでは企業で社会人と同等に働くことで学生ながらに多くの実務経験を積むことができます。また社会人と同等に働くということはその分お給料にも反映されやすく上限なしに稼ぐことが可能です。</p><p>特に大学1年生から始めることで周りの学生よりも4年間多く実務経験をつめるため就職活動などで圧倒的に有利になります。</p><p>長期インターンを始めるメリットは多々ありますが、それをギュッとしたものをnoteの形でまとめてみたので参考にしてみてください！！<a target="_blank" rel="" href="https://note.com/make_culture/n/nf40ea45b53d5"><u>https://note.com/make_culture/n/nf40ea45b53d5</u></a></p><h2>無理のない快適なバイトライフを送ろう</h2><p>今回は大学1年生に向けたバイトの心得とおすすめバイトについて解説していきました。<br>大学生活を華やかにするためにはお金が必要なことも多く、バイトは遅かれ早かれどこかで始める必要があるかと思います。</p><p>自分のやりたいこととスケジュールを考えた上で学業が疎かにならないようバイトライフを楽しみましょう。<br>もっとバイトについて知りたい方やインターンに少しでも興味を持っている方はお気軽にお問い合わせください。</p>	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/media/covers/1751432426212-1gzmv7.png	published	\N	8808c51e-f25b-468e-afb4-dbf639d72d28	572d3dcc-618e-4767-92ec-fb22011cfb73	2025-07-02 05:00:35.467666+00	2025-07-02 05:00:35.467666+00	\N	942b8705-1794-4341-926e-ac8f0872262d
1ae21267-6ccd-44c7-a099-d0f149404cd1	【副業したい大学生必見！！】大学生だからこそ副業するメリットやおすすめの副業、注意点などを解説	sidejob	副業とアルバイトの違いから大学生だからこそ始めるべき副業メリットやおすすめの副業、副業で気をつけるべき点など解説しています。\nまた副業はメリットだけでなく気をつけるべき点も多いです。賢く安全な副業ライフを楽しむためにも本記事をぜひご一読ください。	\N	<p>今回は、大学生が副業をする際に知っておいた方がいい情報や、副業を検討している大学生向けにおすすめの副業をまとめました。</p><p>お金を稼ぎたい人、バイトでは物足りない人、スキルを身に付けたいと考えている人など、多くの人が副業に興味を持っているはずです。</p><p>副業を賢く始め、安全に収入を得るためにも、今回の記事を参考にしてみてください。</p><h2>副業とアルバイトの違い</h2><p>副業とアルバイトの大きな違いは、働き方の自由度です。副業は雇用契約を結んで組織に所属するのではなく、個人で案件を受けたり、メディアを運営したりと自由に稼ぐことができます。時間や場所に縛られずに働くことができるので、学業の隙間時間やまとまった休みを活用して、パソコン1台でどこからでも稼げるのが魅力の1つです。</p><p>また、報酬が成果主義であることが多く、成果に応じてアルバイトよりも多額の収入を得られる可能性があります。</p><p>一方で、自由度が高く個人で行うため、責任の範囲をきちんと管理する必要があります。メリットやおすすめの副業を確認するとともに、注意点を把握し、賢く安全に収入を得る方法を探しましょう。</p><h2>大学生が副業するメリット</h2><p>副業は大学生のみならず社会人や主婦など多くの人が経験できるものです。そんな中で大学生だからこそ得られる副業のメリットをまとめました。</p><h3>①就職や卒業後の進路で有利になる</h3><p>副業の多くは、バイトとは異なり時給で稼ぐのではなく、自分の能力次第で収入が変わってきます。そのため、副業で身につけた能力が就職活動やその後のキャリアに役立つことが多いでしょう。</p><p>例えば、動画編集の能力を身につければ、企業に就職後、自社のメディア作成やマーケティング活動で即戦力となります。プログラミングの技術を向上させれば、エンジニア人材として就職活動で高く評価されるでしょう。</p><p>また、インスタグラムやTikTokなどは、ユーザーのターゲットが自分と近いため、大学生ならではの知見を活かし、独立や起業の足がかりにすることが可能です。</p><p>将来のキャリアの選択肢を広げ、自身の価値を高めるためにも、単なるアルバイトではなく副業に挑戦することをおすすめします。</p><h3>②好きな時間で働ける</h3><p>副業の大きなメリットの一つに、好きな時間で働けるという点があります。動画編集やライターなどは、ある期間までに成果が出ていれば構いません。せどりやYouTubeなどは、自分で稼働時間を決められます。スケジュールの変動が激しい大学生にとって、自由度の高い副業は魅力的でしょう。</p><p>自分のプライベートに合わせて、隙間時間や余裕のある時間を活用し、賢く収入を得ることができます。</p><h3>③ビズネススキルがつく</h3><p>大学生のうちに副業を経験することで、社会人と同等のビジネススキルを身につけることができます。</p><p>副業に必要なスキルはもちろんのこと、お客様とのやり取りやネットリテラシーなど、社会人になってから身につけるべきスキルを先取りできます。</p><p>一定以上の収入があれば、経理や事務、経営に近いスキルを習得することもできます。友達や知り合いと協力する機会もあれば経営に近いスキルを習得することができ、キャリアの選択肢も増えることでしょう。</p><h3>④大きな収入を得られる可能性がある</h3><p>副業の大きなメリットは、大きな収入を得られる可能性があることです。</p><p>副業はアルバイトと違い、時給が決まっているものばかりではありません。自分の頑張りや成果が収入に直結します。高単価の案件でクライアントの期待に応えれば大きな収入につながり、スキルが上がれば更なる成果を上げられる好循環が生まれるかもしれません。</p><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-1920x1080_v-frms_webp_be2a89e5-523f-450a-a2a3-19330eeb1080.png" alt=""><p></p><h2>おすすめの副業</h2><p>では実際大学生におすすめの副業はどんなものがあるのでしょうか。大学生が活躍でき、あなたも挑戦できる副業をいくつかご紹介します。</p><h3>動画編集者</h3><p>動画編集者は学生におすすめの副業の一つです。YouTubeはもちろん、TikTokやインスタグラムの縦型ショート動画の需要が高まっています。</p><p>特に企業の動画戦略は、メインユーザー層である若者を対象にしていることが多く、大学生ならではの視点が重宝されます。</p><h3>webライター</h3><p>ライター職も大学生を中心に人気になりつつある副業です。webライターは出社やコミュニケーションを必要としないケースも多く、パソコン１台あれば誰でも始められることが魅力です。</p><p>ライターは1本の執筆にあたり一定まとまった時間が必要なため、正社員に任せるのではなく外注している企業も多く、案件の数が多いことも魅力です。<br>また文章作成能力は将来の職業でも役立つため、是非チャレンジしてみてください。</p><h3>プログラマー</h3><p>プログラミングスキルを持つ学生や理系学生には、プログラマー・エンジニアの副業がおすすめです。リモートで期限までに成果を出せば、夜間などを活用して働くことができます。</p><p>日本ではIT開発者の需要が高く、学生時代の経験は就職活動や将来の仕事に大きく役立つでしょう。</p><h3>アフィリエイト</h3><p>自身でブログやサイトを開設し商品の紹介を行うアフィリエイトも大学生に人気の副業です。ブログやサイトの発信力が高ければ商材紹介の効果も高く、1本あたり数万円の利益を産むことも可能です。</p><p>アフィリエイトは文章を書く力やコピーライティングの技術があれば始められる副業で、インターネットの情報やセミナーなどを参考にすればすぐにでも挑戦できます。</p><h3>インスタグラム・Tiktok</h3><p>日頃からSNSを利用している人には、インスタグラムやTikTokで投稿し収益を得る方法もあります。写真や動画で魅力を伝えるのが得意で、ファッションやグルメなどの投稿に適しています。<br>商品紹介や店舗紹介の投稿を続け、集客や販促に繋げることで企業から報酬や商品提供などを得ることができます。</p><p>日常の一部になっているSNSをうまく活用して稼ぐ道を模索することも大学生ならではの副業といえるでしょう。</p><h3>通訳・翻訳</h3><p>外国語を得意としている学生はその言語スキルを活かせる副業として翻訳や通訳が挙げられます。会話能力を活用した通訳の仕事だけでなく、読み書きのスキルを活かした翻訳の仕事も需要が高まっています。</p><p>また医学英語やビジネス英語ができれば、高単価で案件を受注できる可能性があります。言語スキルを維持する良い機会にもなります。</p><h3>せどり・物販</h3><p>せどりや物販は安く仕入れたものを仕入れた価格より高い値段で売り捌くことで利益を出す副業です。一部ではネット転売と揶揄されることもありますが、ルールを守って実施すれば立派な副業です。</p><p>せどりは簡単そうに見えて、中古品の選別や値付けの感覚など、効率よく稼ぐためのスキルが必要です。市場分析などを通じて大きな売上につなげれば、その経験は社会人になっても役立つでしょう。</p><h3>営業代行</h3><p>人手不足の企業では、営業活動を副業の人に外注するケースもあります。難易度が高くなければ、学生でも活躍できる可能性があります。営業代行で任される業務は、主に新規のアポイントメントをテレアポなどで取り、商談に繋げることです。</p><p>営業代行は難易度の高い副業ですが、将来営業職に就きたい人や起業、独立を目指す人は、副業で積んだ経験を直接活かせるためおすすめです。</p><h2>副業を選ぶ上で気をつけるべきポイント</h2><h3>初期費用がかからないものを選ぶ</h3><p>商品購入や入会金など初期費用がかかる副業を始める際は注意が必要です。初期投資をすれば大きな成果が期待できる場合もありますが、収入を得ようと思って始めた副業で損をしてしまっては本末転倒です。</p><p>また、初期費用がかかる副業の中には、詐欺的な無限連鎖講座(ねずみ講)や悪質なマルチ商法が存在します。安全性や初期費用の回収可能性をしっかりと確認する必要があります。</p><h3>安全な副業を選ぶ</h3><p>副業の中には、法律違反に近いものや、気づかないうちに違法な取引や営業に巻き込まれるリスクがあるものも存在します。あくまで大学生という本業を守るため、退学などの事態に陥らないよう注意が必要です。</p><p>特に、契約書なしで口頭のみの約束は避けましょう。儲け話やおいしい話には裏がある可能性があります。必ず契約書の有無を確認し、不利な条件が記載されていないかを確認した上で、副業を始めるようにしましょう。</p><p>インターネットが発達した現代においては、怪しい会社や案件に関する情報は調べれば入手できます。トラブルに巻き込まれないよう、自身で事前に調査を行い自衛はしっかり行うように心がけましょう。</p><h3>学業と両立できる副業を選ぶ</h3><p>楽しい学生生活にはお金がかかりますので、副業で収入を得ることは重要です。しかし、副業に夢中になり過ぎて学業が疎かになってはいけません。副業を始める際は、学業と両立できるものを選ぶよう心がけましょう。</p><p>学業と両立するためには、自分のスケジュールをしっかり把握し、無理のない範囲で副業を組み込むことが肝心です。過度に副業に時間を割き過ぎないよう気をつける必要があります。</p><h3>正当な報酬か見極める</h3><p>副業の魅力は、隙間時間を活用できる柔軟性にあります。しかし一方で、仕事の内容に見合わない報酬設定の副業も多く、見極める必要があります。</p><p>特に大学生は求職者として弱い立場にあるため、時給換算で極端に安い報酬を押し付けられるケースもあります。<br>報酬が妥当かどうかを冷静に判断し、納得のいかない水準であれば断る勇気が必要になります。</p><h2>賢く安全に副業を楽しもう</h2><p>副業には多くのメリットがありますが、情報を入念に調べ、適切に管理しなければ、トラブルに巻き込まれたり損失が生じるリスクもあります。<br>今回の記事を参考にすれば、収入を得るだけでなく、スキルや経験を積み上げることができ、将来のキャリアに役立つ大きなチャンスとなります。賢明かつ安全に副業に取り組み、有意義な副業ライフを送りましょう。</p>	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/media/covers/1751008419521-ygoom2.png	published	2025-06-27 11:47:27.490483+00	8808c51e-f25b-468e-afb4-dbf639d72d28	74114e4f-9f4c-45ff-af96-6a1e26668ef0	2025-06-27 07:13:54.339026+00	2025-06-27 11:58:08.37+00	\N	6a1895cb-ab56-4f8e-ace3-3b14e1f70e11
738314cc-1463-428b-a382-6015fbfe93eb	【大学2年生向け】2年生からインターンを始め周りを一歩リードしよう！	intern	【大学2年生必見】インターン参加のメリットや選び方を現役学生が解説！自分に合ったインターンの見つけ方や注意点も紹介。周りに差をつけるチャンスを掴むために、長期インターンがおすすめな理由とは？キャリアアップを目指す大学2年生に役立つ情報が満載です。	\N	<p>今回は、大学2年生の皆さんに向けて、インターンに参加するメリットやインターンの種類、大学2年生だからこそおすすめするインターンについて解説しています。</p><p>就職活動について気になり出した方や大学2年生のうちに何か新しい挑戦をしたい方など、多くの人の役に立つ情報を解説しておりますので、ぜひ最後までご一読ください！</p><h2>大学2年生はインターンシップに参加できるのか</h2><p>インターンシップは、主に就職活動中の学生が参加する大学3年生向けのイベントのイメージが強い学生も多いでしょう。しかしながら、インターンといっても複数の種類があり、企業の開催方針や目的によっては大学2年生でも参加が可能です。</p><p>また、就職活動が早期化している中で、企業としてもインターンの機会をより多くの学生に提供するために準備しており、大学2年生のインターン参加のハードルは下がってきています。就職活動に忙しくなる前の大学2年生だからこそ、スケジュールに余裕を持って参加できることも魅力の一つといえます。</p><img src="https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/media/inline-images/4z3lfpcwrgm.png"><h2>大学2年生が参加できるインターンの種類</h2><p>インターンと一口に言っても様々な種類があり、開催の目的は異なります。まずはインターンにはどんな種類があるのかとそれぞれの開催目的やメリットを解説していきます。</p><h3>1dayインターン</h3><p>1dayインターンは、その名の通り1日かけて開催されるインターンです。主に就職活動や企業説明会の一環で開催され、企業の雰囲気や業務内容を体感できることが魅力です。採用ページやホームページではよくわからない企業のリアルを知ることで、自身のキャリアや就職活動の参考にすることができるでしょう。</p><p>1日で完結するため、複数企業のインターンに参加することが可能で、企業理解を深めるとともに比較することができるのもメリットといえます。</p><h3>短期インターン</h3><p>短期インターンは、2日〜2週間をかけて開催されるインターンです。1dayインターン同様、企業の雰囲気や業務内容を理解する目的に加え、グループワークや実践的な業務の体験を通してビジネスを追体験できることが魅力です。</p><p>開催企業によっては、事業開発やサービス開発などのビジネスの0→1や、市場調査や分析などのコンサルに近い業務を体験できるため成長の機会としても注目されています。</p><p>また、短期インターンは就職活動の選考の中で開催され、インターンの成果や取り組みの姿勢を担当者にアピールできれば、採用につながる可能性も高まります。</p><h3>長期インターン</h3><p>長期インターンは、数ヶ月〜数年単位で実施するインターンです。1日や短期インターンとは明確に目的が異なり、大学2年生も積極的に募集しています。</p><p>長期のインターンは、まとまった期間を通じて実際の業務を行うインターンであり、ビジネスを深くまで体験できることが魅力です。実際に社会人とほぼ同等の業務を経験することで、自身のキャリアや職種などの適正やマッチ度を確かめることができるでしょう。</p><p>また、お給料がしっかりと支給される会社も多いことも特徴の一つです。学生時代に経験しておくことで大きな成長を実感できるでしょう。期間が長いため学業との両立には気を配らなければいけません。</p><p></p><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-1920x1080_v-frms_webp_c65dd4b5-3495-4355-8cdc-de72d2d2723b.png" alt=""><h2>大学2年生だからこそインターンに参加するメリット</h2><h3>自分に適性のある仕事を見極めることができる</h3><p>大学2年生のうちにインターンに参加することで、自分に適性のある仕事は何かを見極めることができます。インターンを通して明確に自分に合わないなと感じることができれば、就職活動やファーストキャリアでのミスマッチを減らすことができます。</p><p>自分が今やりたいと考える仕事があっても、それがほんとに自分に向いているのかはわかりません。就職してから違うなと感じたとしても辞めるのは勇気のいることでしょう。</p><p>最悪のケースを避けるためにも、インターンは良い判断材料になるのです。</p><h3>就活生や他の学生の価値観を知れる</h3><p>インターンに参加することで、学校外の繋がりを作ることができます。大学2年生からインターンに参加している学生は、就活やビジネスへの感度が高い傾向にあります。多様な価値観や考え方を知ることはいい刺激になるでしょう。</p><p>また、インターンでできた繋がりを活用し、一緒に就活したり他のインターンの情報を共有したりと良い関係を築くことができるのも魅力の一つです。</p><h3>ビジネスマナーを学べる</h3><p>就活やファーストキャリアでよくある失敗の中には、ビジネスマナーを知っておけば回避できることもあります。特に大学2年生は、就活を目前に控えている中で最低限のビジネスマナーを知っておくことで、選考でのもったいない失敗を避けることができるでしょう。</p><p>就活が始まってしまうと、選考対策や企業分析など何かと忙しくなります。多少余裕のある大学2年生の時期にビジネスマナーを学習しておくと良いでしょう。</p><h3>職場や社会のリアルな雰囲気をしれる</h3><p>インターンでは、会社や社員さんの雰囲気を直に味わうことができます。職場の雰囲気は、採用ページやホームページをみてもなかなか理解できません。ネットの情報を信じて入社してみたものの、実際働いてみると雰囲気や業務内容が全然違うケースもあります。入社前に会社のリアルを知っておくことは大切です。</p><h3>早期内定につながる</h3><p>開催企業によっては、インターンを採用活動の一環として捉えており、インターン参加者限定で早期の選考会へ招待される可能性もあります。インターンは学生にとってメリットの多い取り組みです。また、企業としてもミスマッチを早期に判断でき、安心して採用する目的として有効な手段になっています。</p><p>大学2年生のうちにインターンに参加し評価され早期選考に進むことができれば、大学3年生の春、夏あたりで内定を取ることも可能です。</p><p></p><h2>大学2年生こそ長期インターンがおすすめ</h2><p>ここまでインターンの種類やメリットについて解説してきました。様々な種類や目的、メリットがある中で、特に大学2年生の皆さんには長期インターンがおすすめです。前述したメリットをしっかりと感じるためにも、大学2年生という比較的時間的な余裕もあるうちに、短期間ではなく長期間のインターンに参加すると良いでしょう。</p><p>就活も新卒採用も一生に一度の貴重なイベントです。ビジネスや自分自身について何もわからない状態で挑戦することはリスクが高く、長期インターンを通して仕事のイメージをしっかりと持った状態で望むことが大切です。</p><p>また、3ヶ月以上の長期インターンを経験している学生の割合は3.0%と少なく、長期インターンを経験している学生は貴重です。そのため就活において大きなアドバンテージを得ることができます。自分のキャリアをミスマッチなく最大限充実したものにするためにも、大学生のうちに長期インターンを経験しておくことは大切です。</p><h2>インターンの選び方のコツ</h2><h3>学業と両立できるインターンを選ぶ</h3><p>特に長期インターンを考えている大学2年生は、学業と両立可能かをしっかりと考えて選ぶ必要があります。インターンを頑張った結果、学業が疎かになってしまっては元も子もありません。学生の本業はあくまで学業のため、学業が疎かにならない範囲でインターンに参加しましょう。</p><p>学業との両立を実現するためには、自分が1週間でどのくらいの時間を学業以外に使えるかを把握する必要があります。しっかりとスケジュールを立てた上で、無理のないインターンに応募しましょう。</p><h3>内容が充実したインターンを選ぶ</h3><p>インターンといっても、開催企業によってコンテンツの内容や目的は異なります。大学2年生で就活まで猶予があるからこそ短期のインターンのみではなく内容が充実したインターンに行くことをおすすめします。グループワークなどを通して新規事業や競合分析など内容が充実しているインターンに行くことで、成長を実感することもできるでしょう。</p><p>またインターンを通して自分に足りない能力を把握することやビジネスとは何かを知ることで、周りの学生に比べ就職活動やキャリア選択を有利に進めることができます。大学2年生という時間的な余裕を最大限活かすためにも、短期のインターンだけでなく内容が充実したインターンを経験することがおすすめです。</p><h3>自分の興味ある業界や職種を選ぶ</h3><p>インターンをせっかくやるなら、興味のある業界や職種を選ぶと良いでしょう。自分の興味と相性のマッチ度を測ることができるだけでなく、業界内で複数の企業に参加すれば、企業の比較をすることもできます。</p><p>また、興味のある業界や職種のインターンで実績を残せば、その実績を基に就職活動で優位に立ち回ることができるでしょう。</p><h2>大学2年生がインターンに参加する際の注意点</h2><p>大学2年生の時間を有意義なものにするためにも、インターンに参加する際の注意点は把握しておく必要があります。</p><h3>学業との両立を考える</h3><p>インターンを頑張りすぎた結果、学業をおろそかにしてしまっては意味がありません。就職活動のために始めたインターンによって単位を落とし、卒業ができなくなってしまっては本末転倒です。</p><p>大学2年生ともなると、必修の授業を受講しながら就職活動に余裕を持って取り組むために単位を先取りするなど何かと忙しくなります。インターンと学業との両立を意識した上で、スケジュール管理をしっかり行うことが大切です。</p><h3>広く業界や職種を見てみる</h3><p>自分の興味のある業界や職種にチャレンジすることも大切ですが、インターンを探す際には広く業界や職種を見てみると良いでしょう。実際にインターンに参加しなくとも、世の中にどんな職種や業界があるかを知ることは大切です。</p><p>また、興味のある業界や職種が決まっていない人は尚更広く見てみることをおすすめします。キャリアを選択する上で、多くの知識や経験があることは大きなメリットになります。</p><h3>目的意識を持つ</h3><p>インターンに参加する際には、きちんと目的意識を持つようにすることが大切です。目的もなしにインターンに参加すると、学べるものは少なくなります。また企業から良くない評価を受け、その後の選考に悪影響を及ぼす事もあります。インターンで何を学ぶのかを明確にした上で、インターンに参加することが大切です。インターンに参加することが目的とならないよう心がけましょう。</p><h3>大学2年生からインターンに参加し周りに差をつけろ</h3><p>大学2年生からインターンを始めることで、周囲に対して大きなアドバンテージを得ることができます。また、長期インターンなどを始め、直接キャリアにつながることもあるでしょう。インターンとの付き合い方や注意点をよく理解した上で、インターンにチャレンジしてみてください。</p><iframe data-htmlpreview="true" width="100%" height="400" srcdoc="<!DOCTYPE html>\n<html lang=&quot;ja&quot;>\n<head>\n<meta charset=&quot;UTF-8&quot; />\n<meta name=&quot;viewport&quot; content=&quot;width=device-width,initial-scale=1&quot; />\n<title>学生転職 CV ボタン</title>\n<style>\n  /* 共通リセット */\n  *,*::before,*::after{box-sizing:border-box;}\n  body{\n    margin:0;padding:20px;font-family:-apple-system,BlinkMacSystemFont,&quot;Helvetica Neue&quot;,Arial,sans-serif;\n    background:#fff;display:flex;justify-content:center;min-height:100vh;\n  }\n\n  /* カード本体 */\n  .cv-card{\n    display:flex;align-items:stretch;\n    width:100%;max-width:840px;          /* ← ここを少し小さく */\n    background:#fff;border-radius:12px;overflow:hidden;\n    box-shadow:0 6px 18px rgba(0,0,0,.08);\n    transition:transform .25s;\n  }\n  .cv-card:hover{transform:translateY(-2px);}\n\n  /* 画像 */\n  .cv-image{flex:0 0 35%;min-width:260px;aspect-ratio:16/9;} /* ← 35% に調整 */\n  .cv-image img{width:100%;height:100%;object-fit:cover;display:block;}\n\n  /* テキスト */\n  .cv-content{\n    flex:1 1 auto;padding:28px 32px;display:flex;flex-direction:column;gap:16px;\n    justify-content:center;\n  }\n  .cv-title{font-size:clamp(22px,2.2vw,28px);font-weight:700;}\n  .cv-description{font-size:clamp(14px,1.4vw,16px);line-height:1.7;color:#555;}\n\n  /* ボタン */\n  .cv-button{\n    align-self:flex-start;background:#007aff;color:#fff;font-size:15px;font-weight:700;\n    padding:10px 24px;border-radius:6px;text-decoration:none;\n    box-shadow:0 3px 8px rgba(0,0,0,.15);transition:background .3s,transform .2s;\n  }\n  .cv-button:hover{background:#0064d0;transform:translateY(-1px);}\n  .cv-button:active{background:#0054b2;transform:none;}\n\n  /* 768px 以下（タブレット） */\n  @media(max-width:768px){\n    .cv-image{flex:0 0 50%;}           /* 画像比率アップでバランス調整 */\n    .cv-content{padding:24px;}\n  }\n\n  /* 600px 以下（スマホ） */\n  @media(max-width:600px){\n    .cv-card{flex-direction:column;}\n    .cv-image{flex:none;width:100%;}\n    .cv-content{padding:18px 16px;}\n    .cv-button{width:100%;text-align:center;font-size:14px;padding:12px 0;}\n  }\n</style>\n</head>\n<body>\n  <div class=&quot;cv-card&quot;>\n    <div class=&quot;cv-image&quot;>\n      <!-- 画像パスは環境に合わせて修正。例: /cv.png か /images/cv.png -->\n      <img src=&quot;/cv.png&quot; alt=&quot;学生転職イメージ&quot;>\n    </div>\n\n    <div class=&quot;cv-content&quot;>\n      <h2 class=&quot;cv-title&quot;>唯一無二の就活を</h2>\n      <p class=&quot;cv-description&quot;>\n        新卒から新規事業や経営企画直結の特別オファーが届く。<br>\n        職歴にオファーが届くから、ひとりひとりが主人公になれる。\n      </p>\n      <a href=&quot;https://culture.gakuten.co.jp/&quot;\n         class=&quot;cv-button&quot; target=&quot;_blank&quot; rel=&quot;noopener noreferrer&quot;>\n        学生転職でオファーを受け取る\n      </a>\n    </div>\n  </div>\n</body>\n</html>" sandbox="allow-scripts allow-same-origin" frameborder="0"></iframe><p></p><p></p><p></p>	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/media/covers/1751107561193-5kihxe.png	published	\N	8808c51e-f25b-468e-afb4-dbf639d72d28	74114e4f-9f4c-45ff-af96-6a1e26668ef0	2025-06-28 10:46:05.811061+00	2025-06-28 10:46:20.89+00	\N	2c6a4ffd-dfbe-4afe-b1f4-58c2ae1e45bf
91773f8e-9184-4d33-aadc-8dbfec4efc0b	【27卒学生必見！】インターン経験を活かした最強のガクチカを作ろう！	27卒学生必見-インターン経験を活かした最強のガクチカを作ろう	この記事では、長期インターンシップ経験を就活のガクチカとして伝えるメリットや、そのポイントについて解説しています。この記事を読むことで、長期インターンシップ経験者がガクチカをESや面接で伝えるときのポイントを理解することができます。	\N	<p><strong>就職活動は人生の大半を占める社会人のスタートを決める重要なイベントです。<br>就職活動をより良いものにするためにはガクチカは必要不可欠ですよね。</strong></p><p><strong>今回は特にインターンを経験してきた27卒の学生に向けてインターンの経験を活かして最強のガクチカを創り上げるためのコツや方法を解説していきます。</strong></p><p><strong>インターンをしていない27卒の学生や早めに情報収集をしたい28卒、29卒の方も参考になるようなガクチカ作成のコツなども記載しています。<br>﻿この記事を参考に、就職活動の素晴らしいスタートを切りましょう。</strong></p><img src="https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/media/inline-images/vpr8w16r9nj.svg"><h2><strong>ガクチカとして長期インターンシップが効果的な理由</strong></h2><p>就活生のなかには、ガクチカとして長期インターンシップ経験を伝えようとしているヒトが多いのではないでしょうか。</p><p>「長期インターンシップは何ヶ月以上から？」<br>「どのようにアピールすればいいの？」</p><p>このようなお悩みを持っている就活生もいるはずです。</p><p>この記事では、長期インターンシップ経験を伝えるメリットやポイントについて解説します。長期インターンシップ経験は培ったスキルや経験を業務に活かしやすかったり、主体性や向上心があると思われやすいです。この記事を参考に、ぜひガクチカとして伝えてみましょう。</p><p></p><h2><strong>ガクチカとしてアピールできる期間の目安</strong></h2><p>長期インターンシップ経験をガクチカにする場合、期間に気をつける必要があります。自分が経験した長期インターンシップの期間について、振り返ってみてください。</p><h3>3ヶ月以上のインターンシップ経験が理想</h3><p>長期インターンシップ経験をガクチカとしてアピールする場合は、3ヶ月以上の期間が理想です。理由としては、期間がより長い経験のほうが、そのヒトの人柄が表れやすいからです。</p><p>採用担当者も、長期インターンシップ経験に取り組む姿勢や、経験から得た学びを読みとりやすいでしょう。</p><p>そのため、目安として3ヶ月以上の長期インターンシップ経験が、ガクチカのエピソードとしては望ましいです。</p><h3>1ヶ月以内のインターンシップ経験は注意が必要</h3><p>3ヶ月以上の経験が良いとは記載しましたが、1週間や1ヶ月のインターンシップだとしても、ガクチカにできないわけではありません。ただし、「自分の人柄が表れているかどうか」には注意が必要です。短期間であればあるほど、そのヒトらしさは表れにくくなってしまいます。</p><p>その場合は無理に長期インターンシップ経験をガクチカにせず、別のエピソードを探すことも大事でしょう。</p><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-2121x1414_v-frms_webp_c0ec8872-27cf-42d2-a167-7e3a7e917cf5.jpg" alt=""><h2><strong>ガクチカで長期インターンシップを話すメリット3選</strong></h2><p>長期インターンシップ経験はガクチカとして非常に魅力的です。他のアルバイトやゼミといった活動に比べて、入社後の活躍イメージを持ちやすいと思います。</p><p>下記3つが長期インターンシップ経験を伝えるメリットを読んで、本当に伝えるべきか確認してみてください。</p><h3>実際の業務経験をアピールできる</h3><p>社会人として業務に携わった経験は、他のエピソードと比べて稀有な経験だと言えるでしょう。社会人としてのコミュニケーションや、業務の進め方について理解がある学生は、他の学生と差別化できます。</p><h3>入社後の活躍をイメージしやすい</h3><p>長期インターンシップ先での業務で培った強みは、入社後に発揮されるイメージがしやすいです。アルバイトやゼミなどのエピソードであれば、具体的な経験から抽象化して強みをイメージする必要があります。</p><p>一方、長期インターンシップ経験の場合は業務に直結していることが多く、業務に活かされる具体的な強みとして成り立つ傾向があります。そのため、入社後に強みが発揮されることをイメージしてもらいやすいことが特徴です。</p><h3>志望業界や志望企業に説得力が生まれる</h3><p>志望業界と同じ業界で働いていた場合は、その業界を志望する理由をつくりやすいです。その仕事で感じたやりがいなどを効果的に伝えることができれば、企業にも熱意が伝わりやすいでしょう。</p><p>採用担当者からすると、入社後のミスマッチも防ぎやすいため、志望度という観点からしてもアピール材料になります。</p><p></p><h2><strong>長期インターンシップをESや面接で伝える際のポイント</strong></h2><p>魅力的な長期インターンシップ経験ですが、効果的に伝えなければ評価されないリスクもあります。ガクチカとして効果的にアピールするために、下記3つのポイントを解説します。</p><h3>経験の内容よりも、思考・行動・学びを伝える</h3><p>長期インターンシップ経験といっても、内容だけで評価されるわけではありません。誰しもがしている経験ではないため、伝え方には気をつけるべきです。</p><p>大事なのは、その経験のなかで「何を考えて」「どんな行動をして」「何を学んだのか」です。せっかくいいエピソードを持っているのであれば、その利点を最大限に活かしましょう。構成などのより詳しい伝え方については、後ほど解説する構成部分なども参考にしてみてください。</p><h3>比較できる具体的な数値を伝える</h3><p>長期インターンシップ経験の「すごさ」を伝えるためには、比較できる数値が必要です。目標や結果を伝えるときは、その環境でどれだけの基準や成果だったのか伝わるように、数値を入れることも意識しましょう。</p><p>比較できる数値を入れることで、自分が実行した行動の価値を採用担当者に伝えることができます。</p><h3>誰でも理解できるように噛み砕いて伝える</h3><p>コミュニケーションにおいて大事なことですが、自分が理解していても、相手に伝わらなければ評価されません。携わった業務の内容を理解してもらえるように、誰にでも状況が伝わるような、分かりやすいコトバで表現することが大事です。</p><p>無理に専門用語などの難しいコトバを使わず、簡単なコトバを使いながら、共通認識を持てるように心がけましょう。</p><p></p><h2><strong>長期インターンシップ経験のガクチカ例文</strong></h2><p>前述した長期インターンシップ経験を伝えるポイントを意識しながら、ガクチカの例文を紹介します。構成やエピソードの書き方を参考にしてみてください。</p><h3>営業における長期インターンシップの例文【400字以内】</h3><p>私は大学2年生の夏から1年間、営業職の長期インターンシップを経験し、新規顧客の獲得に力を入れました。当初は訪問販売や電話営業を通して、月に5件の契約獲得を目標にしていました。しかし、最初の1ヶ月は1件しか獲得できず、目標未達成に対する責任感から悔しさを感じました。そこで、会社で結果を出している上司にアドバイスを求めた結果、「想定外の質問をされたときに上手く答えられないこと」が課題だと気づきました。対策として、「顧客ごとに想定質問集を作成して顧客理解を深める」「自社商品を実際に購入・使用して商品理解を深める」の2つを行いました。その結果、3ヶ月目で月6件の契約獲得を達成しました。さらに、想定質問集を社内に共有することで、チームとして平均2件の契約獲得数増加に貢献しました。この経験から、困難な状況下で仲間に頼ることの大切さと、仲間と一緒にチームとして結果を出すことの大切さを学びました。</p><h3>マーケティングにおける長期インターンシップの例文【400字以内】</h3><p>私は大学3年生の春から半年間、SNSマーケティング職の長期インターンシップを経験し、雑貨（商材）のTikTok運用に力を入れました。介入前は一方的な商品紹介となっており、再生数に伸び悩んでいました。そこで、伸びている雑貨紹介系の競合アカウントを調査しました。比較すると、ユーザーが楽しめる内容になっていると気づき、2つの改善を行いました。1つ目は、商品購入後のイメージを想起させる投稿内容に変更しました。「学校で人気者になれる雑貨」というコンセプトを確立し、実際に学校で楽しめるおもしろい遊び方を考案してコンテンツを作成しました。2つ目は、ストーリー性を取りいれました。冒頭を「変な雑貨みつけたんだけど...」にするなど、雑貨を紹介することに違和感がない構成を意識しました。その結果、1ヶ月で1動画平均5万回再生され、フォロワーも100人から1,000人まで増やすことができました。</p><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-1920x1440_v-frms_webp_c9993e36-8f68-420a-8238-ade4b9764744.jpg" alt=""><h2><strong>長期インターンシップ経験を伝えるおすすめ構成</strong></h2><p>長期インターンシップ経験を伝えるときは、下記の構成で記載することをおすすめします。しかし、文字数の関係上からすべての項目を記載する必要はありません。自分の人柄が伝わるように構成してみてください。</p><h3>結論</h3><p>何に力を入れたのか、端的に伝えましょう。内容が抽象的になりすぎないよう、具体的にどんな業務に力を入れたのか振り返ってみてください。</p><p>【例】<br>私は大学2年生の夏から1年間、営業職の長期インターンシップを経験し、新規顧客の獲得に力を入れました。</p><h3>現状 / 目標</h3><p>長期インターンシップを経験したときに、当時はどんな状況だったのか。そして、どんな目標を掲げていたのか記載しましょう。目標が社内でなかった場合は、自分のなかで目標としていたことを考えてみてください。</p><p>主体的に目標設定を行うことで、責任感や自走力をアピールすることができます。</p><p>【例】<br>当初は訪問販売や電話営業を通して、月に5件の契約獲得を目標にしていました。</p><h3>動機</h3><p>長期インターンシップ経験の過程で、頑張ることができた動機を記載しましょう。自分の中でどんなことがモチベーションの源泉になっていたのか考えてみてください。</p><p>頑張れた理由を伝えることで、自分の人柄を表現することができます。</p><p>【例】<br>目標を達成して会社やチームメンバーに報いたいという想いから、努力を続けることができました。</p><h3>課題</h3><p>目標を達成しようとする過程で、直面した課題を記載しましょう。どんなことに課題を感じていたのか考えてみてください。</p><p>課題を伝えることで、課題を発見する力を評価されやすくなります。</p><p>【例】<br>会社で結果を出している上司にアドバイスを求めた結果、「想定外の質問をされたときに上手く答えられないこと」が課題だと気づきました。</p><h3>施策</h3><p>直面した課題から、実際に対処した行動について記載しましょう。当時、課題に対してどんな行動（施策）を実行したのか考えてみてください。</p><p>行動（施策）を伝えることで、どんな強みがあるのか理解されやすくなります。</p><p>【例】<br>対策として、「顧客ごとに想定質問集を作成して顧客理解を深める」「自社商品を実際に購入・使用して商品理解を深める」の2つを行いました。</p><h3>結果</h3><p>課題や施策を通して、どんな結果につながったのか記載しましょう。具体的な数値を入れながら、比較しやすい表現でどんな結果だったのか考えてみてください。</p><p>結果を伝えることで、実行した行動にどれほどの価値があったのか理解されやすくなります。</p><p>【例】<br>その結果、3ヶ月目で月6件の契約獲得を達成しました。</p><h3>学んだこと</h3><p>最後に、経験を通して学んだことを記載しましょう。経験から何を考え、改善したのか考えてみてください。</p><p>学んだことを伝えることで、入社後の活躍をイメージさせることができます。</p><p>【例】<br>この経験から、困難な状況下で仲間に頼ることの大切さと、仲間と一緒にチームとして結果を出すことの大切さを学びました。</p><h2><strong>長期インターンシップ経験をより活かせるキャリア</strong></h2><p>このように、長期インターンシップ経験は具体的な強みやスキルに結びつきやすく、入社後の活躍が期待できる魅力的な経験です。長期インターンシップ経験の活かし方について、より深く考えてみましょう。</p><h3>長期インターンシップ経験をより活かすには？</h3><p>アメリカなどでは「ジョブ型採用」が日本と比べて進んでいます。ジョブ型採用とは、企業が用意した職務（ジョブ）に適したスキルや経験を持つヒトを採用する雇用形態です。</p><p>ジョブ型採用では、職務や役割に照らして発揮された成果にもとづいて評価を行う点が特徴です。また、遂行される仕事の価値に対して賃金を支払う考え方で、ポジションに対して報酬が設定されています。</p><p>長期インターンシップ経験でスキルや経験を積み重ねた学生は、ジョブ型採用に適していると言えるでしょう。</p><h2>他に負けない最強のガクチカを作る</h2><p>今回は、長期インターンシップ経験をガクチカとして伝えるメリットやポイントについて解説しました。他のエピソードと比べても入社後の活躍がイメージしやすいため、ぜひガクチカとして伝えてみてください。</p>	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/media/covers/1751432611132-npe9t9.png	published	\N	8808c51e-f25b-468e-afb4-dbf639d72d28	74114e4f-9f4c-45ff-af96-6a1e26668ef0	2025-07-02 05:06:03.661532+00	2025-07-02 05:06:03.661532+00	\N	8ca58c84-b78e-4d85-ae7f-bacc286530d7
c5c9035e-af7f-4cfe-886b-b320d4aea64d	【就活生必見】就活がつらいと感じる原因は？効果的な対処法を紹介	syuukatuturai	就活生がなぜ就活をつらいと感じるかの原因をあげ、その上でどのように解決すべきなのか効果的な対処法を紹介します。	\N	<p>就活のつらさを解消するには、自分が「どうしてつらいと感じているか」の原因を把握することが大切です。つらさの原因を明確にして、効果的に解決していく必要があります。</p><p>ここではよくあるつらさの原因を紹介するので自分に当てはまっていないか確認してみてください。</p><h2>就活がつらい理由５選</h2><p>就職活動がつらいと感じる原因はいくつか考えられます。<br>解決策を考える上でまずは自分がなぜ就活がつらいと感じているかを明確にしておくと良いでしょう。</p><h3>①プレッシャーの大きさ</h3><p>就活は将来を決める大きな選択です。そのため、家族や周囲からの期待もあり、多くの学生が「失敗したらどうしよう」というプレッシャーに押しつぶされそうになります。</p><p>特に初めての就活では、何をどうすればよいのか分からないことも多く、焦りや不安が募ります。</p><h3>②志望業界や企業が見つからない</h3><p>やりたいことが見つからず、どのような業界や企業を受けるべきかわからないという悩みも就活がつらくなる大きな要因の一つです。</p><p>多くの企業があり、かつたくさんの情報であふれる現代において、受けるべき企業がわからず疲れてしまい、つらい気持ちになります。</p><h3>③他人との比較</h3><p>友人や同期が内定をもらうと、自分と比較してしまいがちです。「あの人はもう内定をもらっているのに、自分はまだ…」という思いが自己評価を下げ、自信をなくす原因となります。</p><h3>④書類選考や面接の準備</h3><p>何をどこから始めれば良いのかわからない、やることが多すぎるなど、慣れない就活の準備に追われることでつらいと感じている方もいるでしょう。</p><p>自己分析や興味のある業界の洗い出し、説明会の参加、エントリーシートの作成、面接練習、スーツの準備など、就活ではやることが膨大です。学校生活と並行しながらこの忙しいスケジュールをこなすとなると、疲れてしまうのは無理もありません。</p><h3>⑤不採用へのつらさ</h3><p>エントリーシート作成や面接準備に多大な時間と労力を要したのに、不採用通知を受けると精神的なダメージも大きくなります。不採用が続くと自分を否定されているように感じたり、就職できるのか不安になったりすることも多いです。</p><img src="https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/media/inline-images/3weetlatw1l.svg"><h2>就活がつらい時の対処法</h2><p>就活がつらいなと感じる瞬間は誰にでも訪れます。そのつらさを抱え込まずに良い就活を送るためにも就活がつらいと感じる状況に合わせた対処法をそれぞれ解説していきます。</p><h3>プレッシャーを感じてしまうときの対処</h3><p>周囲の期待を感じてつらいと感じてしまう場合は、人の声を気にせず最終的に自分が納得できるのかを考えてみましょう。</p><p>自分がどのような環境でどのように働き、どのような人生を過ごしていきたいかを明確にすることで、周囲の期待を気にせず、自分のしたいことを優先して考えることができます。自分のやりたいことを明確にできると、たとえ周りの友人が有名企業や大企業への内定が決まっていても「自分はこの会社でやっていくんだ」という強い意志と自信をもつことができます。</p><p>また、就活をはじめると「企業に入社すること」がゴールになりがちですが、重要なのは「入社する会社で何をするか」です。「自分のやりたいことができるか」「なりたい将来の姿を思い描けるか」を意識し、就活を続けることで自分が納得のできる選択をすると良いでしょう。</p><h3>他人と比較してしまうときの対処</h3><p>周囲が内定を獲得しているからといって、焦る必要はありません。内定はゴールではなく単なる通過点です。仮に内定を得て就職したとしても、自分に合わない企業であれば続けることが難しく、苦しむことになるでしょう。</p><p>重要なのは自分に合った企業で活躍することです。周囲に惑わされず、自分の価値観や希望、そして「就活の軸」を再認識することが大切です。</p><h3>不採用が続くときの対処</h3><p>不採用が続いていると、自分を否定されているように感じたり、就職できないのではないかと焦りを感じたりする方もいるかもしれません。不採用が続く根本的な要因としては主に下記の2点が考えられます。<br>①選んだ企業と自分との適性があっていない<br>②企業に自分を十分にアピールできていない</p><p>そしてこれらの要因にアプローチするためには、特に下記の3つのポイントが有効です。<br>①自己分析から見直す<br>②業界･企業分析を徹底する<br>③選考対策を徹底する</p><p>選んだ企業と自分との適性があまりない場合、自己分析の段階で自分を正しく把握できていない可能性があります。</p><p>企業が就活生を採用する際には、その学生が優秀かどうかだけでなく、その企業で率先して働く意欲や、長く働いてくれるかどうかも重要な判断基準です。<br>理想や自分の考え方、傾向を明確にしたうえで企業選びをしなければ、本当に合った企業に応募することは難しくなり、不採用につながってしまいます。<br>そのため、自己分析が不足していると感じる方は、家族や友人に手伝ってもらいながら他己分析も行うと良いでしょう。</p><p>また、業界・企業研究も徹底し、自己分析の結果と照らし合わせて、自分とマッチする企業に絞って応募するのが得策です。<br>その上で、各企業に合った志望動機や自己PRを考えれば、自然と採用に結びつくでしょう。</p><p></p><h3>書類選考や面接の準備がつらいときの対処</h3><p>就活準備をしていて「面倒くさい」、「やりたくない」と思ってしまうときはなぜ就活準備をするのかという目的部分を、その重要性と共に把握できていないことが原因として考えられます。</p><p>志望動機を入念に練るか否かで書類選考の通過率は変わりますし、面接での受け答えをしっかり練習してから臨むのとぶっつけ本番で臨むのとでは、面接時の印象が各段に変わります。就活準備の重要性を理解すると、ただ漠然と面倒な作業をしているという感覚だったところから「この価値を得るために準備している」という明確な目的意識を持てるようになるため、まずはここをクリアすることが大切です。</p><p>また、何を始めれば良いのかわからないという方は、自分がやるべきことの「全体像」と「ゴール」が見えていないことから、漠然とした不安を感じている可能性が高いです。</p><p>「なぜ就活準備が必要なのか」を理解することで、今必要なことと最終的に何へ向かって頑張れば良いのかが明確になるため、「なんだ、意外とこんなものか。思ったよりもしんどくなさそう」とつらさが軽減するかもしれません。ただ、就活準備でやらなければならないことはたくさんあるため、全てに全力投球し過ぎると心身共にもたないでしょう。</p><p></p><h2>就活がつらい時は適度に休む</h2><p>書類選考の締め切りや1日に複数の面接の予定が入るなど就活は忙しくなりがちです。しかし、ずっと就活のことを考えていると、視野が狭くなり深く悩んでしまいどんどんネガティブな気持ちになってしまいます。</p><p>そこで、適度に休息を取ることがおすすめです。就活対策ばかりでなく、昼寝をしたり、音楽を聞いたり、スポーツをしたり、散歩してみたりすることで良い気分転換になるでしょう。</p><p>また、上記のような行動は脳の動きを活性化させるとも言われています。長い時間連続で作業をするよりも、面接での良い回答内容が思い浮かびやすく記憶も定着しやすい傾向にあります。適度な休息が就活を勝ち抜くための大きな要因になることでしょう。</p><p></p><h2>就活は自分を褒めながら一歩ずつ</h2><p>就活では初めての経験が多く、今後の人生を決めるというプレッシャーのあるイベントです。そのためつらいと感じることもたくさんあると思いますが、まずはその感情を受け入れ、ここまで頑張った自分をほめながら少しずつ前に進んでいきましょう。本記事の対処法を参考にして、少しでも前向きな一歩を踏み出せるよう、心から応援しています。</p>	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/media/covers/1751433107799-86bouz.webp	published	\N	8808c51e-f25b-468e-afb4-dbf639d72d28	572d3dcc-618e-4767-92ec-fb22011cfb73	2025-07-02 05:11:56.216633+00	2025-07-02 05:12:04.207+00	\N	fe9af095-4faf-48ab-bc8a-f4f0f82c1542
26409d1a-b30c-4a23-a71e-9c23b7886f54	【27卒 例文あり】ゼミ活動をガクチカとして効果的にアピールする方法を解説！	gakuchikazemi	この記事では、ゼミ活動を就活のガクチカとして伝えるメリットや、そのポイントについて解説しています。この記事を読むことで、ゼミ活動に力を入れてきた就活生が、ガクチカをESや面接で伝えるときのポイントを理解することができます。	\N	<p>就活をはじめると「ガクチカ」というワードをよく耳にします。学生時代に培った力をアピールする　「ガクチカ」にどんなエピソードを選べば良いか悩む就活生も多いでしょう。</p><p>27卒就活生のなかには、ガクチカとしてゼミ活動を伝えようとしているヒトが多いのではないでしょうか。</p><p>「ゼミ活動はガクチカにできるの？」<br>「ありきたりな内容にならないか不安...」</p><p>このようなお悩みを持っている就活生もいるはずです。</p><p>この記事では、ゼミ活動を伝えるメリットやポイントについて解説します。ゼミ活動に力を入れてきたヒトは、熱心に学業を取り組んできた真面目さが評価されやすいです。この記事を参考に、ぜひガクチカとして伝えてみましょう。</p><p>本記事を参考にガクチカを作り込んでみてください。</p><h2><strong>ゼミ活動をガクチカとしてアピールするメリット3選</strong></h2><p>まず、ゼミ活動をガクチカとしてアピールするメリットには、どのようなものがあるのでしょうか。</p><p>下記3つのゼミ活動をアピールするメリットを読んで、本当に伝えるべきか確認してみてください。</p><h3>興味・関心を伝えやすい</h3><p>ゼミ活動には、自分の興味・関心が表れやすいという特徴があります。</p><p>ゼミを選ぶときには、「この分野を勉強したい」という想いが少なからずあるはずです。そして、ゼミ活動を熱心に行ってきたヒトは、そこで得た独自の学びがあると思います。</p><p>そのような想いや学びを伝えることで、面接官に自分の人柄や個性を知ってもらうことができます。自分ならではの人柄や個性を伝えることができれば、面接官も魅力的に思い、評価してくれるでしょう。</p><h3>他のエピソードと比べて差別化しやすい</h3><p>ゼミ活動で学ぶことには、さまざまな種類があります。アルバイトと比べると、ゼミ活動は課題が多様化する傾向にあり、他のヒトとエピソードが被ることは少ないでしょう。</p><p>今まで行ってきたゼミ活動を振り返り、どんな課題があって、どのように取り組んできたのか、差別化できる要素を考えてみてください。</p><h3>組織内での強みをアピールしやすい</h3><p>ゼミ活動は、複数のメンバーで行うことが多いです。チームを作り、連携しながら研究に励むこともあるでしょう。</p><p>そういった組織における活動で培った強みは、企業という組織での活動でも活かすことができます。組織内で自分の強みがどのように発揮されてきたのか、いまいちど振り返り、ガクチカにしてみましょう。</p><p></p><h2><strong>ゼミ活動をガクチカとして伝えるときのポイント3選</strong></h2><p>ゼミ活動をガクチカとして効果的に伝えるため、押さえるべきポイントを3つ解説します。ゼミ活動ならではの注意点もあるため、最後まで確認してみてください。</p><h3>企業の業務内容と研究内容をマッチさせる</h3><p>企業の業務内容と関連性が高い場合は、研究内容をどのように活かせるのか考える必要があります。特に機械系・IT系・建築系などの理系で、専門職を志望している場合は、積極的にアピールした方がいいでしょう。</p><p>志望している企業を研究して業務内容を理解した上で、自分が今まで研究して得たものが、入社してからどのように活かせるのか考えてみてください。</p><h3>結果までの取り組み方をアピールする</h3><p>企業の業務内容と関連性が低い場合は、結果を出すまでの取り組み方から強みをアピールしましょう。</p><p>当時の状況・設定した目標・動機・課題・施策などを整理し、どのように自分の強みが発揮されていたのか振り返ってみてください。</p><p>具体的なスキルがない就活生でも、取り組み方から強みを評価されるはずです。</p><h3>専門的な内容をかみくだいて説明する</h3><p>ゼミ活動には、専門的な内容が含まれていることも多いと思います。面接官もその内容を詳しく知っているわけではないため、誰でも理解できるようにかみくだいて説明する必要があります。</p><p>専門用語をあまり使わず、誰でも理解できるコトバを使うように意識してみてください。</p><p></p><h2><strong>ゼミ活動のガクチカ例文</strong></h2><p>前述したゼミ活動を伝えるポイントを意識しながら、ガクチカの例文を紹介します。構成やエピソードの書き方を参考にしてみてください。</p><p>【例文】</p><p>ゼミ活動で実施した地域商店街の活性化プロジェクトに力を入れました。所属するゼミでは地域活性化について取り組んでおり、地元商店街の活性化プロジェクトがありました。まずは課題を発見するために、住民へのアンケート調査とインタビュー調査を実施しました。調査から全体的に顧客の年齢層が高いことに気づき、数が少ない若者客の興味を惹くことを課題だと捉えました。そこで、調査から得られたデータをもとに若者の興味を考察し、「インスタ映えする商店街」というコンセプトを確立しました。実際にインスタ映えするスポットを商店街内に設置し、Instagram上にて発信することにしました。その結果、1ヶ月でフォロワー数を1,000人まで伸ばし、実際に地元商店街における若者客の割合を5%増加させることに貢献しました。この経験から、自分の主観だけで考えることはせずに、データを集めたうえで仮説を構築する重要性を学びました。</p><p></p><h2><strong>ゼミ活動でアピールしやすい強み</strong></h2><p>ゼミ活動の経験は、下記のような強みをアピールしやすいです。あなたが経験したゼミ活動ではどのような強みが形成されたのか。下記のような強みを参考に、考えてみてください。</p><h3>探究心</h3><p>特定のテーマに対して深く掘り下げる機会が多いため、未知の領域に対する興味や知識を得る意欲が自然と高まります。また、自ら疑問を持ち、答えを見つけ出すプロセスを繰り返すことで、探究心が培われるでしょう。</p><p>就活では、新しい分野や業務にも積極的に取り組み、深く理解しようとする姿勢をアピールできます。</p><h3>主体性</h3><p>自分自身でテーマを選んで研究を進める必要があるため、自ら考え行動する力が養われます。また、自分の意見を持ち、それを発信する機会が多くあるため、主体性が育まれます。</p><p>就活では、自ら進んで課題を見つけ、解決に向けて行動する力をアピールできます。</p><h3>計画性</h3><p>限られた時間内で研究を進め、発表を行うため、効率的にスケジュールを立てる能力が必要とされます。綿密な計画を立て、進捗を管理することで、計画性が育まれます。</p><p>就活では、スケジュール管理やタスク管理に優れており、段取りを立てながらプロジェクトを進行できることをアピールできます。</p><h3>協調性</h3><p>グループディスカッションや共同研究が多いため、他のメンバーと協力し合うことが求められます。意見を交換し、協力して目標を達成することで、協調性が育まれます。</p><p>就活では、チームワークを重視し、他のメンバーと円滑に協力し合いながら成果を上げられることをアピールできます。</p><h3>リーダーシップ</h3><p>グループのまとめ役や発表のリーダーとしての役割を経験することが多いため、リーダーとしての素質が育まれます。ゼミ活動でマネジメント経験を積んできた就活生は、他の就活生と差別化しやすいでしょう。</p><p>就活では、リーダーとしてチームをまとめ、目標達成に向けて先導する能力をアピールできます。</p><p></p><h2>ゼミ活動で他者と差別化し最強のガクチカを作ろう！</h2><p>今回は、ゼミ活動の経験をガクチカとして伝えるメリットやポイントについて解説しました。</p><p>ゼミ活動は、研究してきた内容から他の就活生と差別化しやすく、組織内での活躍もイメージしやすい経験です。ゼミ活動のガクチカがありきたりだと思っていた就活生も、ポイントに注意しながら、安心してゼミ活動をアピールしていただければと思います。</p><p>もし、27卒以降の大学生でどうしてもゼミ活動に自信が持てない場合は、長期インターンシップを検討してみることもおすすめです。実際の企業で業務経験を積むことができれば、より差別化しやすいガクチカをつくることができるでしょう。</p><p>しかし、いちばん大事なのは、経験から自分ならではの人柄や強みをアピールすることです。経験した内容がありきたりだからと不安になりすぎず、自分が経験してきたコトとじっくり向き合ってみてください。</p>	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/media/covers/1751433226585-f36l3r.webp	published	\N	8808c51e-f25b-468e-afb4-dbf639d72d28	74114e4f-9f4c-45ff-af96-6a1e26668ef0	2025-07-02 05:13:58.365227+00	2025-07-02 05:14:23.01+00	\N	cbf18451-9474-4367-a5c8-87c0840e3805
4ba257b9-7a75-4ebf-b909-e0feaf447d47	【学生起業】高校生が起業する際のポイントや、その手順を解説！	startbusinesshigh	この記事では、高校生が起業する際のポイントやその手順について解説しています。この記事を読むことで、起業に興味のある高校生が、実際に起業するためのアクションを理解することができます。\n	\N	<h2><strong>高校生でも起業は可能なのか？</strong></h2><p>高校生のみなさんは、起業してみたいと思ったことはありますか？<br>起業とは、自らビジネスを立ち上げ、学業と並行しながら新しいビジネスを企画・運営することです。</p><p>起業に対して「難しそう...」「何をすればいいか分からない」と思っている方も多いと思います。<br>高校生が起業するとなれば、さらにハードルが高いと思われるでしょう。</p><p>しかし、高校生のうちから起業することで、たとえ失敗したとしても、何度でもやり直すことが可能です。<br>また、起業経験から得られる学びも多く、その後の人生で大いに有利になるはずです。</p><p>この記事では、高校生で起業するポイントやその手順について解説します。本文を参考にしながら、ぜひとも起業について検討してみてください。</p><h2><strong>高校生が起業する際のポイント</strong></h2><p>まずは、起業のポイントについて解説します。高校生ならではの立場や状況をふまえて、起業するメリットを理解しましょう。</p><h3>お金をかけすぎずに小さく始める</h3><p>高校生が起業をする際、最初から大きな資金を投入するのはリスクが高いため、できるだけお金をかけずに小さくスタートすることが大切です。<br>例えば、動画編集やデザインなどのスキルを身につけて案件を受注するなど、在庫を持たなくてもいいビジネスは始めやすいと言えるでしょう。<br>小さく始めることで、失敗しても損失を最小限に抑えることができ、改善を重ねながら成長させていくことができます。</p><h3>サポートが受けられる環境を整える</h3><p>起業は一人で全てを行うのではなく、周囲からサポートを受けられる環境を整えることが大事です。高校生であれば、親や教師、地域の起業支援団体などからアドバイスを受けることが可能です。<br>特に、法的手続きや税務に関しては専門的な知識が必要なため、信頼できる大人のサポートがあれば心強いでしょう。<br>また、同じ志を持つ仲間やメンターを見つけることも重要です。起業コンテストやワークショップに参加することで、他の起業家や投資家とのつながりを築き、アドバイスを得る機会を増やすことができます。</p><h3>自分のやりたいことや得意なことを自覚する</h3><p>起業において成功するためには、自分が何をやりたいのか、得意なことは何なのかをしっかりと自覚することが大事です。<br>情熱を持てる分野でビジネスを展開することは、困難な時期でもモチベーションを保ちやすくなり、継続的に取り組む原動力となります。</p><h2><strong>高校生が起業するための5ステップ</strong></h2><p>次に、起業の手順について解説します。まずは大まかな流れを理解し、難しく考えすぎないようにしてみてください。</p><h3>ビジネスアイデアを考える</h3><p>高校生が起業を始める際、最初に重要なのはビジネスアイデアを考えることです。自分の興味や得意分野をもとに、どのようなサービスや商品が社会や周囲に必要とされているのかを考えることが大事です。<br>身近な問題やニーズに注目し、家族や友人の困りごとを解決するアイデアから、ビジネスチャンスを見出すことができる場合もあります。</p><h3>ビジネスモデルを構築する</h3><p>アイデアが決まったら、次にビジネスモデルを構築する段階に進みます。ビジネスモデルとは、どのように収益を得るかを定義したもので、ターゲット、提供する価値、収益源、コストなどを含めた計画を立てる必要があります。<br>たとえば、ターゲットとなる顧客層が誰なのか、その顧客にどのような価値を提供するのかを具体的に考えます。</p><p>また、どのようにして利益を上げるかも重要です。商品やサービスの価格設定、コストを抑える方法、集客方法などを考慮し、収益性が確保できるかをシミュレーションしてみることがポイントです。</p><h3>リサーチを行う</h3><p>ビジネスモデルを作ったら、次はリサーチを行いましょう。<br>自分が狙う市場には、どのような顧客がいるか、その顧客が何を求めているかを分析することで、より的確な価値提供が可能となります。</p><p>また、競合調査も重要です。同じ業界や似たビジネスを展開している企業がどのような戦略を取っているかを理解し、差別化できるポイントを見つけることで、自分のビジネスが受け入れられやすくなります。</p><h3>ビジネスをスタートする</h3><p>リサーチが終わったら、いよいよビジネスをスタートする段階です。まずは、ビジネスを始めるために必要な手続きを行いましょう。<br>個人事業主として開業届を提出したり、法人化する場合は法務局で登記手続きを行います。<br>初めから法人化する必要性は低いため、最初は個人事業主として開業届を提出するだけでも大丈夫です。開業届を提出することで、確定申告の際に青色申告が可能となり、節税対策につながります。</p><h3>営業や集客を行う</h3><p>次に必要なのが、営業や集客です。自分が行うビジネスの存在を知ってもらうことで、商品やサービスの購入を促します。<br>自分が提供する商品やサービスに価値を感じる層を理解し、売り込むことが大切です。最初は、クラウドソーシングサイトやSNSなどを活用し、顧客を探してみましょう。</p><h2><strong>高校生が起業する際の注意点</strong></h2><p>高校生が起業する際の注意点について解説します。高校生という立場だからこそ注意しなければいけないこともあるため、参考にしてみてください。</p><h3>親の同意を得る</h3><p>高校生が起業する際に重要なのが、親の同意を得ることです。個人事業主として開業届を提出したり、ビジネスに関する契約を結ぶ際には親のサポートが必要になることも多いでしょう。<br>円滑に起業の手続きをするためにも、親からの理解を得る必要があります。</p><h3>銀行口座を開設する</h3><p>起業をする際には、銀行口座を開設しましょう。取引先からお金を振り込んでいただく際に、銀行口座を提示する必要があります。<br>また、未成年者が銀行口座を開設する際には、通常の手続きに加えて、親権者の同意書や身分証明書の提出が必要になる場合があります。</p><h3>確定申告を忘れずに行う</h3><p>ビジネスを運営して収益が上がると、税務上の手続きとして確定申告を行う必要があります。個人事業主としてビジネスを行う場合、年に一度の確定申告が義務づけられており、事業で得た利益に対して所得税や住民税が発生します。<br>収入がある程度を超えると、申告をしないと脱税とみなされるリスクがあるため、正確にお金の出入りを管理し、申告を忘れずに行うことが重要です。</p><h2>高校生だからこそチャレンジしよう！</h2><p>今回は、高校生が起業するポイントやその手順について解説しました。<br>高校生による起業は、たとえ失敗したとしても、自身の成長に大きくつながります。また、若いほど応援されやすい傾向があるため、サポートしてくれる人も多いでしょう。</p><p>もし、起業する前に実務経験を積みたいという方は、長期インターンシップもおすすめです。長期インターンシップとは、学生のうちから、実際の企業で業務を行うことができる制度です。<br>通常は大学生を対象としていますが、中には高校生のうちから始めている人もいます。実際の企業で業務経験を積むことができれば、知識やスキルを得るだけでなく、働くことに対する解像度も高まるでしょう。</p><p>最後に、起業に興味がある方は、何度でもやり直しがきく今のうちに挑戦してみてください。応援しています！</p>	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/media/covers/1751433580891-0vd1l3.png	published	\N	8808c51e-f25b-468e-afb4-dbf639d72d28	74114e4f-9f4c-45ff-af96-6a1e26668ef0	2025-07-02 05:19:44.783673+00	2025-07-02 05:19:44.783673+00	\N	88f3dc3a-6a79-4aff-85c2-e5250c90a4e9
379f2be8-ea30-4de4-8f94-4bef56483df4	【学生起業】メリットや成功例、具体的な手順を解説！	gakuseikigyo	この記事では、研究活動を就活のガクチカとして伝えるメリットや、そのポイントについて解説しています。この記事を読むことで、研究活動に力を入れてきた就活生が、ガクチカをESや面接で伝えるときのポイントを理解することができます。	\N	<p>大学生のみなさんは、学生起業という言葉を聞いたことはあるでしょうか？</p><p>学生起業とは、学生が在学中に自らビジネスを立ち上げることを指します。具体的には、学業と並行して新しいビジネスを企画・運営することです。</p><p>「学生起業って失敗したらどうなるの？」<br>「実際に起業するとしたら、どのような手順があるの？」</p><p>学生起業に興味を持っている大学生は、このようなお悩みを持っている方も多いはずです。</p><p>この記事では、学生起業のメリットや成功例について解説します。本文を参考にしながら、ぜひとも学生起業について検討してみてください。</p><img src="https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/media/inline-images/9516qqk45zn.svg"><h2><strong>学生起業のメリット3選</strong></h2><p>まずは、学生起業のメリットについて解説します。学生ならではの立場や状況をふまえて、起業するメリットを理解しましょう。</p><h3>やり直しがきく</h3><p>学生起業は、社会人と比べてリスクが低い点が大きなメリットです。学生であれば、生活費などの負担が少ないため、失敗しても再挑戦がしやすい環境にあります。</p><p>失敗しても大きな経済的損失が少ないため、次の挑戦へとつながる貴重な経験を積むことができるのです。もし失敗してしまったら、就職するという選択肢があることもメリットにつながります。</p><h3>支援者を得やすい</h3><p>学生起業は、大学や専門学校などの教育機関からの支援を受けやすいという利点があります。例えば、大学のスタートアップ支援制度を活用することで、資金援助や専門家からのアドバイスを受けることができます。</p><p>また、学生という肩書きは起業家のなかでも目立ちやすく、若者の将来性に価値を見出して支援してくれる経営者もいます。学生という立場は、周りから応援されやすいというメリットがあるのです。</p><h3>就活で起業経験が高く評価される</h3><p>結果的に就職するという選択をした場合、学生起業は大きなメリットになります。</p><p>起業経験は、就職活動において非常に高く評価されるポイントです。企業は、新しいアイデアを生み出し、ビジネスを実行に移すことができる人材を求めています。</p><p>学生時代に起業を経験したことで得られる知識やスキルは、一般的な学生にはない強力なアピールポイントとなります。起業経験を持つ学生は、就活において他の就活生との差別化が図りやすくなります。</p><h2><strong>学生起業のデメリット3選</strong></h2><p>次に、学生起業のデメリットについて解説します。学生ならではの立場や状況をふまえて、起業するデメリットを理解しましょう。</p><h3>信用を得ることが難しい</h3><p>学生起業家は、特にビジネス経験が浅いことから、投資家や取引先からの信用を得ることが難しいとされています。<br>相手の立場で考えると、経験豊富な社会人と比べて、経験不足な学生に対してはリスクが高いと感じることが多いです。</p><p>そのため、信用を築くには、実績を積み重ねたり、信頼できるメンターを見つけることが大切です。</p><h3>学業との両立が難しい</h3><p>学生起業は、学業とビジネスを同時に進めることを求められるため、時間管理が難しくなることもあります。<br>特に試験期間や課題が多い時期には、ビジネスに取り組む時間が確保できなくなり、どちらも中途半端になってしまうリスクがあります。<br>起業に集中するために、休学などの手段も視野に入れておくといいでしょう。</p><h3>社会人と比べて経験不足</h3><p>学生起業家は、社会人に比べてビジネス経験が少ないため、経営やマーケティング、交渉などの面で難しさを感じることが多いです。<br>独学で学んでいくことも可能ですが、長期インターンシップを検討してもいいでしょう。</p><p>長期インターンシップを通して、企業で実際に業務経験を積むことで、社会人に劣っている知識やスキルを補うことができます。</p><p></p><h2><strong>学生起業の成功例5社</strong></h2><p>学生起業の成功例を紹介します。事例から見えてくる成功要因について知ることで、起業する際の参考にしてみてはいかがでしょうか。</p><h3>Gunosy</h3><p>創業者：福島良典<br>創業時期：東京大学在学中（2012年）<br>概要：ニュースキュレーションアプリ「Gunosy」を開発。個々のユーザーに合わせたニュースを配信するサービスで成功し、現在は東証一部に上場。</p><p>Gunosyの成功の背景には、スマートフォンの普及とニュース消費の変化がありました。ニュースがインターネット上に氾濫する中、個々のユーザーにパーソナライズされたニュースを届けるアルゴリズム技術が高く評価されています。創業者は、大学で培った知識を活かして、効率的にニュースをキュレーションするシステムを開発。また、東京大学というブランド力を背景に、投資家やメディアの注目を集め、迅速な資金調達が可能となりました。この技術力とメディア戦略の組み合わせが、Gunosyの急成長を支えました。</p><h3>Wantedly</h3><p>創業者：仲暁子<br>創業時期：京都大学在学中（2010年）<br>概要：ビジネスSNSとして企業と求職者をマッチングさせる「Wantedly」を運営。企業文化やビジョンを重視した採用プラットフォームとして人気を博し、成長。</p><p>Wantedlyは、従来の求人サイトとは異なり、企業文化やビジョンを重視した採用プラットフォームとして差別化を図りました。創業者の仲暁子氏は、企業と求職者のマッチングにおいて、単なるスキルや経験だけでなく、企業の文化や価値観にフィットすることが重要だと考え、これをコンセプトにサービスを展開しました。さらに、SNSの機能を活用して求職者と企業が気軽にコミュニケーションを取れる仕組みを作ったことも、成功の要因です。これにより、企業と求職者の双方にとって魅力的なプラットフォームを実現し、利用者を急速に拡大させました。</p><h3>メルカリ</h3><p>創業者：山田進太郎<br>創業時期：早稲田大学在学中に起業（2013年）<br>概要：フリマアプリ「メルカリ」を開発。手軽に商品を売買できるプラットフォームとして、日本国内外で急成長し、上場を果たした。</p><p>メルカリの成功は、スマートフォン時代のニーズに応じた「手軽さ」を追求した点にあります。創業者の山田進太郎氏は、スマホで簡単に商品を売買できるアプリを開発し、個人間取引の障壁を大幅に下げました。また、出品や購入の手続きがシンプルであることが、幅広いユーザー層を引き付けました。さらに、積極的なマーケティング戦略と、迅速な海外展開（特にアメリカ市場への進出）が、事業の急成長を後押ししました。ユーザーエクスペリエンスの改善に注力したことも、メルカリが競合他社との差別化を図る要因となりました。</p><h3>SmartHR</h3><p>創業者：芹澤雅人<br>創業時期：慶應義塾大学在学中（2013年）<br>概要：クラウド型の人事・労務管理システムを提供する企業で、従業員管理や給与計算を効率化するサービスとして多くの企業に採用され、成長。</p><p>SmartHRは、日本企業が抱える労務管理の煩雑さを効率化するという、明確なニーズに応える形で成功を収めました。創業者の芹澤雅人氏は、クラウド技術を活用して、人事・労務管理業務を大幅に簡素化するサービスを開発しました。このような効率化のニーズは中小企業を中心に高く、ターゲット市場を絞った戦略が功を奏しました。また、法改正などの制度変更に迅速に対応できる機能も強みとなり、多くの企業に採用されました。さらに、シンプルで使いやすいUI/UX設計も、ユーザーからの高評価を得た要因です。</p><h3>nanapi</h3><p>創業者：けんすう（古川健介）<br>創業時期：早稲田大学在学中（2007年）<br>概要：生活情報をまとめた「nanapi」を運営。役立つ生活の知恵を提供するウェブサイトとして広く認知され、後にKDDIに買収される形で成功を収めた。</p><p>nanapiの成功は、生活に役立つ情報を手軽に検索・利用できるプラットフォームを提供した点にあります。創業者のけんすう氏は、生活者が日常的に抱える小さな悩みを解決することに焦点を当て、その情報を誰もがアクセスしやすい形で提供しました。コンテンツの質と量を充実させることで、検索エンジンでの評価も高まり、ユーザーを効率的に集めることができました。さらに、スマートフォン普及時に迅速に対応し、モバイル向けの最適化を進めたことも、利用者の増加に貢献しました。最終的に、KDDIによる買収を通じて、さらに大規模な展開が可能となったことが、nanapiの成功を確実なものとしました。</p><p></p><h2><strong>学生起業のやり方</strong></h2><p>学生のうちに起業したいと思っても、具体的なやり方が分からず困っている方も多いのではないでしょうか。基本的な学生起業のやり方は、以下の通りです。</p><h3>アイデアの発案とリサーチ</h3><p>自分が情熱を持てる分野や問題を見つけ、それを解決するビジネスアイデアを考えます。<br>具体的には、自分の興味やスキルを振り返り、解決したい社会的な課題やニーズを見つけましょう。また、競合他社や市場の動向をリサーチし、アイデアが市場で通用するかを検証します。</p><h3>ビジネスプランの作成</h3><p>ビジネスの方向性や戦略を明確にするための計画を立てます。<br>具体的には、ビジネスモデルキャンバスやビジネスプランを作成し、提供する商品やサービス、ターゲット市場、収益モデル、マーケティング戦略などを整理します。また、必要な資金やリソースの見積もりも行います。</p><h3>資金調達</h3><p>ビジネスを始めるための資金を集めます。<br>具体的には、自己資金の確認や、親族・友人からの支援を検討してみましょう。それ以上の金額を求める場合には、クラウドファンディング、エンジェル投資家、ベンチャーキャピタルなどの外部資金調達方法も模索します。必要に応じて、ビジネスコンテストに参加して賞金を狙うことも一案です。</p><h3>プロトタイプの作成とテスト</h3><p>商品やサービスのプロトタイプを作り、ターゲットユーザーにテストしてもらい、フィードバックを得ます。<br>具体的には、最低限の機能を持つプロトタイプを作成し、実際のユーザーに試してもらいます。フィードバックを基に、商品やサービスの改善を行い、マーケットフィットを目指します。</p><h3>起業と事業展開</h3><p>事業を正式にスタートさせ、成長を目指します。<br>具体的には、会社設立や税務登録などの必要な法的手続きを行い、事業を正式に開始します。そこから、マーケティングや営業活動を本格化させ、初期の顧客を獲得しましょう。また、得られたデータを基に事業計画を修正し、成長戦略を立てていきます。</p><p></p><h2><strong>まとめ</strong></h2><p>今回は、学生起業のメリットや成功例、具体的な手順について解説しました。<br>学生起業は、成功しても失敗しても、自身の成長に大きくつながる経験です。社会人と比べてリスクの少ない学生だからこそ、起業する価値は大いにあるでしょう。<br>もし、何も知識がない状態で起業することに不安がある大学生のみなさんは、長期インターンシップなども検討してみてください。</p><p>実際の企業で業務経験を積むことができれば、知識やスキルを得るだけでなく、働くことに対する解像度も高まるでしょう。<br>学生起業に興味がある方は、まだやり直しがきく今のうちに、ぜひとも挑戦してみましょう。応援しています！</p>	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/media/covers/1751433676430-ku5w4f.png	published	\N	8808c51e-f25b-468e-afb4-dbf639d72d28	572d3dcc-618e-4767-92ec-fb22011cfb73	2025-07-02 05:21:21.264293+00	2025-07-02 05:21:21.264293+00	\N	d92c83b1-a48e-43a0-be30-6b6ac6e8100c
74702121-6513-4dc6-9364-9321a7274161	【27卒 例文あり】研究活動をガクチカとして効果的にアピールする方法を解説！	the-study	この記事では、研究活動を就活のガクチカとして伝えるメリットや、そのポイントについて解説しています。この記事を読むことで、研究活動に力を入れてきた就活生が、ガクチカをESや面接で伝えるときのポイントを理解することができます。	\N	<p>27卒就活生の中には、ガクチカとして大学での研究活動をアピールしたいと思う人が多いのではないでしょうか。</p><p>「ガクチカで研究活動をどのようにアピールすればいいの？」<br>「ガクチカで研究活動を伝えるメリットは？」</p><p>このようなお悩みを持っている27卒就活生も多いはずです。<br>この記事では、研究活動を伝えるメリットやポイントについて解説します。</p><p>研究活動は専門性が高いため、特定の企業や職種に対して効果的にアピールすることができます。この記事を参考に、ぜひガクチカとして伝えてみましょう。</p><h2><strong>ガクチカで研究をアピールするメリット3選</strong></h2><p>研究活動はアルバイトなどと比べて独自性が高く、ガクチカとしてアピールすることは効果的です。<br>下記3つの研究活動を伝えるメリットを読んで、本当に伝えるべきか確認してみてください。</p><h3>研究内容で他の学生と差別化できる</h3><p>研究をガクチカとしてアピールすることで、他の学生との差別化が図れます。<br>多くの学生がアルバイトやサークル活動を中心にアピールするなか、研究活動は専門性が高く、即戦力が期待できる経験として際立ちます。</p><p>特に、理系学生にとっては、研究を通じて培ったスキルや知識をアピールしやすいでしょう。文系学生との差別化にもつながり、採用担当者に好印象を与えることができます。</p><h3>専門性をアピールしやすい</h3><p>研究活動を通じて得た専門知識をアピールすることは、企業にとっても魅力的です。<br>特定の分野における専門知識は即戦力として評価されやすく、特に技術職や研究職を志望する場合には大きなアピールポイントになります。</p><h3>志望動機と直結させることができる</h3><p>研究テーマが志望企業の事業内容と関連している場合、研究を通じて得た知識やスキルを志望動機と結びつけてアピールすることができます。そうすることで、企業への貢献意欲を強調し、志望動機の説得力を高めることができます。</p><p>また、自分の研究がどのように企業で活かせるかを具体的に示すことで、入社後の活躍イメージを印象づけることにつながるでしょう。</p><h2><strong>研究内容を伝えるときのポイント3選</strong></h2><p>27卒就活生のみなさんは、研究内容を伝えるときのポイントについて、理解しているでしょうか？専門性が高いことから、伝え方に工夫が必要となる場合が多いです。<br>ガクチカとして効果的にアピールするために、下記3つのポイントを解説します。</p><h3>誰でも理解できる言葉を使う</h3><p>研究内容をアピールする際には、専門用語を避け、誰でも理解できる言葉を使うことが大切です。<br>採用担当者がその分野に精通しているとは限らないため、誰でも理解できる言葉で説明することによって、あなたの研究に対する理解を深めてもらえます。</p><p>研究内容を簡潔にまとめ、シンプルな表現で伝えることを心がけましょう​。</p><h3>成果よりも過程を強調する</h3><p>研究の成果のみをアピールするのではなく、過程に焦点を当てることが大切です。<br>研究中にどのような課題に直面し、それをどう克服したのか。また、その過程でどのように成長したかを詳しく説明することで、企業にあなたの素質をアピールできます​。</p><h3>企業や職種に合ったアピールを行う</h3><p>研究内容をアピールする際は、志望する企業や職種に合った強みを強調しましょう。<br>企業が求めるスキルや能力に関連する部分を中心に伝えることで、企業とのマッチ度を高めることができます。</p><p>企業や職種に合わせたアピールによって、採用担当者に「この人材は即戦力になる」と感じさせることができます​。</p><p></p><h2><strong>研究のガクチカ例文</strong></h2><p>前述した研究活動を伝えるポイントを意識しながら、ガクチカの例文を紹介します。構成やエピソードの書き方を参考にしてみてください。</p><p>【例文】</p><iframe data-htmlpreview="true" width="100%" height="400" srcdoc="<!-- 🔵 強調カード（埋め込み用ワンブロック） -->\n<section class=&quot;seo-highlight&quot;>\n  <p class=&quot;seo-text&quot;>\n    ○○の影響に関する研究に力を入れました。目標は、○○分野における△△が与える具体的な影響を解明することであり、1年間にわたり取り組みました。動機は、○○分野への強い興味と、現場での問題解決に役立つ知見を提供したいという思いからです。研究過程で最も困難だったことは、データ収集の際に限られたサンプル数しか集められなかったことです。調査対象が分散していたため、データの収集に時間がかかり、データ不足が分析の正確性に悪影響を与える可能性がありました。そこで、オンラインでのアンケートやインタビューを積極的に活用し、データの量を確保しました。その結果、必要な量のデータを得ることができ、研究発表では高い評価を受けました。この経験を通じて、ひとつの手段にこだわるのではなく、目的に適した手段を選定し、実行することの重要性を学びました。\n  </p>\n</section>\n\n<style>\n  /* --- 強調カードのスタイル --- */\n  .seo-highlight {\n    max-width: 760px;                /* 読みやすい行長 */\n    margin: 2rem auto;               /* センター寄せ */\n    padding: 1.8rem 2rem;\n    background: linear-gradient(135deg, #f9fafb 0%, #ffffff 60%);\n    border: 2px solid #2563eb;       /* ブルー系の枠線 */\n    border-radius: 1rem;\n    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);\n    transition: transform 0.25s ease, box-shadow 0.25s ease;\n  }\n  .seo-highlight:hover {\n    transform: translateY(-3px);\n    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);\n  }\n  .seo-text {\n    font-size: 1.125rem;             /* 約18px */\n    line-height: 1.7;\n    font-weight: 600;                /* 見出し未満の強調 */\n    color: #1e293b;                  /* ダークネイビー */\n    letter-spacing: 0.03em;\n    margin: 0;                       /* 段落余白リセット */\n  }\n\n  /* --- ダークモード対応（任意） --- */\n  @media (prefers-color-scheme: dark) {\n    .seo-highlight {\n      background: linear-gradient(135deg, #1e293b 0%, #111827 60%);\n      border-color: #3b82f6;\n    }\n    .seo-text {\n      color: #f3f4f6;\n    }\n  }\n</style>" sandbox="allow-scripts allow-same-origin" frameborder="0" style="width:100%;height:400;"></iframe><h2><strong>まとめ</strong></h2><p>今回は、研究活動の経験をガクチカとして伝えるメリットやポイントについて解説しました。<br>研究活動は、研究してきた内容から他の就活生と差別化しやすく、組織内での活躍もイメージしやすい経験です。</p><p>研究活動を通して得た専門的なスキルは、他の活動から得られるスキルよりも、希少価値が高い傾向にあります。そういったスキルを効果的にアピールすることで、採用担当者にも強く印象づけることができるでしょう。<br>もし、27卒就活生のみなさんのなかに、研究だけで満足できない方がいれば、長期インターンシップを検討してみることもおすすめです。</p><p>実際の企業で業務経験を積むことができれば、より専門性を高めることができると思います。専門性を高め、他の学生との差別化を意識してみてください。</p>	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/media/covers/1751434113567-03526u.png	published	\N	8808c51e-f25b-468e-afb4-dbf639d72d28	74114e4f-9f4c-45ff-af96-6a1e26668ef0	2025-07-02 05:28:39.295055+00	2025-07-02 05:31:08.021+00	\N	c1ba03d1-3570-4ae2-a33e-cc4bfcbb4d85
2479b879-2ede-47ee-b8b0-d6abdea2b75b	【27卒 例文あり】インターンやOB訪問でメールを作成するときポイントを解説	mail	この記事では、27卒就活生に向けて、就職活動においてビジネスメールを作成するときのポイントや例文について解説しています。この記事を読むことで、効果的にビジネスメールを作成し、就職活動をスムーズに進めることができます。	\N	<p>27卒就活生の中には、就職活動中におけるビジネスメールの書き方について、疑問に思っている方がいるのではないでしょうか。</p><p>「ビジネスメールはどのようなシーンで使うの？」<br>「ビジネスメールではどのような敬語を使えばいいの？」</p><p>このようなお悩みを持っている27卒就活生も多いはずです。<br>この記事では、就職活動におけるビジネスメールの重要性や、その書き方について解説します。</p><p>ビジネスメールの書き方を押さえておくことで、相手に失礼な態度を取らないように対策することができます。また、社会に出てからも必要になるため、今のうちに学んでおくと有利になるでしょう。</p><p>この記事を参考に、就職活動の一環としてビジネスメールの書き方を学んでみてください。</p><h2><strong>ビジネスメールの構成</strong></h2><p>ここからはビジネスメールの構成について解説します。それぞれのポイントを押さえておくことで、相手にとってわかりやすく、かつ失礼のないメールを作成することができます。</p><p>27卒就活生のみなさんも、就職活動に臨む前に一度確認してみてくださいね。</p><h3>宛先</h3><p>最初に確認すべきは「宛先」です。相手のメールアドレスを入力するときは、表記を間違えないようにしましょう。<br>メールアドレスを入力するときは、手動で入力するよりも、コピー＆ペーストをする方が安全です。特に重要なメールの場合は、送信前に再度確認することをオススメします。</p><h3>件名</h3><p>件名は、メールの内容を一目で理解してもらうために重要な部分です。件名に自分の名前を含めると、相手にとっては誰からのメールなのかをすぐに把握できます。</p><p>（例）<br>【山田太郎】インターンシップの参加について</p><h3>宛名</h3><p>宛名の書き方も知っておくと有利です。基本的には、「会社名＋部署（担当）名＋相手の名前」の順に記載します。もし相手の名前がわからない場合は、「ご担当者様」と記載することで無難に対応することができます。</p><p>（例）<br>株式会社〇〇<br>採用担当 山田太郎様</p><h3>本文</h3><p>本文では、特に敬語の使い方や言葉遣いに注意が必要です。ビジネスメールでは、相手に対する敬意を示すために、丁寧な表現を使うことが求められます。また、簡潔でわかりやすい文章を心がけ、長文にならないように意識しましょう。</p><p>（例）<br>お世話になっております。<br>〇〇大学 〇〇学部の山田太郎と申します。</p><p>この度は、インターンシップ選考に合格のご連絡をいただき、誠にありがとうございます。<br>ぜひ、貴社のインターンシップに参加させていただきたく存じます。</p><p>お忙しいところ恐れ入りますが、何卒よろしくお願いいたします。</p><h3>署名</h3><p>最後に、メールの締めくくりとして署名を挿入します。署名には、自分の名前や連絡先などの基本情報を記載します。署名はテンプレート化しておくと、毎回入力する手間が省けて便利です。</p><p>（例）<br>――――――――――――――――――――<br>〇〇大学 〇〇学部 〇〇学科 〇年<br>山田 太郎（やまだ たろう）&nbsp;<br>電話：□□□-□□□□-□□□□<br><a target="_blank" rel="" href="mailto:メールアドレス：taro.yamada@gmail.com">メールアドレス：taro.yamada@gmail.com</a><br>――――――――――――――――――――</p><p></p><h2><strong>ビジネスメールにおけるポイント</strong></h2><p>27卒就活生のみなさんは、企業とメールでやり取りすることが多いと思います。その際の内容やマナーによって、相手に良い印象・悪い印象を与えることがあります。</p><p>なるべく良い印象を与えられるようにするために、ビジネスメールを送るときに気を付けるべきポイントを解説します。</p><h3>文章は適度に改行する</h3><p>ビジネスメールは、読みやすさが非常に重要です。長い文章が続くと、相手に負担をかけることになりかねません。適度に改行を入れ、段落ごとに内容を整理することで、読みやすく、理解しやすいメールを作成しましょう。</p><p>例えば、1つの段落は1〜3行程度にまとめると効果的です。</p><h3>誤字や脱字に注意する</h3><p>ビジネスメールにおける誤字や脱字は、印象を損なう原因となります。送信前に必ず内容を見直し、誤字や脱字がないか確認することが大切です。</p><p>また、自動校正ツールなどを活用することも良い手段ですが、最終的には自分の目で確認することをオススメします。</p><h3>24時間以内に返信する</h3><p>就職活動中は、企業からのメールにできるだけ早く返信することが大切です。返信が遅れると、相手に不安を与える可能性があります。</p><p>基本的には、メールを受け取ってから24時間以内に返信することを心がけましょう。</p><h3>返信する時間帯に注意する</h3><p>メールを送信する時間帯も重要なポイントです。ビジネスメールは営業時間内に送信することが一般的で、特に午前9時から午後5時の間が適しています。</p><p>深夜や早朝のメールは、相手に対して失礼に当たることがあるため、注意が必要です。また、土日祝日を避け、平日に送信することもマナーのひとつです。</p><p></p><h2><strong>ビジネスメールの例文</strong></h2><p>27卒就活生のみなさんは、今までビジネスメールを作成する機会は少なかったと思います。以下では状況別に例文を載せているため、ぜひ参考にしてみてください。</p><h3>日程調整をする場合</h3><p>【山田太郎】面接の日程について<br>〇〇株式会社<br>採用担当 〇〇様</p><p>お世話になっております。<br>〇〇大学〇〇学部の山田太郎です。</p><p>先日は面談の日程についてご連絡をいただき、ありがとうございます。<br>以下の日程での面接を希望いたしますが、いかがでしょうか。</p><p>・日程<br>① 〇月〇日（月）9:00～17:00<br>② 〇月〇日（火）9:00～17:00<br>③ 〇月〇日（水）9:00～17:00</p><p>もし上記の日程でご都合が合わない場合は、他の日程もご提案いただけますと幸いです。</p><p>何卒、よろしくお願いいたします。</p><p>――――――――――――――――――――<br>〇〇大学 〇〇学部 〇〇学科 〇年<br>山田 太郎（やまだ たろう）&nbsp;<br>電話：□□□-□□□□-□□□□<br><a target="_blank" rel="" href="mailto:メールアドレス：taro.yamada@gmail.com">メールアドレス：taro.yamada@gmail.com</a><br>――――――――――――――――――――</p><h3>OBOG訪問のお願いをする場合</h3><p>【山田太郎】OB訪問のご依頼<br>〇〇株式会社<br>採用担当 〇〇様</p><p>はじめまして。<br>〇〇大学〇〇学部の山田太郎です。</p><p>突然のご連絡、失礼いたします。</p><p>私は現在、就職活動中で、貴社に強い関心を持っております。<br>もしご都合がよろしければ、OB訪問をさせていただけますと幸いです。</p><p>ご多忙中、誠に恐縮ですが、何卒ご検討のほどよろしくお願いいたします。</p><p>――――――――――――――――――――<br>〇〇大学 〇〇学部 〇〇学科 〇年<br>山田 太郎（やまだ たろう）&nbsp;<br>電話：□□□-□□□□-□□□□<br><a target="_blank" rel="" href="mailto:メールアドレス：taro.yamada@gmail.com">メールアドレス：taro.yamada@gmail.com</a><br>――――――――――――――――――――</p><h3>OBOG訪問のお礼をする場合</h3><p>【山田太郎】OB訪問のお礼</p><p>〇〇株式会社<br>採用担当 〇〇様</p><p>お世話になっております。<br>〇〇大学〇〇学部の山田太郎です。</p><p>本日はお忙しい中、貴重なお時間をいただき、誠にありがとうございました。<br>貴社でのご経験や業界の動向について直接お伺いでき、大変勉強になりました。</p><p>今後の就職活動において、今回のアドバイスを活かし、精一杯がんばりたいと思います。<br>改めまして、感謝申し上げます。</p><p>――――――――――――――――――――<br>〇〇大学 〇〇学部 〇〇学科 〇年<br>山田 太郎（やまだ たろう） <br>電話：□□□-□□□□-□□□□<br><a target="_blank" rel="" href="mailto:メールアドレス：taro.yamada@gmail.com">メールアドレス：taro.yamada@gmail.com</a><br>――――――――――――――――――――</p><h3>インターンシップの合格メールに返信する場合</h3><p>【山田太郎】インターンシップの参加について</p><p>〇〇株式会社<br>採用担当 〇〇様</p><p>お世話になっております。<br>〇〇大学〇〇学部の山田太郎です。</p><p>この度は、インターンシップ選考に合格のご連絡をいただき、誠にありがとうございます<br>ぜひ、貴社のインターンシップに参加させていただきたく存じます。</p><p>当日は何卒、よろしくお願いいたします。</p><p>――――――――――――――――――――<br>〇〇大学 〇〇学部 〇〇学科 〇年<br>山田 太郎（やまだ たろう）&nbsp;<br>電話：□□□-□□□□-□□□□<br><a target="_blank" rel="" href="mailto:メールアドレス：taro.yamada@gmail.com">メールアドレス：taro.yamada@gmail.com</a><br>――――――――――――――――――――</p><h3>インターンシップの参加を辞退する場合</h3><p>【山田太郎】インターンシップ参加辞退のご連絡</p><p>お世話になっております。<br>〇〇大学〇〇学部の山田太郎です。</p><p>この度は、インターンシップの選考に合格のご連絡をいただき、ありがとうございました。</p><p>しかし、私の都合により、誠に勝手ながら今回のインターンシップへの参加を辞退させていただきたく存じます。</p><p>貴社にご迷惑をおかけすることとなり、心よりお詫び申し上げます。<br>また、別の機会がございましたら、ぜひご縁をいただけますと幸いです。</p><p>何卒、よろしくお願いいたします。</p><p>――――――――――――――――――――<br>〇〇大学 〇〇学部 〇〇学科 〇年<br>山田 太郎（やまだ たろう）&nbsp;<br>電話：□□□-□□□□-□□□□<br><a target="_blank" rel="" href="mailto:メールアドレス：taro.yamada@gmail.com">メールアドレス：taro.yamada@gmail.com</a><br>――――――――――――――――――――</p><p></p><h2><strong>まとめ</strong></h2><p>今回は、27卒就活生のみなさんに向けて、ビジネスメールを作成するときのポイントについて解説しました。<br>ビジネスメールのポイントを押さえることで、悪印象を与えないように気を付けてみてください。<br>今回の記事を参考に、就職活動をスムーズに進めていただければ幸いです。</p>	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/media/covers/1751434407511-g6jcbd.webp	published	\N	8808c51e-f25b-468e-afb4-dbf639d72d28	74114e4f-9f4c-45ff-af96-6a1e26668ef0	2025-07-02 05:34:36.671686+00	2025-07-02 05:34:36.671686+00	\N	b0869201-8dc8-4a4d-8db5-aed635b97be5
f02f2fb1-6540-452d-b399-b4b554f6e4fe	【27卒必見！】インターンからの早期選考とは？呼ばれた場合にやっておくべきことを徹底解説！ 	27syukatu	この記事では、27卒就活生向けに、インターンからの早期選考に対する取り組み方を解説しています。この記事を読むことで、27卒就活生はどのような行動をとれば就活を優位に進めることができるのか、理解することができます。	\N	<p>こんにちは！<br>大学2年生である皆さんの中には、すでに就活を始めている方も多いと思います。</p><p>早い方だと、サマーインターンシップに参加し、早期選考の案内をされた方もいるのではないでしょうか？<br>しかし、本格的な選考の経験がなく、面接に不安を抱えている方もいるはずです。</p><p>そんな方たちに向けて、早期選考の前にやっておくべきことをご紹介します。<br>ここで内定を獲得して余裕を確保するために、徹底的に対策しておきましょう！</p><p>今回は、早期選考を控える優秀な27卒就活生の皆さんが、いまの時期にやっておくべきことを解説します。</p><h2><strong>インターンの早期選考とは？</strong></h2><img src="https://lh7-rt.googleusercontent.com/docsz/AD_4nXfSaM5TyVnUVJnpzyu-jqyshCjUqxvzuKzYHLS3ESJXrBW7fmJKpJGVLv6bgq-1gK_1cLlQacHWKBsDCz8h39gDHk8M2C6ZzYiQpta-NosETCXxtBx9rZudXkKU1ceI7FMdZM2mhF4K7kxg8APdTsjuy24?key=0lNWtleZCQpobWRtM4szHg"><p>まず、早期選考について軽く説明します。</p><p>早期選考とは、政府が提示した新卒採用スケジュールにおける一般的な本選考よりも、早く行われる選考のことです。</p><p>早期選考の特徴として、選考フローが一部免除になることが挙げられます。ESが免除となり、いきなり面接から選考が始まることも多いでしょう。</p><p>そして、インターンからの早期選考とは、インターンに参加した学生に案内される早期選考のことです。</p><p>インターンに参加した全員に案内されることもあれば、優秀な学生のみに案内されることもあります。</p><h2><strong>早期選考に参加するメリット</strong></h2><p>次に、27卒が早期選考に参加するメリットを解説します。</p><h3>ESや面接などの本選考に役立つ経験値を積むことができる</h3><p>1つ目は、ESや面接などの経験値を積むことができます。<br>ESが免除されている場合でも、情報としてESの提出を求められることは多いです。<br>また、面接が免除される場合でも、大抵は2~3回の面接を乗り越える必要があります。</p><p>早期選考でESや面接の経験を積むことができれば、たとえ落ちてしまったとしても、改善して本選考に活かすことができるはずです。<br>早期選考を終えたあとに、「何が良くて、何が悪かったのか」の分析を行うことで糧にしましょう。</p><h3>早く内定を確保することで余裕が生まれる</h3><p>2つ目は、早期に内定を確保することで、その後の就活に余裕を持つことができます。<br>多くの就活生は、内定をなかなか確保できない状況に陥ると、「このまま就職することができないのではないか」と不安になります。</p><p>不安になると、本来志望していた企業よりもレベルを下げて、難易度の低い企業への就活に妥協してしまいがちです。<br>そのように消化不良で就活を終えないためにも、早めに内定を獲得して余裕を確保し、志望度の高い企業にどんどん挑戦していきましょう。</p><h2><strong>早期選考に参加するデメリット</strong></h2><p>一方で、早期選考に参加するデメリットもあります。デメリットも同時に確認することで、自分が持っている条件を確認してみてください。</p><h3>経験値が浅いまま選考を受けることになる</h3><p>1つ目は、選考の経験値が浅いまま選考を受けなければいけないことです。<br>おそらく、27卒就活生の皆さんは、初めて面接を経験する方も多いのではないでしょうか？</p><p>「よくある質問に対する回答は一応考えているものの、実際に面接で話したことがない...」という方は、不安でいっぱいなはずです。</p><p>しかし、ほとんどの就活生が同じ条件です。秋冬の時期だと、まだ選考に慣れていない多くの就活生が、早期選考に臨むことでしょう。<br>ここで陥っていけないことは、面接でうまく話せなかったからと落ち込み、本選考までの期間で改善を行わないことです。<br>あくまで経験値を稼ごうという気持ちで、早期選考に臨んでみてください。</p><h3>選択肢を狭めてしまうリスクがある</h3><p>2つ目は、早期に内定を得たことで、その後の選択肢を狭めてしまうリスクがあることです。<br>就活をしていて、初めて内定をもらえたらすごく嬉しいと思います。</p><p>しかし、第一志望ではないにも関わらず、内定承諾後に妥協して入社する...といったことは非常にもったいない選択と言えます。<br>より志望度の高い企業が残っているのであれば、最後までやり抜き、悔いのない就活にすることをオススメします。</p><p>27卒の方であれば、4年生の本選考までやり抜いてみてください。<br>すると、本来は手が届きそうになかった企業にも、手が届くことがあるはずです。</p><h2><strong>今のうちにやっておくべきこと3選</strong></h2><p>それでは、インターンからの早期選考を控えている今だからこそ、やっておくべきことを3つご紹介します。</p><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-1280x720_v-fms_webp_50844c37-0bf7-4cc8-92e3-8c41bb83addf.png" alt=""><h3>自己分析を通して、自分の価値観を明確にする</h3><p>1つ目は、自己分析を通して、自分の価値観を明確にすることです。<br>自己分析のやり方は自由ですが、書籍やSNSを活用してみることがオススメです。</p><p>自己分析系の書籍を購入したり、SNSなどで自己分析系の発信を視聴したりしてみましょう。<br>最初は「自己分析ってどうすればいいの？」と迷う人が多いため、知識のある人から自己分析の方法を教えてもらうことが効率的です。</p><p>ただし、自己分析に時間をかけすぎるのはオススメしません。一通り自己分析が完了したら、模擬面接などを通じてアウトプットする機会を確保しましょう。<br>他人に自分の考えをぶつけることで、良い部分・足りない部分が見えてくるはずです。</p><p>こういった自己分析を通じて自分の価値観を明確にできれば、ESで自分らしい回答をつくれたり、面接で深堀りされても柔軟に答えたりすることができると思います。</p><h3>よく聞かれる質問の回答を作成する</h3><p>2つ目は、よく聞かれる質問の回答を作成することです。<br>面接では、いわゆる定番の質問があります。</p><p>例えば、「学生時代に頑張ったことを教えてください」「自己PRをしてください」「業界や企業に対する志望動機を教えてください」「将来、実現したいことを教えてください」などが挙げられます。</p><p>こういった質問に対する回答を用意しておくことで、面接でも緊張せずに話すことができます。</p><p>しかし、一言一句、丸暗記することはオススメしません。丸暗記してしまうと、いかにもな”丸暗記感”が出てしまうのです。</p><p>面接官からすると、「本当に自分の言葉で話しているのか？」と怪しまれてしまいます。<br>そのため、エピソードの構造を把握するまでに留めて、面接では雑談するようなイメージで自然に話してみてください。</p><h3>ガクチカや志望動機の深堀り対策をする</h3><p>3つ目は、「学生時代に頑張ったこと（ガクチカ）」や「業界や企業に対する志望動機」の対策をすることです。　<br>最初の面接では「ガクチカ」と「〇〇業界に対する志望動機」を問われることが多いでしょう。<br>そのため、最初の面接を受ける前に、最低でも上記2つの回答は準備しておくことをオススメします。</p><p>特にガクチカは聞かれることが多いため、深堀り対策用の質問を例として載せておきました。</p><p>・なぜその目標に取り組もうと思ったのか？<br>・取り組みにおける課題について、それに気づいたのはいつで、背景やきっかけは何だったのか？<br>・このガクチカの中で最も困難だったことは？<br>・困難だったことに対してどう向き合い、どう解決した？<br>・施策を行う中で自分なりの独自性はどんなこと？<br>・このガクチカ内での失敗談は？<br>・もし今戻れるならどこから何を改善し直す？<br>・取り組みを通じて何を学んだ？<br>・この経験を得て社会に出た時に、これらの経験をどう活かせると思う？</p><p>しっかりガクチカの深堀り対策をして、最初の面接を突破しましょう！</p><h2><strong>27卒で強いガクチカを作りたい人は...</strong></h2><p>27卒就活生の皆さんに向けて、今から強いガクチカを作る方法もご紹介します。</p><p>まだ時間に余裕のある27卒であれば、就活が本格化するまでの残り1年で、強いガクチカを作ることができます。</p><p>その方法が、「長期インターンに参加すること」です。</p><p>長期インターンとは、3か月以上の期間にわたって企業で働くインターンシップのことです。企業の業務を実際に体験しながら、スキルや知識を深めることができます。<br>企業での実務経験を積むことができる長期インターンの経験は、就活でもガクチカとして高い評価を受けます。</p><p>もし、今のガクチカに自信がないという方は、長期インターンに参加することを検討してみてください。</p><p><a target="_blank" rel="noopener" href="https://intern.gakuten.co.jp/">学転インターンから長期インターンを探してみる！</a></p><h2><strong>まとめ</strong></h2><p>今回は、27卒就活生に向けて、インターンシップからの早期選考について解説しました。<br>早期から行動する27卒就活生の皆さんは、他の就活生よりもかなり優位に立っていると言えます。</p><p>早期選考を受けることでESや面接の経験を積み、早めに内定を確保して余裕を持てるようにしておきましょう。<br>しかし、内定をもらえた時点で満足せず、納得内定をもらえるまでやり抜くことが大事です。</p><p>今の優位性を活かすことで、最高の就活になることを願っています！</p>	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/media/covers/1751435013907-0g4ouj.webp	published	\N	8808c51e-f25b-468e-afb4-dbf639d72d28	74114e4f-9f4c-45ff-af96-6a1e26668ef0	2025-07-02 05:43:38.6315+00	2025-07-02 05:43:38.6315+00	\N	f3083d51-68be-4c8e-8dc9-f1bf7ec6c11f
da07689b-72ef-4ef1-979e-02859e909177	【27卒就活】就活がやばい？｜これだけは抑えとけ！就活の心得	27shuukatu	2027卒学生向けの最新就活情報を解説！大手企業の採用動向や内定獲得のためのポイントを詳しく紹介します。2026卒生の傾向も踏まえた対策で、より早い準備が内定へのカギ。今すぐ確認して、成功する就活をスタート！	\N	<p>こんにちは！<br>今回の記事では、<strong>27卒の学生</strong>がどのように就活をスタートすればいいのか、解説していきます！</p><h2><br>27卒の就活状況｜27卒は就活がより早期化する！？</h2><p>早速27卒の就活状況を見てみましょう。<br>27卒の就活スケジュールはこのように予想されているようです。（マイナビより）</p><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-1292x596_v-fms_webp_8936be3c-eb57-46c1-8da5-a29a206a55d6.png" alt=""><p>一見このように見ると、時間的余裕があるように見えます。<br>一方で、サマーインターンに参加するためにはもっと多くの事前準備が必要になることでしょう。</p><p>では、皆さんの先輩である26卒の選考状況はどうなっているのでしょうか？</p><h3>26卒の選考状況</h3><p>1. <strong>就活の早期化</strong></p><p><strong>インターンシップの重要性</strong>:</p><p>26卒の学生たちは、大学3年生の夏までに長期インターンや短期インターンに参加し始める傾向がありました。インターンシップは就活の「実質的なスタートライン」とされており、参加者が企業側の選考で優遇されるケースも増えています。</p><p><strong>早期選考の活発化</strong>:</p><p>多くの大手企業が早期選考を導入しており、秋から冬にかけてエントリーが開始されることが一般的になっています。夏のインターンシップの参加者が秋にそのまま本選考に進む場合もあります。</p><p>2. <strong>オンライン化の継続</strong></p><ul><li><p><strong>Web面接・オンライン説明会</strong>: コロナ禍を契機にオンラインでの選考プロセスが定着しており、26卒でもオンライン面接やウェブ説明会が主流となっています。対面形式よりもフレキシブルに参加できるため、学生はより多くの企業と接点を持つことが可能です。</p></li><li><p><strong>企業説明会のハイブリッド化</strong>: オンライン説明会と対面説明会の両方が実施され、学生の都合に合わせて選べるケースも増えています。</p></li></ul><p>3. <strong>多様化する就活手法</strong></p><ul><li><p><strong>長期インターンの拡大</strong>: 長期インターンを通じた企業とのつながりが強化されており、26卒の多くが大学2年生・3年生から長期インターンに参加しています。これは企業とのマッチングを深めるだけでなく、実際の職務体験を通じて業界や仕事に対する理解を深める機会となっています。</p></li><li><p><strong>逆求人型サイトの利用増加</strong>: OfferBoxやキャリタスなどの逆求人型のプラットフォームの利用が増えており、学生が自分のプロフィールを公開し、企業からスカウトされる形での就職活動が広がっています。</p></li></ul><p>4. <strong>新しいキャリア観</strong></p><ul><li><p><strong>副業・フリーランス志向の高まり</strong>: 就職活動を行う学生の中には、従来の正社員としてのキャリアに加えて、副業やフリーランスとしての働き方に興味を持つ人が増えています。この傾向は、企業側でも副業を容認する動きが見られ、学生のキャリアの選択肢が広がっています。</p></li><li><p><strong>SDGsや社会貢献志向</strong>: 企業選びの際に、給与や安定性だけでなく、企業の社会貢献活動やSDGsへの取り組みを重視する学生が増えています。これにより、企業側も自身の社会的責任をアピールする必要性が高まっています。</p></li></ul><p>5. <strong>就職氷河期の懸念</strong></p><ul><li><p><strong>景気や企業採用数の影響</strong>: 世界的な経済の変動や国内外の企業活動の停滞により、一部の業界では採用枠が減少する懸念が出ています。特に、IT、製造業、サービス業などの一部では採用縮小が見込まれるため、学生はより厳しい競争にさらされる可能性があります。</p></li></ul><p>6. <strong>業界のトレンド</strong></p><ul><li><p><strong>DX・IT系の需要拡大</strong>: DX（デジタルトランスフォーメーション）関連職種やエンジニア系の職種は依然として高い需要があり、学生の中でも人気が高まっています。ITスキルやデジタル関連の知識が就活において強力な武器となっており、プログラミングやデータ分析のスキルを持つ学生は特に注目されています。</p></li><li><p><strong>医療・バイオ関連の注目</strong>: コロナ禍以降、医療系やバイオテクノロジー関連の企業への関心が高まっており、これらの業界も成長しています。</p></li></ul><p>このように、就活の早期化やキャリアに対する考え方などが多様になってきており、より一層早めの就活をしていく必要があることがわかります。</p><h3>27卒で予想される早期化</h3><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-2400x1601_v-frms_webp_07e7035b-d7e6-47ab-b635-05cebc9228f6.jpg" alt=""><p>27卒の就活では、26卒以上に<strong>早期化する可能性がある</strong>と考えています。<br>学生の数は減りつつも、<u>新卒採用に対する需要は高まっており</u>、企業はなるべく早くから学生を採用する流れに進むことでしょう。</p><p>そんな27卒の就活ですが、スタートダッシュの鍵を握るのはまさに”<strong>インターン参加</strong>”が肝となっています。</p><h3>インターン参加が鍵を握る！</h3><p>27卒の就活では、<strong>インターンシップへの参加が就活成功の鍵</strong>を握っています。近年、企業の採用活動が早期化する中で、インターンシップが実質的な「先行選考」の役割を果たすケースが増えています。特に、夏から秋にかけて行われるインターンシップは、企業側が学生を早期に見極める場として活用しており、ここで良い評価を得た学生は、その後の本選考で有利に進むことが期待されます。</p><p>1. <strong>インターンシップがもたらすメリット</strong></p><ul><li><p><strong>業界・企業理解の深化</strong>: インターンに参加することで、業界や企業の実際の仕事内容を体験し、自分に合うかどうかを確かめることができます。単なる説明会やウェブでの情報収集とは異なり、リアルな仕事の現場で感じる雰囲気や、自身が活躍できる可能性を知ることができるため、キャリア選択の参考になります。</p></li><li><p><strong>早期選考で有利に</strong>: 多くの企業はインターンシップ参加者に対して優先的に本選考に招待したり、内定を早めに出す傾向があります。企業としても、インターンを通じて学生の人柄やスキルを直接確認できるため、選考のプロセスがスムーズに進みやすいのです。</p></li><li><p><strong>実践的なスキルの習得</strong>: インターンシップでは、単なる観察ではなく、実際に業務に携わることが求められます。これにより、大学で学んだ知識を実際のビジネスシーンで活かす力や、社会人としての基礎的なビジネスマナーを学ぶことができるため、本選考でのアピールポイントとしても有利になります。</p></li></ul><p>2. <strong>長期インターンで差をつける</strong></p><p>短期のサマーインターンも重要ですが、特に<strong>長期インターン</strong>に参加することで、他の学生との差別化が図れます。長期インターンでは、より実務に近い体験ができ、プロジェクトの一部として成果を出すことが求められるため、仕事への深い理解と自己成長が期待されます。また、企業との接点を長く持つことで、信頼関係が築かれ、そのまま内定に繋がるケースも少なくありません。長期インターンに関しては次の章で詳しく説明します！</p><p>3. <strong>インターンシップでキャリアの選択肢を広げる</strong></p><p>インターンシップは特定の業界や企業を深く知る手段であると同時に、<strong>自分自身のキャリアの可能性を広げる機会</strong>でもあります。複数のインターンに参加することで、自分が最も興味を持ち、能力を発揮できる分野を見つけることができます。また、インターン経験が豊富な学生は、面接で具体的なエピソードを持ち込みやすく、企業側にも強い印象を与えることができるでしょう。</p><h2>27卒の就活の進め方</h2><p>27卒の学生が今からできる就活の進め方についてご紹介していきます。</p><h3>自己分析</h3><p>就活の第一歩として、自己分析が欠かせません。自己分析とは、自分の強みや価値観、興味を明確にする作業です。自分が何に興味があり、どのようなスキルを持っているかを理解することで、志望する企業や業界を選ぶ基準が明確になります。</p><p>具体的には以下のようなポイントに焦点を当てて考えてみましょう。</p><ul><li><p>これまでの経験や学びを振り返る</p></li><li><p>自分の強みや弱みを明確にする</p></li><li><p>どのような仕事にやりがいを感じるか</p></li><li><p>働く上で大切にしたい価値観は何か</p></li></ul><p>自己分析をしっかり行うことで、自信を持って企業にアピールできる材料を整えられます。</p><h3>アピールポイントの確認</h3><p>自己分析を踏まえた上で、次に自分のアピールポイントを確認しましょう。アピールポイントとは、企業に対して自分を採用するメリットを伝えるための要素です。具体的には、以下のような要素を考えてみてください。</p><ul><li><p>学業や課外活動で培ったスキルや成果</p></li><li><p>チームでの役割やリーダーシップ経験</p></li><li><p>問題解決力やコミュニケーションスキル</p></li></ul><p>企業が求める人物像を理解し、それに応じたアピールポイントを持つことが重要です。</p><h2>長期インターンという選択肢も</h2><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-2400x1600_v-frms_webp_b0651fd0-7a61-416c-b994-421b455b24c9.jpg" alt=""><p>就活において、長期インターンシップも非常に有力な選択肢です。長期インターンは、実際に企業で働く経験を通じて自分の適性や志望する業界について深く理解することができます。また、インターンを通じてスキルを実践的に磨くことができ、就職活動での大きなアドバンテージとなるでしょう。</p><h3>長期インターンとは？</h3><p>長期インターンとは、通常数ヶ月から1年以上にわたって企業で実務を経験するプログラムです。短期間のインターンとは異なり、具体的な業務に継続して関わることができるため、実際のビジネスの流れや企業文化を深く理解する機会になります。</p><p>長期インターンを通じて得られるメリットは以下の通りです。</p><ul><li><p>業界や企業の実態を知ることができる</p></li><li><p>実務スキルを磨ける</p></li><li><p>自己アピールの材料になる実績を積むことができる</p></li><li><p>インターン先からの内定獲得の可能性がある</p></li></ul><h3></h3>	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/media/covers/1751435531821-jvv23k.webp	published	\N	8808c51e-f25b-468e-afb4-dbf639d72d28	74114e4f-9f4c-45ff-af96-6a1e26668ef0	2025-07-02 05:52:33.283496+00	2025-07-02 05:55:55.637+00	\N	b2b626f6-3b0f-46ad-93b1-f7ebb93e6826
fba9ab78-f7ff-45a5-87a0-3183ae8731e2	【長期インターン5選】大学1・2年生におすすめの長期インターンの探し方	longinternrecomend	大学1・2年生向け長期インターン特集！成長できる環境で経験を積みたい方におすすめの長期インターンの探し方や選び方を解説し、裁量のある企業5選を厳選紹介。目指すべきポイントや企業ごとの特徴を理解して、自分に最適なインターンを見つけよう！	\N	<p>今回は、大学1・2年生におすすめの長期インターンの探し方についてまとめてみました。長期インターンに興味はあるけど、どんなインターンに参加すればいいかわからない方に向けて丁寧に説明しているので、この記事を読めば長期インターンの選び方マスターになれること間違いなしです。</p><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-2400x1600_v-frms_webp_72762429-4f5a-44c4-ab72-2b4b73529fac.jpg" alt=""><h1><strong>そもそも長期インターンって何？</strong></h1><p>長期インターンとは、主に学生が就職する前に自身の適性やビジネスの雰囲気を知りながら、働くことができる制度です。企業としても学生を社内に入れることで雰囲気の活性化やリクルート活動に繋げる狙いがあります。</p><p>また、長期インターンでは基本的に報酬が発生する仕事がほとんどです。アルバイトより稼げる仕事がほとんどなので、長期インターンで生計を立てる学生も多いです。</p><p>では実際にどのように長期インターンを探すべきかについて詳しくみていきましょう。</p><h2><strong>最適な長期インターンの選び方は？</strong></h2><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-2400x1600_v-frms_webp_12131a1d-68c2-4e69-8176-c9123e08a227.jpg" alt=""><p>長期インターンを選ぶときに、意識したいポイントが3つあります。</p><p>「裁量のある環境で働けるかどうか」</p><p>「優秀な人の下で働けるかどうか」</p><p>「自分のキャリア目標に合致しているかどうか」</p><p>以下でそれぞれ詳しく見てみましょう。</p><h3>①裁量のある環境で働けるかどうか</h3><p>1つ目のポイントは「裁量のある環境で働けるかどうか」です。長期インターンの魅力は、アルバイトとは異なり、より自分で考えて行動できるところにあります。この行動できる範囲を決めるのが「裁量」を持って仕事ができるかどうかという点です。プロジェクトを任され、自分の意見やアイデアが実際の業務に反映されると、自信にもつながり、結果として成長スピードが格段に上がります。そのため長期インターンの面接時には、どんな仕事を任せてもらえるのか、業務範囲や責任の大きさを確認し、裁量の度合いを把握することが大切です。</p><p><strong>＜ポイント＞</strong><br>求人票だけでは裁量の度合いがわからない！<br>面接で直接聞くのがポイント！</p><h3>②優秀な人の下で働けるかどうか</h3><p>2つ目のポイントは「優秀な人の下で働けるかどうか」です。長期インターンでは、実際に社会人が働いている空間で一緒に働き、学べることが魅力です。そんな空間をより効率よく成長に繋げるためには、一緒に働く先輩が重要になります。優秀な上司やメンターのもとで働くことで、日常業務を通じてスキルや知識を吸収できるだけでなく、仕事に対する考え方や姿勢まで学ぶことができます。また、優れた指導者は自分に足りない点を的確にフィードバックしてくれるため、成長を実感しやすくなります。事前にインターン先のメンターの経歴や実績を確認し、自分にとって理想的な学びの環境かどうかを判断しましょう。</p><p><strong>＜ポイント＞</strong><br>何をするかも大切だけど、もっと大切なのは誰と働くか！<br>＊私も昔は勘違いしてました、、</p><h3>③自分のキャリア目標に合致しているかどうか</h3><p>3つ目は「自分のキャリア目標に合致しているかどうか」です。将来やりたい仕事や興味のある分野が明確にある場合は、そのキャリア目標に沿った長期インターンを選ぶことで、実践的なスキルを身につけることができ、就職活動やキャリア形成に大きく役立ちます。また、将来の目標が決まってない場合でも、楽しそうと思える仕事を選択することが大切です。長期インターン期間中に得た経験やスキルが将来どのように活かせるかを考えながら選択するとなお良いです。</p><p><strong>＜ポイント＞</strong><br>まずは長期インターンに参加することが大切！<br>働いていく中でやりたいことが見つかることもある！</p><p>ここからは大学1・2年生におすすめの長期インターンを5つご紹介します！<br>どの会社も</p><p>「裁量のある環境で働けるかどうか」</p><p>「優秀な人の下で働けるかどうか」</p><p>「自分のキャリア目標に合致しているかどうか」</p><p>という条件は満たしている会社になります！</p><h1><strong>おすすめ長期インターン5選</strong></h1><h2>①株式会社estra</h2><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-940x705_e1983b2d-d6dd-4c91-ad14-cf962b1e44e0.webp" alt=""><p>募集職種：<strong>営業・マーケティング</strong></p><p>株式会社estraは、教育業界を変えようとしている会社です。スタッフの平均年齢も高くはなく、現在第二創業期と位置付けている会社でここから成長していく会社になります。</p><p>長期インターン生の具体的な業務として、</p><p><strong>・業務明確化・効率化業務の提案から実行まで</strong></p><p><strong>・インターン生のマネジメント業務</strong></p><p><strong>・組織をまとめて設計する</strong></p><p><strong>・プロジェクト担当者（立案から実行まで）</strong></p><p><strong>・採用方針の策定、インターン/中途職採用</strong></p><p>と、幅広い業務があるので、面接の中で業務のすり合わせが可能です！</p><p>気になった人は<a target="_blank" rel="noopener" href="https://intern.gakuten.co.jp/job-detail/estra">こちらから</a>詳細の確認・応募が可能です！</p><h2>②株式会社Algomatic</h2><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-1670x1044_v-fms_webp_a13167a7-c363-44ea-bbb3-ae0e862b2b3b.jpg" alt=""><p>募集職種：<strong>経営企画室　AIエンジニア</strong></p><p>DMMから20億円の出資を受けて立ち上がった企業です。生成AIネイティブなサービスを作り出す会社になっています</p><p>長期インターン生の主な業務としては、</p><p><strong>＜経営企画室＞</strong></p><p>経営メンバー直下で全社の経営イシューを解決するべく動きます</p><p><strong>＜AIエンジニア＞</strong></p><p>生成AI技術の最新動向調査、レポート作成<br>生成AIツールの実験的利用とその結果分析<br>生成AI関連の記事の発掘と提案、記事の執筆<br>自社プロダクトおよび社内の業務効率化プロダクトを構築するポジション</p><p>営業もエンジニアも募集している企業なので、AI系で活躍したいと考えている学生におすすめの求人です！</p><p><a target="_blank" rel="noopener" href="https://intern.gakuten.co.jp/job-detail/algomatic">経営企画室はこちら</a><a target="_blank" rel="noopener" href="https://intern.gakuten.co.jp/job-detail/algomatic3"><br>エンジニアはこちら</a></p><h2>③株式会社Bets</h2><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-600x600_v-fs_webp_13ebb2c2-bbf3-45f9-a02d-fdfb0bc3952f.png" alt=""><p>募集職種：<strong>マーケティング</strong></p><p>株式会社Betsは、リクルート出身のマーケターによって創業されたマーケティングカンパニーです。D2CプロダクトやWebサービスを中心に、マーケット分析から広告配信まで一気通貫で支援する『Webマーケティング事業』を展開し、上場企業や急成長スタートアップをサポートしてきました。これまでのノウハウを活かし、新規事業も展開中。</p><p>募集ポジションは、マーケティングの全てを実行するポジションです。<br>そのため、覚悟を持った学生のみを募集しています。</p><p>マーケターとして本気で活躍したい学生におすすめの会社です！</p><p><a target="_blank" rel="noopener" href="https://intern.gakuten.co.jp/job-detail/bets">マーケティングボジションはこちらから</a></p><h2>④株式会社Olive</h2><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-305x165_webp_e1fa9b35-d45a-4646-955f-646293e35747.png" alt=""><p>募集職種：<strong>営業</strong></p><p>株式会社Oliveは、IT業界の課題解決に取り組んでいる会社になります。</p><p>エンジニアの地位向上やフリーランスという働き方を推進し、性別・国籍・年齢・学歴など関係なく誰もが挑戦できる環境を創ることにより、エンジニアを志すヒトが増え、プロジェクト単位で参画、横断することによって、この社会問題を解決しようと考えている企業です。</p><p>長期インターンでは、IT営業の全てを行っていただきます。すでにインターン生として参画している学生さんも多く、最初のインターンとしても働きやすい環境があります！<br>詳しい情報は下記リンクから確認してみてください！</p><p><a target="_blank" rel="noopener" href="https://intern.gakuten.co.jp/job-detail/olive">営業はこちらから</a></p><h2>⑤株式会社WonderPalette</h2><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-2362x1146_v-frms_webp_230c8f57-011d-4ff3-99bf-b54bc9b6daec.jpg" alt=""><p>募集職種：<strong>営業</strong></p><p>株式会社WonderPaletteは食品開発・販売業界特化の生成AI導入・DXコンサル及び開発を通して、業界のアップデートを行っている会社です。</p><p>具体的な業務内容としては、責任者直下で、需要予測SaaS『Wonder予測AI』の新規開拓営業を行っていただきます。</p><p>基本的には、法人向けに荷電やメールなどでアポイントを獲得し、打ち合わせに同席をいただきます。スキルがある方や成果を出した方については、その後の商談やコンサルなど獲得に関する上流業務をお任せします。年商100億円レベルの企業の役員や責任者クラスと商談や営業経験を積むことができます。</p><p>WonderPaletteは外部から資本をどんどん入れている会社で、他の企業以上の成長スピードがある会社なので興味のある方はぜひ下記リンクを確認してみてください！</p><p><a target="_blank" rel="noopener" href="https://intern.gakuten.co.jp/job-detail/wonderpalette">営業ポジションはこちらから</a></p><h1>最後に</h1><p>いかがだったでしょうか？<br>大学1・2年生で長期インターンを実施することは他の人よりも早いスタートダッシュを切れるので是非挑戦してみてください！</p>	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/media/covers/1751853094477-9ldh2c.webp	published	\N	8808c51e-f25b-468e-afb4-dbf639d72d28	74114e4f-9f4c-45ff-af96-6a1e26668ef0	2025-07-07 01:51:50.859668+00	2025-07-07 01:51:50.859668+00	\N	d7855fa8-151d-4b84-bd33-195627d81f79
fc5009e5-4620-49f9-ae06-59f57339192a	就活中にピアスはOK？企業が持つピアスの印象を解説します！	pierce	就活中のピアスはOK？企業や業界ごとの印象を解説します。ピアス跡やホールの影響、隠し方など、就活に役立つポイントを詳しく紹介！	\N	<p>こんにちは！<br>今回は、就活中にピアスはOKか？ということについてご説明いたします。<br>これから就活に望む人たちにとって、面接や企業説明会での身だしなみは細心の注意を払う必要があります。</p><p>特にピアスはファッション性が高いアクセサリーとして人気ですが、就活には不向きになることがあります。</p><p>ピアスを付けたままや跡が残っていると、就活にどんな影響があるかと悩む人もいるでしょう。</p><p>この記事では就活中のピアスに対して、業界や企業が持つ印象を解説します。</p><p>ぜひ、参考にしてください。</p><p></p><h2>就活中のピアス跡やピアスホールについて</h2><p>就活中はピアスを外すが、ピアスホールや跡が気になる人も多いでしょう。</p><p>この章で、就活中にピアス跡やピアスホールが与える影響を解説します。</p><h3>ピアス跡やピアスホールは就活に不利か？</h3><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-454x340_webp_daaa391f-1106-41be-9332-9b6ba0d61cf4.jpg" alt=""><p>ピアス跡やピアスホールがもたらす第一印象は企業によって違います。</p><p>業界ごとに、身だしなみを重要視する度合いが違うからです。</p><p>しかし、どの業界でも共通して注意することが3つあります。</p><ul><li><p>企業文化を調べる</p></li><li><p>面接時の印象を重視する</p></li><li><p>自己実現のバランスを見極める</p></li></ul><p>1つずつ解説します。</p><p>企業文化を調べる</p><p>まず、1つ目は応募する企業の文化を調べます。</p><p>企業の文化や従業員の服装で、ピアス跡がどの程度問題視されるか予測できるからです。</p><p>面接時の印象を重視する</p><p>次に、面接では面接官への第一印象が最も重要です。</p><p>企業文化を調べても、ピアス跡が気になる場合は隠すことをおすすめします。</p><p>ピアス跡やピアスホールを隠す方法は「ピアスを隠す方法3選」で解説します。</p><p>自己実現とのバランスを見極める</p><p>最後に、就活中は自分らしさを大切にすることも重要です。</p><p>自分らしさを過度に抑えて、企業に入っても長続きしないからです。</p><p>自分の性格や気質と企業の文化に大きな差があると、自分のメンタルを傷つけてしまいます。</p><p>しかし、ピアスが自己表現の一部になっている場合もあります。</p><p>その場合は理解してくれる企業を見つけ、就職しましょう。</p><p>&nbsp;</p><h2>&nbsp;就活時にピアスをつけることの影響</h2><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-511x340_webp_72d741d9-5c07-463b-a045-f4ed1abfb103.jpg" alt=""><p>前提として就活時はピアスを外しておくことが一般的ですが、業界によってピアスの印象は違います。</p><p>主に、保守的な業界とクリエイティブな業界に分けられます。</p><p>1つずつ解説します。</p><h3>保守的な業界や企業の場合</h3><p>金融や公務員、医療などの業界ではピアスはネガティブな印象を与えます。</p><p>厳正な企業文化や清潔感を大事にする企業にとって、カジュアルな特徴が強く出ているピアスは不釣り合いです。</p><h3>クリエイティブな業界やカジュアルな企業の場合</h3><p>クリエイティブな業界ではピアスはポジティブな印象を与える傾向にあります。</p><p>その人の個性や独自性が重視されるからです。</p><p>しかし、TPOに合うようにデザインや付ける個数に配慮する必要があります。</p><p></p><h2>ピアスの数・位置・性別による印象の違い</h2><p>ピアスの数や位置、性別によっても与える印象が違います。</p><p>この章で一般的に知られているピアスの印象を解説します。</p><h3>ピアスの位置による印象の違い</h3><p>ピアスを耳たぶではなく、他の位置に付けているのを見たことはありますか？</p><p>ピアスは付ける位置によって与える印象が違います。</p><p>今回は耳たぶ、軟骨、トラガスに分けて解説します。</p><p>耳たぶ</p><p>耳たぶはピアスを付ける位置で1番多いです。</p><p>初めてピアスを開けるときに選ばれる可能性が高いからです。</p><p>耳たぶはカジュアルな場面だけでなく、フォーマルな場面でも許容されやすい位置といえます。</p><p>軟骨</p><p>耳の上部にある軟骨にピアスを付けると個性的な印象を与えます。</p><p>ファッション性も高くなる傾向があるため、クリエイティブ業界やカジュアルな文化を持つ企業に好まれます。</p><p>トラガス</p><p>トラガスは耳の穴の前方にある軟骨です。</p><p>トラガスにピアスを付けると、目立ちやすくユニークな印象を与えます。</p><p>フォーマルな服装を求められている場面では、好ましくないです。</p><h3>ピアスの数による印象の違い</h3><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-340x340_webp_2bb7a30c-8ae7-4e99-b007-4b65cc782f84.jpg" alt=""><p>次にピアスの数で与える印象の違いを解説します。</p><p>片耳に1つ</p><p>ピアスを左右どちらかの耳に1つ付けると、シンプルで控えめな印象を与えます。</p><p>フォーマルな場面でも違和感が少ないです。</p><p>両耳に1つずつ</p><p>両耳に1つずつピアスを付けるのは、バランスが良く多くの場面で受け入れられやすいです。</p><p>複数のピアス</p><p>片耳に複数のピアスは特に個性的な印象を与えます。</p><p>奇数</p><p>日本では奇数は縁起が良い数字です。</p><p>特に「１」や「３」は相手に好印象を与えます。</p><p>偶数</p><p>逆に海外では偶数が好まれます。</p><p>このようにピアスの位置や数は、個人のスタイルや文化的背景によって相手に与える印象が違います。</p><h3>男性と女性での印象による違い</h3><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-511x340_webp_c40f73d5-7701-4f50-af33-7658c7d53563.jpg" alt=""><p>ピアスは性差でも相手に与える印象が違います。</p><p>男性と女性、両者共通で与える印象の違いを解説します。</p><p>男性の場合</p><p>男性がピアスを付けると、保守的な業界では第一印象が良くないです。</p><p>伝統や清廉なイメージを重視する業界では、不真面目な印象を与えてしまうからです。</p><p>女性の場合</p><p>女性が耳たぶに付ける小さなピアスはフォーマルの場面でも許容されやすいです。</p><p>しかし、保守的な業界では耳たぶでも不利になる可能性があります。</p><p>男性と女性に共通する印象</p><p>男性も女性も軟骨やトラガスのピアスは、ファッション性が高くなり個性的な印象に変わります。</p><p>就活中は、男性も女性もピアスを外すなどのTPOに合わせた対策が必要です。</p><h2>&nbsp;ピアスをつけたまま就活に臨む際の注意点</h2><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-511x340_webp_5a938378-5079-4156-83e4-3555d3c35bb1.jpg" alt=""><p>マナーとして、面接や企業説明会ではピアスをしないことが前提条件です。</p><p>しかし、自己表現の一部になっていてピアスを外せない場合もあります。</p><p>ピアスを付けたまま就活する場合の注意点を解説します。</p><h3>目立たないデザインを選ぶ</h3><p>ピアスは小さくシンプルなデザインを選びます。</p><p>特に透明なピアスや肌色に近いピアスは、相手に与える印象も最小限に抑えられます。</p><h3>清潔感を保つ</h3><p>清潔感は相手に与える印象を大きく左右します。</p><p>ピアスが清潔か、全身の身だしなみは整っているか入念に確認すると良いです。</p><h3>企業文化をリサーチする</h3><p>企業によって、ピアスに対する許容範囲は違います。</p><p>事前に応募する企業の文化を調べておくことが必要です。</p><h3>正直に説明する</h3><p>面接の際にピアスを付けていると質問される可能性が高いです。</p><p>質問されたら、自己表現の一部であることを丁寧に説明します。</p><p>同時に仕事に真面目に取り組む姿勢やプロフェッショナリズムに影響がないことを伝えます。</p><p></p><p>就活中はピアスを外すことがマナーです。</p><p>ピアスを付けて就活しても、企業によっては外すよう求められます。</p><p>自己表現も大切ですが、相手に合わせた柔軟な姿勢を見せることも必要です。</p><h2>&nbsp;ピアス跡やピアスホールを隠す方法3選</h2><p>この章では、就活中にピアス跡やピアスホールを隠す方法を3つ解説します。</p><p>主にピアス跡やピアスホールが安定している時の方法です。</p><p>ぜひ、参考にしてください。</p><h3>コンシーラーやファンデーションを使う</h3><p>ピアス跡にコンシーラーやファンデーションを塗って目立たなくする方法です。</p><p>肌の色に近いものを使うと、より目立たなくなります。</p><h3>透明ピアスや肌色ピアスを使う</h3><p>透明なピアスや肌色のピアスを使うと、ピアスホールが目立たなくなります。</p><p>特に透明なピアスは、アクリルやガラス、シリコンなど種類が多いです。</p><p>自身に合うピアスを選ぶことをおすすめします。</p><h3>絆創膏やテープを使う</h3><p>肌の色に近い絆創膏や医療用テープを使う方法です。</p><p>ピアス跡に貼るだけで、簡単に隠せるメリットがあります。</p><p></p><p>ピアス跡やピアスホールを隠す方法を3つ解説しました。</p><p>いずれも髪の毛で隠すより確実性はあります。</p><p>ピアスのことが気になって仕方がないという状況を作らないために、事前の準備が必要です。</p><h2>ピアスを開けたばかりで外せない場合</h2><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-511x340_webp_d5e1fc94-29f0-4495-b7c3-a9f8d4968631.jpg" alt=""><p>ピアスを開けた場合は無理に外すと出血や化膿する恐れがあります。</p><p>この章では、就活前にピアスを開けてしまった場合の対処法を解説します。</p><h3>就活で開けたばかりのピアスは隠せる？</h3><p>開けたばかりのピアスホールを完全に隠す方法はありません。</p><p>開けて1ヶ月前後までのピアスホールは安定しておらず、無理に外すと出血や化膿などの炎症を起こす可能性があります。</p><p>就活前にピアスを開けることはやめましょう。</p><h3>ピアスを開けたばかりで塞ぎたくない</h3><p>初めてピアスを開けたから、ピアスホールを塞ぎたくないと考える方もいるでしょう。</p><p>しかし、就活中はファーストピアスでも外すのが無難です。</p><p>ピアス自体のファッション性が高く、面接や企業説明会で悪目立ちする可能性があるからです。</p><p>付け替えることが可能であれば、透明なピアスや肌の色に近いピアスにしましょう。</p><h2>就活後や業界におけるピアスの扱い</h2><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-511x340_webp_e9e6e9e7-497a-4687-af7e-42e28e36aae8.jpg" alt=""><p>就活が終わり、企業から内定をもらってもピアスの扱いに注意することがあります。</p><p>まずは、就活が終わった後のピアスに関係する注意点を解説します。</p><h3>就活後のピアスの扱い</h3><p>応募した企業から内定をもらっても、業界や企業文化によってピアスを控える必要があります。</p><p>具体的には企業文化や職場の雰囲気に合わせることです。</p><p>1つずつ解説します。</p><p>企業文化に応じた服装に合わせる</p><p>多くの企業では、入社後もピアスを控えるよう求められる可能性が高いです。</p><p>金融や法律、医療などの保守的な業界はピアスからその人に対してマイナスイメージを抱いてしまいます。</p><p>そして、できればピアス跡も目立たないよう対策を取ることをおすすめします。</p><p>職場の雰囲気に合わせる</p><p>同じ企業で働く従業員との服装にも合わせる必要があります。</p><p>企業内で人間関係を作る前の段階では、身だしなみから読み取れる印象が重要だからです。</p><p>たとえ、企業内でピアスを付けることが肯定的であっても、奇抜なデザインはTPOを汲み取れていないと判断されやすいです。</p><p>結果として上司や同僚との人間関係を構築することが難しくなります。</p><h3>業界ごとのピアスの扱い</h3><p>次に、業界ごとに持っているピアスの印象を解説します。</p><p>ピアスの印象は保守的な業界とクリエイティブな業界、サービス業界で違いが見られます。</p><p>就活の際に、参考にしてください。</p><p>保守的な業界</p><p>保守的な業界とは金融や、公務員、医療などの業界を指します。</p><p>これらの業界では就職してもピアスを外すように求められる可能性があります。</p><p>従業員の身だしなみから想像できる印象が、ブランドの信頼性に直接関わっているからです。</p><p>クリエイティブな業界</p><p>クリエイティブな業界であるITやアパレルでは、ピアスが自己表現の一部として比較的寛容です。</p><p>しかし、企業や上司によって考え方が違うため、事前に確認する必要があります。</p><p>サービス業</p><p>ホテルやレストランなどの接客業や営業職は顧客に与える印象が利益に直結します。</p><p>カジュアルでファッション性が高いピアスは外しておくか、シンプルなデザインのものを選ぶと無難です。</p><p>客層や店舗の雰囲気に合わせて、選ぶことをおすすめします。</p><h2>ピアスを付ける際の注意点</h2><p>ピアスをつけたまま就活する際は下記の2つに注意しましょう。</p><ul><li><p>企業が持つピアスの許容度を確認する</p></li><li><p>清潔感を保つ</p></li></ul><p>1つずつ解説します。</p><h3>企業が持つピアスの許容度を確認する</h3><p>応募する企業のWebサイトや口コミサイト、従業員の写真などを参考にします。</p><p>企業の雰囲気や求められている服装を読み取り、受け入れる柔軟性を相手に見せることも重要です。</p><h3>清潔感を保つ</h3><p>就活中にピアスを身に付ける場合は、小さめでシンプルなデザインを選びます。</p><p>ピアスに寛容的な業界でも、その場の雰囲気に合わないものは相手にネガティブなイメージを与えます。</p><p>業界や企業によってピアスに対する印象や許容度は違います。</p><p>自分が働きたいと考える環境に適しているか見極めることが重要です。</p><h2>&nbsp;ピアスは就活を終えてから楽しむのがおすすめ</h2><p>ファッションとしてピアスを楽しみたいと考えているならば、就活が終わった後にしましょう。</p><p>応募する業界によっては身だしなみも採用の判断材料になる可能性があるからです。</p><p>就活中は面接官や採用担当者に、企業の文化に対応できる姿勢が見せられると第一印象も良くなります。</p><p>就職が決まった後は、好きなファッションを自由に楽しむ時間が増えます。</p><p>企業や職場の雰囲気に合わせながら、自分に合うピアスを楽しみましょう。</p><h2>まとめ</h2><p>就活中は、ピアスを外して臨むのが一般的です。</p><p>企業や業界によっては、身だしなみが採用の判断に影響を与えることがあるからです。</p><p>ピアス跡やピアスホールが気になる場合も対策が必要です。</p><p>特に保守的な業界では、ピアスがマイナスイメージを与える可能性があります。</p><p>ピアスが自己表現の一部である場合でも、まずは企業文化に合わせる柔軟性を見せることが大切です。</p><p>就職後、職場の雰囲気に合わせておしゃれを楽しむと良いでしょう。</p>	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/media/covers/1751853188265-uu6l35.webp	published	\N	8808c51e-f25b-468e-afb4-dbf639d72d28	74114e4f-9f4c-45ff-af96-6a1e26668ef0	2025-07-07 01:53:13.152658+00	2025-07-07 01:53:13.152658+00	\N	73825e77-4ac9-4df1-b2a6-acad7032a182
45fed42d-72bb-433f-bc56-0d1cc9ed406d	【就活が辛いあなたへ】就活がうまく行かない理由と辛い時の就活方法まとめ！	turai	「就活が辛い」「就活がうまくいかない…」そんな不安を抱える学生必見！自己分析や企業探し、面接の悩みを解決する具体的な方法を解説。モチベーションを上げ、納得できる就職活動への第一歩を踏み出しましょう！	\N	<p>こんなにやっているのに、なんだか就活がうまくいかない…そもそも何から手を付けたらいいか分からない…。このような不安を抱えている就活生はあなただけではありません。</p><p>一度立ち止まって整理することで、より楽しみながら、自分の納得できる就活をリスタートしませんか？</p><p>今回はこの記事を読むことで、就活のモチベーションが上がらない現状から、原因や対処法を具体的にみていくことですぐに踏み出せる一歩を見つけることができます。</p><h2>うまくいかないと感じる現状</h2><p>就活がうまくいかないと感じる要素は様々です。他の就活生が就活についてどう感じているのか見ていきましょう。その上で、就活をステップに分けて、自分がどこでつまずいているのか現状分析をしてみましょう。</p><h3>うまくいかないと感じている学生は意外と多い</h3><p>みなさまも感じているように、就職活動は年々長期化してきていますよね。</p><p>何から手をつければいいか分からない期間や壁にぶつかっている期間が長くなると、精神的な負荷も大きくなり疲れを感じる機会は多くなってしまいます。そんな中で、肝心の自分自身がやりたいことを見失ってしまったり、モチベーションが湧かなかったりする学生も多いのではないでしょうか。</p><p>実際に、株式会社マイナビが約1700名の2025年卒業予定の学生を対象にした調査によると、2024年2・3月で「就活疲れ」を感じたことがある学生は2月で81.3%、3月で80.5%という結果が出ています。</p><p></p><img src="https://career-research.mynavi.jp/wp-content/uploads/2024/04/image-54-1024x481.png" alt="就活疲れを感じたことはあるか（就活準備を含む）"><p>更に、主な就活疲れの理由として、「自己PRが思いつかない、うまくプレゼンできない」「面接を受けるのに緊張してしまう」が2月時点で30%以上を占めています。</p><p>出典：<a target="_blank" rel="noopener noreferrer nofollow" href="https://career-research.mynavi.jp/reserch/20240424_75008/"><u>2025年卒 学生就職モニター調査 3月の活動状況 | マイナビキャリアリサーチLab (</u></a><a target="_blank" rel="" href="http://mynavi.jp"><u>mynavi.jp</u></a><a target="_blank" rel="noopener noreferrer nofollow" href="https://career-research.mynavi.jp/reserch/20240424_75008/"><u>)</u></a></p><p>このように様々な原因が考えられるからこそ、自分に合った適切な対処法を見つけることが大切です。自分がどこでつまずいているのか分かるように、ステップごとに原因を探ってみましょう。</p><h3>就活ステップ別！つまずくポイント</h3><p>①自己分析</p><p>・自己分析の方法が分からない</p><p>・誰に相談することが的確かわからない</p><p>・自己PRやガクチカが思いつかない</p><p>②企業探し</p><p>・企業の探し方がわからない</p><p>・行きたい企業が見つからない</p><p>③面接、選考会</p><p>・面接で緊張してしまう、うまく話せない</p><p>・選考を通過できず、モチベーションが下がる</p><h2>ステップ別！解決策</h2><p>就活をするうえでの悩みは大きく３つに分けられます。1つは自己分析、2つ目は企業探し、3つ目は面接や選考会の対策方法です。この3つの枠を中心に、納得就活に一歩でも踏み出せるようなポイントをまとめました。</p><h3>自己分析</h3><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-1920x1433_v-frms_webp_a3e0a1b1-6a59-47f7-b67b-7cddd7c44ebf.jpg" alt=""><p>自己分析の方法が分からない</p><p>自己分析は、自分の価値観や将来のビジョン、強みや弱みなどの傾向を知る機会になります。そのための手段として、キャリア診断ツールやMBTIのような簡単なアンケート式診断でツールを使って自分の特徴を知ることも自己理解への第一歩です。</p><p>他にも、最近では企業の会社説明会で実際に企業説明を受けることでキャリアへの解像度もぐんと上がって、結果的に自己分析に繋がるという機会も増えてきています。</p><p>そのため、現時点で興味が湧かない企業の説明会でも一度足を運んでみるのはありかもしれません。そのため、現時点で興味が湧かない企業の説明会でも一度足を運んでみるのはありかもしれません。</p><p>一方で、ひとりで向き合うのではなく第三者目線を取り入れることによって新たな自分を発見できるということも。相談先の選択肢が多いと、メンタル面もより安定しやすいのではないでしょうか。以下で就活の相談先についてみていきましょう。</p><p>誰に相談することが的確かわからない</p><p>まず身近な相談先として、大学のキャリアセンターや就活エージェントが挙げられます。キャリアセンターやエージェントを経由してキャリアコンサルタントを紹介してもらえることも多いです。1対1で一緒に就活を進めていくことができるので、自己分析で何から始めればいいか不安がある人にはおすすめです。</p><p>また、Matcherなどのアプリを活用して気になる人に自己分析を手伝ってもらうことも効果的です。</p><p>自己PRやガクチカが思いつかない</p><p>自己PRやガクチカと聞いてイメージするのは、何かの代表、留学、大会優勝…こういったインパクトのあるエピソードたちではないでしょうか。確かに魅力的なエピソードではありそうですが、全員がこのような経験をしているわけではもちろん無いですよね。</p><p>このようなイメージが流布しているからこそ、かえって身近なエピソードこそ伝え方次第で相手にしっかりと印象付けられるのではないでしょうか。</p><p>例えば、何か日常の課題を解決したこと(一人暮らしでの困りごと)、新しく挑戦したこと(趣味、課外活動)、後輩に何か教えた経験(バイトや授業)、何か継続した経験(自炊、ダイエットなど)などでも、エピソードを広げていくと、そこでぶつかった困難を　どんな長所を活かして　どのように乗り越えたか　が少しでも出てくるはずです。</p><p>このようなポイントを意識することで、身近なエピソードでも、あなたの人柄や魅力は面接官にしっかりと伝わるのではないでしょうか。</p><p>さらに、そこに数値的な目標設定と結果があればより説得力のある自己PR・ガクチカになるでしょう。気負わずに、行き詰まったら第三者の力を借りて「自分では気づけない自分のすごいところ」を聞いてみるのもいいかもしれません。</p><h3>企業探し</h3><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-1920x1280_v-frms_webp_f3a9aee0-18b0-49b8-bf2c-0281c0299e7d.jpg" alt=""><p>企業の探し方がわからない</p><p>多くの学生がナビサイトやオファー型の就活サービス、エージェントなどを利用して気になる企業を探しているようです。実際に、2024年5月に540名の就活生を対象に実施されたアンケートによると、企業の情報収集のために利用していたものは47.8%がナビサイト、41.9%が就活エージェントという結果が出ています。</p><p>出典：株式会社マーキュリー/【2024年新卒社員アンケート調査結果】就活ナビサイトが情報収集の主要手段<a target="_blank" rel="noopener noreferrer nofollow" href="https://prtimes.jp/main/html/rd/p/000000128.000098241.html"><u>https://</u></a><a target="_blank" rel="" href="http://prtimes.jp/main/html/rd/p/000000128.000098241.html"><u>prtimes.jp/main/html/rd/p/000000128.000098241.html</u></a></p><p>また、合同説明会や座談会イベントを通じて企業を知るという学生もいます。</p><p>行きたい企業が見つからない</p><p>上記のような方法を試しても、中々自分が行きたいと思える企業と出会えないという悩みを持った就活生は多いのではないでしょうか。特に、志望する業界や職種が現時点で絞られているという人は、そもそも条件に合う企業の母数が少なく妥協することになってしまう人もいるかもしれません。</p><p>しかし、今まであまり触れてこなかった業界や職種を知ることで、新たな興味分野が開拓されることも多くあります。例えばマーケティングがやりたくて広告業界を見ていたが、IT企業のデータ分析を活用したマーケティングに興味を持ち、結果IT企業も視野に入れるといった場合などが挙げられます。</p><p>このように、一度志望する業界や職種を見直してみるのもひとつの手段です。</p><h3>面接、選考会対策</h3><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-1920x1280_v-frms_webp_b6fc0ef6-bc73-409a-b317-ae976a86d3e0.jpg" alt=""><p>面接で緊張してしまう、うまく話せない</p><p>面接は、将来を大きく左右する場面であるというプレッシャーや、初対面の面接官と話す不安感などでストレスの原因になり得る要素は多く挙げられます。</p><p>しかし、このようなプレッシャーや不安は誰しも感じるもの。友人やキャリアセンター、場合によってはキャリアコンサルタントなどの力も借りながら、とにかく場数を積むのが緊張や不安を解消する近道かもしれません。Matcherなどのアプリで面接練習を申し込むのもひとつの手段です。</p><p>選考を通過できず、モチベーションが下がる</p><p>また、いざ選考受けても、中々次に進めない、内定が出ない…そう焦ってしまったり、途中でモチベーションが下がってしまう人もいるのではないでしょうか。</p><p>選考に通過できない原因は、面接時のビジネスマナーや言葉に詰まるなどの原因も考えられますが、意外と初心に返った自己分析が現状打破の一歩となることも。</p><p>もし面接時における受け答えの内容にまだ納得がいっていないのであれば、この章の冒頭に挙げた自己分析に戻ってみるのもありなのではないでしょうか。また、面接練習を重ねる中でフィードバックをもらい、修正を繰り返すことも効果的です。</p><h2>モチベーションを探るために…</h2><p>そうは言っても、自分と向き合うことが長期戦になってくると疲れてしまうタイミングはこれからもまた訪れるかもしれませんし、思い切ってリフレッシュをすることも大切です。</p><p>映画や音楽、運動といった自身の趣味を楽しむ時間をつくるのも良いですね。</p><p>また、自己分析など就活を進めていく中でやりたいことが見つかれば、それが大きなモチベーションに変わることも多くあります。</p><p>どうしても前に進む一歩が踏み出せない…！という時は、大学のキャリアセンターや就活エージェントに相談するか、または友人経由で相談先を紹介してもらうなど、周囲の力をめいっぱい借りていきましょう。</p><h2>まとめ</h2><p>いかがでしたでしょうか。答えのないものだからこそ一人で悩んでしまいがちな就職活動ですが、そんなときは焦らず、就活サポートや知人を頼りながら自分の現状を見返してみるのも良いかもしれません。</p><p>就職活動でつまずく原因はたくさんありますが、ここまででご自身がつまずいているポイントが少しでも明確になり、前に進むきっかけとなっていれば幸いです。ご自身の状況に合った修正を加えながら、少しずつでも就職活動を軌道に乗せて納得就活を目指していきましょう。</p><p></p>	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/media/covers/1751936096971-89ajq8.webp	published	\N	8808c51e-f25b-468e-afb4-dbf639d72d28	74114e4f-9f4c-45ff-af96-6a1e26668ef0	2025-07-08 00:55:09.36288+00	2025-07-08 00:55:09.36288+00	\N	5ebe225c-74a2-4e1b-bd7d-27b7d62aacb0
ad08f695-2e1c-473b-897b-9c740bc7b549	【2025年最新版】長期インターンおすすめサイト5選｜失敗しない選び方と活用法	recomendintern	「2025年最新版｜長期インターンおすすめサイト5選を徹底比較！失敗しない選び方や成功のコツ、よくある疑問にも答えます。大学生必見のキャリアアップガイド。今すぐ理想のインターン先を見つけよう！」	\N	<p>みなさんこんにちは！</p><p>「大学生活のうちに、何か将来につながる経験をしたい…。」<br>「就職活動で他の学生と差をつけたい…。」</p><p>そんな悩みを持つあなたにおすすめなのが、<strong>長期インターン</strong>です。</p><p>しかし、いざ探してみると、<br>「どのサイトを使えばいいかわからない」<br>「どんな企業を選ぶべきか迷う…」<br>と感じることも多いはず。</p><p>この記事では、<strong>長期インターン探しで失敗しないためのおすすめサイト5選</strong>を厳選してご紹介します。</p><p>さらに、<strong>自分に合った企業を見つけるコツ</strong>や<strong>成功するためのポイント</strong>も徹底解説！</p><p>この記事を読み終わるころには、<br>✅ 自分に合った長期インターン求人サイトを見つけることができる<br>✅ 迷わず次の一歩を踏み出せる</p><p>そんな状態を目指します。</p><p><strong>さあ、あなたの未来への第一歩を一緒に踏み出しましょう！</strong></p><h2><strong>2. 長期インターンとは？</strong></h2><h3><strong>🔸 長期インターンとは？</strong></h3><p><strong>長期インターン</strong>とは、一般的に<strong>3ヶ月以上</strong>の期間、企業で実務を経験することを指します。<br>短期インターン（1日〜数週間）と違い、<strong>実際の業務に深く関わりながらスキルを習得</strong>し、企業文化やビジネスマナーも学ぶことができます。</p><p><strong>🔹短期インターンとの違い</strong></p><p><strong>項目</strong></p><p><strong>長期インターン</strong></p><p><strong>短期インターン</strong></p><p><strong>期間</strong></p><p>3ヶ月以上</p><p>1日〜数週間</p><p><strong>目的</strong></p><p>実務経験・スキル習得</p><p>企業理解・職場体験</p><p><strong>業務内容</strong></p><p>プロジェクト参画</p><p>見学や体験が中心</p><h2><strong>🔸 長期インターンのメリット</strong></h2><h3><strong>✅ 1. 実践的なスキルが身につく</strong></h3><p>長期インターンでは、<strong>机上の学問では得られないリアルな実務経験</strong>を積むことができます。</p><ul><li><p><strong>例①：マーケティング職</strong> → データ分析から戦略立案まで実務を経験</p></li><li><p><strong>例②：エンジニア職</strong> → 実際の開発プロジェクトに参加</p></li></ul><p>📌 <strong>POINT<br></strong>インターン終了後も使える、<strong>実践的なスキル</strong>を習得できることが大きな強みです。</p><h3><strong>✅ 2. 就職活動で有利になる</strong></h3><p>長期インターン経験は、エントリーシートや面接で強力なアピールポイントになります。</p><ul><li><p><strong>例①：ESでの記載</strong> → 「実際にプロジェクトで成果を出した経験」を記載できる</p></li><li><p><strong>例②：面接でのエピソード</strong> → 実務経験に基づいたエピソードが語れる</p></li></ul><p>📌 <strong>POINT<br></strong>企業は<strong>実践経験のある学生</strong>を高く評価します。選考が有利に進む可能性大！</p><h3><strong>✅ 3. ビジネスマナーが身につく</strong></h3><ul><li><p>報連相（報告・連絡・相談）</p></li><li><p>ビジネスメールや電話対応</p></li><li><p>社内外のコミュニケーションスキル</p></li></ul><p>📌 <strong>POINT<br></strong>社会人としての基礎力が自然と身につき、入社後のギャップが少なくなります。</p><h3><strong>✅ 4. キャリアの方向性が見える</strong></h3><ul><li><p><strong>「自分は営業が向いているのか？」</strong></p></li><li><p><strong>「デスクワークよりもフィールドワークが好きだな」</strong></p></li></ul><p>📌 <strong>POINT<br></strong>自分の得意分野や興味関心を、実際の経験を通じて発見できます。</p><h3><strong>✅ 5. 人脈が広がる</strong></h3><ul><li><p>社会人との交流が増える</p></li><li><p>同期インターン生とのつながりができる</p></li></ul><p>📌 <strong>POINT<br></strong>将来的に就職や転職で助け合える<strong>ネットワーク</strong>が構築されます。</p><p></p><h2><strong>🔸 長期インターンのデメリット</strong></h2><h3><strong>⚠️ 1. 学業との両立が難しい</strong></h3><ul><li><p><strong>週3日以上の出勤</strong>が求められることが多い</p></li><li><p><strong>授業や試験との調整</strong>が難しい場合がある</p></li></ul><p>📌 <strong>対策</strong></p><ul><li><p>事前に<strong>企業のシフト条件</strong>をしっかり確認する</p></li><li><p>学業優先を企業に伝え、柔軟なシフトを相談する</p></li></ul><p></p><h3><strong>⚠️ 2. 無給のインターンも存在する</strong></h3><ul><li><p>一部の企業では無給インターンが実施されている</p></li><li><p>学生側に金銭的負担がかかる場合も</p></li></ul><p>📌 <strong>対策</strong></p><ul><li><p>求人情報で<strong>報酬の有無</strong>を必ず確認する</p></li><li><p>長期的に無給が難しい場合は、有給インターンを選ぶ</p></li></ul><p></p><h3><strong>⚠️ 3. 自分に合わない企業に当たるリスク</strong></h3><ul><li><p>インターン開始後に<strong>仕事内容や社風が合わない</strong>と感じることがある</p></li><li><p>想像していた業務内容と違う場合も</p></li></ul><p>📌 <strong>対策</strong></p><ul><li><p>事前に<strong>企業文化や仕事内容</strong>をよく調べる</p></li><li><p>インターン面談時に具体的な業務内容を確認する</p></li></ul><p></p><h3><strong>⚠️ 4. 短期間では成果が見えにくい</strong></h3><ul><li><p>最初は簡単な業務しか任されないこともある</p></li><li><p>成果を感じるまでに時間がかかる</p></li></ul><p>📌 <strong>対策</strong></p><ul><li><p>最低3ヶ月以上の参加を前提にする</p></li><li><p>自主的にタスクを提案し、成長機会を掴む</p></li></ul><p></p><h3><strong>⚠️ 5. インターンに依存しすぎるリスク</strong></h3><ul><li><p>インターンに没頭しすぎて<strong>大学生活や他の経験が疎かになる</strong></p></li><li><p>すべてのキャリア形成がインターンだけで完結するわけではない</p></li></ul><p>📌 <strong>対策</strong></p><ul><li><p>インターンはあくまで<strong>手段の一つ</strong>と理解する</p></li><li><p>学業やサークル活動など、バランスを意識する</p></li></ul><p></p><h2><strong>🔸 メリット・デメリットまとめ</strong></h2><p><strong>メリット</strong></p><p><strong>デメリット</strong></p><p>実践的なスキルが身につく</p><p>学業との両立が難しい</p><p>就職活動で有利になる</p><p>無給の場合がある</p><p>ビジネスマナーが習得できる</p><p>自分に合わないリスク</p><p>キャリアの方向性が見える</p><p>短期間では成果が出にくい</p><p>人脈が広がる</p><p>インターンに依存しすぎるリスク</p><h2><strong>🔸 まとめ</strong></h2><p>長期インターンには多くの<strong>メリット</strong>がある一方、注意すべき<strong>デメリット</strong>も存在します。<br>しかし、事前にリスクを理解し、適切に対策を講じることで、長期インターンの価値を最大化できます。</p><p>次章では、<strong>おすすめの長期インターン求人サイト5選</strong>を紹介します。<br>あなたにピッタリのインターン先を見つけて、充実した経験を手に入れましょう！</p><p>ありがとうございます！では、次に*<em>「3. 長期インターンおすすめサイト5選」</em>*の章を見ていきましょう。</p><h1><strong>✍️ 3. 長期インターンおすすめサイト5選</strong></h1><h2><strong>3. 長期インターンおすすめサイト5選</strong></h2><p>「長期インターンを探そう！」と思っても、どのサイトを使えば良いか迷ってしまうこともありますよね。<br>ここでは、信頼性が高く、大学生に特におすすめの長期インターンサイトを5つご紹介します。</p><h3><strong>① Wantedly（ウォンテッドリー）</strong></h3><ul><li><p><strong>特徴</strong>：企業のビジョンや文化に共感した人材を募集するマッチングプラットフォーム。</p></li><li><p><strong>求人数</strong>：国内最大級。幅広い業界・職種をカバー。</p></li><li><p><strong>サポート</strong>：気になる企業には「話を聞きに行く」ボタンから気軽にアプローチ可能。</p></li><li><p><strong>おすすめポイント</strong>：リモートワークや柔軟な働き方が可能な求人が多い。<br>🔗<a target="_blank" rel="noopener noreferrer nofollow" href="https://www.wantedly.com"> <u>公式サイトはこちら</u></a></p></li></ul><p><strong>👉 こんな人におすすめ</strong></p><ul><li><p>企業文化や価値観を重視したい人</p></li><li><p>フレキシブルな働き方を求めている人</p></li></ul><p></p><h3><strong>② Infra（インフラ）</strong></h3><ul><li><p><strong>特徴</strong>：大学生向け長期インターンに特化した求人サイト。</p></li><li><p><strong>求人数</strong>：IT、マーケティング、コンサルなど幅広い職種。</p></li><li><p><strong>サポート</strong>：キャリアアドバイザーによる相談サービス。</p></li><li><p><strong>おすすめポイント</strong>：大学生のための研修プログラムやサポート体制が充実。<br>🔗<a target="_blank" rel="noopener noreferrer nofollow" href="https://intern-career.com"> <u>公式サイトはこちら</u></a></p></li></ul><p><strong>👉 こんな人におすすめ</strong></p><ul><li><p>キャリア相談をしっかり受けたい人</p></li><li><p>ITやマーケティング分野に興味がある人</p></li></ul><p></p><h3><strong>③ ゼロワンインターン</strong></h3><ul><li><p><strong>特徴</strong>：特にスタートアップ企業の求人が多い。</p></li><li><p><strong>求人数</strong>：少数精鋭のスタートアップやベンチャー企業が中心。</p></li><li><p><strong>サポート</strong>：推薦状制度やスカウトサービスが魅力。</p></li><li><p><strong>おすすめポイント</strong>：経営層に近いポジションで働ける求人が多い。<br>🔗<a target="_blank" rel="noopener noreferrer nofollow" href="https://01intern.com"> <u>公式サイトはこちら</u></a></p></li></ul><p><strong>👉 こんな人におすすめ</strong></p><ul><li><p>スタートアップで裁量権を持って働きたい人</p></li><li><p>経営層の近くで学びたい人</p></li></ul><p></p><h3><strong>④ Renew（リニュー）</strong></h3><ul><li><p><strong>特徴</strong>：自分の興味や身につけたいスキルからインターン先を探せる。</p></li><li><p><strong>求人数</strong>：幅広い職種・業界に対応。</p></li><li><p><strong>サポート</strong>：無料相談サポートが充実。</p></li><li><p><strong>おすすめポイント</strong>：キャリア形成を重視したアドバイスが受けられる。<br>🔗<a target="_blank" rel="noopener noreferrer nofollow" href="https://renew-career.com"> <u>公式サイトはこちら</u></a></p></li></ul><p><strong>👉 こんな人におすすめ</strong></p><ul><li><p>スキルを明確に身につけたい人</p></li><li><p>キャリア形成に真剣に向き合いたい人</p></li></ul><p></p><h3><strong>⑤ 学転インターン</strong></h3><ul><li><p><strong>特徴</strong>：本気で成長できる求人のみ掲載</p></li><li><p><strong>求人数</strong>：ベンチャー企業やスタートアップが多い。</p></li><li><p><strong>サポート</strong>：長期インターンの経験を活かした就活を行うことができる</p></li><li><p><strong>おすすめポイント</strong>：ここでインターンをすることで、自分の職務経歴書が描けるようになる。<br>🔗<a target="_blank" rel="noopener" href="https://intern.gakuten.co.jp/"> <u>公式サイトはこちら</u></a></p></li></ul><p><strong>👉 こんな人におすすめ</strong></p><ul><li><p>起業を考えている人</p></li><li><p>就活で経営幹部になりたい人</p></li></ul><h2><strong>🔸 おすすめサイト比較表</strong></h2><p><strong>サイト名</strong></p><p><strong>求人数</strong></p><p><strong>サポート内容</strong></p><p><strong>特徴</strong></p><p><strong>Wantedly</strong></p><p>豊富</p><p>企業との直接対話</p><p>柔軟な働き方</p><p><strong>Infra</strong></p><p>多い</p><p>キャリア相談あり</p><p>IT系が充実</p><p><strong>ゼロワン</strong></p><p>多い</p><p>推薦状・スカウト制度</p><p>経営層の近くで働ける</p><p><strong>Renew</strong></p><p>多い</p><p>無料相談サポート</p><p>キャリアアドバイス</p><p><strong>学生転職</strong></p><p>多い</p><p>就活につながる</p><p>職務経歴書が書ける</p><h2><strong>🔸 サイト選びのポイント</strong></h2><ol><li><p><strong>目的に合ったサイトを選ぶ</strong></p><p>キャリア形成 → <strong>学転インターン</strong></p><p>スタートアップ経験 → <strong>ゼロワンインターン</strong></p></li><li><p><strong>サポートの有無</strong></p><p>しっかり相談したい → <strong>Infra</strong></p><p>気軽に相談したい → <strong>Renew</strong></p></li><li><p><strong>求人数・業界の幅</strong></p><p>幅広い選択肢 → <strong>Wantedly</strong></p></li></ol><p></p><h2><strong>🔸 まとめ</strong></h2><p>長期インターンは<strong>サイト選びが成功のカギ</strong>です。<br>自分の目的や優先順位に合わせて、適切なサイトを選びましょう。</p><p>次章では、<strong>失敗しないインターン選びのコツ</strong>をご紹介します！🚀</p><h2><strong>4. 失敗しない長期インターンの選び方</strong></h2><p>長期インターンを最大限に活用するためには、<strong>自分に合ったインターン先を選ぶこと</strong>が重要です。<br>ここでは、<strong>成功するための選び方のポイント</strong>を解説します。</p><p></p><h3><strong>🔸 1. 目的・目標を明確にする</strong></h3><p>長期インターンは「なんとなく」で選んでしまうと後悔しやすいです。<br>以下のポイントを考えてみましょう。</p><p><strong>✅ 何を学びたいのか？</strong></p><ul><li><p>営業スキルを身につけたい</p></li><li><p>プログラミングを学びたい</p></li></ul><p><strong>✅ どんな経験をしたいのか？</strong></p><ul><li><p>実際のプロジェクトに参加したい</p></li><li><p>経営層に近いポジションで働きたい</p></li></ul><p><strong>✅ 将来のキャリアにどうつなげたいのか？</strong></p><ul><li><p>就活でのアピール材料を作りたい</p></li><li><p>自分の適性を見つけたい</p></li></ul><p>📌 <strong>POINT:</strong> 目的が明確であれば、企業選びがスムーズになります。</p><p></p><h3><strong>🔸 2. 企業選びのポイント</strong></h3><p><strong>✅ 勤務条件を確認する</strong></p><ul><li><p><strong>週何日働けるか？</strong>（例：週3日以上の勤務が必要か）</p></li><li><p><strong>リモート勤務は可能か？</strong></p></li></ul><p><strong>✅ 企業文化やビジョンを確認する</strong></p><ul><li><p><strong>企業のミッションやビジョン</strong>が自分の価値観と合っているか？</p></li><li><p><strong>社内の雰囲気や働きやすさ</strong></p></li></ul><p><strong>✅ 職種・業務内容</strong></p><ul><li><p>自分がやりたい職種の募集があるか</p></li><li><p>任される業務が具体的か</p></li></ul><p>📌 <strong>POINT:</strong> 面談時に<strong>業務内容や期待される役割</strong>を確認することが重要です。</p><p></p><h3><strong>🔸 3. インターン先のリサーチ方法</strong></h3><p><strong>✅ 企業の評判をチェック</strong></p><ul><li><p>SNSや口コミサイトでリアルな声を調査</p></li><li><p>過去のインターン生の体験談を読む</p></li></ul><p><strong>✅ 面接・面談で確認する</strong></p><ul><li><p><strong>任される業務の範囲</strong></p></li><li><p><strong>成長機会があるか？</strong></p></li><li><p><strong>どんな人が働いているか？</strong></p></li></ul><p>📌 <strong>POINT:</strong> 気になることは面接や事前面談で必ず質問しましょう！</p><p></p><h3><strong>🔸 4. よくある失敗例と対策</strong></h3><p><strong>❌ 学業との両立が難しい<br></strong>→ <strong>対策:</strong> 事前にシフトや業務時間を確認し、学業優先を伝える。</p><p><strong>❌ 期待していた業務内容と違う<br></strong>→ <strong>対策:</strong> 面談時に具体的な業務内容を質問する。</p><p><strong>❌ 成長できる環境ではなかった<br></strong>→ <strong>対策:</strong> 先輩インターン生の体験談を確認し、成長機会の多い企業を選ぶ。</p><p></p><h3><strong>🔸 5. インターン選びチェックリスト</strong></h3><p>以下のチェックリストを使って、自分に合ったインターン先を見つけましょう！</p><p>✅ インターンの目的は明確か？<br>✅ 学業と両立できる勤務条件か？<br>✅ 企業のビジョンに共感できるか？<br>✅ 任される業務内容は明確か？<br>✅ 成長機会はありそうか？<br>✅ 評判や口コミは確認したか？</p><p></p><h2><strong>🔸 まとめ</strong></h2><p>長期インターンを選ぶ際は、<strong>目的の明確化</strong>・<strong>企業文化や業務内容の確認</strong>・<strong>リサーチ</strong>が重要です。</p><p>「なんとなく」で選ぶのではなく、<strong>自分が何を得たいのか</strong>をしっかり考え、適切な企業を選びましょう。</p><p>次章では、<strong>長期インターンを成功させるためのコツ</strong>をご紹介します！🚀</p><p></p><h2><strong>5. 長期インターンを最大限に活用するコツ</strong></h2><p>せっかく長期インターンに参加するなら、<strong>最大限の学びと成果を得たい</strong>ですよね。<br>ここでは、長期インターンを<strong>成功に導くためのコツ</strong>を解説します。</p><p></p><h3><strong>🔸 1. 主体性を持って行動する</strong></h3><p>インターン中に最も重要なのは、*<em>「指示待ちではなく、自ら考えて動くこと」</em>*です。</p><ul><li><p><strong>✅ 自分からタスクを提案する</strong>：「次に何をすれば良いですか？」ではなく「次はこの業務を進めて良いですか？」と聞く。</p></li><li><p><strong>✅ 積極的に質問する</strong>：「どうすればもっと良くできますか？」と改善意識を示す。</p></li></ul><p>📌 <strong>POINT:</strong> 積極的な姿勢は、周囲からの信頼や成長機会を引き寄せます。</p><p></p><h3><strong>🔸 2. フィードバックを積極的に受け入れる</strong></h3><p>インターン中に受けるフィードバックは<strong>成長の宝庫</strong>です。</p><ul><li><p><strong>✅ 指摘は感謝して受け入れる</strong>：「ありがとうございます。次回改善します！」</p></li><li><p><strong>✅ 具体的な改善策を考える</strong>：「どの部分をどう改善すれば良いか？」を考える。</p></li></ul><p>📌 <strong>POINT:</strong> フィードバックを受け入れ、改善を繰り返すことで、成長スピードが加速します。</p><p></p><h3><strong>🔸 3. 短期・中期・長期の目標を設定する</strong></h3><p>目標がなければ、インターンは「ただの時間つぶし」になってしまいます。</p><ul><li><p><strong>✅ 短期目標:</strong> 1ヶ月で業務フローを完全に理解する。</p></li><li><p><strong>✅ 中期目標:</strong> プロジェクトの一部をリードする。</p></li><li><p><strong>✅ 長期目標:</strong> 自分の担当領域で成果を出す。</p></li></ul><p>📌 <strong>POINT:</strong> 目標設定により、日々の行動に明確な指針が生まれます。</p><p></p><h3><strong>🔸 4. 業務外のコミュニケーションも大切にする</strong></h3><p>業務以外での人間関係も、長期インターンを成功させるカギです。</p><ul><li><p><strong>✅ ランチや懇親会に積極的に参加する</strong></p></li><li><p><strong>✅ 上司や同僚と気軽に話せる関係性を築く</strong></p></li></ul><p>📌 <strong>POINT:</strong> コミュニケーションが円滑になることで、業務もスムーズに進みます。</p><p></p><h3><strong>🔸 5. 定期的に振り返りを行う</strong></h3><p>振り返りは、自分の成長を確認し、次に進むための重要なステップです。</p><ul><li><p><strong>✅ 週に1回は自分の業務を振り返る</strong>：「今週は何ができて、何ができなかったか？」</p></li><li><p><strong>✅ 改善点をリストアップ</strong>：「来週はどんな改善をするか？」</p></li></ul><p>📌 <strong>POINT:</strong> 定期的な振り返りで成長の軌跡を確認し、自信につなげましょう。</p><p></p><h3><strong>🔸 6. よくある失敗例と対策</strong></h3><p><strong>❌ 目的が曖昧なまま過ごしてしまう<br></strong>→ <strong>対策:</strong> 参加前に目的と目標を明確にし、紙に書き出しておく。</p><p><strong>❌ 受け身の姿勢で指示を待つ<br></strong>→ <strong>対策:</strong> 毎日、自分から1つは「新しい提案」をすることを意識する。</p><p><strong>❌ 途中で諦めてしまう<br></strong>→ <strong>対策:</strong> 困ったときは上司や先輩に相談し、サポートを受ける。</p><p></p><h2><strong>🔸 まとめ</strong></h2><p>長期インターンを最大限に活用するためには、<strong>主体性</strong>・<strong>フィードバックの受け入れ</strong>・<strong>目標設定</strong>が重要です。<br>また、業務外のコミュニケーションや定期的な振り返りを行うことで、成長の質が向上します。</p><p>次章では、*<em>よくある質問（FAQ）</em>*を通じて、長期インターンの疑問を解消します！</p><p></p><h2><strong>6. よくある質問（FAQ）</strong></h2><p>長期インターンに関する疑問や不安を、よくある質問形式で解消します！</p><p></p><h3><strong>Q1. 長期インターンは有給ですか？</strong></h3><p><strong>A:</strong> 長期インターンは有給・無給の両方があります。</p><ul><li><p><strong>有給:</strong> 成果に応じて報酬が支払われる企業が多いです。</p></li><li><p><strong>無給:</strong> スキル習得や経験重視のインターンでは無給の場合もあります。</p></li></ul><p><strong>👉 対策:</strong> 求人情報や面接時に<strong>報酬の有無</strong>を必ず確認しましょう。</p><p></p><h3><strong>Q2. 長期インターンの応募に必要なスキルは？</strong></h3><p><strong>A:</strong> 企業や職種によって異なりますが、以下のスキルが重視されることが多いです。</p><ul><li><p><strong>コミュニケーション能力</strong></p></li><li><p><strong>基本的なPCスキル（Excel, Word）</strong></p></li><li><p><strong>積極性や主体性</strong></p></li></ul><p><strong>👉 アドバイス:</strong> 応募前に、求人票に記載された<strong>必須スキル</strong>を確認し、足りない部分は基礎学習をしておきましょう。</p><p></p><h3><strong>Q3. 学業との両立はできますか？</strong></h3><p><strong>A:</strong> 多くの企業は、学生の学業を優先する姿勢を持っています。</p><ul><li><p><strong>ポイント:</strong> 勤務日数や時間に柔軟性がある企業を選ぶ。</p></li><li><p><strong>例:</strong> 週2〜3日の勤務、リモートワーク可能な企業</p></li></ul><p><strong>👉 アドバイス:</strong> 面接時に<strong>学業優先であること</strong>をしっかり伝えましょう。</p><p></p><h3><strong>Q4. 長期インターンはどれくらいの期間が理想ですか？</strong></h3><p><strong>A:</strong> 一般的には<strong>3ヶ月以上</strong>が推奨されます。</p><ul><li><p>1ヶ月目: 業務に慣れる段階</p></li><li><p>2ヶ月目: 自分の役割を理解し、業務を進める</p></li><li><p>3ヶ月目以降: 自主的に提案や改善活動ができる</p></li></ul><p><strong>👉 アドバイス:</strong> 理想は<strong>6ヶ月〜1年</strong>程度。長期的に参加することでより深い学びが得られます。</p><p></p><h3><strong>Q5. インターン先の企業選びで失敗しないためには？</strong></h3><p><strong>A:</strong> 以下のポイントに注意して企業を選びましょう。</p><ul><li><p><strong>目的に合った業務内容か？</strong></p></li><li><p><strong>勤務条件や環境が自分に合っているか？</strong></p></li><li><p><strong>過去のインターン生の体験談は良いか？</strong></p></li></ul><p><strong>👉 アドバイス:</strong> 事前に企業との面談や質問時間を設け、気になることはすべて確認しましょう。</p><p></p><h3><strong>Q6. リモートワークは可能ですか？</strong></h3><p><strong>A:</strong> リモートワークを導入している企業も増えています。</p><ul><li><p><strong>完全リモート:</strong> 全国どこからでも働ける</p></li><li><p><strong>一部リモート:</strong> 週数回の出社が必要</p></li></ul><p><strong>👉 アドバイス:</strong> 求人情報や面接時に<strong>リモート対応の有無</strong>を確認しましょう。</p><p></p><h3><strong>Q7. インターンで得た経験は就職活動にどう活かせますか？</strong></h3><p><strong>A:</strong> 以下の点で活かせます。</p><ul><li><p><strong>エントリーシート:</strong> 実務経験を具体的にアピールできる</p></li><li><p><strong>面接:</strong> 成果や経験をエピソードとして語れる</p></li><li><p><strong>業界・企業理解:</strong> 興味のある分野の理解が深まる</p></li></ul><p><strong>👉 アドバイス:</strong> インターン期間中に<strong>成果物やエピソード</strong>を意識的にまとめておきましょう。</p><h2></h2><h2><strong>🔸 まとめ</strong></h2><p>長期インターンは、不安や疑問がつきものです。<br>しかし、しっかりと準備をし、疑問点を解消してから臨むことで、得られる経験や成長は大きなものになります。</p><p>もしこの記事を読んで<strong>さらに疑問があれば</strong>、ぜひ各サポート窓口や公式サイトに相談してみてください。</p><p>次章では、<strong>まとめと行動へのステップ</strong>を解説します！🚀</p><p>ここまで、長期インターンを探し、成功させるためのポイントを詳しく解説してきました。<br>最後に、この記事の要点を振り返ってみましょう！</p><h2><strong>🔸 この記事を読んでくださったあなたへ</strong></h2><p>あなたが自分に合った長期インターンを見つけ、<strong>素晴らしい経験と成長</strong>を手に入れることを心から願っています。<br>行動するのは<strong>今</strong>です。自分の未来を、自分の手でつかみましょう！🔥</p><p></p>	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/media/covers/1751936946562-gz3djf.webp	published	\N	8808c51e-f25b-468e-afb4-dbf639d72d28	572d3dcc-618e-4767-92ec-fb22011cfb73	2025-07-08 01:09:28.714445+00	2025-07-08 01:09:28.714445+00	\N	d3851c91-eba8-48fb-bfab-ef6c676a22f4
17f75edc-f334-4007-9098-165f63a47c9f	【27卒向け】就活の進め方ガイド｜大学2年生が今すぐ取り組むべきこと	27syuukatususumekata	「27卒向け就活ガイド。大学2年生が取り組むべき準備5選とよくある質問を徹底解説。早期行動が成功のカギ！」	\N	<p>こんにちは。<br>株式会社MakeCultureの上田です。</p><p>「27卒の就活って、いつから動けばいいの？」と悩んでいる大学2年生の方も多いと思います。実は、<strong>大学2年生の冬</strong>こそが、就活のスタートに最適なタイミングです。</p><p>この時期に準備を始めることで、自己分析や業界研究にじっくり取り組み、周りと差をつけることができます。本記事では、<strong>27卒の就活の進め方</strong>を5つのステップで解説し、さらに「よくある疑問と回答」もお届けします。</p><p>「何をすればいいかわからない…」という方も、この記事を参考に行動に移してみてください。</p><p></p><p></p><h2>1. 就活スケジュールを理解する｜まずは全体像を把握しよう</h2><p>就活準備の第一歩は「<strong>スケジュールの把握</strong>」です。就活は大学3年生の春から本格化し、特に夏のインターンシップがその出発点となります。このインターンシップは早期選考へとつながるケースも多く、「<strong>就活の第一関門</strong>」といえるでしょう。</p><p>「夏季インターンシップ」の選考が始まったタイミングで就活への不安を残さないためにも、自己分析や業界・企業研究を始めるタイミングとして「<strong>大学2年生の冬</strong>」はベストといえます。時間に余裕があるこの時期だからこそ、自分と向き合い、じっくりと就活準備を進めていきましょう。</p><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-2400x1350_v-frms_webp_82ecf90b-6a6e-41b9-ab17-35774f964f0c.png" alt=""><p><strong>就活の主な流れ</strong></p><ul><li><p><strong>大学2年生冬〜春</strong>：自己分析・業界研究を始める</p></li><li><p><strong>大学3年生夏</strong>：サマーインターンの選考・参加</p></li><li><p><strong>大学3年生秋〜冬</strong>：本選考に向けた準備（エントリーシート、面接対策）</p></li><li><p><strong>大学4年生春</strong>：本選考開始、内定獲得</p></li></ul><p>「就活なんてまだ先…」と思っていると、あっという間にチャンスを逃してしまいます。今からしっかりとスケジュールを把握し、余裕を持って就活に臨みましょう。</p><p></p><h2>2. 就活準備：やるべきこと5選｜今から取り組むべき行動とは？</h2><p>就活準備は「何から手をつけるべきか分からない」という方も多いはずです。そこで、大学2年生が今やるべき準備を5つのステップで解説します。</p><img src="https://storage.googleapis.com/studio-cms-assets/projects/4Ra4b0rGOD/s-1280x720_v-fms_webp_1b1283c1-4154-47c3-b12c-64f854b8836e.png" alt=""><h3>① 自己分析を行う｜就活の軸を見つける第一歩</h3><p>就活の準備で最初に取り組むべきは「<strong>自己分析</strong>」です。自分の強みや価値観を理解していない状態で就活に臨むと、志望する業界や企業を選ぶ際に迷ってしまいます。<br>自己分析では、これまでの経験を振り返り、「何にやりがいを感じたか」「どんなことを大切にしてきたか」を考えましょう。</p><p>例えば、サークル活動で後輩をサポートする役割が楽しかったなら「人を支える仕事」に向いているかもしれませんし、アルバイトで売上アップを目指して工夫した経験があるなら「課題解決力」や「計画力」が強みだと言えます。</p><p>「自己分析」の進め方もさらに詳しく知りたいという方は、以下の記事もぜひ読んでみてください。</p><h3>② 業界・企業研究を始める｜視野を広げて選択肢を増やそう</h3><p>自己分析を通じて自分の興味や強みが見えてきたら、次は「<strong>業界・企業研究</strong>」に進みましょう。この時期は、「軸を絞り切る」のではなく「視野を広げること」が大切です。特定の業界に絞り込む必要はなく、幅広い分野に目を向けましょう。</p><p>また、同じ業界でも企業ごとに事業内容や働き方は異なります。企業の公式サイトや就活情報サイトを活用し、「どのような仕事があるのか」「企業が求める人材像は何か」をチェックしてみてください。</p><h3>③ ガクチカと自己PRをまとめる｜選考対策の土台を作る</h3><p>就活で必ず問われるのが「<strong>ガクチカ</strong>（学生時代に力を入れたこと）」と「<strong>自己PR</strong>」です。これらはエントリーシート（ES）や面接で評価される重要なポイントとなるため、今のうちからしっかり準備しておきましょう。</p><p>ガクチカは、過去の経験を「<strong>取り組んだ理由→工夫や努力→結果→学んだこと</strong>」という流れで整理するのが基本です。例えば、「サークルの新歓活動を担当し、参加者を前年の1.5倍に増やした経験」や「アルバイトでチームの売上を伸ばすために取り組んだ工夫」など、具体的なエピソードを書くことで説得力が増します。</p><p>自己PRでは、自分の強みをアピールするだけでなく、その強みが「企業でどのように活かせるのか」を伝えることが重要です。自己分析で見つけた強みを活かし、「自分がどのような人材で、何ができるのか」を明確にしましょう。</p><h3>④ インターンシップの情報を集める｜企業を知り、経験を積む第一歩</h3><p>「<strong>インターンシップ</strong>」は、企業理解を深めると同時に、実際の業務を体験できる貴重な機会です。特にサマーインターンシップは、企業が優秀な学生を見つける場として重要視しており、早期選考につながるケースも少なくありません。<br>大学2年生の冬からインターンシップ情報を集め、気になる企業をリストアップしましょう。</p><p>また、複数のインターンに参加することで、「自分に合った仕事や企業は何か」を見極めることができます。企業の働き方や社員の雰囲気を知ることで、入社後のミスマッチを防ぐことにもつながるため、早期から動き出す27卒の学生は特に複数社のインターンに挑戦することを意識してみてください。</p><h3>⑤ 就活仲間や先輩と交流し、OB・OG訪問の準備をする</h3><p>就活は一人で進めるものではありません。同じように就活を始めた仲間や、就活経験のある先輩との情報交換が重要です。</p><p>さらに、「<strong>OB・OG訪問</strong>」の準備も進めておきましょう。実際に企業で働く先輩から話を聞くことで、働き方や企業文化への理解が深まります。志望企業の社員と交流することで、選考対策のヒントが得られることもあります。</p><p></p><h2>3. この時期の27卒の進め方でよくある疑問と回答</h2><p>就活を意識し始めた大学2年生の冬。まだ周りの動きが少ない中で就活準備を進めると、さまざまな疑問や不安を持つことでしょう。「今、本当に必要なの？」「何から始めればいいの？」といった27卒就活生のよくある疑問にお答えします。</p><h3><strong>Q1：就活準備って大学2年生から本当に必要なの？</strong></h3><p><strong>A：はい、必要です。</strong></p><p>大学2年生の冬は、本選考までまだ時間がありますが、だからこそ「余裕を持って基礎を固めるチャンス」です。今から自己分析や業界研究に取り組むことで、大学3年生の夏に始まるサマーインターンを勝ち進むことができるでしょう。</p><p>例えば、人気企業のサマーインターンはメリットが大きい分、倍率も高くなります。自己分析やガクチカ作成が間に合わず、参加を逃してしまうというケースも少なくありません。</p><p>今から準備を進めていれば、「興味のある企業をしっかり選べる」「説得力のあるエントリーシートを書ける」といった強みが生まれます。早めにスタートを切ることで、就活本番を余裕を持って迎えられるのです。</p><h3><strong>Q2：自己分析って難しい…どうやってやればいい？</strong></h3><p><strong>A：まずは過去の経験を振り返り、自分と向き合うことが大切です。</strong></p><p>自己分析は「難しそう」と感じるかもしれませんが、ポイントは「今までの経験を言葉にして整理すること」です。サークル活動、アルバイト、学業など、これまでの行動や頑張った経験を書き出してみましょう。</p><p>整理する際には「なぜ頑張ったのか」「何を学んだのか」も一緒に考えるようにしましょう。事実を書き留めるだけではなく、その動機やこれからに活かせる能力を言語化することで自分の価値観や強みが明確になります。</p><h3><strong>Q3：業界や企業のことが全然わからない…どうやって調べる？</strong></h3><p><strong>A：まずは幅広い業界・企業に目を向けて、興味のある分野を見つけましょう。</strong></p><p>業界研究のポイントは「絞り込みすぎないこと」です。最初から1つの業界にこだわらず、さまざまな分野の特徴や仕事内容を知ることで、自分の視野が広がります。</p><p>情報収集には、次の方法がおすすめです：</p><ul><li><p><strong>就活情報サイトを活用</strong>：企業の採用ページや業界解説を読むことで概要がつかめます。</p></li><li><p><strong>就活イベントや企業説明会に参加</strong>：直接話を聞くことで効率的に理解を深められます。</p></li><li><p><strong>就活エージェントや就活サイトを使う</strong>：実際に早期から企業の選考に進めたり、プロの話を直接聞けたりと就活を優位に進めることができます。</p></li></ul><p>業界や企業研究は「知れば知るほど」面白くなります。今の時期は、とにかく情報収集を進め、気になる企業や業界をリストアップしておきましょう。</p><h3><strong>Q4：インターンシップって本当に参加したほうがいいの？</strong></h3><p><strong>A：はい。インターンシップは企業理解と早期選考対策に欠かせません。</strong></p><p>インターンシップは、企業の業務内容や職場の雰囲気を体験できるだけでなく、「本選考へつながるチャンス」でもあります。特に大手企業や人気企業になるほど、インターンの参加者が内定を獲得する可能性が高くなります。</p><p>大学2年生の冬から準備を進めれば、サマーインターンの選考にしっかりと臨めます。自己分析やエントリーシート作成を早めに行い、インターンに積極的に応募しましょう。</p><h3><strong>Q5：OB・OG訪問はいつから準備すればいい？</strong></h3><p><strong>A：大学2年生の冬から少しずつ動き始めましょう。</strong></p><p>OB・OG訪問は、企業理解を深め、リアルな情報を得ることができます。大学のキャリアセンターや就活サイトで先輩社員を紹介してもらうのも良いでしょう。</p><p>早めに準備を進めれば、先輩社員との面談を通じて「企業の働き方」や「就活の進め方」を具体的にイメージできるようになります。面談の際には、あらかじめ質問を用意しておくことも忘れないようにしましょう。</p><p></p><h2>4.長期インターンを活かして就活したい人へ</h2><p>27卒学生の中には長期インターンを経験し、すでにビジネススキルを持っている学生さんもいるでしょう。<br>あなたの持っている唯一無二の強みは就職活動の中ではガクチカという括りにまとめられてしまい、新卒でそのスキルを必ずしも活かせるかはわかりません。</p><p>せっかく頑張った長期インターンの経験を活かしてあなたが欲しい企業と出会いたい学生さんはぜひ『学生転職』を利用してみてください。<br>『学生転職』では1人1人に特別な年収やポジションが提示され、新卒で子会社の役員や新規事業部署での就職も可能です。</p><p>『学生転職』：<a target="_blank" rel="" href="https://www.gakuten.co.jp/">https://www.gakuten.co.jp/</a></p><p></p><h2><strong>まとめ｜今から動き出すことで差をつけよう</strong></h2><p>大学2年生の冬は、就活の「準備期間」です。この時期に自己分析や業界研究を進めることで、サマーインターンや本選考に自信を持って臨むことができます。</p><p>「何をすればいいかわからない」という方も、今回紹介したステップを参考に、少しずつ動き出してみましょう。早めの行動が、納得のいく就職活動へとつながるはずです！</p>	https://cpinzmlynykyrxdvkshl.supabase.co/storage/v1/object/public/media/covers/1751936848573-89aesq.webp	published	\N	8808c51e-f25b-468e-afb4-dbf639d72d28	74114e4f-9f4c-45ff-af96-6a1e26668ef0	2025-07-08 01:07:38.364002+00	2025-07-08 01:10:10.69+00	\N	71d5e46e-544c-45a0-903a-a4c5da64ea80
\.


--
-- Data for Name: media_posts_tags; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.media_posts_tags (post_id, tag_id) FROM stdin;
1ae21267-6ccd-44c7-a099-d0f149404cd1	1c9686bd-a8e3-43d4-a0b9-b7dde8c43065
738314cc-1463-428b-a382-6015fbfe93eb	f9c61950-134b-4545-a411-c2b3c1e9e2c2
738314cc-1463-428b-a382-6015fbfe93eb	ddba30da-4630-4b8f-b078-f98893e1d340
738314cc-1463-428b-a382-6015fbfe93eb	67276aa2-b70c-42f2-93b5-4ddaaa5fe838
d0f4babd-fa0d-4651-a33f-3ca400812447	ddba30da-4630-4b8f-b078-f98893e1d340
b7f28068-6475-45e2-8577-fc12cfb0c9ae	ddba30da-4630-4b8f-b078-f98893e1d340
ed697910-71bd-412f-a25a-bf0275712260	ddba30da-4630-4b8f-b078-f98893e1d340
91773f8e-9184-4d33-aadc-8dbfec4efc0b	ddba30da-4630-4b8f-b078-f98893e1d340
91773f8e-9184-4d33-aadc-8dbfec4efc0b	67276aa2-b70c-42f2-93b5-4ddaaa5fe838
91773f8e-9184-4d33-aadc-8dbfec4efc0b	476c2351-fa7a-4f7b-9607-e543a44a3555
c5c9035e-af7f-4cfe-886b-b320d4aea64d	1ffcc30d-05d6-4c0c-b0e7-fa53b1c28c0a
c5c9035e-af7f-4cfe-886b-b320d4aea64d	4a71673a-93db-4928-9fbd-411ddc3148c4
c5c9035e-af7f-4cfe-886b-b320d4aea64d	2d1f6caa-d73f-4857-a809-3f86084e59c4
c5c9035e-af7f-4cfe-886b-b320d4aea64d	834872d3-d36d-4389-932d-727a84074257
26409d1a-b30c-4a23-a71e-9c23b7886f54	2d1f6caa-d73f-4857-a809-3f86084e59c4
26409d1a-b30c-4a23-a71e-9c23b7886f54	4a71673a-93db-4928-9fbd-411ddc3148c4
26409d1a-b30c-4a23-a71e-9c23b7886f54	1ffcc30d-05d6-4c0c-b0e7-fa53b1c28c0a
26409d1a-b30c-4a23-a71e-9c23b7886f54	4003f550-1c0a-4f4a-86e3-654d89198458
26409d1a-b30c-4a23-a71e-9c23b7886f54	67276aa2-b70c-42f2-93b5-4ddaaa5fe838
26409d1a-b30c-4a23-a71e-9c23b7886f54	4c1d82b9-5bd4-485b-87c9-aedf065bb0f2
26409d1a-b30c-4a23-a71e-9c23b7886f54	a23e2665-49ee-4e34-8753-befcfede3209
26409d1a-b30c-4a23-a71e-9c23b7886f54	a3a7aad2-208b-4332-b6ee-5e76c78088e4
4ba257b9-7a75-4ebf-b909-e0feaf447d47	ddba30da-4630-4b8f-b078-f98893e1d340
4ba257b9-7a75-4ebf-b909-e0feaf447d47	a23e2665-49ee-4e34-8753-befcfede3209
4ba257b9-7a75-4ebf-b909-e0feaf447d47	4c1d82b9-5bd4-485b-87c9-aedf065bb0f2
379f2be8-ea30-4de4-8f94-4bef56483df4	ddba30da-4630-4b8f-b078-f98893e1d340
74702121-6513-4dc6-9364-9321a7274161	a3a7aad2-208b-4332-b6ee-5e76c78088e4
2479b879-2ede-47ee-b8b0-d6abdea2b75b	4a71673a-93db-4928-9fbd-411ddc3148c4
2479b879-2ede-47ee-b8b0-d6abdea2b75b	f9c61950-134b-4545-a411-c2b3c1e9e2c2
f02f2fb1-6540-452d-b399-b4b554f6e4fe	1ffcc30d-05d6-4c0c-b0e7-fa53b1c28c0a
da07689b-72ef-4ef1-979e-02859e909177	2d1f6caa-d73f-4857-a809-3f86084e59c4
fba9ab78-f7ff-45a5-87a0-3183ae8731e2	ddba30da-4630-4b8f-b078-f98893e1d340
fc5009e5-4620-49f9-ae06-59f57339192a	f9c61950-134b-4545-a411-c2b3c1e9e2c2
fc5009e5-4620-49f9-ae06-59f57339192a	1ffcc30d-05d6-4c0c-b0e7-fa53b1c28c0a
fc5009e5-4620-49f9-ae06-59f57339192a	ddba30da-4630-4b8f-b078-f98893e1d340
45fed42d-72bb-433f-bc56-0d1cc9ed406d	4003f550-1c0a-4f4a-86e3-654d89198458
45fed42d-72bb-433f-bc56-0d1cc9ed406d	f9c61950-134b-4545-a411-c2b3c1e9e2c2
45fed42d-72bb-433f-bc56-0d1cc9ed406d	4a71673a-93db-4928-9fbd-411ddc3148c4
45fed42d-72bb-433f-bc56-0d1cc9ed406d	2d1f6caa-d73f-4857-a809-3f86084e59c4
17f75edc-f334-4007-9098-165f63a47c9f	4003f550-1c0a-4f4a-86e3-654d89198458
17f75edc-f334-4007-9098-165f63a47c9f	4a71673a-93db-4928-9fbd-411ddc3148c4
17f75edc-f334-4007-9098-165f63a47c9f	f9c61950-134b-4545-a411-c2b3c1e9e2c2
17f75edc-f334-4007-9098-165f63a47c9f	2d1f6caa-d73f-4857-a809-3f86084e59c4
17f75edc-f334-4007-9098-165f63a47c9f	ddba30da-4630-4b8f-b078-f98893e1d340
ad08f695-2e1c-473b-897b-9c740bc7b549	ddba30da-4630-4b8f-b078-f98893e1d340
\.


--
-- Data for Name: media_tags; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.media_tags (id, name, slug) FROM stdin;
4003f550-1c0a-4f4a-86e3-654d89198458	ES対策	es-tips
a3a7aad2-208b-4332-b6ee-5e76c78088e4	面接質問	interview-qa
4a71673a-93db-4928-9fbd-411ddc3148c4	Webテスト	web-test
f9c61950-134b-4545-a411-c2b3c1e9e2c2	OB訪問	ob-visit
67276aa2-b70c-42f2-93b5-4ddaaa5fe838	業界研究	industry-research
ddba30da-4630-4b8f-b078-f98893e1d340	長期インターン	long-intern
1ffcc30d-05d6-4c0c-b0e7-fa53b1c28c0a	サマーインターン	summer-intern
1c9686bd-a8e3-43d4-a0b9-b7dde8c43065	副業・バイト	sidejob
a94fd581-d78a-4436-8d8e-a190de94f308	授業履修	class-register
cb70d87c-e19c-417e-b778-1015fc97ae4e	サークル	circle-life
4c1d82b9-5bd4-485b-87c9-aedf065bb0f2	留学体験	study-abroad
6bfc5f76-1ce0-4a89-ba85-b4c432c90dc3	奨学金	scholarship
923de90d-e48b-4eb4-94e5-d387169b5790	プログラミング	coding
e9ad9294-4389-4f54-9f88-8eaa3f4ed937	データ分析	data-analytics
a23e2665-49ee-4e34-8753-befcfede3209	英語学習	english
111206b8-ce25-4501-a387-3c5761b8608a	タイムマネジメント	time-management
8828ab33-49e0-40f7-9f26-4edd32cb7ad2	マネーリテラシー	money
ebc4b4ef-32bf-4fce-a8fb-4fee4ecfb065	合同説明会	career-fair
476c2351-fa7a-4f7b-9607-e543a44a3555	就活セミナー	seminar
2d1f6caa-d73f-4857-a809-3f86084e59c4	モチベ管理	motivation
834872d3-d36d-4389-932d-727a84074257	メンタルヘルス	mental-health
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.messages (id, chat_room_id, sender_id, content, is_read, attachment_url, created_at, answered_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, title, message, notification_type, related_id, is_read, created_at, channel, send_status, send_after, error_reason, url) FROM stdin;
0faef8a6-b8f8-4535-bcee-ad1459016604	036c17b8-4000-41df-b00f-d00ab6efde39	グランプリの採点結果が届きました	スコア: 60 点\nフィードバック: テストです	grandprix_feedback	12ed588d-de9f-4a7c-be57-134d04b6d1af	f	2025-06-18 05:44:26.245005+00	in_app	\N	2025-06-18 05:44:26.245005+00	\N	/grandprix/result/12ed588d-de9f-4a7c-be57-134d04b6d1af
5c1162e6-5b67-4276-bc6b-d8cd93480d55	039527ca-2a5a-4e10-8ebb-cf63aca72d07	新しいスカウトが届きました	企業からスカウトが届いています。詳細を確認してください。	scout	e4aefcd2-d832-4bae-a2fc-7b3e42af9fbf	f	2025-07-07 10:03:25.957417+00	in_app	sent	2025-07-07 10:03:25.957417+00	\N	\N
6562f33d-fd7a-486e-bcf2-ccccdbd4c7a5	a7dfacbb-b547-4744-aec2-ad2eab969769	新しいスカウトが届きました	企業からスカウトが届いています。詳細を確認してください。	scout	f4a455ee-cc25-491e-9213-9d47f3dfa163	t	2025-06-25 07:02:15.780947+00	in_app	sent	2025-06-25 07:02:15.780947+00	\N	\N
7ce2f5c3-c44e-42b7-b87d-911aa4b83fd2	3f66b76a-eaa6-4b3f-81a9-abe4abe0eb0a	新しいスカウトが届きました	企業からスカウトが届いています。詳細を確認してください。	scout	817dcff1-eb9a-4bc9-a907-050618153525	f	2025-07-07 07:52:15.268397+00	in_app	sent	2025-07-07 07:52:15.268397+00	\N	\N
85122db6-dd13-43ac-9d30-41263b67bae5	039527ca-2a5a-4e10-8ebb-cf63aca72d07	新しいスカウトが届きました	企業からスカウトが届いています。詳細を確認してください。	scout	1adeae8e-2114-4b65-ad3a-680c8a098a84	f	2025-07-07 10:09:04.716575+00	in_app	sent	2025-07-07 10:09:04.716575+00	\N	\N
43b9a6a0-388c-4247-9a8c-3f0380adfc91	a7dfacbb-b547-4744-aec2-ad2eab969769	新しいスカウトが届きました	企業からスカウトが届いています。詳細を確認してください。	scout	3caba2a1-2cc6-4f32-8646-8af5298a5d70	t	2025-06-25 06:24:26.789383+00	in_app	sent	2025-06-25 06:24:26.789383+00	\N	\N
ea373ac5-b07a-4e27-bd98-0009adb5b560	039527ca-2a5a-4e10-8ebb-cf63aca72d07	新しいスカウトが届きました	企業からスカウトが届いています。詳細を確認してください。	scout	b9e25685-59b4-417f-89b2-65aa6b09c14b	t	2025-06-25 07:11:49.728215+00	in_app	sent	2025-06-25 07:11:49.728215+00	\N	\N
1cae37ed-34e5-4acb-a70a-79dfb4155418	a7dfacbb-b547-4744-aec2-ad2eab969769	新しいスカウトが届きました	企業からスカウトが届いています。詳細を確認してください。	scout	24bf3bc7-1e15-4c93-91d3-ad6b13e5ef8f	t	2025-06-25 06:20:14.481656+00	in_app	sent	2025-06-25 06:20:14.481656+00	\N	\N
75b25fed-e651-4b28-8654-af825e6cb919	a7dfacbb-b547-4744-aec2-ad2eab969769	新しいスカウトが届きました	企業からスカウトが届いています。詳細を確認してください。	scout	ef0e032f-2d43-476d-981e-ae0a91e7448c	t	2025-06-25 07:00:39.492098+00	in_app	sent	2025-06-25 07:00:39.492098+00	\N	\N
050115bc-88cf-47a7-938d-e8464e0f9fe4	3ed44c78-7891-4717-b1c3-f61dae38e55d	新しいスカウトが届きました	企業からスカウトが届いています。詳細を確認してください。	scout	f9b13f75-91c0-43c3-8b43-df8f30d82876	f	2025-07-07 07:52:04.862174+00	in_app	sent	2025-07-07 07:52:04.862174+00	\N	\N
\.


--
-- Data for Name: qualifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.qualifications (id, name) FROM stdin;
\.


--
-- Data for Name: question_bank; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.question_bank (id, category, stem, choices, correct_choice, expected_kw, difficulty, explanation, created_at, challenge_id, weight, grand_type, order_no, stem_img_url, choices_img) FROM stdin;
7abc111d-ce4e-496c-a4c7-a34a6429ac5f	\N	無印良品店の売上を3年で20％向上させる施策を考えてください。	\N	\N	{売上向上,現状分析,課題整理}	3	\N	2025-06-18 01:51:28.282556+00	\N	1.0	case	1	\N	\N
cfc01be3-c1f5-4844-8ad9-ef019cf25ef5	\N	マツモトキヨシが、既存顧客数を増やさずに売上を上げるための戦略を考えてください	\N	\N	{売上向上,単価改善,頻度改善}	3	\N	2025-06-18 05:16:58.373443+00	\N	1.0	case	2	\N	\N
7a7d4eec-77d0-4caf-a7c3-d69b3fea5c9e	\N	大学生向けのサブスク型サービスを新たに立ち上げるなら、どんな分野で展開しますか？理由とともに説明してください。	\N	\N	{新規事業,サブスク}	3	\N	2025-06-18 06:03:52.717112+00	\N	1.0	case	3	\N	\N
bdfb3ff8-67e3-4cb2-8d62-cc6f8781dc83	\N	リクルート社が「生成AI」を活用した新規事業を検討しています。企画案を立て、実行上の課題とその解決策まで提案してください。	\N	\N	{新規事業,生成AI,実行戦略}	3	\N	2025-06-18 06:04:23.428635+00	\N	1.0	case	4	\N	\N
c5adfd28-6a60-4116-ba72-18d33f2df01a	\N	地方自治体と連携し、行政の課題解決を狙ったSaaS事業をゼロから立案してください。対象課題・市場性・プロダクト案・収支モデル・スケール戦略まで含めてください。	\N	\N	{新規事業,SaaS事業,戦略立案}	3	\N	2025-06-18 06:04:54.469577+00	\N	1.0	case	5	\N	\N
d5e0ce8f-85d8-460c-8a2a-bd83224a688b	\N	あなたにとって「働く」とは何ですか？その定義と、今の学生にとっての意味の違いを考察してください。	\N	\N	{抽象,定義}	3	\N	2025-06-18 06:05:20.345749+00	\N	1.0	case	6	\N	\N
cdd9b3f7-c0fc-4af5-87a4-12c5e7734ab4	\N	「豊かさ」とは何かを定義し、現代日本においてそれが満たされているかを論じてください。	\N	\N	{定義,抽象}	3	\N	2025-06-18 06:07:58.710437+00	\N	1.0	case	7	\N	\N
d516a524-d143-4e31-ac50-991914e4f21f	\N	“正しさ”とは何によって決まるのか？ 情報が溢れる社会における“正しさ”の基準について、あなたの見解を論じてください。	\N	\N	{定義,抽象}	3	\N	2025-06-18 06:08:22.217836+00	\N	1.0	case	8	\N	\N
0e3b4563-74de-43cb-9a72-01bfd0f20810	\N	政府が推進する「若者の地方移住支援策」に対し、財政資源を投じて継続すべきか。人口動態・経済効果・社会構造の観点から賛否を論じてください。	\N	\N	{賛否,是非}	3	\N	2025-06-18 06:09:20.959433+00	\N	1.0	case	9	\N	\N
b155e592-9387-4c3e-8aca-82bd0b7df3e5	\N	あなたが経営層の立場であれば、「週休3日制」を自社に導入すべきと考えますか？その理由を生産性・報酬制度・従業員満足の観点から論じてください。	\N	\N	{賛否,経営論,是非}	3	\N	2025-06-18 06:09:49.17981+00	\N	1.0	case	10	\N	\N
75140c16-343c-4161-b2a7-b4e761fe61fb	\N	地方観光業（例：温泉地や伝統宿）が人手不足・集客難に苦しんでいます。観光DXを通じて収益改善と持続性を両立させる戦略を提案してください。	\N	\N	{観光DX}	3	\N	2025-06-18 06:11:04.644428+00	\N	1.0	case	11	\N	\N
416ba43d-8822-4993-8b75-f2aac409805e	spi_language	「迅速」に最も近い語は？	["緻密", "早急", "拙速", "端的"]	2	\N	3	「迅速」＝すばやい	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	1	\N	\N
8c41993f-3b58-4a8b-9e72-3a10471a75ef	spi_language	「端的」に最も近い語は？	["明快", "閑静", "過敏", "豪快"]	1	\N	3	端的＝明確	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	2	\N	\N
11c84282-4aa3-4b87-9d80-58f8410b297d	spi_language	「希薄」の反対語は？	["濃厚", "軽薄", "無臭", "簡素"]	1	\N	3	薄い⇔濃い	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	3	\N	\N
3979bb92-cd1c-42b2-96a0-6c676be850f7	spi_language	「顕著」の反対語は？	["微弱", "軽薄", "平凡", "不慣"]	3	\N	3	目立つ⇔平凡	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	4	\N	\N
9fbc3156-21fe-45b3-bb65-ed77c963ce76	spi_language	「鍵：錠」と同じ関係は？	["刃：刀", "栓：瓶", "針：布", "弓：矢"]	2	\N	3	開閉器具⇔対象物	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	5	\N	\N
09c9e28e-20d0-45a0-9f6b-2cc3601d5b72	spi_language	「蜂：蜜」と同じ関係は？	["牛：乳", "鶏：羽", "犬：骨", "猫：魚"]	1	\N	3	動物→産物	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	6	\N	\N
46baa1b1-600f-40ec-8206-49b41326056d	spi_language	「戦火」の構成は？	["修飾語＋被修飾語", "同義語", "対義語", "主語＋述語"]	1	\N	2	戦 が 火 を修飾	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	7	\N	\N
91a66189-170c-4240-b502-a39ebbd0b045	spi_language	「風景」の構成は？	["抽象＋具体", "同義語", "対義語", "主語＋述語"]	1	\N	2	抽象語＋具体物	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	8	\N	\N
43b05e72-2413-4f6e-af63-6486e8d2beba	spi_language	この問題は____に解決した。	["円滑", "可憐", "冷淡", "頑丈"]	1	\N	2	円滑＝スムーズ	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	9	\N	\N
11028ae9-bdb4-4fcc-a520-d411bfafefe2	spi_language	____な態度を戒める。	["傲慢", "壮麗", "円満", "悠長"]	1	\N	2	悪い態度→傲慢	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	10	\N	\N
061fadb0-8eeb-4327-b228-6054c8485d1c	spi_language	(ア)発表 (イ)準備を (ウ)入念に (エ)行い ― 正順は？	["ウ–イ–エ–ア", "イ–ウ–エ–ア", "ウ–エ–イ–ア", "エ–ウ–イ–ア"]	1	\N	4	副→目的語→述語→結果	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	11	\N	\N
01a5a91b-6d28-47a8-9861-634dd5e3acfd	spi_language	(ア)急速に (イ)技術が (ウ)発展し (エ)社会が変化した ― 正順は？	["ア–イ–ウ–エ", "イ–ア–ウ–エ", "イ–ウ–ア–エ", "ア–ウ–イ–エ"]	1	\N	4	副→主→述→結果	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	12	\N	\N
8218d278-fdf3-4e21-af1c-1d4a084c8552	spi_language	「おもむろに」の意味は？	["急に", "静かに", "ゆっくり", "軽々しく"]	3	\N	3	徐々に	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	13	\N	\N
b92b5cab-3e3a-4008-9571-751233856337	spi_language	「たしなめる」の意味は？	["叱る", "褒める", "驚く", "頼む"]	1	\N	3	穏やかに注意	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	14	\N	\N
740ad915-4411-486a-8b32-f41a6abce3bf	spi_language	「緻密 ⇔ ____」	["粗雑", "密接", "巧妙", "詳細"]	1	\N	3	細かい⇔大まか	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	15	\N	\N
72a6b5f7-5394-4d39-94be-c4885ed6f581	spi_language	「隆盛 ⇔ ____」	["衰退", "繁栄", "成熟", "増進"]	1	\N	3	隆盛⇔衰退	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	16	\N	\N
0926f31e-d832-468d-bc3f-861abff2b179	spi_language	「のどから手が出る」意味は？	["欲しくてたまらない", "驚いて声が出ない", "緊張する", "焦って失敗する"]	1	\N	3	強く欲する	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	17	\N	\N
808e1cd6-c8d6-4610-b215-d71f93ea5e5f	spi_language	「くぎを刺す」意味は？	["念を押す", "邪魔をする", "同意を求める", "気付かせる"]	1	\N	3	あらかじめ注意	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	18	\N	\N
78f71b83-cd8d-4680-93a6-b87d5cb90524	spi_language	誤用語は？「席を温める任務」	["席", "温める", "任務", "を"]	2	\N	2	正：守る	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	19	\N	\N
f32f04f2-dd5b-4587-be7b-c7dc768ea437	spi_language	誤用語は？「問題にめどが立たない」	["問題", "に", "めど", "立たない"]	3	\N	2	正：目途	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	20	\N	\N
3d9e54b6-0878-406d-be66-8bb8791234ee	spi_language	「社長が話す」を尊敬語に。	["社長がお話しになる", "社長が申される", "社長が申し上げる", "社長がお話しいただく"]	1	\N	2	尊敬：お〜になる	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	21	\N	\N
d49b77ab-2d64-4f37-b004-3c159b00b85d	spi_language	「伺う」を謙譲語Ⅰに。	["伺う（そのまま）", "拝聴する", "いただく", "参る"]	1	\N	2	自動詞謙譲Ⅰ	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	22	\N	\N
1f7353f8-939b-44e7-a871-018e731504d3	spi_language	「温故知新」の意味は？	["昔を学び新知を得る", "危機を乗り切る", "友情を深める", "自由を尊ぶ"]	1	\N	3	故きを温めて新しきを知る	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	23	\N	\N
8049d265-b323-4086-9620-36d1a4427a8c	spi_language	「上意下達」の意味は？	["命令を下に伝える", "意見を上に述べる", "上下が協力する", "上下が対立する"]	1	\N	3	トップダウン	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	24	\N	\N
362b036a-1a59-4d15-88f6-e0dd5e398f47	spi_language	「付和____」空欄に入る語は？	["雷同", "同調", "賛同", "追随"]	1	\N	2	付和雷同	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	25	\N	\N
40242408-a6e0-44a5-b4ce-d939b6cbffa5	spi_language	「公明正____」空欄に入る語は？	["大", "意", "志", "説"]	1	\N	2	公明正大	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	26	\N	\N
5880ba8a-1ba1-499a-b753-f3e51f997193	spi_language	「齟齬」の読みは？	["そご", "そぐ", "そお", "そしょ"]	1	\N	2	そご	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	27	\N	\N
b2dc24c3-eddf-496b-b9f7-7e9ba003f0c2	spi_language	「贖う」の読みは？	["あがなう", "あやまる", "あがめる", "あやつる"]	1	\N	2	あがなう	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	28	\N	\N
d562aa6c-699a-4058-858b-852aff98d4fe	spi_language	「しゅうしゅうがつかない」を漢字で？	["収拾", "収集", "拾収", "修収"]	1	\N	2	収拾	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	29	\N	\N
8738f26e-b35e-42ea-b008-b504bfe5963a	spi_language	「あつれき」を漢字で？	["軋轢", "圧歴", "扱暦", "圧礫"]	1	\N	2	軋轢	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	30	\N	\N
65a65de9-ff76-4bc0-8326-840e24a4a1ed	spi_language	「意志」と同じ読みで別語は？	["医師", "遺志", "偉志", "威士"]	1	\N	2	いし→医師	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	31	\N	\N
15e68b4b-4c07-4db3-a020-c60be706732c	spi_language	「講こうする」に最適な漢字は？	["効", "攻", "更", "稿"]	2	\N	2	攻こう：攻こうする	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	32	\N	\N
983f5a2f-94a2-46b6-a63a-64521e5249b1	spi_language	空欄に入る接続詞は？「雨だった____試合は決行した。」	["が", "ので", "それで", "だから"]	1	\N	2	逆接→が	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	33	\N	\N
32a34d63-0cc8-438a-a407-63fea8638c60	spi_language	空欄に入る接続詞は？「よって、____上記を証明する。」	["以上", "しかるに", "および", "ゆえに"]	1	\N	2	前文受け→以上	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	34	\N	\N
cec304c9-2248-44fa-9a87-1f73b08184cc	spi_language	誤った表現はどれ？	["足を運ばれる", "おっしゃられる", "ご覧になる", "召し上がる"]	2	\N	2	二重敬語	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	35	\N	\N
696004eb-5a36-42a4-83aa-b6d597c57e1a	spi_language	「山頂」の成り立ちは？	["修飾語＋被修飾語", "同義語", "対義語", "主語＋述語"]	1	\N	2	山が頂を修飾	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	36	\N	\N
31c303bf-b2da-4f02-bc24-c9376288eb40	spi_language	「四面楚歌」の状況は？	["孤立無援", "大歓声", "優勢", "安泰"]	1	\N	3	孤立状態	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	37	\N	\N
000dd49d-7288-4319-a387-838974db9f62	spi_language	「青天の霹靂」の意味は？	["突然の出来事", "快晴", "良い知らせ", "長い年月"]	1	\N	3	思いがけない	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	38	\N	\N
e1788fa2-8809-41bd-bffd-cd099471d914	spi_language	正しい慣用句はどれ？	["足元をすくう", "頭をよぎる", "気がめいる", "肩を落とす"]	4	\N	3	他は誤用や不自然	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	39	\N	\N
750a066b-7133-4d0b-a281-c9f9cb06f1e3	spi_language	短文要旨：「経験は失敗の母であり成功の父である。」	["失敗も成功も経験が生む", "失敗は無駄でない", "成功だけが重要", "経験は不要"]	1	\N	4	経験が両者を生む	2025-06-28 01:23:25.557718+00	\N	1.0	webtest	40	\N	\N
\.


--
-- Data for Name: referral_codes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.referral_codes (id, user_id, code, created_at) FROM stdin;
1b13db28-e61f-4adc-a206-c125f650c630	039527ca-2a5a-4e10-8ebb-cf63aca72d07	058b7d0b	2025-06-25 09:06:49.004493+00
72cf2f11-720c-47b0-bf2e-4acd013f0de8	d8f1aea9-a2fc-4dd4-a46e-a296c6bef69a	fff35352	2025-06-26 14:11:11.824574+00
ec91bd2e-1d59-4512-834c-cabf18421a69	1e97906e-af3c-423d-8712-4c4ad97a60e1	58f34a46	2025-06-27 12:06:07.613205+00
580c74ef-4b0f-4f1b-9816-dc83c99a9f8b	76907e4c-ee31-4378-bc6c-c526130a3cb3	a465b2cc	2025-06-28 08:10:00.800831+00
a12047f1-9df1-408b-be9b-2acfd41521b6	aada0a75-9471-4caf-9116-3b6fed88b6d7	3743c85a	2025-07-02 07:33:57.837333+00
4121eea7-b1fc-41b5-ae28-3259930d2fd0	366dd4e3-d25c-4edc-8b17-5a569dc6bf9c	56555afe	2025-07-03 08:29:35.933807+00
\.


--
-- Data for Name: referral_uses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.referral_uses (id, referral_code_id, referred_user_id, status, created_at) FROM stdin;
\.


--
-- Data for Name: resumes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.resumes (id, user_id, desired_job_title, summary, skills, experiences, educations, created_at, updated_at, form_data, work_experiences) FROM stdin;
eeb70b09-88a5-4588-adca-be6abbb75121	51dcf97b-a054-43f2-897b-c7449fd64ee7	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社アッドラスト", "endDate": "", "position": "インサイドセールス", "isCurrent": false, "startDate": "", "description": "学⽣20⼈の新⼈の中から3か⽉間で新⼈賞を獲得した", "achievements": "1点⽬は、提案先リストの業種や会社規模ごとにアプローチを変える事です。\\n2点⽬は、ノートを作り分からない⾔葉は必ず調べてまとめる事です。", "technologies": ""}, {"id": 2, "isOpen": true, "company": "居酒屋", "endDate": "", "position": "ホールリーダー", "isCurrent": false, "startDate": "", "description": "⼊会⾦200円の有料会員アプリを継続して4か⽉連続⽉350件新規獲得した。", "achievements": "１点⽬は、⽉⼀ミーティングにて接客⽅法の⾒直しを⾏った事です。具体的には、おしぼり交換やお会計をしたいお客様の些細な要求のサインを確認し合いました。\\n２点⽬はホールの仕組み化です。具体的には席ごとに担当スタッフを設け全席の状況把握を出来るようにしました。", "technologies": ""}]
df47af0b-6628-4081-bbc3-6a6ee5284fab	1e597d02-3e58-4c56-b55e-d78f71e4c702	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社ハウテレビジョン", "endDate": "", "position": "マーケティング", "isCurrent": false, "startDate": "", "description": "長期インターン/マーケティング\\n2023年3月 入社、マーケティング部に配属\\n\\n・自社プラットフォームのプロモーション、セールス支援などのマーケティング全般\\n・自社プラットフォームへのアクセス数や流入経路などの分析\\n・その他資料作成など", "achievements": "長期インターン/マーケティング\\nこれまでの業務で、資料作成に始まり最終的に自社SNSの運用や記事の執筆、分析に携わった。唯一の一年生として未熟ながらもとにかく周りに頼ることを心がけた。頼るときもただ聞くのではなく必ず成果物を持っていき現時点での自分なりの考えを必ず述べるようにした。結果、努力とコミットが認められ、幅広い業務に携われるようになった。", "technologies": ""}]
1515b17d-8aa9-4127-b978-253a179835f6	b7aca3f1-2b6a-4f79-a763-6d04cab37086	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
5a277124-e48c-448d-a21b-b07a8802976b	7fb99469-a71a-4289-a2fc-f66751f0757c	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社AVILEN", "endDate": "", "position": "AIエンジニア", "isCurrent": false, "startDate": "", "description": "2023年6月 入社、AIエンジニアとして複数の開発案件に従事\\n案件①：ChatGPTをベースとした業務用チャットボットの開発\\n案件②：姿図からの情報抽出AIモデルの開発\\nいずれの案件でも、モデルの学習・ファインチューニングを担当し、精度向上とプロダクトの実用化に貢献", "achievements": "長期インターン / AIエンジニア\\n案件①では、ChatGPT登場初期という情報が乏しい時期にもかかわらず、自ら最先端の技術をキャッチアップし、プロンプト設計・API連携・知識補完の仕組みを実装。実用レベルの応答精度を達成しました。\\n案件②では、OCRや物体検出モデルなど複数のAI手法を組み合わせる必要がある複雑なタスクに対して、学習データの整備やモデル構成の工夫を通じて精度を改善。チームとの議論を通じてタスク分解と改善サイクルを回し、情報抽出の正確性を大幅に向上させました。", "technologies": ""}, {"id": 2, "isOpen": true, "company": "株式会社Nospare", "endDate": "", "position": "プロダクトマネージャー（PDM）", "isCurrent": false, "startDate": "", "description": "長期インターン / プロダクトマネージャー（PDM）\\n2024年3月 入社、広告運用事業部にてプロダクトマネージャーを担当\\n・Amazon広告運用におけるデータ整備・運用自動化プロダクトの開発\\n・BIツールを用いたダッシュボードの構築によるモニタリング体制の整備\\n・MMM（マーケティング・ミックス・モデリング）を用いた予算配分最適化提案の実装・デプロイ\\n・開発メンバー2名のマネジメントを担当し、プロジェクト全体の推進に貢献\\n・広告運用支援により、特定商品の売上を2.5倍にする成果を達成", "achievements": "初めてプロダクトマネージャーを任される中で、インターン生2名のタスク設計・進捗管理・1on1などを通じて心理的安全性の高いチームづくりを行い、メンバーの主体性を引き出しました。\\nまた、広告運用のKPIや構造を理解し、ROIやクリック率などの指標をもとに、クラウド環境での定期実行処理の構築やBIツールによる可視化を推進。\\nさらに、MMMを活用した広告予算配分の自動最適化ロジックを提案・デプロイし、クライアントの意思決定支援に貢献しました。\\n開発とビジネスの両面を理解し、両者をつなぐ橋渡し役としてプロジェクト全体を推進しました。", "technologies": ""}, {"id": 3, "isOpen": true, "company": "国立研究開発法人産業技術総合研究所", "endDate": "", "position": "研究機関インターン / データサイエンティスト", "isCurrent": false, "startDate": "", "description": "2024年11月 入所、国立研究開発法人産業技術総合研究所にて\\n・内閣府SIP（戦略的イノベーション創造プログラム）関連のデータ分析業務に従事\\n　企業様と連携した多世代交流のための地域イベントにおいて、アンケート設計・データ収集・分析・施策提案を担当\\n　関係者との対話を通じたデータ収集体制の改善、および施策のPoC提案により、社会実装に向けた実行フェーズへの移行を推進\\n・産総研主催イベントにおけるデータ活用提案\\n・論文執筆を通じた知見の体系化にも従事", "achievements": "研究機関インターン / データサイエンティスト\\nSIPプロジェクトにおいて、イベント運営側と現場での対話を重ねることで、データ収集の課題（目的の不一致・協力体制の不十分さ）を改善。\\nアンケート設計の見直しと重要性の共有により、現場の理解を得て有効なデータ収集基盤を構築しました。\\nまた、単なる分析にとどまらず、PoCとしての施策提案を行い、関係者の実行可能性を意識した提案設計に注力。\\nこれにより、「実行に至らない分析」から「社会実装に進む提案」への橋渡しを実現しました。\\nデータ分析のツールとしての役割を超え、現場と研究、提案と実行をつなぐデータサイエンティストとして貢献しています。", "technologies": ""}]
e04b635c-ba68-48e4-8920-3e4c2d02ce16	e77ac83a-cec9-4db1-aee8-e7bcf2ad905f	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "エンリッション", "endDate": "", "position": "店長/本社インターン(事業統括)", "isCurrent": false, "startDate": "", "description": "2024年8月〜2025年1月/知るカフェ早稲田店店長\\n全国20店舗ある中でKPI達成率全店1位獲得。\\n2025年2月〜/店長時の活躍やサービスの本質への深い理解を社員さんに買われて、各店舗の店長をマネジメントしたり新しいカフェサービスを生み出す事業統括に就任。", "achievements": "リーダーシップや行動力、周りの人(特に歳下)を巻き込む力", "technologies": ""}]
94fa09c3-415c-4bec-9d0b-2d5c83295210	5b67a8dc-c366-4d19-a354-16a09e18082d	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
f53694ea-7f2a-4015-a667-3736f7dc73e5	df191eb5-9995-4538-8172-c714b79d8ea7	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "TDAI Lab", "endDate": "", "position": "AIエンジニア", "isCurrent": false, "startDate": "", "description": "・TDAI Lab社にて2024年11月よりAIエンジニアの長期インターンに従事\\n・工場の製造ラインにおける教師なし学習による異常音検知モデルの開発・実装を担当\\n・実装論文の選定、モデル構築・実装、クライアント向け報告会での発表まで一貫して担当", "achievements": "・一つの案件を納品まで責任を持ってやり遂げることができました。\\n・クライアントの要望に対して一つひとつ丁寧に対応し、密にコミュニケーションをとりながら実装を進めました。\\n・論文実装に際しては、論文に明記されていないモデルの詳細設定についても複数の可能性を洗い出し、それぞれに対して丁寧に検証を重ね、最も高いパフォーマンスを実現しました。", "technologies": ""}]
fd6f4f7c-a3c5-4d35-bc1b-d537bc3a4c06	b4c957e5-5e57-430a-b052-474768a85be5	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "ステップハウス", "endDate": "", "position": "アポインター", "isCurrent": false, "startDate": "", "description": "1日の訪問販売の50件中21件のアポイント成功\\nインターン生10名の管理やリソース配分、架電報告の指導を担当。東海エリアのインターン600名の中で、担当したエリアが3か月連続で上位10％を記録。", "achievements": "安定したアポイント獲得を実現するため、誰よりも出社し、ロールプレイングを積極的に実施。上司から高い信頼を得て、チームにおける模範的な存在として行動する。\\n行動力やフットワークの軽さ、対人コミュニケーション力を活かし、東海エリアのインターン600名の中で担当エリアが3か月連続で上位10％を記録。", "technologies": ""}, {"id": 2, "isOpen": true, "company": "スタートコーヒージャパン", "endDate": "", "position": "マネージャー（時間帯責任者）", "isCurrent": false, "startDate": "", "description": "2022年4月に入社し、3年半にわたり店舗運営に従事。5名のスタッフをまとめる時間帯責任者として、円滑な業務遂行と売上向上に貢献。\\n閉店作業の効率化により、作業時間を1時間から30分に短縮し、人件費削減を実現。\\nピーク時間帯における新たなオーダーテイク方式（列に直接伝票を持っていく）を導入し、スタッフの接客率向上、回転率改善、顧客満足度向上を達成。\\n土日の売上を1日70万円から80万円に引き上げ、最高売上100万円を記録するなど、ピーク時間帯における売上最大化を実現。", "achievements": "店舗運営の効率化を目指し、閉店作業のマニュアルを主体的に作成。他店舗へ自ら足を運び、業務フローやベストプラクティスを学ぶなど、泥臭い努力を惜しまず実践的なマニュアルを構築。業務効率とスタッフの負担軽減に貢献。\\n店舗の清潔感向上のため、バッシングエリア（下げ台）を綺麗に保つ取り組みを自ら率先して実施し、チーム全体で継続できる仕組みを作成。顧客満足度と職場環境の改善に繋げた。\\n自ら課題を見つけ行動に移す主体性と、地道な取り組みを続ける泥臭さで、業務改善やスタッフの働きやすい環境作りに貢献。", "technologies": ""}]
f8fb5379-46f3-4584-9bf9-abc98b4aec91	b6fffe9c-49f4-400f-a200-d0fdce25d92b	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社リアステージ", "endDate": "", "position": "toC営業（テレアポ）", "isCurrent": false, "startDate": "", "description": "1日　300~400荷電\\n3ヶ月で3,40件のアポイント\\n通電からアポイントまでは80%以上", "achievements": "新卒人材紹介会社でテレアポ営業を行なっておりました。主には学生への荷電業務となります。通電から実際のアポイントまでは80%以上の転換率であり、これを達成するために常に相手を楽しませることを意識しておりました。相手の火をが見えない分、常に楽しく話すことを意識しておりました。", "technologies": ""}, {"id": 2, "isOpen": true, "company": "株式会社JUKKI", "endDate": "", "position": "SNS運用/自社サービス運用保守", "isCurrent": false, "startDate": "", "description": "インスタグラムフォロワー400%増加（1000人→5000人）\\nペルソナの設定から実行まで行う\\n自社サービスのデータベースの管理", "achievements": "株式会社JUKKIでは、オープンマネーというプロダクトを運営しており、実際に使うユーザーの獲得のためのSNS運用とそのサービスのデータベースを整理する業務を行なっておりました。上司と一緒にすることが多かったので、可能な限り自身で考え、仮説をたて、議論をして進めるという形をとりました。", "technologies": ""}]
6569ed0a-3dff-4cd9-b548-13b3f0bb2e92	3f73fb8f-02ed-470c-b884-6c629dc46d88	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
96cdb9f3-399b-4c05-a0f4-2637f677595d	4a045c2c-ca58-457b-b2bc-6ba420353e27	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社ookami", "endDate": "", "position": "セールス", "isCurrent": false, "startDate": "", "description": "会社概要\\n・スポーツの試合配信アプリの運営\\n・スポーツチームの公式アプリ開発・運営\\n\\n略歴\\n2023/12  配信チームに配属　スポーツ試合配信の業務を担当\\n2024/2 新規チーム立ち上げに参加　セールスチームの初代リーダー\\n~2024/6 チームの目標設定やマネジメント等のリーダー業務のみならず、プレイヤーとしてのセールス活動も実行\\n\\n勤務\\n・週3日、週20時間弱", "achievements": "セールスチームでは、定額プラン契約チームに対して、本契約をどう結ばせるかという営業を行なっていました。\\n自分が最初の1人として始まったプロジェクトでしたので、個人成果とチームの成果の2つを最大化させることに注力いたしました。\\n前者に関しては、顧客の広報戦略を徹底的に調べ、信頼感を感じていただくとともに、広報戦略の提案をさせていただくことで、自社のサービスの良さを伝えることを意識しました。\\n後者に関しては、目標を何度も共有することを意識しました。なぜこのプロジェクトを実施していて、何を達成したいのかを常に明確にし、共有することで、メンバーのモチベーション維持を徹底しました。\\nこの結果、チームとして掲げた目標数の半分以上を私一人で達成し、チームとしては目標の1.3倍の数値を達成することができました。", "technologies": ""}, {"id": 2, "isOpen": true, "company": "しるし株式会社", "endDate": "", "position": "マーケティング", "isCurrent": false, "startDate": "", "description": "会社概要\\n・ECモール(Amazon/楽天市場)の運用代行・コンサルティング\\n・現状、市場では2番手の売り上げ\\n\\n\\n略歴\\n2024/8 フルタイムのインターン生として、楽天事業部に配属\\n2024/10 クライアントを担当開始\\n2024/12 担当クライアントの売上を3ヶ月で100万円以上成長\\n2024/1 Yahoo!事業部の立ち上げに参画　リーダーとして、モールの理解から仕組みづくりまで行う\\n\\n\\n勤務\\n・週5日、週60時間ほど\\n", "achievements": "私は、楽天にヘアケア品を出品している顧客を担当していました。売上は月10万円程でしたが、3ヶ月で月80万円まで伸ばすことがノルマとして課せられていました。私は未経験の自分が会社に貢献するためには、誰よりも高い目標を掲げ、誰よりも努力することが必要であると考えました。そのため、目標をノルマの1.5倍に設定しました。これを達成するためにはなにが必要なのか、現状分析を行い、「指名層の売上最大化」と「新規顧客の獲得」という戦略を策定しました。前者では、サムネ画像改修や検索上位の広告を活用し転売対策を行い、アクセス数を向上しました。また、セット買いの導線を整備し、客単価を600円向上させました。後者では、ヘアケア品の購入歴があるユーザーに広告を配信し、前者施策と合わせてアクセス数を9倍に成長させました。また、ページを改修することで、アクセス数を増やしながらも転換率を維持させました。\\n上記戦略に基づく施策を徹底的にやり抜いたことで、3ヶ月で月120万円程まで成長させることができました。", "technologies": ""}]
296314a1-fbe4-4110-a7ae-073a152d6ad3	9bc4eecc-63a7-44e2-b8d1-39b2f40b2e6e	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
b6d304fa-9915-4a14-9eb4-3c01c6abf283	352a5fc6-4321-4a59-a523-6a609ef330f3	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
e8bba871-17f9-4239-ada0-b7e4ece75342	63f39513-e796-4a7e-956f-c1fcc0b887d0	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
ff60c619-4dbb-4b59-9e1b-73a99c532332	af852cf8-ab15-4de0-88b7-8e286307a801	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社プレジデンテ", "endDate": "", "position": "ホールスタッフ", "isCurrent": false, "startDate": "", "description": "2022年4月に入社し、ホールスタッフおよびバーカウンター業務を兼任。お客様への接客対応、注文受付、料理提供を担当。\\n平日は1日平均110名、休日は150名の来店客を円滑に案内し、店舗のスムーズな運営をサポート。\\n平日の売上平均30万円、休日の売上平均50万円を維持するための接客品質向上に貢献。\\n忙しい時間帯における効率的な業務配分を工夫し、チーム全体の業務負担軽減を実現。", "achievements": "新人社員のサポート役を積極的に担い、最初に声をかけて相談しやすい環境を構築。新人の不安を軽減し、早期戦力化を実現するサポート体制を整えました。\\n新人研修においては、自らカリキュラムを作成し、5日間で必要な業務を全て習得できるように業務フローを仕組み化。業務の効率化と研修の質向上に挑戦しました。\\n周囲の状況を観察し、必要な改善点を見つけ出して行動に移す好奇心と挑戦心を持ち、新人だけでなくチーム全体の成長に貢献しました。\\n", "technologies": ""}]
1b83fd27-ad66-4cb3-a957-9ad64abcf673	fc1c6f07-17ab-47f4-b46d-51cad7944fd1	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社knock", "endDate": "", "position": "マーケティング業務", "isCurrent": false, "startDate": "", "description": "市場分析、企画立案、企業様向けの企画説明などの一貫したマーケティング業務をしております。", "achievements": "現状はわかりやすい形で結果は出ておりません。", "technologies": ""}]
08f9abff-a769-41fb-b08f-fbf718818dac	705aa51b-9462-4ba1-8f9a-791d7a981958	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
07cbe8bb-8ab9-4a85-aa4c-d1bc1506e4a2	aab45522-ea85-47ee-a4d7-c2afa0aca3ba	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
16f298b7-149d-4287-9e64-0b0ded3f3702	31806d0d-9ba9-45b1-939c-7b9f19f80f43	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
0970316a-26f1-42c1-a69e-05668c0e8418	da8b4683-8dcb-4780-8875-6d04734cedd0	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
6be48f34-c2bb-46d7-9375-1e706f6dbf47	c6762934-7f79-4d5c-95fd-a23a7584c842	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
055e47cd-9e06-43f0-869a-a0b8014ace82	c9742577-2e88-4338-b749-d3c416db30c5	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
fe28ca1f-129d-4b89-bead-9c17d808fa72	3ed44c78-7891-4717-b1c3-f61dae38e55d	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
2cd4150b-20ca-49b9-9d68-3a8818562fe9	26544502-3e9d-4566-9822-ccfe4fea372e	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
addfd04c-bb1b-42ba-b075-a99d04043891	3f66b76a-eaa6-4b3f-81a9-abe4abe0eb0a	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
04e20d2a-ec01-4b27-bd04-6ef00509f606	0d60a7c2-894b-4c93-ac89-f9085b5ad39d	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社ステップハウス", "endDate": "", "position": "営業", "isCurrent": false, "startDate": "", "description": "訪問営業のアポインターとして活動。平均月アポ数1件のところ、コンスタントに3件アポ獲得に成功。\\nアポイントからクロージングまで一気貫通して営業を行う。", "achievements": "とにかく量にこだわりました。訪問で獲得できるアポイントの割合はかなり低いので、計画的に短時間で効率よくアポイントができる地域等を事前にリサーチし、アポイント活動を続けました。最初は全くアポが取れませんでしたが、やっていくうちにトークスキルも身につき最終的には平均の3倍を超えるアポイントを獲得できるようになりました。", "technologies": ""}]
a6e3210b-4b5e-4c30-b749-e195a8b3eb1d	c2944b5b-d323-4517-8432-8b6c324b8c7e	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社Revival Core", "endDate": "", "position": "M&Aコンサルタント", "isCurrent": false, "startDate": "", "description": "2024年7月に入社\\n「お試し!M&Aチーム」というM&Aの内製化支援サービスの立ち上げと実行に従事：\\n現在、上場企業3社のM&A支援を担当し、それぞれの案件が進行中\\nM&A仲介会社に対し、クライアント企業の買収ニーズを分かりやすく伝え、ソーシングの連携を強化。\\nその結果、案件の紹介数を増やすことに貢献。\\n", "achievements": "クライアントの買収ニーズをM&A仲介会社やFAに分かりやすく伝えるため、資料作成や関係構築に貢献しました。\\nまた、複数の買収案件を同時に進める中で、進捗管理を徹底し、円滑な案件推進に努めました。", "technologies": ""}, {"id": 2, "isOpen": true, "company": "株式会社Legoliss", "endDate": "", "position": "データエンジニア", "isCurrent": false, "startDate": "", "description": "2024年5月入社\\n技術検証プロジェクトの支援:\\n現在使用されているデータ連携プロダクトの性能評価と料金体系の調査を実施\\n調査結果を整理し、最終的に資料を作成\\n\\nダッシュボード作成の推進:\\n約100種類のグラフや表を作成し、データの可視化を支援\\nクライアントとダッシュボードのイメージをすり合わせ、最適なデザインを検討\\n\\nマクロ処理の分析と要件定義:\\nクライアントの属人的な業務の処理内容を分析し、コードを解読\\nクライアント自身が把握しきれていなかった処理を整理し、現在要件定義を進行中", "achievements": "クライアントの要求を的確に整理し、最適なデータ基盤や業務プロセスへ落とし込むフェーズに尽力しました。", "technologies": ""}]
d321c14d-4239-4673-b6cb-8bc80c52b642	d18783f4-a26e-4aac-8b2d-153d7f95a464	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
13e697fd-c6ba-45db-9dff-539be64f2b42	ff0ee7ba-94b4-4f0c-9e85-6d601d65e8a5	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
f822942d-2770-4423-a16f-e7796c00ea1f	3f53f625-0295-463a-b0d6-d3cb9e485dd5	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
63f32dd5-a52f-434a-b7b2-2aef3a5f7077	59da027b-7357-4904-9d5f-96f9a91c3b1c	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "NGU", "endDate": "", "position": "営業", "isCurrent": false, "startDate": "", "description": "長期インターン/営業\\n2024年4月 入社、営業に配属。\\n客単価平均60万円の住宅リフォーム営業に従事。", "achievements": "新規顧客開拓に従事し、押し売りではなく信頼関係の構築を第一に置いた。その結果お客様のご紹介で約60万円の新規契約いただけることに成功し、売上向上に貢献。", "technologies": ""}, {"id": 2, "isOpen": true, "company": "早川工業", "endDate": "", "position": "経営企画", "isCurrent": false, "startDate": "", "description": "2024年12月入社、経営企画チーム配属。メディア向けの関係構築と顧客向けのSNS運用はじめとした広報PR活動を主に担当。\\n2025年2月より、新規事業プロジェクト発足に伴い広報PRと兼任でプロジェクトを担当し、市場調査からサービス概要・LP作成、営業方法の選定までを担当。", "achievements": "市場調査では、インターネットを主とした量的調査とターゲット層を想定したインタビューなどの質的調査を行いコンセプトの明確化や料金を設定。また営業経験を活かして、アタックリストの作成などに従事中。", "technologies": ""}]
cc429168-5db7-4b96-af63-355d09c6bebc	167c731f-dafd-4538-8651-6969a4dd89d2	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社TOKIUM", "endDate": "", "position": "インサイドセールス", "isCurrent": false, "startDate": "", "description": "長期インターン/営業\\n2024年2月 入社、インサイドセールス部に配属\\nインターン生のマネジメント（7名）\\n主に教育や業界策定など上流に携わる。\\nアポ獲得数初月比7.5倍\\n2024年10月 退社", "achievements": "教育と方針策定の二点に分けて話したい。\\nまず教育については、一期生として入社したため、後輩へのロープレ等に注力した経験がある。特にスクリプトの作成や架電時のマニュアルの強化、訴求文言の策定などに力を入れていた。\\n方針策定については、商材が法対応などの環境要因に左右されるようなものであったため、法対応のニーズが高まっていた業界の見極めなどを行うことでチームとしての方針を決定し、アポ獲得率の向上に寄与した。", "technologies": ""}, {"id": 2, "isOpen": true, "company": "株式会社ニアメロ", "endDate": "", "position": "マーケティング、インサイドセールス、カスタマーサクセス、開発", "isCurrent": false, "startDate": "", "description": "長期インターン/マーケティング\\n2024年10月 入社、商材全体のチーム単位でのマネジメント\\n主にマーケティングから開発まで幅広く担当。海外進出用の製品設計やマーケティングを担当し事業拡大に関わるほか、11月開催の展示会に出展するため展示会マーケティング担当として携わる。", "achievements": "商材関連の業務と会社の祖業でもあるマーケティングコンサルの二つに分けて話したい。\\n商材関連の業務に関しては、Google広告やMeta広告を月予算100万円で運用し二週間でアポ獲得数を3倍以上に増やした。\\nマーケティングコンサルティングについては、某最大手香水ブランドの広告運用などを行っている。", "technologies": ""}]
e3f2511e-722f-4a1b-9158-2c89bd1c7509	9b607192-b5df-43a5-9522-219b02b26240	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社ファンタップ", "endDate": "", "position": "エンジニア", "isCurrent": false, "startDate": "", "description": "電子楽譜を販売する企業にてレコメンドエンジンにAI導入を検討。\\npythonを用いて既存のシステムよりも精度良くレコメンドができることを実証した。", "achievements": "・データを整形して入力するだけで複数の機械学習手法を同時に試すことができるrecboleの活用を提案し、実際に約20個の手法を実際の顧客の購入データを用いて学習した。\\n・metricsを選定し、導入した。", "technologies": ""}, {"id": 2, "isOpen": true, "company": "株式会社エムニ", "endDate": "", "position": "セールスエンジニア、ライター", "isCurrent": false, "startDate": "", "description": "大学3年時から現在も在籍。最も注力した長期インターン。\\nセールスエンジニアとして採用され、展示会に複数回参加したり、一人でリバースピッチに参加したりと営業活動を行った。また顧客に商談で見せるデモの開発に携わったり、リードを獲得するためのSEO記事を１０本ほど執筆した。\\n営業活動：\\n展示会では最高で名刺60枚の交換と7件の1次商談のアポイント/１日を達成し、リバースピッチでは登壇社７社中温度感の高い３社のアポイントを獲得した。\\nライター：\\nSEOを意識し、社内の技術に関心を持ってもらえるような記事を１０本ほど執筆し、内２本はgoogle検索で1ページ目に表示させることに成功した。\\nエンジニア：\\npythonを用いて商談相手からいただいた実際のデータを活用する簡易webアプリを作成した。アプリの内容については詳しくは伏せるが、gptのAPIを繋いて文書を効率的に扱うといったものだ。\\n\\n", "achievements": "展示会：\\nチーム全体のアポイント獲得数が最大になるような立ち回りを徹底した。具体的には積極的に来場者に話しかけ、温度感の低い人や同業者は長引かないように雑談を行い、温度感の高い人には商談に繋げるためのより具体的な話をした。何度も参加した経験から温度感の高い人を早めに見極め、場合によっては自分より詳しい社員のメンバーにバトンタッチすることで全体としてのアポイント獲得数増加に貢献できた。\\n\\nリバースピッチ：\\n個人でピッチに参加し、3件の温度感の高い商談に繋げることができた。内一件は引き継いだフィールドセールスのメンバーがプロジェクト化に成功した。\\n\\nライター：\\nライターチームで執筆する記事のキーワードについて、唯一営業も経験して実際の顧客と喋っているという強みを活かし、相性の良いと思われるキーワードをいくつも提案しそのほとんどが採用された。\\n\\nエンジニア：\\n高速デモを売りにしているため、要件いただいてから一人で５日でデモを仕上げた。\\n", "technologies": ""}, {"id": 3, "isOpen": true, "company": "株式会社HACARUS", "endDate": "", "position": "ライター", "isCurrent": false, "startDate": "", "description": "大学4年4月ごろから在籍。\\ndepth anythingやsegment anythingといった新しいAIツールをgoogle colab等にて実際に試し、使用した感想や技術的な部分を記事にして執筆した。\\n「depth anything」と検索するとgoogle 検索で５番目くらいには表示させることができた。", "achievements": "従来の単眼深度推定のモデルである MiDaS との比較を提案し、実際に論文に目を通すなどして相違点を調べた。", "technologies": ""}]
3d77d24d-3651-4501-a7b2-06a98278c4db	135b9fed-0f3e-413e-b0c8-cda8c278d3dd	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
e1da9937-3bcc-4efb-a56b-94d517057b78	46b62c11-f0ef-4c3c-a7b9-68c10f1fe53c	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
60db1268-7b64-423b-adab-d986350e1a1d	c0ef5298-17dc-47e4-adab-0c862f23283d	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "一般社団法人ASIBA", "endDate": "", "position": "プロジェクト企画運営", "isCurrent": false, "startDate": "", "description": "長期インターン/営業\\n2024年1月 入社/ワークショップ①　メンバーとして完遂\\n2024年2月　ワークショップ②　PMとして完遂\\n2024年4月 インキュベーションプログラム企画運営責任者\\n2024年7月 インキュベーションプログラム完遂\\n2024年9月 コミュニティイベント　PMとして完遂\\n2024年12月 法人向けコミュニティイベント　PMとして完遂\\n\\n参加団体20団体(建築学生1~3人で構成)の伴走\\nプログラム運営5人のリーダー/最終発表会 当日スタッフ40人の会場運営責任者\\nインキュベーションプログラム最終発表会 来場者数 300人(法人70社/学生を含む)　前年度比2倍\\nインキュベーションプログラム最終発表会 平均来場者満足度 4.2/5\\n東京都が運営する多様な主体によるスタートアップ支援展開事業「TOKYO SUTEAM」の協定事業として採択", "achievements": "建築学生からなる20団体のアイデアは斬新な一方、実現可能性が課題だった。課題に対し、2週間で5回企業との壁打ち(フィードバックをもらう機会)を課したが、実際5回を達成したのは6団体のみだった。学生にとって自発的に企業にアポを取ることは難易度が高いのではないかと考え、運営内で協議し、運営で手分けして法人イベント等に参加し協力可能な企業を見つけ次第、参加団体に繋ぐという施策を行った。その結果、15団体で壁打ちの回数が向上し、多くの「現場の声」を聞き、それを反映したことで各アイデアを実現可能なものに近づけることができた。3か月後の最終ピッチでは多くの企業から高い評価をいただき、4社との協業・計6団体の事業化を達成できた。", "technologies": ""}]
4abb96c4-2159-4889-af28-31b584ea3879	97c9522c-a69a-4692-8d71-1d05960a7b34	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社アップグレード", "endDate": "", "position": "Meta広告の運用", "isCurrent": false, "startDate": "", "description": "長期インターン/マーケティング\\n\\n経歴\\n2023年9月 入社\\n2023年 メンバー（上司のもとで担当チャネルを持つ）として広告部署に配属\\n2024年 2月 これまでリーチできていなかったターゲット層を新たに開拓し、1ヶ月で流入数を50%上昇させることに成功\\n2024年 3月 先月の実績を受けてシニアメンバー（担当チャネルを単独で持つ）に昇格\\n2024年 7月 退職\\n\\n実績\\n・Meta広告の担当者として、全社の集客の約1/3を担う。\\n・在籍した期間で担当領域での流入数を125%上昇させることに成功し、この期間で会社の月商は約3倍に成長した。\\n・当時30名程度いたインターン生の中で2番目の早さでの昇格を果たした。\\n\\n業務内容\\nファンダメンタルズ\\n・月間の目標からコンセプトの方針や広告作成数などの月間計画を立てる。\\n・月間計画に基づいて、広告立案→ デザイナーに依頼or自力で作成→検証→改善行動のPDCAを回す。\\nテクニカル\\n・日々、数値を確認して適切なアクションを取る。\\n・日々のCPA最適化に取り組みつつ、仮説立案→検証を行う。", "achievements": "担当領域においてすでに仕組み化されているものに則って業務を行うだけでなく、新規ターゲットの開拓や新しい広告形態の発案・定着など、自らが主体となって仕組みを作っていくところにも貢献することができた。", "technologies": ""}]
63afd74b-2df8-4469-a653-2773db01c95f	0f4a9c06-1625-4164-b7fa-8736cf9ba0ee	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社ISSUE RESEARCH & TECHNOLOGIES", "endDate": "", "position": "コンサルティング", "isCurrent": false, "startDate": "", "description": "特定業界の市場動向を分析し、クライアントの新規事業立ち上げを支援\\nデータ分析結果をもとに、効果的なマーケティング戦略を提案\\n", "achievements": "市場リサーチやデータ分析を通じて、業界や市場の深い知見を得て、クライアントの意思決定をサポートする質の高い情報を提供しました。また、クライアント向けの提案資料作成において、データの視覚化やプレゼンテーション資料のデザインを担当しました。これにより、提案内容の理解促進とクライアントへの効果的なコミュニケーションを実現しました。\\n", "technologies": ""}]
d41e6045-0cd4-4d68-8ec3-2ac53c3d7f56	ca4e39ba-5615-4d0c-9bdc-0bccfe129edf	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
4749f6ea-7292-46c5-93e8-24e9f6f5ad0d	2a242b76-5af3-4498-8296-cf330d67db70	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
313c1fd1-67a6-4ab2-a894-759d5b4d60e1	a7dfacbb-b547-4744-aec2-ad2eab969769	\N	\N	[]	[]	\N	\N	2025-07-07 04:58:06.646+00	{}	[]
92ad6a6f-eb93-4918-af5e-69eee15d6aeb	b7b5e5bf-36b3-4ab4-89d6-fdc887fe38c9	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社okke", "endDate": "", "position": "営業", "isCurrent": false, "startDate": "", "description": "長期インターン/営業\\n大学1年次に株式会社okkeに入社。営業職として採用され、塾向け法人営業を行う。法人営業では、プレーヤーとして活動しつつ、営業システムの構築に従事した。", "achievements": "既存の営業システムの改善を行なった。1人の営業担当がアプローチからクロージングまで担当する形から、分業制にすることで営業効率が向上し、半期契約数が約１.5倍の12件になった。", "technologies": ""}, {"id": 2, "isOpen": true, "company": "Co- Studio株式会社", "endDate": "", "position": "新規事業開発、営業", "isCurrent": false, "startDate": "", "description": "大学3年次にCo- Studio株式会社入社。大企業の新規事業開発の伴走支援メンバーとして、複数のプロジェクトに参加。\\nまた、営業としてMAツールを駆使し、インバウンド構築に貢献。", "achievements": "大学の専攻である教育学、心理学の知見を生かし、大企業の新規事業プロジェクトの推進に貢献。\\nまた、MAツールの効率的な活用を通して、営業効率の改善を実現。", "technologies": ""}]
8e7d9587-ac89-445c-a09a-54454f08bd86	9df85d0f-e29d-4595-b99d-bcd49d35bdd8	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
848b46cf-c9f3-4698-bbaf-11f0da05784c	5d9f9a06-8efa-4930-bf2d-35149922bf18	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社中小企業ファイナンシャルアドバイザリー", "endDate": "", "position": "法人営業", "isCurrent": false, "startDate": "", "description": "2024年2月入社、フロントオフィスに配属\\n2024年10月、インターン生リーダーに\\n営業成績社内2位\\n月平均2件案件獲得", "achievements": "何度もアポ営業を行うことで、単純接触効果をはかり、信頼度を高めた。1回目の訪問は最初に概要を伝え、残りの時間は雑談ベースで会話して警戒を解いてもらうなど、営業の仕方にも自分なりに工夫した。", "technologies": ""}]
0ed4f85c-f255-4200-bf3b-dc0cae23eb67	52a1c9f5-113a-44f7-97ca-3239f17bea7b	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
c922c84a-d8e1-4e20-b971-383130e21284	dadb589c-c2b9-4afb-86f6-1c1cb675ba26	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "EmpireState株式会社", "endDate": "", "position": "インサイドセールス及びコンサルタント業務", "isCurrent": false, "startDate": "", "description": "プロジェクトマネージャーとして担当PJを管轄。", "achievements": "課されるものはPJの契約継続のみの成果主義でそれ以外の全てはPMである自分に一任される。そのため、成果を高めることから逆算して、PJに関わる様々な1次情報をキャッチアップし仮説を立て、PDCAを回しつつKPIを設定し、目標に向かってチームマネジメントをするということを頑張った。具体的には営業リストの確度を高めるために、架電結果を分析し企業規模や架電時間などでより相手企業こ担当者に繋がりやすい状況を検討した。また、定性的な情報も共有しやすい環境を整備し、トークスクリプトの内容を常に更新することで、個人の営業力向上をアシストした。", "technologies": ""}]
ec869955-2488-417a-ac09-2c2e954ad516	bca063d5-97a4-4f25-b1a8-2126ee0ee0b7	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社情報基盤開発", "endDate": "", "position": "経営立案", "isCurrent": false, "startDate": "", "description": "・長期インターンとして、ストレスチェックサービス「ソシキスイッチ」など、職場のメンタルヘルスケアや業務効率化に関するサービスのマーケティングに携わる\\n", "achievements": "私は株式会社情報基盤開発（旧称：AltPaper）での2年間の長期インターンシップを通じ、データに基づいた戦略立案と実行を通じて、企業の成長に貢献する能力を培ってきました。\\n\\n具体的には、以下の3つの領域で成果を上げています。\\n\\n新規市場開拓における戦略立案: 既存の画像認識技術を教育分野や医療分野に応用するため、市場調査と顧客ニーズの分析を行い、教育機関向け試験採点システムや医療機関向け患者満足度調査ツールの開発を提案しました。これらの提案は、新規顧客層の獲得に向けた具体的な道筋を示すものとして、経営陣から高い評価を得ました。\\n\\nKPI設定と運用による顧客満足度向上: ストレスチェックサービス「ソシキスイッチ」の導入企業数増加に向け、年間新規導入企業数20％増というKGIを設定し、月間の営業アプローチ件数や問い合わせ対応速度をKPIとして運用しました。さらに、定期的な顧客アンケートを実施し、顧客満足度スコアを15%向上させ、契約更新率を10%改善しました。これらの成果は、データに基づいたPDCAサイクルを回し、継続的にサービスを改善することで実現しました。\\n\\n危機管理における問題解決: サービス名称変更に伴う周知不足や、偽サイトの出現といった危機的状況に対し、迅速かつ適切な対応策を講じました。具体的には、既存顧客への直接連絡やウェブサイト・SNSを活用した広報活動を強化し、名称変更をスムーズに移行させました。また、偽サイトに対しては、公式サイトでの注意喚起と法的手続きを迅速に行い、顧客からの信頼を維持し、ブランドイメージの毀損を最小限に食い止めました。\\n\\nこれらの経験を通じて、データ分析に基づいた課題発見力、戦略的な思考力、そして迅速な問題解決能力を磨きました。", "technologies": ""}]
ee525e4b-e662-4b60-a798-1641d76ad97b	cf61cc6a-d519-453e-90fa-11a0687178e1	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
4fe666a5-5f38-4320-9cc6-9bd764379bf4	dff2614b-fb1d-4e77-a61c-435bdd58b232	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
02f054ce-a649-47d9-822c-f2ea17db30fd	07e2ba43-465e-463e-845c-62f9bf1632b2	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
3c2b6001-a9e1-4ce0-8430-087de31c0c76	959f9f6b-c2cc-473a-b3cf-e12569a36414	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社Bloc nation", "endDate": "", "position": "学生インターン", "isCurrent": false, "startDate": "", "description": "2021年6月に入社\\n2021年9月からデザインシンキングワークショップに学生インターンとして参加\\n2022年ワークショップの司会進行を務める", "achievements": "その他、ワークショップで使用する英語のYouTubeの翻訳や、facebookの運営", "technologies": ""}]
05691110-0d13-4ffb-8dd8-d92999fd1adf	e386dc5e-dfe3-4b97-bd16-9842903e194b	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
9a9d5869-a009-4497-aad0-5daa4a58fa8e	0e4d7623-05e3-4c32-9ec1-d26e75c80f10	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社　ROBOTPAYMENT", "endDate": "", "position": "社長室", "isCurrent": false, "startDate": "", "description": "IR資料・競合分析資料の作成を担当（上場企業向け）\\n\\n実際の経営会議資料の一部にアウトプットが採用\\n\\n決算短信や財務データからの情報収集・分析力を実践的に習得\\n\\n上司からのフィードバックを反映し、提案力・改善力を向上\\n\\n社会人と同等の水準で業務に取り組み、高い評価を獲得", "achievements": "\\nIR資料や競合分析資料の作成を担当し、数字やデータから意味を読み取る力を磨いた。経営層の意思決定に役立つ情報を意識して整理し、見やすさや説得力にこだわって資料を作成した。また、業務の中で自ら改善点を見つけて提案するなど、主体的に動く姿勢を貫いた。その結果、作成した資料の一部が実際の経営会議で使用されるなど、成果を残すことができた。\\n\\n", "technologies": ""}]
b59f9662-6172-449e-a0aa-5c35d0fdbaf3	50176ed3-b857-4136-8959-536dc558dc3b	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社bit", "endDate": "", "position": "広告マーケティング", "isCurrent": false, "startDate": "", "description": "私は外国人観光客向けのツアーにおける動画プロモーション施策において、コンテンツ改善とマーケティング戦略の再設計を行い、アクセス数を140％、予約数を120％まで引き上げた実績があります。\\n", "achievements": "当初、動画は従来の定型フォーマットに従った内容で、再生はされるものの予約には繋がっていませんでした。そこで、「誰に、どんな価値を届けるのか」を再定義することが課題だと捉え、自ら仮説を立てて改善に取り組みました。\\n\\nまず動画の構成をゼロベースで見直し、「一瞬で魅力が伝わる導入＋文化体験の具体性＋予約導線強化」にフォーカスしたストーリーボードを提案。加えて、従来は漠然と広く設定されていたターゲット層を、「お金に余裕がある40代50代の中間層」にしぼり、媒体のクリエイティブ性と配信戦略を工夫しました。\\n\\n結果として、ターゲット層のエンゲージメントが改善され、アクセス数は140%、予約数も120%に増加。施策が成果に繋がるまで、PDCAを高速で回すことを意識し、自ら改善提案と実行を繰り返した経験は、課題実行力につながっていると思います。", "technologies": ""}, {"id": 2, "isOpen": true, "company": "株式会社リクロマ", "endDate": "", "position": "コンサルタント", "isCurrent": false, "startDate": "", "description": "私は気候変動に関するコンサルティング業務において、TCFD開示支援やCDP（気候変動開示スコア）向上に向けたアドバイザリー業務に従事しました。専門性の高い領域でありながら、クライアントはESGや気候変動への知識が十分でない場合も多く、「専門的な内容を噛み砕き、事業戦略と結びつけて提案する力」が求められました。", "achievements": "CO₂排出量削減やCDPのスコア向上といった目標に対して、まずは開示基準（TCFD）や評価指標（CDP）の構造を整理し、スコアアップに寄与する開示項目を特定。それをもとに、既存の開示資料や企業活動と突き合わせながら改善提案を作成しました。\\n\\n特に意識したのは、「企業ごとの実情や制約を踏まえた、現実的かつ効果的なアクション」を提案することです。知識のインプットと同時に、「なぜこの施策が有効なのか」を丁寧に言語化して提案し、フィードバックをもとに何度も修正を重ねました。", "technologies": ""}]
261be6b7-1f70-435e-998d-ca23980e7c3a	426b5d2f-0775-4b45-973b-e3b949b0e02a	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "コラボレックス株式会社", "endDate": "", "position": "営業代行", "isCurrent": false, "startDate": "", "description": "成約率0.2%のクライアントの新規開拓2件", "achievements": "ただ闇雲に数を打つのではなく、\\n1.ターゲット選定\\n2.営業トークスクリプトの改善\\n3.業界理解、会社理解\\nに力を入れ、市場のトレンドを理解し成約の見込みがある企業をリストアップしアプローチ。結果的に成約を2件、上場プライム企業との取引を実現した。", "technologies": ""}, {"id": 2, "isOpen": true, "company": "株式会社NINZIA", "endDate": "", "position": "ロジスティックス", "isCurrent": false, "startDate": "", "description": "グルテンフリー食品のアメリカ販路拡大。（現在進行中）", "achievements": "ロジスティックスを担当している。低単価の食品を可能な限り低コストでアメリカへ届ける。JETROやkitchentownとの折衝業務や、高ロットの受注を得るためアメリカ版モノタロウの開設やアメリカ版クラウドファンディングの立上、実際現地に行きpopupをし、アメリカ人の嗜好や意見を得た。", "technologies": ""}, {"id": 3, "isOpen": true, "company": "ユニクロ", "endDate": "", "position": "AP（アドバンスドパートナー）", "isCurrent": false, "startDate": "", "description": "アルバイトはPN1〜PN3を経由し、テストを受けPNを統括するAPになる。\\nお客様満足度の向上4→4.5を達成した。（5段階中平均）", "achievements": "お客様の満足度を向上するにはを課題とし、店長、店長代行と取り組んだ。\\n問題として\\n1.新人スタッフが多く、全員が良質の接客をできていなかった。\\n2.日中のスタッフ不足\\n3.FBの質が低い→結果的にアルバイトのモチベーションを低下させている\\nと考え対策を講じた。", "technologies": ""}]
3e344372-b688-4cc0-a2b8-8bd20c16e363	31044927-8d62-4d07-8b66-0e3d7d753053	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
348d1afb-a8ed-441c-8693-c77b59f2ecb7	43b05057-94c5-490e-ba94-009330d04c50	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
11fc83a9-60e4-4ccb-bc1f-e533679f8d04	567e6500-5479-4868-9c45-cb2ff864d599	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社Athena Technologies", "endDate": "", "position": "エンジニア", "isCurrent": false, "startDate": "", "description": "長期インターン/エンジニア\\n- データ分析\\n- 決定木ベースの予測モデル構築\\n- クライアントへの提出資料作成\\n- LLMチャットボット開発", "achievements": "クライアント様が抱える課題を、LGBMモデルを使用した最適数値予測モデルを構築することによって解決しました。資料作成においては、どの変数選択が適切か、目的変数はどのような表現方法が適切かなど、クライアント様目線でどのようにすれば理解しやすいかを考慮しました。", "technologies": ""}]
184a5fb0-dd5e-4192-8eee-6573b34bcacc	9fc033ff-274c-4d95-8749-7a8b83cd18f3	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
ae51dc77-1cf0-4fc6-8522-241e3175b4a3	e97f13bd-f43d-4ab2-bfa3-98416d8e856b	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
f67a7e9e-eb28-4d52-bc09-b583f4d92b52	f3975bb1-e73d-440a-970d-ee320dcbdad3	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社orosy", "endDate": "", "position": "営業", "isCurrent": false, "startDate": "", "description": "2024年6月 入社、営業部に配属\\n2024年9月 契約件数5件突破\\n2024年10月 契約件数10件突破\\n", "achievements": "既存顧客からの売上を増やし安定した業績基盤を培うとともに、信頼関係を深めることで、お付き合いのある企業をご紹介いただき、新規顧客獲得につなげました。 2024年度に獲得した新規顧客10件のうち、4件まではこのような形で紹介いただいた企業です。また、自社からメールを送らせていただいた企業さんにも伝え方を工夫することで契約数を伸ばすことができました。", "technologies": ""}, {"id": 2, "isOpen": true, "company": "株式会社EXPACT", "endDate": "", "position": "コンサル補助業務", "isCurrent": false, "startDate": "", "description": "2024年9月～2025年3月　静岡県次世代起業家育成プロジェクト「TOMOL」立ち上げ・運営\\n2024年12月～　株式会社AWH様新規宿泊施設事業に関する補助金申請業務・立ち上げ\\n2025年2月～　静岡県次世代企業家育成プロジェクト2期目運営開始", "achievements": "宿泊事業の補助金申請業務を進めていく中で困難だった点として地方立地ゆえにインバウンド需要が不透明であり、顧客ニーズに関する既存データも古く、需要予測が困難だったことが挙げられる。この課題に対し、自社コンサルタントとの協議や類似事例の調査を通じて複数の売上シナリオを構築し、宿泊施設側にはアンケート調査を依頼した。収集した定性・定量データを基に、施設規模やサービス内容を柔軟に設計し、説得力のある事業計画を仕上げた。", "technologies": ""}]
fa8e52be-4c59-41ca-9544-80348ece0bd9	efcd4758-2874-4774-966d-4e29094a0ed1	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社リクルート", "endDate": "", "position": "法人営業", "isCurrent": false, "startDate": "", "description": "2022年10月~2023年12月\\n決済端末「AirPay」の営業部に所属\\n2023年4月よりチームリーダに昇格\\nインターン生4名のマネジメント\\n営業目標 3ヶ月連続未達（2023年2月~2023年4月）の後、6ヶ月連続営業目標達成", "achievements": "架電先企業の情報や業界ごとに特徴的な決済周りの課題などの情報のキャッチアップに時間がかかっていたことによる「架電数の不足」。完全リモートワークのため、手を抜ける状況であることによる「メンバーのモチベーション低下」という2つの課題があった。「架電数の不足」については架電リストの整理と架電先業界ごとの分業制の導入、「メンバーのモチベーション低下」については「もぐもぐタイム」（おやつ休憩という形の雑談時間）の導入、OB•OGによる就活エピソードの共有、ナレッジ共有の義務化、などの施策を行い、メンバーのモチベーションを高く維持しながら架電効率を改善し、半年間営業目標を達成することに成功した。", "technologies": ""}, {"id": 2, "isOpen": true, "company": "株式会社クーシー", "endDate": "", "position": "オウンドメディア運営", "isCurrent": false, "startDate": "", "description": "2023年4月~2024年6月\\nマーケティング部に所属しオウンドメディアの運用全般を担当\\nブログ改善施策を社長に提案し承諾を得る。その後のディレクション業務も担当し、自社コーポレートサイトの「web制作会社」における検索順位を18位から5位にまで改善。", "achievements": "主な案件の獲得ルートが①web広告、②既存顧客のリニューアル案件、がメインであったため、web検索経由での案件獲得を目的としたブログ運営にリソースが割かれていない状況であった（運用には営業部兼マーケティング部の社員、海外支店のマーケティング部所属の社員、私、という3人が主に関わっていた）。そのため、新規記事を執筆するだけの基本的な運営しか行えず、2023年秋に行われたGoogle検索エンジンのアルゴリズム改定によりサイトの評価が急激に落ちてしまった。そこで包括的かつ永続的なブログ運営の体制を整えるべく、ブログ改善に必要な施策を立案、そして施策遂行の計画と必要なリソースを社員の方の協力も得ながら具体的に割り出し、社長に直接提案。具体的には①放置されている過去記事のリライト業務、②全記事の体系化業務、③コンテンツ計画の作成業務、の3つの施策と、それに必要な人員としてインターン生2名の雇用を提案。この提案が承認され、インターン生2名とともに改善施策を行い、自社コーポレートサイトの「web制作会社」における検索順位を18位から5位にまで改善した。", "technologies": ""}]
ba3fde7a-ca88-4a7d-99e9-ba13c85c2f25	6a7cbcb6-d3fe-4aff-9941-0b306314814d	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
91db18e1-0b78-47c6-a7de-d7dc83e6f327	311a9692-d10b-43b4-96af-43bab8fff8f6	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
6e28d44d-fd35-490a-9e8a-51e1695eb5aa	f9b08ad4-7898-41ec-859c-37fd5fe3bca4	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社パンタグラフ", "endDate": "", "position": "ウェビナー企画リーダー、UIUXコンサルタント", "isCurrent": false, "startDate": "", "description": "2024年5月 入社、デジマ部に配属\\nウェブサイトのUIUXに関して学びながら、実際のコンサル案件を担う。\\n2024年8月ウェビナーの企画開催に従事。\\n2024年11月チームリーダーに昇格。\\n2025年2月までに案件を合計3件獲得。", "achievements": "インターンシップ先でのセミナー運営で、3件の新規案件を獲得した。当初、セミナーは案件獲得を目的としているにも関わらず、新規案件が０件の現状が課題であった。そこで、2件の新規案件獲得をチームの目標に掲げた。分析の結果、「サービスの必要性がターゲットに十分に伝わっていない」ことを課題として特定した。さらに私はこの原因として、「サービス手法の説明に偏り、価値の訴求が不十分である」という仮説を立てた。そこで、30件以上の成功事例を参考にし、他社の営業資料の構成を分析した。その結果をもとに、ターゲット層の関心を引くためにメリットを明確に伝え、既存の内容からサービスの価値を訴求する内容へシフトした。その結果、セミナーで3件の案件獲得に成功し、「課題の本質を粘り強く追求する力」や「仮説をもとにチームで議論し、最適解を導く力」を培った。", "technologies": ""}]
1573b0cc-3396-464a-8bd0-cdd1a779b208	9b0d787f-1b4c-4352-b8c0-0e5193ca28c6	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社A(エース)", "endDate": "", "position": "SNSマーケティング", "isCurrent": false, "startDate": "", "description": "長期インターン/SNSマーケティング、新規事業立案\\n2023年7月 入社、SNSマーケティング部に配属\\n・KPI未達率を約20%削減\\n・1,000万円超の大型契約獲得に貢献\\n・新規事業部、インターン生チームリーダー", "achievements": "長期インターン / SNSマーケティング\\nこれまでの業務では、SNSマーケティングの一連の業務と新規事業立案を担当してまいりました。SNSマーケティングでは、インフルエンサーを起用し、訴求商品の売上向上または認知拡大をKPIに設定し、施策を進行してきました。インフルエンサーの選定や訴求方法によって施策の成果が大きく変動するため、過去の施策を分析し、改善を重ねる環境で働いていました。また、新規事業部では、AIを活用したサービスのリリースに向け、市場・競合調査や事業立案を担当しました。しかし、業界に対する誤認や事業進行の遅れが原因となり、事業化には至りませんでした。この経験を通じて、机上の空論に終わらせず、実現可能な戦略を構築することの難しさを痛感しました。", "technologies": ""}, {"id": 2, "isOpen": true, "company": "株式会社SalesNow", "endDate": "", "position": "Webマーケティング", "isCurrent": false, "startDate": "", "description": "長期インターン/Webマーケティング\\n2024年10月 入社、グロースマーケティングに配属\\n・Google AnalyticsやLooker Studioを活用したSEO改善\\n・Looker Studioを用いたKPI数値の可視化\\n・Optimize Nextを用いたABテストの実施、PDCAサイクルの実現", "achievements": "長期インターン / Webマーケティング\\n前職においてSNSマーケティングの理解を深めたことを実感し、Webマーケティングに挑戦するため本企業に入社しました。\\n基礎から学ぶためにGoogle アナリティクス認定資格を取得。まずはKPI数値を可視化するシステムの構築を担当し、現在はサイトのCTRやCVR（メルマガ登録数）改善に向けたABテストの実施、結果分析、改善施策の立案を行っています。", "technologies": ""}]
5af7d20f-67bb-4ada-be9c-cad9700f076c	a3c8d54c-81a7-4307-a360-491cf8a86762	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "マネーフォワードケッサイ株式会社", "endDate": "", "position": "リスクマネジメント統括本部請求代行審査部", "isCurrent": false, "startDate": "", "description": "長期インターン/与信審査\\n2024年9月 入社、審査部に配属\\n2025年3月 チームリーダーに昇格\\nインターン生のマネジメント（6名）\\n業務効率化（従来平均40分を20分に短縮）\\n自動審査モデル作成に関わる（過去の実績から与信リスクの高い顧客について判別するモデル作成）", "achievements": "長期インターン/与信審査\\n売掛先の審査業務を4ヶ月行った後、審査の正確さを評価されてチームリーダーに推薦された。リーダーとしてチームの目標管理、エンジニアチームとの連携を担った。まず、他のインターン生10人の審査履歴を分析し、抜けていると思われた業務知識を個別に補填した。次に、エンジニアチームと連携し、過去の未入金率が高い売掛先を自動判定する機械学習モデルの制作に携わった。これらの工夫が功を奏し、リーダーとなって3ヶ月後に2つの目標を達成することができた。", "technologies": ""}]
27297f4f-06d0-4b12-b76d-33142381f5e5	c0285637-3530-42c0-9146-d99427363022	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
d67b17ab-acc1-4585-91d5-174bf5ba80c7	29d837f5-742c-4c57-a26d-987df08d0393	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社三虎データサイエンス", "endDate": "", "position": "データ分析、アプリ開発、コンサルティング、営業", "isCurrent": false, "startDate": "", "description": "【プロジェクト概要】\\n動画解析で細胞の回転数を推定し、優良細胞を検出する研究支援ツールを開発\\n培養肉研究における効率化を目指し、短納期（2か月）でプロトタイプを完成\\n\\n【担当フェーズ】\\n画像処理ロジック設計・実装\\nテンプレートマッチング、傾き補正など\\n\\n【業務内容】\\n重い動画を切り出し、計算負荷を抑えつつ回転数を高精度で推定\\nGoogle Colab上での実装・検証レポート作成", "achievements": "【実績・取り組み】\\n2か月という短期で試作品をリリースし、研究成果に貢献\\n", "technologies": ""}]
cff0c15a-6bcc-4290-9c4f-8f628a54be3a	c159cfe9-0fcb-4f4a-a698-391b6e4ffde9	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社sci-bone", "endDate": "", "position": "新規事業開発", "isCurrent": false, "startDate": "", "description": "長期インターン/新規事業開発\\n・市場調査、商品企画\\n・インスタによるマーケティング\\n・戦略に応じた市場の選定と販売計画の立案\\n・顧客情報の調査", "achievements": "長期インターン／新規事業開発\\nこれまでの業務では、一から新規事業の立ち上げを担当しました。プロランナー向けではなく、市民ランナーにターゲットを絞ったサービス設計を行い、他の既存事業と差別化を図りました。特定のマラソン大会に特化した内容とすることで、ニッチな需要を狙いました。\\n集客面ではInstagramを活用し、ターゲット層に合わせた発信を行いました。その結果、テストリリースの段階で10名の顧客を獲得することができ、一定のニーズを実証することができました。", "technologies": ""}]
1b5482b6-9c8e-457a-9ce2-b38f3b76fb57	e689a0bc-d4a9-43c0-9339-74ad8f704979	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
8435dd3b-1a3c-486a-b19a-892ee5cf2d09	130eb84f-00eb-48e1-bce3-ea8a3c1078f5	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社ハウコレ", "endDate": "", "position": "開発職", "isCurrent": false, "startDate": "", "description": "長期インターン/開発\\n2023年10月 入社、開発チームに配属\\n介護系会社の日報システムの開発\\n保険代理店の物件に関する保険を管理するシステムを開発（要件定義から開発まで）", "achievements": "長期インターン/開発\\n1つ目のプロジェクトで開発プロジェクトの流れを経験し，2つ目のプロジェクトでは要件定義を行い，他のインターン生にそれぞれにあったタスクを振ったり，自分も開発したりと周りを巻き込んでの開発を行なった。", "technologies": ""}]
94d240ef-cc49-41d9-9383-28a7b80c64a3	8bc3ab83-0d67-4c0b-ba14-9667dbb823da	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社Take on", "endDate": "", "position": "PRプロモーター、アナリスト、PRレップ", "isCurrent": false, "startDate": "", "description": "長期インターン/PRプロモーター、アナリスト、レップ\\n2023年6月入社　大手広告会社からの依頼を受けてプロモーターとして活躍。\\n記者会見、イベントごとでは各回5組以上媒体の獲得に成功\\n2023年9月　アナリスト昇格\\n露出記事の分析、報告、毎月の定例資料の作成\\n主に大手スイーツ会社を担当\\n2024年2月　レップに昇格\\n同企業の1ブランドのみのレップになり、リリース記事の作成\\n2024年9月　全ブランドのレップを担当\\n月露出は1.5倍、新ブランド2000万の広告換算獲得", "achievements": "季節、イベントごとのリリース作成を提案、実施。\\nマルチブランド展開によるメディアへの負担軽減策を検討。複数の新商品をまとめたプレスリリースを作成し、媒体へのアプローチ方法を見直した結果、メディアとの良好な関係構築に成功。メディアごととの話し合い後、イベントごとのアプローチに変更を提案。商品リリースとは別にバレンタイン、お盆、クリスマスなどの主要イベントでのリリース作成追加した。", "technologies": ""}]
202dd06c-53a9-405b-981f-eda14a0fd8c1	b15e9a9f-d14b-4eed-aa75-3978730ced74	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "INCLUSIVE株式会社", "endDate": "", "position": "マーケティング", "isCurrent": false, "startDate": "", "description": "・市場調査、プロモーション、セールス支援\\n・記事広告のクライアント獲得\\n・記事広告の効果分析\\n・ディスプレイ広告の効果分析、出面調整", "achievements": "各ウェブ媒体に適した商材を検討し、営業活動を行う中で、1ヶ月間で約5件のアポイントを獲得いたしました。また、堀江貴文氏が運営する「ホリエモンチャンネル」の企画立案にも携わりました。さらに、ディスプレイ広告においては、PV数やクリック数をもとにユーザーの反応を分析し、効果的なクリエイティブの制作や短文の作成も担当いたしました。", "technologies": ""}]
f7edc49a-5dfa-45c8-8e88-1b7238f12703	87a98988-e408-49f7-8556-c4426b6074d2	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
c9ec05e0-a355-4758-8567-570bfc055036	7e6297ff-8df7-43ba-95d0-7da57c86cc45	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社キャンパスライフドットコム", "endDate": "", "position": "事業責任者", "isCurrent": false, "startDate": "", "description": "長期インターン／営業・マーケティング\\n2021年11月　入社、営業部に配属\\n2022年10月　新規事業（オンライン個別指導塾）の事業責任者に昇格\\n生徒（顧客）対応：累計120名\\n講師ディレクション：約12名のマネジメント\\n\\n主な業務内容\\n・イベント開催により、興味喚起と顧客獲得を推進\\n・ブログ運営、検索流入によるリード獲得を実現\\n・全国の高校へ独自模試を営業展開\\n・学習カリキュラムの立案と、講師陣との連携によるサービス品質向上", "achievements": "イベントを通じた認知拡大および顧客獲得に注力した。中でも、自ら企画・立案・実行まで手がけた「学習計画セミナー」では、自身の成績データを開示することで参加者の関心を喚起し、100名を超える集客を実現した。以降も未公開の最新入試問題を取り入れるなど、イベント内容を継続的に更新し、参加者の満足度向上に努めている。\\nその結果、今年度獲得した新規顧客18件のうち11件はイベント経由での申込であり、ターゲット層に響く企画設計と信頼構築を通じて、安定したリード獲得の仕組みを構築することができた。", "technologies": ""}]
fb01f5c8-cceb-4c83-85ef-69790206f6e9	18964171-20f4-4010-a11d-8634b7470b44	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社キャンパスライフドットコム", "endDate": "", "position": "事業責任者", "isCurrent": false, "startDate": "", "description": "長期インターン／営業・マーケティング\\n2021年11月　入社、営業部に配属\\n2022年10月　新規事業（オンライン個別指導塾）の事業責任者に昇格\\n生徒（顧客）対応：累計120名\\n講師ディレクション：約12名のマネジメント\\n\\n主な業務内容\\n・イベント開催により、興味喚起と顧客獲得を推進\\n・ブログ運営、検索流入によるリード獲得を実現\\n・全国の高校へ独自模試を営業展開\\n・学習カリキュラムの立案と、講師陣との連携によるサービス品質向上", "achievements": "イベントを通じた認知拡大および顧客獲得に注力した。中でも、自ら企画・立案・実行まで手がけた「学習計画セミナー」では、自身の成績データを開示することで参加者の関心を喚起し、100名を超える集客を実現した。以降も未公開の最新入試問題を取り入れるなど、イベント内容を継続的に更新し、参加者の満足度向上に努めている。\\nその結果、今年度獲得した新規顧客18件のうち11件はイベント経由での申込であり、ターゲット層に響く企画設計と信頼構築を通じて、安定したリード獲得の仕組みを構築することができた。", "technologies": ""}]
88f2f6a5-5633-4aa4-8ba2-9294055cfbfc	560c203f-ef2b-415b-8cfc-e54e9e17c32b	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社Stardy", "endDate": "", "position": "チューター", "isCurrent": false, "startDate": "", "description": "大学2年時に株式会社Stardyで長期有償インターンを開始し、個別指導に加え、新規事業であるオンライン個別指導塾の立ち上げを任されました。オンライン指導導入初期は、授業品質の安定化や保護者からの信頼獲得、チューター間の連携不足が課題でした。私はチューターリーダーとして指導マニュアルを整備し、模擬授業を通じて指導方法を改善、また定期的なミーティングでチームの課題共有・改善を行いました。生徒には事前に授業動画を見てもらい、授業中はリアルタイムの解答状況を把握しながら指導。能力差への対応として、時間制限つきで次の問題に進む形式や、適切なヒントの提供など運営設計にも携わりました。これにより指導効率が向上し、事業は拡大。この経験を通して、新規事業推進の実行力と課題解決力を実践的に学びました。", "achievements": "大学2年生の時に株式会社Stardyで2番目のチューターとして長期有償インターンシップを始めました。最初は個別指導が主でしたが、新規事業としてオンライン個別指導塾の立ち上げを任されました。オンライン指導導入時には、授業品質の安定化や生徒・保護者からの信頼獲得、チューター間の連携不足などが課題でした。私はチューターリーダーとしてオンライン指導マニュアルを作成し、授業の進め方やコミュニケーション方法を統一しました。また、数人の生徒を対象に模擬授業を実施し、そのフィードバックをもとに授業の流れや指導方法を改善しました。さらに定期的なミーティングを開催し、授業内容やチーム内の課題を共有・改善し、迅速なフィードバックを行いました。その結果、指導の質が向上し、生徒や保護者から信頼を得て事業拡大に成功しました。この経験を通じて、新規事業立ち上げのリーダーシップ力と課題解決能力を養いました。", "technologies": ""}]
79885cae-dbc6-4199-aedc-b0739423c498	4fdcb7b5-f75d-4a62-9824-804c3ad01900	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
8724cc95-e4bf-489b-86ca-a41781b33134	782f9303-e208-478a-9ea0-8a4e23283946	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
172f7e2d-97b5-42ac-bc02-070816a9a926	903ddcb8-8417-4c6a-9ebb-e69677be5b22	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社ROBOTPAYMENT", "endDate": "", "position": "経営戦略・事業企画・IR担当", "isCurrent": false, "startDate": "", "description": "長期インターン / 経営戦略・事業企画・IR担当\\n\\n2024年9月 入社、社長室に配属\\n月次業績・KPIの分析、モニタリング、戦略策定を担当\\nマーケット・競合調査を実施し、自社への影響分析を実施\\n既存事業の最大化、新規事業の企画立案・立ち上げ支援に従事\\nIR資料およびプレスリリース作成に携わる実績あり\\n経営会議にも参画し、経営判断に必要なデータ分析・提案を実施", "achievements": "社長室にて、月次業績・KPIのモニタリングや分析業務を担当し、数字に基づいた正確な現状把握と、課題抽出・戦略提案を行いました。特に、マーケット・競合調査では、業界動向を踏まえた自社への影響範囲を迅速かつ精緻に分析し、戦略修正に繋げた経験があります。\\nまた、プロダクト戦略として最適な販売モデル設計や料金プランの見直しに携わり、プロジェクトマネジメントの面でも複数施策を並行推進。リサーチ力・論理的思考力を活かし、現場と経営層を繋ぐハブとしての役割を果たしました。\\nさらに、IR資料・プレスリリースの作成にも従事し、会社の対外発信力強化にも貢献。経営会議にも参画し、経営判断に資するデータ分析・戦略提案を通じ、意思決定のスピードと精度向上に寄与しました。\\n単なる事務局機能に留まらず、自ら積極的に仮説検証を繰り返し、経営層に対して打ち手提案を行うなど、高い分析力と主体性を発揮してきました。", "technologies": ""}]
a7d5b1f6-665e-4e26-84c5-9a77638178fd	c2d80043-6478-41fc-ac31-a24344b59d63	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
50d773e5-dea3-49f2-b25c-c23815bef776	891d3d50-72e2-48d5-b5d0-31d24a415c0d	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "foobe", "endDate": "", "position": "営業", "isCurrent": false, "startDate": "", "description": "ウォーターサーバーの販売\\n毎回、契約獲得できた", "achievements": "多くの人に乗り換えを提案", "technologies": ""}, {"id": 2, "isOpen": true, "company": "secaism", "endDate": "", "position": "webマーケティング", "isCurrent": false, "startDate": "", "description": "まだなし", "achievements": "まだなし", "technologies": ""}]
79b98216-258e-4741-8420-bab1c00fb049	09479e40-e913-42a1-a33a-e36061145bd8	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
0a55e0f9-e820-45c7-8acb-2b45ec77acc3	4073fe68-5113-4496-8323-397f27e03aa9	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "GMO NIKKO", "endDate": "", "position": "営業", "isCurrent": false, "startDate": "", "description": "長期インターン/営業\\n2024年8月 入社、初めは編集、制作部門に配属。\\n2024年10月 人員が集まってきて営業部門発足、配属。\\n営業成績は部署内2位。\\n\\n", "achievements": "長期インターン/営業\\n全て新規開拓の営業であったため、既存の場合と比べ苦難を強いられることが多かったが、営業チーム内での会議やロールプレイを自分主導で行い、経験を積んでチーム全体の成績の底上げを図った。", "technologies": ""}]
14dbdcb9-28d3-4a13-96d1-ec631c9598b4	c7c3d97a-de1d-4b61-aa26-c7422cc827d0	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
deb24c22-f516-4ed4-9810-3ac6dfad704b	364a8230-429b-4b03-982f-3e59faaa2b8c	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "STAR UP", "endDate": "", "position": "AIエンジニア", "isCurrent": false, "startDate": "", "description": "製造業向けのAI開発を行いました。OCRという画像からテキストを読み込み、出力する技術の開発を行っていました。", "achievements": "主に画像データの処理方法にこだわり、文字識別の精度を上げました。", "technologies": ""}]
ca5e3616-4e9e-4612-a5ad-895e316e6046	25d9e57a-a501-43c1-8520-886b942dd637	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社DoFull", "endDate": "", "position": "SNSマーケティング", "isCurrent": false, "startDate": "", "description": "2025年1月 入社\\n2025年4月 会社広報のYoutube事業の責任者を担当\\nインターン生のマネジメント（6名）\\n私が立案した事業プロジェクトの動画が累計300万再生\\n", "achievements": "【自分が活躍したポイント】\\nYoutube事業を企画段階から撮影・編集・公開までを主導し、特にターゲット分析と演出設計に注力した。\\n例えば以下の点に注力して業務を行った。\\n・会社広報が目的であること明示せずエンタメと融合することで自然な導線で応募に繋げる構成を提案。\\n・社長の熱意や社員のリアルな声を引き出すため、インタビュー内容の設計と演出を丁寧に調整。\\n・YouTube的なテンポ感とNetflix系のVlogトーンを両立する編集を実現。\\n結果として、社内外から「会社のリアルが伝わる」と高評価を得た。", "technologies": ""}]
33675283-0e99-4614-bc2d-3228977a564a	1653c432-62fe-4224-a844-c0d7f20c42e0	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
82f4013a-2599-4954-9961-cd65e5bdb136	bed2789b-72ef-4471-98a3-688de638b21c	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
3290c6d2-ad89-414f-b75e-a9b5e179a9da	0676175c-5379-407a-ac82-016a5c7a1f63	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
9ce4296d-8efb-4558-9eec-c5ca27517b5f	adc14c9f-3c89-43f3-a9e0-b33d88318fad	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
2ff408f8-6560-451d-b46e-a734f10e9914	9fd377c1-928f-4b84-80c6-a1744c41f836	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社オンデック", "endDate": "", "position": "アシスタント", "isCurrent": false, "startDate": "", "description": "・譲渡企業のIM（企業概要書）作成を単独で担当。初稿から改善を重ね、買い手企業とのトップ面談まで進展\\n・経営者のヒアリング内容をもとに、強み・事業の魅力を可視化し訴求力ある資料を完成\\n・SWOT分析や業界調査を行い、提案精度を向上\\n・上司からのフィードバックをもとに資料を改善し、社内でも評価を獲得", "achievements": "・徹底的な業界分析とヒアリング準備で、相手のニーズを踏まえた訴求を実現\\n・経営者の「雇用維持・地域密着」の想いを資料に反映し、案件の魅力を高めた\\n・買い手への提案が実を結び、社内でも学生以上の役割を期待されるように\\n・この経験を通じて財務知識の必要性を実感し、簿記2級を取得。現在1級に挑戦中", "technologies": ""}, {"id": 2, "isOpen": true, "company": "クリスピークリームドーナツ", "endDate": "", "position": "店舗運営・時間帯責任者", "isCurrent": false, "startDate": "", "description": "・時間帯責任者として、ピーク時間帯のオペレーションを主導\\n・英語対応が必要な顧客も多く、接客対応力を強化。TOEIC905点を取得し、実務に活かした\\n・スタッフのシフト管理や発注業務を通じ、店舗の運営効率を向上\\n・新規スタッフの育成も担当し、チームの即戦力化に貢献", "achievements": "・外国人顧客への接客に積極的に取り組み、英語力を接客に応用\\n・スタッフ間のコミュニケーションを円滑にし、チームの士気向上を図った\\n・ピーク時のオペレーション指揮で、売上・顧客満足ともに高い水準を維持\\n・効率的な発注管理により、廃棄ロスを削減するなどコスト改善にも貢献", "technologies": ""}]
4a4f6f23-5574-4111-b40d-6a11818a411a	b9c8cc81-1603-4b24-b30e-70b8870acc18	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社アーキベース", "endDate": "", "position": "人事", "isCurrent": false, "startDate": "", "description": "内定承諾率20%向上\\n内定承諾者7名の確保\\n", "achievements": "求職者やエージェントなど相手の視点を踏まえて行動することが必要だと考え、施策を実行した。まず事業部と人事部を交え、内定者とキャリアプランを共に考える機会を設け、手厚いフォローを通じて他社との差別化を図った。次に、転職エージェントと定例会議や企業の魅力を伝えるための説明会を実施し、ブラインドレジュメの回収や通過事例の共有により多くの求職者を集めることができた。", "technologies": ""}]
36201314-07af-495b-bbdb-dc504e0e2d57	bda9ee47-244c-4b69-a07f-3d67da29e727	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
e4b350cc-505d-44b0-ae38-a7afa3f5dd9f	bc43774d-d690-4b57-9dd0-550403d571e2	\N	\N	[]	[]	\N	\N	2025-06-28 12:48:25.883+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社Rounda", "endDate": "", "position": "技術調査・実装インターン", "isCurrent": false, "startDate": "", "description": "・NotionとBacklogをClaudeから連携するLLM活用サーバーの構成・設計に携わり、業務ツール統合の情報整理と活用基盤の検討を実施\\n・Nemo Guardrailsを用いたプロンプト制御の調査・検証により、LLM出力の安定性向上に貢献\\n・技術記事として社内外向けに調査結果をまとめ、LP記事の作成も担当。", "achievements": "生成AI技術の業務活用に関心を持ち、NotionとBacklog連携するLLM活用基盤の構成検討や、出力制御ツール（Nemo Guardrails）の調査・検証を担当しました。特にプロンプト設計やLLMの挙動検証では試行錯誤を重ねました。加えて、調査結果を技術記事としてまとめ、社内ナレッジの蓄積と技術の普及にも寄与することができました。", "technologies": ""}]
28b35f44-75e7-410a-b953-df25a047eedc	8e9f4b24-d62c-4a28-a414-12bef4dc3cfe	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社トモノカイ", "endDate": "", "position": "Web広告運用/SNS広告運用/チームリーダー", "isCurrent": false, "startDate": "", "description": "長期インターン/Web広告運用\\n2023年12月 入社、学習塾支援部門に配属\\n2024年3月 Microsoftリスティング広告運用開始\\n・目標：CV昨対比120%達成\\n・低価格CPAで大量CVを獲得\\n・業務効率化システム整備(スプレッドシート関数による自動化やGAS, Pythonによる作業工数の削減)\\n・AIシステム導入によるアウトプットの量質ともに向上\\n\\n長期インターン/SNS運用\\n2025年1月 TikTok自社アカウント運用開始\\n・自社ブランド認知向上\\n・TikTokマーケティングによるインプレッションの獲得\\n・プロフィール遷移率の高いコンテンツ作成のPDCA\\n\\n長期インターン/チームリーダー\\n2025年3月 広告チームリーダー任命\\n・チームマネジメント\\n・チームメンバーとの密なコミュニケーション\\n・チーム全体の目標KDI設定\\n・広告チーム全体のKPI目標の認識\\n・各チームリーダーとの意見/情報交換\\n・MTGや仕組み体制の構築/整備", "achievements": "株式会社トモノカイ/長期インターンシップ\\n\\n　Microsoft広告運用での目標達成に向けてPDCAサイクルを自走し、検索語句の分析や除外キーワード設計を通じて広告運用を改善し、コンバージョン目標比120%の成果を上げました。\\n　更に、SNS広告としてMeta広告とTikTok広告を運用し、自社の認知拡大に努めました。\\n　また、業務効率化にも取り組み、AIやプロンプトを活用して作業の質とスピードを向上させる施策を自ら提案・実行しました。\\n　さらにチームリーダーとして、メンバーのスキル向上を目的に「学び共有の仕組み」を構築。週次での学び報告会や資料のテンプレート化などを通じて、チーム全体のナレッジが循環する環境を整えました。\\n　こうした経験を通じて、成果を出すための戦略的思考力と、周囲を巻き込むリーダーシップの両方を実践的に養うことができました。", "technologies": ""}]
2b4367e4-ad9a-44e5-9e60-98c3d0e580da	a21586b1-3467-47eb-8733-85448f38db4b	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
b275d35b-73e1-420a-bf40-407c7677abd4	c5b9c9d1-6844-4612-a7e7-14bd1c970f3c	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
3338e393-447f-48e0-91e8-e511bce63bf6	5c7e522d-d276-4775-a57d-bf9cf1957cd8	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
b6ee1e87-c49c-4ecd-99c5-1cbd9fb09505	f0b8d41c-31f0-450f-b7d3-d461f7ade25b	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
1ce46a5e-1e99-4789-ac8a-2a8806e32ed0	58e4837d-b3d1-4b8f-8889-b08bcd71146b	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社GENDA", "endDate": "", "position": "データサイエンティスト", "isCurrent": false, "startDate": "", "description": "オンライン上のクレーンゲームで「あなたへのおすすめ」をユーザーに提示するいわゆるレコメンドシステムAIを1から構築およびアプリへの公開。ユーザーのクリック率向上に貢献し、売り上げ向上に貢献した。", "achievements": "通常のエンジニアインターン生はタスクが振られることが多いが、自分の場合は長期的なタスクのみを振られて、それに向けての短期的なタスクは自分で全て設定してこなして来た。\\nまた、インターン生同士の交流の場の作成などにも取り組んだ.", "technologies": ""}]
2a84169d-660e-4a36-b77f-69ff81e68ef0	638b5323-1b76-415f-9ccc-458e37f84e59	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
035cc773-c170-4d84-a51b-5d0111ce1ebd	226830f3-7287-4ee0-8291-38992a60ffc5	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社アンロックリー", "endDate": "", "position": "コンサルタント補佐", "isCurrent": false, "startDate": "", "description": "オープニング面談を10件以上/月の設定\\n企業概要書作成補助\\n経営者へのヒアリング", "achievements": "新規顧客開拓のため、営業手法にこだわり、0件/月から最大13件/月の面談設定数の向上を実現しました。", "technologies": ""}, {"id": 2, "isOpen": true, "company": "株式会社オンデック", "endDate": "", "position": "アシスタント", "isCurrent": false, "startDate": "", "description": "（現在も継続中)企業概要書作成補助、ノンネームシートの作成、営業活動", "achievements": "豊富な知識から企業概要書の作成補助をスピーディーに行い、上司から高評価を得た。また、営業活動では、対面の交流会で数多くの名刺を交換し、新たな機会獲得に貢献した。", "technologies": ""}]
3e9a92a5-d3b6-432e-a46a-9d84624b69f7	9e13482b-e897-40ba-bb2f-a6d1a337e416	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社プロダクトオブタイム", "endDate": "", "position": "ホール", "isCurrent": false, "startDate": "", "description": "特になし", "achievements": "日々の接客、在庫の管理、営業トークを行うことで、日々の売り上げに貢献した。", "technologies": ""}, {"id": 2, "isOpen": true, "company": "株式会社SHOSAN", "endDate": "", "position": "広告運用", "isCurrent": false, "startDate": "", "description": "・Meta広告の運用\\n・GPTツールの作成により、業務改善を行う\\n・インターン新人研修用のチャットボット作成、普及プロジェクトに参加", "achievements": "これまでの業務で、Meta広告の広告運用を行ってまいりました。広告運用にあたっては、3C分析やSWOT分析といったフレームワークを利用し、顧客の理解を深めることで適切な施策を行いました。また、GoogleAnalytics、SiteLeadなどのツールを利用して経路ごとの効果を計測し、数値を分析することで日々の広告改善を繰り返しました。その結果、自分が担当している案件9件全てにおいて安定してCVを獲得することができています。自らの所属するユニットの業務改善のためにGPTツールを作成しました。現在は、インターン新人研修用のチャットボット作成・普及プロジェクトに参加しています。", "technologies": ""}]
00a0d946-5473-4e1a-a701-8b0ad197f7fe	c181545f-5b9a-4295-8213-52afc1cf57a2	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
5b573b50-949e-47c7-b893-a8be3e179d1a	c7226da5-694b-4889-a825-3e3127418736	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
6fa21495-bfd8-43f3-b205-a9d918722f84	3bad9555-391c-4ebe-914a-590da321d53e	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
bb589cda-46c3-413b-bd8d-807dc4df283a	e503c62c-d1d9-4fbb-815c-10cd47cccb15	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
21289a00-f947-4a32-a202-353d41064116	035d7e6c-2a4b-4853-a2af-6f87b19e15cc	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
83ba10c3-f0c2-4b92-9f7c-389d16245bf7	781080c7-8d71-4d8f-b804-eab03798f2e2	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
50b52080-5d59-43e1-a47e-0e84af6ae63f	47e8d084-ebf1-4b7c-aa46-5c605ff48729	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
37aa3ce9-ea35-40f2-aeb0-7ce4b8dfcbf0	807d3561-f113-4f25-9fa8-30b259822ea5	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
9f90e4e7-28a5-41ea-b793-e1f81e4945a5	885c1474-1363-489a-b935-32e57598c88a	\N	\N	[]	[]	\N	\N	2025-06-25 02:55:50+00	{}	[]
d7b688d8-e208-451a-9bd7-b96a79c60619	d8f1aea9-a2fc-4dd4-a46e-a296c6bef69a	\N	\N	[]	[]	\N	\N	2025-06-27 08:10:24.777+00	{}	[{"id": 1, "isOpen": true, "company": "株式会社ドルマ", "endDate": "", "position": "テレアポインター", "isCurrent": false, "startDate": "", "description": "SNS運用代行のアウトバウンド営業に従事：500コールで5アポイント設置1受注。", "achievements": "短い期間での参画でしたが、テレアポ営業から受注に繋がった。", "technologies": ""}, {"id": 2, "isOpen": true, "company": "StockSun株式会社", "endDate": "", "position": "カリトルくん事業部営業ディレクター", "isCurrent": false, "startDate": "", "description": "テレアポインターとして参画し、どの商材でも2%のアポイント獲得率を維持。\\n医療業界が得意で、5%を獲得した商材もある。\\n\\n「営業代行サービスカリトルくん」が立ち上がったタイミングで、営業ディレクターに昇格。\\n個人でチームを形成し30社以上の支援実績。\\n10名以上のメンバーをまとめ組織化されたチームを形成。\\n企業の売り上げに貢献。早く丁寧にPDCAサイクルを回し、適切な解決策を提案する。\\n丁寧なクライアントワークが特徴であり、顧客満足度は事業部内でもトップクラス。\\n\\n支援実績\\nEC運用代行　月額10万円の支援プランにて初月支援から10商談1受注獲得\\nSNS運用代行　月額15万円の支援プランにて６ヶ月の支援で月額40万円の商材を2受注\\nWebマーケティング会社　協業打診にて月額10万円の支援プランにて10商談獲得(費用対効果回収)\\nAIプラットフォーム　テレアポ営業を月460コール実施し8アポイント獲得1受注獲得\\n医療サービス　私自身がテレアポをし、1ヶ月で500コール実施し10アポイントを獲得", "achievements": "テレアポインターとして参画し、どの商材でも2%のアポイント獲得率を維持。\\n医療業界が得意で、5%を獲得した商材もある。\\n「営業代行サービスカリトルくん」が立ち上がったタイミングで、営業ディレクターに昇格。\\n個人でチームを形成し30社以上の支援実績。\\n10名以上のメンバーをまとめ組織化されたチームを形成。\\n企業の売り上げに貢献。早く丁寧にPDCAサイクルを回し、適切な解決策を提案する。\\n丁寧なクライアントワークが特徴であり、顧客満足度は事業部内でもトップクラス。\\n\\n支援実績\\nEC運用代行　月額10万円の支援プランにて初月支援から10商談1受注獲得\\nSNS運用代行　月額15万円の支援プランにて６ヶ月の支援で月額40万円の商材を2受注\\nWebマーケティング会社　協業打診にて月額10万円の支援プランにて10商談獲得(費用対効果回収)\\nAIプラットフォーム　テレアポ営業を月460コール実施し8アポイント獲得1受注獲得\\n医療サービス　私自身がテレアポをし、1ヶ月で500コール実施し10アポイントを獲得", "technologies": ""}, {"id": 3, "isOpen": true, "company": "Myoshin株式会社", "endDate": "", "position": "取締役", "isCurrent": false, "startDate": "", "description": "・営業代行事業の立ち上げに参画、取締役として案件PM業務と内部統括を担当\\n・自社のアウトバウンド営業の組織構築、実行\\n・営業活動の標準化\\n・マネジメント業務\\n・案件ごとにPMとして、クライアント別の戦略設計・運用・改善提案を実施\\n・PDCAサイクルを高速で回し、クライアント成果の向上に貢献", "achievements": "・営業組織の立ち上げフェーズにおいて、0→1の達成と安定化に貢献\\n・営業とマネジメントを両立し、個別案件ごとの最適施策を素早く設計・実行できたこと\\n・チームメンバー一人ひとりに向き合い、育成と成果創出を両立させたこと\\n・クライアントごとに成果へのこだわりを持ち、期待値以上の結果を出すことに尽力したこと\\n・社内外問わず「迅速・丁寧」なコミュニケーションを重視し、信頼構築に成功したこと", "technologies": ""}, {"id": 4, "isOpen": true, "company": "合同会社C.B.A station", "endDate": "", "position": "副代表", "isCurrent": true, "startDate": "2025-05", "description": "代理店契約している企業様のアウトバウンド営業（アポイント取得から商談まで対応）\\n", "achievements": "支援初月から10商談獲得3受注", "technologies": ""}]
b6ca570f-7615-47f9-acb2-af583eca3290	039527ca-2a5a-4e10-8ebb-cf63aca72d07	\N	\N	\N	\N	\N	2025-07-04 07:10:07.309894+00	2025-07-05 10:13:09.484+00	{"pr": {"title": "", "content": "", "strengths": ["", "", ""], "motivation": ""}, "basic": {"email": "", "phone": "", "gender": "male", "address": "", "lastName": "", "birthdate": "", "firstName": "", "lastNameKana": "", "firstNameKana": ""}, "skills": {"tools": "", "skills": "", "languages": "", "frameworks": "", "certifications": ""}, "education": {"status": "enrolled", "faculty": "", "university": "", "admissionDate": "", "researchTheme": "", "graduationDate": ""}, "conditions": {"salary": "", "remarks": "", "jobTypes": [], "locations": [], "workStyle": "", "industries": [], "workPreferences": []}}	[{"id": 1, "isOpen": true, "company": "", "endDate": "", "position": "", "isCurrent": false, "startDate": "", "description": "", "achievements": "", "technologies": ""}]
0b9dfa2c-9f97-4ff1-8da4-0a932f76053e	366dd4e3-d25c-4edc-8b17-5a569dc6bf9c	\N	\N	\N	\N	\N	2025-06-28 05:37:48.025347+00	2025-06-28 05:37:47.937+00	{"pr": {"title": "", "content": "", "strengths": ["", "", ""], "motivation": ""}, "basic": {"email": "", "phone": "", "gender": "male", "address": "", "lastName": "", "birthdate": "", "firstName": "", "lastNameKana": "", "firstNameKana": ""}, "skills": {"tools": "", "skills": "", "languages": "", "frameworks": "", "certifications": ""}, "education": {"status": "enrolled", "faculty": "", "university": "", "admissionDate": "", "researchTheme": "", "graduationDate": ""}, "conditions": {"salary": "", "remarks": "", "jobTypes": [], "locations": [], "workStyle": "", "industries": [], "workPreferences": []}}	[{"id": 1, "isOpen": true, "company": "", "endDate": "", "position": "", "isCurrent": false, "startDate": "", "description": "", "achievements": "", "technologies": ""}]
93b020ed-53e3-4f5b-9f21-9556f1b18f1a	1e97906e-af3c-423d-8712-4c4ad97a60e1	\N	\N	\N	\N	\N	2025-06-25 07:08:50.859873+00	2025-07-08 02:15:00.965+00	{"pr": {"title": "", "content": "", "strengths": ["", "", ""], "motivation": ""}, "basic": {"email": "", "phone": "", "gender": "male", "address": "", "lastName": "", "birthdate": "", "firstName": "", "lastNameKana": "", "firstNameKana": ""}, "skills": {"tools": "", "skills": "", "languages": "", "frameworks": "", "certifications": ""}, "education": {"status": "enrolled", "faculty": "", "university": "", "admissionDate": "", "researchTheme": "", "graduationDate": ""}, "conditions": {"salary": "", "remarks": "", "jobTypes": [], "locations": [], "workStyle": "", "industries": [], "workPreferences": []}}	[{"id": 1, "isOpen": true, "company": "", "endDate": "", "position": "", "isCurrent": false, "startDate": "", "description": "", "achievements": "", "technologies": ""}]
\.


--
-- Data for Name: role_change_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.role_change_log (id, user_id, old_role, new_role, changed_by, query, changed_at) FROM stdin;
26	f5763843-120e-4aea-9e8a-b3deeab22c80	student	admin	\N	update user_roles\nset    role = 'admin'\nwhere  user_id = 'f5763843-120e-4aea-9e8a-b3deeab22c80';\n\n-- source: dashboard\n-- user: cb18e47e-166a-45ae-af0b-5c3074dfde71\n-- date: 2025-06-18T01:39:29.194Z	2025-06-18 01:39:29.730378+00
27	bf842b9e-630f-4694-bd9d-64812894d9df	student	admin	\N	insert into user_roles (user_id, role)\nvalues ('bf842b9e-630f-4694-bd9d-64812894d9df', 'admin')\non conflict (user_id)               -- 既に行があれば\ndo update set role = excluded.role; -- role を admin に上書き\n\n-- source: dashboard\n-- user: cb18e47e-166a-45ae-af0b-5c3074dfde71\n-- date: 2025-06-18T01:43:28.132Z	2025-06-18 01:43:28.665646+00
28	697303d7-8553-4b47-88fb-20805e0cc3d4	student	company_admin	\N	WITH pgrst_source AS (INSERT INTO "public"."user_roles"("role", "user_id") SELECT "pgrst_body"."role", "pgrst_body"."user_id" FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "role", "user_id" FROM json_to_record(pgrst_payload.json_data) AS _("role" character varying(50), "user_id" uuid) ) pgrst_body WHERE set_config('pgrst.inserted', (coalesce(nullif(current_setting('pgrst.inserted', true), '')::int, 0) + 1)::text, true) <> '0' ON CONFLICT("user_id") DO UPDATE SET "role" = EXCLUDED."role", "user_id" = EXCLUDED."user_id"WHERE set_config('pgrst.inserted', (coalesce(nullif(current_setting('pgrst.inserted', true), '')::int, 0) - 1)::text, true) <> '-1' RETURNING 1) SELECT '' AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, array[]::text[] AS header, ''::text AS body, nullif(current_setting('response.headers', true), '') AS response_headers, nullif(current_setting('response.status', true), '') AS response_status, nullif(current_setting('pgrst.inserted', true),'')::int AS response_inserted FROM (SELECT * FROM pgrst_source) _postgrest_t	2025-06-18 05:56:30.35727+00
29	09e3242d-bf28-4184-bacc-65ccdb0310da	student	company_admin	\N	WITH pgrst_source AS (INSERT INTO "public"."user_roles"("role", "user_id") SELECT "pgrst_body"."role", "pgrst_body"."user_id" FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "role", "user_id" FROM json_to_record(pgrst_payload.json_data) AS _("role" character varying(50), "user_id" uuid) ) pgrst_body WHERE set_config('pgrst.inserted', (coalesce(nullif(current_setting('pgrst.inserted', true), '')::int, 0) + 1)::text, true) <> '0' ON CONFLICT("user_id") DO UPDATE SET "role" = EXCLUDED."role", "user_id" = EXCLUDED."user_id"WHERE set_config('pgrst.inserted', (coalesce(nullif(current_setting('pgrst.inserted', true), '')::int, 0) - 1)::text, true) <> '-1' RETURNING 1) SELECT '' AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, array[]::text[] AS header, ''::text AS body, nullif(current_setting('response.headers', true), '') AS response_headers, nullif(current_setting('response.status', true), '') AS response_status, nullif(current_setting('pgrst.inserted', true),'')::int AS response_inserted FROM (SELECT * FROM pgrst_source) _postgrest_t	2025-06-23 06:26:17.735701+00
30	03f367cb-dc70-4619-abaa-c82140143254	student	company_admin	\N	WITH pgrst_source AS (INSERT INTO "public"."user_roles"("role", "user_id") SELECT "pgrst_body"."role", "pgrst_body"."user_id" FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "role", "user_id" FROM json_to_record(pgrst_payload.json_data) AS _("role" character varying(50), "user_id" uuid) ) pgrst_body WHERE set_config('pgrst.inserted', (coalesce(nullif(current_setting('pgrst.inserted', true), '')::int, 0) + 1)::text, true) <> '0' ON CONFLICT("user_id") DO UPDATE SET "role" = EXCLUDED."role", "user_id" = EXCLUDED."user_id"WHERE set_config('pgrst.inserted', (coalesce(nullif(current_setting('pgrst.inserted', true), '')::int, 0) - 1)::text, true) <> '-1' RETURNING 1) SELECT '' AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, array[]::text[] AS header, ''::text AS body, nullif(current_setting('response.headers', true), '') AS response_headers, nullif(current_setting('response.status', true), '') AS response_status, nullif(current_setting('pgrst.inserted', true),'')::int AS response_inserted FROM (SELECT * FROM pgrst_source) _postgrest_t	2025-06-27 00:41:34.294855+00
31	a2400135-23a4-4140-a7ce-1055a3ec217f	student	admin	\N	-- ★ Supabase SQL Editor で「Run」する例\n--   service_role キーで接続しているか、あるいは set role postgres; を先に実行する\n\nBEGIN;                           -- 念のためトランザクション\n\n-- (任意) RLS が有効なら一時停止\nALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;\n\n-- ① admin が ENUM に存在しない場合だけ実行（TEXT 型ならスキップ）\nALTER TYPE role_enum ADD VALUE IF NOT EXISTS 'admin';\n\n-- ② 行を追加／更新\nINSERT INTO public.user_roles (user_id, role)\nVALUES ('a2400135-23a4-4140-a7ce-1055a3ec217f', 'admin')\nON CONFLICT (user_id)            -- user_id は PK/UNIQUE\nDO UPDATE SET role = 'admin';    -- 既存なら上書き\n\n-- (任意) RLS を元に戻す\nALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;\n\nCOMMIT;\n\n-- source: dashboard\n-- user: cb18e47e-166a-45ae-af0b-5c3074dfde71\n-- date: 2025-06-28T05:24:26.554Z	2025-06-28 05:24:27.067465+00
32	60a03c48-4cfd-4d3c-8ebf-57e90ace9b7b	student	company_admin	\N	WITH pgrst_source AS (INSERT INTO "public"."user_roles"("role", "user_id") SELECT "pgrst_body"."role", "pgrst_body"."user_id" FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "role", "user_id" FROM json_to_record(pgrst_payload.json_data) AS _("role" character varying(50), "user_id" uuid) ) pgrst_body WHERE set_config('pgrst.inserted', (coalesce(nullif(current_setting('pgrst.inserted', true), '')::int, 0) + 1)::text, true) <> '0' ON CONFLICT("user_id") DO UPDATE SET "role" = EXCLUDED."role", "user_id" = EXCLUDED."user_id"WHERE set_config('pgrst.inserted', (coalesce(nullif(current_setting('pgrst.inserted', true), '')::int, 0) - 1)::text, true) <> '-1' RETURNING 1) SELECT '' AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, array[]::text[] AS header, ''::text AS body, nullif(current_setting('response.headers', true), '') AS response_headers, nullif(current_setting('response.status', true), '') AS response_status, nullif(current_setting('pgrst.inserted', true),'')::int AS response_inserted FROM (SELECT * FROM pgrst_source) _postgrest_t	2025-06-30 05:45:49.657282+00
33	01b5861b-bb4a-4002-be08-71db750bb24e	student	company_admin	\N	WITH pgrst_source AS (INSERT INTO "public"."user_roles"("role", "user_id") SELECT "pgrst_body"."role", "pgrst_body"."user_id" FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "role", "user_id" FROM json_to_record(pgrst_payload.json_data) AS _("role" character varying(50), "user_id" uuid) ) pgrst_body WHERE set_config('pgrst.inserted', (coalesce(nullif(current_setting('pgrst.inserted', true), '')::int, 0) + 1)::text, true) <> '0' ON CONFLICT("user_id") DO UPDATE SET "role" = EXCLUDED."role", "user_id" = EXCLUDED."user_id"WHERE set_config('pgrst.inserted', (coalesce(nullif(current_setting('pgrst.inserted', true), '')::int, 0) - 1)::text, true) <> '-1' RETURNING 1) SELECT '' AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, array[]::text[] AS header, ''::text AS body, nullif(current_setting('response.headers', true), '') AS response_headers, nullif(current_setting('response.status', true), '') AS response_status, nullif(current_setting('pgrst.inserted', true),'')::int AS response_inserted FROM (SELECT * FROM pgrst_source) _postgrest_t	2025-07-01 10:03:36.467332+00
34	0b5f7833-a5fe-4c95-883a-173ca6aa6cb0	student	company_admin	\N	WITH pgrst_source AS (INSERT INTO "public"."user_roles"("role", "user_id") SELECT "pgrst_body"."role", "pgrst_body"."user_id" FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "role", "user_id" FROM json_to_record(pgrst_payload.json_data) AS _("role" character varying(50), "user_id" uuid) ) pgrst_body WHERE set_config('pgrst.inserted', (coalesce(nullif(current_setting('pgrst.inserted', true), '')::int, 0) + 1)::text, true) <> '0' ON CONFLICT("user_id") DO UPDATE SET "role" = EXCLUDED."role", "user_id" = EXCLUDED."user_id"WHERE set_config('pgrst.inserted', (coalesce(nullif(current_setting('pgrst.inserted', true), '')::int, 0) - 1)::text, true) <> '-1' RETURNING 1) SELECT '' AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, array[]::text[] AS header, ''::text AS body, nullif(current_setting('response.headers', true), '') AS response_headers, nullif(current_setting('response.status', true), '') AS response_status, nullif(current_setting('pgrst.inserted', true),'')::int AS response_inserted FROM (SELECT * FROM pgrst_source) _postgrest_t	2025-07-01 10:04:29.510867+00
35	6dee4175-a9e5-4cc3-8089-5008d380ef9a	student	company_admin	\N	WITH pgrst_source AS (INSERT INTO "public"."user_roles"("role", "user_id") SELECT "pgrst_body"."role", "pgrst_body"."user_id" FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "role", "user_id" FROM json_to_record(pgrst_payload.json_data) AS _("role" character varying(50), "user_id" uuid) ) pgrst_body WHERE set_config('pgrst.inserted', (coalesce(nullif(current_setting('pgrst.inserted', true), '')::int, 0) + 1)::text, true) <> '0' ON CONFLICT("user_id") DO UPDATE SET "role" = EXCLUDED."role", "user_id" = EXCLUDED."user_id"WHERE set_config('pgrst.inserted', (coalesce(nullif(current_setting('pgrst.inserted', true), '')::int, 0) - 1)::text, true) <> '-1' RETURNING 1) SELECT '' AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, array[]::text[] AS header, ''::text AS body, nullif(current_setting('response.headers', true), '') AS response_headers, nullif(current_setting('response.status', true), '') AS response_status, nullif(current_setting('pgrst.inserted', true),'')::int AS response_inserted FROM (SELECT * FROM pgrst_source) _postgrest_t	2025-07-02 05:02:38.445973+00
36	c6e093e9-bc2f-4555-9ca7-b0d9d93f0a94	student	company_admin	\N	WITH pgrst_source AS (INSERT INTO "public"."user_roles"("role", "user_id") SELECT "pgrst_body"."role", "pgrst_body"."user_id" FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "role", "user_id" FROM json_to_record(pgrst_payload.json_data) AS _("role" character varying(50), "user_id" uuid) ) pgrst_body WHERE set_config('pgrst.inserted', (coalesce(nullif(current_setting('pgrst.inserted', true), '')::int, 0) + 1)::text, true) <> '0' ON CONFLICT("user_id") DO UPDATE SET "role" = EXCLUDED."role", "user_id" = EXCLUDED."user_id"WHERE set_config('pgrst.inserted', (coalesce(nullif(current_setting('pgrst.inserted', true), '')::int, 0) - 1)::text, true) <> '-1' RETURNING 1) SELECT '' AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, array[]::text[] AS header, ''::text AS body, nullif(current_setting('response.headers', true), '') AS response_headers, nullif(current_setting('response.status', true), '') AS response_status, nullif(current_setting('pgrst.inserted', true),'')::int AS response_inserted FROM (SELECT * FROM pgrst_source) _postgrest_t	2025-07-04 05:24:44.073667+00
37	1d109812-a8ba-4a52-a2a3-23a31bf8c5a6	student	company_admin	\N	WITH pgrst_source AS (INSERT INTO "public"."user_roles"("role", "user_id") SELECT "pgrst_body"."role", "pgrst_body"."user_id" FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "role", "user_id" FROM json_to_record(pgrst_payload.json_data) AS _("role" character varying(50), "user_id" uuid) ) pgrst_body WHERE set_config('pgrst.inserted', (coalesce(nullif(current_setting('pgrst.inserted', true), '')::int, 0) + 1)::text, true) <> '0' ON CONFLICT("user_id") DO UPDATE SET "role" = EXCLUDED."role", "user_id" = EXCLUDED."user_id"WHERE set_config('pgrst.inserted', (coalesce(nullif(current_setting('pgrst.inserted', true), '')::int, 0) - 1)::text, true) <> '-1' RETURNING 1) SELECT '' AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, array[]::text[] AS header, ''::text AS body, nullif(current_setting('response.headers', true), '') AS response_headers, nullif(current_setting('response.status', true), '') AS response_status, nullif(current_setting('pgrst.inserted', true),'')::int AS response_inserted FROM (SELECT * FROM pgrst_source) _postgrest_t	2025-07-07 00:26:34.847294+00
38	a5274d3a-9a8c-47ba-8593-3d31e38dd190	student	company_admin	\N	WITH pgrst_source AS (INSERT INTO "public"."user_roles"("role", "user_id") SELECT "pgrst_body"."role", "pgrst_body"."user_id" FROM (SELECT $1 AS json_data) pgrst_payload, LATERAL (SELECT "role", "user_id" FROM json_to_record(pgrst_payload.json_data) AS _("role" character varying(50), "user_id" uuid) ) pgrst_body WHERE set_config('pgrst.inserted', (coalesce(nullif(current_setting('pgrst.inserted', true), '')::int, 0) + 1)::text, true) <> '0' ON CONFLICT("user_id") DO UPDATE SET "role" = EXCLUDED."role", "user_id" = EXCLUDED."user_id"WHERE set_config('pgrst.inserted', (coalesce(nullif(current_setting('pgrst.inserted', true), '')::int, 0) - 1)::text, true) <> '-1' RETURNING 1) SELECT '' AS total_result_set, pg_catalog.count(_postgrest_t) AS page_total, array[]::text[] AS header, ''::text AS body, nullif(current_setting('response.headers', true), '') AS response_headers, nullif(current_setting('response.status', true), '') AS response_status, nullif(current_setting('pgrst.inserted', true),'')::int AS response_inserted FROM (SELECT * FROM pgrst_source) _postgrest_t	2025-07-07 07:11:37.001714+00
\.


--
-- Data for Name: scout_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.scout_templates (id, company_id, title, content, created_at, is_global, "position", offer_range, job_id) FROM stdin;
aa68ce49-1a0a-47ca-995c-b3c80c53aba4	b3be207f-2766-455e-857a-77e424ce4943	【MVPはシリコンバレーへ】Y Combinator出身スタートアップ、日本で唯一のインターンに参加しませんか？	{name}さん\n\n初めまして！Tailor Japanで人事責任者をしている奥田と申します。\n今回は弊社のサマーインターンご参加をご検討いただけないかと思い、メッセージを送らせていただきました。\n\n【カリキュラム詳細】\nhttps://note.com/tailortech/n/ne64ef360af4d\n\n以下のキーワードをご確認いただきご興味を持っていただけそうでしたら、ぜひご応募をお待ちしております。\n\n・コンサル、PdM、エンジニア志望の学生向けサマーインターン\n・Yコンビネーター出身スタートアップ、日本で唯一のインターンシップ\n・グローバルに展開する「Tailor Platform」を使い2週間でアプリケーションを企画、開発するカリキュラム\n・MVP選出者はテイラーの本拠地シリコンバレーツアーご招待\n・実施期間：2025/08/18 ~ 08/29,\n・報酬：20万円（10日間）\n\nまずは「興味あり」だけでも構いませんので、ご返信を心よりお待ちしております！\n\n▼Tailor EntranceBook\nhttps://www.notion.so/tailortech/Tailor-EntranceBook-1cbaefa681e080d497c0cc371cd39ddb	2025-07-07 02:25:33.141905+00	t	Software Engineer	20万円/10日間	3eb0608c-ed07-4854-a233-c1559f3d7233
93041c86-4dde-4f08-886f-d9eb8d7956a9	b3be207f-2766-455e-857a-77e424ce4943	【MVPはシリコンバレーへ】Y Combinator出身スタートアップ、日本で唯一のインターンに参加しませんか？	{name}さん\n\n初めまして！Tailor Japanで人事責任者をしている奥田と申します。\n今回は弊社のサマーインターンご参加をご検討いただけないかと思い、メッセージを送らせていただきました。\n\n【カリキュラム詳細】\nhttps://note.com/tailortech/n/ne64ef360af4d\n\n以下のキーワードをご確認いただきご興味を持っていただけそうでしたら、ぜひご応募をお待ちしております。\n\n・コンサル、PdM、エンジニア志望の学生向けサマーインターン\n・Yコンビネーター出身スタートアップ、日本で唯一のインターンシップ\n・グローバルに展開する「Tailor Platform」を使い2週間でアプリケーションを企画、開発するカリキュラム\n・MVP選出者はテイラーの本拠地シリコンバレーツアーご招待\n・実施期間：2025/08/18 ~ 08/29,\n・報酬：20万円（10日間）\n\nまずは「興味あり」だけでも構いませんので、ご返信を心よりお待ちしております！\n\n▼Tailor EntranceBook\nhttps://www.notion.so/tailortech/Tailor-EntranceBook-1cbaefa681e080d497c0cc371cd39ddb	2025-07-07 02:24:54.38947+00	t	Consultant / Product Manager	20万円/10日間	be9a7b47-0d8e-4718-a30d-14e5eb8d0f4b
1439493b-ab3b-4a7c-8eed-2261ff705c4c	28d5461b-7b35-4c00-93b7-8c94f2133458	【特別本選考ルートへご招待！】1,000名規模×急成長中×ITミドルベンチャーで共に事業戦略を考えてみませんか？	こんにちは！株式会社ジーニーで新卒採用担当です。\n弊社は「誰もがマーケティングで成功できる世界を創る」のBusiness Purposeとともに、\n世界的なテクノロジー企業を本気で目指す急成長中のIT企業です。\n※スカウトご承諾後に、インターンシップや本選考の詳細をご案内いたします！\n\nご経験を拝見し、是非弊社インターンシップにご参加いただきたく、\nお声がけさせていただきました！\n詳細：https://public.n-ats.hrmos.co/geniee/jobs/2130562544860057600\n\nインターンシップでは、GENIEE事業の過去事例を基に戦略立案型のワークを\n体験していただきます。顧客のマーケティング課題に真剣に向き合いながら、\n当日は事業開発社員や事業責任者から、手厚くフィードバックさせていただき、\nご自身の今後にも役立つコンテンツとなっておりますので、是非この機会にご参加ください！\n\n■概要詳細\n・開催場所：ジーニー本社（東京都新宿区西新宿）\n・開催日程：8/22-23(金土)、8/29-30(金土)、9/7-8(日月)、9/12-13(金土)\n・昼軽食/夕食付き\n・宿泊費/交通費一部支給 ※遠方よりご参加いただく方を対象\n\n■インターン参加特典\n・特別早期選考のご案内\n・早期内定の可能性あり\n\n■プログラム（予定）\n・業界/企業理解\n・事業戦略立案型のグループワーク\n・現場社員との交流\n\n■参加フロー\nインターンシップへ参加された方は、その後優先的に特別早期選考にご招待いたします！\n説明会参加 → 適性検査 → 一次面接 → インターンシップ参加\n\n■採用担当からのおすすめポイント\n・昨年度も実施し、満足度5点満点中4.8を記録する大人気イベントです。\n・高難度の課題に取り組み、若手から周囲に差を付けて成長したい人、\n　経営に近い事業作りや企業の課題解決/マーケティングに興味がある人は\n是非ご参加ください！\n\n■こんな方は是非ご参加ください！\n\n・経営の視点を学び将来事業づくりやマネジメントに興味がある方\n・第二成長フェーズで一緒に会社の成長を創り上げていくことに興味がある方\n・挑戦環境に身をおき、若手のうちから裁量をもって成長したい方\n\n弊社事業やインターンシップ概要の詳細は、添付の求人をご確認ください。\n少しでもご興味をお持ちいただけましたら、スカウトのご承諾をお待ちしております！\nその他ご不明点がございましたら、気兼ねなくご返信ください。\n※既に弊社にご応募いただいている方からの重複のご応募はご遠慮いただいております。\n　弊社の選考に進んだ上で本スカウトを受け取った場合は、大変恐れ入りますが、\n　こちらのメッセージはご放念ください。	2025-07-08 03:56:03.49835+00	f	ビジネス職2daysインターンシップ	450～510（初任給年収）	23f12c2b-4037-4cd0-bda2-253136f46c6b
\.


--
-- Data for Name: scouts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.scouts (id, company_id, student_id, job_id, message, status, created_at, updated_at, is_read, offer_amount, offer_position, accepted_at, declined_at, chat_room_id, company_member_id) FROM stdin;
817dcff1-eb9a-4bc9-a907-050618153525	b3be207f-2766-455e-857a-77e424ce4943	f55f9427-b0e6-4d31-bc29-cc899d52f7e7	be9a7b47-0d8e-4718-a30d-14e5eb8d0f4b	{name}さん\n\n初めまして！Tailor Japanで人事責任者をしている奥田と申します。\n今回は弊社のサマーインターンご参加をご検討いただけないかと思い、メッセージを送らせていただきました。\n\n【カリキュラム詳細】\nhttps://note.com/tailortech/n/ne64ef360af4d\n\n以下のキーワードをご確認いただきご興味を持っていただけそうでしたら、ぜひご応募をお待ちしております。\n\n・コンサル、PdM、エンジニア志望の学生向けサマーインターン\n・Yコンビネーター出身スタートアップ、日本で唯一のインターンシップ\n・グローバルに展開する「Tailor Platform」を使い2週間でアプリケーションを企画、開発するカリキュラム\n・MVP選出者はテイラーの本拠地シリコンバレーツアーご招待\n・実施期間：2025/08/18 ~ 08/29,\n・報酬：20万円（10日間）\n\nまずは「興味あり」だけでも構いませんので、ご返信を心よりお待ちしております！\n\n▼Tailor EntranceBook\nhttps://www.notion.so/tailortech/Tailor-EntranceBook-1cbaefa681e080d497c0cc371cd39ddb	sent	2025-07-07 07:52:15.268397+00	2025-07-07 07:52:15.268397+00	f	500-700	コンサルタント / Product Manager	\N	\N	\N	826b4024-d3a3-4870-ad0c-570b3bb95246
f9b13f75-91c0-43c3-8b43-df8f30d82876	b3be207f-2766-455e-857a-77e424ce4943	48415d80-08f7-4650-9c19-6fea44a53ecf	be9a7b47-0d8e-4718-a30d-14e5eb8d0f4b	{name}さん\n\n初めまして！Tailor Japanで人事責任者をしている奥田と申します。\n今回は弊社のサマーインターンご参加をご検討いただけないかと思い、メッセージを送らせていただきました。\n\n【カリキュラム詳細】\nhttps://note.com/tailortech/n/ne64ef360af4d\n\n以下のキーワードをご確認いただきご興味を持っていただけそうでしたら、ぜひご応募をお待ちしております。\n\n・コンサル、PdM、エンジニア志望の学生向けサマーインターン\n・Yコンビネーター出身スタートアップ、日本で唯一のインターンシップ\n・グローバルに展開する「Tailor Platform」を使い2週間でアプリケーションを企画、開発するカリキュラム\n・MVP選出者はテイラーの本拠地シリコンバレーツアーご招待\n・実施期間：2025/08/18 ~ 08/29,\n・報酬：20万円（10日間）\n\nまずは「興味あり」だけでも構いませんので、ご返信を心よりお待ちしております！\n\n▼Tailor EntranceBook\nhttps://www.notion.so/tailortech/Tailor-EntranceBook-1cbaefa681e080d497c0cc371cd39ddb	sent	2025-07-07 07:52:04.862174+00	2025-07-07 07:52:04.862174+00	f	500-700	コンサルタント / Product Manager	\N	\N	\N	826b4024-d3a3-4870-ad0c-570b3bb95246
1adeae8e-2114-4b65-ad3a-680c8a098a84	f8451e51-511d-4ca3-a120-70710bb2b664	039527ca-2a5a-4e10-8ebb-cf63aca72d07	2b011dad-4741-4df8-a094-b7f0752794e6	テストです	sent	2025-07-07 10:09:04.716575+00	2025-07-07 10:09:04.716575+00	f	400-500	テストです	\N	\N	\N	9c7942e3-2730-476c-885e-e2870e6421bf
\.


--
-- Data for Name: session_answers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.session_answers (session_id, question_id, answer_raw, is_correct, score, elapsed_sec, created_at) FROM stdin;
2bcdf6fc-6f31-429f-812d-90d9369b8cca	7abc111d-ce4e-496c-a4c7-a34a6429ac5f	{"text": "テスト"}	\N	\N	\N	2025-06-18 02:14:46.104618+00
cc74838a-703e-4748-9200-c38137261499	7abc111d-ce4e-496c-a4c7-a34a6429ac5f	{"text": "猫ふんじゃった"}	\N	\N	\N	2025-06-18 08:12:38.858103+00
\.


--
-- Data for Name: skills; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.skills (id, name) FROM stdin;
\.


--
-- Data for Name: student_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.student_profiles (id, user_id, full_name, university, faculty, department, birth_date, gender, pr_text, created_at, last_name, first_name, last_name_kana, first_name_kana, phone, address, admission_month, graduation_month, research_theme, qualification_text, skill_text, language_skill, pr_title, pr_body, strength1, strength2, strength3, motive, desired_industries, desired_positions, desired_locations, work_style, employment_type, salary_range, work_style_options, preference_note, updated_at, status, has_internship_experience, interests, about, experience, join_ipo, postal_code, avatar_url, hometown, address_line, city, prefecture, is_completed, preferred_industries, auth_user_id, skills, qualifications, referral_source) FROM stdin;
1ef1d750-4eb3-48ca-8518-3e54215af60b	035d7e6c-2a4b-4853-a2af-6f87b19e15cc	今村 亜矢香	慶應義塾大学	経済学部	経済学科	\N	female	\N	\N	今村	亜矢香	いまむら	あやか	09075538644	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	035d7e6c-2a4b-4853-a2af-6f87b19e15cc	{}	{}	\N
1d109812-a8ba-4a52-a2a3-23a31bf8c5a6	1d109812-a8ba-4a52-a2a3-23a31bf8c5a6	株式会社トレードワークス	\N	\N	\N	\N	\N	\N	2025-07-07 00:26:34.058761+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-07-07 00:26:34.058761+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	1d109812-a8ba-4a52-a2a3-23a31bf8c5a6	{}	{}	\N
efa31c33-536f-4a25-bed1-dca6f755bd1e	0676175c-5379-407a-ac82-016a5c7a1f63	柳岡 優作	芝浦工業大学	工学部	情報工学科	\N	male	\N	\N	柳岡	優作	やなぎおか	ゆうさく	07075199766	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1730027	\N	\N	\N	\N	東京都	f	{}	0676175c-5379-407a-ac82-016a5c7a1f63	{}	{}	\N
5e1ad2d8-f5df-4e5c-a06e-e77413d2c597	07e2ba43-465e-463e-845c-62f9bf1632b2	天神 美佑	駒澤大学	GMS学部	GM学科	\N	female	\N	\N	天神	美佑	てんじん	みゆう	09010510417	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	07e2ba43-465e-463e-845c-62f9bf1632b2	{}	{}	\N
fa8ddc8e-a3a6-4407-9257-da58ea25675b	09479e40-e913-42a1-a33a-e36061145bd8	遠藤 悠太	慶應義塾大学	総合政策学部	総合政策学科	\N	male	\N	\N	遠藤	悠太	えんどう	ゆうた	07038432042	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1560056	\N	\N	\N	\N	東京都	f	{}	09479e40-e913-42a1-a33a-e36061145bd8	{}	{}	\N
dcfab332-86be-4cc1-af8d-17d7ce98ceea	0d60a7c2-894b-4c93-ac89-f9085b5ad39d	殿元 建心	法政大学	文学部	地理学科	\N	male	\N	\N	殿元	建心	とのもと	けんしん	08017552949	\N	\N	2026-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1300023	\N	\N	\N	\N	東京都	f	{}	0d60a7c2-894b-4c93-ac89-f9085b5ad39d	{}	{}	\N
2ee1cccd-c252-4f61-a0c4-2bc4dd716b46	0e4d7623-05e3-4c32-9ec1-d26e75c80f10	宮内 洸聡	法政大学	経済学部	経済学科	\N	male	\N	\N	宮内	洸聡	みやうち	たけと	09043561160	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1680074	\N	\N	\N	\N	東京都	f	{}	0e4d7623-05e3-4c32-9ec1-d26e75c80f10	{}	{}	\N
aa7cfce0-3f95-4cab-b0da-33c9ec1106ab	0f4a9c06-1625-4164-b7fa-8736cf9ba0ee	藤村 惟斗	早稲田大学	社会科学部	社会科学科	\N	\N	\N	\N	藤村	惟斗	ふじむら	ゆいと	08080254354	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	0f4a9c06-1625-4164-b7fa-8736cf9ba0ee	{}	{}	\N
23eb13b0-1716-4146-be74-dc8667483d08	130eb84f-00eb-48e1-bce3-ea8a3c1078f5	杉本 陽紀	早稲田大学大学院	基幹理工学研究科	情報理工・情報通信専攻	\N	male	\N	\N	杉本	陽紀	すぎもと	はるき	07039775689	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	2740825	\N	\N	\N	\N	千葉県	f	{}	130eb84f-00eb-48e1-bce3-ea8a3c1078f5	{}	{}	\N
d7afcc41-9d17-4607-8350-5c28de80a661	135b9fed-0f3e-413e-b0c8-cda8c278d3dd	濱口 隼	慶應義塾大学	理工学部	情報工学科	\N	\N	\N	\N	濱口	隼	はまぐち	しゅん	09095424356	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	135b9fed-0f3e-413e-b0c8-cda8c278d3dd	{}	{}	\N
93574506-1419-440a-98fc-6b84759b1084	1653c432-62fe-4224-a844-c0d7f20c42e0	鹿子 晶太郎	青山学院大学	社会情報学部	社会情報学科	\N	male	\N	\N	鹿子	晶太郎	かのこ	しょうたろう	08040305041	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	2520206	\N	\N	\N	\N	神奈川県	f	{}	1653c432-62fe-4224-a844-c0d7f20c42e0	{}	{}	\N
70df66ea-d585-45dd-83fd-d20f48d9e523	167c731f-dafd-4538-8651-6969a4dd89d2	柴原 豪	慶應義塾大学	法学部	政治学科	\N	male	\N	\N	柴原	豪	しばはら	ごう	07040897303	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	2210865	\N	\N	\N	\N	神奈川県	f	{}	167c731f-dafd-4538-8651-6969a4dd89d2	{}	{}	\N
b7f65504-cca8-458a-abfa-c9436d728159	18964171-20f4-4010-a11d-8634b7470b44	加藤 夕貴	筑波大学大学院	生命地球科学研究群	生物資源科学学位プログラム	\N	female	\N	\N	加藤	夕貴	かとう	ゆうき	07045637233	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	3050005	\N	\N	\N	\N	茨城県	f	{}	18964171-20f4-4010-a11d-8634b7470b44	{}	{}	\N
b9f4ad1c-4d75-4026-a71f-405ecfe35dcc	1e597d02-3e58-4c56-b55e-d78f71e4c702	多田野 真仁	北海道大学	経済学部	経営学科	\N	male	\N	\N	多田野	真仁	ただの	まさひと	07043865013	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	2060821	\N	\N	\N	\N	東京都	f	{}	1e597d02-3e58-4c56-b55e-d78f71e4c702	{}	{}	\N
03220f4b-d494-405b-bd4b-3a64d11274c9	1e97906e-af3c-423d-8712-4c4ad97a60e1	\N	東洋大学	文学部	教育学科・人間発達専攻	1998-12-16	male	\N	2025-06-18 08:28:24.612818+00	坂入	健仁	サカイリ	ケント	08060396475	\N	2017-04-01	2021-03-01	障害者における成人後のリカレント教育について	\N	\N	\N	テレアポで	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	t	{}	\N	[]	f	1410031	\N	富山県	西五反田7-22-17　TOCビル11階	品川区	東京都	f	{}	1e97906e-af3c-423d-8712-4c4ad97a60e1	{日本語}	{TOEIC（645〜694）}	\N
a5d6be29-e1dd-45e1-b825-d33ff9096a72	226830f3-7287-4ee0-8291-38992a60ffc5	劉 佳輝	慶應義塾大学	商学部	商学科	\N	male	\N	\N	劉	佳輝	りゅう	よしき	07031210401	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1430015	\N	\N	\N	\N	東京都	f	{}	226830f3-7287-4ee0-8291-38992a60ffc5	{}	{}	\N
2585b871-3829-48ee-ac95-c08d3ba11c2f	25d9e57a-a501-43c1-8520-886b942dd637	佐々木 健人	早稲田大学	社会科学部	社会科学科	\N	male	\N	\N	佐々木	健人	ささき	けんと	07085213941	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1120012	\N	\N	\N	\N	東京都	f	{}	25d9e57a-a501-43c1-8520-886b942dd637	{}	{}	\N
ed70954f-4cbf-4645-b6ab-a9d0e67abd2f	26544502-3e9d-4566-9822-ccfe4fea372e	三原 佑介	\N	\N	\N	\N	\N	\N	\N	三原	佑介	みはら	ゆうすけ	08015163217	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	26544502-3e9d-4566-9822-ccfe4fea372e	{}	{}	\N
ac60b073-2b36-419b-9fcb-666e3a5ac7b9	29d837f5-742c-4c57-a26d-987df08d0393	足立 匠	中央大学	理工学部	ビジネスデータサイエンス学科	\N	male	\N	\N	足立	匠	あだち	たくみ	08056433973	\N	\N	2026-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	2780028	\N	\N	\N	\N	千葉県	f	{}	29d837f5-742c-4c57-a26d-987df08d0393	{}	{}	\N
25557cdd-5e2f-4ec9-8d6b-8d3c51e475bd	2a242b76-5af3-4498-8296-cf330d67db70	天満 宝來	\N	\N	\N	\N	\N	\N	\N	天満	宝來	てんま	たから	09013030380	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	2a242b76-5af3-4498-8296-cf330d67db70	{}	{}	\N
01b5861b-bb4a-4002-be08-71db750bb24e	01b5861b-bb4a-4002-be08-71db750bb24e	X Mile株式会社	\N	\N	\N	\N	\N	\N	2025-07-01 10:03:35.754048+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-07-01 10:03:35.754048+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	01b5861b-bb4a-4002-be08-71db750bb24e	{}	{}	\N
036c17b8-4000-41df-b00f-d00ab6efde39	036c17b8-4000-41df-b00f-d00ab6efde39	上田 光心	\N	\N	\N	\N	\N	\N	2025-06-18 02:13:11.419963+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 08:22:11.094712+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	036c17b8-4000-41df-b00f-d00ab6efde39	{}	{}	\N
f91f42ec-9989-4e31-af07-e889531dcd7b	31044927-8d62-4d07-8b66-0e3d7d753053	近藤 悠太	早稲田大学	法学部	学科なし	\N	\N	\N	\N	近藤	悠太	こんどう	ゆうた	08073980696	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	31044927-8d62-4d07-8b66-0e3d7d753053	{}	{}	\N
31efe725-359a-48b1-8903-19e19676c5c2	311a9692-d10b-43b4-96af-43bab8fff8f6	生出 直己	慶應義塾大学	経済学部	経済学科	\N	male	\N	\N	生出	直己	おいで	なおき	08076245353	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	2702242	\N	\N	\N	\N	千葉県	f	{}	311a9692-d10b-43b4-96af-43bab8fff8f6	{}	{}	\N
f578cd7b-997c-464d-b944-1805b8211e57	31806d0d-9ba9-45b1-939c-7b9f19f80f43	木下 花菜子	\N	\N	\N	\N	\N	\N	\N	木下	花菜子	きのした	かなこ	09017138750	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	31806d0d-9ba9-45b1-939c-7b9f19f80f43	{}	{}	\N
d3f28594-b4d0-4280-9d50-704587299737	352a5fc6-4321-4a59-a523-6a609ef330f3	伊藤 ソフィア愛優美	早稲田大学	教育学部	英語英文学科	\N	female	\N	\N	伊藤	ソフィア愛優美	いとう	そふぃああゆみ	08020774046	\N	\N	2025-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	352a5fc6-4321-4a59-a523-6a609ef330f3	{}	{}	\N
355ca967-ac51-4082-9c92-a32c06e08276	364a8230-429b-4b03-982f-3e59faaa2b8c	池谷 元暉	同志社大学	商学部	商学科	\N	male	\N	\N	池谷	元暉	いけたに	もとき	04256524348	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	4928137	\N	\N	\N	\N	愛知県	f	{}	364a8230-429b-4b03-982f-3e59faaa2b8c	{}	{}	\N
c538352f-0ec8-4039-87c2-8b3f84ebce8d	3bad9555-391c-4ebe-914a-590da321d53e	小林 功治	一橋大学	経済学部	経済学科	\N	\N	\N	\N	小林	功治	こばやし	こうじ	07038600550	\N	\N	2026-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	3bad9555-391c-4ebe-914a-590da321d53e	{}	{}	\N
48415d80-08f7-4650-9c19-6fea44a53ecf	3ed44c78-7891-4717-b1c3-f61dae38e55d	佐藤 栞	東京学芸大学	教育学部	初等教育教員養成課程美術選修	\N	female	\N	\N	佐藤	栞	さとう	しおり	08079445515	\N	\N	2026-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	9350004	\N	\N	\N	\N	富山県	f	{}	3ed44c78-7891-4717-b1c3-f61dae38e55d	{}	{}	\N
251d960b-ae24-41a0-906b-c28e2c1620e3	3f53f625-0295-463a-b0d6-d3cb9e485dd5	松口 怜央	明治学院大学	法学部	消費情報環境法学科	\N	\N	\N	\N	松口	怜央	まつぐち	れお	09067172704	\N	\N	2026-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	3f53f625-0295-463a-b0d6-d3cb9e485dd5	{}	{}	\N
f55f9427-b0e6-4d31-bc29-cc899d52f7e7	3f66b76a-eaa6-4b3f-81a9-abe4abe0eb0a	鈴木 凜空	東洋大学	経済学部	総合政策学科	\N	male	\N	\N	鈴木	凜空	すずき	りくう	07074725400	\N	\N	2026-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	東京都	f	{}	3f66b76a-eaa6-4b3f-81a9-abe4abe0eb0a	{}	{}	\N
e2138515-00be-4189-8f7e-aea9ff8896ce	3f73fb8f-02ed-470c-b884-6c629dc46d88	藤原 大空	\N	\N	\N	\N	male	\N	\N	藤原	大空	ふじわら	そら	07041279216	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	2770852	\N	\N	\N	\N	千葉県	f	{}	3f73fb8f-02ed-470c-b884-6c629dc46d88	{}	{}	\N
564e5e71-798c-49c7-8690-a460ade47581	4073fe68-5113-4496-8323-397f27e03aa9	鈴木 慶	東京大学	経済学部	経営学科	\N	male	\N	\N	鈴木	慶	すずき	けい	09063861109	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	2420016	\N	\N	\N	\N	神奈川県	f	{}	4073fe68-5113-4496-8323-397f27e03aa9	{}	{}	\N
68e0c7e3-51cf-48a6-942d-e4ce8f3296d2	426b5d2f-0775-4b45-973b-e3b949b0e02a	磯田 亮	同志社大学	商学部	商学科	\N	male	\N	\N	磯田	亮	イソダ	リョウ	08014314781	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	5360023	\N	\N	\N	\N	大阪府	f	{}	426b5d2f-0775-4b45-973b-e3b949b0e02a	{}	{}	\N
40fb2d10-ae8a-4810-8ca3-6e6c28b4ce44	43b05057-94c5-490e-ba94-009330d04c50	今村 亜矢香	慶應大学	経済学部	経済学科	\N	\N	\N	\N	今村	亜矢香	いまむら	あやか	09075538644	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	43b05057-94c5-490e-ba94-009330d04c50	{}	{}	\N
2d7abf7a-956d-4302-8034-7418aca0685d	46b62c11-f0ef-4c3c-a7b9-68c10f1fe53c	羽田 歩	\N	\N	\N	\N	\N	\N	\N	羽田	歩	はた	あむ	08096850614	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	46b62c11-f0ef-4c3c-a7b9-68c10f1fe53c	{}	{}	\N
61a16f87-ca4c-47c9-ac99-dfa835793129	47e8d084-ebf1-4b7c-aa46-5c605ff48729	甲斐 渚	一橋大学	社会学部	社会学科	\N	female	\N	\N	甲斐	渚	かい	なぎさ	09043781012	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	2240024	\N	\N	\N	\N	神奈川県	f	{}	47e8d084-ebf1-4b7c-aa46-5c605ff48729	{}	{}	\N
55a10868-59d8-4a68-8953-ef58208ca220	4a045c2c-ca58-457b-b2bc-6ba420353e27	柴崎 凌	早稲田大学	教育学部	教育学科	\N	male	\N	\N	柴崎	凌	しばざき	りょう	09057822760	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	2130032	\N	\N	\N	\N	神奈川県	f	{}	4a045c2c-ca58-457b-b2bc-6ba420353e27	{}	{}	\N
c198512f-76f9-41ae-bb7c-bca2f1d125fd	4fdcb7b5-f75d-4a62-9824-804c3ad01900	古澤 魁音	\N	\N	\N	\N	male	\N	\N	古澤	魁音	ふるさわ	かいと	08095721496	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	4fdcb7b5-f75d-4a62-9824-804c3ad01900	{}	{}	\N
43f68209-f10d-4e02-99d1-4bd08df7136a	50176ed3-b857-4136-8959-536dc558dc3b	福嶋 紗羅	慶應義塾大学	経済学部	経済学科	\N	female	\N	\N	福嶋	紗羅	ふくしま	さら	08087205625	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1120002	\N	\N	\N	\N	東京都	f	{}	50176ed3-b857-4136-8959-536dc558dc3b	{}	{}	\N
87dc8303-a00e-4e7b-b704-a06e712eb35a	51dcf97b-a054-43f2-897b-c7449fd64ee7	宇佐美 りん	獨協大学	経済学部	経営学科	\N	\N	\N	\N	宇佐美	りん	うさみ	りん	08013210380	\N	\N	2026-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	51dcf97b-a054-43f2-897b-c7449fd64ee7	{}	{}	\N
45cb33d7-4b67-45a5-b2db-fdf5215b0b3b	52a1c9f5-113a-44f7-97ca-3239f17bea7b	市野 太誠	\N	\N	\N	\N	\N	\N	\N	市野	太誠	いちの	たいせい	09043038415	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	52a1c9f5-113a-44f7-97ca-3239f17bea7b	{}	{}	\N
337df01d-7b63-4fcc-942a-a6013013a4b8	560c203f-ef2b-415b-8cfc-e54e9e17c32b	川原 宇広	中央大学	理工学部	物理学科	\N	male	\N	\N	川原	宇広	かわはら	たかひろ	08036972326	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	2510004	\N	\N	\N	\N	神奈川県	f	{}	560c203f-ef2b-415b-8cfc-e54e9e17c32b	{}	{}	\N
52d5fce9-b902-4a2e-bdfe-f89ff796922a	567e6500-5479-4868-9c45-cb2ff864d599	楠田 篤史	京都大学	総合人間学部	総合人間学科	\N	\N	\N	\N	楠田	篤史	くすだ	あつし	09066876912	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	6008415	\N	\N	\N	\N	京都府	f	{}	567e6500-5479-4868-9c45-cb2ff864d599	{}	{}	\N
1335801d-0fa6-4e5f-a6b8-8142d192ae8a	58e4837d-b3d1-4b8f-8889-b08bcd71146b	三窪 大智	東京大学大学院	情報理工学院	電子情報学専攻	\N	male	\N	\N	三窪	大智	みくぼ	だいち	09038220747	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1550032	\N	\N	\N	\N	東京都	f	{}	58e4837d-b3d1-4b8f-8889-b08bcd71146b	{}	{}	\N
d9a5c6a9-1a1c-4147-a096-4a5948678dd7	59da027b-7357-4904-9d5f-96f9a91c3b1c	本橋 大樹	東京都市大学	メディア情報学部	社会メディア学科	\N	male	\N	\N	本橋	大樹	モトハシ	ダイキ	08077353552	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1200034	\N	\N	\N	\N	東京都	f	{}	59da027b-7357-4904-9d5f-96f9a91c3b1c	{}	{}	\N
fdd6f9fc-b9c5-497a-8846-3f9aba3db48e	5b67a8dc-c366-4d19-a354-16a09e18082d	小倉 一真	専修大学	経営学部	ビジネスデザイン学科	\N	male	\N	\N	小倉	一真	おぐら	かずま	07069741020	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1530052	\N	\N	\N	\N	東京都	f	{}	5b67a8dc-c366-4d19-a354-16a09e18082d	{}	{}	\N
cf615284-6330-4b6d-bd4f-c467b98eeb68	5c7e522d-d276-4775-a57d-bf9cf1957cd8	宮井 明日香	青山学院大学	コミュニティ人間科学部	コミュニティ人間科学科	\N	female	\N	\N	宮井	明日香	みやい	あすか	08053288070	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1940003	\N	\N	\N	\N	東京都	f	{}	5c7e522d-d276-4775-a57d-bf9cf1957cd8	{}	{}	\N
5e861420-63dc-4f8d-a36e-df388ca1cc76	5d9f9a06-8efa-4930-bf2d-35149922bf18	隈元 京	東京大学	文学部	人文学科	\N	male	\N	\N	隈元	京	くまもと	きょう	09098700715	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1160002	\N	\N	\N	\N	東京都	f	{}	5d9f9a06-8efa-4930-bf2d-35149922bf18	{}	{}	\N
138baea0-574a-4541-a5e6-f6ed2c08524a	638b5323-1b76-415f-9ccc-458e37f84e59	本多 蓮	千葉大学	工学部	総合工学科	\N	male	\N	\N	本多	蓮	ほんだ	れん	07022307767	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	2630015	\N	\N	\N	\N	千葉県	f	{}	638b5323-1b76-415f-9ccc-458e37f84e59	{}	{}	\N
09f8d370-e758-4d0e-911c-0fa3510cf01e	63f39513-e796-4a7e-956f-c1fcc0b887d0	片山 想大	京都大学	農学部	食料・環境経済学科	\N	male	\N	\N	片山	想大	かたやま	そうた	09042939040	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	6020901	\N	\N	\N	\N	京都府	f	{}	63f39513-e796-4a7e-956f-c1fcc0b887d0	{}	{}	\N
9ec38644-d7ad-474a-8c24-2bccf78dc3f2	6a7cbcb6-d3fe-4aff-9941-0b306314814d	戸田 昂成	慶應義塾大学	商学部	商学科	\N	male	\N	\N	戸田	昂成	とだ	こうせい	08063519403	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1560052	\N	\N	\N	\N	東京都	f	{}	6a7cbcb6-d3fe-4aff-9941-0b306314814d	{}	{}	\N
45bd314c-2739-4384-b91a-896b3905ef19	705aa51b-9462-4ba1-8f9a-791d7a981958	中原 康介	\N	\N	\N	\N	\N	\N	\N	中原	康介	なかはら	こうすけ	09092581938	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	705aa51b-9462-4ba1-8f9a-791d7a981958	{}	{}	\N
158bf711-a80c-4418-a77e-6a930f630b9c	781080c7-8d71-4d8f-b804-eab03798f2e2	髙木 翔太	慶應義塾大学	経済学部	経済学科	\N	male	\N	\N	髙木	翔太	たかぎ	しょうた	4407724647973	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1580083	\N	\N	\N	\N	東京都	f	{}	781080c7-8d71-4d8f-b804-eab03798f2e2	{}	{}	\N
99208b1e-d676-4c4c-80d4-3a39b9e82a85	782f9303-e208-478a-9ea0-8a4e23283946	日向 祥太	明治大学	商学部	商学科	\N	male	\N	\N	日向	祥太	ヒナタ	ショウタ	09092385617	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1940032	\N	\N	\N	\N	東京都	f	{}	782f9303-e208-478a-9ea0-8a4e23283946	{}	{}	\N
47a8892e-581a-42bd-85df-c55911f527d9	7e6297ff-8df7-43ba-95d0-7da57c86cc45	加藤 夕貴	筑波大学大学院	理工情報生命学術院	生命地球科学研究群	\N	male	\N	\N	加藤	夕貴	かとう	ゆうき	09096436672	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	3050005	\N	\N	\N	\N	茨城県	f	{}	7e6297ff-8df7-43ba-95d0-7da57c86cc45	{}	{}	\N
56e75be3-9841-4ad1-ab32-b129727bb17e	7fb99469-a71a-4289-a2fc-f66751f0757c	清水 駿太	東京科学大学	情報理工学院	情報工学系 知能情報コース	\N	male	\N	\N	清水	駿太	しみず	はやた	08089149279	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	2110063	\N	\N	\N	\N	神奈川県	f	{}	7fb99469-a71a-4289-a2fc-f66751f0757c	{}	{}	\N
5a2eb8cd-1e6c-4714-bc52-29fb519d8a0f	807d3561-f113-4f25-9fa8-30b259822ea5	水野 莉佳	慶應義塾大学	経済学部	経済学科	\N	female	\N	\N	水野	莉佳	みずの	りか	07085005969	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	2850846	\N	\N	\N	\N	千葉県	f	{}	807d3561-f113-4f25-9fa8-30b259822ea5	{}	{}	\N
2a4c4b5c-f38c-4bbc-b91c-c3fe88ee9dc5	87a98988-e408-49f7-8556-c4426b6074d2	渡辺 真桜	法政大学	経営学部	経営学科	\N	female	\N	\N	渡辺	真桜	わたなべ	まお	07037655247	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	2610013	\N	\N	\N	\N	千葉県	f	{}	87a98988-e408-49f7-8556-c4426b6074d2	{}	{}	\N
9fbbc9b3-159b-4fcd-a5a4-c1af19237c53	885c1474-1363-489a-b935-32e57598c88a	青木 萌々音	慶應義塾大学	商学部	商学科	\N	female	\N	\N	青木	萌々音	あおき	ももね	09079929845	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1420062	\N	\N	\N	\N	東京都	f	{}	885c1474-1363-489a-b935-32e57598c88a	{}	{}	\N
7f306488-67b5-4bfc-80e0-816f511deb93	891d3d50-72e2-48d5-b5d0-31d24a415c0d	後藤 良大	法政大学	法学部	法律学科	\N	male	\N	\N	後藤	良大	ごとう	りょうだい	08043261533	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1350021	\N	\N	\N	\N	東京都	f	{}	891d3d50-72e2-48d5-b5d0-31d24a415c0d	{}	{}	\N
2c1167f0-b7d0-44e1-a47e-9693bfa84631	8bc3ab83-0d67-4c0b-ba14-9667dbb823da	奥田 星愛	成蹊大学	法学部	政治学科	\N	female	\N	\N	奥田	星愛	おくだ	せいら	07017908878	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1680064	\N	\N	\N	\N	東京都	f	{}	8bc3ab83-0d67-4c0b-ba14-9667dbb823da	{}	{}	\N
362c0c53-25b4-43c0-b1b6-b54c7fbd970b	8e9f4b24-d62c-4a28-a414-12bef4dc3cfe	藤山 菫	早稲田大学	基幹理工学部	応用数理学科	\N	female	\N	\N	藤山	菫	ふじやま	すみれ	08088463505	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	2720102	\N	\N	\N	\N	千葉県	f	{}	8e9f4b24-d62c-4a28-a414-12bef4dc3cfe	{}	{}	\N
de3a6b6d-2db7-40fb-957f-aa1aa3f4f791	903ddcb8-8417-4c6a-9ebb-e69677be5b22	宮内 洸聡	法政大学	経済学部	経済学科	\N	male	\N	\N	宮内	洸聡	みやうち	たけと	09043561160	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1680074	\N	\N	\N	\N	東京都	f	{}	903ddcb8-8417-4c6a-9ebb-e69677be5b22	{}	{}	\N
b6766dc7-ae0f-458c-abb0-74bab4c3cf4d	959f9f6b-c2cc-473a-b3cf-e12569a36414	森本 璃子	日本獣医生命科学大学	獣医	獣医	\N	female	\N	\N	森本	璃子	もりもと	りこ	09091618505	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1810011	\N	\N	\N	\N	東京都	f	{}	959f9f6b-c2cc-473a-b3cf-e12569a36414	{}	{}	\N
9bf261e2-6325-45c0-b8f3-2fbbcc5f926f	97c9522c-a69a-4692-8d71-1d05960a7b34	角 太貴	東京大学	教養学部	文科2類	\N	male	\N	\N	角	太貴	すみ	たいき	09041143717	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1140024	\N	\N	\N	\N	東京都	f	{}	97c9522c-a69a-4692-8d71-1d05960a7b34	{}	{}	\N
8b4fe813-d8f9-4697-be7d-729826d899e1	9b0d787f-1b4c-4352-b8c0-0e5193ca28c6	沼澤 拓未	早稲田大学	政治経済学部	経済学科	\N	male	\N	\N	沼澤	拓未	ぬまさわ	たくみ	08034573748	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	3491132	\N	\N	\N	\N	埼玉県	f	{}	9b0d787f-1b4c-4352-b8c0-0e5193ca28c6	{}	{}	\N
64b1b779-45f4-4ac6-a0e9-0007f422c707	9b607192-b5df-43a5-9522-219b02b26240	長野 秀俊	京都大学	理学部	理学科	\N	male	\N	\N	長野	秀俊	ながの	ひでとし	08089983938	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	6068265	\N	\N	\N	\N	京都府	f	{}	9b607192-b5df-43a5-9522-219b02b26240	{}	{}	\N
404e1b66-50c1-45e2-b585-2b48542549e8	9bc4eecc-63a7-44e2-b8d1-39b2f40b2e6e	山賀 ルカ	東京大学	経済学部	経済学科	\N	male	\N	\N	山賀	ルカ	やまが	るか	08098853930	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	2460008	\N	\N	\N	\N	神奈川県	f	{}	9bc4eecc-63a7-44e2-b8d1-39b2f40b2e6e	{}	{}	\N
466032f2-9d94-4c62-b346-7c276e7cbab3	9df85d0f-e29d-4595-b99d-bcd49d35bdd8	桐谷 晃世	立命館アジア太平洋大学	国際経営学部	国際経営学科	\N	\N	\N	\N	桐谷	晃世	きりたに	こうせい	07073281201	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	9df85d0f-e29d-4595-b99d-bcd49d35bdd8	{}	{}	\N
b6bffffd-f53a-4d9d-82a7-ead18cbc8247	9e13482b-e897-40ba-bb2f-a6d1a337e416	渡辺 圭哉	早稲田大学	政治経済学部	政治学科	\N	male	\N	\N	渡辺	圭哉	わたなべ	けいや	09060252267	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	2270054	\N	\N	\N	\N	神奈川県	f	{}	9e13482b-e897-40ba-bb2f-a6d1a337e416	{}	{}	\N
fa86347a-8701-4529-882b-ca910028bc3c	9fc033ff-274c-4d95-8749-7a8b83cd18f3	藤田  奈央	\N	\N	\N	\N	\N	\N	\N	藤田	 奈央	ふじた	なお	08082068754	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	9fc033ff-274c-4d95-8749-7a8b83cd18f3	{}	{}	\N
4d3f0910-cb95-4922-a834-2aa2838d0890	9fd377c1-928f-4b84-80c6-a1744c41f836	松村 和磨	慶應義塾大学	法学部	政治学科	\N	male	\N	\N	松村	和磨	マツムラ	カズマ	08085508845	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	2110025	\N	\N	\N	\N	神奈川県	f	{}	9fd377c1-928f-4b84-80c6-a1744c41f836	{}	{}	\N
b18e0718-e293-4603-bb86-05050da3f838	a21586b1-3467-47eb-8733-85448f38db4b	水本 結奈	ケイオウギジュク	法学部	法律学科	\N	female	\N	\N	水本	結奈	みずもと	ゆいな	09057334713	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	2110068	\N	\N	\N	\N	神奈川県	f	{}	a21586b1-3467-47eb-8733-85448f38db4b	{}	{}	\N
8d6657eb-70b7-429c-b4a7-5a5f6f6e79ed	a3c8d54c-81a7-4307-a360-491cf8a86762	大山 嵐鵬	慶應義塾大学	経済研究科	経済学科	\N	male	\N	\N	大山	嵐鵬	おおやま	らんぽん	08033024088	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1360074	\N	\N	\N	\N	東京都	f	{}	a3c8d54c-81a7-4307-a360-491cf8a86762	{}	{}	\N
a5274d3a-9a8c-47ba-8593-3d31e38dd190	a5274d3a-9a8c-47ba-8593-3d31e38dd190	Xvolve Group	\N	\N	\N	\N	\N	\N	2025-07-07 07:11:36.276563+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-07-07 07:11:36.276563+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	a5274d3a-9a8c-47ba-8593-3d31e38dd190	{}	{}	\N
7548ec90-840a-4430-b88a-81ed64747e53	aab45522-ea85-47ee-a4d7-c2afa0aca3ba	安間 湧真	大手前大学	現代社会学部	現代社会学科	\N	\N	\N	\N	安間	湧真	あんま	ゆうま	07014170218	\N	\N	2025-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	aab45522-ea85-47ee-a4d7-c2afa0aca3ba	{}	{}	\N
b6e5c39a-e23c-400c-a4da-f9833bbac0d7	adc14c9f-3c89-43f3-a9e0-b33d88318fad	関口 黎	東京科学大学	工学院	機械系機械コース	\N	male	\N	\N	関口	黎	せきぐち	れい	08095867750	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	3010816	\N	\N	\N	\N	茨城県	f	{}	adc14c9f-3c89-43f3-a9e0-b33d88318fad	{}	{}	\N
24324b11-b318-42c3-9d8a-b9a0eef08d99	af852cf8-ab15-4de0-88b7-8e286307a801	飯田 朱音	立教大学	コミュニティ福祉学部	コミュニティ政策学科	\N	\N	\N	\N	飯田	朱音	いいだ	あかね	00000000000	\N	\N	2026-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	af852cf8-ab15-4de0-88b7-8e286307a801	{}	{}	\N
7ebd6c3a-ce2a-442c-9fc1-d4b2c6097041	b15e9a9f-d14b-4eed-aa75-3978730ced74	小幡 友奈	慶應義塾大学	商学部	商学科	\N	female	\N	\N	小幡	友奈	おばた	ゆうな	08079450794	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	3020132	\N	\N	\N	\N	茨城県	f	{}	b15e9a9f-d14b-4eed-aa75-3978730ced74	{}	{}	\N
5081181a-80eb-45e0-9cb9-dab09f5088e4	b4c957e5-5e57-430a-b052-474768a85be5	松口 翔央	日本大学	法学部	新聞学科	\N	male	\N	\N	松口	翔央	まつぐち	しょう	07023189425	\N	\N	2026-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1830011	\N	\N	\N	\N	東京都	f	{}	b4c957e5-5e57-430a-b052-474768a85be5	{}	{}	\N
b1158f2c-7f72-48f2-a532-9a8e93620784	b6fffe9c-49f4-400f-a200-d0fdce25d92b	中川 尚昭	中央大学	商学部	金融学科	\N	male	\N	\N	中川	尚昭	なかがわ	なおあき	08085532300	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	2510052	\N	\N	\N	\N	神奈川県	f	{}	b6fffe9c-49f4-400f-a200-d0fdce25d92b	{}	{}	\N
4541aca1-231b-4703-b6cb-eb96fa3594f4	b7aca3f1-2b6a-4f79-a763-6d04cab37086	丈野 仁寿	九州大学　大学院	工学府	水素エネルギーシステム専攻	\N	male	\N	\N	丈野	仁寿	じょうの	ひとし	08085060419	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	8190367	\N	\N	\N	\N	福岡県	f	{}	b7aca3f1-2b6a-4f79-a763-6d04cab37086	{}	{}	\N
fa3a2146-09d5-44d3-a05a-0770555f620b	b7b5e5bf-36b3-4ab4-89d6-fdc887fe38c9	石嶺 慧	東京学芸大学	教育学部	学校心理学科	\N	\N	\N	\N	石嶺	慧	いしみね	けい	08064999537	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	b7b5e5bf-36b3-4ab4-89d6-fdc887fe38c9	{}	{}	\N
938e29dd-a829-4aad-99f3-528f52b274d2	b9c8cc81-1603-4b24-b30e-70b8870acc18	大谷 直之	早稲田大学	教育学部	教育学科	\N	male	\N	\N	大谷	直之	おおや	なおゆき	07041182190	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1640011	\N	\N	\N	\N	東京都	f	{}	b9c8cc81-1603-4b24-b30e-70b8870acc18	{}	{}	\N
cd6c0039-fd6f-438f-8ee6-224d81ff8f4e	bc43774d-d690-4b57-9dd0-550403d571e2	上治 正太郎	慶応義塾大学大学院	理工学研究科	開放環境科学専攻	\N	male	\N	\N	上治	正太郎	うえじ	しょうたろう	09080278122	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1320023	\N	\N	\N	\N	東京都	f	{}	bc43774d-d690-4b57-9dd0-550403d571e2	{}	{}	\N
29d083b5-2495-4d6e-9677-c8067eefef90	bca063d5-97a4-4f25-b1a8-2126ee0ee0b7	井川 雄一朗	京都大学	教育学部	教育学研究科	\N	male	\N	\N	井川	雄一朗	イカワ	ユウイチロウ	07053401019	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	6018416	\N	\N	\N	\N	京都府	f	{}	bca063d5-97a4-4f25-b1a8-2126ee0ee0b7	{}	{}	\N
5be6546f-a895-4193-82ea-673adc623197	bda9ee47-244c-4b69-a07f-3d67da29e727	池上 亮平	近畿大学	経営学部	商学科	\N	male	\N	\N	池上	亮平	いけがみ	りょうへい	08038018921	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	6570817	\N	\N	\N	\N	兵庫県	f	{}	bda9ee47-244c-4b69-a07f-3d67da29e727	{}	{}	\N
aa657122-548d-4980-ba92-e07178bd63b2	bed2789b-72ef-4471-98a3-688de638b21c	鹿子 晶太郎	青山学院大学	社会情報学部	社会情報学科	\N	male	\N	\N	鹿子	晶太郎	かのこ	しょうたろう	08040305041	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	2520206	\N	\N	\N	\N	神奈川県	f	{}	bed2789b-72ef-4471-98a3-688de638b21c	{}	{}	\N
828edccb-b2a8-41b4-aab5-973994b38f4d	c0285637-3530-42c0-9146-d99427363022	成尾 拓輝	大阪市立大学	経済学部	経済学科	\N	male	\N	\N	成尾	拓輝	なるお	ひろき	07045584764	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	6510093	\N	\N	\N	\N	兵庫県	f	{}	c0285637-3530-42c0-9146-d99427363022	{}	{}	\N
aa98580a-c288-401b-b182-eb009a495043	c0ef5298-17dc-47e4-adab-0c862f23283d	高橋 拓実	芝浦工業大学大学院	理工学研究科	建築学専攻	\N	male	\N	\N	高橋	拓実	たかはし	たくみ	08028069945	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	c0ef5298-17dc-47e4-adab-0c862f23283d	{}	{}	\N
02b9b033-a6fd-4210-ab53-be47951f8410	c159cfe9-0fcb-4f4a-a698-391b6e4ffde9	山下 熙莉杏	電気通信大学	情報理工学域	基盤理工学専攻	\N	male	\N	\N	山下	熙莉杏	ヤマシタ	キリア	09056154434	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1820034	\N	\N	\N	\N	東京都	f	{}	c159cfe9-0fcb-4f4a-a698-391b6e4ffde9	{}	{}	\N
7b7c264e-b7d2-4f3f-8955-e8ebcd484fc2	c181545f-5b9a-4295-8213-52afc1cf57a2	高橋 侑汰	慶應義塾大学	経済学部	経済学科	\N	male	\N	\N	高橋	侑汰	たかはし	ゆうた	09068495331	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	2110025	\N	\N	\N	\N	神奈川県	f	{}	c181545f-5b9a-4295-8213-52afc1cf57a2	{}	{}	\N
180e859f-b77e-426c-a7df-2df73ed14a47	c2944b5b-d323-4517-8432-8b6c324b8c7e	最上 慎太郎	筑波大学	理工学群	社会工学類	\N	male	\N	\N	最上	慎太郎	もがみ	しんたろう	08078090878	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	3050005	\N	\N	\N	\N	茨城県	f	{}	c2944b5b-d323-4517-8432-8b6c324b8c7e	{}	{}	\N
62800db8-44d2-4354-b6c8-cd81a9d62ecb	c2d80043-6478-41fc-ac31-a24344b59d63	宮岡 大晟	東京理科大学大学院	工学研究科	電気工学専攻	\N	male	\N	\N	宮岡	大晟	みやおか	たいせい	08076983245	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	2150011	\N	\N	\N	\N	神奈川県	f	{}	c2d80043-6478-41fc-ac31-a24344b59d63	{}	{}	\N
e32c23b9-2088-401e-81b6-97ebde819433	c5b9c9d1-6844-4612-a7e7-14bd1c970f3c	宮井 明日香	青山学院大学	コミュニティ人間科学部	コミュニティ人間科学科	\N	female	\N	\N	宮井	明日香	みやい	あすか	08053288070	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1940003	\N	\N	\N	\N	東京都	f	{}	c5b9c9d1-6844-4612-a7e7-14bd1c970f3c	{}	{}	\N
d7545daf-cbce-4918-bb21-ddf63b658fbc	c6762934-7f79-4d5c-95fd-a23a7584c842	大塚 憲汰	青山学院大学	法学部	法学科	\N	\N	\N	\N	大塚	憲汰	おおつか	けんた	07050700011	\N	\N	2026-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	c6762934-7f79-4d5c-95fd-a23a7584c842	{}	{}	\N
2acf14a8-8d80-445c-823c-74e4f7ae0e72	ca4e39ba-5615-4d0c-9bdc-0bccfe129edf	若海 翼	東京大学	工学部	システム創成学科	\N	\N	\N	\N	若海	翼	わかうみ	つばさ	00000000080	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	ca4e39ba-5615-4d0c-9bdc-0bccfe129edf	{}	{}	\N
e1bfc6e0-6aa3-44ce-9014-613ebaf163fc	cf61cc6a-d519-453e-90fa-11a0687178e1	サルキシャン 麗生	慶應義塾大学	総合政策学部	総合政策学学科	\N	\N	\N	\N	サルキシャン	麗生	さるきしゃん	れお	08044283007	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	cf61cc6a-d519-453e-90fa-11a0687178e1	{}	{}	\N
8c3e5813-ce90-4c7e-94d2-e0e17caa2dea	d18783f4-a26e-4aac-8b2d-153d7f95a464	平野 太一	千葉大学	法政経学部	法政経学科	\N	male	\N	\N	平野	太一	ひらの	たいち	09040948017	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	2740825	\N	\N	\N	\N	千葉県	f	{}	d18783f4-a26e-4aac-8b2d-153d7f95a464	{}	{}	\N
3c793035-c798-4264-960e-492123d4ff6a	d8f1aea9-a2fc-4dd4-a46e-a296c6bef69a	河合 伸悟	中央大学	国際経営学部	国際経営学科	\N	male	\N	\N	河合	伸悟	かわい	しんご	09020934055	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1920351	\N	\N	\N	\N	東京都	f	{}	d8f1aea9-a2fc-4dd4-a46e-a296c6bef69a	{}	{}	\N
b14c3039-54e7-456f-b245-38d70fefc849	da8b4683-8dcb-4780-8875-6d04734cedd0	井上 輝政	近畿大学	経済学部	経済学科	\N	\N	\N	\N	井上	輝政	いのうえ	てるまさ	08085073305	\N	\N	2026-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	da8b4683-8dcb-4780-8875-6d04734cedd0	{}	{}	\N
01ca7c45-271c-45c3-8712-57c841107d9a	dadb589c-c2b9-4afb-86f6-1c1cb675ba26	杉本 創哉	立命館大学	経済学部	経済学科	\N	male	\N	\N	杉本	創哉	すぎもと	そうや	08015933890	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	5250058	\N	\N	\N	\N	滋賀県	f	{}	dadb589c-c2b9-4afb-86f6-1c1cb675ba26	{}	{}	\N
8778f160-6335-4f94-ac3b-c38d202b32c9	df191eb5-9995-4538-8172-c714b79d8ea7	増田 一樹	早稲田大学	基幹理工学部	応用数理学科	\N	male	\N	\N	増田	一樹	ますた	いっき	08035733880	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	2520206	\N	\N	\N	\N	神奈川県	f	{}	df191eb5-9995-4538-8172-c714b79d8ea7	{}	{}	\N
2a05944e-d996-458a-8059-875bdf5d8f5b	dff2614b-fb1d-4e77-a61c-435bdd58b232	中川 倖那	\N	\N	\N	\N	\N	\N	\N	中川	倖那	なかがわ	ゆきな	08070005106	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	dff2614b-fb1d-4e77-a61c-435bdd58b232	{}	{}	\N
9a0017f4-6dcd-444e-9d38-63e5edc3e04d	e386dc5e-dfe3-4b97-bd16-9842903e194b	大野 桜子	慶應義塾大学	法学部	法律学科	\N	\N	\N	\N	大野	桜子	おおの	さくらこ	08084380196	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	e386dc5e-dfe3-4b97-bd16-9842903e194b	{}	{}	\N
ca86ee1a-d3e8-4a4e-b6d4-7a7b839968d4	e503c62c-d1d9-4fbb-815c-10cd47cccb15	五百籏頭 史織	大阪公立大学	商学部	商学科	\N	\N	\N	\N	五百籏頭	史織	イオキベ	シオリ	08020480317	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	e503c62c-d1d9-4fbb-815c-10cd47cccb15	{}	{}	\N
10a46cf1-3875-4ff9-80d4-71457ffa329a	e689a0bc-d4a9-43c0-9339-74ad8f704979	石川 真広	早稲田大学	社会科学部	社会科学科	\N	male	\N	\N	石川	真広	いしかわ	まひろ	08084228561	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1460085	\N	\N	\N	\N	東京都	f	{}	e689a0bc-d4a9-43c0-9339-74ad8f704979	{}	{}	\N
60b53d56-a7cd-4687-921f-0289e30afef4	e77ac83a-cec9-4db1-aee8-e7bcf2ad905f	姥 京寸介	早稲田	教育	理学科	\N	male	\N	\N	姥	京寸介	うば	きょうすけ	08026538946	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1120014	\N	\N	\N	\N	東京都	f	{}	e77ac83a-cec9-4db1-aee8-e7bcf2ad905f	{}	{}	\N
6115e47e-6c3d-4156-9e25-f14b92a6146a	e97f13bd-f43d-4ab2-bfa3-98416d8e856b	片岡 実鈴	パリ政治学院修士（慶應義塾大学・パリ政治学院学士取得済み）	School of Management and Impact	New Luxury and Art de Vivre	\N	female	\N	\N	片岡	実鈴	かたおか	みれい	07023613011	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1800002	\N	\N	\N	\N	東京都	f	{}	e97f13bd-f43d-4ab2-bfa3-98416d8e856b	{}	{}	\N
6f0a3d9c-a259-4ae6-bf02-42dcf9aa7d12	efcd4758-2874-4774-966d-4e29094a0ed1	小原 太郎	横浜国立大学	経営学部	経営学科	\N	male	\N	\N	小原	太郎	おばら	たろう	08023913095	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	3630027	\N	\N	\N	\N	埼玉県	f	{}	efcd4758-2874-4774-966d-4e29094a0ed1	{}	{}	\N
1cfaf9dd-a0cd-4a45-9794-96539357bc9e	f0b8d41c-31f0-450f-b7d3-d461f7ade25b	堀田 爽	慶應義塾大学	商学部	商学科	\N	male	\N	\N	堀田	爽	ほった	そう	07042889511	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	2400046	\N	\N	\N	\N	神奈川県	f	{}	f0b8d41c-31f0-450f-b7d3-d461f7ade25b	{}	{}	\N
02758268-f63a-428c-87f2-7b934b41277b	f3975bb1-e73d-440a-970d-ee320dcbdad3	栗栖 和大	東京都立大学	経済経営学部	経済経営学科	\N	male	\N	\N	栗栖	和大	くりす	かずひろ	07043946430	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1920364	\N	\N	\N	\N	東京都	f	{}	f3975bb1-e73d-440a-970d-ee320dcbdad3	{}	{}	\N
6273e60a-e198-493f-afdb-4ac941dfa1c7	f9b08ad4-7898-41ec-859c-37fd5fe3bca4	松尾 幸奈	慶應義塾大学	経済学部	経済学科	\N	female	\N	\N	松尾	幸奈	まつお	ゆきな	08025355815	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	2110006	\N	\N	\N	\N	神奈川県	f	{}	f9b08ad4-7898-41ec-859c-37fd5fe3bca4	{}	{}	\N
dbe068a4-ec24-4f11-891d-7ab5ef53788f	fc1c6f07-17ab-47f4-b46d-51cad7944fd1	水中 脩二	一橋大学	社会学部	社会学科	\N	male	\N	\N	水中	脩二	みずなか	しゅうじ	07041779171	\N	\N	2028-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	3591111	\N	\N	\N	\N	埼玉県	f	{}	fc1c6f07-17ab-47f4-b46d-51cad7944fd1	{}	{}	\N
3a9e3d4d-25c4-4641-b3b2-332c79b0d165	ff0ee7ba-94b4-4f0c-9e85-6d601d65e8a5	福島 京奈	\N	\N	\N	\N	\N	\N	\N	福島	京奈	ふくしま	きょうな	09073288304	\N	\N	2026-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	ff0ee7ba-94b4-4f0c-9e85-6d601d65e8a5	{}	{}	\N
73b9d837-c0d9-484b-b745-60f06ca02a53	a7dfacbb-b547-4744-aec2-ad2eab969769	手島 柊人	立教大学	現代心理学部	映像身体学科	\N	\N	\N	\N	手島	柊人	てしま	しゅうと	09043919535	\N	\N	2027-03-01	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-26 05:59:01.213641+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	a7dfacbb-b547-4744-aec2-ad2eab969769	{}	{}	\N
366dd4e3-d25c-4edc-8b17-5a569dc6bf9c	366dd4e3-d25c-4edc-8b17-5a569dc6bf9c	千葉 平太郎	東京都立大学大学院	システムデザイン研究科　	機械システム工学域	2000-08-01	男性	\N	2025-06-25 09:03:36.267452+00	千葉	平太郎	ちば	へいたろう	07036061583	東京都杉並区下井草	\N	2026-03-01	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-28 05:37:42.29508+00	アクティブ	f	{}	\N	[]	f	1670022	\N	\N		杉並区下井草	東京都	t	{}	366dd4e3-d25c-4edc-8b17-5a569dc6bf9c	{}	{}	other
0b5f7833-a5fe-4c95-883a-173ca6aa6cb0	0b5f7833-a5fe-4c95-883a-173ca6aa6cb0	株式会社ジーニー	\N	\N	\N	\N	\N	\N	2025-07-01 10:04:28.763171+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-07-01 10:04:28.763171+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	0b5f7833-a5fe-4c95-883a-173ca6aa6cb0	{}	{}	\N
c8633a32-d94d-4946-a1a1-e734c934ed39	c8633a32-d94d-4946-a1a1-e734c934ed39	千田 光一郎	\N	\N	\N	\N	\N	\N	2025-06-26 14:13:43.796229+00	千田	光一郎	\N	\N	\N	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-26 14:13:45.236546+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	c8633a32-d94d-4946-a1a1-e734c934ed39	{}	{}	friend
6dee4175-a9e5-4cc3-8089-5008d380ef9a	6dee4175-a9e5-4cc3-8089-5008d380ef9a	テイラー株式会社	\N	\N	\N	\N	\N	\N	2025-07-02 05:02:37.711751+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-07-02 05:02:37.711751+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	6dee4175-a9e5-4cc3-8089-5008d380ef9a	{}	{}	\N
03f367cb-dc70-4619-abaa-c82140143254	03f367cb-dc70-4619-abaa-c82140143254	株式会社丸井グループ	\N	\N	\N	\N	\N	\N	2025-06-27 00:41:33.550637+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-27 00:41:33.550637+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	03f367cb-dc70-4619-abaa-c82140143254	{}	{}	\N
aada0a75-9471-4caf-9116-3b6fed88b6d7	aada0a75-9471-4caf-9116-3b6fed88b6d7	\N	\N	\N	\N	\N	\N	\N	2025-07-02 05:48:10.875449+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-07-02 05:48:10.875449+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	aada0a75-9471-4caf-9116-3b6fed88b6d7	{}	{}	\N
c6e093e9-bc2f-4555-9ca7-b0d9d93f0a94	c6e093e9-bc2f-4555-9ca7-b0d9d93f0a94	株式会社SFIDA X Group	\N	\N	\N	\N	\N	\N	2025-07-04 05:24:43.304722+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-07-04 05:24:43.304722+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	c6e093e9-bc2f-4555-9ca7-b0d9d93f0a94	{}	{}	\N
039527ca-2a5a-4e10-8ebb-cf63aca72d07	039527ca-2a5a-4e10-8ebb-cf63aca72d07	熊崎 友	テスト大学	商学部	商学科	2002-04-23	男性	\N	2025-06-18 06:08:22.604851+00	熊崎	友	くまざき	ゆう	07026129325	神奈川県三浦郡葉山町長柄	\N	2027-03-01	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-07-07 10:02:37.666135+00	アクティブ	f	{}	\N	[]	f	2400113	\N	\N	\N	三浦郡葉山町長柄	神奈川県	t	{}	039527ca-2a5a-4e10-8ebb-cf63aca72d07	{}	{}	\N
a2400135-23a4-4140-a7ce-1055a3ec217f	a2400135-23a4-4140-a7ce-1055a3ec217f	\N	\N	\N	\N	\N	\N	\N	2025-06-28 05:20:00.353875+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-28 05:20:00.353875+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	a2400135-23a4-4140-a7ce-1055a3ec217f	{}	{}	\N
76907e4c-ee31-4378-bc6c-c526130a3cb3	76907e4c-ee31-4378-bc6c-c526130a3cb3	原田 愛斗	慶應義塾大学	商学部	商学科	2005-09-15	male	\N	2025-06-28 05:38:42.80788+00	原田	愛斗	はらだ	まなと	09064121204	神奈川県川崎市中原区木月3-39-58クレスト天王森102	\N	2029-03-01	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-07-06 08:12:21.568912+00	アクティブ	t	{}	\N	[]	f	2110025	\N	山口県	クレスト天王森102	川崎市中原区木月3-39-58	神奈川県	t	{}	76907e4c-ee31-4378-bc6c-c526130a3cb3	{}	{}	other
60a03c48-4cfd-4d3c-8ebf-57e90ace9b7b	60a03c48-4cfd-4d3c-8ebf-57e90ace9b7b	株式会社ビヨンドボーダーズ	\N	\N	\N	\N	\N	\N	2025-06-30 05:45:48.899025+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-30 05:45:48.899025+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	60a03c48-4cfd-4d3c-8ebf-57e90ace9b7b	{}	{}	\N
679d3437-3416-4710-ad96-ee827e2820c8	c7226da5-694b-4889-a825-3e3127418736	伊東 優希	同志社大学	経済学部	経済学科	\N	\N	\N	\N	伊東	優希	いとう	ゆうき	00000000000	\N	\N	2026-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	c7226da5-694b-4889-a825-3e3127418736	{}	{}	\N
5a52be2a-1bf9-436f-bd08-ff889a50a4d1	c7c3d97a-de1d-4b61-aa26-c7422cc827d0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	00000000000	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	0000nan	\N	\N	\N	\N	\N	f	{}	c7c3d97a-de1d-4b61-aa26-c7422cc827d0	{}	{}	\N
df1ebe41-7cff-4822-a8fa-50d6190be26f	c9742577-2e88-4338-b749-d3c416db30c5	堀内 咲希	立教大学	文学部	文学科	\N	female	\N	\N	堀内	咲希	ホリウチ	サキ	07044638949	\N	\N	2026-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 05:29:36.613873+00	アクティブ	f	{}	\N	[]	f	1710052	\N	\N	\N	\N	東京都	f	{}	c9742577-2e88-4338-b749-d3c416db30c5	{}	{}	\N
\.


--
-- Data for Name: student_profiles_backup; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.student_profiles_backup (id, user_id, full_name, university, faculty, department, birth_date, gender, pr_text, created_at, last_name, first_name, last_name_kana, first_name_kana, phone, address, admission_month, graduation_month, research_theme, qualification_text, skill_text, language_skill, pr_title, pr_body, strength1, strength2, strength3, motive, desired_industries, desired_positions, desired_locations, work_style, employment_type, salary_range, work_style_options, preference_note, updated_at, status, has_internship_experience, interests, about, experience, join_ipo, postal_code, avatar_url, hometown, address_line, city, prefecture, is_completed, preferred_industries, auth_user_id, skills, qualifications) FROM stdin;
f5763843-120e-4aea-9e8a-b3deeab22c80	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-18 01:36:31.3922+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-18 01:36:31.3922+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	f5763843-120e-4aea-9e8a-b3deeab22c80	{}	{}
bf842b9e-630f-4694-bd9d-64812894d9df	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-18 01:42:42.564457+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-18 01:42:42.564457+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	bf842b9e-630f-4694-bd9d-64812894d9df	{}	{}
036c17b8-4000-41df-b00f-d00ab6efde39	\N	上田 光心	\N	\N	\N	\N	\N	\N	2025-06-18 02:13:11.419963+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-18 02:13:12.833778+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	036c17b8-4000-41df-b00f-d00ab6efde39	{}	{}
03220f4b-d494-405b-bd4b-3a64d11274c9	1e97906e-af3c-423d-8712-4c4ad97a60e1	\N	東洋大学	文学部	教育学科・人間発達専攻	1998-12-16	male	\N	2025-06-18 08:28:24.612818+00	坂入	健仁	サカイリ	ケント	08060396475	\N	2017-04-01	2021-03-01	障害者における成人後のリカレント教育について	\N	\N	\N	テレアポで	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-18 08:32:48.319822+00	アクティブ	t	{}	\N	[]	f	1410031	\N	富山県	西五反田7-22-17　TOCビル11階	品川区	東京都	f	{}	\N	{日本語}	{TOEIC（645〜694）}
fd0a72a9-7ab1-4b9f-8c1c-ff4e18a24fa3	036c17b8-4000-41df-b00f-d00ab6efde39	\N	慶應義塾大学	経済学部	経済学科	2002-10-26	男性	\N	2025-06-18 02:13:48.653046+00	上田	光心	うえだ	こうしん	09096436672	\N	\N	2027-03-01	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-18 02:14:18.47468+00	アクティブ	f	{}	\N	[]	f	2110004	\N	\N		川崎市中原区上丸子	神奈川県	f	{}	\N	{}	{}
697303d7-8553-4b47-88fb-20805e0cc3d4	\N	デモ用	\N	\N	\N	\N	\N	\N	2025-06-18 05:56:29.656391+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-18 05:56:29.656391+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	697303d7-8553-4b47-88fb-20805e0cc3d4	{}	{}
ec42f1f8-97af-496f-845f-3471836a5942	\N	熊崎 友	\N	\N	\N	\N	\N	\N	2025-06-18 06:04:05.77783+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-18 06:04:07.160822+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	ec42f1f8-97af-496f-845f-3471836a5942	{}	{}
039527ca-2a5a-4e10-8ebb-cf63aca72d07	\N	熊崎 友	\N	\N	\N	\N	\N	\N	2025-06-18 06:08:22.604851+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-18 06:08:23.542033+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	039527ca-2a5a-4e10-8ebb-cf63aca72d07	{}	{}
4e5b3259-1208-482d-856e-b4b75664e939	039527ca-2a5a-4e10-8ebb-cf63aca72d07	\N	\N	\N	\N	\N	\N	\N	2025-06-18 06:12:52.239159+00	熊崎	友	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-18 06:12:54.604664+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
1e97906e-af3c-423d-8712-4c4ad97a60e1	\N	坂入 坂入健仁	\N	\N	\N	\N	\N	\N	2025-06-18 08:27:43.32557+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-18 08:27:44.786009+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	1e97906e-af3c-423d-8712-4c4ad97a60e1	{}	{}
53b9321a-eda0-4f49-8826-cf3e93af45a0	\N	熊崎 友	\N	\N	\N	\N	\N	\N	2025-06-19 11:55:34.955958+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-19 11:55:36.383755+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	53b9321a-eda0-4f49-8826-cf3e93af45a0	{}	{}
09e3242d-bf28-4184-bacc-65ccdb0310da	\N	株式会社Make Culture	\N	\N	\N	\N	\N	\N	2025-06-23 06:26:17.618853+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-23 06:26:17.618853+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	09e3242d-bf28-4184-bacc-65ccdb0310da	{}	{}
1f6e3fc6-3782-4e34-8a94-9ad4ecd8958b	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:37:41.883129+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:37:41.883129+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	1f6e3fc6-3782-4e34-8a94-9ad4ecd8958b	{}	{}
54515e88-ae35-4c86-8dba-2c5f70034329	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:37:44.320207+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:37:44.320207+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	54515e88-ae35-4c86-8dba-2c5f70034329	{}	{}
c385f676-cb21-41b2-af13-49e019580b1e	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:48:51.819717+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:48:51.819717+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	c385f676-cb21-41b2-af13-49e019580b1e	{}	{}
d75d7810-b41f-4495-8671-0ff2cfb9206f	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:48:52.790282+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:48:52.790282+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	d75d7810-b41f-4495-8671-0ff2cfb9206f	{}	{}
bf83f792-0125-4dd3-86a9-71c3cfe23d92	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:48:54.595596+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:48:54.595596+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	bf83f792-0125-4dd3-86a9-71c3cfe23d92	{}	{}
51274aef-29ac-4532-92f0-e2ae20c1bb86	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:48:55.703916+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:48:55.703916+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	51274aef-29ac-4532-92f0-e2ae20c1bb86	{}	{}
cccc52bd-4397-4561-871e-6b8024ce2433	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:48:56.863353+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:48:56.863353+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	cccc52bd-4397-4561-871e-6b8024ce2433	{}	{}
9defb97f-1a19-4847-ae81-be02fb5b9fad	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:48:58.001095+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:48:58.001095+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	9defb97f-1a19-4847-ae81-be02fb5b9fad	{}	{}
c1e63a3c-2a1b-49b7-a264-cf36ed45c5d9	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:48:59.198318+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:48:59.198318+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	c1e63a3c-2a1b-49b7-a264-cf36ed45c5d9	{}	{}
948a9c78-7105-43f2-b594-ae04364c9439	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:00.416545+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:00.416545+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	948a9c78-7105-43f2-b594-ae04364c9439	{}	{}
7b1792c4-39d9-4eb7-9141-cbc3d85672c9	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:01.549802+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:01.549802+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	7b1792c4-39d9-4eb7-9141-cbc3d85672c9	{}	{}
38dae3b7-7d5a-4cbc-91f4-e01707882b9a	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:02.673245+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:02.673245+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	38dae3b7-7d5a-4cbc-91f4-e01707882b9a	{}	{}
94fa3469-e6c6-4147-be37-22e0399e17ed	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:03.793391+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:03.793391+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	94fa3469-e6c6-4147-be37-22e0399e17ed	{}	{}
6aeb98be-980f-4c1b-901d-5662d8c369f6	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:04.919604+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:04.919604+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	6aeb98be-980f-4c1b-901d-5662d8c369f6	{}	{}
4e24f750-edca-49a7-b8f0-0413dbb4ceb6	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:06.518015+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:06.518015+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	4e24f750-edca-49a7-b8f0-0413dbb4ceb6	{}	{}
21ba6161-5d67-4adf-a54e-43280c0e4422	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:07.624202+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:07.624202+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	21ba6161-5d67-4adf-a54e-43280c0e4422	{}	{}
00e97f1a-b7b1-42a8-8e4f-9bd717989dd0	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:08.774849+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:08.774849+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	00e97f1a-b7b1-42a8-8e4f-9bd717989dd0	{}	{}
2ebf81a0-bbd9-4b20-acac-af21b4f72101	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:09.871358+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:09.871358+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	2ebf81a0-bbd9-4b20-acac-af21b4f72101	{}	{}
959f34fa-65c2-412e-bdb8-5af1f59afd6f	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:10.990703+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:10.990703+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	959f34fa-65c2-412e-bdb8-5af1f59afd6f	{}	{}
0cdccaa5-cc08-4cdf-97c9-8dc806741d2f	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:12.106927+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:12.106927+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	0cdccaa5-cc08-4cdf-97c9-8dc806741d2f	{}	{}
b4476f62-fbc9-45eb-9302-54d0c71773da	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:13.323681+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:13.323681+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	b4476f62-fbc9-45eb-9302-54d0c71773da	{}	{}
cb23e5c5-3d33-4627-ab81-0803bb0aaf88	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:14.474577+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:14.474577+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	cb23e5c5-3d33-4627-ab81-0803bb0aaf88	{}	{}
3ef26b5e-be6e-4fc1-8f47-788c93d94879	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:15.579271+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:15.579271+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	3ef26b5e-be6e-4fc1-8f47-788c93d94879	{}	{}
11fb058e-448d-4edd-99ac-741cc2fd8036	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:16.702657+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:16.702657+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	11fb058e-448d-4edd-99ac-741cc2fd8036	{}	{}
897cafa7-bc67-4515-a95f-f3963e94e898	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:17.850679+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:17.850679+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	897cafa7-bc67-4515-a95f-f3963e94e898	{}	{}
6331fe8c-4c41-4bb9-9da3-d348166efcfa	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:19.023975+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:19.023975+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	6331fe8c-4c41-4bb9-9da3-d348166efcfa	{}	{}
4f96f9f5-018e-4544-a3e8-ab0080437d81	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:20.136066+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:20.136066+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	4f96f9f5-018e-4544-a3e8-ab0080437d81	{}	{}
c95e4c5b-9a19-460b-9081-1e4ce68d2794	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:28.726075+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:28.726075+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	c95e4c5b-9a19-460b-9081-1e4ce68d2794	{}	{}
140633b2-d1d6-43b1-852b-656fe9f0caa2	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:37.626273+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:37.626273+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	140633b2-d1d6-43b1-852b-656fe9f0caa2	{}	{}
16b2d607-5234-48f2-9415-b77d35814d04	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:46.854831+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:46.854831+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	16b2d607-5234-48f2-9415-b77d35814d04	{}	{}
d11afcec-1045-49ec-aa80-3cda407191c9	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:47.132048+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:47.132048+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	d11afcec-1045-49ec-aa80-3cda407191c9	{}	{}
15935a84-aa04-43f1-a8f5-0762cb0fc462	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:47.357329+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:47.357329+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	15935a84-aa04-43f1-a8f5-0762cb0fc462	{}	{}
b311fcca-60ea-46a3-9a87-bf58b23ea2f7	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:47.589896+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:47.589896+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	b311fcca-60ea-46a3-9a87-bf58b23ea2f7	{}	{}
01386272-1501-4af0-89cb-a20c22718146	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:47.810119+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:47.810119+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	01386272-1501-4af0-89cb-a20c22718146	{}	{}
c5be4010-28d9-4a1e-9f2f-527d79990d33	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:48.504991+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:48.504991+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	c5be4010-28d9-4a1e-9f2f-527d79990d33	{}	{}
05c72da1-cd42-422e-9b6c-5f1093ff8887	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:48.735508+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:48.735508+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	05c72da1-cd42-422e-9b6c-5f1093ff8887	{}	{}
198f6ac7-5090-410a-837f-dba72a64d925	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:48.971235+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:48.971235+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	198f6ac7-5090-410a-837f-dba72a64d925	{}	{}
bc1c1f36-6c91-4fb7-9a05-4962f50d8b52	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:49.274476+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:49.274476+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	bc1c1f36-6c91-4fb7-9a05-4962f50d8b52	{}	{}
347968e7-1bad-45dc-a295-d897b6673c10	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:49.499374+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:49.499374+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	347968e7-1bad-45dc-a295-d897b6673c10	{}	{}
79b865be-a582-4996-8e97-6d694ecdba06	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:49.732964+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:49.732964+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	79b865be-a582-4996-8e97-6d694ecdba06	{}	{}
9614b798-ecd8-4c11-9cf8-ebfbf84cffba	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:49.962817+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:49.962817+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	9614b798-ecd8-4c11-9cf8-ebfbf84cffba	{}	{}
a85d8a0b-10cd-493d-80c6-f9836dcec17c	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:50.182238+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:50.182238+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	a85d8a0b-10cd-493d-80c6-f9836dcec17c	{}	{}
60efe1ad-b8be-48e8-9e1e-50cb91f48f28	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:50.412363+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:50.412363+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	60efe1ad-b8be-48e8-9e1e-50cb91f48f28	{}	{}
cb3b8b0c-af98-461a-9300-6aff71154da8	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:50.65966+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:50.65966+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	cb3b8b0c-af98-461a-9300-6aff71154da8	{}	{}
506e12e3-1b5c-4b9a-8f3d-16ea7d95d85e	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:50.910495+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:50.910495+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	506e12e3-1b5c-4b9a-8f3d-16ea7d95d85e	{}	{}
1ce65831-1f3b-4451-905b-bc5f806430b9	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:51.159494+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:51.159494+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	1ce65831-1f3b-4451-905b-bc5f806430b9	{}	{}
3c9c93d4-b458-4a40-bdd4-13bf9eddd4b2	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:51.406499+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:51.406499+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	3c9c93d4-b458-4a40-bdd4-13bf9eddd4b2	{}	{}
7d8a7f97-755c-4cb7-a0de-d018990a0dd3	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:51.659177+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:51.659177+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	7d8a7f97-755c-4cb7-a0de-d018990a0dd3	{}	{}
70e426df-dc89-42c5-8015-271e3d907250	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:51.896029+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:51.896029+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	70e426df-dc89-42c5-8015-271e3d907250	{}	{}
186f9539-d4e0-4d6b-b6ea-3f96933e5457	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:52.138106+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:52.138106+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	186f9539-d4e0-4d6b-b6ea-3f96933e5457	{}	{}
ea4c60e6-d627-434c-ba20-a122a242df93	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:52.489427+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:52.489427+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	ea4c60e6-d627-434c-ba20-a122a242df93	{}	{}
e1829f47-1694-4e96-b00a-098d32cf6013	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:49:52.724961+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:49:52.724961+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	e1829f47-1694-4e96-b00a-098d32cf6013	{}	{}
1b4a93d7-2395-4707-be29-83aee7d0aa66	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:50:00.519513+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:50:00.519513+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	1b4a93d7-2395-4707-be29-83aee7d0aa66	{}	{}
61d7b609-27ef-405e-a0dc-986e0bb6cf59	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:50:08.655728+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:50:08.655728+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	61d7b609-27ef-405e-a0dc-986e0bb6cf59	{}	{}
4d3a3efd-2d0a-4256-a2b3-d5ffd984433a	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:50:17.000855+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:50:17.000855+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	4d3a3efd-2d0a-4256-a2b3-d5ffd984433a	{}	{}
95cd5c34-70db-4c2b-b461-eadd10dd9635	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:50:25.625139+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:50:25.625139+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	95cd5c34-70db-4c2b-b461-eadd10dd9635	{}	{}
b622ef9c-efe7-4c26-bf2c-eaff4ffab788	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:50:34.637129+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:50:34.637129+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	b622ef9c-efe7-4c26-bf2c-eaff4ffab788	{}	{}
73040678-7579-4b73-b1ca-f2aac7f3a3cd	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:50:44.518272+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:50:44.518272+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	73040678-7579-4b73-b1ca-f2aac7f3a3cd	{}	{}
8bcfd8c2-4e6f-479e-a72c-8778888ccfa6	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:50:54.475646+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:50:54.475646+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	8bcfd8c2-4e6f-479e-a72c-8778888ccfa6	{}	{}
d73f679f-ad3e-43f2-9ad5-4f9133d4fffe	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:51:14.553759+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:51:14.553759+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	d73f679f-ad3e-43f2-9ad5-4f9133d4fffe	{}	{}
f98a1663-cb12-4eb2-8486-37adba8ca2ea	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 12:51:24.324377+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 12:51:24.324377+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	f98a1663-cb12-4eb2-8486-37adba8ca2ea	{}	{}
113cff4a-6d46-4326-b151-735af1a00bf2	\N	小暮	\N	\N	\N	\N	\N	\N	2025-06-24 13:18:05.986141+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 13:18:05.986141+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	113cff4a-6d46-4326-b151-735af1a00bf2	{}	{}
6799b73d-da39-4652-8f21-2fa879e029d1	\N	小暮	\N	\N	\N	\N	\N	\N	2025-06-24 13:22:23.407108+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 13:22:23.407108+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	6799b73d-da39-4652-8f21-2fa879e029d1	{}	{}
61885806-108f-4b20-be33-f53be6fa562c	\N	熊崎	\N	\N	\N	\N	\N	\N	2025-06-24 13:23:29.156526+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 13:23:29.156526+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	61885806-108f-4b20-be33-f53be6fa562c	{}	{}
d14b256b-517a-4cd7-b28d-7fb8aab08239	\N	熊崎	\N	\N	\N	\N	\N	\N	2025-06-24 13:23:43.69414+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 13:23:43.69414+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	d14b256b-517a-4cd7-b28d-7fb8aab08239	{}	{}
e2d72c3e-b8a0-4640-a22e-231948dfa532	\N	熊崎	\N	\N	\N	\N	\N	\N	2025-06-24 13:25:53.199906+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 13:25:53.199906+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	e2d72c3e-b8a0-4640-a22e-231948dfa532	{}	{}
64a10947-283f-4f32-96ee-044904c2ca93	\N	熊崎	\N	\N	\N	\N	\N	\N	2025-06-24 13:26:17.873597+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 13:26:17.873597+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	64a10947-283f-4f32-96ee-044904c2ca93	{}	{}
29a7182f-df24-41db-abe6-90cc76aebb95	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 13:32:36.160224+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 13:32:36.160224+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	29a7182f-df24-41db-abe6-90cc76aebb95	{}	{}
277f6e16-d0ab-45c4-a9a0-70746c5baa9d	\N	熊崎	\N	\N	\N	\N	\N	\N	2025-06-24 13:39:14.219405+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 13:39:14.219405+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	277f6e16-d0ab-45c4-a9a0-70746c5baa9d	{}	{}
6d89d215-0a9d-4eee-8046-cc29f4f7fbda	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 13:41:21.454655+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 13:41:21.454655+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	6d89d215-0a9d-4eee-8046-cc29f4f7fbda	{}	{}
5c947fbf-2656-4281-869b-a8214c9c3825	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 13:42:43.532495+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 13:42:43.532495+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	5c947fbf-2656-4281-869b-a8214c9c3825	{}	{}
e4b5aab3-87af-42ef-b894-51fa9d7e800b	\N	熊崎	\N	\N	\N	\N	\N	\N	2025-06-24 13:43:40.760672+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 13:43:40.760672+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	e4b5aab3-87af-42ef-b894-51fa9d7e800b	{}	{}
265682e4-7d34-4f88-8181-2516b75cb213	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 13:48:43.751987+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 13:48:43.751987+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	265682e4-7d34-4f88-8181-2516b75cb213	{}	{}
6d9703e7-1f7e-4c97-ad46-6f05675761fe	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 13:53:43.180435+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 13:53:43.180435+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	6d9703e7-1f7e-4c97-ad46-6f05675761fe	{}	{}
97fbc489-df0e-429d-b24b-9d85e17aa2c2	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 13:58:35.824417+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 13:58:35.824417+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	97fbc489-df0e-429d-b24b-9d85e17aa2c2	{}	{}
990b9002-e1db-446f-84a4-0291115d7816	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 14:00:04.163643+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 14:00:04.163643+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	990b9002-e1db-446f-84a4-0291115d7816	{}	{}
609f0128-2022-4a77-9f22-aa0a9a5f4af3	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-24 14:05:42.327693+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-24 14:05:42.327693+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	609f0128-2022-4a77-9f22-aa0a9a5f4af3	{}	{}
35954c82-a55d-4c70-b2f3-2a570a50b1ca	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:12:17.455019+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:12:17.455019+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	35954c82-a55d-4c70-b2f3-2a570a50b1ca	{}	{}
b4c957e5-5e57-430a-b052-474768a85be5	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:16:51.584063+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:16:51.584063+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	b4c957e5-5e57-430a-b052-474768a85be5	{}	{}
b6fffe9c-49f4-400f-a200-d0fdce25d92b	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:16:52.458905+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:16:52.458905+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	b6fffe9c-49f4-400f-a200-d0fdce25d92b	{}	{}
352a5fc6-4321-4a59-a523-6a609ef330f3	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:16:53.765389+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:16:53.765389+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	352a5fc6-4321-4a59-a523-6a609ef330f3	{}	{}
51dcf97b-a054-43f2-897b-c7449fd64ee7	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:16:54.860757+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:16:54.860757+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	51dcf97b-a054-43f2-897b-c7449fd64ee7	{}	{}
af852cf8-ab15-4de0-88b7-8e286307a801	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:16:56.021336+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:16:56.021336+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	af852cf8-ab15-4de0-88b7-8e286307a801	{}	{}
3f53f625-0295-463a-b0d6-d3cb9e485dd5	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:16:57.12383+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:16:57.12383+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	3f53f625-0295-463a-b0d6-d3cb9e485dd5	{}	{}
c7226da5-694b-4889-a825-3e3127418736	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:18:30.830288+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:18:30.830288+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	c7226da5-694b-4889-a825-3e3127418736	{}	{}
fc1c6f07-17ab-47f4-b46d-51cad7944fd1	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:22:34.510396+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:22:34.510396+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	fc1c6f07-17ab-47f4-b46d-51cad7944fd1	{}	{}
705aa51b-9462-4ba1-8f9a-791d7a981958	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:23:00.083881+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:23:00.083881+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	705aa51b-9462-4ba1-8f9a-791d7a981958	{}	{}
2346d7c7-1958-40ec-bdc7-ed5b292e893d	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:24:05.573274+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:24:05.573274+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	2346d7c7-1958-40ec-bdc7-ed5b292e893d	{}	{}
aab45522-ea85-47ee-a4d7-c2afa0aca3ba	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:12.519675+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:12.519675+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	aab45522-ea85-47ee-a4d7-c2afa0aca3ba	{}	{}
31806d0d-9ba9-45b1-939c-7b9f19f80f43	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:12.920518+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:12.920518+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	31806d0d-9ba9-45b1-939c-7b9f19f80f43	{}	{}
da8b4683-8dcb-4780-8875-6d04734cedd0	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:14.329195+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:14.329195+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	da8b4683-8dcb-4780-8875-6d04734cedd0	{}	{}
c6762934-7f79-4d5c-95fd-a23a7584c842	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:15.4254+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:15.4254+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	c6762934-7f79-4d5c-95fd-a23a7584c842	{}	{}
c9742577-2e88-4338-b749-d3c416db30c5	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:16.532222+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:16.532222+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	c9742577-2e88-4338-b749-d3c416db30c5	{}	{}
3ed44c78-7891-4717-b1c3-f61dae38e55d	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:17.620191+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:17.620191+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	3ed44c78-7891-4717-b1c3-f61dae38e55d	{}	{}
26544502-3e9d-4566-9822-ccfe4fea372e	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:18.730996+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:18.730996+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	26544502-3e9d-4566-9822-ccfe4fea372e	{}	{}
3bad9555-391c-4ebe-914a-590da321d53e	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:19.834652+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:19.834652+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	3bad9555-391c-4ebe-914a-590da321d53e	{}	{}
d8f1aea9-a2fc-4dd4-a46e-a296c6bef69a	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:20.95457+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:20.95457+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	d8f1aea9-a2fc-4dd4-a46e-a296c6bef69a	{}	{}
3f66b76a-eaa6-4b3f-81a9-abe4abe0eb0a	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:22.05171+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:22.05171+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	3f66b76a-eaa6-4b3f-81a9-abe4abe0eb0a	{}	{}
0d60a7c2-894b-4c93-ac89-f9085b5ad39d	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:23.174884+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:23.174884+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	0d60a7c2-894b-4c93-ac89-f9085b5ad39d	{}	{}
c2944b5b-d323-4517-8432-8b6c324b8c7e	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:24.331943+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:24.331943+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	c2944b5b-d323-4517-8432-8b6c324b8c7e	{}	{}
d18783f4-a26e-4aac-8b2d-153d7f95a464	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:25.767106+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:25.767106+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	d18783f4-a26e-4aac-8b2d-153d7f95a464	{}	{}
ff0ee7ba-94b4-4f0c-9e85-6d601d65e8a5	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:26.851683+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:26.851683+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	ff0ee7ba-94b4-4f0c-9e85-6d601d65e8a5	{}	{}
59da027b-7357-4904-9d5f-96f9a91c3b1c	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:27.908462+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:27.908462+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	59da027b-7357-4904-9d5f-96f9a91c3b1c	{}	{}
167c731f-dafd-4538-8651-6969a4dd89d2	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:29.007156+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:29.007156+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	167c731f-dafd-4538-8651-6969a4dd89d2	{}	{}
9b607192-b5df-43a5-9522-219b02b26240	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:30.141815+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:30.141815+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	9b607192-b5df-43a5-9522-219b02b26240	{}	{}
135b9fed-0f3e-413e-b0c8-cda8c278d3dd	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:31.225359+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:31.225359+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	135b9fed-0f3e-413e-b0c8-cda8c278d3dd	{}	{}
46b62c11-f0ef-4c3c-a7b9-68c10f1fe53c	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:32.324903+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:32.324903+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	46b62c11-f0ef-4c3c-a7b9-68c10f1fe53c	{}	{}
c0ef5298-17dc-47e4-adab-0c862f23283d	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:33.396476+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:33.396476+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	c0ef5298-17dc-47e4-adab-0c862f23283d	{}	{}
97c9522c-a69a-4692-8d71-1d05960a7b34	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:42.318066+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:42.318066+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	97c9522c-a69a-4692-8d71-1d05960a7b34	{}	{}
0f4a9c06-1625-4164-b7fa-8736cf9ba0ee	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:43.396227+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:43.396227+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	0f4a9c06-1625-4164-b7fa-8736cf9ba0ee	{}	{}
a7dfacbb-b547-4744-aec2-ad2eab969769	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:44.475044+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:44.475044+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	a7dfacbb-b547-4744-aec2-ad2eab969769	{}	{}
e503c62c-d1d9-4fbb-815c-10cd47cccb15	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:45.608818+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:45.608818+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	e503c62c-d1d9-4fbb-815c-10cd47cccb15	{}	{}
ca4e39ba-5615-4d0c-9bdc-0bccfe129edf	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:46.74652+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:46.74652+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	ca4e39ba-5615-4d0c-9bdc-0bccfe129edf	{}	{}
2a242b76-5af3-4498-8296-cf330d67db70	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:47.892549+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:47.892549+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	2a242b76-5af3-4498-8296-cf330d67db70	{}	{}
b7b5e5bf-36b3-4ab4-89d6-fdc887fe38c9	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:49.008489+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:49.008489+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	b7b5e5bf-36b3-4ab4-89d6-fdc887fe38c9	{}	{}
9df85d0f-e29d-4595-b99d-bcd49d35bdd8	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:50.101784+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:50.101784+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	9df85d0f-e29d-4595-b99d-bcd49d35bdd8	{}	{}
5d9f9a06-8efa-4930-bf2d-35149922bf18	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:51.238054+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:51.238054+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	5d9f9a06-8efa-4930-bf2d-35149922bf18	{}	{}
52a1c9f5-113a-44f7-97ca-3239f17bea7b	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:52.317317+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:52.317317+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	52a1c9f5-113a-44f7-97ca-3239f17bea7b	{}	{}
dadb589c-c2b9-4afb-86f6-1c1cb675ba26	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:53.441416+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:53.441416+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	dadb589c-c2b9-4afb-86f6-1c1cb675ba26	{}	{}
bca063d5-97a4-4f25-b1a8-2126ee0ee0b7	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:54.533348+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:54.533348+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	bca063d5-97a4-4f25-b1a8-2126ee0ee0b7	{}	{}
cf61cc6a-d519-453e-90fa-11a0687178e1	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:55.619704+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:55.619704+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	cf61cc6a-d519-453e-90fa-11a0687178e1	{}	{}
dff2614b-fb1d-4e77-a61c-435bdd58b232	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:56.802884+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:56.802884+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	dff2614b-fb1d-4e77-a61c-435bdd58b232	{}	{}
07e2ba43-465e-463e-845c-62f9bf1632b2	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:57.936548+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:57.936548+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	07e2ba43-465e-463e-845c-62f9bf1632b2	{}	{}
959f9f6b-c2cc-473a-b3cf-e12569a36414	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:25:59.039037+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:25:59.039037+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	959f9f6b-c2cc-473a-b3cf-e12569a36414	{}	{}
035d7e6c-2a4b-4853-a2af-6f87b19e15cc	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:00.135418+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:00.135418+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	035d7e6c-2a4b-4853-a2af-6f87b19e15cc	{}	{}
e386dc5e-dfe3-4b97-bd16-9842903e194b	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:01.3162+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:01.3162+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	e386dc5e-dfe3-4b97-bd16-9842903e194b	{}	{}
426b5d2f-0775-4b45-973b-e3b949b0e02a	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:02.394654+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:02.394654+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	426b5d2f-0775-4b45-973b-e3b949b0e02a	{}	{}
31044927-8d62-4d07-8b66-0e3d7d753053	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:03.473111+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:03.473111+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	31044927-8d62-4d07-8b66-0e3d7d753053	{}	{}
43b05057-94c5-490e-ba94-009330d04c50	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:04.557347+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:04.557347+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	43b05057-94c5-490e-ba94-009330d04c50	{}	{}
567e6500-5479-4868-9c45-cb2ff864d599	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:05.676802+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:05.676802+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	567e6500-5479-4868-9c45-cb2ff864d599	{}	{}
9fc033ff-274c-4d95-8749-7a8b83cd18f3	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:06.834887+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:06.834887+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	9fc033ff-274c-4d95-8749-7a8b83cd18f3	{}	{}
e97f13bd-f43d-4ab2-bfa3-98416d8e856b	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:07.975857+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:07.975857+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	e97f13bd-f43d-4ab2-bfa3-98416d8e856b	{}	{}
781080c7-8d71-4d8f-b804-eab03798f2e2	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:09.065469+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:09.065469+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	781080c7-8d71-4d8f-b804-eab03798f2e2	{}	{}
f3975bb1-e73d-440a-970d-ee320dcbdad3	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:10.161843+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:10.161843+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	f3975bb1-e73d-440a-970d-ee320dcbdad3	{}	{}
efcd4758-2874-4774-966d-4e29094a0ed1	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:11.233775+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:11.233775+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	efcd4758-2874-4774-966d-4e29094a0ed1	{}	{}
6a7cbcb6-d3fe-4aff-9941-0b306314814d	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:12.290691+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:12.290691+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	6a7cbcb6-d3fe-4aff-9941-0b306314814d	{}	{}
311a9692-d10b-43b4-96af-43bab8fff8f6	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:13.392596+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:13.392596+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	311a9692-d10b-43b4-96af-43bab8fff8f6	{}	{}
f9b08ad4-7898-41ec-859c-37fd5fe3bca4	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:14.492067+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:14.492067+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	f9b08ad4-7898-41ec-859c-37fd5fe3bca4	{}	{}
9b0d787f-1b4c-4352-b8c0-0e5193ca28c6	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:15.606007+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:15.606007+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	9b0d787f-1b4c-4352-b8c0-0e5193ca28c6	{}	{}
1e597d02-3e58-4c56-b55e-d78f71e4c702	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:17.391858+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:17.391858+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	1e597d02-3e58-4c56-b55e-d78f71e4c702	{}	{}
b7aca3f1-2b6a-4f79-a763-6d04cab37086	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:18.487225+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:18.487225+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	b7aca3f1-2b6a-4f79-a763-6d04cab37086	{}	{}
5b67a8dc-c366-4d19-a354-16a09e18082d	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:19.56983+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:19.56983+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	5b67a8dc-c366-4d19-a354-16a09e18082d	{}	{}
7fb99469-a71a-4289-a2fc-f66751f0757c	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:20.653125+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:20.653125+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	7fb99469-a71a-4289-a2fc-f66751f0757c	{}	{}
a3c8d54c-81a7-4307-a360-491cf8a86762	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:21.717051+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:21.717051+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	a3c8d54c-81a7-4307-a360-491cf8a86762	{}	{}
c0285637-3530-42c0-9146-d99427363022	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:22.799426+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:22.799426+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	c0285637-3530-42c0-9146-d99427363022	{}	{}
29d837f5-742c-4c57-a26d-987df08d0393	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:23.948858+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:23.948858+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	29d837f5-742c-4c57-a26d-987df08d0393	{}	{}
c159cfe9-0fcb-4f4a-a698-391b6e4ffde9	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:25.064088+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:25.064088+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	c159cfe9-0fcb-4f4a-a698-391b6e4ffde9	{}	{}
e689a0bc-d4a9-43c0-9339-74ad8f704979	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:26.149623+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:26.149623+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	e689a0bc-d4a9-43c0-9339-74ad8f704979	{}	{}
130eb84f-00eb-48e1-bce3-ea8a3c1078f5	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:27.316962+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:27.316962+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	130eb84f-00eb-48e1-bce3-ea8a3c1078f5	{}	{}
8bc3ab83-0d67-4c0b-ba14-9667dbb823da	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:28.418297+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:28.418297+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	8bc3ab83-0d67-4c0b-ba14-9667dbb823da	{}	{}
b15e9a9f-d14b-4eed-aa75-3978730ced74	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:29.547261+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:29.547261+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	b15e9a9f-d14b-4eed-aa75-3978730ced74	{}	{}
87a98988-e408-49f7-8556-c4426b6074d2	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:30.614147+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:30.614147+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	87a98988-e408-49f7-8556-c4426b6074d2	{}	{}
df191eb5-9995-4538-8172-c714b79d8ea7	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:31.730502+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:31.730502+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	df191eb5-9995-4538-8172-c714b79d8ea7	{}	{}
c181545f-5b9a-4295-8213-52afc1cf57a2	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:32.817475+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:32.817475+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	c181545f-5b9a-4295-8213-52afc1cf57a2	{}	{}
3f73fb8f-02ed-470c-b884-6c629dc46d88	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:33.973074+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:33.973074+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	3f73fb8f-02ed-470c-b884-6c629dc46d88	{}	{}
4a045c2c-ca58-457b-b2bc-6ba420353e27	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:35.049844+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:35.049844+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	4a045c2c-ca58-457b-b2bc-6ba420353e27	{}	{}
63f39513-e796-4a7e-956f-c1fcc0b887d0	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:36.114808+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:36.114808+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	63f39513-e796-4a7e-956f-c1fcc0b887d0	{}	{}
9bc4eecc-63a7-44e2-b8d1-39b2f40b2e6e	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:37.251494+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:37.251494+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	9bc4eecc-63a7-44e2-b8d1-39b2f40b2e6e	{}	{}
0e4d7623-05e3-4c32-9ec1-d26e75c80f10	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:38.369954+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:38.369954+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	0e4d7623-05e3-4c32-9ec1-d26e75c80f10	{}	{}
50176ed3-b857-4136-8959-536dc558dc3b	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:39.461789+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:39.461789+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	50176ed3-b857-4136-8959-536dc558dc3b	{}	{}
e77ac83a-cec9-4db1-aee8-e7bcf2ad905f	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:40.534963+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:40.534963+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	e77ac83a-cec9-4db1-aee8-e7bcf2ad905f	{}	{}
7e6297ff-8df7-43ba-95d0-7da57c86cc45	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:41.639126+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:41.639126+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	7e6297ff-8df7-43ba-95d0-7da57c86cc45	{}	{}
18964171-20f4-4010-a11d-8634b7470b44	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:41.825754+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:41.825754+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	18964171-20f4-4010-a11d-8634b7470b44	{}	{}
560c203f-ef2b-415b-8cfc-e54e9e17c32b	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:42.037869+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:42.037869+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	560c203f-ef2b-415b-8cfc-e54e9e17c32b	{}	{}
4fdcb7b5-f75d-4a62-9824-804c3ad01900	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:42.26473+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:42.26473+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	4fdcb7b5-f75d-4a62-9824-804c3ad01900	{}	{}
782f9303-e208-478a-9ea0-8a4e23283946	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:42.457537+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:42.457537+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	782f9303-e208-478a-9ea0-8a4e23283946	{}	{}
09479e40-e913-42a1-a33a-e36061145bd8	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:42.649968+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:42.649968+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	09479e40-e913-42a1-a33a-e36061145bd8	{}	{}
903ddcb8-8417-4c6a-9ebb-e69677be5b22	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:42.883396+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:42.883396+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	903ddcb8-8417-4c6a-9ebb-e69677be5b22	{}	{}
c2d80043-6478-41fc-ac31-a24344b59d63	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:43.090245+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:43.090245+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	c2d80043-6478-41fc-ac31-a24344b59d63	{}	{}
891d3d50-72e2-48d5-b5d0-31d24a415c0d	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:43.274978+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:43.274978+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	891d3d50-72e2-48d5-b5d0-31d24a415c0d	{}	{}
bc43774d-d690-4b57-9dd0-550403d571e2	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:43.467335+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:43.467335+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	bc43774d-d690-4b57-9dd0-550403d571e2	{}	{}
4073fe68-5113-4496-8323-397f27e03aa9	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:43.654265+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:43.654265+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	4073fe68-5113-4496-8323-397f27e03aa9	{}	{}
c7c3d97a-de1d-4b61-aa26-c7422cc827d0	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:43.856279+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:43.856279+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	c7c3d97a-de1d-4b61-aa26-c7422cc827d0	{}	{}
364a8230-429b-4b03-982f-3e59faaa2b8c	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:44.054466+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:44.054466+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	364a8230-429b-4b03-982f-3e59faaa2b8c	{}	{}
25d9e57a-a501-43c1-8520-886b942dd637	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:44.335097+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:44.335097+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	25d9e57a-a501-43c1-8520-886b942dd637	{}	{}
1653c432-62fe-4224-a844-c0d7f20c42e0	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:44.52487+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:44.52487+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	1653c432-62fe-4224-a844-c0d7f20c42e0	{}	{}
bed2789b-72ef-4471-98a3-688de638b21c	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:44.729021+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:44.729021+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	bed2789b-72ef-4471-98a3-688de638b21c	{}	{}
0676175c-5379-407a-ac82-016a5c7a1f63	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:44.9428+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:44.9428+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	0676175c-5379-407a-ac82-016a5c7a1f63	{}	{}
adc14c9f-3c89-43f3-a9e0-b33d88318fad	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:45.152923+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:45.152923+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	adc14c9f-3c89-43f3-a9e0-b33d88318fad	{}	{}
9fd377c1-928f-4b84-80c6-a1744c41f836	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:45.342641+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:45.342641+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	9fd377c1-928f-4b84-80c6-a1744c41f836	{}	{}
b9c8cc81-1603-4b24-b30e-70b8870acc18	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:45.542149+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:45.542149+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	b9c8cc81-1603-4b24-b30e-70b8870acc18	{}	{}
bda9ee47-244c-4b69-a07f-3d67da29e727	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:45.831676+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:45.831676+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	bda9ee47-244c-4b69-a07f-3d67da29e727	{}	{}
8e9f4b24-d62c-4a28-a414-12bef4dc3cfe	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:46.036343+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:46.036343+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	8e9f4b24-d62c-4a28-a414-12bef4dc3cfe	{}	{}
a21586b1-3467-47eb-8733-85448f38db4b	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:46.233614+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:46.233614+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	a21586b1-3467-47eb-8733-85448f38db4b	{}	{}
c5b9c9d1-6844-4612-a7e7-14bd1c970f3c	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:46.417625+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:46.417625+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	c5b9c9d1-6844-4612-a7e7-14bd1c970f3c	{}	{}
5c7e522d-d276-4775-a57d-bf9cf1957cd8	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:46.613079+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:46.613079+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	5c7e522d-d276-4775-a57d-bf9cf1957cd8	{}	{}
f0b8d41c-31f0-450f-b7d3-d461f7ade25b	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:47.189966+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:47.189966+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	f0b8d41c-31f0-450f-b7d3-d461f7ade25b	{}	{}
58e4837d-b3d1-4b8f-8889-b08bcd71146b	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:47.387051+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:47.387051+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	58e4837d-b3d1-4b8f-8889-b08bcd71146b	{}	{}
47e8d084-ebf1-4b7c-aa46-5c605ff48729	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:47.604845+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:47.604845+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	47e8d084-ebf1-4b7c-aa46-5c605ff48729	{}	{}
638b5323-1b76-415f-9ccc-458e37f84e59	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:47.831051+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:47.831051+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	638b5323-1b76-415f-9ccc-458e37f84e59	{}	{}
226830f3-7287-4ee0-8291-38992a60ffc5	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:48.030876+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:48.030876+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	226830f3-7287-4ee0-8291-38992a60ffc5	{}	{}
807d3561-f113-4f25-9fa8-30b259822ea5	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:48.227075+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:48.227075+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	807d3561-f113-4f25-9fa8-30b259822ea5	{}	{}
885c1474-1363-489a-b935-32e57598c88a	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:48.430706+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:48.430706+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	885c1474-1363-489a-b935-32e57598c88a	{}	{}
9e13482b-e897-40ba-bb2f-a6d1a337e416	\N	\N	\N	\N	\N	\N	\N	\N	2025-06-25 00:26:48.616588+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 00:26:48.616588+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	9e13482b-e897-40ba-bb2f-a6d1a337e416	{}	{}
5081181a-80eb-45e0-9cb9-dab09f5088e4	b4c957e5-5e57-430a-b052-474768a85be5	松口 翔央	日本大学	法学部	新聞学科	\N	male	\N	\N	松口	翔央	まつぐち	しょう	07023189425	\N	\N	2026-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1830011	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
b1158f2c-7f72-48f2-a532-9a8e93620784	b6fffe9c-49f4-400f-a200-d0fdce25d92b	中川 尚昭	中央大学	商学部	金融学科	\N	male	\N	\N	中川	尚昭	なかがわ	なおあき	08085532300	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	2510052	\N	\N	\N	\N	神奈川県	f	{}	\N	{}	{}
d3f28594-b4d0-4280-9d50-704587299737	352a5fc6-4321-4a59-a523-6a609ef330f3	伊藤 ソフィア愛優美	早稲田大学	教育学部	英語英文学科	\N	female	\N	\N	伊藤	ソフィア愛優美	いとう	そふぃああゆみ	08020774046	\N	\N	2025-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
87dc8303-a00e-4e7b-b704-a06e712eb35a	51dcf97b-a054-43f2-897b-c7449fd64ee7	宇佐美 りん	獨協大学	経済学部	経営学科	\N	\N	\N	\N	宇佐美	りん	うさみ	りん	08013210380	\N	\N	2026-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
24324b11-b318-42c3-9d8a-b9a0eef08d99	af852cf8-ab15-4de0-88b7-8e286307a801	飯田 朱音	立教大学	コミュニティ福祉学部	コミュニティ政策学科	\N	\N	\N	\N	飯田	朱音	いいだ	あかね	\N	\N	\N	2026-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
251d960b-ae24-41a0-906b-c28e2c1620e3	3f53f625-0295-463a-b0d6-d3cb9e485dd5	松口 怜央	明治学院大学	法学部	消費情報環境法学科	\N	\N	\N	\N	松口	怜央	まつぐち	れお	09067172704	\N	\N	2026-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
679d3437-3416-4710-ad96-ee827e2820c8	c7226da5-694b-4889-a825-3e3127418736	伊東 優希	同志社大学	経済学部	経済学科	\N	\N	\N	\N	伊東	優希	いとう	ゆうき	\N	\N	\N	2026-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
dbe068a4-ec24-4f11-891d-7ab5ef53788f	fc1c6f07-17ab-47f4-b46d-51cad7944fd1	水中 脩二	一橋大学	社会学部	社会学科	\N	male	\N	\N	水中	脩二	みずなか	しゅうじ	07041779171	\N	\N	2028-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	3591111	\N	\N	\N	\N	埼玉県	f	{}	\N	{}	{}
45bd314c-2739-4384-b91a-896b3905ef19	705aa51b-9462-4ba1-8f9a-791d7a981958	中原 康介	\N	\N	\N	\N	\N	\N	\N	中原	康介	なかはら	こうすけ	09092581938	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
7548ec90-840a-4430-b88a-81ed64747e53	aab45522-ea85-47ee-a4d7-c2afa0aca3ba	安間 湧真	大手前大学	現代社会学部	現代社会学科	\N	\N	\N	\N	安間	湧真	あんま	ゆうま	07014170218	\N	\N	2025-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
f578cd7b-997c-464d-b944-1805b8211e57	31806d0d-9ba9-45b1-939c-7b9f19f80f43	木下 花菜子	\N	\N	\N	\N	\N	\N	\N	木下	花菜子	きのした	かなこ	09017138750	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
b14c3039-54e7-456f-b245-38d70fefc849	da8b4683-8dcb-4780-8875-6d04734cedd0	井上 輝政	近畿大学	経済学部	経済学科	\N	\N	\N	\N	井上	輝政	いのうえ	てるまさ	08085073305	\N	\N	2026-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
d7545daf-cbce-4918-bb21-ddf63b658fbc	c6762934-7f79-4d5c-95fd-a23a7584c842	大塚 憲汰	青山学院大学	法学部	法学科	\N	\N	\N	\N	大塚	憲汰	おおつか	けんた	07050700011	\N	\N	2026-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
df1ebe41-7cff-4822-a8fa-50d6190be26f	c9742577-2e88-4338-b749-d3c416db30c5	堀内 咲希	立教大学	文学部	文学科	\N	female	\N	\N	堀内	咲希	ホリウチ	サキ	07044638949	\N	\N	2026-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1710052	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
48415d80-08f7-4650-9c19-6fea44a53ecf	3ed44c78-7891-4717-b1c3-f61dae38e55d	佐藤 栞	東京学芸大学	教育学部	初等教育教員養成課程美術選修	\N	female	\N	\N	佐藤	栞	さとう	しおり	08079445515	\N	\N	2026-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	9350004	\N	\N	\N	\N	富山県	f	{}	\N	{}	{}
ed70954f-4cbf-4645-b6ab-a9d0e67abd2f	26544502-3e9d-4566-9822-ccfe4fea372e	三原 佑介	\N	\N	\N	\N	\N	\N	\N	三原	佑介	みはら	ゆうすけ	08015163217	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
c538352f-0ec8-4039-87c2-8b3f84ebce8d	3bad9555-391c-4ebe-914a-590da321d53e	小林 功治	一橋大学	経済学部	経済学科	\N	\N	\N	\N	小林	功治	こばやし	こうじ	07038600550	\N	\N	2026-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
3c793035-c798-4264-960e-492123d4ff6a	d8f1aea9-a2fc-4dd4-a46e-a296c6bef69a	河合 伸悟	中央大学	国際経営学部	国際経営学科	\N	male	\N	\N	河合	伸悟	かわい	しんご	09020934055	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1920351	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
f55f9427-b0e6-4d31-bc29-cc899d52f7e7	3f66b76a-eaa6-4b3f-81a9-abe4abe0eb0a	鈴木 凜空	東洋大学	経済学部	総合政策学科	\N	male	\N	\N	鈴木	凜空	すずき	りくう	07074725400	\N	\N	2026-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
dcfab332-86be-4cc1-af8d-17d7ce98ceea	0d60a7c2-894b-4c93-ac89-f9085b5ad39d	殿元 建心	法政大学	文学部	地理学科	\N	male	\N	\N	殿元	建心	とのもと	けんしん	08017552949	\N	\N	2026-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1300023	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
180e859f-b77e-426c-a7df-2df73ed14a47	c2944b5b-d323-4517-8432-8b6c324b8c7e	最上 慎太郎	筑波大学	理工学群	社会工学類	\N	male	\N	\N	最上	慎太郎	もがみ	しんたろう	08078090878	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	3050005	\N	\N	\N	\N	茨城県	f	{}	\N	{}	{}
8c3e5813-ce90-4c7e-94d2-e0e17caa2dea	d18783f4-a26e-4aac-8b2d-153d7f95a464	平野 太一	千葉大学	法政経学部	法政経学科	\N	male	\N	\N	平野	太一	ひらの	たいち	09040948017	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	2740825	\N	\N	\N	\N	千葉県	f	{}	\N	{}	{}
3a9e3d4d-25c4-4641-b3b2-332c79b0d165	ff0ee7ba-94b4-4f0c-9e85-6d601d65e8a5	福島 京奈	\N	\N	\N	\N	\N	\N	\N	福島	京奈	ふくしま	きょうな	09073288304	\N	\N	2026-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
d9a5c6a9-1a1c-4147-a096-4a5948678dd7	59da027b-7357-4904-9d5f-96f9a91c3b1c	本橋 大樹	東京都市大学	メディア情報学部	社会メディア学科	\N	male	\N	\N	本橋	大樹	モトハシ	ダイキ	08077353552	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1200034	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
70df66ea-d585-45dd-83fd-d20f48d9e523	167c731f-dafd-4538-8651-6969a4dd89d2	柴原 豪	慶應義塾大学	法学部	政治学科	\N	male	\N	\N	柴原	豪	しばはら	ごう	07040897303	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	2210865	\N	\N	\N	\N	神奈川県	f	{}	\N	{}	{}
64b1b779-45f4-4ac6-a0e9-0007f422c707	9b607192-b5df-43a5-9522-219b02b26240	長野 秀俊	京都大学	理学部	理学科	\N	male	\N	\N	長野	秀俊	ながの	ひでとし	08089983938	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	6068265	\N	\N	\N	\N	京都府	f	{}	\N	{}	{}
d7afcc41-9d17-4607-8350-5c28de80a661	135b9fed-0f3e-413e-b0c8-cda8c278d3dd	濱口 隼	慶應義塾大学	理工学部	情報工学科	\N	\N	\N	\N	濱口	隼	はまぐち	しゅん	09095424356	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
2d7abf7a-956d-4302-8034-7418aca0685d	46b62c11-f0ef-4c3c-a7b9-68c10f1fe53c	羽田 歩	\N	\N	\N	\N	\N	\N	\N	羽田	歩	はた	あむ	08096850614	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
aa98580a-c288-401b-b182-eb009a495043	c0ef5298-17dc-47e4-adab-0c862f23283d	高橋 拓実	芝浦工業大学大学院	理工学研究科	建築学専攻	\N	male	\N	\N	高橋	拓実	たかはし	たくみ	08028069945	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
9bf261e2-6325-45c0-b8f3-2fbbcc5f926f	97c9522c-a69a-4692-8d71-1d05960a7b34	角 太貴	東京大学	教養学部	文科2類	\N	male	\N	\N	角	太貴	すみ	たいき	09041143717	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1140024	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
aa7cfce0-3f95-4cab-b0da-33c9ec1106ab	0f4a9c06-1625-4164-b7fa-8736cf9ba0ee	藤村 惟斗	早稲田大学	社会科学部	社会科学科	\N	\N	\N	\N	藤村	惟斗	ふじむら	ゆいと	08080254354	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
73b9d837-c0d9-484b-b745-60f06ca02a53	a7dfacbb-b547-4744-aec2-ad2eab969769	手島 柊人	東京ビジネスアカデミー	ビジネスデザイン	ビジネスデザイン	\N	\N	\N	\N	手島	柊人	てしま	しゅうと	09043919535	\N	\N	2026-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
ca86ee1a-d3e8-4a4e-b6d4-7a7b839968d4	e503c62c-d1d9-4fbb-815c-10cd47cccb15	五百籏頭 史織	大阪公立大学	商学部	商学科	\N	\N	\N	\N	五百籏頭	史織	イオキベ	シオリ	08020480317	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
2acf14a8-8d80-445c-823c-74e4f7ae0e72	ca4e39ba-5615-4d0c-9bdc-0bccfe129edf	若海 翼	東京大学	工学部	システム創成学科	\N	\N	\N	\N	若海	翼	わかうみ	つばさ	080	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
25557cdd-5e2f-4ec9-8d6b-8d3c51e475bd	2a242b76-5af3-4498-8296-cf330d67db70	天満 宝來	\N	\N	\N	\N	\N	\N	\N	天満	宝來	てんま	たから	09013030380	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
fa3a2146-09d5-44d3-a05a-0770555f620b	b7b5e5bf-36b3-4ab4-89d6-fdc887fe38c9	石嶺 慧	東京学芸大学	教育学部	学校心理学科	\N	\N	\N	\N	石嶺	慧	いしみね	けい	08064999537	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
466032f2-9d94-4c62-b346-7c276e7cbab3	9df85d0f-e29d-4595-b99d-bcd49d35bdd8	桐谷 晃世	立命館アジア太平洋大学	国際経営学部	国際経営学科	\N	\N	\N	\N	桐谷	晃世	きりたに	こうせい	07073281201	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
5e861420-63dc-4f8d-a36e-df388ca1cc76	5d9f9a06-8efa-4930-bf2d-35149922bf18	隈元 京	東京大学	文学部	人文学科	\N	male	\N	\N	隈元	京	くまもと	きょう	09098700715	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1160002	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
45cb33d7-4b67-45a5-b2db-fdf5215b0b3b	52a1c9f5-113a-44f7-97ca-3239f17bea7b	市野 太誠	\N	\N	\N	\N	\N	\N	\N	市野	太誠	いちの	たいせい	09043038415	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
01ca7c45-271c-45c3-8712-57c841107d9a	dadb589c-c2b9-4afb-86f6-1c1cb675ba26	杉本 創哉	立命館大学	経済学部	経済学科	\N	male	\N	\N	杉本	創哉	すぎもと	そうや	08015933890	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	5250058	\N	\N	\N	\N	滋賀県	f	{}	\N	{}	{}
29d083b5-2495-4d6e-9677-c8067eefef90	bca063d5-97a4-4f25-b1a8-2126ee0ee0b7	井川 雄一朗	京都大学	教育学部	教育学研究科	\N	male	\N	\N	井川	雄一朗	イカワ	ユウイチロウ	07053401019	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	6018416	\N	\N	\N	\N	京都府	f	{}	\N	{}	{}
e1bfc6e0-6aa3-44ce-9014-613ebaf163fc	cf61cc6a-d519-453e-90fa-11a0687178e1	サルキシャン 麗生	慶應義塾大学	総合政策学部	総合政策学学科	\N	\N	\N	\N	サルキシャン	麗生	さるきしゃん	れお	08044283007	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
2a05944e-d996-458a-8059-875bdf5d8f5b	dff2614b-fb1d-4e77-a61c-435bdd58b232	中川 倖那	\N	\N	\N	\N	\N	\N	\N	中川	倖那	なかがわ	ゆきな	08070005106	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
5e1ad2d8-f5df-4e5c-a06e-e77413d2c597	07e2ba43-465e-463e-845c-62f9bf1632b2	天神 美佑	駒澤大学	GMS学部	GM学科	\N	female	\N	\N	天神	美佑	てんじん	みゆう	09010510417	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
b6766dc7-ae0f-458c-abb0-74bab4c3cf4d	959f9f6b-c2cc-473a-b3cf-e12569a36414	森本 璃子	日本獣医生命科学大学	獣医	獣医	\N	female	\N	\N	森本	璃子	もりもと	りこ	09091618505	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1810011	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
1ef1d750-4eb3-48ca-8518-3e54215af60b	035d7e6c-2a4b-4853-a2af-6f87b19e15cc	今村 亜矢香	慶應義塾大学	経済学部	経済学科	\N	female	\N	\N	今村	亜矢香	いまむら	あやか	09075538644	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
9a0017f4-6dcd-444e-9d38-63e5edc3e04d	e386dc5e-dfe3-4b97-bd16-9842903e194b	大野 桜子	慶應義塾大学	法学部	法律学科	\N	\N	\N	\N	大野	桜子	おおの	さくらこ	08084380196	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
68e0c7e3-51cf-48a6-942d-e4ce8f3296d2	426b5d2f-0775-4b45-973b-e3b949b0e02a	磯田 亮	同志社大学	商学部	商学科	\N	male	\N	\N	磯田	亮	イソダ	リョウ	08014314781	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	5360023	\N	\N	\N	\N	大阪府	f	{}	\N	{}	{}
f91f42ec-9989-4e31-af07-e889531dcd7b	31044927-8d62-4d07-8b66-0e3d7d753053	近藤 悠太	早稲田大学	法学部	学科なし	\N	\N	\N	\N	近藤	悠太	こんどう	ゆうた	08073980696	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
40fb2d10-ae8a-4810-8ca3-6e6c28b4ce44	43b05057-94c5-490e-ba94-009330d04c50	今村 亜矢香	慶應大学	経済学部	経済学科	\N	\N	\N	\N	今村	亜矢香	いまむら	あやか	09075538644	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
52d5fce9-b902-4a2e-bdfe-f89ff796922a	567e6500-5479-4868-9c45-cb2ff864d599	楠田 篤史	京都大学	総合人間学部	総合人間学科	\N	\N	\N	\N	楠田	篤史	くすだ	あつし	09066876912	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	6008415	\N	\N	\N	\N	京都府	f	{}	\N	{}	{}
fa86347a-8701-4529-882b-ca910028bc3c	9fc033ff-274c-4d95-8749-7a8b83cd18f3	藤田  奈央	\N	\N	\N	\N	\N	\N	\N	藤田	 奈央	ふじた	なお	08082068754	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
6115e47e-6c3d-4156-9e25-f14b92a6146a	e97f13bd-f43d-4ab2-bfa3-98416d8e856b	片岡 実鈴	パリ政治学院修士（慶應義塾大学・パリ政治学院学士取得済み）	School of Management and Impact	New Luxury and Art de Vivre	\N	female	\N	\N	片岡	実鈴	かたおか	みれい	07023613011	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1800002	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
158bf711-a80c-4418-a77e-6a930f630b9c	781080c7-8d71-4d8f-b804-eab03798f2e2	髙木 翔太	慶應義塾大学	経済学部	経済学科	\N	male	\N	\N	髙木	翔太	たかぎ	しょうた	44 07724647973	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1580083	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
02758268-f63a-428c-87f2-7b934b41277b	f3975bb1-e73d-440a-970d-ee320dcbdad3	栗栖 和大	東京都立大学	経済経営学部	経済経営学科	\N	male	\N	\N	栗栖	和大	くりす	かずひろ	07043946430	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1920364	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
6f0a3d9c-a259-4ae6-bf02-42dcf9aa7d12	efcd4758-2874-4774-966d-4e29094a0ed1	小原 太郎	横浜国立大学	経営学部	経営学科	\N	male	\N	\N	小原	太郎	おばら	たろう	08023913095	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	3630027	\N	\N	\N	\N	埼玉県	f	{}	\N	{}	{}
9ec38644-d7ad-474a-8c24-2bccf78dc3f2	6a7cbcb6-d3fe-4aff-9941-0b306314814d	戸田 昂成	慶應義塾大学	商学部	商学科	\N	male	\N	\N	戸田	昂成	とだ	こうせい	08063519403	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1560052	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
31efe725-359a-48b1-8903-19e19676c5c2	311a9692-d10b-43b4-96af-43bab8fff8f6	生出 直己	慶應義塾大学	経済学部	経済学科	\N	male	\N	\N	生出	直己	おいで	なおき	08076245353	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	2702242	\N	\N	\N	\N	千葉県	f	{}	\N	{}	{}
6273e60a-e198-493f-afdb-4ac941dfa1c7	f9b08ad4-7898-41ec-859c-37fd5fe3bca4	松尾 幸奈	慶應義塾大学	経済学部	経済学科	\N	female	\N	\N	松尾	幸奈	まつお	ゆきな	08025355815	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	2110006	\N	\N	\N	\N	神奈川県	f	{}	\N	{}	{}
8b4fe813-d8f9-4697-be7d-729826d899e1	9b0d787f-1b4c-4352-b8c0-0e5193ca28c6	沼澤 拓未	早稲田大学	政治経済学部	経済学科	\N	male	\N	\N	沼澤	拓未	ぬまさわ	たくみ	08034573748	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	3491132	\N	\N	\N	\N	埼玉県	f	{}	\N	{}	{}
b9f4ad1c-4d75-4026-a71f-405ecfe35dcc	1e597d02-3e58-4c56-b55e-d78f71e4c702	多田野 真仁	北海道大学	経済学部	経営学科	\N	male	\N	\N	多田野	真仁	ただの	まさひと	07043865013	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	2060821	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
4541aca1-231b-4703-b6cb-eb96fa3594f4	b7aca3f1-2b6a-4f79-a763-6d04cab37086	丈野 仁寿	九州大学　大学院	工学府	水素エネルギーシステム専攻	\N	male	\N	\N	丈野	仁寿	じょうの	ひとし	08085060419	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	8190367	\N	\N	\N	\N	福岡県	f	{}	\N	{}	{}
fdd6f9fc-b9c5-497a-8846-3f9aba3db48e	5b67a8dc-c366-4d19-a354-16a09e18082d	小倉 一真	専修大学	経営学部	ビジネスデザイン学科	\N	male	\N	\N	小倉	一真	おぐら	かずま	07069741020	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1530052	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
56e75be3-9841-4ad1-ab32-b129727bb17e	7fb99469-a71a-4289-a2fc-f66751f0757c	清水 駿太	東京科学大学	情報理工学院	情報工学系 知能情報コース	\N	male	\N	\N	清水	駿太	しみず	はやた	08089149279	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	2110063	\N	\N	\N	\N	神奈川県	f	{}	\N	{}	{}
8d6657eb-70b7-429c-b4a7-5a5f6f6e79ed	a3c8d54c-81a7-4307-a360-491cf8a86762	大山 嵐鵬	慶應義塾大学	経済研究科	経済学科	\N	male	\N	\N	大山	嵐鵬	おおやま	らんぽん	08033024088	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1360074	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
828edccb-b2a8-41b4-aab5-973994b38f4d	c0285637-3530-42c0-9146-d99427363022	成尾 拓輝	大阪市立大学	経済学部	経済学科	\N	male	\N	\N	成尾	拓輝	なるお	ひろき	07045584764	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	6510093	\N	\N	\N	\N	兵庫県	f	{}	\N	{}	{}
ac60b073-2b36-419b-9fcb-666e3a5ac7b9	29d837f5-742c-4c57-a26d-987df08d0393	足立 匠	中央大学	理工学部	ビジネスデータサイエンス学科	\N	male	\N	\N	足立	匠	あだち	たくみ	08056433973	\N	\N	2026-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	2780028	\N	\N	\N	\N	千葉県	f	{}	\N	{}	{}
02b9b033-a6fd-4210-ab53-be47951f8410	c159cfe9-0fcb-4f4a-a698-391b6e4ffde9	山下 熙莉杏	電気通信大学	情報理工学域	基盤理工学専攻	\N	male	\N	\N	山下	熙莉杏	ヤマシタ	キリア	09056154434	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1820034	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
10a46cf1-3875-4ff9-80d4-71457ffa329a	e689a0bc-d4a9-43c0-9339-74ad8f704979	石川 真広	早稲田大学	社会科学部	社会科学科	\N	male	\N	\N	石川	真広	いしかわ	まひろ	08084228561	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1460085	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
23eb13b0-1716-4146-be74-dc8667483d08	130eb84f-00eb-48e1-bce3-ea8a3c1078f5	杉本 陽紀	早稲田大学大学院	基幹理工学研究科	情報理工・情報通信専攻	\N	male	\N	\N	杉本	陽紀	すぎもと	はるき	07039775689	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	2740825	\N	\N	\N	\N	千葉県	f	{}	\N	{}	{}
2c1167f0-b7d0-44e1-a47e-9693bfa84631	8bc3ab83-0d67-4c0b-ba14-9667dbb823da	奥田 星愛	成蹊大学	法学部	政治学科	\N	female	\N	\N	奥田	星愛	おくだ	せいら	07017908878	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1680064	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
7ebd6c3a-ce2a-442c-9fc1-d4b2c6097041	b15e9a9f-d14b-4eed-aa75-3978730ced74	小幡 友奈	慶應義塾大学	商学部	商学科	\N	female	\N	\N	小幡	友奈	おばた	ゆうな	08079450794	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	3020132	\N	\N	\N	\N	茨城県	f	{}	\N	{}	{}
2a4c4b5c-f38c-4bbc-b91c-c3fe88ee9dc5	87a98988-e408-49f7-8556-c4426b6074d2	渡辺 真桜	法政大学	経営学部	経営学科	\N	female	\N	\N	渡辺	真桜	わたなべ	まお	07037655247	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	2610013	\N	\N	\N	\N	千葉県	f	{}	\N	{}	{}
8778f160-6335-4f94-ac3b-c38d202b32c9	df191eb5-9995-4538-8172-c714b79d8ea7	増田 一樹	早稲田大学	基幹理工学部	応用数理学科	\N	male	\N	\N	増田	一樹	ますた	いっき	08035733880	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	2520206	\N	\N	\N	\N	神奈川県	f	{}	\N	{}	{}
7b7c264e-b7d2-4f3f-8955-e8ebcd484fc2	c181545f-5b9a-4295-8213-52afc1cf57a2	高橋 侑汰	慶應義塾大学	経済学部	経済学科	\N	male	\N	\N	高橋	侑汰	たかはし	ゆうた	09068495331	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	2110025	\N	\N	\N	\N	神奈川県	f	{}	\N	{}	{}
e2138515-00be-4189-8f7e-aea9ff8896ce	3f73fb8f-02ed-470c-b884-6c629dc46d88	藤原 大空	\N	\N	\N	\N	male	\N	\N	藤原	大空	ふじわら	そら	07041279216	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	2770852	\N	\N	\N	\N	千葉県	f	{}	\N	{}	{}
55a10868-59d8-4a68-8953-ef58208ca220	4a045c2c-ca58-457b-b2bc-6ba420353e27	柴崎 凌	早稲田大学	教育学部	教育学科	\N	male	\N	\N	柴崎	凌	しばざき	りょう	09057822760	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	2130032	\N	\N	\N	\N	神奈川県	f	{}	\N	{}	{}
09f8d370-e758-4d0e-911c-0fa3510cf01e	63f39513-e796-4a7e-956f-c1fcc0b887d0	片山 想大	京都大学	農学部	食料・環境経済学科	\N	male	\N	\N	片山	想大	かたやま	そうた	09042939040	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	6020901	\N	\N	\N	\N	京都府	f	{}	\N	{}	{}
404e1b66-50c1-45e2-b585-2b48542549e8	9bc4eecc-63a7-44e2-b8d1-39b2f40b2e6e	山賀 ルカ	東京大学	経済学部	経済学科	\N	male	\N	\N	山賀	ルカ	やまが	るか	08098853930	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	2460008	\N	\N	\N	\N	神奈川県	f	{}	\N	{}	{}
2ee1cccd-c252-4f61-a0c4-2bc4dd716b46	0e4d7623-05e3-4c32-9ec1-d26e75c80f10	宮内 洸聡	法政大学	経済学部	経済学科	\N	male	\N	\N	宮内	洸聡	みやうち	たけと	09043561160	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1680074	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
43f68209-f10d-4e02-99d1-4bd08df7136a	50176ed3-b857-4136-8959-536dc558dc3b	福嶋 紗羅	慶應義塾大学	経済学部	経済学科	\N	female	\N	\N	福嶋	紗羅	ふくしま	さら	08087205625	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1120002	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
60b53d56-a7cd-4687-921f-0289e30afef4	e77ac83a-cec9-4db1-aee8-e7bcf2ad905f	姥 京寸介	早稲田	教育	理学科	\N	male	\N	\N	姥	京寸介	うば	きょうすけ	08026538946	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1120014	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
47a8892e-581a-42bd-85df-c55911f527d9	7e6297ff-8df7-43ba-95d0-7da57c86cc45	加藤 夕貴	筑波大学大学院	理工情報生命学術院	生命地球科学研究群	\N	male	\N	\N	加藤	夕貴	かとう	ゆうき	09096436672	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	3050005	\N	\N	\N	\N	茨城県	f	{}	\N	{}	{}
b7f65504-cca8-458a-abfa-c9436d728159	18964171-20f4-4010-a11d-8634b7470b44	加藤 夕貴	筑波大学大学院	生命地球科学研究群	生物資源科学学位プログラム	\N	female	\N	\N	加藤	夕貴	かとう	ゆうき	07045637233	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	3050005	\N	\N	\N	\N	茨城県	f	{}	\N	{}	{}
337df01d-7b63-4fcc-942a-a6013013a4b8	560c203f-ef2b-415b-8cfc-e54e9e17c32b	川原 宇広	中央大学	理工学部	物理学科	\N	male	\N	\N	川原	宇広	かわはら	たかひろ	08036972326	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	2510004	\N	\N	\N	\N	神奈川県	f	{}	\N	{}	{}
c198512f-76f9-41ae-bb7c-bca2f1d125fd	4fdcb7b5-f75d-4a62-9824-804c3ad01900	古澤 魁音	\N	\N	\N	\N	male	\N	\N	古澤	魁音	ふるさわ	かいと	08095721496	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
99208b1e-d676-4c4c-80d4-3a39b9e82a85	782f9303-e208-478a-9ea0-8a4e23283946	日向 祥太	明治大学	商学部	商学科	\N	male	\N	\N	日向	祥太	ヒナタ	ショウタ	09092385617	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1940032	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
fa8ddc8e-a3a6-4407-9257-da58ea25675b	09479e40-e913-42a1-a33a-e36061145bd8	遠藤 悠太	慶應義塾大学	総合政策学部	総合政策学科	\N	male	\N	\N	遠藤	悠太	えんどう	ゆうた	07038432042	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1560056	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
de3a6b6d-2db7-40fb-957f-aa1aa3f4f791	903ddcb8-8417-4c6a-9ebb-e69677be5b22	宮内 洸聡	法政大学	経済学部	経済学科	\N	male	\N	\N	宮内	洸聡	みやうち	たけと	09043561160	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1680074	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
62800db8-44d2-4354-b6c8-cd81a9d62ecb	c2d80043-6478-41fc-ac31-a24344b59d63	宮岡 大晟	東京理科大学大学院	工学研究科	電気工学専攻	\N	male	\N	\N	宮岡	大晟	みやおか	たいせい	08076983245	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	2150011	\N	\N	\N	\N	神奈川県	f	{}	\N	{}	{}
7f306488-67b5-4bfc-80e0-816f511deb93	891d3d50-72e2-48d5-b5d0-31d24a415c0d	後藤 良大	法政大学	法学部	法律学科	\N	male	\N	\N	後藤	良大	ごとう	りょうだい	08043261533	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1350021	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
cd6c0039-fd6f-438f-8ee6-224d81ff8f4e	bc43774d-d690-4b57-9dd0-550403d571e2	上治 正太郎	慶応義塾大学大学院	理工学研究科	開放環境科学専攻	\N	male	\N	\N	上治	正太郎	うえじ	しょうたろう	09080278122	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1320023	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
564e5e71-798c-49c7-8690-a460ade47581	4073fe68-5113-4496-8323-397f27e03aa9	鈴木 慶	東京大学	経済学部	経営学科	\N	male	\N	\N	鈴木	慶	すずき	けい	09063861109	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	2420016	\N	\N	\N	\N	神奈川県	f	{}	\N	{}	{}
5a52be2a-1bf9-436f-bd08-ff889a50a4d1	c7c3d97a-de1d-4b61-aa26-c7422cc827d0	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	\N	\N	\N	\N	\N	\N	f	{}	\N	{}	{}
355ca967-ac51-4082-9c92-a32c06e08276	364a8230-429b-4b03-982f-3e59faaa2b8c	池谷 元暉	同志社大学	商学部	商学科	\N	male	\N	\N	池谷	元暉	いけたに	もとき	04256524348	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	4928137	\N	\N	\N	\N	愛知県	f	{}	\N	{}	{}
2585b871-3829-48ee-ac95-c08d3ba11c2f	25d9e57a-a501-43c1-8520-886b942dd637	佐々木 健人	早稲田大学	社会科学部	社会科学科	\N	male	\N	\N	佐々木	健人	ささき	けんと	07085213941	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1120012	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
93574506-1419-440a-98fc-6b84759b1084	1653c432-62fe-4224-a844-c0d7f20c42e0	鹿子 晶太郎	青山学院大学	社会情報学部	社会情報学科	\N	male	\N	\N	鹿子	晶太郎	かのこ	しょうたろう	08040305041	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	2520206	\N	\N	\N	\N	神奈川県	f	{}	\N	{}	{}
aa657122-548d-4980-ba92-e07178bd63b2	bed2789b-72ef-4471-98a3-688de638b21c	鹿子 晶太郎	青山学院大学	社会情報学部	社会情報学科	\N	male	\N	\N	鹿子	晶太郎	かのこ	しょうたろう	08040305041	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	2520206	\N	\N	\N	\N	神奈川県	f	{}	\N	{}	{}
efa31c33-536f-4a25-bed1-dca6f755bd1e	0676175c-5379-407a-ac82-016a5c7a1f63	柳岡 優作	芝浦工業大学	工学部	情報工学科	\N	male	\N	\N	柳岡	優作	やなぎおか	ゆうさく	07075199766	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1730027	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
b6e5c39a-e23c-400c-a4da-f9833bbac0d7	adc14c9f-3c89-43f3-a9e0-b33d88318fad	関口 黎	東京科学大学	工学院	機械系機械コース	\N	male	\N	\N	関口	黎	せきぐち	れい	08095867750	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	3010816	\N	\N	\N	\N	茨城県	f	{}	\N	{}	{}
4d3f0910-cb95-4922-a834-2aa2838d0890	9fd377c1-928f-4b84-80c6-a1744c41f836	松村 和磨	慶應義塾大学	法学部	政治学科	\N	male	\N	\N	松村	和磨	マツムラ	カズマ	08085508845	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	2110025	\N	\N	\N	\N	神奈川県	f	{}	\N	{}	{}
938e29dd-a829-4aad-99f3-528f52b274d2	b9c8cc81-1603-4b24-b30e-70b8870acc18	大谷 直之	早稲田大学	教育学部	教育学科	\N	male	\N	\N	大谷	直之	おおや	なおゆき	07041182190	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1640011	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
5be6546f-a895-4193-82ea-673adc623197	bda9ee47-244c-4b69-a07f-3d67da29e727	池上 亮平	近畿大学	経営学部	商学科	\N	male	\N	\N	池上	亮平	いけがみ	りょうへい	08038018921	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	6570817	\N	\N	\N	\N	兵庫県	f	{}	\N	{}	{}
362c0c53-25b4-43c0-b1b6-b54c7fbd970b	8e9f4b24-d62c-4a28-a414-12bef4dc3cfe	藤山 菫	早稲田大学	基幹理工学部	応用数理学科	\N	female	\N	\N	藤山	菫	ふじやま	すみれ	08088463505	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	2720102	\N	\N	\N	\N	千葉県	f	{}	\N	{}	{}
b18e0718-e293-4603-bb86-05050da3f838	a21586b1-3467-47eb-8733-85448f38db4b	水本 結奈	ケイオウギジュク	法学部	法律学科	\N	female	\N	\N	水本	結奈	みずもと	ゆいな	09057334713	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	2110068	\N	\N	\N	\N	神奈川県	f	{}	\N	{}	{}
e32c23b9-2088-401e-81b6-97ebde819433	c5b9c9d1-6844-4612-a7e7-14bd1c970f3c	宮井 明日香	青山学院大学	コミュニティ人間科学部	コミュニティ人間科学科	\N	female	\N	\N	宮井	明日香	みやい	あすか	08053288070	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1940003	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
cf615284-6330-4b6d-bd4f-c467b98eeb68	5c7e522d-d276-4775-a57d-bf9cf1957cd8	宮井 明日香	青山学院大学	コミュニティ人間科学部	コミュニティ人間科学科	\N	female	\N	\N	宮井	明日香	みやい	あすか	08053288070	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1940003	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
1cfaf9dd-a0cd-4a45-9794-96539357bc9e	f0b8d41c-31f0-450f-b7d3-d461f7ade25b	堀田 爽	慶應義塾大学	商学部	商学科	\N	male	\N	\N	堀田	爽	ほった	そう	07042889511	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	2400046	\N	\N	\N	\N	神奈川県	f	{}	\N	{}	{}
1335801d-0fa6-4e5f-a6b8-8142d192ae8a	58e4837d-b3d1-4b8f-8889-b08bcd71146b	三窪 大智	東京大学大学院	情報理工学院	電子情報学専攻	\N	male	\N	\N	三窪	大智	みくぼ	だいち	09038220747	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1550032	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
61a16f87-ca4c-47c9-ac99-dfa835793129	47e8d084-ebf1-4b7c-aa46-5c605ff48729	甲斐 渚	一橋大学	社会学部	社会学科	\N	female	\N	\N	甲斐	渚	かい	なぎさ	09043781012	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	2240024	\N	\N	\N	\N	神奈川県	f	{}	\N	{}	{}
138baea0-574a-4541-a5e6-f6ed2c08524a	638b5323-1b76-415f-9ccc-458e37f84e59	本多 蓮	千葉大学	工学部	総合工学科	\N	male	\N	\N	本多	蓮	ほんだ	れん	07022307767	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	2630015	\N	\N	\N	\N	千葉県	f	{}	\N	{}	{}
a5d6be29-e1dd-45e1-b825-d33ff9096a72	226830f3-7287-4ee0-8291-38992a60ffc5	劉 佳輝	慶應義塾大学	商学部	商学科	\N	male	\N	\N	劉	佳輝	りゅう	よしき	07031210401	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1430015	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
5a2eb8cd-1e6c-4714-bc52-29fb519d8a0f	807d3561-f113-4f25-9fa8-30b259822ea5	水野 莉佳	慶應義塾大学	経済学部	経済学科	\N	female	\N	\N	水野	莉佳	みずの	りか	07085005969	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	2850846	\N	\N	\N	\N	千葉県	f	{}	\N	{}	{}
9fbbc9b3-159b-4fcd-a5a4-c1af19237c53	885c1474-1363-489a-b935-32e57598c88a	青木 萌々音	慶應義塾大学	商学部	商学科	\N	female	\N	\N	青木	萌々音	あおき	ももね	09079929845	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	1420062	\N	\N	\N	\N	東京都	f	{}	\N	{}	{}
b6bffffd-f53a-4d9d-82a7-ead18cbc8247	9e13482b-e897-40ba-bb2f-a6d1a337e416	渡辺 圭哉	早稲田大学	政治経済学部	政治学科	\N	male	\N	\N	渡辺	圭哉	わたなべ	けいや	09060252267	\N	\N	2027-03-31	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	{}	\N	\N	\N	{}	\N	2025-06-25 01:19:43.674669+00	アクティブ	f	{}	\N	[]	f	2270054	\N	\N	\N	\N	神奈川県	f	{}	\N	{}	{}
\.


--
-- Data for Name: student_qualifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.student_qualifications (student_id, qualification_id) FROM stdin;
\.


--
-- Data for Name: student_skills; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.student_skills (student_id, skill_id) FROM stdin;
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_roles (user_id, role, created_at, updated_at) FROM stdin;
697303d7-8553-4b47-88fb-20805e0cc3d4	company_admin	2025-06-18 05:56:29.656391+00	2025-06-18 05:56:29.656391+00
039527ca-2a5a-4e10-8ebb-cf63aca72d07	student	2025-06-18 06:08:22.604851+00	2025-06-18 06:08:22.604851+00
53b9321a-eda0-4f49-8826-cf3e93af45a0	student	2025-06-19 11:55:34.955958+00	2025-06-19 11:55:34.955958+00
09e3242d-bf28-4184-bacc-65ccdb0310da	company_admin	2025-06-23 06:26:17.618853+00	2025-06-23 06:26:17.618853+00
aada0a75-9471-4caf-9116-3b6fed88b6d7	admin	2025-07-02 07:38:38.398038+00	2025-07-02 07:38:38.398038+00
b4c957e5-5e57-430a-b052-474768a85be5	student	2025-06-25 00:16:51.584063+00	2025-06-25 00:16:51.584063+00
b6fffe9c-49f4-400f-a200-d0fdce25d92b	student	2025-06-25 00:16:52.458905+00	2025-06-25 00:16:52.458905+00
352a5fc6-4321-4a59-a523-6a609ef330f3	student	2025-06-25 00:16:53.765389+00	2025-06-25 00:16:53.765389+00
51dcf97b-a054-43f2-897b-c7449fd64ee7	student	2025-06-25 00:16:54.860757+00	2025-06-25 00:16:54.860757+00
af852cf8-ab15-4de0-88b7-8e286307a801	student	2025-06-25 00:16:56.021336+00	2025-06-25 00:16:56.021336+00
3f53f625-0295-463a-b0d6-d3cb9e485dd5	student	2025-06-25 00:16:57.12383+00	2025-06-25 00:16:57.12383+00
c7226da5-694b-4889-a825-3e3127418736	student	2025-06-25 00:18:30.830288+00	2025-06-25 00:18:30.830288+00
fc1c6f07-17ab-47f4-b46d-51cad7944fd1	student	2025-06-25 00:22:34.510396+00	2025-06-25 00:22:34.510396+00
705aa51b-9462-4ba1-8f9a-791d7a981958	student	2025-06-25 00:23:00.083881+00	2025-06-25 00:23:00.083881+00
2346d7c7-1958-40ec-bdc7-ed5b292e893d	student	2025-06-25 00:24:05.573274+00	2025-06-25 00:24:05.573274+00
aab45522-ea85-47ee-a4d7-c2afa0aca3ba	student	2025-06-25 00:25:12.519675+00	2025-06-25 00:25:12.519675+00
31806d0d-9ba9-45b1-939c-7b9f19f80f43	student	2025-06-25 00:25:12.920518+00	2025-06-25 00:25:12.920518+00
da8b4683-8dcb-4780-8875-6d04734cedd0	student	2025-06-25 00:25:14.329195+00	2025-06-25 00:25:14.329195+00
c6762934-7f79-4d5c-95fd-a23a7584c842	student	2025-06-25 00:25:15.4254+00	2025-06-25 00:25:15.4254+00
c9742577-2e88-4338-b749-d3c416db30c5	student	2025-06-25 00:25:16.532222+00	2025-06-25 00:25:16.532222+00
3ed44c78-7891-4717-b1c3-f61dae38e55d	student	2025-06-25 00:25:17.620191+00	2025-06-25 00:25:17.620191+00
26544502-3e9d-4566-9822-ccfe4fea372e	student	2025-06-25 00:25:18.730996+00	2025-06-25 00:25:18.730996+00
3bad9555-391c-4ebe-914a-590da321d53e	student	2025-06-25 00:25:19.834652+00	2025-06-25 00:25:19.834652+00
d8f1aea9-a2fc-4dd4-a46e-a296c6bef69a	student	2025-06-25 00:25:20.95457+00	2025-06-25 00:25:20.95457+00
3f66b76a-eaa6-4b3f-81a9-abe4abe0eb0a	student	2025-06-25 00:25:22.05171+00	2025-06-25 00:25:22.05171+00
0d60a7c2-894b-4c93-ac89-f9085b5ad39d	student	2025-06-25 00:25:23.174884+00	2025-06-25 00:25:23.174884+00
c2944b5b-d323-4517-8432-8b6c324b8c7e	student	2025-06-25 00:25:24.331943+00	2025-06-25 00:25:24.331943+00
d18783f4-a26e-4aac-8b2d-153d7f95a464	student	2025-06-25 00:25:25.767106+00	2025-06-25 00:25:25.767106+00
ff0ee7ba-94b4-4f0c-9e85-6d601d65e8a5	student	2025-06-25 00:25:26.851683+00	2025-06-25 00:25:26.851683+00
59da027b-7357-4904-9d5f-96f9a91c3b1c	student	2025-06-25 00:25:27.908462+00	2025-06-25 00:25:27.908462+00
0000fdc6-62da-4c72-a59b-7fe9901de4b5	admin\n	2025-06-17 05:06:37.145462+00	2025-06-17 05:06:37.145462+00
167c731f-dafd-4538-8651-6969a4dd89d2	student	2025-06-25 00:25:29.007156+00	2025-06-25 00:25:29.007156+00
9b607192-b5df-43a5-9522-219b02b26240	student	2025-06-25 00:25:30.141815+00	2025-06-25 00:25:30.141815+00
135b9fed-0f3e-413e-b0c8-cda8c278d3dd	student	2025-06-25 00:25:31.225359+00	2025-06-25 00:25:31.225359+00
46b62c11-f0ef-4c3c-a7b9-68c10f1fe53c	student	2025-06-25 00:25:32.324903+00	2025-06-25 00:25:32.324903+00
c0ef5298-17dc-47e4-adab-0c862f23283d	student	2025-06-25 00:25:33.396476+00	2025-06-25 00:25:33.396476+00
97c9522c-a69a-4692-8d71-1d05960a7b34	student	2025-06-25 00:25:42.318066+00	2025-06-25 00:25:42.318066+00
f5763843-120e-4aea-9e8a-b3deeab22c80	admin	2025-06-18 01:36:31.3922+00	2025-06-18 01:36:31.3922+00
036c17b8-4000-41df-b00f-d00ab6efde39	student	2025-06-18 02:13:11.419963+00	2025-06-18 02:13:11.419963+00
0f4a9c06-1625-4164-b7fa-8736cf9ba0ee	student	2025-06-25 00:25:43.396227+00	2025-06-25 00:25:43.396227+00
a7dfacbb-b547-4744-aec2-ad2eab969769	student	2025-06-25 00:25:44.475044+00	2025-06-25 00:25:44.475044+00
e503c62c-d1d9-4fbb-815c-10cd47cccb15	student	2025-06-25 00:25:45.608818+00	2025-06-25 00:25:45.608818+00
ca4e39ba-5615-4d0c-9bdc-0bccfe129edf	student	2025-06-25 00:25:46.74652+00	2025-06-25 00:25:46.74652+00
2a242b76-5af3-4498-8296-cf330d67db70	student	2025-06-25 00:25:47.892549+00	2025-06-25 00:25:47.892549+00
b7b5e5bf-36b3-4ab4-89d6-fdc887fe38c9	student	2025-06-25 00:25:49.008489+00	2025-06-25 00:25:49.008489+00
9df85d0f-e29d-4595-b99d-bcd49d35bdd8	student	2025-06-25 00:25:50.101784+00	2025-06-25 00:25:50.101784+00
5d9f9a06-8efa-4930-bf2d-35149922bf18	student	2025-06-25 00:25:51.238054+00	2025-06-25 00:25:51.238054+00
52a1c9f5-113a-44f7-97ca-3239f17bea7b	student	2025-06-25 00:25:52.317317+00	2025-06-25 00:25:52.317317+00
dadb589c-c2b9-4afb-86f6-1c1cb675ba26	student	2025-06-25 00:25:53.441416+00	2025-06-25 00:25:53.441416+00
bca063d5-97a4-4f25-b1a8-2126ee0ee0b7	student	2025-06-25 00:25:54.533348+00	2025-06-25 00:25:54.533348+00
cf61cc6a-d519-453e-90fa-11a0687178e1	student	2025-06-25 00:25:55.619704+00	2025-06-25 00:25:55.619704+00
dff2614b-fb1d-4e77-a61c-435bdd58b232	student	2025-06-25 00:25:56.802884+00	2025-06-25 00:25:56.802884+00
07e2ba43-465e-463e-845c-62f9bf1632b2	student	2025-06-25 00:25:57.936548+00	2025-06-25 00:25:57.936548+00
959f9f6b-c2cc-473a-b3cf-e12569a36414	student	2025-06-25 00:25:59.039037+00	2025-06-25 00:25:59.039037+00
035d7e6c-2a4b-4853-a2af-6f87b19e15cc	student	2025-06-25 00:26:00.135418+00	2025-06-25 00:26:00.135418+00
e386dc5e-dfe3-4b97-bd16-9842903e194b	student	2025-06-25 00:26:01.3162+00	2025-06-25 00:26:01.3162+00
426b5d2f-0775-4b45-973b-e3b949b0e02a	student	2025-06-25 00:26:02.394654+00	2025-06-25 00:26:02.394654+00
31044927-8d62-4d07-8b66-0e3d7d753053	student	2025-06-25 00:26:03.473111+00	2025-06-25 00:26:03.473111+00
43b05057-94c5-490e-ba94-009330d04c50	student	2025-06-25 00:26:04.557347+00	2025-06-25 00:26:04.557347+00
567e6500-5479-4868-9c45-cb2ff864d599	student	2025-06-25 00:26:05.676802+00	2025-06-25 00:26:05.676802+00
9fc033ff-274c-4d95-8749-7a8b83cd18f3	student	2025-06-25 00:26:06.834887+00	2025-06-25 00:26:06.834887+00
e97f13bd-f43d-4ab2-bfa3-98416d8e856b	student	2025-06-25 00:26:07.975857+00	2025-06-25 00:26:07.975857+00
781080c7-8d71-4d8f-b804-eab03798f2e2	student	2025-06-25 00:26:09.065469+00	2025-06-25 00:26:09.065469+00
f3975bb1-e73d-440a-970d-ee320dcbdad3	student	2025-06-25 00:26:10.161843+00	2025-06-25 00:26:10.161843+00
efcd4758-2874-4774-966d-4e29094a0ed1	student	2025-06-25 00:26:11.233775+00	2025-06-25 00:26:11.233775+00
6a7cbcb6-d3fe-4aff-9941-0b306314814d	student	2025-06-25 00:26:12.290691+00	2025-06-25 00:26:12.290691+00
311a9692-d10b-43b4-96af-43bab8fff8f6	student	2025-06-25 00:26:13.392596+00	2025-06-25 00:26:13.392596+00
f9b08ad4-7898-41ec-859c-37fd5fe3bca4	student	2025-06-25 00:26:14.492067+00	2025-06-25 00:26:14.492067+00
9b0d787f-1b4c-4352-b8c0-0e5193ca28c6	student	2025-06-25 00:26:15.606007+00	2025-06-25 00:26:15.606007+00
1e597d02-3e58-4c56-b55e-d78f71e4c702	student	2025-06-25 00:26:17.391858+00	2025-06-25 00:26:17.391858+00
b7aca3f1-2b6a-4f79-a763-6d04cab37086	student	2025-06-25 00:26:18.487225+00	2025-06-25 00:26:18.487225+00
5b67a8dc-c366-4d19-a354-16a09e18082d	student	2025-06-25 00:26:19.56983+00	2025-06-25 00:26:19.56983+00
7fb99469-a71a-4289-a2fc-f66751f0757c	student	2025-06-25 00:26:20.653125+00	2025-06-25 00:26:20.653125+00
a3c8d54c-81a7-4307-a360-491cf8a86762	student	2025-06-25 00:26:21.717051+00	2025-06-25 00:26:21.717051+00
c0285637-3530-42c0-9146-d99427363022	student	2025-06-25 00:26:22.799426+00	2025-06-25 00:26:22.799426+00
29d837f5-742c-4c57-a26d-987df08d0393	student	2025-06-25 00:26:23.948858+00	2025-06-25 00:26:23.948858+00
c159cfe9-0fcb-4f4a-a698-391b6e4ffde9	student	2025-06-25 00:26:25.064088+00	2025-06-25 00:26:25.064088+00
e689a0bc-d4a9-43c0-9339-74ad8f704979	student	2025-06-25 00:26:26.149623+00	2025-06-25 00:26:26.149623+00
130eb84f-00eb-48e1-bce3-ea8a3c1078f5	student	2025-06-25 00:26:27.316962+00	2025-06-25 00:26:27.316962+00
8bc3ab83-0d67-4c0b-ba14-9667dbb823da	student	2025-06-25 00:26:28.418297+00	2025-06-25 00:26:28.418297+00
b15e9a9f-d14b-4eed-aa75-3978730ced74	student	2025-06-25 00:26:29.547261+00	2025-06-25 00:26:29.547261+00
87a98988-e408-49f7-8556-c4426b6074d2	student	2025-06-25 00:26:30.614147+00	2025-06-25 00:26:30.614147+00
df191eb5-9995-4538-8172-c714b79d8ea7	student	2025-06-25 00:26:31.730502+00	2025-06-25 00:26:31.730502+00
c181545f-5b9a-4295-8213-52afc1cf57a2	student	2025-06-25 00:26:32.817475+00	2025-06-25 00:26:32.817475+00
3f73fb8f-02ed-470c-b884-6c629dc46d88	student	2025-06-25 00:26:33.973074+00	2025-06-25 00:26:33.973074+00
4a045c2c-ca58-457b-b2bc-6ba420353e27	student	2025-06-25 00:26:35.049844+00	2025-06-25 00:26:35.049844+00
63f39513-e796-4a7e-956f-c1fcc0b887d0	student	2025-06-25 00:26:36.114808+00	2025-06-25 00:26:36.114808+00
9bc4eecc-63a7-44e2-b8d1-39b2f40b2e6e	student	2025-06-25 00:26:37.251494+00	2025-06-25 00:26:37.251494+00
0e4d7623-05e3-4c32-9ec1-d26e75c80f10	student	2025-06-25 00:26:38.369954+00	2025-06-25 00:26:38.369954+00
50176ed3-b857-4136-8959-536dc558dc3b	student	2025-06-25 00:26:39.461789+00	2025-06-25 00:26:39.461789+00
e77ac83a-cec9-4db1-aee8-e7bcf2ad905f	student	2025-06-25 00:26:40.534963+00	2025-06-25 00:26:40.534963+00
7e6297ff-8df7-43ba-95d0-7da57c86cc45	student	2025-06-25 00:26:41.639126+00	2025-06-25 00:26:41.639126+00
18964171-20f4-4010-a11d-8634b7470b44	student	2025-06-25 00:26:41.825754+00	2025-06-25 00:26:41.825754+00
560c203f-ef2b-415b-8cfc-e54e9e17c32b	student	2025-06-25 00:26:42.037869+00	2025-06-25 00:26:42.037869+00
4fdcb7b5-f75d-4a62-9824-804c3ad01900	student	2025-06-25 00:26:42.26473+00	2025-06-25 00:26:42.26473+00
782f9303-e208-478a-9ea0-8a4e23283946	student	2025-06-25 00:26:42.457537+00	2025-06-25 00:26:42.457537+00
09479e40-e913-42a1-a33a-e36061145bd8	student	2025-06-25 00:26:42.649968+00	2025-06-25 00:26:42.649968+00
903ddcb8-8417-4c6a-9ebb-e69677be5b22	student	2025-06-25 00:26:42.883396+00	2025-06-25 00:26:42.883396+00
c2d80043-6478-41fc-ac31-a24344b59d63	student	2025-06-25 00:26:43.090245+00	2025-06-25 00:26:43.090245+00
891d3d50-72e2-48d5-b5d0-31d24a415c0d	student	2025-06-25 00:26:43.274978+00	2025-06-25 00:26:43.274978+00
bc43774d-d690-4b57-9dd0-550403d571e2	student	2025-06-25 00:26:43.467335+00	2025-06-25 00:26:43.467335+00
4073fe68-5113-4496-8323-397f27e03aa9	student	2025-06-25 00:26:43.654265+00	2025-06-25 00:26:43.654265+00
c7c3d97a-de1d-4b61-aa26-c7422cc827d0	student	2025-06-25 00:26:43.856279+00	2025-06-25 00:26:43.856279+00
364a8230-429b-4b03-982f-3e59faaa2b8c	student	2025-06-25 00:26:44.054466+00	2025-06-25 00:26:44.054466+00
25d9e57a-a501-43c1-8520-886b942dd637	student	2025-06-25 00:26:44.335097+00	2025-06-25 00:26:44.335097+00
1653c432-62fe-4224-a844-c0d7f20c42e0	student	2025-06-25 00:26:44.52487+00	2025-06-25 00:26:44.52487+00
bed2789b-72ef-4471-98a3-688de638b21c	student	2025-06-25 00:26:44.729021+00	2025-06-25 00:26:44.729021+00
0676175c-5379-407a-ac82-016a5c7a1f63	student	2025-06-25 00:26:44.9428+00	2025-06-25 00:26:44.9428+00
adc14c9f-3c89-43f3-a9e0-b33d88318fad	student	2025-06-25 00:26:45.152923+00	2025-06-25 00:26:45.152923+00
9fd377c1-928f-4b84-80c6-a1744c41f836	student	2025-06-25 00:26:45.342641+00	2025-06-25 00:26:45.342641+00
b9c8cc81-1603-4b24-b30e-70b8870acc18	student	2025-06-25 00:26:45.542149+00	2025-06-25 00:26:45.542149+00
bda9ee47-244c-4b69-a07f-3d67da29e727	student	2025-06-25 00:26:45.831676+00	2025-06-25 00:26:45.831676+00
8e9f4b24-d62c-4a28-a414-12bef4dc3cfe	student	2025-06-25 00:26:46.036343+00	2025-06-25 00:26:46.036343+00
a21586b1-3467-47eb-8733-85448f38db4b	student	2025-06-25 00:26:46.233614+00	2025-06-25 00:26:46.233614+00
c5b9c9d1-6844-4612-a7e7-14bd1c970f3c	student	2025-06-25 00:26:46.417625+00	2025-06-25 00:26:46.417625+00
5c7e522d-d276-4775-a57d-bf9cf1957cd8	student	2025-06-25 00:26:46.613079+00	2025-06-25 00:26:46.613079+00
f0b8d41c-31f0-450f-b7d3-d461f7ade25b	student	2025-06-25 00:26:47.189966+00	2025-06-25 00:26:47.189966+00
58e4837d-b3d1-4b8f-8889-b08bcd71146b	student	2025-06-25 00:26:47.387051+00	2025-06-25 00:26:47.387051+00
47e8d084-ebf1-4b7c-aa46-5c605ff48729	student	2025-06-25 00:26:47.604845+00	2025-06-25 00:26:47.604845+00
638b5323-1b76-415f-9ccc-458e37f84e59	student	2025-06-25 00:26:47.831051+00	2025-06-25 00:26:47.831051+00
226830f3-7287-4ee0-8291-38992a60ffc5	student	2025-06-25 00:26:48.030876+00	2025-06-25 00:26:48.030876+00
807d3561-f113-4f25-9fa8-30b259822ea5	student	2025-06-25 00:26:48.227075+00	2025-06-25 00:26:48.227075+00
885c1474-1363-489a-b935-32e57598c88a	student	2025-06-25 00:26:48.430706+00	2025-06-25 00:26:48.430706+00
9e13482b-e897-40ba-bb2f-a6d1a337e416	student	2025-06-25 00:26:48.616588+00	2025-06-25 00:26:48.616588+00
a2400135-23a4-4140-a7ce-1055a3ec217f	admin	2025-06-28 05:20:00.353875+00	2025-06-28 05:20:00.353875+00
76907e4c-ee31-4378-bc6c-c526130a3cb3	student	2025-06-28 05:38:42.80788+00	2025-06-28 05:38:42.80788+00
60a03c48-4cfd-4d3c-8ebf-57e90ace9b7b	company_admin	2025-06-30 05:45:48.899025+00	2025-06-30 05:45:48.899025+00
01b5861b-bb4a-4002-be08-71db750bb24e	company_admin	2025-07-01 10:03:35.754048+00	2025-07-01 10:03:35.754048+00
0b5f7833-a5fe-4c95-883a-173ca6aa6cb0	company_admin	2025-07-01 10:04:28.763171+00	2025-07-01 10:04:28.763171+00
6dee4175-a9e5-4cc3-8089-5008d380ef9a	company_admin	2025-07-02 05:02:37.711751+00	2025-07-02 05:02:37.711751+00
1e97906e-af3c-423d-8712-4c4ad97a60e1	student	2025-07-02 05:47:36.000536+00	2025-07-02 05:47:36.000536+00
c6e093e9-bc2f-4555-9ca7-b0d9d93f0a94	company_admin	2025-07-04 05:24:43.304722+00	2025-07-04 05:24:43.304722+00
1d109812-a8ba-4a52-a2a3-23a31bf8c5a6	company_admin	2025-07-07 00:26:34.058761+00	2025-07-07 00:26:34.058761+00
a5274d3a-9a8c-47ba-8593-3d31e38dd190	company_admin	2025-07-07 07:11:36.276563+00	2025-07-07 07:11:36.276563+00
366dd4e3-d25c-4edc-8b17-5a569dc6bf9c	student	2025-06-25 09:03:36.267452+00	2025-06-25 09:03:36.267452+00
c8633a32-d94d-4946-a1a1-e734c934ed39	student	2025-06-26 14:13:43.796229+00	2025-06-26 14:13:43.796229+00
03f367cb-dc70-4619-abaa-c82140143254	company_admin	2025-06-27 00:41:33.550637+00	2025-06-27 00:41:33.550637+00
\.


--
-- Data for Name: user_signups; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_signups (id, user_id, referral_source, created_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--




--
-- Data for Name: webtest_questions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.webtest_questions (id, challenge_id, order_no, question, choice1, choice2, choice3, choice4, correct_choice) FROM stdin;
\.


--
-- Name: role_change_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.role_change_log_id_seq', 38, true);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: bizscore_questions bizscore_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bizscore_questions
    ADD CONSTRAINT bizscore_questions_pkey PRIMARY KEY (id);


--
-- Name: challenge_questions challenge_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_questions
    ADD CONSTRAINT challenge_questions_pkey PRIMARY KEY (challenge_id, question_id);


--
-- Name: challenge_sessions challenge_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_sessions
    ADD CONSTRAINT challenge_sessions_pkey PRIMARY KEY (id);


--
-- Name: challenge_submissions challenge_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_submissions
    ADD CONSTRAINT challenge_submissions_pkey PRIMARY KEY (id);


--
-- Name: challenge_submissions challenge_submissions_session_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_submissions
    ADD CONSTRAINT challenge_submissions_session_id_unique UNIQUE (session_id);


--
-- Name: challenges challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenges
    ADD CONSTRAINT challenges_pkey PRIMARY KEY (id);


--
-- Name: chat_rooms chat_rooms_company_student_job_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_company_student_job_key UNIQUE (company_id, student_id, job_id);


--
-- Name: chat_rooms chat_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: companies companies_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_user_id_unique UNIQUE (user_id);


--
-- Name: company_business_areas company_business_areas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_business_areas
    ADD CONSTRAINT company_business_areas_pkey PRIMARY KEY (company_id, ordinal);


--
-- Name: company_events company_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_events
    ADD CONSTRAINT company_events_pkey PRIMARY KEY (id);


--
-- Name: company_favorites company_favorites_company_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_favorites
    ADD CONSTRAINT company_favorites_company_id_user_id_key UNIQUE (company_id, user_id);


--
-- Name: company_favorites company_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_favorites
    ADD CONSTRAINT company_favorites_pkey PRIMARY KEY (id);


--
-- Name: company_highlights company_highlights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_highlights
    ADD CONSTRAINT company_highlights_pkey PRIMARY KEY (id);


--
-- Name: company_interviews company_interviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_interviews
    ADD CONSTRAINT company_interviews_pkey PRIMARY KEY (id);


--
-- Name: company_members company_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_members
    ADD CONSTRAINT company_members_pkey PRIMARY KEY (id);


--
-- Name: company_members company_members_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_members
    ADD CONSTRAINT company_members_unique UNIQUE (company_id, user_id);


--
-- Name: company_philosophy company_philosophy_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_philosophy
    ADD CONSTRAINT company_philosophy_pkey PRIMARY KEY (company_id, ordinal);


--
-- Name: company_positions company_positions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_positions
    ADD CONSTRAINT company_positions_pkey PRIMARY KEY (company_id, ordinal);


--
-- Name: company_recruit_info company_recruit_info_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_recruit_info
    ADD CONSTRAINT company_recruit_info_pkey PRIMARY KEY (company_id);


--
-- Name: company_reviews company_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_reviews
    ADD CONSTRAINT company_reviews_pkey PRIMARY KEY (id);


--
-- Name: event_details event_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_details
    ADD CONSTRAINT event_details_pkey PRIMARY KEY (selection_id);


--
-- Name: event_participants event_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_participants
    ADD CONSTRAINT event_participants_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: features features_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.features
    ADD CONSTRAINT features_pkey PRIMARY KEY (id);


--
-- Name: fulltime_details fulltime_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fulltime_details
    ADD CONSTRAINT fulltime_details_pkey PRIMARY KEY (job_id);


--
-- Name: internship_details internship_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internship_details
    ADD CONSTRAINT internship_details_pkey PRIMARY KEY (selection_id);


--
-- Name: job_interests job_interests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_interests
    ADD CONSTRAINT job_interests_pkey PRIMARY KEY (id);


--
-- Name: job_interests job_interests_student_id_job_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_interests
    ADD CONSTRAINT job_interests_student_id_job_id_key UNIQUE (student_id, job_id);


--
-- Name: job_tags job_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_tags
    ADD CONSTRAINT job_tags_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: media_authors media_authors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_authors
    ADD CONSTRAINT media_authors_pkey PRIMARY KEY (id);


--
-- Name: media_categories media_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_categories
    ADD CONSTRAINT media_categories_pkey PRIMARY KEY (id);


--
-- Name: media_categories media_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_categories
    ADD CONSTRAINT media_categories_slug_key UNIQUE (slug);


--
-- Name: media_posts media_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_posts
    ADD CONSTRAINT media_posts_pkey PRIMARY KEY (id);


--
-- Name: media_posts media_posts_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_posts
    ADD CONSTRAINT media_posts_slug_key UNIQUE (slug);


--
-- Name: media_posts_tags media_posts_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_posts_tags
    ADD CONSTRAINT media_posts_tags_pkey PRIMARY KEY (post_id, tag_id);


--
-- Name: media_tags media_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_tags
    ADD CONSTRAINT media_tags_pkey PRIMARY KEY (id);


--
-- Name: media_tags media_tags_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_tags
    ADD CONSTRAINT media_tags_slug_key UNIQUE (slug);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: qualifications qualifications_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qualifications
    ADD CONSTRAINT qualifications_name_key UNIQUE (name);


--
-- Name: qualifications qualifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qualifications
    ADD CONSTRAINT qualifications_pkey PRIMARY KEY (id);


--
-- Name: question_bank question_bank_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_pkey PRIMARY KEY (id);


--
-- Name: referral_codes referral_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_code_key UNIQUE (code);


--
-- Name: referral_codes referral_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_pkey PRIMARY KEY (id);


--
-- Name: referral_codes referral_codes_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_user_id_key UNIQUE (user_id);


--
-- Name: referral_uses referral_uses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_uses
    ADD CONSTRAINT referral_uses_pkey PRIMARY KEY (id);


--
-- Name: resumes resumes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resumes
    ADD CONSTRAINT resumes_pkey PRIMARY KEY (id);


--
-- Name: resumes resumes_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resumes
    ADD CONSTRAINT resumes_user_id_key UNIQUE (user_id);


--
-- Name: resumes resumes_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resumes
    ADD CONSTRAINT resumes_user_id_unique UNIQUE (user_id);


--
-- Name: role_change_log role_change_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_change_log
    ADD CONSTRAINT role_change_log_pkey PRIMARY KEY (id);


--
-- Name: scout_templates scout_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scout_templates
    ADD CONSTRAINT scout_templates_pkey PRIMARY KEY (id);


--
-- Name: scouts scouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scouts
    ADD CONSTRAINT scouts_pkey PRIMARY KEY (id);


--
-- Name: session_answers session_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_answers
    ADD CONSTRAINT session_answers_pkey PRIMARY KEY (session_id, question_id);


--
-- Name: skills skills_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_name_key UNIQUE (name);


--
-- Name: skills skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (id);


--
-- Name: student_profiles student_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_pkey PRIMARY KEY (id);


--
-- Name: student_profiles student_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_user_id_key UNIQUE (user_id);


--
-- Name: student_qualifications student_qualifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_qualifications
    ADD CONSTRAINT student_qualifications_pkey PRIMARY KEY (student_id, qualification_id);


--
-- Name: student_skills student_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_skills
    ADD CONSTRAINT student_skills_pkey PRIMARY KEY (student_id, skill_id);


--
-- Name: challenge_sessions uniq_once_per_chall; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_sessions
    ADD CONSTRAINT uniq_once_per_chall UNIQUE (challenge_id, student_id);


--
-- Name: chat_rooms unique_chat_room; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT unique_chat_room UNIQUE (company_id, student_id);


--
-- Name: scouts unique_scout; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scouts
    ADD CONSTRAINT unique_scout UNIQUE (company_id, student_id, job_id);


--
-- Name: event_details uq_event_job; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_details
    ADD CONSTRAINT uq_event_job UNIQUE (job_id);


--
-- Name: fulltime_details uq_fulltime_job; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fulltime_details
    ADD CONSTRAINT uq_fulltime_job UNIQUE (job_id);


--
-- Name: internship_details uq_internship_job; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internship_details
    ADD CONSTRAINT uq_internship_job UNIQUE (job_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id);


--
-- Name: user_roles user_roles_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);


--
-- Name: user_signups user_signups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_signups
    ADD CONSTRAINT user_signups_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webtest_questions webtest_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webtest_questions
    ADD CONSTRAINT webtest_questions_pkey PRIMARY KEY (id);


--
-- Name: challenges_created_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX challenges_created_by_idx ON public.challenges USING btree (created_by);


--
-- Name: chat_rooms_scout_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX chat_rooms_scout_id_idx ON public.chat_rooms USING btree (scout_id);


--
-- Name: company_interviews_company_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX company_interviews_company_idx ON public.company_interviews USING btree (company_id);


--
-- Name: company_reviews_company_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX company_reviews_company_idx ON public.company_reviews USING btree (company_id);


--
-- Name: gp_rank_month_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gp_rank_month_category_idx ON public.gp_rank USING btree (month, category);


--
-- Name: idx_activity_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_action ON public.activity_logs USING btree (action);


--
-- Name: idx_activity_logs_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_actor ON public.activity_logs USING btree (actor);


--
-- Name: idx_activity_logs_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_role ON public.activity_logs USING btree (role);


--
-- Name: idx_activity_logs_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_timestamp ON public.activity_logs USING btree ("timestamp");


--
-- Name: idx_applications_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_job_id ON public.applications USING btree (job_id);


--
-- Name: idx_applications_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_student_id ON public.applications USING btree (student_id);


--
-- Name: idx_company_members_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_members_company ON public.company_members USING btree (company_id);


--
-- Name: idx_jobs_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_company_id ON public.jobs USING btree (company_id);


--
-- Name: idx_jobs_published_until; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_published_until ON public.jobs USING btree (published_until);


--
-- Name: idx_messages_chat_room_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_chat_room_id ON public.messages USING btree (chat_room_id);


--
-- Name: idx_messages_room_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_room_unread ON public.messages USING btree (chat_room_id, is_read) WHERE (is_read = false);


--
-- Name: idx_messages_sender_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_sender_id ON public.messages USING btree (sender_id);


--
-- Name: idx_notifications_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_pending ON public.notifications USING btree (send_status, channel, send_after) WHERE (send_status = 'pending'::text);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_scouts_company_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scouts_company_created ON public.scouts USING btree (company_id, created_at DESC);


--
-- Name: idx_scouts_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scouts_company_id ON public.scouts USING btree (company_id);


--
-- Name: idx_scouts_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scouts_student ON public.scouts USING btree (student_id);


--
-- Name: idx_scouts_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scouts_student_id ON public.scouts USING btree (student_id);


--
-- Name: idx_student_profiles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_profiles_user_id ON public.student_profiles USING btree (user_id);


--
-- Name: idx_templates_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_templates_company ON public.scout_templates USING btree (company_id);


--
-- Name: idx_unique_submission; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_unique_submission ON public.challenge_submissions USING btree (challenge_id, student_id);


--
-- Name: jobs_start_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX jobs_start_date_idx ON public.jobs USING btree (start_date);


--
-- Name: jobs_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX jobs_user_id_idx ON public.jobs USING btree (user_id);


--
-- Name: notifications_user_isread_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_user_isread_idx ON public.notifications USING btree (user_id, is_read);


--
-- Name: student_profiles_postal_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX student_profiles_postal_code_idx ON public.student_profiles USING btree (postal_code);


--
-- Name: uq_company_members_company_user; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_company_members_company_user ON public.company_members USING btree (company_id, user_id);


--
-- Name: job_app_count _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.job_app_count AS
 SELECT j.title AS job_title,
    count(a.id) AS cnt
   FROM (public.jobs j
     LEFT JOIN public.applications a ON ((a.job_id = j.id)))
  GROUP BY j.id;


--
-- Name: companies trg_add_creator_to_members; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_add_creator_to_members AFTER INSERT ON public.companies FOR EACH ROW EXECUTE FUNCTION public.add_creator_to_members();


--
-- Name: companies trg_company_after_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_company_after_insert AFTER INSERT ON public.companies FOR EACH ROW EXECUTE FUNCTION public.add_owner_to_company_members();


--
-- Name: student_profiles trg_ensure_user_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ensure_user_id BEFORE INSERT OR UPDATE ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION public.ensure_user_id();


--
-- Name: events trg_events_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_events_updated BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: applications trg_fill_company_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_fill_company_id BEFORE INSERT ON public.applications FOR EACH ROW EXECUTE FUNCTION public.filling_company_id();


--
-- Name: user_roles trg_log_role_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_role_change AFTER UPDATE ON public.user_roles FOR EACH ROW WHEN (((old.role)::text IS DISTINCT FROM (new.role)::text)) EXECUTE FUNCTION public.log_role_change();


--
-- Name: notifications trg_notifications_email; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notifications_email AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.enqueue_email_notification();


--
-- Name: notifications trg_notify_email_queue; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_email_queue AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.queue_email_notification();


--
-- Name: messages trg_notify_on_chat_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_on_chat_insert AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.notify_on_chat_insert();


--
-- Name: scouts trg_notify_on_scout_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_on_scout_insert AFTER INSERT ON public.scouts FOR EACH ROW EXECUTE FUNCTION public.notify_on_scout_insert();


--
-- Name: scouts trg_scout_accepted_notify; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_scout_accepted_notify AFTER UPDATE ON public.scouts FOR EACH ROW WHEN ((((new.status)::text = 'accepted'::text) AND ((old.status)::text IS DISTINCT FROM (new.status)::text))) EXECUTE FUNCTION public.fn_scout_accepted_notify();


--
-- Name: scouts trg_scout_to_application; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_scout_to_application AFTER INSERT OR UPDATE OF status ON public.scouts FOR EACH ROW EXECUTE FUNCTION public.scout_to_application();


--
-- Name: notifications trg_send_email; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_send_email AFTER INSERT ON public.notifications FOR EACH ROW WHEN (((new.channel = 'email'::text) AND ((new.send_status IS NULL) OR (new.send_status = 'pending'::text)))) EXECUTE FUNCTION public.fn_notify_send_email();


--
-- Name: messages trg_set_answered_at_company; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_answered_at_company BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.set_answered_at_on_company_insert();


--
-- Name: features trg_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.features FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: student_profiles trg_set_user_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_user_id BEFORE INSERT ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION public.sync_user_id();


--
-- Name: activity_logs update_activity_logs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_activity_logs_updated_at BEFORE UPDATE ON public.activity_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: applications update_applications_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_applications_modtime BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: chat_rooms update_chat_rooms_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_chat_rooms_modtime BEFORE UPDATE ON public.chat_rooms FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: jobs update_jobs_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_jobs_modtime BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: scouts update_scouts_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_scouts_modtime BEFORE UPDATE ON public.scouts FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: student_profiles update_student_profiles_modtime; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_student_profiles_modtime BEFORE UPDATE ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();


--
-- Name: admins admins_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);


--
-- Name: applications applications_company_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_company_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: applications applications_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: applications applications_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.student_profiles(id) ON DELETE CASCADE;


--
-- Name: challenge_questions challenge_questions_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_questions
    ADD CONSTRAINT challenge_questions_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.challenges(id) ON DELETE CASCADE;


--
-- Name: challenge_questions challenge_questions_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_questions
    ADD CONSTRAINT challenge_questions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.question_bank(id) ON DELETE CASCADE;


--
-- Name: challenge_sessions challenge_sessions_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_sessions
    ADD CONSTRAINT challenge_sessions_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.challenges(id) ON DELETE CASCADE;


--
-- Name: challenge_sessions challenge_sessions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_sessions
    ADD CONSTRAINT challenge_sessions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.student_profiles(id) ON DELETE CASCADE;


--
-- Name: challenge_submissions challenge_submissions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_submissions
    ADD CONSTRAINT challenge_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.student_profiles(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: challenges challenges_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenges
    ADD CONSTRAINT challenges_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.student_profiles(user_id) ON DELETE CASCADE;


--
-- Name: chat_rooms chat_rooms_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: chat_rooms chat_rooms_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL;


--
-- Name: chat_rooms chat_rooms_scout_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_scout_id_fkey FOREIGN KEY (scout_id) REFERENCES public.scouts(id) ON DELETE CASCADE;


--
-- Name: chat_rooms chat_rooms_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.student_profiles(id) ON DELETE CASCADE;


--
-- Name: companies companies_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: company_business_areas company_business_areas_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_business_areas
    ADD CONSTRAINT company_business_areas_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_events company_events_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_events
    ADD CONSTRAINT company_events_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_favorites company_favorites_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_favorites
    ADD CONSTRAINT company_favorites_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_favorites company_favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_favorites
    ADD CONSTRAINT company_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: company_highlights company_highlights_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_highlights
    ADD CONSTRAINT company_highlights_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_interviews company_interviews_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_interviews
    ADD CONSTRAINT company_interviews_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_interviews company_interviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_interviews
    ADD CONSTRAINT company_interviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: company_members company_members_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_members
    ADD CONSTRAINT company_members_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_members company_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_members
    ADD CONSTRAINT company_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: company_philosophy company_philosophy_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_philosophy
    ADD CONSTRAINT company_philosophy_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_positions company_positions_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_positions
    ADD CONSTRAINT company_positions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_recruit_info company_recruit_info_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_recruit_info
    ADD CONSTRAINT company_recruit_info_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_reviews company_reviews_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_reviews
    ADD CONSTRAINT company_reviews_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_reviews company_reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_reviews
    ADD CONSTRAINT company_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: event_participants event_participants_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_participants
    ADD CONSTRAINT event_participants_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.student_profiles(id) ON DELETE CASCADE;


--
-- Name: event_details fk_event_job; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_details
    ADD CONSTRAINT fk_event_job FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: fulltime_details fk_fulltime_job; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fulltime_details
    ADD CONSTRAINT fk_fulltime_job FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: internship_details fk_internship_job; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internship_details
    ADD CONSTRAINT fk_internship_job FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: scouts fk_scouts_company; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scouts
    ADD CONSTRAINT fk_scouts_company FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: scouts fk_scouts_student; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scouts
    ADD CONSTRAINT fk_scouts_student FOREIGN KEY (student_id) REFERENCES public.student_profiles(id);


--
-- Name: scout_templates fk_templates_company; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scout_templates
    ADD CONSTRAINT fk_templates_company FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: internship_details internship_details_selection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internship_details
    ADD CONSTRAINT internship_details_selection_id_fkey FOREIGN KEY (selection_id) REFERENCES public.jobs(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: job_interests job_interests_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_interests
    ADD CONSTRAINT job_interests_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: job_interests job_interests_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_interests
    ADD CONSTRAINT job_interests_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.student_profiles(id) ON DELETE CASCADE;


--
-- Name: job_tags job_tags_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_tags
    ADD CONSTRAINT job_tags_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;


--
-- Name: jobs jobs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: jobs jobs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: media_authors media_authors_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_authors
    ADD CONSTRAINT media_authors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: media_posts media_posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_posts
    ADD CONSTRAINT media_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.media_authors(id) ON DELETE SET NULL;


--
-- Name: media_posts media_posts_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_posts
    ADD CONSTRAINT media_posts_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.media_categories(id) ON DELETE SET NULL;


--
-- Name: media_posts_tags media_posts_tags_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_posts_tags
    ADD CONSTRAINT media_posts_tags_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.media_posts(id) ON DELETE CASCADE;


--
-- Name: media_posts_tags media_posts_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_posts_tags
    ADD CONSTRAINT media_posts_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.media_tags(id) ON DELETE CASCADE;


--
-- Name: messages messages_chat_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_chat_room_id_fkey FOREIGN KEY (chat_room_id) REFERENCES public.chat_rooms(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: question_bank question_bank_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_bank
    ADD CONSTRAINT question_bank_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.challenges(id) ON DELETE CASCADE;


--
-- Name: referral_codes referral_codes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: referral_uses referral_uses_referral_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_uses
    ADD CONSTRAINT referral_uses_referral_code_id_fkey FOREIGN KEY (referral_code_id) REFERENCES public.referral_codes(id) ON DELETE CASCADE;


--
-- Name: referral_uses referral_uses_referred_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_uses
    ADD CONSTRAINT referral_uses_referred_user_id_fkey FOREIGN KEY (referred_user_id) REFERENCES auth.users(id);


--
-- Name: resumes resumes_user_id_profile_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resumes
    ADD CONSTRAINT resumes_user_id_profile_fkey FOREIGN KEY (user_id) REFERENCES public.student_profiles(user_id) ON DELETE CASCADE;


--
-- Name: scout_templates scout_templates_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scout_templates
    ADD CONSTRAINT scout_templates_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: scout_templates scout_templates_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scout_templates
    ADD CONSTRAINT scout_templates_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL;


--
-- Name: scouts scouts_chat_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scouts
    ADD CONSTRAINT scouts_chat_room_id_fkey FOREIGN KEY (chat_room_id) REFERENCES public.chat_rooms(id);


--
-- Name: scouts scouts_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scouts
    ADD CONSTRAINT scouts_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: scouts scouts_company_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scouts
    ADD CONSTRAINT scouts_company_member_id_fkey FOREIGN KEY (company_member_id) REFERENCES public.company_members(id) ON DELETE CASCADE;


--
-- Name: scouts scouts_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scouts
    ADD CONSTRAINT scouts_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL;


--
-- Name: scouts scouts_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scouts
    ADD CONSTRAINT scouts_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.student_profiles(id) ON DELETE CASCADE;


--
-- Name: session_answers session_answers_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_answers
    ADD CONSTRAINT session_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.question_bank(id) ON DELETE CASCADE;


--
-- Name: session_answers session_answers_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_answers
    ADD CONSTRAINT session_answers_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.challenge_sessions(id) ON DELETE CASCADE;


--
-- Name: student_profiles student_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_profiles
    ADD CONSTRAINT student_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: student_qualifications student_qualifications_qualification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_qualifications
    ADD CONSTRAINT student_qualifications_qualification_id_fkey FOREIGN KEY (qualification_id) REFERENCES public.qualifications(id) ON DELETE CASCADE;


--
-- Name: student_qualifications student_qualifications_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_qualifications
    ADD CONSTRAINT student_qualifications_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.student_profiles(id) ON DELETE CASCADE;


--
-- Name: student_skills student_skills_skill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_skills
    ADD CONSTRAINT student_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skills(id) ON DELETE CASCADE;


--
-- Name: student_skills student_skills_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_skills
    ADD CONSTRAINT student_skills_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.student_profiles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_signups user_signups_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_signups
    ADD CONSTRAINT user_signups_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: webtest_questions webtest_questions_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webtest_questions
    ADD CONSTRAINT webtest_questions_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.challenges(id) ON DELETE CASCADE;


--
-- Name: challenge_submissions Admins can grade; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can grade" ON public.challenge_submissions FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = 'admin'::text))))) WITH CHECK (true);


--
-- Name: features Admins full access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins full access" ON public.features USING (((auth.role() = 'service_role'::text) OR ((auth.jwt() ->> 'role'::text) = 'admin'::text)));


--
-- Name: notifications Admins insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins insert" ON public.notifications FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = 'admin'::text)))));


--
-- Name: features Admins manage features; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage features" ON public.features USING ((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = 'admin'::text)))));


--
-- Name: challenge_submissions Admins read all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read all" ON public.challenge_submissions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = 'admin'::text)))));


--
-- Name: question_bank Allow read for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow read for all users" ON public.question_bank FOR SELECT USING (true);


--
-- Name: job_tags Anyone can view job tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view job tags" ON public.job_tags FOR SELECT USING (true);


--
-- Name: challenge_questions Authenticated can insert challenge_questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can insert challenge_questions" ON public.challenge_questions FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: resumes Company can read resumes of their applicants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Company can read resumes of their applicants" ON public.resumes FOR SELECT TO authenticated USING ((user_id IN ( SELECT applications.student_id
   FROM public.applications
  WHERE (applications.company_id = auth.uid()))));


--
-- Name: company_favorites Favorites: Allow delete by owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Favorites: Allow delete by owner" ON public.company_favorites FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: company_favorites Favorites: Allow insert by owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Favorites: Allow insert by owner" ON public.company_favorites FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: company_favorites Favorites: Allow select for authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Favorites: Allow select for authenticated" ON public.company_favorites FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: referral_codes Owner can read own codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner can read own codes" ON public.referral_codes FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: referral_uses Owner can read own uses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner can read own uses" ON public.referral_uses FOR SELECT USING ((auth.uid() = ( SELECT rc.user_id
   FROM public.referral_codes rc
  WHERE (rc.id = referral_uses.referral_code_id))));


--
-- Name: media_categories Public read media_categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read media_categories" ON public.media_categories FOR SELECT USING (true);


--
-- Name: session_answers Student can fetch own answers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Student can fetch own answers" ON public.session_answers USING ((session_id IN ( SELECT challenge_sessions.id
   FROM public.challenge_sessions
  WHERE (challenge_sessions.student_id = auth.uid()))));


--
-- Name: challenge_sessions Student can see own session; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Student can see own session" ON public.challenge_sessions USING ((student_id = auth.uid()));


--
-- Name: scouts Students can update scout status; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can update scout status" ON public.scouts FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.student_profiles
  WHERE ((student_profiles.id = scouts.student_id) AND (student_profiles.user_id = auth.uid())))));


--
-- Name: scouts Students can view and respond to scouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Students can view and respond to scouts" ON public.scouts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.student_profiles
  WHERE ((student_profiles.id = scouts.student_id) AND (student_profiles.user_id = auth.uid())))));


--
-- Name: user_signups Users can insert their own signup row; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own signup row" ON public.user_signups FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: notifications Users can mark notifications as read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can mark notifications as read" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_signups Users can select their own signup row; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can select their own signup row" ON public.user_signups FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notifications Users can view own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: activity_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: companies admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_all ON public.companies USING (((auth.jwt() ->> 'role'::text) = 'admin'::text)) WITH CHECK (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: user_roles admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_all ON public.user_roles USING (((auth.jwt() ->> 'role'::text) = 'admin'::text)) WITH CHECK (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: jobs admin_can_do_anything; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_can_do_anything ON public.jobs TO admin USING (true) WITH CHECK (true);


--
-- Name: events admin_full_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_access ON public.events TO authenticated USING ((auth.role() = 'admin'::text)) WITH CHECK ((auth.role() = 'admin'::text));


--
-- Name: activity_logs admin_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_only ON public.activity_logs USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: admins admin_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_only ON public.admins USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: challenge_questions admin_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_only ON public.challenge_questions USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: job_tags admin_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_only ON public.job_tags USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: question_bank admin_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_only ON public.question_bank USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: session_answers admin_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_only ON public.session_answers USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: users admin_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_only ON public.users FOR SELECT USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: challenge_sessions admin_or_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_or_owner ON public.challenge_sessions USING ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (student_id = auth.uid())));


--
-- Name: challenge_submissions admin_or_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_or_owner ON public.challenge_submissions USING ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (student_id = auth.uid())));


--
-- Name: challenges admin_or_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_or_owner ON public.challenges USING ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (student_id = auth.uid())));


--
-- Name: companies admin_or_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_or_owner ON public.companies USING ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (user_id = auth.uid())));


--
-- Name: job_interests admin_or_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_or_owner ON public.job_interests USING ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (student_id = auth.uid())));


--
-- Name: notifications admin_or_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_or_owner ON public.notifications USING ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (user_id = auth.uid())));


--
-- Name: resumes admin_or_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_or_owner ON public.resumes USING ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (user_id = auth.uid())));


--
-- Name: scout_templates admin_or_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_or_owner ON public.scout_templates USING ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (company_id = auth.uid())));


--
-- Name: scouts admin_or_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_or_owner ON public.scouts USING ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (student_id = auth.uid())));


--
-- Name: user_roles admin_or_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_or_owner ON public.user_roles USING ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (user_id = auth.uid())));


--
-- Name: user_signups admin_or_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_or_owner ON public.user_signups USING ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (user_id = auth.uid())));


--
-- Name: companies admin_or_owner_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_or_owner_write ON public.companies USING ((((auth.jwt() ->> 'role'::text) = 'admin'::text) OR (user_id = auth.uid())));


--
-- Name: admins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

--
-- Name: activity_logs admins_can_read_logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_can_read_logs ON public.activity_logs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = 'admin'::text)))));


--
-- Name: resumes allow all select for resumes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow all select for resumes" ON public.resumes FOR SELECT USING (true);


--
-- Name: resumes allow select for all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "allow select for all users" ON public.resumes FOR SELECT USING (true);


--
-- Name: applications app_student_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_student_insert ON public.applications FOR INSERT WITH CHECK ((student_id IN ( SELECT student_profiles.id
   FROM public.student_profiles
  WHERE (student_profiles.user_id = auth.uid()))));


--
-- Name: applications app_student_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY app_student_select ON public.applications FOR SELECT USING ((student_id IN ( SELECT student_profiles.id
   FROM public.student_profiles
  WHERE (student_profiles.user_id = auth.uid()))));


--
-- Name: applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

--
-- Name: question_bank authenticated_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_insert ON public.question_bank FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: media_posts author read draft; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "author read draft" ON public.media_posts FOR SELECT USING (((status = 'published'::text) OR (auth.uid() = ( SELECT media_authors.user_id
   FROM public.media_authors
  WHERE (media_authors.id = media_posts.author_id)))));


--
-- Name: media_posts author update own post; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "author update own post" ON public.media_posts FOR UPDATE USING ((auth.uid() = ( SELECT media_authors.user_id
   FROM public.media_authors
  WHERE (media_authors.id = media_posts.author_id))));


--
-- Name: challenge_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.challenge_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: challenge_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.challenge_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: challenge_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: challenges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: challenges challenges_authenticated_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY challenges_authenticated_write ON public.challenges TO authenticated USING (true) WITH CHECK (true);


--
-- Name: challenges challenges_insert_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY challenges_insert_auth ON public.challenges FOR INSERT TO authenticated WITH CHECK ((created_by = auth.uid()));


--
-- Name: challenges challenges_rw_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY challenges_rw_owner ON public.challenges TO authenticated USING ((created_by = auth.uid())) WITH CHECK ((created_by = auth.uid()));


--
-- Name: chat_rooms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

--
-- Name: company_members cm_company_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cm_company_select ON public.company_members FOR SELECT USING ((company_id IN ( SELECT user_companies.company_id
   FROM public.user_companies
  WHERE (user_companies.user_id = auth.uid()))));


--
-- Name: company_members cm_self_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cm_self_insert ON public.company_members FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: company_members cm_self_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cm_self_only ON public.company_members TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: companies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

--
-- Name: companies companies_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY companies_admin_all ON public.companies TO supabase_auth_admin USING (true) WITH CHECK (true);


--
-- Name: companies companies_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY companies_select ON public.companies FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.company_members
  WHERE ((company_members.company_id = companies.id) AND (company_members.user_id = auth.uid())))));


--
-- Name: resumes company can read all resumes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "company can read all resumes" ON public.resumes FOR SELECT TO authenticated USING (true);


--
-- Name: scouts company can read own scouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "company can read own scouts" ON public.scouts FOR SELECT USING ((company_member_id = ( SELECT company_members.id
   FROM public.company_members
  WHERE (company_members.user_id = auth.uid())
 LIMIT 1)));


--
-- Name: scouts company can update own scouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "company can update own scouts" ON public.scouts FOR UPDATE USING ((company_member_id = ( SELECT company_members.id
   FROM public.company_members
  WHERE (company_members.user_id = auth.uid())
 LIMIT 1)));


--
-- Name: chat_rooms company member can insert chat room; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "company member can insert chat room" ON public.chat_rooms FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.company_members
  WHERE ((company_members.company_id = chat_rooms.company_id) AND (company_members.user_id = auth.uid())))));


--
-- Name: scouts company read scouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "company read scouts" ON public.scouts FOR SELECT USING ((job_id IN ( SELECT jobs.id
   FROM public.jobs
  WHERE (jobs.company_id = auth.uid()))));


--
-- Name: jobs company user can insert jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "company user can insert jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK ((company_id IN ( SELECT companies.id
   FROM public.companies
  WHERE (companies.user_id = auth.uid()))));


--
-- Name: companies company_admin can select own company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "company_admin can select own company" ON public.companies FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: chat_rooms company_can_access_their_chat_rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY company_can_access_their_chat_rooms ON public.chat_rooms USING ((EXISTS ( SELECT 1
   FROM public.company_members cu
  WHERE ((cu.company_id = chat_rooms.company_id) AND (cu.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.company_members cu
  WHERE ((cu.company_id = chat_rooms.company_id) AND (cu.user_id = auth.uid())))));


--
-- Name: jobs company_can_manage_own_jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY company_can_manage_own_jobs ON public.jobs USING ((company_id IN ( SELECT companies.id
   FROM public.companies
  WHERE (companies.user_id = auth.uid())))) WITH CHECK ((company_id IN ( SELECT companies.id
   FROM public.companies
  WHERE (companies.user_id = auth.uid()))));


--
-- Name: company_favorites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.company_favorites ENABLE ROW LEVEL SECURITY;

--
-- Name: scouts company_manage_scouts; Type: POLICY; Schema: public; Owner: -
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
-- Name: scout_templates company_manage_templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY company_manage_templates ON public.scout_templates TO authenticated USING ((is_global OR (EXISTS ( SELECT 1
   FROM public.company_members cm
  WHERE ((cm.user_id = auth.uid()) AND (cm.company_id = cm.company_id)))))) WITH CHECK ((is_global OR (EXISTS ( SELECT 1
   FROM public.company_members cm
  WHERE ((cm.user_id = auth.uid()) AND (cm.company_id = cm.company_id))))));


--
-- Name: company_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

--
-- Name: scout_templates company_owner_manage_templates; Type: POLICY; Schema: public; Owner: -
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
-- Name: company_recruit_info; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.company_recruit_info ENABLE ROW LEVEL SECURITY;

--
-- Name: challenge_questions cq_any_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cq_any_insert ON public.challenge_questions FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: challenge_questions cq_any_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cq_any_select ON public.challenge_questions FOR SELECT TO authenticated USING (true);


--
-- Name: challenge_questions cq_authenticated_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cq_authenticated_delete ON public.challenge_questions FOR DELETE TO authenticated USING (true);


--
-- Name: challenge_questions cq_authenticated_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cq_authenticated_insert ON public.challenge_questions FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: challenge_questions cq_insert_debug; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cq_insert_debug ON public.challenge_questions FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: challenge_questions cq_owner_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cq_owner_insert ON public.challenge_questions FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.challenges c
  WHERE ((c.id = challenge_questions.challenge_id) AND (c.created_by = auth.uid())))));


--
-- Name: challenge_questions cq_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cq_owner_select ON public.challenge_questions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.challenges c
  WHERE ((c.id = challenge_questions.challenge_id) AND (c.created_by = auth.uid())))));


--
-- Name: challenge_questions cq_select_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cq_select_auth ON public.challenge_questions FOR SELECT TO authenticated USING (true);


--
-- Name: company_recruit_info cri_self_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cri_self_all ON public.company_recruit_info TO authenticated USING ((company_id IN ( SELECT companies.id
   FROM public.companies
  WHERE (companies.user_id = auth.uid())))) WITH CHECK ((company_id IN ( SELECT companies.id
   FROM public.companies
  WHERE (companies.user_id = auth.uid()))));


--
-- Name: event_participants ep_student_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ep_student_insert ON public.event_participants FOR INSERT WITH CHECK ((student_id IN ( SELECT student_profiles.id
   FROM public.student_profiles
  WHERE (student_profiles.user_id = auth.uid()))));


--
-- Name: event_participants ep_student_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ep_student_select ON public.event_participants FOR SELECT USING ((student_id IN ( SELECT student_profiles.id
   FROM public.student_profiles
  WHERE (student_profiles.user_id = auth.uid()))));


--
-- Name: event_participants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- Name: features; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;

--
-- Name: companies insert own company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "insert own company" ON public.companies FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: notifications insert_own_notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insert_own_notifications ON public.notifications FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_roles insert_own_role_once; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insert_own_role_once ON public.user_roles FOR INSERT WITH CHECK (((auth.uid() = user_id) AND (NOT (EXISTS ( SELECT 1
   FROM public.user_roles r2
  WHERE (r2.user_id = auth.uid()))))));


--
-- Name: job_interests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.job_interests ENABLE ROW LEVEL SECURITY;

--
-- Name: job_tags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.job_tags ENABLE ROW LEVEL SECURITY;

--
-- Name: jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: media_posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.media_posts ENABLE ROW LEVEL SECURITY;

--
-- Name: media_posts media_posts_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY media_posts_insert_own ON public.media_posts FOR INSERT WITH CHECK ((auth.uid() = ( SELECT media_authors.user_id
   FROM public.media_authors
  WHERE (media_authors.id = media_posts.author_id))));


--
-- Name: media_posts_tags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.media_posts_tags ENABLE ROW LEVEL SECURITY;

--
-- Name: media_posts_tags media_posts_tags_insert_if_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY media_posts_tags_insert_if_owner ON public.media_posts_tags FOR INSERT WITH CHECK ((auth.uid() = ( SELECT a.user_id
   FROM (public.media_authors a
     JOIN public.media_posts p ON ((p.author_id = a.id)))
  WHERE (p.id = media_posts_tags.post_id))));


--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications owner_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY owner_read ON public.notifications FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: messages participant_can_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY participant_can_insert ON public.messages FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.chat_rooms cr
  WHERE ((cr.id = messages.chat_room_id) AND ((EXISTS ( SELECT 1
           FROM public.student_profiles sp
          WHERE ((sp.id = cr.student_id) AND (sp.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM public.company_members cm
          WHERE ((cm.company_id = cr.company_id) AND (cm.user_id = auth.uid())))))))));


--
-- Name: messages participant_can_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY participant_can_select ON public.messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.chat_rooms cr
  WHERE ((cr.id = messages.chat_room_id) AND ((EXISTS ( SELECT 1
           FROM public.student_profiles sp
          WHERE ((sp.id = cr.student_id) AND (sp.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM public.company_members cm
          WHERE ((cm.company_id = cr.company_id) AND (cm.user_id = auth.uid())))))))));


--
-- Name: messages participant_can_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY participant_can_update ON public.messages FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.chat_rooms cr
  WHERE ((cr.id = messages.chat_room_id) AND ((EXISTS ( SELECT 1
           FROM public.student_profiles sp
          WHERE ((sp.id = cr.student_id) AND (sp.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
           FROM public.company_members cm
          WHERE ((cm.company_id = cr.company_id) AND (cm.user_id = auth.uid()))))))))) WITH CHECK (true);


--
-- Name: companies public read companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read companies" ON public.companies FOR SELECT USING (true);


--
-- Name: job_tags public read job_tags; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read job_tags" ON public.job_tags FOR SELECT USING (true);


--
-- Name: media_posts public read published posts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read published posts" ON public.media_posts FOR SELECT USING ((status = 'published'::text));


--
-- Name: resumes public read resumes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "public read resumes" ON public.resumes FOR SELECT TO authenticated USING (true);


--
-- Name: jobs public_can_view_published_jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY public_can_view_published_jobs ON public.jobs FOR SELECT USING ((published = true));


--
-- Name: question_bank; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.question_bank ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles read_own_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY read_own_role ON public.user_roles FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: resumes resume_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY resume_owner_all ON public.resumes USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = ANY ((ARRAY['company'::character varying, 'company_admin'::character varying])::text[]))))))) WITH CHECK ((user_id = auth.uid()));


--
-- Name: resumes resume_owner_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY resume_owner_insert ON public.resumes FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: resumes resume_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY resume_owner_update ON public.resumes FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: resumes resume_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY resume_select ON public.resumes FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = ANY ((ARRAY['company'::character varying, 'company_admin'::character varying])::text[])))))));


--
-- Name: resumes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

--
-- Name: resumes resumes_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY resumes_owner ON public.resumes USING ((auth.uid() = user_id));


--
-- Name: resumes resumes_readable_by_company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY resumes_readable_by_company ON public.resumes FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = ANY ((ARRAY['company'::character varying, 'company_admin'::character varying])::text[]))))) OR (user_id = auth.uid())));


--
-- Name: scout_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scout_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: scouts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scouts ENABLE ROW LEVEL SECURITY;

--
-- Name: companies select own company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "select own company" ON public.companies FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: notifications select own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "select own notifications" ON public.notifications FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: chat_rooms select_chat_rooms_participants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY select_chat_rooms_participants ON public.chat_rooms FOR SELECT TO authenticated USING (((auth.uid() IN ( SELECT student_profiles.user_id
   FROM public.student_profiles
  WHERE (student_profiles.id = chat_rooms.student_id))) OR (auth.uid() IN ( SELECT company_members.user_id
   FROM public.company_members
  WHERE (company_members.company_id = chat_rooms.company_id)))));


--
-- Name: notifications select_own_notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY select_own_notifications ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles select_own_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY select_own_role ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: events select_published_events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY select_published_events ON public.events FOR SELECT USING (((status)::text = 'published'::text));


--
-- Name: challenges select_webtest_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY select_webtest_authenticated ON public.challenges FOR SELECT TO authenticated USING (((student_id IS NULL) AND (category = 'webtest'::text) AND (start_date <= now()) AND ((deadline IS NULL) OR (deadline >= now()))));


--
-- Name: users self_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY self_insert ON public.users FOR INSERT WITH CHECK ((id = auth.uid()));


--
-- Name: users self_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY self_update ON public.users FOR UPDATE USING ((id = auth.uid()));


--
-- Name: student_profiles server insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "server insert" ON public.student_profiles FOR INSERT TO authenticator WITH CHECK (true);


--
-- Name: jobs service_role_can_update_is_recommended; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_role_can_update_is_recommended ON public.jobs FOR UPDATE TO service_role USING (true) WITH CHECK (true);


--
-- Name: session_answers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.session_answers ENABLE ROW LEVEL SECURITY;

--
-- Name: student_profiles sp_company_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sp_company_read ON public.student_profiles FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = ANY ((ARRAY['company'::character varying, 'company_admin'::character varying])::text[]))))) OR (COALESCE((auth.jwt() ->> 'role'::text), ''::text) = 'admin'::text)));


--
-- Name: student_profiles sp_owner_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sp_owner_insert ON public.student_profiles FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: student_profiles sp_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sp_owner_select ON public.student_profiles FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: student_profiles sp_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sp_owner_update ON public.student_profiles FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: chat_rooms student can insert chat room; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "student can insert chat room" ON public.chat_rooms FOR INSERT WITH CHECK ((student_id = ( SELECT sp.id
   FROM public.student_profiles sp
  WHERE (sp.user_id = auth.uid())
 LIMIT 1)));


--
-- Name: session_answers student owns answer; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "student owns answer" ON public.session_answers USING ((EXISTS ( SELECT 1
   FROM public.challenge_sessions cs
  WHERE ((cs.id = session_answers.session_id) AND (cs.student_id = auth.uid())))));


--
-- Name: chat_rooms student_can_read_their_chat_rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_can_read_their_chat_rooms ON public.chat_rooms FOR SELECT USING ((student_id = auth.uid()));


--
-- Name: chat_rooms student_can_write_their_chat_rooms; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_can_write_their_chat_rooms ON public.chat_rooms USING ((student_id = auth.uid())) WITH CHECK ((student_id = auth.uid()));


--
-- Name: student_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: scouts student_read_own_scouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_read_own_scouts ON public.scouts FOR SELECT USING ((student_id = auth.uid()));


--
-- Name: session_answers students insert own session answers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "students insert own session answers" ON public.session_answers FOR INSERT WITH CHECK ((session_id IN ( SELECT challenge_sessions.id
   FROM public.challenge_sessions
  WHERE (challenge_sessions.student_id = ( SELECT student_profiles.id
           FROM public.student_profiles
          WHERE (student_profiles.user_id = auth.uid()))))));


--
-- Name: challenge_sessions students insert own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "students insert own sessions" ON public.challenge_sessions FOR INSERT WITH CHECK ((student_id = ( SELECT student_profiles.id
   FROM public.student_profiles
  WHERE (student_profiles.user_id = auth.uid()))));


--
-- Name: challenge_sessions students manage own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "students manage own sessions" ON public.challenge_sessions USING ((student_id IN ( SELECT student_profiles.id
   FROM public.student_profiles
  WHERE (student_profiles.user_id = auth.uid())))) WITH CHECK ((student_id IN ( SELECT student_profiles.id
   FROM public.student_profiles
  WHERE (student_profiles.user_id = auth.uid()))));


--
-- Name: session_answers students select own session answers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "students select own session answers" ON public.session_answers FOR SELECT USING ((session_id IN ( SELECT challenge_sessions.id
   FROM public.challenge_sessions
  WHERE (challenge_sessions.student_id = ( SELECT student_profiles.id
           FROM public.student_profiles
          WHERE (student_profiles.user_id = auth.uid()))))));


--
-- Name: challenge_sessions students select own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "students select own sessions" ON public.challenge_sessions FOR SELECT USING ((student_id = ( SELECT student_profiles.id
   FROM public.student_profiles
  WHERE (student_profiles.user_id = auth.uid()))));


--
-- Name: session_answers students update own session answers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "students update own session answers" ON public.session_answers FOR UPDATE USING ((session_id IN ( SELECT challenge_sessions.id
   FROM public.challenge_sessions
  WHERE (challenge_sessions.student_id = ( SELECT student_profiles.id
           FROM public.student_profiles
          WHERE (student_profiles.user_id = auth.uid()))))));


--
-- Name: challenge_sessions students update own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "students update own sessions" ON public.challenge_sessions FOR UPDATE USING ((student_id = ( SELECT student_profiles.id
   FROM public.student_profiles
  WHERE (student_profiles.user_id = auth.uid()))));


--
-- Name: student_profiles students_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY students_insert_own ON public.student_profiles FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: student_profiles students_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY students_select_admin ON public.student_profiles FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.user_roles ur
  WHERE ((ur.user_id = auth.uid()) AND ((ur.role)::text = 'admin'::text)))) OR (auth.role() = 'service_role'::text)));


--
-- Name: student_profiles students_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY students_select_own ON public.student_profiles FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: student_profiles students_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY students_update_own ON public.student_profiles FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: companies update own company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "update own company" ON public.companies FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: notifications update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "update own notifications" ON public.notifications FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: notifications update_is_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY update_is_read ON public.notifications FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_roles user can read own role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "user can read own role" ON public.user_roles FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles user_roles_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_roles_admin_all ON public.user_roles TO supabase_admin, supabase_auth_admin USING (true) WITH CHECK (true);


--
-- Name: user_roles user_roles_block_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_roles_block_delete ON public.user_roles FOR DELETE TO authenticated USING (false);


--
-- Name: user_roles user_roles_block_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_roles_block_update ON public.user_roles FOR UPDATE TO authenticated USING (false);


--
-- Name: user_roles user_roles_insert_once; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_roles_insert_once ON public.user_roles FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: user_signups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_signups ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: companies 企業メンバーだけが更新; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "企業メンバーだけが更新" ON public.companies FOR UPDATE USING ((public.is_company_member(id) OR ((auth.jwt() ->> 'role'::text) = 'admin'::text))) WITH CHECK ((public.is_company_member(id) OR ((auth.jwt() ->> 'role'::text) = 'admin'::text)));


--
-- Name: companies 公開読み取り; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "公開読み取り" ON public.companies FOR SELECT USING (true);


--
-- Name: job_interests 学生本人のみ削除; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "学生本人のみ削除" ON public.job_interests FOR DELETE USING (((student_id = auth.uid()) OR public.is_admin()));


--
-- Name: job_interests 学生本人のみ参照; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "学生本人のみ参照" ON public.job_interests FOR SELECT USING (((student_id = auth.uid()) OR public.is_admin()));


--
-- Name: job_interests 学生本人のみ追加; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "学生本人のみ追加" ON public.job_interests FOR INSERT WITH CHECK (((student_id = auth.uid()) OR public.is_admin()));


--
-- Name: gp_rank; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: -
--

REFRESH MATERIALIZED VIEW public.gp_rank;


--
-- PostgreSQL database dump complete
--

