-- マイグレーション新規ファイルに追記
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'public'
       AND tablename  = 'resumes'
       AND indexname  = 'resumes_user_id_key'
  ) THEN
    ALTER TABLE public.resumes
      ADD CONSTRAINT resumes_user_id_key UNIQUE (user_id);
  END IF;
END $$;