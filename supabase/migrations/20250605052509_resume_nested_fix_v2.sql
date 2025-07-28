/* ======================================================================
   calculate_resume_completion – camelCase nested version
   ----------------------------------------------------------------------
   basic 7 : form_data -> 'basic'
   pr    3 : form_data -> 'pr'
   cond 5 : form_data -> 'conditions'
   合計 15 項目を均等配点
====================================================================== */
DROP FUNCTION IF EXISTS public.calculate_resume_completion(uuid);

CREATE FUNCTION public.calculate_resume_completion (
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
  v_resume record;
  v_basic  jsonb;
  v_pr     jsonb;
  v_cond   jsonb;
  v_filled int  := 0;
  v_miss   text[] := '{}';
  k        text;
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

  v_basic := v_resume.form_data -> 'basic';
  v_pr    := v_resume.form_data -> 'pr';
  v_cond  := v_resume.form_data -> 'conditions';

  /* 2. basic 7 */
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

  /* 3. PR 3 */
  FOREACH k IN ARRAY ARRAY['title','content','motivation'] LOOP
    IF COALESCE(TRIM(v_pr ->> k), '') <> '' THEN
      v_filled := v_filled + 1;
    ELSE
      v_miss := ARRAY_APPEND(v_miss, k);
    END IF;
  END LOOP;

  /* 4. 条件 5 = 配列 4 + workStyle 1 */
  -- 4-1 配列キー
  FOREACH k IN ARRAY
    ARRAY['jobTypes','locations','industries','workPreferences']
  LOOP
    IF JSONB_ARRAY_LENGTH(COALESCE(v_cond -> k, '[]')) > 0 THEN
      v_filled := v_filled + 1;
    ELSE
      v_miss := ARRAY_APPEND(v_miss, k);
    END IF;
  END LOOP;
  -- 4-2 workStyle
  IF COALESCE(TRIM(v_cond ->> 'workStyle'), '') <> '' THEN
    v_filled := v_filled + 1;
  ELSE
    v_miss := ARRAY_APPEND(v_miss, 'workStyle');
  END IF;

  /* 5. スコア算出 */
  RETURN QUERY
    SELECT ROUND(v_filled::numeric / 15, 4), v_miss;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_resume_completion(uuid)
      TO anon, authenticated, service_role;