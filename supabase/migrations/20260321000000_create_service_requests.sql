-- サービスリクエスト（バグ報告・機能リクエスト）テーブル
create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('bug', 'feature')),
  title text not null,
  description text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- インデックス
create index idx_service_requests_user_id on public.service_requests(user_id);
create index idx_service_requests_type on public.service_requests(type);
create index idx_service_requests_status on public.service_requests(status);

-- RLS
alter table public.service_requests enable row level security;

-- ユーザーは自分のリクエストのみ閲覧・作成可能
create policy "Users can view own service requests"
  on public.service_requests for select
  using (auth.uid() = user_id);

create policy "Users can create service requests"
  on public.service_requests for insert
  with check (auth.uid() = user_id);

-- updated_at 自動更新トリガー
create or replace function public.update_service_requests_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_service_requests_updated_at
  before update on public.service_requests
  for each row
  execute function public.update_service_requests_updated_at();
