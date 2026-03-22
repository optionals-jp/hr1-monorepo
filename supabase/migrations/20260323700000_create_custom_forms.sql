-- カスタムフォーム管理テーブル（応募者・社員向けフォーム）

-- フォームマスター
CREATE TABLE IF NOT EXISTS public.custom_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  target text NOT NULL DEFAULT 'applicant' CHECK (target IN ('applicant', 'employee', 'both')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- フォームフィールド
CREATE TABLE IF NOT EXISTS public.form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.custom_forms(id) ON DELETE CASCADE,
  type text NOT NULL,
  label text NOT NULL,
  description text,
  placeholder text,
  is_required boolean NOT NULL DEFAULT false,
  options text[],
  sort_order integer NOT NULL DEFAULT 0
);

-- フォーム回答
CREATE TABLE IF NOT EXISTS public.form_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.custom_forms(id) ON DELETE CASCADE,
  applicant_id text NOT NULL,
  field_id uuid NOT NULL REFERENCES public.form_fields(id) ON DELETE CASCADE,
  value text,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

-- フォーム変更履歴
CREATE TABLE IF NOT EXISTS public.form_change_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.custom_forms(id) ON DELETE CASCADE,
  changed_by text DEFAULT auth.uid()::text,
  change_type text NOT NULL,
  summary text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- インデックス
CREATE INDEX idx_custom_forms_org ON public.custom_forms(organization_id);
CREATE INDEX idx_form_fields_form ON public.form_fields(form_id, sort_order);
CREATE INDEX idx_form_responses_form ON public.form_responses(form_id);
CREATE INDEX idx_form_responses_applicant ON public.form_responses(applicant_id);
CREATE INDEX idx_form_responses_field ON public.form_responses(field_id);
CREATE INDEX idx_form_change_logs_form ON public.form_change_logs(form_id);

-- RLS有効化
ALTER TABLE public.custom_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_change_logs ENABLE ROW LEVEL SECURITY;

-- custom_forms RLS: 同一組織メンバーは閲覧可能
CREATE POLICY "同一組織メンバーがフォームを閲覧"
  ON public.custom_forms FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()::text
    )
  );

-- custom_forms RLS: 管理者がフォームを管理
CREATE POLICY "管理者がフォームを管理"
  ON public.custom_forms FOR ALL
  USING (
    organization_id IN (
      SELECT uo.organization_id FROM public.user_organizations uo
      JOIN public.profiles p ON p.id = uo.user_id
      WHERE uo.user_id = auth.uid()::text
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT uo.organization_id FROM public.user_organizations uo
      JOIN public.profiles p ON p.id = uo.user_id
      WHERE uo.user_id = auth.uid()::text
        AND p.role = 'admin'
    )
  );

-- form_fields RLS: フォームと同じ組織のメンバーが閲覧可能
CREATE POLICY "フォームフィールドを閲覧"
  ON public.form_fields FOR SELECT
  USING (
    form_id IN (
      SELECT cf.id FROM public.custom_forms cf
      JOIN public.user_organizations uo ON uo.organization_id = cf.organization_id
      WHERE uo.user_id = auth.uid()::text
    )
  );

-- form_fields RLS: 管理者がフィールドを管理
CREATE POLICY "管理者がフィールドを管理"
  ON public.form_fields FOR ALL
  USING (
    form_id IN (
      SELECT cf.id FROM public.custom_forms cf
      JOIN public.user_organizations uo ON uo.organization_id = cf.organization_id
      JOIN public.profiles p ON p.id = uo.user_id
      WHERE uo.user_id = auth.uid()::text
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    form_id IN (
      SELECT cf.id FROM public.custom_forms cf
      JOIN public.user_organizations uo ON uo.organization_id = cf.organization_id
      JOIN public.profiles p ON p.id = uo.user_id
      WHERE uo.user_id = auth.uid()::text
        AND p.role = 'admin'
    )
  );

-- form_responses RLS: 自分の回答を送信可能
CREATE POLICY "自分の回答を送信"
  ON public.form_responses FOR INSERT
  WITH CHECK (applicant_id = auth.uid()::text);

-- form_responses RLS: 自分の回答を閲覧可能
CREATE POLICY "自分の回答を閲覧"
  ON public.form_responses FOR SELECT
  USING (applicant_id = auth.uid()::text);

-- form_responses RLS: 管理者が全回答を閲覧
CREATE POLICY "管理者が回答を閲覧"
  ON public.form_responses FOR SELECT
  USING (
    form_id IN (
      SELECT cf.id FROM public.custom_forms cf
      JOIN public.user_organizations uo ON uo.organization_id = cf.organization_id
      JOIN public.profiles p ON p.id = uo.user_id
      WHERE uo.user_id = auth.uid()::text
        AND p.role = 'admin'
    )
  );

-- form_change_logs RLS: 管理者が変更履歴を管理
CREATE POLICY "管理者が変更履歴を管理"
  ON public.form_change_logs FOR ALL
  USING (
    form_id IN (
      SELECT cf.id FROM public.custom_forms cf
      JOIN public.user_organizations uo ON uo.organization_id = cf.organization_id
      JOIN public.profiles p ON p.id = uo.user_id
      WHERE uo.user_id = auth.uid()::text
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    form_id IN (
      SELECT cf.id FROM public.custom_forms cf
      JOIN public.user_organizations uo ON uo.organization_id = cf.organization_id
      JOIN public.profiles p ON p.id = uo.user_id
      WHERE uo.user_id = auth.uid()::text
        AND p.role = 'admin'
    )
  );
