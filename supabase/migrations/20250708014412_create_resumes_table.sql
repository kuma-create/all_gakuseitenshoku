-- 2025-07-08 01:44:12 生成 │ resumes テーブル
CREATE TABLE public.resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  title TEXT,
  summary TEXT,
  work_experiences JSONB DEFAULT '[]'::jsonb,  -- ★追加
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
-- 必要であれば index / constraints をここに追加
