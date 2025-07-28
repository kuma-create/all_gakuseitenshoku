-- 2025-07-08 01:44:12 生成 │ resumes テーブル
CREATE TABLE IF NOT EXISTS public.resumes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title         text,
  form_data     jsonb     NOT NULL DEFAULT '{}'::jsonb,
  work_experiences jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);