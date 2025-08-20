import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const main = createClient(
  process.env.MAIN_URL!,
  process.env.MAIN_SERVICE_KEY!,
  { auth: { autoRefreshToken: false } }
);

const branch = createClient(
  process.env.BRANCH_URL!,
  process.env.BRANCH_SERVICE_KEY!,
  { auth: { autoRefreshToken: false } }
);

/**
 * 📌 特定アカウントだけコピーしたい場合:
 *   環境変数 TARGET_EMAILS にカンマ区切りでメールアドレスを渡す。
 *   例） TARGET_EMAILS="alice@example.com,bob@example.com"
 *   未指定なら全件コピー。
 */

const TARGET_EMAILS="hr@makeculture.jp"

const targetEmails = (process.env.TARGET_EMAILS ?? '')
  .split(',')
  .map(e => e.trim())
  .filter(Boolean);

/** フィルタ条件なし：全ユーザーを対象にコピー */
const shouldCopy = (u: any) =>
  targetEmails.length === 0 ? true : targetEmails.includes(u.email);

(async () => {
  // 1. main 側から最大 1,000 人取得（必要ならページング）
  const { data: { users }, error } = await main.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;

  const targets = users.filter(shouldCopy);
  console.log(`候補 ${targets.length} 人中 ${targets.length} 人をコピーします`);

  // 2. preview に作成
  for (const u of targets) {
    try {
      await branch.auth.admin.createUser({
        email: u.email,
        // 既存ハッシュは渡せないため一時パスワードを設定
        password: `Temp${Math.random().toString(36).slice(2, 8)}!`,
        email_confirm: true,
        user_metadata: u.user_metadata,
        app_metadata:   u.app_metadata,
      });
      console.log(`✔  Copied ${u.email}`);
    } catch (e: any) {
      if (e.message?.includes('already registered')) {
        console.log(`⎯⎯ Skip (already) ${u.email}`);
      } else {
        console.error(`✖  Failed ${u.email}:`, e);
      }
    }
  }

  console.log('✨  Done');
})();