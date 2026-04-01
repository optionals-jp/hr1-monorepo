-- リードの冗長フィールドを削除（name/contact_* に統合済み）
ALTER TABLE public.bc_leads
  DROP COLUMN IF EXISTS company_name,
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS phone;
