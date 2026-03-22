-- 各種申請（汎用ワークフロー）テーブル
create table if not exists public.workflow_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null references public.organizations(id) on delete cascade,
  user_id text not null,
  request_type text not null check (request_type in (
    'paid_leave', 'overtime', 'business_trip', 'expense'
  )),
  status text not null default 'pending' check (status in (
    'pending', 'approved', 'rejected', 'cancelled'
  )),
  request_data jsonb not null default '{}',
  reason text not null,
  reviewed_by text,
  reviewed_at timestamptz,
  review_comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- インデックス
create index idx_workflow_requests_org on public.workflow_requests(organization_id);
create index idx_workflow_requests_user on public.workflow_requests(user_id);
create index idx_workflow_requests_type on public.workflow_requests(request_type);
create index idx_workflow_requests_status on public.workflow_requests(status);

-- RLS有効化
alter table public.workflow_requests enable row level security;

-- 自分の申請を閲覧
create policy "自分の申請を閲覧"
  on public.workflow_requests for select
  using (user_id = auth.uid()::text);

-- 自分の申請を作成
create policy "自分の申請を作成"
  on public.workflow_requests for insert
  with check (user_id = auth.uid()::text);

-- 自分の未承認申請を取消
create policy "自分の未承認申請を取消"
  on public.workflow_requests for update
  using (user_id = auth.uid()::text and status = 'pending')
  with check (status = 'cancelled');

-- 管理者は組織内の全申請を閲覧
create policy "管理者は組織内の申請を閲覧"
  on public.workflow_requests for select
  using (
    organization_id in (
      select uo.organization_id from public.user_organizations uo
      join public.profiles p on p.id = uo.user_id
      where uo.user_id = auth.uid()::text
        and p.role = 'admin'
    )
  );

-- 管理者は組織内の申請を更新（承認・却下）
create policy "管理者は組織内の申請を更新"
  on public.workflow_requests for update
  using (
    organization_id in (
      select uo.organization_id from public.user_organizations uo
      join public.profiles p on p.id = uo.user_id
      where uo.user_id = auth.uid()::text
        and p.role = 'admin'
    )
  );

-- updated_at トリガー
create trigger set_workflow_requests_updated_at
  before update on public.workflow_requests
  for each row
  execute function public.update_updated_at_column();
