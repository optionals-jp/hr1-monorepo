/// AI 応答メッセージに付くクイックアクションボタン。
///
/// `actionType` で「どこに飛ぶか」を表現し、`payload` で必要な引数
/// （workflowType, companyId 等）を渡す。go_router の `extra` が
/// `dynamic` であるため、payload も `Map<String, dynamic>` で受ける。
class AiAction {
  const AiAction({
    required this.label,
    required this.actionType,
    this.payload = const {},
    this.style = AiActionStyle.outline,
  });

  final String label;
  final AiActionType actionType;
  final Map<String, dynamic> payload;
  final AiActionStyle style;
}

enum AiActionStyle { primary, outline }

enum AiActionType {
  navigateAttendance,
  navigateLeaveBalance,

  /// payload: { 'type': WorkflowRequestType }
  openWorkflowCreate,

  /// payload: { 'companyId': String }
  openCrmCompany,

  /// payload: { 'pageId': String }
  openWiki,

  /// payload: { 'text': String } 入力欄に prefill する。
  prefillMessage,
}
