# Salesforce機能調査 & HR1 CRM強化プラン

## Context

HR1テナントコンソール（hr1-console）のCRMモジュールを、Salesforce Sales Cloudの営業管理機能を参考に強化する。
現在のCRMは基本的なCRUD（企業・連絡先・商談・活動・TODO）のみで、パイプライン可視化・売上予測・カスタマイズ機能が不足している。

**重要な発見**: HR1には既にカスタムフォーム基盤、ダッシュボードウィジェットシステム、ワークフロールールエンジン、監査ログ基盤が実装済みであり、これらを拡張してCRM機能を構築できる。

---

## 1. Salesforce主要機能 vs HR1現状（ギャップサマリ）

| カテゴリ | Salesforce | HR1現状 | ギャップ |
|---------|-----------|---------|---------|
| リード管理 | リード取込→スコアリング→商談コンバージョン | なし | **大** |
| パイプライン可視化 | カンバンボード、リアルタイムビュー | テーブル一覧のみ | **大** |
| 売上予測 | 確度%、予測カテゴリ、AI予測 | なし | **大** |
| 見積書/CPQ | テンプレート、バージョン管理、商品マスタ | なし | **中** |
| カスタムフィールド | 任意フィールド追加、バリデーションルール | なし（固定スキーマ） | **大** |
| パイプラインカスタマイズ | 複数パイプライン、ステージ自由定義 | 固定4ステージ | **大** |
| レポート/ダッシュボード | カスタムレポート、KPIダッシュボード | CRM用なし | **大** |
| ワークフロー自動化 | Flow/承認プロセス/メールテンプレート | CRM用なし | **中** |
| コラボレーション | Chatter、@メンション、ファイル共有 | なし | **小** |
| カスタムビュー | 保存フィルタ、カラム選択、ソート | なし | **中** |
| 連絡先ロール | 商談に複数連絡先をロール付き紐付け | 1連絡先のみ | **中** |
| 活動タイムライン | 統合タイムライン、カレンダー連携 | 基本リスト表示 | **小** |
| 名刺管理 | なし（AppExchange依存） | **実装済** ← HR1の強み | — |

---

## 2. 再利用可能な既存インフラ

### A. カスタムフォーム基盤
- **DB**: `custom_forms` + `form_fields` + `form_responses` + `form_change_logs`
- **フィールド型**: text_short, text_long, radio, checkbox, dropdown, date, file
- **ファイル**: `supabase/migrations/20260323700000_create_custom_forms.sql`
- **Hooks**: `hr1-console/src/lib/hooks/use-forms.ts`
- **Repository**: `hr1-console/src/lib/repositories/form-repository.ts`
- → CRMカスタムフィールドに拡張可能（lookup, number, currency型を追加）

### B. ダッシュボードウィジェットシステム
- **型定義**: `hr1-console/src/types/dashboard.ts` — `DashboardWidgetConfigV2`
- **表示種別**: metric, bar_chart, area_chart, pie_chart, pipeline, progress, list
- **データソース登録**: `hr1-console/src/lib/dashboard/data-sources.ts` — プラグイン式レジストリ
- **エディタ**: `hr1-console/src/components/dashboard/dashboard-editor.tsx` — @dnd-kitでDnD
- **DB**: `dashboard_widget_preferences`テーブル（JSONB）
- **チャート**: Recharts（Bar, Area, Pie, Metric, List, Pipeline）
- → CRMデータソース（商談パイプライン、売上予測、活動ヒートマップ等）を追加するだけ

### C. ワークフロールールエンジン
- **DB**: `workflow_rules`テーブル — rule_type (auto_approve/notify/validate), conditions (JSONB)
- **Migration**: `supabase/migrations/20260324800000_create_workflow_rules.sql`
- **Repository**: `hr1-console/src/lib/repositories/workflow-repository.ts`
- → CRM自動化ルール（ステージ変更時の通知、条件付きフィールド必須化）に拡張可能

### D. 監査ログ
- **DB**: `audit_logs`テーブル — action, table_name, record_id, changes (JSONB)
- **Migration**: `supabase/migrations/20260324400000_audit_log.sql`
- → 商談変更履歴、活動ログの自動記録に活用

### E. DnDライブラリ
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` — **インストール済み**
- → カンバンボードのDnDに即座に利用可能

### F. ステップ進行システム
- `JobStep` / `ApplicationStep` — 採用フローのステップ管理
- → 商談のステージ進行管理のパターンとして参考

---

## 3. 推奨実装プラン（優先度順）

### Phase 1: パイプライン可視化 & CRMダッシュボード（即効性・高インパクト）

#### 1-1. カンバンビュー（商談パイプラインボード）
**目的**: 商談をステージ別カンバンで視覚的に管理。DnDでステージ変更

**実装**:
- 新規ページ: `hr1-console/src/app/(dashboard)/crm/deals/board/page.tsx`
- `@dnd-kit`で4カラム（初回接触/提案/交渉/クロージング）のカンバン構築
- カード表示: 商談名、企業名、金額、担当者、見込み日
- DnDドロップでステージ自動更新（`bc_deals.stage` UPDATE）
- テーブルビュー⇔カンバンビューの切り替えトグル
- **既存資産**: `@dnd-kit`ライブラリ、`useCrmDealsAll`フック

#### 1-2. CRMダッシュボード
**目的**: 営業チーム向けKPI・パイプライン概況の可視化

**実装**:
- 既存のダッシュボードウィジェットシステムに**CRM用データソース**を追加
  - `crm_pipeline_summary`: ステージ別の商談件数・金額（pipeline表示）
  - `crm_monthly_revenue`: 月別受注金額推移（area_chart表示）
  - `crm_deal_status`: ステータス別内訳（pie_chart表示）
  - `crm_rep_performance`: 担当者別実績（bar_chart表示）
  - `crm_overdue_todos`: 期限切れTODO数（metric表示）
  - `crm_recent_activities`: 直近の活動リスト（list表示）
- `DATA_SOURCE_REGISTRY`にCRMソースを登録
- **ファイル**: `hr1-console/src/lib/dashboard/data-sources.ts`に追加

#### 1-3. 商談確度フィールド
**目的**: 受注確度の数値管理。売上予測の基盤

**実装**:
- `bc_deals`に`probability`(integer, default: null)カラム追加
- ステージ変更時にデフォルト値を自動設定: 初回接触=10%, 提案=30%, 交渉=60%, クロージング=90%
- 手動で上書き可能（0-100%のスライダー）
- **Migration**: 新規マイグレーションファイル
- **UI**: 商談編集フォームにスライダー追加

---

### Phase 2: カスタマイズ性の強化（Salesforceの核心価値）

#### 2-1. パイプラインカスタマイズ（複数パイプライン & ステージ自由定義）
**目的**: テナント毎に営業プロセスを自由に設計可能にする

**実装**:
- 新テーブル `crm_pipelines`: id, organization_id, name, is_default, sort_order
- 新テーブル `crm_pipeline_stages`: id, pipeline_id, name, color, probability_default, sort_order, required_fields (JSONB)
- `bc_deals`に`pipeline_id`カラム追加（既存データはデフォルトパイプラインに紐付け）
- 設定画面: `/crm/settings/pipelines` — ステージの追加・削除・並び替え（@dnd-kit）
- ステージ毎の色、デフォルト確度、必須フィールドを設定可能
- **参考パターン**: HubSpot/Pipedrive — ステージ名・順序・確度をテナントが自由に設定

#### 2-2. CRMカスタムフィールド
**目的**: テナント毎に企業・連絡先・商談に独自フィールドを追加可能にする

**実装**:
- 新テーブル `crm_field_definitions`: id, organization_id, entity_type (company/contact/deal), field_type, label, is_required, sort_order, options (JSONB), field_group
- 新テーブル `crm_field_values`: id, organization_id, entity_type, entity_id, field_definition_id, value (JSONB)
- フィールド型: text, number, currency, date, dropdown, multi_select, checkbox, url, email, phone, lookup（他エンティティ参照）
- **既存フォーム基盤を参考**: `form_fields`のパターンを踏襲（field_type, options, sort_order）
- 設定画面: `/crm/settings/fields` — フィールド追加・編集・並び替え
- 各エンティティの詳細/編集画面に動的フォーム生成

#### 2-3. カスタムビュー（保存フィルタ）
**目的**: ユーザーが自分用のビュー（フィルタ・カラム・ソート）を保存・共有

**実装**:
- 新テーブル `crm_saved_views`: id, organization_id, user_id, entity_type, name, is_shared, config (JSONB: columns, filters, sort, grouping)
- 一覧画面にビュー切り替えドロップダウン追加
- 「ビューを保存」ボタンでフィルタ・カラム・ソート条件を保存
- チーム共有フラグで他メンバーにも公開可能
- **参考パターン**: HubSpot — フィルタ→ビュー保存→ドロップダウン切り替え

---

### Phase 3: 営業プロセス強化（売上予測・リード・見積）

#### 3-1. リード管理
**目的**: 見込み客の取込→評価→商談化フローの実装

**実装**:
- 新テーブル `bc_leads`: id, organization_id, name, company_name, email, phone, source (web/referral/event/cold_call/other), status (new/contacted/qualified/unqualified/converted), assigned_to, notes, converted_deal_id, converted_company_id, converted_contact_id
- 新ページ: `/crm/leads` — リード一覧・登録・編集
- コンバージョンフロー: リード→企業+連絡先+商談を一括作成
- **参考**: Salesforceのリードコンバージョン — 1クリックで3エンティティ作成

#### 3-2. 売上予測レポート
**目的**: 確度加重の売上予測、期間別・担当者別の集計

**実装**:
- 新ページ: `/crm/reports/forecast`
- 予測計算: Σ(deal.amount × deal.probability / 100) を月別・四半期別に集計
- 担当者別・パイプライン別のクロス集計テーブル
- 予測カテゴリ: Pipeline（確度0-50%）/ Best Case（50-75%）/ Commit（75-100%）/ Closed（受注済）
- Rechartsで予測 vs 実績の推移グラフ
- CSVエクスポート（`xlsx`ライブラリは既にインストール済み）

#### 3-3. 商談への複数連絡先紐付け（連絡先ロール）
**実装**:
- 新テーブル `bc_deal_contacts`: deal_id, contact_id, role (decision_maker/influencer/champion/budget_holder/evaluator/user)
- 商談詳細画面に「関係者」セクション追加
- 既存の`bc_deals.contact_id`は主連絡先として維持（後方互換）

#### 3-4. 見積書機能
**実装**:
- 新テーブル `bc_quotes`: id, organization_id, deal_id, quote_number (auto-increment), status (draft/sent/accepted/rejected), total_amount, valid_until, notes, pdf_url
- 新テーブル `bc_quote_items`: id, quote_id, name, description, quantity, unit_price, amount
- PDF生成: `@react-pdf/renderer`（新規追加）
- 新ページ: `/crm/deals/[id]/quotes`

---

### Phase 4: 自動化 & 拡張性（プラットフォーム化）

#### 4-1. CRMワークフロー自動化
**目的**: 条件→アクションの自動化ルールをテナントが設定可能に

**実装**:
- 既存の`workflow_rules`パターンを拡張
- 新テーブル `crm_automations`: id, organization_id, name, is_active, trigger_type (stage_changed/field_updated/deal_created/deal_won/deal_lost/todo_overdue), trigger_config (JSONB), conditions (JSONB), actions (JSONB)
- アクション種別: send_notification, create_todo, update_field, send_email, webhook
- 設定UI: `/crm/settings/automations` — トリガー→条件→アクションのビジュアルビルダー
- 実行: Supabase Edge Functions + PostgreSQL triggers

#### 4-2. メールテンプレート
**実装**:
- 新テーブル `crm_email_templates`: id, organization_id, name, subject, body, variables (JSONB)
- 差し込み変数: {{company_name}}, {{contact_name}}, {{deal_title}}, {{deal_amount}} 等
- テンプレートエディタ画面

#### 4-3. Webhook / API連携
**実装**:
- 新テーブル `crm_webhooks`: id, organization_id, event_type, url, is_active, secret
- CRMイベント（商談作成/更新/受注/失注）発生時にPOST送信
- Zapier/Make連携の基盤

---

## 4. HR1の差別化ポイント（Salesforceにない強み）

1. **名刺管理 → CRM自動登録**: 名刺スキャン→OCR→企業+連絡先を自動作成。Salesforceにはない統合体験
2. **HR × CRM統合**: 採用管理と営業管理が同一プラットフォーム。採用候補者→取引先連絡先の連携が可能
3. **日本企業最適化**: 法人番号、読み仮名、日本語UI標準対応
4. **シンプルな料金体系**: Salesforceの複雑なライセンス（$25-$500/user/月）vs HR1の社員数ベース定額
5. **カスタマイズの民主化**: Salesforceは管理者/開発者向けだが、HR1は全ユーザーが直感的にカスタマイズ可能を目指す

---

## 5. 主要変更ファイル

### マイグレーション（新規作成）
- `supabase/migrations/YYYYMMDD_add_deal_probability.sql` — Phase 1
- `supabase/migrations/YYYYMMDD_create_crm_pipelines.sql` — Phase 2
- `supabase/migrations/YYYYMMDD_create_crm_custom_fields.sql` — Phase 2
- `supabase/migrations/YYYYMMDD_create_crm_saved_views.sql` — Phase 2
- `supabase/migrations/YYYYMMDD_create_bc_leads.sql` — Phase 3
- `supabase/migrations/YYYYMMDD_create_bc_quotes.sql` — Phase 3
- `supabase/migrations/YYYYMMDD_create_crm_automations.sql` — Phase 4

### hr1-console 画面（新規・修正）
- `src/app/(dashboard)/crm/deals/board/page.tsx` — カンバンビュー（新規）
- `src/app/(dashboard)/crm/leads/page.tsx` — リード一覧（新規）
- `src/app/(dashboard)/crm/reports/forecast/page.tsx` — 売上予測（新規）
- `src/app/(dashboard)/crm/settings/pipelines/page.tsx` — パイプライン設定（新規）
- `src/app/(dashboard)/crm/settings/fields/page.tsx` — カスタムフィールド設定（新規）
- `src/app/(dashboard)/crm/settings/automations/page.tsx` — 自動化設定（新規）
- `src/app/(dashboard)/crm/deals/page.tsx` — ビュー切替追加（修正）
- `src/app/(dashboard)/crm/deals/[id]/page.tsx` — 確度・関係者追加（修正）

### 既存ファイル（修正）
- `src/lib/dashboard/data-sources.ts` — CRMデータソース追加
- `src/lib/hooks/use-crm.ts` — 新フック追加
- `src/lib/repositories/crm-repository.ts` — 新クエリ追加
- `src/lib/constants/crm.ts` — 定数追加
- `src/types/database.ts` — 型定義追加
