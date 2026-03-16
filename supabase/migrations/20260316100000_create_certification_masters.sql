-- 資格マスタテーブル
create table if not exists certification_masters (
  id uuid primary key default gen_random_uuid(),
  organization_id text references organizations(id) on delete cascade,
  name text not null,
  category text,
  created_at timestamptz not null default now()
);

-- インデックス
create index if not exists idx_certification_masters_org on certification_masters(organization_id);

-- RLS有効化
alter table certification_masters enable row level security;

-- RLSポリシー: システム共通（org_id is null）または同一組織のマスタを閲覧可能
create policy "資格マスタを閲覧"
  on certification_masters for select
  using (
    organization_id is null
    or organization_id in (
      select organization_id from user_organizations
      where user_id = auth.uid()::text
    )
  );

-- RLSポリシー: 自組織のマスタのみ追加・更新・削除（システム共通は変更不可）
create policy "自組織の資格マスタを管理"
  on certification_masters for insert
  with check (
    organization_id is not null
    and organization_id in (
      select organization_id from user_organizations
      where user_id = auth.uid()::text
    )
  );

create policy "自組織の資格マスタを更新"
  on certification_masters for update
  using (
    organization_id is not null
    and organization_id in (
      select organization_id from user_organizations
      where user_id = auth.uid()::text
    )
  );

create policy "自組織の資格マスタを削除"
  on certification_masters for delete
  using (
    organization_id is not null
    and organization_id in (
      select organization_id from user_organizations
      where user_id = auth.uid()::text
    )
  );

-- 代表的な資格をシード（システム共通: organization_id = null）
insert into certification_masters (organization_id, name, category) values
  -- IT・情報処理
  (null, '基本情報技術者', 'IT・情報処理'),
  (null, '応用情報技術者', 'IT・情報処理'),
  (null, '情報処理安全確保支援士', 'IT・情報処理'),
  (null, 'ITストラテジスト', 'IT・情報処理'),
  (null, 'システムアーキテクト', 'IT・情報処理'),
  (null, 'プロジェクトマネージャ', 'IT・情報処理'),
  (null, 'ネットワークスペシャリスト', 'IT・情報処理'),
  (null, 'データベーススペシャリスト', 'IT・情報処理'),
  (null, 'ITパスポート', 'IT・情報処理'),
  (null, 'AWS認定ソリューションアーキテクト', 'IT・情報処理'),
  (null, 'AWS認定デベロッパー', 'IT・情報処理'),
  (null, 'Google Cloud Professional Cloud Architect', 'IT・情報処理'),
  (null, 'Azure Solutions Architect Expert', 'IT・情報処理'),
  -- ビジネス・マネジメント
  (null, 'PMP（プロジェクトマネジメント・プロフェッショナル）', 'ビジネス・マネジメント'),
  (null, '中小企業診断士', 'ビジネス・マネジメント'),
  (null, '社会保険労務士', 'ビジネス・マネジメント'),
  (null, 'ビジネス実務法務検定 2級', 'ビジネス・マネジメント'),
  (null, 'ビジネス実務法務検定 3級', 'ビジネス・マネジメント'),
  (null, '衛生管理者（第一種）', 'ビジネス・マネジメント'),
  (null, '衛生管理者（第二種）', 'ビジネス・マネジメント'),
  -- 会計・財務
  (null, '日商簿記検定 1級', '会計・財務'),
  (null, '日商簿記検定 2級', '会計・財務'),
  (null, '日商簿記検定 3級', '会計・財務'),
  (null, '公認会計士', '会計・財務'),
  (null, '税理士', '会計・財務'),
  (null, 'ファイナンシャルプランナー（FP）2級', '会計・財務'),
  (null, 'ファイナンシャルプランナー（FP）3級', '会計・財務'),
  -- 語学
  (null, 'TOEIC 600点以上', '語学'),
  (null, 'TOEIC 730点以上', '語学'),
  (null, 'TOEIC 860点以上', '語学'),
  (null, 'TOEIC 900点以上', '語学'),
  (null, '英検 1級', '語学'),
  (null, '英検 準1級', '語学'),
  (null, '日本語能力試験（JLPT）N1', '語学'),
  (null, '日本語能力試験（JLPT）N2', '語学'),
  -- 法務・不動産
  (null, '宅地建物取引士', '法務・不動産'),
  (null, '行政書士', '法務・不動産'),
  (null, '司法書士', '法務・不動産'),
  (null, '弁理士', '法務・不動産'),
  -- その他
  (null, '普通自動車運転免許', 'その他'),
  (null, '危険物取扱者 乙種第4類', 'その他'),
  (null, 'MOS（Microsoft Office Specialist）', 'その他'),
  (null, '秘書検定 2級', 'その他');

-- PostgRESTスキーマキャッシュリロード
notify pgrst, 'reload schema';
