-- ========================================================================
-- サインアップ初期セットアップ RPC
-- メール確認完了後（認証済み状態）に呼び出し、
-- SECURITY DEFINER でRLSを迂回してprofile・organization・紐付けを一括作成する。
--
-- 修正履歴:
--   - 二重送信による組織重複作成を防ぐガード節を追加
--   - ON CONFLICT DO NOTHING に変更（既存roleの無条件上書きを防止）
--   - REVOKE/GRANT で anon ロールからの実行を禁止
-- ========================================================================
CREATE OR REPLACE FUNCTION public.signup_setup(
  p_email        text,
  p_display_name text,
  p_phone        text,
  p_company_name text,
  p_industry     text,
  p_employee_count text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id text;
  v_org_id  text;
BEGIN
  v_user_id := auth.uid()::text;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 二重初期化ガード
  -- user_organizations に既にレコードがある = 初期化済み
  -- ネットワークエラーによるリトライや二重送信で組織が重複作成されるのを防ぐ
  IF EXISTS (
    SELECT 1 FROM public.user_organizations WHERE user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Already initialized: user already belongs to an organization';
  END IF;

  -- 1. プロフィール作成（admin ロールで登録）
  -- ON CONFLICT DO NOTHING: 既存プロフィールのroleを強制上書きしない
  INSERT INTO public.profiles (id, email, display_name, phone, role)
  VALUES (v_user_id, p_email, p_display_name, p_phone, 'admin')
  ON CONFLICT (id) DO NOTHING;

  -- 2. 組織作成
  v_org_id := gen_random_uuid()::text;
  INSERT INTO public.organizations (id, name, industry, employee_count)
  VALUES (v_org_id, p_company_name, p_industry, p_employee_count);

  -- 3. ユーザーと組織を紐付け
  INSERT INTO public.user_organizations (user_id, organization_id)
  VALUES (v_user_id, v_org_id);
END;
$$;

-- authenticated ロールのみに実行権限を付与（anon は不可）
REVOKE EXECUTE ON FUNCTION public.signup_setup(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.signup_setup(text, text, text, text, text, text) TO authenticated;
