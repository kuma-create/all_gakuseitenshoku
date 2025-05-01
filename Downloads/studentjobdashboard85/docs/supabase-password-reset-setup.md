# Supabaseパスワードリセット設定

Supabaseでパスワードリセットを有効にするための設定手順：

1. Supabaseダッシュボードにログインします。
2. プロジェクトを選択します。
3. 「Authentication」→「Email Templates」に移動します。
4. 「Password Reset」テンプレートを編集します。
5. メールの件名と本文をカスタマイズします。
6. リダイレクトURLが正しく設定されていることを確認します（例：`https://yourdomain.com/auth/update-password`）。
7. 変更を保存します。

## リダイレクトURL設定

パスワードリセットリンクをクリックした後のリダイレクト先を設定するには：

1. Supabaseダッシュボードの「Authentication」→「URL Configuration」に移動します。
2. 「Redirect URLs」セクションで、以下のURLを追加します：
   - 開発環境：`http://localhost:3000/auth/update-password`
   - 本番環境：`https://yourdomain.com/auth/update-password`
3. 変更を保存します。
