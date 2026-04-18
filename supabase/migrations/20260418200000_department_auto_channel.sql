-- 部署作成時に自動でグループチャット(channel)を作成し、メンバー変更に追従する
-- - departments INSERT → 部署チャンネル作成
-- - departments UPDATE name → チャンネル名を同期
-- - employee_departments INSERT → チャンネルメンバー追加
-- - employee_departments DELETE → チャンネルメンバー削除

-- 1. 指定された部署のチャンネルを作成 (既存があればそのIDを返す)
CREATE OR REPLACE FUNCTION public.ensure_department_channel(p_department_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dept record;
  v_thread_id text;
BEGIN
  SELECT id, name, organization_id INTO v_dept
  FROM departments
  WHERE id = p_department_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT id INTO v_thread_id
  FROM message_threads
  WHERE organization_id = v_dept.organization_id
    AND is_channel = true
    AND channel_type = 'department'
    AND channel_source_id = v_dept.id::text;

  IF v_thread_id IS NULL THEN
    INSERT INTO message_threads (
      organization_id, is_channel, channel_name, channel_type, channel_source_id, title
    )
    VALUES (
      v_dept.organization_id, true, v_dept.name, 'department', v_dept.id::text, v_dept.name || ' チャンネル'
    )
    RETURNING id INTO v_thread_id;
  END IF;

  -- 既に部署所属のメンバーをチャンネルに同期 (冪等)
  INSERT INTO channel_members (thread_id, user_id)
  SELECT v_thread_id, ed.user_id
  FROM employee_departments ed
  WHERE ed.department_id = v_dept.id
  ON CONFLICT DO NOTHING;

  RETURN v_thread_id;
END;
$$;

ALTER FUNCTION public.ensure_department_channel(text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.ensure_department_channel(text) TO authenticated, service_role;

-- 2. departments INSERT トリガー
CREATE OR REPLACE FUNCTION public.trigger_department_insert_channel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_department_channel(NEW.id);
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.trigger_department_insert_channel() OWNER TO postgres;

DROP TRIGGER IF EXISTS departments_auto_channel_insert ON public.departments;
CREATE TRIGGER departments_auto_channel_insert
  AFTER INSERT ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_department_insert_channel();

-- 3. departments UPDATE (name) トリガー → チャンネル名を同期
CREATE OR REPLACE FUNCTION public.trigger_department_update_channel_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    UPDATE message_threads
    SET channel_name = NEW.name,
        title = NEW.name || ' チャンネル'
    WHERE organization_id = NEW.organization_id
      AND is_channel = true
      AND channel_type = 'department'
      AND channel_source_id = NEW.id::text;
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.trigger_department_update_channel_name() OWNER TO postgres;

DROP TRIGGER IF EXISTS departments_auto_channel_update ON public.departments;
CREATE TRIGGER departments_auto_channel_update
  AFTER UPDATE OF name ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_department_update_channel_name();

-- 4. employee_departments INSERT トリガー → チャンネルにメンバー追加
CREATE OR REPLACE FUNCTION public.trigger_employee_department_insert_channel_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread_id text;
BEGIN
  SELECT mt.id INTO v_thread_id
  FROM message_threads mt
  JOIN departments d ON d.id::text = mt.channel_source_id
  WHERE d.id = NEW.department_id
    AND mt.is_channel = true
    AND mt.channel_type = 'department';

  IF v_thread_id IS NOT NULL THEN
    INSERT INTO channel_members (thread_id, user_id)
    VALUES (v_thread_id, NEW.user_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.trigger_employee_department_insert_channel_member() OWNER TO postgres;

DROP TRIGGER IF EXISTS employee_departments_auto_channel_add ON public.employee_departments;
CREATE TRIGGER employee_departments_auto_channel_add
  AFTER INSERT ON public.employee_departments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_employee_department_insert_channel_member();

-- 5. employee_departments DELETE トリガー → チャンネルからメンバー削除
CREATE OR REPLACE FUNCTION public.trigger_employee_department_delete_channel_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_thread_id text;
BEGIN
  SELECT mt.id INTO v_thread_id
  FROM message_threads mt
  JOIN departments d ON d.id::text = mt.channel_source_id
  WHERE d.id = OLD.department_id
    AND mt.is_channel = true
    AND mt.channel_type = 'department';

  IF v_thread_id IS NOT NULL THEN
    DELETE FROM channel_members
    WHERE thread_id = v_thread_id
      AND user_id = OLD.user_id;
  END IF;

  RETURN OLD;
END;
$$;

ALTER FUNCTION public.trigger_employee_department_delete_channel_member() OWNER TO postgres;

DROP TRIGGER IF EXISTS employee_departments_auto_channel_remove ON public.employee_departments;
CREATE TRIGGER employee_departments_auto_channel_remove
  AFTER DELETE ON public.employee_departments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_employee_department_delete_channel_member();

-- 6. 既存部署に対するバックフィル (未作成のチャンネルを全て作成)
DO $$
DECLARE
  v_dept record;
BEGIN
  FOR v_dept IN SELECT id FROM departments LOOP
    PERFORM public.ensure_department_channel(v_dept.id);
  END LOOP;
END $$;
