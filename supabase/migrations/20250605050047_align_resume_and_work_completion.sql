-- ======================================================================
-- 20250605_align_resume_and_work_completion.sql
-- ----------------------------------------------------------------------
-- 1) calculate_resume_completion      – 必須 15 項目
-- 2) calculate_work_history_completion – 必須 5 項目
-- ======================================================================


/* ----------------------------------------------------------------------
   Ⅰ. calculate_resume_completion
   ----------------------------------------------------------------------
   basic 8 ＋ PR 3 ＋ 希望条件 4 ＝ 15 項目を均等配点
---------------------------------------------------------------------- */
DROP FUNCTION IF EXISTS public.calculate_resume_completion(uuid);

CREATE FUNCTION public.calculate_resume_completion (
  p_user_id uuid
)
RETURNS TABLE (
  score   numeric,      -- 0.0000 – 1.0000
  missing text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_resume  record;
  v_filled  int := 0;
  v_miss    text[] := '{}';
  k         text;
BEGIN
  /* 1. レジュメ行取得 */
  SELECT form_data
    INTO v_resume
    FROM public.resumes
   WHERE user_id = p_user_id
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::numeric, '{}'::text[];
    RETURN;
  END IF;

  /* 2. basic 8 */
  FOREACH k IN ARRAY
    ARRAY['last_name','first_name','postal_code','prefecture',
          'city','address_line','birth_date','gender']
  LOOP
    IF COALESCE(TRIM(v_resume.form_data ->> k), '') <> '' THEN
      v_filled := v_filled + 1;
    ELSE
      v_miss := ARRAY_APPEND(v_miss, k);
    END IF;
  END LOOP;

  /* 3. PR 3 */
  FOREACH k IN ARRAY ARRAY['pr_title','pr_text','about'] LOOP
    IF COALESCE(TRIM(v_resume.form_data ->> k), '') <> '' THEN
      v_filled := v_filled + 1;
    ELSE
      v_miss := ARRAY_APPEND(v_miss, k);
    END IF;
  END LOOP;

  /* 4. 希望条件 4（配列長 > 0） */
  FOREACH k IN ARRAY
    ARRAY['desired_positions','work_style_options',
          'preferred_industries','desired_locations']
  LOOP
    IF JSONB_ARRAY_LENGTH(COALESCE(v_resume.form_data -> k, '[]')) > 0 THEN
      v_filled := v_filled + 1;
    ELSE
      v_miss := ARRAY_APPEND(v_miss, k);
    END IF;
  END LOOP;

  /* 5. スコア算出 */
  RETURN QUERY
    SELECT ROUND(v_filled::numeric / 15, 4) AS score,
           v_miss                           AS missing;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_resume_completion(uuid)
      TO anon, authenticated, service_role;



/* ----------------------------------------------------------------------
   Ⅱ. calculate_work_history_completion
   ----------------------------------------------------------------------
   company / position / startDate / endDate(or isCurrent) / description
   ＝ 5 項目
---------------------------------------------------------------------- */
DROP FUNCTION IF EXISTS public.calculate_work_history_completion(uuid);

CREATE FUNCTION public.calculate_work_history_completion (
  p_user_id uuid
)
RETURNS TABLE (
  score   numeric,
  missing text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
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

GRANT EXECUTE ON FUNCTION public.calculate_work_history_completion(uuid)
      TO anon, authenticated, service_role;
