import 'ai_action.dart';
import 'ai_card.dart';
import 'ai_reference.dart';

/// AIアシスタント会話における 1 メッセージ。
///
/// ユーザー発話 ([AiUserMessage]) と AI 応答 ([AiAssistantMessage]) を
/// sealed class で区別する。AI 応答は本文テキストに加え、リッチカード・
/// 参照情報・クイックアクションを携える。
sealed class AiMessage {
  const AiMessage({required this.id, required this.createdAt});

  final String id;
  final DateTime createdAt;
}

class AiUserMessage extends AiMessage {
  const AiUserMessage({
    required super.id,
    required super.createdAt,
    required this.text,
  });

  final String text;
}

class AiAssistantMessage extends AiMessage {
  const AiAssistantMessage({
    required super.id,
    required super.createdAt,
    required this.text,
    this.cards = const [],
    this.references = const [],
    this.actions = const [],
  });

  /// メッセージ本文（カード上部の説明文）。
  final String text;

  /// 添付カード。0〜N 個。
  final List<AiCardData> cards;

  /// 「参照した情報」セクションに表示するリンク。
  final List<AiReference> references;

  /// クイックアクションボタン。
  final List<AiAction> actions;
}
