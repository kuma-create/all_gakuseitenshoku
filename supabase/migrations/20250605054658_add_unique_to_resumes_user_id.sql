-- Ensure the resumes table exists before adding the UNIQUE constraint
DO $$
BEGIN
  -- Only proceed if the table exists
  IF EXISTS (
    SELECT 1
    FROM   pg_tables
    WHERE  schemaname = 'public'
      AND  tablename  = 'resumes'
  ) THEN
    -- Add the constraint only if it is not already present
    IF NOT EXISTS (
      SELECT 1
      FROM   pg_indexes
      WHERE  schemaname = 'public'
        AND  tablename  = 'resumes'
        AND  indexname  = 'resumes_user_id_key'
    ) THEN
      ALTER TABLE public.resumes
        ADD CONSTRAINT resumes_user_id_key UNIQUE (user_id);
    END IF;
  END IF;
END $$;