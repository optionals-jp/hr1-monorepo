-- 有給・休暇残日数管理テーブル
create table if not exists public.leave_balances (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  user_id text not null,
  fiscal_year integer not null,
  granted_days numeric(4,1) not null default 0,
  used_days numeric(4,1) not null default 0,
  carried_over_days numeric(4,1) not null default 0,
  expired_days numeric(4,1) not null default 0,
  grant_date date not null,
  expiry_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, organization_id, fiscal_year)
);

-- インデックス
create index idx_leave_balances_org on public.leave_balances(organization_id);
create index idx_leave_balances_user on public.leave_balances(user_id);
create index idx_leave_balances_year on public.leave_balances(fiscal_year);

-- RLS有効化
alter table public.leave_balances enable row level security;

-- 自分の残日数を閲覧
create policy "自分の残日数を閲覧"
  on public.leave_balances for select
  using (user_id = auth.uid()::text);

-- 管理者は組織内の残日数を管理
create policy "管理者は組織内の残日数を管理"
  on public.leave_balances for all
  using (
    organization_id in (
      select uo.organization_id from public.user_organizations uo
      join public.profiles p on p.id = uo.user_id
      where uo.user_id = auth.uid()::text
        and p.role = 'admin'
    )
  )
  with check (
    organization_id in (
      select uo.organization_id from public.user_organizations uo
      join public.profiles p on p.id = uo.user_id
      where uo.user_id = auth.uid()::text
        and p.role = 'admin'
    )
  );

-- updated_at トリガー
create trigger set_leave_balances_updated_at
  before update on public.leave_balances
  for each row
  execute function public.update_updated_at_column();
