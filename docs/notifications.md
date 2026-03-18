# 通知機能 設計ドキュメント

## 概要

社員アプリ（hr1-employee-app）において、対応が必要なアクションをユーザーに通知する機能。
通知はアプリ内の通知一覧画面とホーム（ポータル）画面の最新3件プレビューで閲覧できる。

---

## アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│  Supabase                                           │
│  ┌───────────────┐  ┌────────────────────────────┐  │
│  │ notifications  │  │ RPC                        │  │
│  │ テーブル       │  │ mark_notifications_read()  │  │
│  │               │  │ mark_all_notifications_read│  │
│  └───────┬───────┘  └────────────────────────────┘  │
│          │ RLS: user_id = auth.uid()                │
└──────────┼──────────────────────────────────────────┘
           │
┌──────────▼──────────────────────────────────────────┐
│  Flutter (hr1-employee-app)                         │
│                                                     │
│  SupabaseNotificationRepository                     │
│    ├─ getNotifications()    全件取得（ページネーション）│
│    ├─ getLatestUnread()     未読最新3件              │
│    ├─ getUnreadCount()      未読件数（バッジ用）      │
│    ├─ markAsRead()          個別既読                 │
│    ├─ markAllAsRead()       全件既読（RPC）          │
│    └─ deleteNotification()  削除                     │
│                                                     │
│  Riverpod Providers                                 │
│    ├─ allNotificationsProvider      通知一覧画面用    │
│    ├─ latestNotificationsProvider   ポータル表示用    │
│    └─ unreadNotificationCountProvider バッジ用       │
│                                                     │
│  UI                                                 │
│    ├─ NotificationsScreen   通知一覧（全件）         │
│    └─ PortalScreen          最新3件 + ベルバッジ     │
└─────────────────────────────────────────────────────┘
```

---

## 通知タイプ一覧

| タイプ | DB値 | 表示名 | アイコン | プッシュ通知対象 | トリガー条件 |
|---|---|---|---|---|---|
| サーベイ依頼 | `survey_request` | サーベイ依頼 | poll | **対象** | サーベイがアクティブになった時 |
| タスク割り当て | `task_assigned` | タスク割り当て | task_alt | **対象** | タスクが自分に割り当てられた時 |
| 採用フロー更新 | `recruitment_update` | 採用フロー更新 | work | **対象** | 選考ステータスが変更された時 |
| 勤怠リマインド | `attendance_reminder` | 勤怠リマインド | schedule | **対象** | 出退勤の打刻忘れ、修正依頼の承認/却下 |
| メッセージ受信 | `message_received` | メッセージ受信 | chat_bubble | **対象** | 新しいメッセージを受信した時 |
| お知らせ | `announcement` | お知らせ | campaign | 任意 | 管理者が全体通知を作成した時 |
| その他 | `general` | その他 | notifications | 任意 | その他のシステム通知 |

### プッシュ通知の優先度

| 優先度 | タイプ | 理由 |
|---|---|---|
| 高 | `survey_request`, `task_assigned`, `recruitment_update` | ユーザーのアクションが必要 |
| 中 | `attendance_reminder`, `message_received` | タイムリーな対応が望ましい |
| 低 | `announcement`, `general` | 情報提供のみ |

---

## データベース設計

### notifications テーブル

| カラム | 型 | 説明 |
|---|---|---|
| `id` | uuid (PK) | 通知ID |
| `organization_id` | text (FK → organizations) | 組織ID |
| `user_id` | text | 通知先ユーザーID |
| `type` | text | 通知タイプ（上記7種類） |
| `title` | text | 通知タイトル |
| `body` | text? | 通知本文 |
| `is_read` | boolean | 既読フラグ（デフォルト: false） |
| `read_at` | timestamptz? | 既読日時 |
| `action_url` | text? | ディープリンク先（例: `/surveys/uuid`） |
| `metadata` | jsonb? | 追加データ（任意） |
| `created_at` | timestamptz | 作成日時 |
| `updated_at` | timestamptz | 更新日時（トリガーで自動更新） |

### RLS ポリシー

| 操作 | ポリシー |
|---|---|
| SELECT | 自分の通知のみ（`user_id = auth.uid()::text`） |
| INSERT | admin / hr_manager が自組織ユーザーに対して作成可能 |
| UPDATE | 自分の通知のみ（既読マーク用） |
| DELETE | 自分の通知 + admin/hr_manager が自組織の通知を削除可能 |

### インデックス

| インデックス | 用途 |
|---|---|
| `idx_notifications_user_created` | ユーザー別の時系列取得（通知一覧） |
| `idx_notifications_user_unread` | 未読通知のみの部分インデックス（バッジ・ポータル） |
| `idx_notifications_org` | 組織別の管理操作 |

### RPC 関数

| 関数 | 引数 | 説明 |
|---|---|---|
| `mark_notifications_read` | `uuid[]` | 指定IDの通知を一括既読にする |
| `mark_all_notifications_read` | なし | 自分の全未読通知を既読にする |

---

## UI 仕様

### ポータル画面（ホーム）

- **ベルアイコン**: 未読件数をバッジで表示（99+まで）。タップで通知一覧へ遷移
- **お知らせセクション**: 未読通知の最新3件を表示。「すべて表示」で通知一覧へ遷移
- 通知が0件の場合は「新しい通知はありません」を表示

### 通知一覧画面

- AppBar に「すべて既読」ボタン
- 通知アイテム: タイプ別アイコン（色付き円形）、タイトル、本文プレビュー、相対時刻、未読ドット
- 未読通知は薄い背景色で強調
- タップで既読にし、`action_url` があればその画面へ遷移
- 左スワイプで削除（Dismissible）
- プルダウンで更新（RefreshIndicator）
- 空状態は通知アイコン + メッセージ

### 相対時刻表示

| 経過時間 | 表示 |
|---|---|
| 1分未満 | 今 |
| 1〜59分 | X分前 |
| 1〜23時間 | X時間前 |
| 1〜6日 | X日前 |
| 7日以上 | M/d |

---

## ディープリンク（action_url）

通知をタップした際に遷移する画面パス。GoRouter の `context.push()` で遷移。

| 通知タイプ | action_url 例 | 遷移先 |
|---|---|---|
| survey_request | `/surveys/{survey_id}` | サーベイ回答画面 |
| task_assigned | `/tasks` | タスク一覧 |
| recruitment_update | なし（将来実装） | — |
| attendance_reminder | `/attendance` | 勤怠画面 |
| message_received | `/messages/thread/{thread_id}` | チャットスレッド |
| announcement | なし | 通知本文で完結 |

---

## 通知の生成方法（現状と今後）

### 現状（Phase 1）

通知レコードは管理コンソール（hr1-console）またはSupabase管理画面から手動で INSERT する。
RLS により admin/hr_manager ロールのユーザーが自組織のユーザーに対して通知を作成可能。

### 今後（Phase 2: 自動生成）

Supabase の Database Webhook またはトリガーを使って、以下のイベント発生時に自動で通知レコードを INSERT する。

| イベント | テーブル | トリガー条件 |
|---|---|---|
| サーベイ公開 | `pulse_surveys` | `status` が `active` に変更された時 |
| タスク割り当て | `tasks` | `assigned_to` が設定された時 |
| メッセージ受信 | `messages` | INSERT 時（送信者以外のスレッドメンバーに通知） |
| 勤怠修正承認 | `attendance_corrections` | `status` が `approved`/`rejected` に変更された時 |
| 全体お知らせ | 管理コンソール | 管理者が手動で作成 |

### 今後（Phase 3: プッシュ通知）

FCM（Firebase Cloud Messaging）を使ったプッシュ通知。

必要な追加実装:
1. `user_push_tokens` テーブル（ユーザーごとのFCMトークン管理）
2. Supabase Edge Function（`notifications` テーブルへの INSERT をトリガーにFCM送信）
3. Flutter 側で `firebase_messaging` パッケージによるトークン取得・フォアグラウンド通知処理

---

## ファイル構成

```
hr1-employee-app/lib/features/notifications/
├── domain/
│   └── entities/
│       └── notification_item.dart        # エンティティ + NotificationType enum
├── data/
│   └── repositories/
│       └── supabase_notification_repository.dart  # Supabase CRUD
└── presentation/
    ├── providers/
    │   └── notification_providers.dart    # Riverpod プロバイダー
    ├── controllers/
    │   └── notification_controller.dart   # 操作コントローラー
    └── screens/
        └── notifications_screen.dart     # 通知一覧画面

supabase/migrations/
└── 20260318000000_create_notifications.sql  # テーブル・RLS・RPC

関連ファイル（変更済み）:
├── hr1-employee-app/lib/core/router/app_router.dart         # /notifications ルート追加
└── hr1-employee-app/lib/features/portal/.../portal_screen.dart  # ベルバッジ + 通知プレビュー
```
