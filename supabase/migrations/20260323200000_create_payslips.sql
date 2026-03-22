-- 給与明細テーブル（CSV取込による月次給与情報）
create table if not exists public.payslips (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  user_id text not null,
  year integer not null,
  month integer not null check (month between 1 and 12),
  base_salary integer not null default 0,
  allowances jsonb not null default '[]',
  deductions jsonb not null default '[]',
  gross_pay integer not null default 0,
  net_pay integer not null default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, user_id, year, month)
);

-- インデックス
create index idx_payslips_org on public.payslips(organization_id);
create index idx_payslips_user on public.payslips(user_id);
create index idx_payslips_year_month on public.payslips(year, month);

-- RLS有効化
alter table public.payslips enable row level security;

-- 自分の給与明細を閲覧
create policy "自分の給与明細を閲覧"
  on public.payslips for select
  using (user_id = auth.uid()::text);

-- 管理者は組織内の給与明細を管理
create policy "管理者は組織内の給与明細を管理"
  on public.payslips for all
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
create trigger set_payslips_updated_at
  before update on public.payslips
  for each row
  execute function public.update_updated_at_column();
