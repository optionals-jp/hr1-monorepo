/// AI 応答メッセージの「参照した情報」セクションに表示するリンク。
class AiReference {
  const AiReference({
    required this.index,
    required this.title,
    required this.type,
    this.payload = const {},
  });

  /// 表示順 ([1], [2], ...)。
  final int index;

  /// リンク表示名。
  final String title;

  final AiReferenceType type;
  final Map<String, dynamic> payload;
}

enum AiReferenceType {
  attendanceLog,

  /// 36協定 / 就業規則等の規定。
  workflowRule,

  /// 社内Wikiページ。
  wikiPage,

  /// CRM レコード（商談・連絡先）。
  crmRecord,
}
