# 選考ステップ設計ドキュメント

## 概要

選考ステップは、企業が求人ごとにカスタマイズ可能な採用パイプラインを定義し、応募者の進捗を管理する機能。

## テーブル設計

### job_steps（求人テンプレート）

企業が求人作成時に定義する選考ステップのテンプレート。

| カラム | 型 | 説明 |
|--------|------|------|
| id | uuid (PK) | ステップID |
| job_id | uuid (FK→jobs) | 所属求人 |
| step_type | text | ステップ種別（CHECK制約あり） |
| step_order | integer | 表示順序（1始まり） |
| label | text | 表示ラベル（例：「一次面接」） |
| related_id | uuid | 関連リソースID（フォームまたは面接） |

### application_steps（応募者ごとの進捗）

応募時に `job_steps` からコピーされ、個別の進捗を追跡する。

| カラム | 型 | 説明 |
|--------|------|------|
| id | uuid (PK) | ステップID |
| application_id | uuid (FK→applications) | 所属応募 |
| step_type | text | ステップ種別（CHECK制約あり） |
| step_order | integer | 実行順序 |
| label | text | 表示ラベル |
| status | text | 状態（CHECK制約: pending/in_progress/completed/skipped） |
| related_id | uuid | 関連リソースID |
| started_at | timestamptz | 開始日時 |
| completed_at | timestamptz | 完了日時 |
| applicant_action_at | timestamptz | 応募者アクション完了日時 |

### インデックス

- `idx_job_steps_job(job_id, step_order)`
- `idx_application_steps_app(application_id, step_order)`

## ステップ種別（step_type）

DB側CHECK制約で以下の値のみ許可：

| 種別 | 説明 | related_id の用途 |
|------|------|-------------------|
| `screening` | 書類選考 | custom_forms.id（任意） |
| `form` | アンケート/フォーム | custom_forms.id（任意） |
| `interview` | 面接 | interviews.id（1つ、任意） |
| `external_test` | 外部テスト | なし |
| `offer` | 内定 | なし（自動付与） |

### related_id の設計方針

- `related_id` は `uuid` 型 — 常に単一のリソースIDを格納
- 面接ステップは1ステップ1面接。複数回面接が必要な場合は複数の面接ステップを作成
- `offer` ステップは企業が手動選択できず、システムが自動で末尾に配置

## 状態遷移

### application_steps.status

```
pending → in_progress → completed
                      → skipped
skipped → pending（unskip: 後続ステップが未完了の場合のみ）
```

### 自動遷移ルール

- ステップ完了時、次の `pending` ステップが `form`/`interview` 以外なら自動で `in_progress` に遷移
- `form`/`interview` ステップは管理者がリソースを割り当て後に手動開始

## RPC関数

### reorder_job_steps

求人ステップの並び替えをアトミックに実行。

```sql
reorder_job_steps(p_job_id uuid, p_step_ids uuid[], p_step_orders int[])
```

- SECURITY DEFINER で実行
- **管理者権限チェック**: 呼び出し元が該当求人の組織の管理者であることを検証
- 一時的に +10000 してから正しい順序に更新（衝突回避）
- 全操作が単一トランザクション内で完了

### applicant_complete_step

応募者のステップ完了をアトミックに実行。

```sql
applicant_complete_step(p_step_id uuid, p_application_id uuid)
```

- 呼び出し元が応募者本人であることを `auth.uid()` で検証
- ステップが `in_progress` であることを検証
- **FOR UPDATE ロック**: 対象行をロックし並行実行による二重開始を防止
- 完了 + 次ステップ自動開始を単一トランザクションで実行

## RLSポリシー

### application_steps

| ポリシー | 操作 | 対象 | 条件 |
|---------|------|------|------|
| app_steps_select_own | SELECT | 応募者 | 自分の応募のステップのみ |
| app_steps_insert_own | INSERT | 応募者 | 自分の応募に対してのみ |
| app_steps_update_own_restricted | UPDATE | 応募者 | 自分の応募のステップのみ（ステップ完了はRPC経由、面接確認時のapplicant_action_at更新のみ直接） |
| app_steps_all_admin | ALL | 管理者 | 同一組織の応募のみ |

### job_steps

| ポリシー | 操作 | 対象 | 条件 |
|---------|------|------|------|
| job_steps_select_org | SELECT | 組織メンバー | 同一組織の求人のみ |
| job_steps_all_admin | ALL | 管理者 | 同一組織の求人のみ |

## 通知トリガー

| トリガー | 発火条件 | 通知内容 |
|---------|---------|---------|
| on_application_step_status_changed | application_steps.status UPDATE | 選考進捗の更新通知 |
| on_application_status_changed | applications.status UPDATE | 内定/不合格通知 |

## データフロー

### 1. 求人作成時

```
企業管理者 → hr1-console → job_steps INSERT
  デフォルトテンプレート: [書類選考, 一次面接, 内定]
  企業がカスタマイズ可能（追加/削除/並び替え/種別変更）
  IDはすべて crypto.randomUUID() で生成
```

### 2. 応募時

```
応募者 → hr1-applicant-app → apply()
  1. applications INSERT (status='active', ID=DB自動生成)
  2. job_steps SELECT → application_steps INSERT (コピー, ID=DB自動生成)
     - 最初のステップ: status='in_progress', started_at=now()
     - 以降: status='pending'
```

### 3. 選考進行（管理者操作）

```
管理者 → hr1-console → advanceStep()
  - pending → in_progress (リソース割り当て)
  - in_progress → completed (次ステップ自動開始)
```

### 4. 選考進行（応募者操作）

```
フォームステップ:
  応募者 → フォーム送信 → applicant_complete_step RPC
  - ステップ完了 + 次ステップ自動開始がアトミックに実行

面接ステップ:
  応募者 → 面接スロット選択 → interview_slots UPDATE + applicant_action_at UPDATE
  - ステップは in_progress のまま（管理者が面接実施後に完了させる）
```

## 企業カスタマイズ

- ステップの追加・削除・並び替えが自由
- ステップ種別の選択（書類選考/フォーム/面接/外部テスト）
- ステップラベルの自由設定（「一次面接」「最終面接」等）
- フォーム・面接リソースの紐付け
- `offer` ステップは常に末尾に自動配置

## セキュリティ

1. **RPC管理者権限**: `reorder_job_steps` は組織管理者のみ実行可能
2. **RPC応募者検証**: `applicant_complete_step` は応募者本人のみ実行可能
3. **FOR UPDATEロック**: ステップ完了の並行実行による二重開始を防止
4. **RLS**: 応募者は自分の応募のみ閲覧・更新可能。管理者は同一組織のみ
5. **CHECK制約**: step_type, status はDB側で不正値を防止

## 制約と注意事項

1. `step_order` の一意性はアプリケーション側で管理（並び替えRPCで保証）
2. `related_id` は単一UUID。1ステップに複数リソースは不可
3. 応募後にjob_stepsを変更しても、既存のapplication_stepsには影響しない（スナップショット）
4. unskipは後続ステップが未完了の場合のみ可能（コンソール側でバリデーション）
5. 応募者のフォームステップ完了は `applicant_complete_step` RPC経由でトランザクション安全性を保証
6. 面接ステップの完了は管理者が実施（応募者はスロット選択のみ）
