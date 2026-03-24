-- create_user_with_org に追加フィールドを渡せるように拡張
DROP FUNCTION IF EXISTS public.create_user_with_org(text, text, text, text, text, text, text, integer, uuid[]);

CREATE OR REPLACE FUNCTION public.create_user_with_org(
  p_user_id text,
  p_email text,
  p_display_name text DEFAULT NULL,
  p_role text DEFAULT 'employee',
  p_organization_id text DEFAULT NULL,
  p_position text DEFAULT NULL,
  p_hiring_type text DEFAULT NULL,
  p_graduation_year integer DEFAULT NULL,
  p_department_ids uuid[] DEFAULT '{}',
  p_name_kana text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_hire_date date DEFAULT NULL,
  p_birth_date date DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_current_address text DEFAULT NULL,
  p_registered_address text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dept_id uuid;
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role, position, hiring_type, graduation_year, name_kana, phone, hire_date, birth_date, gender, current_address, registered_address)
  VALUES (p_user_id, p_email, p_display_name, p_role, p_position, p_hiring_type, p_graduation_year, p_name_kana, p_phone, p_hire_date, p_birth_date, p_gender, p_current_address, p_registered_address);

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
