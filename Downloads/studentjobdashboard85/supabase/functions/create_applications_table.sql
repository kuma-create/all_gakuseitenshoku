CREATE OR REPLACE FUNCTION create_applications_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 応募テーブルの作成
  CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    student_id UUID REFERENCES auth.users(id),
    job_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    motivation TEXT,
    self_pr TEXT,
    questions TEXT,
    interview_dates INTEGER[],
    resume_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- RLSポリシーの設定
  ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

  -- 既存のポリシーを削除
  DROP POLICY IF EXISTS "Students can view own applications" ON applications;
  DROP POLICY IF EXISTS "Students can insert own applications" ON applications;
  DROP POLICY IF EXISTS "Students can update own applications" ON applications;
  DROP POLICY IF EXISTS "Companies can view applications for their jobs" ON applications;
  DROP POLICY IF EXISTS "Companies can update status of applications for their jobs" ON applications;
  DROP POLICY IF EXISTS "Admins can do anything on applications" ON applications;

  -- 学生は自分の応募を読み取れる
  CREATE POLICY "Students can view own applications" ON applications
  FOR SELECT USING (auth.uid() = student_id);

  -- 学生は自分の応募を作成できる
  CREATE POLICY "Students can insert own applications" ON applications
  FOR INSERT WITH CHECK (auth.uid() = student_id);

  -- 学生は自分の応募を更新できる
  CREATE POLICY "Students can update own applications" ON applications
  FOR UPDATE USING (auth.uid() = student_id);

  -- 企業は自社の求人に対する応募を読み取れる
  CREATE POLICY "Companies can view applications for their jobs" ON applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = applications.job_id
      AND jobs.company_id = (
        SELECT company_id FROM company_users
        WHERE user_id = auth.uid()
      )
    )
  );

  -- 企業は自社の求人に対する応募のステータスを更新できる
  CREATE POLICY "Companies can update status of applications for their jobs" ON applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = applications.job_id
      AND jobs.company_id = (
        SELECT company_id FROM company_users
        WHERE user_id = auth.uid()
      )
    )
  );

  -- 管理者はすべての応募を管理できる
  CREATE POLICY "Admins can do anything on applications" ON applications
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
END;
$$;
