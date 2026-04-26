import 'package:flutter_test/flutter_test.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/features/ai_assistant/domain/entities/ai_message.dart';
import 'package:hr1_employee_app/features/ai_assistant/domain/repositories/ai_assistant_repository.dart';
import 'package:hr1_employee_app/features/ai_assistant/presentation/controllers/ai_chat_controller.dart';
import 'package:hr1_employee_app/features/ai_assistant/presentation/providers/ai_assistant_providers.dart';

class _FakeRepository implements AiAssistantRepository {
  _FakeRepository({this.shouldFail = false});

  final bool shouldFail;
  int callCount = 0;

  @override
  Future<AiAssistantMessage> sendMessage({
    required String text,
    required List<AiMessage> history,
  }) async {
    callCount++;
    await Future<void>.delayed(const Duration(milliseconds: 10));
    if (shouldFail) throw StateError('simulated failure');
    return AiAssistantMessage(
      id: 'reply_$callCount',
      createdAt: DateTime.now(),
      text: 'Echo: $text',
    );
  }
}

void main() {
  ProviderContainer makeContainer(_FakeRepository repo) {
    final container = ProviderContainer(
      overrides: [aiAssistantRepositoryProvider.overrideWithValue(repo)],
    );
    // AutoDispose Notifier を生かしておくための keep-alive 購読。
    // テスト内で `read` のみだと購読が消えた瞬間に notifier が dispose され、
    // `_disposed` フラグが立って以降の state 更新が無視される。
    container.listen(aiChatControllerProvider, (_, __) {});
    return container;
  }

  test('正常系: ユーザー → typing → AI 応答 の順で state が更新される', () async {
    final repo = _FakeRepository();
    final container = makeContainer(repo);
    addTearDown(container.dispose);

    final notifier = container.read(aiChatControllerProvider.notifier);
    final future = notifier.sendMessage('こんにちは');

    final mid = container.read(aiChatControllerProvider);
    expect(mid.messages.length, 1);
    expect(mid.messages.first, isA<AiUserMessage>());
    expect(mid.isAssistantTyping, true);

    await future;

    final after = container.read(aiChatControllerProvider);
    expect(after.messages.length, 2);
    expect(after.messages.last, isA<AiAssistantMessage>());
    expect(after.isAssistantTyping, false);
  });

  test('空文字送信は state を変えない', () async {
    final repo = _FakeRepository();
    final container = makeContainer(repo);
    addTearDown(container.dispose);

    await container.read(aiChatControllerProvider.notifier).sendMessage('   ');

    expect(container.read(aiChatControllerProvider).messages, isEmpty);
    expect(repo.callCount, 0);
  });

  test('typing 中の連続送信は無視される', () async {
    final repo = _FakeRepository();
    final container = makeContainer(repo);
    addTearDown(container.dispose);

    final notifier = container.read(aiChatControllerProvider.notifier);
    final first = notifier.sendMessage('1回目');
    // typing 中のはずなので 2 回目は何もしない。
    await notifier.sendMessage('2回目');
    await first;

    expect(repo.callCount, 1);
    expect(container.read(aiChatControllerProvider).messages.length, 2);
  });

  test('Repository 失敗時: typing が解除されエラーイベントが発火する', () async {
    final repo = _FakeRepository(shouldFail: true);
    final container = makeContainer(repo);
    addTearDown(container.dispose);

    final initialEvent = container.read(aiChatErrorEventProvider);
    await container
        .read(aiChatControllerProvider.notifier)
        .sendMessage('失敗テスト');

    final state = container.read(aiChatControllerProvider);
    expect(state.isAssistantTyping, false);
    // ユーザーメッセージは残る、AI 応答は付かない。
    expect(state.messages.length, 1);
    expect(container.read(aiChatErrorEventProvider), greaterThan(initialEvent));
  });

  test('clearConversation で全メッセージが消える', () async {
    final repo = _FakeRepository();
    final container = makeContainer(repo);
    addTearDown(container.dispose);

    final notifier = container.read(aiChatControllerProvider.notifier);
    await notifier.sendMessage('こんにちは');
    expect(container.read(aiChatControllerProvider).messages, isNotEmpty);

    notifier.clearConversation();
    expect(container.read(aiChatControllerProvider).messages, isEmpty);
  });
}
