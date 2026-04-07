-- カスタムワークフローテンプレート
create table if not exists workflow_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  icon text default '📝',
  fields jsonb not null default '[]',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- fields の構造例:
-- [
--   { "key": "destination", "label": "出張先", "type": "text", "required": true },
--   { "key": "amount", "label": "金額", "type": "number", "required": false },
--   { "key": "start_date", "label": "開始日", "type": "date", "required": true },
--   { "key": "notes", "label": "備考", "type": "textarea", "required": false }
-- ]
-- type: "text" | "number" | "date" | "textarea" | "select"
-- select の場合: { "key": "...", "label": "...", "type": "select", "options": ["A", "B", "C"] }

create index if not exists idx_workflow_templates_org on workflow_templates(organization_id);

-- RLS
alter table workflow_templates enable row level security;

create policy "workflow_templates_select"
  on workflow_templates for select
  using (
    organization_id in (select public.get_my_organization_ids())
  );

create policy "workflow_templates_admin"
  on workflow_templates for all
  using (public.get_my_role() = 'admin');

-- updated_at トリガー
create trigger set_updated_at_workflow_templates
  before update on workflow_templates
  for each row execute function update_updated_at_column();

-- workflow_requests の request_type 制約を緩和（カスタムテンプレートIDも許可）
-- 既存の CHECK 制約を削除してテキスト制約に変更
alter table workflow_requests drop constraint if exists workflow_requests_request_type_check;

notify pgrst, 'reload schema';
