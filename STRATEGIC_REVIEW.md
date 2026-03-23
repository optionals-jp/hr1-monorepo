# HR1 戦略レビューレポート

**初回レビュー日**: 2026-03-23
**最終更新日**: 2026-03-23
**対象**: hr1-console / hr1-applicant-app / hr1-employee-app / Supabase Backend / hr1_shared

---

## 1. 🚀 リリース前に追加すべき機能

### 🔴 高重要度

| # | 機能 | 状態 | 詳細 | 対象 | 工数 |
|---|------|------|------|------|------|
| 1 | **E2Eテスト** | ⚡ 一部対応 | console 76テスト（+8新規）、Flutter各5テスト追加済。主要フローのE2Eは未実施 | 全体 | L |
| 2 | **パスワードリセット/アカウントロック** | ✅ 対応済 | OTP再送（60秒cooldown）+ サポート連絡先追加。両アプリに実装 | applicant/employee | — |
| 3 | **監査ログ（操作履歴）** | ✅ 対応済 | 統一`audit_logs`テーブル（13テーブルトリガー、hstore差分、CHECK制約、不変性ポリシー、アーカイブ関数、管理UI）。旧change_logsテーブルは移行後削除 | backend/console | — |
| 4 | **データエクスポート（CSV/Excel）** | ✅ 対応済 | 応募者・評価シート・評価サイクルのCSVエクスポート追加。CSV formula injection対策済 | console | — |
| 5 | **多言語対応（i18n基盤）** | ✅ 基盤対応済 | `t()`関数 + 翻訳ファイル構造 + サイドバー適用。英語翻訳は未入力（将来対応） | console | S（英語入力のみ） |
| 6 | **ファイルアップロード（フォーム）** | ✅ 対応済 | FilePicker実装、10MBサイズ制限、拡張子ホワイトリスト、パス走査防止 | applicant | — |

### 🟡 中重要度

| # | 機能 | 状態 | 詳細 | 対象 | 工数 |
|---|------|------|------|------|------|
| 7 | **リアルタイム通知（WebSocket）** | 🔲 未対応 | consoleにリアルタイム更新がない | console | M |
| 8 | **検索機能の実装** | 🔲 未対応 | consoleヘッダーの検索バーがプレースホルダーのまま | console | M |
| 9 | **レポート・分析機能** | 🔲 未対応 | カスタムレポート生成（期間指定、部署別等）がない | console | L |
| 10 | **オフライン対応（最低限）** | 🔲 未対応 | Flutter両アプリはオンライン前提 | applicant/employee | L |
| 11 | **RBAC（ロールベースアクセス制御）の細分化** | 🔲 未対応 | 現在admin/employeeの2ロールのみ | backend/console | L |
| 12 | **メール通知** | 🔲 未対応 | プッシュ通知はあるがメール通知がない | backend | M |
| 13 | **MFA（多要素認証）** | 🔲 未対応 | config.tomlで全MFA無効 | backend | S |

### 🟢 低重要度

| # | 機能 | 状態 | 詳細 | 対象 | 工数 |
|---|------|------|------|------|------|
| 14 | **ダークモード完全対応** | 🔲 未対応 | フレームワークは整備済みだが網羅的テストがない | console | S |
| 15 | **ヘルプ・オンボーディング** | 🔲 未対応 | consoleのヘルプアイコン未実装 | console/employee | M |
| 16 | **Webhook/外部連携API** | 🔲 未対応 | Slack通知、カレンダー同期等 | backend | XL |
| 17 | **アプリ内ツアー/チュートリアル** | 🔲 未対応 | 初回利用時のガイドがない | console | M |

---

## 2. 🔧 既存機能のブラッシュアップ

### 🔴 高重要度

| # | 機能 | 状態 | 問題点 | 対象 |
|---|------|------|--------|------|
| 1 | **プロフィール設定画面** | ✅ 対応済 | 通知設定・ヘルプ・バージョン情報実装。空ボタン・設定スタブ削除 | applicant |
| 2 | **エラーリカバリ** | ✅ 対応済 | Firebase Crashlytics統合（両アプリ）。グローバルエラーハンドラ + 認証エラー記録 | 全体 |
| 3 | **フォームバリデーション統一** | ✅ 対応済 | `validation.ts`ユーティリティ作成。応募者・社員・求人作成フォームに適用 | console |

### 🟡 中重要度

| # | 機能 | 状態 | 問題点 | 対象 |
|---|------|------|--------|------|
| 4 | **テーブルの大量データ対応** | 🔲 未対応 | consoleのテーブルに仮想スクロールがない | console |
| 5 | **メッセージ機能のUX** | 🔲 未対応 | 既読表示・タイピングインジケーター・ファイル添付がない | 全体 |
| 6 | **評価サイクルのUX** | 🔲 未対応 | 360度評価の設定フローが複雑 | console |
| 7 | **勤怠サマリーRPC** | ✅ 改善済 | admin認可チェック追加、search_path設定済 | backend |
| 8 | **カレンダー機能** | 🔲 未対応 | consoleのカレンダー画面が最小限の実装 | console |
| 9 | **シフト管理** | 🔲 未対応 | employee-appでのシフト確認UIが限定的 | employee |

### 🟢 低重要度

| # | 機能 | 状態 | 問題点 | 対象 |
|---|------|------|--------|------|
| 10 | **FAQ表示** | 🔲 未対応 | カテゴリフィルタの使い勝手改善余地 | applicant/employee |
| 11 | **タスク管理** | 🔲 未対応 | サブタスク完了率の可視化がない | employee |
| 12 | **給与明細** | 🔲 未対応 | 閲覧のみで明細PDF出力がない | employee/console |

---

## 3. 🛠️ コード品質の改善

### 🔴 高重要度

| # | 問題 | 状態 | 詳細 | 対象 |
|---|------|------|------|------|
| 1 | **Flutterテスト不足** | ⚡ 一部対応 | 認証フロー最小テスト追加（各5件）。他機能のテストは未実装 | applicant/employee |
| 2 | **ConsumerStatefulWidget使用** | ⚡ 一部対応 | applicant-appの3画面を変換済。employee-appに15クラス残存 | applicant/employee |
| 3 | **RLSポリシーの整理** | ✅ 対応済 | 20テーブルにポリシー追加、ドキュメント化（RLS_POLICIES.md）、冪等性確保 | backend |

### 🟡 中重要度

| # | 問題 | 状態 | 詳細 | 対象 |
|---|------|------|------|------|
| 4 | **console統合テスト不足** | ⚡ 一部対応 | validation/export-csvテスト追加。ページレンダリングテストは未実装 | console |
| 5 | **型定義の手動管理** | 🔲 未対応 | `database.ts`が手動メンテ | console |
| 6 | **service_request.request_type型** | 🔲 未対応 | enum/チェック制約なし | backend |
| 7 | **pg_cronの本番設定** | 🔲 未対応 | 手動SQL実行が必要 | backend |
| 8 | **相対importの残存** | ⚡ 一部対応 | employee-app auth_repository修正済。他ファイルは未確認 | applicant/employee |
| 9 | **Dio未使用** | 🔲 未対応 | 不要な依存 | applicant/employee |
| 10 | **lightTextSecondaryハードコード** | ⚡ 一部対応 | 3画面修正済。applicant-appに60+箇所、employee-appに3ファイル残存 | applicant/employee |
| 11 | **Center(child: Text('エラー'))パターン** | ⚡ 一部対応 | CompanyHomeScreen修正済。両アプリに9箇所残存 | applicant/employee |
| 12 | **SECURITY DEFINER関数のsearch_path** | ⚡ 一部対応 | 主要関数は修正済。`calculate_leave_carry_over`等2関数が未設定 | backend |

### 🟢 低重要度

| # | 問題 | 状態 | 詳細 | 対象 |
|---|------|------|------|------|
| 13 | **SWR revalidateOnFocus無効** | 🔲 未対応 | データ鮮度に影響 | console |
| 14 | **パフォーマンスインデックス実測** | 🔲 未対応 | EXPLAINベースの検証がない | backend |

---

## 4. ✅ 現状の強み

| # | 強み | 詳細 |
|---|------|------|
| 1 | **包括的なHR機能カバレッジ** | 採用→評価→勤怠→給与→ワークフローまで一気通貫 |
| 2 | **360度評価機能** | multi_rater評価（上司/同僚/部下/自己/外部）に匿名モード対応 |
| 3 | **マルチテナント設計** | organization_idベースの完全マルチテナント |
| 4 | **3アプリ統合UX** | 管理コンソール+応募者アプリ+社員アプリの統一バックエンド |
| 5 | **クリーンアーキテクチャ** | Flutter両アプリがScreen/Controller/Repository/Entityの明確な責務分離 |
| 6 | **リアルタイムメッセージング** | PostgreSQLリアルタイムサブスクリプション |
| 7 | **労基法準拠の有給自動付与** | 勤続年数に応じた自動付与+繰越計算 |
| 8 | **通知パイプライン** | DB INSERT → pg_net → Edge Function → FCM の自動通知 |
| 9 | **エンタープライズ監査ログ** | 13テーブル自動追跡、hstore差分、不変性保証、ギャップ検知、アーカイブ、管理UI |
| 10 | **RLSによるデータ分離** | 100+のRLSポリシーでDBレベルセキュリティ |
| 11 | **共通UIライブラリ（hr1_shared）** | デザイントークン+16コンポーネント+ユーティリティ |
| 12 | **Firebase Crashlytics統合** | グローバルエラーハンドリング+認証エラー除外+ユーザー識別 |

---

## 5. 競合比較サマリー

| 機能領域 | HR1 | SmartHR | freee人事労務 | HRMOS |
|----------|-----|---------|--------------|-------|
| 採用管理 | ✅ | ❌ | ❌ | ✅ |
| 評価（360度） | ✅ | ✅（オプション） | ❌ | ✅ |
| 勤怠管理 | ✅ | ✅（連携） | ✅ | ❌ |
| 給与明細 | ✅（閲覧） | ✅ | ✅ | ❌ |
| ワークフロー | ✅ | ✅ | ✅ | ❌ |
| 社員アプリ | ✅（ネイティブ） | ✅（Web） | ✅（Web） | ❌ |
| 応募者アプリ | ✅（ネイティブ） | ❌ | ❌ | ✅（Web） |
| パルスサーベイ | ✅ | ❌ | ❌ | ❌ |
| 監査ログ | ✅ | ✅ | ❌ | ❌ |
| CSVエクスポート | ✅ | ✅ | ✅ | ✅ |
| i18n基盤 | ✅（基盤のみ） | ✅ | ❌ | ✅ |
| オフライン対応 | ❌ | ❌ | ❌ | ❌ |
| API連携 | ❌ | ✅ | ✅ | ✅ |

---

## 6. 残タスク一覧

### 🔴 次スプリントで対応推奨

| # | タスク | 規模 | 対象 |
|---|--------|------|------|
| T-1 | `lightTextSecondary` → `textSecondary(theme.brightness)` 全体置換（applicant-app 60+箇所、employee-app 3ファイル） | M | applicant/employee |
| T-2 | employee-app `ConsumerStatefulWidget` → `HookConsumerWidget` 変換（15クラス） | L | employee |
| T-3 | `Center(child: Text('エラー'))` → `ErrorState` 置換（両アプリ9箇所） | S | applicant/employee |
| T-4 | SECURITY DEFINER関数に`SET search_path = public`追加（`calculate_leave_carry_over`, `auto_grant_leave_with_carry_over`） | S | backend |

### 🟡 中期対応

| # | タスク | 規模 | 対象 |
|---|--------|------|------|
| T-5 | 監査ログのパーティショニング（月次、5M行超を見据えて） | M | backend |
| T-6 | 認証イベントログ（login/logout/failed attempts） | M | backend |
| T-7 | i18n英語翻訳の入力 | S | console |
| T-8 | `database.ts` 自動生成（`supabase gen types`） | S | console |
| T-9 | `service_request.request_type` CHECK制約追加 | S | backend |
| T-10 | pg_cron本番設定の自動化 | S | backend |

---

## 7. リリース優先度ロードマップ（更新版）

### Phase 1: MVP品質確保 ✅ 完了
1. ~~ファイルアップロード実装~~ ✅
2. ~~空実装ボタンの修正~~ ✅
3. ~~クラッシュレポーティング統合~~ ✅
4. ~~Flutter最小テスト追加~~ ✅
5. ~~Console新規テスト追加~~ ✅
6. ~~統一監査ログ~~ ✅
7. ~~OTP再送機能~~ ✅
8. ~~CSVエクスポート拡充~~ ✅
9. ~~フォームバリデーション統一~~ ✅
10. ~~i18n基盤~~ ✅
11. ~~RLSポリシー整理~~ ✅
12. ~~ConsumerStatefulWidget修正（applicant-app）~~ ✅

### Phase 2: コード品質改善（次スプリント）
13. T-1: lightTextSecondary全体置換
14. T-2: employee-app ConsumerStatefulWidget変換
15. T-3: ErrorState全体置換
16. T-4: SECURITY DEFINER search_path追加

### Phase 3: 差別化機能
17. リアルタイム通知（WebSocket）
18. 検索機能の実装
19. メール通知基盤
20. MFA対応

### Phase 4: 成長フェーズ
21. RBAC細分化
22. カスタムレポート
23. オフライン対応
24. 外部連携API/Webhook
25. 監査ログパーティショニング
