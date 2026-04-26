import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:hr1_employee_app/features/ai_assistant/domain/entities/ai_message.dart';
import 'package:hr1_employee_app/features/ai_assistant/presentation/providers/ai_assistant_providers.dart';

/// AI 応答に対するユーザーフィードバック。
enum AiFeedback { none, good, bad }

/// AIチャット画面の状態。
///
/// `AsyncValue<List<AiMessage>>` を採用しないのは、(1) AI 応答待ち中も既往
/// メッセージを表示し続け、(2) typing フラグとメッセージリストを並列に
/// 更新する必要があり、`AsyncValue` の loading 状態が data を上書きする
/// セマンティクスでは表現できないため。エラーは state には残さず、
/// [aiChatErrorEventProvider] 経由で 1 回限りの SnackBar 通知に流す。
class AiChatState {
  const AiChatState({
    this.messages = const [],
    this.isAssistantTyping = false,
    this.feedbacks = const {},
  });

  final List<AiMessage> messages;
  final bool isAssistantTyping;

  /// AI メッセージ id → ユーザーが付けたフィードバック。
  /// 永続化はせず in-memory のみ（本実装では DB に保存）。
  final Map<String, AiFeedback> feedbacks;

  AiChatState copyWith({
    List<AiMessage>? messages,
    bool? isAssistantTyping,
    Map<String, AiFeedback>? feedbacks,
  }) {
    return AiChatState(
      messages: messages ?? this.messages,
      isAssistantTyping: isAssistantTyping ?? this.isAssistantTyping,
      feedbacks: feedbacks ?? this.feedbacks,
    );
  }
}

/// 1 回限りのエラー通知用イベント。
/// 直近のエラー発生 epoch (microseconds) を入れ、Screen 側で `ref.listen` する。
final aiChatErrorEventProvider = StateProvider<int>((_) => 0);

class AiChatController extends AutoDisposeNotifier<AiChatState> {
  bool _disposed = false;

  @override
  AiChatState build() {
    ref.onDispose(() {
      _disposed = true;
    });
    return const AiChatState();
  }

  /// ユーザー入力を送信し AI 応答を待つ。
  /// 空文字 / 既に typing 中なら何もしない。
  Future<void> sendMessage(String text) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty || state.isAssistantTyping) return;

    final userMsg = AiUserMessage(
      id: _generateId(),
      createdAt: DateTime.now(),
      text: trimmed,
    );

    state = state.copyWith(
      messages: [...state.messages, userMsg],
      isAssistantTyping: true,
    );

    await _requestReply(trimmed);
  }

  /// 会話をリセット（ヘッダーの新規会話アイコン用）。
  void clearConversation() {
    if (_disposed) return;
    state = const AiChatState();
  }

  /// 直前の AI 応答を再生成する。
  /// 該当する AI メッセージを取り除き、その直前のユーザー発話で再送信する。
  Future<void> regenerateLastResponse(String assistantMessageId) async {
    if (state.isAssistantTyping) return;
    final messages = state.messages;
    final assistantIdx = messages.indexWhere((m) => m.id == assistantMessageId);
    if (assistantIdx <= 0) return;
    final prev = messages[assistantIdx - 1];
    if (prev is! AiUserMessage) return;

    // AI 応答を消し、その対応フィードバックも除去。
    final newMessages = [...messages]..removeAt(assistantIdx);
    final newFeedbacks = {...state.feedbacks}..remove(assistantMessageId);
    state = state.copyWith(
      messages: newMessages,
      feedbacks: newFeedbacks,
      isAssistantTyping: true,
    );

    await _requestReply(prev.text);
  }

  /// `state.messages` を履歴として AI 応答を取得し、成功時は末尾に追記する。
  /// 失敗時は typing を解除し、`aiChatErrorEventProvider` に発火イベントを流す。
  ///
  /// 呼び出し元は事前に `state.copyWith(isAssistantTyping: true)` で
  /// メッセージリストを確定させてから呼ぶこと（`state.messages` を信頼するため）。
  Future<void> _requestReply(String prompt) async {
    final history = state.messages;
    try {
      final reply = await ref
          .read(aiAssistantRepositoryProvider)
          .sendMessage(text: prompt, history: history);
      // 画面離脱で AutoDispose されたら state 代入をスキップ。
      // disposed Notifier への代入は例外になる。
      if (_disposed) return;
      state = state.copyWith(
        messages: [...history, reply],
        isAssistantTyping: false,
      );
    } catch (e, st) {
      if (_disposed) return;
      debugPrint('AI sendMessage failed: $e\n$st');
      state = state.copyWith(isAssistantTyping: false);
      ref.read(aiChatErrorEventProvider.notifier).state =
          DateTime.now().microsecondsSinceEpoch;
    }
  }

  /// AI 応答に対するフィードバック (good/bad) のトグル。
  /// 同じボタンの再タップで none に戻る。
  void toggleFeedback(String assistantMessageId, AiFeedback feedback) {
    if (_disposed) return;
    final current = state.feedbacks[assistantMessageId] ?? AiFeedback.none;
    final next = current == feedback ? AiFeedback.none : feedback;
    final newFeedbacks = {...state.feedbacks};
    if (next == AiFeedback.none) {
      newFeedbacks.remove(assistantMessageId);
    } else {
      newFeedbacks[assistantMessageId] = next;
    }
    state = state.copyWith(feedbacks: newFeedbacks);
  }

  String _generateId() => 'msg_${DateTime.now().microsecondsSinceEpoch}';
}

final aiChatControllerProvider =
    AutoDisposeNotifierProvider<AiChatController, AiChatState>(
      AiChatController.new,
    );
