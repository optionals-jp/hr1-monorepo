-- リードを企業ベースに変更
-- name = 企業名（必須）
-- 担当者情報を別フィールドに

ALTER TABLE public.bc_leads
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text;

-- 既存データ移行: name→contact_name, company_name→name
UPDATE public.bc_leads
  SET contact_name = name,
      contact_email = email,
      contact_phone = phone,
      name = COALESCE(company_name, name)
  WHERE contact_name IS NULL;

COMMENT ON COLUMN public.bc_leads.name IS 'リード企業名（必須）';
COMMENT ON COLUMN public.bc_leads.contact_name IS '担当者名';
COMMENT ON COLUMN public.bc_leads.contact_email IS '担当者メールアドレス';
COMMENT ON COLUMN public.bc_leads.contact_phone IS '担当者電話番号';
