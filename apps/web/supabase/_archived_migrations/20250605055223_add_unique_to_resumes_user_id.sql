DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'resumes_user_id_key'
  ) THEN
    ALTER TABLE public.resumes
      ADD CONSTRAINT resumes_user_id_key UNIQUE (user_id);
  END IF;
END $$;