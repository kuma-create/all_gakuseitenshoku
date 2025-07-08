-- Up: create resumes table
CREATE TABLE public.resumes (
  id           uuid           PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      uuid           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content      jsonb          NOT NULL,
  created_at   timestamptz    NOT NULL DEFAULT now(),
  updated_at   timestamptz    NOT NULL DEFAULT now()
);

-- Down: drop resumes table
DROP TABLE IF EXISTS public.resumes;
