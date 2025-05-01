-- user_roles テーブルのRLSポリシー設定
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 認証されたユーザーは自分自身のレコードを読み取れる
CREATE POLICY "Users can read their own roles" ON user_roles
  FOR SELECT USING (auth.uid() = id);

-- サービスロールは全ての操作が可能
CREATE POLICY "Service role can do anything" ON user_roles
  USING (auth.jwt() ->> 'role' = 'service_role');

-- 認証されたユーザーは自分自身のレコードを作成できる
CREATE POLICY "Users can create their own roles" ON user_roles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- student_profiles テーブルのRLSポリシー設定
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

-- 認証されたユーザーは自分自身のプロフィールを読み取れる
CREATE POLICY "Users can read their own profiles" ON student_profiles
  FOR SELECT USING (auth.uid() = id);

-- サービスロールは全ての操作が可能
CREATE POLICY "Service role can do anything" ON student_profiles
  USING (auth.jwt() ->> 'role' = 'service_role');

-- 認証されたユーザーは自分自身のプロフィールを作成できる
CREATE POLICY "Users can create their own profiles" ON student_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
