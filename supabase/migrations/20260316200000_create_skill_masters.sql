-- スキルマスタテーブル
create table if not exists skill_masters (
  id uuid primary key default gen_random_uuid(),
  organization_id text references organizations(id) on delete cascade,
  name text not null,
  category text,
  created_at timestamptz not null default now()
);

-- インデックス
create index if not exists idx_skill_masters_org on skill_masters(organization_id);

-- RLS有効化
alter table skill_masters enable row level security;

-- RLSポリシー
create policy "スキルマスタを閲覧"
  on skill_masters for select
  using (
    organization_id is null
    or organization_id in (
      select organization_id from user_organizations
      where user_id = auth.uid()::text
    )
  );

create policy "自組織のスキルマスタを追加"
  on skill_masters for insert
  with check (
    organization_id is not null
    and organization_id in (
      select organization_id from user_organizations
      where user_id = auth.uid()::text
    )
  );

create policy "自組織のスキルマスタを更新"
  on skill_masters for update
  using (
    organization_id is not null
    and organization_id in (
      select organization_id from user_organizations
      where user_id = auth.uid()::text
    )
  );

create policy "自組織のスキルマスタを削除"
  on skill_masters for delete
  using (
    organization_id is not null
    and organization_id in (
      select organization_id from user_organizations
      where user_id = auth.uid()::text
    )
  );

-- 代表的なスキルをシード（システム共通）
insert into skill_masters (organization_id, name, category) values
  -- プログラミング言語
  (null, 'JavaScript', 'プログラミング'),
  (null, 'TypeScript', 'プログラミング'),
  (null, 'Python', 'プログラミング'),
  (null, 'Java', 'プログラミング'),
  (null, 'Go', 'プログラミング'),
  (null, 'Rust', 'プログラミング'),
  (null, 'C#', 'プログラミング'),
  (null, 'C++', 'プログラミング'),
  (null, 'PHP', 'プログラミング'),
  (null, 'Ruby', 'プログラミング'),
  (null, 'Swift', 'プログラミング'),
  (null, 'Kotlin', 'プログラミング'),
  (null, 'Dart', 'プログラミング'),
  (null, 'SQL', 'プログラミング'),
  -- フレームワーク・ライブラリ
  (null, 'React', 'フレームワーク'),
  (null, 'Next.js', 'フレームワーク'),
  (null, 'Vue.js', 'フレームワーク'),
  (null, 'Angular', 'フレームワーク'),
  (null, 'Node.js', 'フレームワーク'),
  (null, 'Django', 'フレームワーク'),
  (null, 'Spring Boot', 'フレームワーク'),
  (null, 'Ruby on Rails', 'フレームワーク'),
  (null, 'Flutter', 'フレームワーク'),
  (null, 'React Native', 'フレームワーク'),
  -- インフラ・クラウド
  (null, 'AWS', 'インフラ・クラウド'),
  (null, 'Google Cloud', 'インフラ・クラウド'),
  (null, 'Azure', 'インフラ・クラウド'),
  (null, 'Docker', 'インフラ・クラウド'),
  (null, 'Kubernetes', 'インフラ・クラウド'),
  (null, 'Terraform', 'インフラ・クラウド'),
  (null, 'CI/CD', 'インフラ・クラウド'),
  (null, 'Linux', 'インフラ・クラウド'),
  -- データベース
  (null, 'PostgreSQL', 'データベース'),
  (null, 'MySQL', 'データベース'),
  (null, 'MongoDB', 'データベース'),
  (null, 'Redis', 'データベース'),
  (null, 'Elasticsearch', 'データベース'),
  -- デザイン・UI/UX
  (null, 'Figma', 'デザイン'),
  (null, 'UI/UXデザイン', 'デザイン'),
  (null, 'グラフィックデザイン', 'デザイン'),
  (null, 'Adobe Photoshop', 'デザイン'),
  (null, 'Adobe Illustrator', 'デザイン'),
  -- ビジネス・マネジメント
  (null, 'プロジェクト管理', 'ビジネス'),
  (null, 'チームマネジメント', 'ビジネス'),
  (null, 'アジャイル/スクラム', 'ビジネス'),
  (null, '要件定義', 'ビジネス'),
  (null, 'データ分析', 'ビジネス'),
  -- その他技術
  (null, 'Git', 'その他'),
  (null, 'API設計', 'その他'),
  (null, 'セキュリティ', 'その他'),
  (null, '機械学習/AI', 'その他'),
  (null, 'テスト自動化', 'その他'),
  -- 人事・HR
  (null, '採用・リクルーティング', '人事・HR'),
  (null, '人材育成・研修', '人事・HR'),
  (null, '労務管理', '人事・HR'),
  (null, '給与計算', '人事・HR'),
  (null, '社会保険手続き', '人事・HR'),
  (null, '人事評価制度', '人事・HR'),
  (null, '組織開発', '人事・HR'),
  (null, 'タレントマネジメント', '人事・HR'),
  -- 経理・財務
  (null, '財務分析', '経理・財務'),
  (null, '管理会計', '経理・財務'),
  (null, '税務申告', '経理・財務'),
  (null, '予算管理', '経理・財務'),
  (null, '資金繰り・キャッシュフロー管理', '経理・財務'),
  (null, '監査対応', '経理・財務'),
  (null, '原価計算', '経理・財務'),
  (null, '連結決算', '経理・財務'),
  -- 法務
  (null, '契約書作成・レビュー', '法務'),
  (null, '知的財産管理', '法務'),
  (null, 'コンプライアンス', '法務'),
  (null, '個人情報保護', '法務'),
  (null, '内部統制', '法務'),
  (null, '労働法務', '法務'),
  -- 営業・販売
  (null, '法人営業（BtoB）', '営業・販売'),
  (null, '個人営業（BtoC）', '営業・販売'),
  (null, 'ルートセールス', '営業・販売'),
  (null, 'インサイドセールス', '営業・販売'),
  (null, '提案営業・ソリューション営業', '営業・販売'),
  (null, '顧客管理（CRM）', '営業・販売'),
  (null, '商談・交渉', '営業・販売'),
  (null, '見積・契約管理', '営業・販売'),
  -- マーケティング
  (null, 'デジタルマーケティング', 'マーケティング'),
  (null, 'SEO/SEM', 'マーケティング'),
  (null, 'SNS運用', 'マーケティング'),
  (null, 'コンテンツマーケティング', 'マーケティング'),
  (null, '広告運用', 'マーケティング'),
  (null, '市場調査・リサーチ', 'マーケティング'),
  (null, 'ブランディング', 'マーケティング'),
  (null, 'イベント企画・運営', 'マーケティング'),
  -- 製造・生産
  (null, '生産管理', '製造・生産'),
  (null, '品質管理（QC）', '製造・生産'),
  (null, '品質保証（QA）', '製造・生産'),
  (null, '工程管理', '製造・生産'),
  (null, '在庫管理', '製造・生産'),
  (null, '安全管理', '製造・生産'),
  (null, '5S・改善活動', '製造・生産'),
  (null, '設備保全', '製造・生産'),
  (null, 'ISO認証対応', '製造・生産'),
  -- 物流・SCM
  (null, '物流管理', '物流・SCM'),
  (null, 'サプライチェーン管理', '物流・SCM'),
  (null, '購買・調達', '物流・SCM'),
  (null, '貿易実務・輸出入', '物流・SCM'),
  (null, '倉庫管理', '物流・SCM'),
  -- 企画・経営
  (null, '経営企画', '企画・経営'),
  (null, '事業企画・新規事業開発', '企画・経営'),
  (null, '中期経営計画策定', '企画・経営'),
  (null, 'M&A・事業統合', '企画・経営'),
  (null, 'IR（投資家向け広報）', '企画・経営'),
  (null, 'リスクマネジメント', '企画・経営'),
  -- 総務・管理
  (null, '総務', '総務・管理'),
  (null, 'オフィス管理・ファシリティ', '総務・管理'),
  (null, '福利厚生企画', '総務・管理'),
  (null, '株主総会運営', '総務・管理'),
  (null, '社内規程整備', '総務・管理'),
  -- カスタマーサービス
  (null, 'カスタマーサポート', 'カスタマーサービス'),
  (null, 'カスタマーサクセス', 'カスタマーサービス'),
  (null, 'クレーム対応', 'カスタマーサービス'),
  (null, 'コールセンター運営', 'カスタマーサービス'),
  -- 医療・福祉
  (null, '看護', '医療・福祉'),
  (null, '介護', '医療・福祉'),
  (null, '医療事務', '医療・福祉'),
  (null, '薬剤管理', '医療・福祉'),
  (null, 'リハビリテーション', '医療・福祉'),
  -- 教育・研修
  (null, '社内研修企画・講師', '教育・研修'),
  (null, 'eラーニング開発', '教育・研修'),
  (null, 'コーチング', '教育・研修'),
  (null, 'メンタリング', '教育・研修'),
  -- 不動産・建設
  (null, '不動産管理', '不動産・建設'),
  (null, '施工管理', '不動産・建設'),
  (null, '建築設計', '不動産・建設'),
  (null, '設備設計', '不動産・建設'),
  -- コミュニケーション
  (null, 'ビジネスライティング', 'コミュニケーション'),
  (null, 'プレゼンテーション', 'コミュニケーション'),
  (null, 'ファシリテーション', 'コミュニケーション'),
  (null, '通訳・翻訳', 'コミュニケーション'),
  (null, '英語（ビジネスレベル）', 'コミュニケーション'),
  (null, '中国語（ビジネスレベル）', 'コミュニケーション'),
  -- コンサルティング
  (null, '業務改善・BPR', 'コンサルティング'),
  (null, 'ITコンサルティング', 'コンサルティング'),
  (null, '経営コンサルティング', 'コンサルティング'),
  (null, '戦略立案', 'コンサルティング');

notify pgrst, 'reload schema';
