-- updated_at自動更新関数
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 社員スキル
create table if not exists employee_skills (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  organization_id text not null references organizations(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 社員資格・認定
create table if not exists employee_certifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  organization_id text not null references organizations(id) on delete cascade,
  name text not null,
  acquired_date date,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- インデックス
create index if not exists idx_employee_skills_user on employee_skills(user_id);
create index if not exists idx_employee_skills_org on employee_skills(organization_id);
create index if not exists idx_employee_certifications_user on employee_certifications(user_id);
create index if not exists idx_employee_certifications_org on employee_certifications(organization_id);

-- RLS有効化
alter table employee_skills enable row level security;
alter table employee_certifications enable row level security;

-- RLSポリシー: 同一組織内のユーザーは閲覧可能
create policy "同一組織内のスキルを閲覧"
  on employee_skills for select
  using (
    organization_id in (
      select organization_id from user_organizations
      where user_id = auth.uid()::text
    )
  );

-- RLSポリシー: 自分のスキルのみ追加・更新・削除
create policy "自分のスキルを管理"
  on employee_skills for all
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

create policy "同一組織内の資格を閲覧"
  on employee_certifications for select
  using (
    organization_id in (
      select organization_id from user_organizations
      where user_id = auth.uid()::text
    )
  );

create policy "自分の資格を管理"
  on employee_certifications for all
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);

-- updated_atトリガー
create trigger set_employee_skills_updated_at
  before update on employee_skills
  for each row execute function update_updated_at_column();

create trigger set_employee_certifications_updated_at
  before update on employee_certifications
  for each row execute function update_updated_at_column();
