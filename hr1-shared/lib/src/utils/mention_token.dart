/// メンションのトークン表現ユーティリティ
///
/// 本文内に `@[表示名](user-uuid)` 形式で埋め込み、表示時は `@表示名`、
/// 送信時は UUID 配列を抽出する。`]` や `)` を含む表示名は後方最短マッチで破綻しないよう、
/// 非貪欲マッチを使用する。
///
/// Web / Flutter 双方で同一形式を扱うため共通ロジックとして提供。
library;

class MentionSegment {
  const MentionSegment({required this.text, this.userId});

  /// プレーンテキストなら本文、メンションなら表示名（@付き）を含めた表示文字列
  final String text;

  /// メンション対象 user_id。プレーンテキストなら null
  final String? userId;

  bool get isMention => userId != null;
}

/// `@[name](uuid)` 形式のメンションを検出する正規表現
/// - name: `]` を含まない任意文字
/// - uuid: `)` を含まない任意文字
final RegExp _mentionPattern = RegExp(r'@\[([^\]]+)\]\(([^)]+)\)');

/// 本文を [MentionSegment] 列に分割する
List<MentionSegment> parseMentionTokens(String raw) {
  final result = <MentionSegment>[];
  var cursor = 0;
  for (final match in _mentionPattern.allMatches(raw)) {
    if (match.start > cursor) {
      result.add(MentionSegment(text: raw.substring(cursor, match.start)));
    }
    result.add(
      MentionSegment(text: '@${match.group(1)!}', userId: match.group(2)!),
    );
    cursor = match.end;
  }
  if (cursor < raw.length) {
    result.add(MentionSegment(text: raw.substring(cursor)));
  }
  return result;
}

/// 本文から送信 API へ渡す `mentioned_user_ids` を抽出する
List<String> extractMentionedUserIds(String raw) {
  return _mentionPattern
      .allMatches(raw)
      .map((m) => m.group(2)!)
      .toSet()
      .toList();
}

/// 表示用に `@[name](uuid)` → `@name` に変換したプレーンテキストを返す
String stripMentionTokens(String raw) {
  return raw.replaceAllMapped(_mentionPattern, (m) => '@${m.group(1)!}');
}

/// メンショントークンを挿入した文字列を生成する
String buildMentionToken(String displayName, String userId) =>
    '@[$displayName]($userId)';
