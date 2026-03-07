# 応募ステータスフロー

## 設計思想

応募の選考プロセスは企業・求人ごとに異なり、面接回数や外部テストの有無も様々です。
そのため **求人ごとにカスタマイズ可能なステップベースの設計** を採用しています。

- `job_steps` テーブル: 求人ごとの選考フローテンプレート
- `application_steps` テーブル: 応募ごとの選考ステップ（テンプレートからコピー）
- `applications` テーブル: 応募全体のステータス（大分類）

## 全体の流れ

```
企業が求人を作成
  └── job_steps で選考フローを定義
        例: 書類選考 → カジュアル面談 → 適性検査 → 技術面接 → オファー

応募者が応募
  └── job_steps を application_steps にコピー
        最初のステップが自動的に in_progress になる

選考が進む
  └── 各ステップが pending → in_progress → completed と進行
```

## 求人の選考フローテンプレート（`job_steps`）

企業は求人ごとに異なる選考フローを設定できます。

### テーブル構造

| カラム | 型 | 説明 |
|---|---|---|
| `id` | TEXT PK | ステップテンプレートID |
| `job_id` | TEXT FK → jobs | 求人ID |
| `step_type` | TEXT | ステップ種類 |
| `step_order` | INTEGER | 表示順（求人内でユニーク） |
| `label` | TEXT | 表示名（企業がカスタマイズ可能） |

### 設定例

**フロントエンドエンジニア（job-001）:**
```
1. 書類選考        (screening)
2. アンケート回答   (form)
3. 一次面接        (interview)
4. 最終面接        (interview)
5. オファー        (offer)
```

**バックエンドエンジニア（job-002）:**
```
1. 書類選考        (screening)
2. カジュアル面談   (interview)
3. 適性検査（外部） (external_test)
4. 技術面接        (interview)
5. オファー        (offer)
```

**人事コンサルタント（job-003）:**
```
1. 書類選考        (screening)
2. アンケート回答   (form)
3. 面接           (interview)
4. オファー        (offer)
```

## 応募ステータス（大分類）

`applications.status` は4つのシンプルな値のみ:

| ステータス | 表示名 | 説明 |
|---|---|---|
| `active` | 選考中 | 選考が進行中（ステップで詳細を管理） |
| `offered` | 内定 | 内定が出された状態 |
| `rejected` | 不採用 | 不採用となった状態 |
| `withdrawn` | 辞退 | 応募者が辞退した状態 |

## 選考ステップ（`application_steps`）

### ステップ種類（`step_type`）

| 種類 | 説明 | 応募者アクション |
|---|---|---|
| `screening` | 書類選考 | なし（企業側が判断） |
| `form` | アンケート/フォーム回答 | フォームに回答して送信 |
| `interview` | 面接 | 面接候補日から日程を選択 |
| `external_test` | 外部テスト（適性検査等） | 外部サービスで受検（アプリ外） |
| `offer` | オファー | なし（企業側が提示） |

### ステップステータス（`status`）

| ステータス | 説明 |
|---|---|
| `pending` | 未着手 |
| `in_progress` | 進行中 |
| `completed` | 完了 |
| `skipped` | スキップ |

### 応募者アクションの判定

ステップが `in_progress` かつ `step_type` が `form` または `interview` の場合、
応募者側のアクションが必要と判定されます（UIで「対応が必要」バッジが表示される）。

`external_test` は外部サービスで実施するため、アプリ内でのアクションはありません。

## 応募時の処理

応募者が「この求人に応募する」を押すと:

1. `applications` に新規レコード挿入（`status = 'active'`）
2. 求人の `job_steps` を取得
3. `application_steps` にコピー（最初のステップは `in_progress`、残りは `pending`）

実装箇所: `supabase_applications_repository.dart` の `applyAsync()` メソッド

## ステップの進行

### 応募者側で完了するステップ

#### フォーム回答 (`form`)
1. 企業側がステップの `status` を `in_progress` に、`related_id` にフォームIDをセット
2. 応募者がフォームに回答して送信
3. `application_steps.status` → `completed`, `completed_at` をセット
4. 実装箇所: `form_fill_screen.dart` の `_submit()` メソッド

#### 面接日程選択 (`interview`)
1. 企業側がステップの `status` を `in_progress` に、`related_id` に面接IDをセット
2. 応募者が面接候補日から日程を選択・確定
3. `interviews.status` → `confirmed`, `confirmed_slot_id` をセット
4. `interview_slots.is_selected` → `true`
5. `application_steps.status` → `completed`, `completed_at` をセット
6. 実装箇所: `interview_schedule_screen.dart` の `_confirm()` メソッド

### 企業側で管理するステップ

- `screening`: 企業が書類を確認し、合格なら次のステップへ
- `external_test`: 外部サービスの結果を企業が確認
- `offer`: 企業がオファーを決定

これらは企業側アプリ（hr1-front-app）で管理します。

## DB スキーマ

### `job_steps` テーブル（選考フローテンプレート）

| カラム | 型 | 説明 |
|---|---|---|
| `id` | TEXT PK | テンプレートステップID |
| `job_id` | TEXT FK → jobs | 求人ID |
| `step_type` | TEXT | ステップ種類 |
| `step_order` | INTEGER | 表示順（求人内でユニーク） |
| `label` | TEXT | 表示名 |
| `created_at` | TIMESTAMPTZ | 作成日時 |

### `application_steps` テーブル（応募ごとのステップ）

| カラム | 型 | 説明 |
|---|---|---|
| `id` | TEXT PK | ステップID |
| `application_id` | TEXT FK → applications | 応募ID |
| `step_type` | TEXT | ステップ種類 |
| `step_order` | INTEGER | 表示順（応募内でユニーク） |
| `status` | TEXT | ステップステータス |
| `label` | TEXT | 表示名 |
| `related_id` | TEXT | 関連リソースID（フォームID / 面接ID） |
| `started_at` | TIMESTAMPTZ | 開始日時 |
| `completed_at` | TIMESTAMPTZ | 完了日時 |
| `created_at` | TIMESTAMPTZ | 作成日時 |
| `updated_at` | TIMESTAMPTZ | 更新日時 |

### 関連テーブル

| テーブル | 関連 | 説明 |
|---|---|---|
| `jobs` | 1 → N `job_steps` | 求人の選考フローテンプレート |
| `applications` | 1 → N `application_steps` | 応募に紐づくステップ一覧 |
| `custom_forms` | `related_id` で参照 | フォームステップの回答内容 |
| `interviews` | `related_id` で参照 | 面接ステップの日程情報 |

## UI での表示

### 求人詳細画面（`job_detail_screen`）
- 「選考フロー」カード: `job_steps` を番号付きリストで表示
- 応募ボタン: 押すと `applyAsync()` で応募 + ステップ自動生成

### 一覧画面（`applications_screen`）
- ステータスチップ: 現在進行中のステップの `label` を表示
- 「対応が必要」バッジ: `requiresAction` が `true` のステップがある場合

### 詳細画面（`application_detail_screen`）
- 動的タイムライン: `application_steps` を `step_order` 順に表示
- 各ステップのインジケーター:
  - `completed` → 緑チェック
  - `in_progress` → 青ドット
  - `skipped` → グレーマイナス
  - `pending` → グレー空
- アクションボタン: `requiresAction` なステップごとにボタンを表示
