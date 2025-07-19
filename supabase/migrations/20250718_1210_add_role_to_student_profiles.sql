/* ---------- Up ---------- */
-- 1) 列を追加
ALTER TABLE public.student_profiles
ADD COLUMN role TEXT;

-- 2) 既存レコードへ初期同期
UPDATE public.student_profiles AS sp
SET    role = ur.role
FROM   public.user_roles AS ur
WHERE  ur.user_id = sp.user_id;

-- 3) user_roles → student_profiles 同期トリガ
CREATE OR REPLACE FUNCTION public.propagate_role_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.student_profiles
  SET    role = NEW.role
  WHERE  user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_roles_after_ins_upd ON public.user_roles;
CREATE TRIGGER trg_user_roles_after_ins_upd
AFTER INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.propagate_role_to_profile();

-- 4) student_profiles 側で user_id が変わった場合に role を引き直すトリガ
CREATE OR REPLACE FUNCTION public.refresh_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.role := (
    SELECT role FROM public.user_roles
    WHERE  user_id = NEW.user_id
    LIMIT 1
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_before_ins_upd ON public.student_profiles;
CREATE TRIGGER trg_profiles_before_ins_upd
BEFORE INSERT OR UPDATE ON public.student_profiles
FOR EACH ROW EXECUTE FUNCTION public.refresh_profile_role();
/* ---------- Down ---------- */
DROP TRIGGER IF EXISTS trg_user_roles_after_ins_upd ON public.user_roles;
DROP FUNCTION IF EXISTS public.propagate_role_to_profile();

DROP TRIGGER IF EXISTS trg_profiles_before_ins_upd ON public.student_profiles;
DROP FUNCTION IF EXISTS public.refresh_profile_role();

ALTER TABLE public.student_profiles
DROP COLUMN IF EXISTS role;