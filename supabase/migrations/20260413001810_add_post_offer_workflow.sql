-- =============================================================================
-- 内定後ワークフロー: offers テーブル, offer_accepted/offer_declined ステータス
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. offers テーブル
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.offers (
  id              uuid        DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  application_id  text        NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  organization_id text        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  salary          text,
  start_date      date,
  department      text,
  notes           text,
  expires_at      timestamptz,
  created_by      text        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now() NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.offers IS '内定条件（1応募につき最大1件）';

-- 1応募につき1内定
CREATE UNIQUE INDEX idx_offers_application_unique ON public.offers (application_id);
CREATE INDEX idx_offers_organization_id ON public.offers (organization_id);

-- updated_at トリガー
CREATE TRIGGER set_offers_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY offers_all_admin ON public.offers
  USING (
    public.get_my_role() = 'admin'
    AND organization_id IN (SELECT public.get_my_organization_ids())
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    AND organization_id IN (SELECT public.get_my_organization_ids())
  );

CREATE POLICY offers_select_applicant ON public.offers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = offers.application_id
        AND a.applicant_id = auth.uid()::text
    )
  );

-- GRANT
GRANT ALL ON TABLE public.offers TO anon;
GRANT ALL ON TABLE public.offers TO authenticated;
GRANT ALL ON TABLE public.offers TO service_role;

-- ---------------------------------------------------------------------------
-- 2. applications.status CHECK 制約の拡張
-- ---------------------------------------------------------------------------
ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_status_check;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN ('active', 'offered', 'rejected', 'withdrawn', 'offer_accepted', 'offer_declined'));

-- ---------------------------------------------------------------------------
-- 3. notify_application_status_change() の更新（新ステータス対応）
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_application_status_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_title text;
  v_title text;
BEGIN
  -- ステータスが変更されていない場合はスキップ
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- 求人タイトルを取得
  SELECT title INTO v_job_title
  FROM jobs
  WHERE id = NEW.job_id;

  -- 新しいステータスに応じたタイトルを決定
  CASE NEW.status
    WHEN 'offered'         THEN v_title := '内定のお知らせ';
    WHEN 'rejected'        THEN v_title := '選考結果のお知らせ';
    WHEN 'offer_accepted'  THEN v_title := '内定承諾を確認しました';
    WHEN 'offer_declined'  THEN v_title := '内定辞退のお知らせ';
    ELSE v_title := '応募状況が更新されました';
  END CASE;

  -- 通知レコードを作成
  INSERT INTO notifications (
    organization_id,
    user_id,
    type,
    title,
    body,
    action_url,
    metadata
  ) VALUES (
    NEW.organization_id,
    NEW.applicant_id,
    'recruitment_update',
    v_title,
    COALESCE(v_job_title, ''),
    '/applications/' || NEW.id,
    jsonb_build_object(
      'application_id', NEW.id,
      'old_status', OLD.status,
      'new_status', NEW.status
    )
  );

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. 内定承諾時の TODO 自動生成トリガー関数
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_offer_accepted_todos()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idx int := 0;
  v_todo record;
  v_todos text[][] := ARRAY[
    ARRAY['必要書類の提出', '入社に必要な書類を準備して提出してください'],
    ARRAY['入社日の確認', '入社日・オリエンテーション日程を確認してください'],
    ARRAY['雇用契約書の確認・署名', '雇用条件を確認し、契約書に署名してください'],
    ARRAY['入社前健康診断の受診', '指定の医療機関で健康診断を受診してください']
  ];
BEGIN
  -- offer_accepted への遷移時のみ発火
  IF NEW.status != 'offer_accepted' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'offer_accepted' THEN
    RETURN NEW;
  END IF;

  FOR v_idx IN 1..array_length(v_todos, 1)
  LOOP
    INSERT INTO public.applicant_todos (
      organization_id,
      user_id,
      title,
      note,
      source,
      source_id,
      action_url,
      is_important
    ) VALUES (
      NEW.organization_id,
      NEW.applicant_id,
      v_todos[v_idx][1],
      v_todos[v_idx][2],
      'offer',
      NEW.id || ':' || v_idx,
      '/applications/' || NEW.id,
      true
    )
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

-- トリガー
CREATE TRIGGER on_offer_accepted
  AFTER UPDATE OF status ON public.applications
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'offer_accepted')
  EXECUTE FUNCTION public.create_offer_accepted_todos();

-- ---------------------------------------------------------------------------
-- 5. applicant_respond_to_offer RPC
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.applicant_respond_to_offer(
  p_application_id text,
  p_accept boolean
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_applicant_id text;
  v_current_status text;
BEGIN
  -- 呼び出し元が該当応募の本人であることを検証
  SELECT applicant_id, status
    INTO v_applicant_id, v_current_status
  FROM public.applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF v_applicant_id IS NULL OR v_applicant_id != auth.uid()::text THEN
    RAISE EXCEPTION '権限がありません';
  END IF;

  IF v_current_status != 'offered' THEN
    RAISE EXCEPTION '内定状態の応募のみ操作できます';
  END IF;

  UPDATE public.applications
  SET status = CASE WHEN p_accept THEN 'offer_accepted' ELSE 'offer_declined' END
  WHERE id = p_application_id;
END;
$$;

-- GRANT
GRANT EXECUTE ON FUNCTION public.applicant_respond_to_offer(text, boolean)
  TO anon, authenticated, service_role;
