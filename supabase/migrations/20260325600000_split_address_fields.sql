-- 住所フィールドを詳細カラムに分割
-- current_address / registered_address → postal_code, prefecture, city, street_address, building

-- 現住所の詳細カラム追加
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_postal_code text,
  ADD COLUMN IF NOT EXISTS current_prefecture text,
  ADD COLUMN IF NOT EXISTS current_city text,
  ADD COLUMN IF NOT EXISTS current_street_address text,
  ADD COLUMN IF NOT EXISTS current_building text;

-- 住民票住所の詳細カラム追加
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS registered_postal_code text,
  ADD COLUMN IF NOT EXISTS registered_prefecture text,
  ADD COLUMN IF NOT EXISTS registered_city text,
  ADD COLUMN IF NOT EXISTS registered_street_address text,
  ADD COLUMN IF NOT EXISTS registered_building text;

-- 旧カラム削除
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS current_address,
  DROP COLUMN IF EXISTS registered_address;

-- create_user_with_org RPC を住所詳細フィールド対応に更新
DROP FUNCTION IF EXISTS public.create_user_with_org(text, text, text, text, text, text, text, integer, uuid[], text, text, date, date, text, text, text);

CREATE OR REPLACE FUNCTION public.create_user_with_org(
  p_user_id text,
  p_email text,
  p_display_name text DEFAULT NULL,
  p_role text DEFAULT 'employee',
  p_organization_id text DEFAULT NULL,
  p_position text DEFAULT NULL,
  p_department_ids uuid[] DEFAULT '{}',
  p_name_kana text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_hire_date date DEFAULT NULL,
  p_birth_date date DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_current_postal_code text DEFAULT NULL,
  p_current_prefecture text DEFAULT NULL,
  p_current_city text DEFAULT NULL,
  p_current_street_address text DEFAULT NULL,
  p_current_building text DEFAULT NULL,
  p_registered_postal_code text DEFAULT NULL,
  p_registered_prefecture text DEFAULT NULL,
  p_registered_city text DEFAULT NULL,
  p_registered_street_address text DEFAULT NULL,
  p_registered_building text DEFAULT NULL,
  p_hiring_type text DEFAULT NULL,
  p_graduation_year integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dept_id uuid;
BEGIN
  INSERT INTO public.profiles (
    id, email, display_name, role, position, name_kana, phone,
    hire_date, birth_date, gender,
    current_postal_code, current_prefecture, current_city, current_street_address, current_building,
    registered_postal_code, registered_prefecture, registered_city, registered_street_address, registered_building,
    hiring_type, graduation_year
  )
  VALUES (
    p_user_id, p_email, p_display_name, p_role, p_position, p_name_kana, p_phone,
    p_hire_date, p_birth_date, p_gender,
    p_current_postal_code, p_current_prefecture, p_current_city, p_current_street_address, p_current_building,
    p_registered_postal_code, p_registered_prefecture, p_registered_city, p_registered_street_address, p_registered_building,
    p_hiring_type, p_graduation_year
  );

  IF p_organization_id IS NOT NULL THEN
    INSERT INTO public.user_organizations (user_id, organization_id)
    VALUES (p_user_id, p_organization_id);
  END IF;

  IF p_department_ids IS NOT NULL AND array_length(p_department_ids, 1) > 0 THEN
    FOREACH v_dept_id IN ARRAY p_department_ids
    LOOP
      INSERT INTO public.employee_departments (user_id, department_id)
      VALUES (p_user_id, v_dept_id);
    END LOOP;
  END IF;

  RETURN jsonb_build_object('id', p_user_id, 'email', p_email);
END;
$$;
