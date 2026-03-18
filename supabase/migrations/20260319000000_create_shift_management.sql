-- シフト希望（社員が提出する月次シフトリクエスト）
create table if not exists shift_requests (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  organization_id text not null references organizations(id) on delete cascade,
  target_date date not null,
  start_time time,
  end_time time,
  is_available boolean not null default true,
  note text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, organization_id, target_date)
);

-- 確定シフト（管理者が公開するシフトスケジュール）
create table if not exists shift_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  organization_id text not null references organizations(id) on delete cascade,
  target_date date not null,
  start_time time not null,
  end_time time not null,
  position_label text,
  note text,
  status text not null default 'draft',
  published_at timestamptz,
  published_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, organization_id, target_date)
);

-- インデックス
create index if not exists idx_shift_requests_user_org on shift_requests(user_id, organization_id, target_date);
create index if not exists idx_shift_requests_org_date on shift_requests(organization_id, target_date);
create index if not exists idx_shift_schedules_user_org on shift_schedules(user_id, organization_id, target_date);
create index if not exists idx_shift_schedules_org_date on shift_schedules(organization_id, target_date);

-- RLS有効化
alter table shift_requests enable row level security;
alter table shift_schedules enable row level security;

-- RLSポリシー: シフト希望
create policy "同一組織内のシフト希望を閲覧"
  on shift_requests for select
  using (
    organization_id in (
      select organization_id from user_organizations
      where user_id = auth.uid()::text
    )
  );

create policy "自分のシフト希望を管理"
  on shift_requests for all
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

-- RLSポリシー: 確定シフト（閲覧は同一組織、編集は管理者のみ）
create policy "同一組織内の確定シフトを閲覧"
  on shift_schedules for select
  using (
    organization_id in (
      select organization_id from user_organizations
      where user_id = auth.uid()::text
    )
  );

create policy "管理者が確定シフトを管理"
  on shift_schedules for all
  using (
    organization_id in (
      select uo.organization_id from user_organizations uo
      join profiles p on p.id = uo.user_id
      where uo.user_id = auth.uid()::text
        and p.role = 'admin'
    )
  )
  with check (
    organization_id in (
      select uo.organization_id from user_organizations uo
      join profiles p on p.id = uo.user_id
      where uo.user_id = auth.uid()::text
        and p.role = 'admin'
    )
  );

-- updated_atトリガー
create trigger set_shift_requests_updated_at
  before update on shift_requests
  for each row execute function update_updated_at_column();

create trigger set_shift_schedules_updated_at
  before update on shift_schedules
  for each row execute function update_updated_at_column();
