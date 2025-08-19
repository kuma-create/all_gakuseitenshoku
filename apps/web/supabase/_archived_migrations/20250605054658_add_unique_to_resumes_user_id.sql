-- Ensure the resumes table exists before attempting to add the UNIQUE constraint
DO $$
BEGIN
  -- Proceed only if the table exists
  IF EXISTS (
    SELECT 1
    FROM   pg_tables
    WHERE  schemaname = 'public'
      AND  tablename  = 'resumes'
  ) THEN
    -- Add the constraint only if it is not already present
    IF NOT EXISTS (
      SELECT 1
      FROM   pg_constraint
      WHERE  conname = 'resumes_user_id_key'
    ) THEN
      ALTER TABLE public.resumes
        ADD CONSTRAINT resumes_user_id_key UNIQUE (user_id);
    END IF;
  END IF;
END $$;