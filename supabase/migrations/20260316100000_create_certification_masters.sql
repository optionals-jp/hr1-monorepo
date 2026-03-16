-- 資格マスタテーブル
create table if not exists certification_masters (
  id uuid primary key default gen_random_uuid(),
  organization_id text references organizations(id) on delete cascade,
  name text not null,
  category text,
  has_score boolean not null default false,
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
insert into certification_masters (organization_id, name, category, has_score) values
  -- IT・情報処理
  (null, '基本情報技術者', 'IT・情報処理', false),
  (null, '応用情報技術者', 'IT・情報処理', false),
  (null, '情報処理安全確保支援士', 'IT・情報処理', false),
  (null, 'ITストラテジスト', 'IT・情報処理', false),
  (null, 'システムアーキテクト', 'IT・情報処理', false),
  (null, 'プロジェクトマネージャ', 'IT・情報処理', false),
  (null, 'ネットワークスペシャリスト', 'IT・情報処理', false),
  (null, 'データベーススペシャリスト', 'IT・情報処理', false),
  (null, 'ITパスポート', 'IT・情報処理', false),
  (null, 'AWS認定ソリューションアーキテクト', 'IT・情報処理', false),
  (null, 'AWS認定デベロッパー', 'IT・情報処理', false),
  (null, 'Google Cloud Professional Cloud Architect', 'IT・情報処理', false),
  (null, 'Azure Solutions Architect Expert', 'IT・情報処理', false),
  -- ビジネス・マネジメント
  (null, 'PMP（プロジェクトマネジメント・プロフェッショナル）', 'ビジネス・マネジメント', false),
  (null, '中小企業診断士', 'ビジネス・マネジメント', false),
  (null, '社会保険労務士', 'ビジネス・マネジメント', false),
  (null, 'ビジネス実務法務検定 2級', 'ビジネス・マネジメント', false),
  (null, 'ビジネス実務法務検定 3級', 'ビジネス・マネジメント', false),
  (null, '衛生管理者（第一種）', 'ビジネス・マネジメント', false),
  (null, '衛生管理者（第二種）', 'ビジネス・マネジメント', false),
  -- 会計・財務
  (null, '日商簿記検定 1級', '会計・財務', false),
  (null, '日商簿記検定 2級', '会計・財務', false),
  (null, '日商簿記検定 3級', '会計・財務', false),
  (null, '公認会計士', '会計・財務', false),
  (null, '税理士', '会計・財務', false),
  (null, 'ファイナンシャルプランナー（FP）2級', '会計・財務', false),
  (null, 'ファイナンシャルプランナー（FP）3級', '会計・財務', false),
  -- 語学
  (null, 'TOEIC', '語学', true),
  (null, 'TOEFL iBT', '語学', true),
  (null, '英検 1級', '語学', false),
  (null, '英検 準1級', '語学', false),
  (null, '日本語能力試験（JLPT）N1', '語学', false),
  (null, '日本語能力試験（JLPT）N2', '語学', false),
  -- 法務・不動産
  (null, '宅地建物取引士', '法務・不動産', false),
  (null, '行政書士', '法務・不動産', false),
  (null, '司法書士', '法務・不動産', false),
  (null, '弁理士', '法務・不動産', false),
  -- 医療・福祉
  (null, '看護師', '医療・福祉', false),
  (null, '准看護師', '医療・福祉', false),
  (null, '薬剤師', '医療・福祉', false),
  (null, '介護福祉士', '医療・福祉', false),
  (null, '社会福祉士', '医療・福祉', false),
  (null, '精神保健福祉士', '医療・福祉', false),
  (null, '理学療法士', '医療・福祉', false),
  (null, '作業療法士', '医療・福祉', false),
  (null, '管理栄養士', '医療・福祉', false),
  (null, '医療事務技能審査試験（メディカルクラーク）', '医療・福祉', false),
  -- 建設・不動産
  (null, '一級建築士', '建設・不動産', false),
  (null, '二級建築士', '建設・不動産', false),
  (null, '1級建築施工管理技士', '建設・不動産', false),
  (null, '2級建築施工管理技士', '建設・不動産', false),
  (null, '1級土木施工管理技士', '建設・不動産', false),
  (null, 'マンション管理士', '建設・不動産', false),
  (null, '管理業務主任者', '建設・不動産', false),
  -- 製造・技術
  (null, '電気工事士（第一種）', '製造・技術', false),
  (null, '電気工事士（第二種）', '製造・技術', false),
  (null, '電気主任技術者（第三種）', '製造・技術', false),
  (null, 'ボイラー技士（二級）', '製造・技術', false),
  (null, '品質管理検定（QC検定）2級', '製造・技術', false),
  (null, '品質管理検定（QC検定）3級', '製造・技術', false),
  (null, 'ISO内部監査員', '製造・技術', false),
  -- 物流・貿易
  (null, '通関士', '物流・貿易', false),
  (null, '貿易実務検定 B級', '物流・貿易', false),
  (null, '貿易実務検定 C級', '物流・貿易', false),
  (null, 'フォークリフト運転技能者', '物流・貿易', false),
  -- 人事・労務
  (null, 'キャリアコンサルタント', '人事・労務', false),
  (null, 'メンタルヘルス・マネジメント検定 II種', '人事・労務', false),
  (null, 'メンタルヘルス・マネジメント検定 III種', '人事・労務', false),
  (null, '産業カウンセラー', '人事・労務', false),
  -- マーケティング・営業
  (null, 'ウェブ解析士', 'マーケティング・営業', false),
  (null, '上級ウェブ解析士', 'マーケティング・営業', false),
  (null, 'Google アナリティクス認定資格', 'マーケティング・営業', false),
  (null, 'Google 広告認定資格', 'マーケティング・営業', false),
  (null, '販売士（リテールマーケティング）2級', 'マーケティング・営業', false),
  (null, '販売士（リテールマーケティング）3級', 'マーケティング・営業', false),
  -- 教育
  (null, '教員免許（小学校）', '教育', false),
  (null, '教員免許（中学校）', '教育', false),
  (null, '教員免許（高等学校）', '教育', false),
  -- 環境・安全
  (null, '安全管理者', '環境・安全', false),
  (null, '防火管理者', '環境・安全', false),
  (null, '環境計量士', '環境・安全', false),
  -- その他
  (null, '普通自動車運転免許', 'その他', false),
  (null, '危険物取扱者 乙種第4類', 'その他', false),
  (null, 'MOS（Microsoft Office Specialist）', 'その他', false),
  (null, '秘書検定 2級', 'その他', false);

-- PostgRESTスキーマキャッシュリロード
notify pgrst, 'reload schema';
