import 'package:hr1_employee_app/features/workflow/domain/entities/workflow_request.dart';

import '../../domain/entities/ai_action.dart';
import '../../domain/entities/ai_card.dart';
import '../../domain/entities/ai_message.dart';
import '../../domain/entities/ai_reference.dart';
import '../../domain/repositories/ai_assistant_repository.dart';

/// AIアシスタントの仮データ実装。
///
/// **設計上の重要前提:**
/// このクラスと private な [_AiIntentClassifier] は **Mock 専用の擬似 routing**
/// であり、本実装フェーズでは Edge Function 経由で Claude API のtool calling に
/// 完全に置き換わる。クライアント側に intent 分類ロジックは残さない方針なので、
/// classifier は外部公開せずファイル内 private に閉じる。
///
/// 切り替え手順（本実装移行時）:
/// 1. `aiAssistantRepositoryProvider` を `SupabaseAiAssistantRepository(client)` に変更
/// 2. このファイルを丸ごと削除
/// 3. domain / presentation 層は無変更
class MockAiAssistantRepository implements AiAssistantRepository {
  const MockAiAssistantRepository();

  @override
  Future<AiAssistantMessage> sendMessage({
    required String text,
    required List<AiMessage> history,
  }) async {
    // 体感的な応答時間を演出。本物のAPI呼び出しに差し替えると実時間になる。
    await Future<void>.delayed(const Duration(milliseconds: 700));

    final intent = _AiIntentClassifier.classify(text);
    return switch (intent) {
      _AiIntent.overtimeSummary => _buildOvertimeSummary(),
      _AiIntent.workflowLeave => _buildLeaveWorkflowSuggestion(),
      _AiIntent.clientInfo => _buildClientInfo(text),
      _AiIntent.workflowOther => _buildGenericWorkflowSuggestion(),
      _AiIntent.fallback => _buildFallback(),
    };
  }

  AiAssistantMessage _buildOvertimeSummary() {
    return AiAssistantMessage(
      id: _newId(),
      createdAt: DateTime.now(),
      text: '今週は **6.3h** の残業です。月間上限 45h まで **35.7h** 余裕があります。',
      cards: const [
        OvertimeSummaryCardData(
          weeklyHours: 6.3,
          monthlyLimitHours: 45,
          monthlyAccumulatedHours: 9.3,
          previousWeekDeltaHours: -1.2,
          dailyBreakdown: [
            DailyOvertimeEntry(dayLabel: '月', hours: 1.2),
            DailyOvertimeEntry(dayLabel: '火', hours: 2.5),
            DailyOvertimeEntry(dayLabel: '水', hours: 0.8),
            DailyOvertimeEntry(dayLabel: '木', hours: 1.8, isToday: true),
            DailyOvertimeEntry(dayLabel: '金', hours: 0.0),
          ],
        ),
      ],
      references: const [
        AiReference(
          index: 1,
          title: '勤怠データ (4/16-4/22)',
          type: AiReferenceType.attendanceLog,
        ),
        AiReference(
          index: 2,
          title: '36協定 (上限規制)',
          type: AiReferenceType.workflowRule,
        ),
      ],
      actions: const [
        AiAction(
          label: '勤怠詳細を開く',
          actionType: AiActionType.navigateAttendance,
          style: AiActionStyle.primary,
        ),
        AiAction(
          label: '休暇を申請',
          actionType: AiActionType.openWorkflowCreate,
          payload: {'type': WorkflowRequestType.paidLeave},
        ),
      ],
    );
  }

  AiAssistantMessage _buildLeaveWorkflowSuggestion() {
    return AiAssistantMessage(
      id: _newId(),
      createdAt: DateTime.now(),
      text: '有給休暇の申請ですね。高橋さんの残日数は **12.5日** です。申請の流れをご案内します。',
      cards: const [
        WorkflowSuggestionCardData(
          workflowType: WorkflowRequestType.paidLeave,
          balanceDays: 12.5,
          steps: [
            '申請日と区分（全休/午前/午後）を選択',
            '理由・引き継ぎ事項を記入（任意）',
            '承認者：佐藤 部長 に自動送信',
            '通常 1営業日以内に承認結果を通知',
          ],
          approverName: '佐藤 部長',
          notes: '連続5営業日以上は2週間前までの申請推奨です（就業規則 第18条）',
        ),
      ],
      references: const [
        AiReference(
          index: 1,
          title: '就業規則 第18条 (休暇)',
          type: AiReferenceType.workflowRule,
        ),
        AiReference(
          index: 2,
          title: '有給休暇取得ガイド',
          type: AiReferenceType.wikiPage,
        ),
      ],
      actions: const [
        AiAction(
          label: '申請フォームを開く',
          actionType: AiActionType.openWorkflowCreate,
          payload: {'type': WorkflowRequestType.paidLeave},
          style: AiActionStyle.primary,
        ),
        AiAction(
          label: '残日数を確認',
          actionType: AiActionType.navigateLeaveBalance,
        ),
        AiAction(label: '取得履歴', actionType: AiActionType.navigateLeaveBalance),
      ],
    );
  }

  AiAssistantMessage _buildClientInfo(String userText) {
    final companyName = _extractCompanyName(userText) ?? 'ノース電機 株式会社';
    return AiAssistantMessage(
      id: _newId(),
      createdAt: DateTime.now(),
      text: '$companyName 様の関連資料を **3件** 見つけました。また、関連する商談が CRM に **1件** 進行中です。',
      cards: [
        ClientInfoCardData(
          companyName: companyName,
          industry: '製造業',
          contactName: '高橋 匠',
          dealStage: '提案中',
          dealAmountYen: 18400000,
          dealConfidencePercent: 72,
          dealCloseDate: DateTime(2026, 5, 15),
          documents: [
            ClientDocument(
              fileName: '${_companyShort(companyName)}_提案書_v4.pdf',
              fileSizeLabel: '3.2 MB',
              authorName: '高橋 匠',
              uploadedAt: DateTime.now().subtract(const Duration(hours: 16)),
              isNew: true,
            ),
            ClientDocument(
              fileName: '製品カタログ_2026Q1.pdf',
              fileSizeLabel: '8.7 MB',
              authorName: '営業企画',
              uploadedAt: DateTime.now().subtract(const Duration(days: 8)),
            ),
            ClientDocument(
              fileName: '見積書_v2.xlsx',
              fileSizeLabel: '0.4 MB',
              authorName: '営業管理',
              uploadedAt: DateTime.now().subtract(const Duration(days: 14)),
            ),
          ],
        ),
      ],
      references: const [
        AiReference(
          index: 1,
          title: 'CRM 商談データ',
          type: AiReferenceType.crmRecord,
        ),
      ],
      actions: const [
        AiAction(
          label: '商談を開く',
          actionType: AiActionType.openCrmCompany,
          style: AiActionStyle.primary,
        ),
        AiAction(label: '会社情報を見る', actionType: AiActionType.openCrmCompany),
      ],
    );
  }

  AiAssistantMessage _buildGenericWorkflowSuggestion() {
    return AiAssistantMessage(
      id: _newId(),
      createdAt: DateTime.now(),
      text: 'どの申請をされたいですか？よく使われる申請を表示します。',
      actions: const [
        AiAction(
          label: '有給休暇',
          actionType: AiActionType.openWorkflowCreate,
          payload: {'type': WorkflowRequestType.paidLeave},
        ),
        AiAction(
          label: '残業',
          actionType: AiActionType.openWorkflowCreate,
          payload: {'type': WorkflowRequestType.overtime},
        ),
        AiAction(
          label: '出張',
          actionType: AiActionType.openWorkflowCreate,
          payload: {'type': WorkflowRequestType.businessTrip},
        ),
        AiAction(
          label: '経費精算',
          actionType: AiActionType.openWorkflowCreate,
          payload: {'type': WorkflowRequestType.expense},
        ),
      ],
    );
  }

  AiAssistantMessage _buildFallback() {
    return AiAssistantMessage(
      id: _newId(),
      createdAt: DateTime.now(),
      text:
          'ご質問の意図を読み取れませんでした。\n例えば次のように聞いてみてください:\n・「今週の残業時間は？」\n・「有給を申請したい」\n・「ノース電機の最新の提案資料を探して」',
      actions: const [
        AiAction(
          label: '今週の残業時間は？',
          actionType: AiActionType.prefillMessage,
          payload: {'text': '今週の残業時間は？月の上限まで何時間ある？'},
        ),
        AiAction(
          label: '有給を申請したい',
          actionType: AiActionType.prefillMessage,
          payload: {'text': '有給を申請したい'},
        ),
      ],
    );
  }

  /// "ノース電機の資料を探して" のような入力から会社名らしき部分を抜き出す。
  /// 抽出失敗時は null を返し、呼び出し側でデフォルト名にフォールバックする。
  String? _extractCompanyName(String text) {
    final match = RegExp(
      r'([\p{Letter}\p{Number}・ー]+(?:電機|株式会社|商事|工業|製作所|商店|システムズ))',
      unicode: true,
    ).firstMatch(text);
    return match?.group(1);
  }

  String _companyShort(String name) {
    return name.replaceAll(RegExp(r'(株式会社|\s+)'), '').trim();
  }

  String _newId() => 'msg_${DateTime.now().microsecondsSinceEpoch}';
}

/// Mock 専用の intent 分類器。本実装では Edge Function 側に移譲され、
/// ここは丸ごと削除される。
class _AiIntentClassifier {
  static _AiIntent classify(String text) {
    if (_overtimeKeywords.any(text.contains)) return _AiIntent.overtimeSummary;
    if (_leaveKeywords.any(text.contains)) return _AiIntent.workflowLeave;
    if (_clientKeywords.any(text.contains)) return _AiIntent.clientInfo;
    if (_workflowKeywords.any(text.contains)) return _AiIntent.workflowOther;
    return _AiIntent.fallback;
  }

  static const _overtimeKeywords = ['残業', '時間外', '上限', '36協定'];
  static const _leaveKeywords = ['有給', '休暇', '休み'];
  static const _clientKeywords = ['取引先', '商談', '提案', '資料', 'クライアント'];
  static const _workflowKeywords = ['申請', 'ワークフロー', '稟議'];
}

enum _AiIntent {
  overtimeSummary,
  clientInfo,
  workflowLeave,
  workflowOther,
  fallback,
}
