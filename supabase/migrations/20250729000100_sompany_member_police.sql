-- ───────────────────────────────────────────────
-- recruiter / company_admin / owner が
-- 自社の companies 行を SELECT / INSERT / UPDATE / DELETE できる
-- ───────────────────────────────────────────────
create policy "company_members_can_access_company"
on public.companies
as permissive
for all                               -- ← 必要に応じて for select, for update… に分割しても可
using (
  -- ① オーナー（creator がそのまま user_id に入る想定）
  auth.uid() = user_id

  -- ② company_members 経由で紐づくユーザー
  or exists (
    select 1
      from public.company_members cm
     where cm.company_id = id         -- companies.id
       and cm.user_id    = auth.uid() -- ログインユーザー
  )
);
