import '../entities/ai_message.dart';

/// AIアシスタントのデータソース抽象。
///
/// 現フェーズは `MockAiAssistantRepository` でキーワード分類による仮データを返すが、
/// 本実装フェーズでは Edge Function 経由で Claude API を呼ぶ
/// `SupabaseAiAssistantRepository` に差し替える。
/// 切り替えは `aiAssistantRepositoryProvider` の中身を入れ替えるのみで完結し、
/// 上位 (Controller / Screen / Widget) は無変更で動作する。
abstract class AiAssistantRepository {
  /// ユーザー入力を受け取り AI 応答を返す。
  ///
  /// [history] は会話文脈として渡される（フォローアップ判定用）。
  /// **今回送信される [text] に対応する [AiUserMessage] を含む** リスト
  /// （送信直前に Controller が追加するため）。本実装フェーズで Edge
  /// Function に渡す際は、最新メッセージは [text] と重複するためサーバー側で
  /// 重複排除するか、Controller 側で除外して渡すかを揃える必要がある。
  Future<AiAssistantMessage> sendMessage({
    required String text,
    required List<AiMessage> history,
  });
}
