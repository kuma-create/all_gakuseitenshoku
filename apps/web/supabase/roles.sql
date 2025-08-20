-- 共通ロール定義（最初に実行される）
CREATE ROLE admin NOLOGIN;          -- 既に存在する場合は IF NOT EXISTS を付けても良い
-- 今後プロジェクトで使うロールをここに追記
