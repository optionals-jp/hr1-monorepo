-- =============================================================================
-- 認証安全性テスト
--
-- 目的: RLS ポリシーの再帰やロール別アクセス制御を検証し、
--       全ユーザーのログインを壊すような変更を事前に検出する。
--
-- 実行方法:
--   Supabase MCP の execute_sql でこのファイルの内容を実行する。
--   全テスト PASS なら "ALL TESTS PASSED" が返る。
--   失敗があれば FAIL 行にテスト名と詳細が出力される。
-- =============================================================================

DO $$
DECLARE
  _result text;
  _passed int := 0;
  _failed int := 0;
  _errors text[] := '{}';
  _test_name text;
  _role text;
  _count int;
BEGIN
  RAISE NOTICE '=== 認証安全性テスト開始 ===';

  -- -----------------------------------------------------------------------
  -- TEST 1: profiles RLS ポリシーに再帰参照がないこと
  --
  -- profiles テーブルの RLS ポリシーの定義に
  -- "FROM profiles" が含まれていないことを検証する。
  -- (SECURITY DEFINER ヘルパー関数経由は OK)
  -- -----------------------------------------------------------------------
  _test_name := 'profiles RLS に再帰的な直接参照がないこと';
  SELECT count(*) INTO _count
  FROM pg_policies
  WHERE tablename = 'profiles'
    AND schemaname = 'public'
    AND (
      -- qual（SELECT/ALL の条件）に profiles テーブルへの直接参照がある
      (qual IS NOT NULL AND qual ~ 'FROM\s+profiles' AND qual NOT LIKE '%get_my_role%')
      OR
      -- with_check（INSERT/UPDATE の条件）にも同様
      (with_check IS NOT NULL AND with_check ~ 'FROM\s+profiles' AND with_check NOT LIKE '%get_my_role%')
    );

  IF _count = 0 THEN
    _passed := _passed + 1;
    RAISE NOTICE 'PASS: %', _test_name;
  ELSE
    _failed := _failed + 1;
    _errors := array_append(_errors, 'FAIL: ' || _test_name || ' (' || _count || '件の再帰ポリシー検出)');
    RAISE NOTICE 'FAIL: % (% 件)', _test_name, _count;
  END IF;

  -- -----------------------------------------------------------------------
  -- TEST 2: profiles_role_check 制約に必要な全ロールが含まれること
  -- -----------------------------------------------------------------------
  _test_name := 'profiles_role_check に全ロールが含まれること';
  DECLARE
    _constraint_def text;
    _missing_roles text[] := '{}';
    _required_role text;
  BEGIN
    SELECT pg_get_constraintdef(oid) INTO _constraint_def
    FROM pg_constraint WHERE conname = 'profiles_role_check';

    FOREACH _required_role IN ARRAY ARRAY['admin', 'applicant', 'employee', 'hr1_admin'] LOOP
      IF _constraint_def NOT LIKE '%' || _required_role || '%' THEN
        _missing_roles := array_append(_missing_roles, _required_role);
      END IF;
    END LOOP;

    IF array_length(_missing_roles, 1) IS NULL THEN
      _passed := _passed + 1;
      RAISE NOTICE 'PASS: %', _test_name;
    ELSE
      _failed := _failed + 1;
      _errors := array_append(_errors, 'FAIL: ' || _test_name || ' (不足: ' || array_to_string(_missing_roles, ', ') || ')');
      RAISE NOTICE 'FAIL: % (不足: %)', _test_name, array_to_string(_missing_roles, ', ');
    END IF;
  END;

  -- -----------------------------------------------------------------------
  -- TEST 3: auth.users の全レコードで必須カラムが NULL でないこと
  --
  -- confirmation_token, recovery_token 等が NULL だと
  -- GoTrue が 500 エラーを返し全ユーザーに影響する。
  -- -----------------------------------------------------------------------
  _test_name := 'auth.users に NULL トークンカラムのレコードがないこと';
  SELECT count(*) INTO _count
  FROM auth.users
  WHERE confirmation_token IS NULL
     OR recovery_token IS NULL
     OR email_change_token_new IS NULL
     OR email_change_token_current IS NULL
     OR reauthentication_token IS NULL
     OR phone_change_token IS NULL;

  IF _count = 0 THEN
    _passed := _passed + 1;
    RAISE NOTICE 'PASS: %', _test_name;
  ELSE
    _failed := _failed + 1;
    _errors := array_append(_errors, 'FAIL: ' || _test_name || ' (' || _count || '件の不正レコード)');
    RAISE NOTICE 'FAIL: % (% 件)', _test_name, _count;
  END IF;

  -- -----------------------------------------------------------------------
  -- TEST 4: auth.users の全レコードに対応する auth.identities が存在すること
  -- -----------------------------------------------------------------------
  _test_name := 'auth.users に対応する auth.identities が存在すること';
  SELECT count(*) INTO _count
  FROM auth.users u
  LEFT JOIN auth.identities i ON u.id = i.user_id
  WHERE i.id IS NULL
    AND u.is_anonymous = false;

  IF _count = 0 THEN
    _passed := _passed + 1;
    RAISE NOTICE 'PASS: %', _test_name;
  ELSE
    _failed := _failed + 1;
    _errors := array_append(_errors, 'FAIL: ' || _test_name || ' (' || _count || '件の孤立ユーザー)');
    RAISE NOTICE 'FAIL: % (% 件)', _test_name, _count;
  END IF;

  -- -----------------------------------------------------------------------
  -- TEST 5: get_my_role() が SECURITY DEFINER であること
  --
  -- RLS ポリシーから安全に呼び出すために必須。
  -- -----------------------------------------------------------------------
  _test_name := 'get_my_role() が SECURITY DEFINER であること';
  SELECT count(*) INTO _count
  FROM pg_proc
  WHERE proname = 'get_my_role'
    AND prosecdef = true;

  IF _count > 0 THEN
    _passed := _passed + 1;
    RAISE NOTICE 'PASS: %', _test_name;
  ELSE
    _failed := _failed + 1;
    _errors := array_append(_errors, 'FAIL: ' || _test_name);
    RAISE NOTICE 'FAIL: %', _test_name;
  END IF;

  -- -----------------------------------------------------------------------
  -- TEST 6: profiles テーブルの全 RLS ポリシーで ALL/SELECT 用ポリシーに
  --         profiles_select_own (id = auth.uid()) が含まれること
  --
  -- これがないと自分のプロフィールすら読めず認証フローが壊れる。
  -- -----------------------------------------------------------------------
  _test_name := 'profiles に profiles_select_own ポリシーが存在すること';
  SELECT count(*) INTO _count
  FROM pg_policies
  WHERE tablename = 'profiles'
    AND schemaname = 'public'
    AND policyname = 'profiles_select_own'
    AND cmd IN ('SELECT', 'ALL');

  IF _count > 0 THEN
    _passed := _passed + 1;
    RAISE NOTICE 'PASS: %', _test_name;
  ELSE
    _failed := _failed + 1;
    _errors := array_append(_errors, 'FAIL: ' || _test_name);
    RAISE NOTICE 'FAIL: %', _test_name;
  END IF;

  -- -----------------------------------------------------------------------
  -- 結果サマリー
  -- -----------------------------------------------------------------------
  RAISE NOTICE '';
  RAISE NOTICE '=== 結果: % PASSED, % FAILED ===', _passed, _failed;

  IF _failed > 0 THEN
    FOR i IN 1..array_length(_errors, 1) LOOP
      RAISE NOTICE '%', _errors[i];
    END LOOP;
    RAISE EXCEPTION 'AUTH SAFETY TESTS FAILED: % failures', _failed;
  ELSE
    RAISE NOTICE 'ALL TESTS PASSED';
  END IF;
END $$;
