import 'package:flutter_test/flutter_test.dart';
import 'package:hr1_employee_app/features/ai_assistant/data/repositories/mock_ai_assistant_repository.dart';
import 'package:hr1_employee_app/features/ai_assistant/domain/entities/ai_card.dart';

void main() {
  const repo = MockAiAssistantRepository();

  test('残業キーワードで OvertimeSummaryCardData が返る', () async {
    final reply = await repo.sendMessage(
      text: '今週の残業時間は？月の上限まで何時間ある？',
      history: [],
    );
    expect(reply.cards, isNotEmpty);
    expect(reply.cards.first, isA<OvertimeSummaryCardData>());
    expect(reply.references, isNotEmpty);
    expect(reply.actions, isNotEmpty);
  });

  test('有給キーワードで WorkflowSuggestionCardData が返る', () async {
    final reply = await repo.sendMessage(text: '有給を申請したい', history: []);
    expect(reply.cards.first, isA<WorkflowSuggestionCardData>());
  });

  test('企業名キーワードで ClientInfoCardData が返り、入力から企業名を抽出する', () async {
    final reply = await repo.sendMessage(
      text: 'ノース電機の最新の提案資料を探して',
      history: [],
    );
    expect(reply.cards.first, isA<ClientInfoCardData>());
    final card = reply.cards.first as ClientInfoCardData;
    expect(card.companyName, contains('ノース電機'));
    expect(card.documents, isNotEmpty);
  });

  test('一般的な申請キーワードで提案アクションが返る（カードなし）', () async {
    final reply = await repo.sendMessage(text: '申請したい', history: []);
    expect(reply.cards, isEmpty);
    expect(reply.actions, isNotEmpty);
  });

  test('未知の入力で fallback メッセージが返る', () async {
    final reply = await repo.sendMessage(text: 'こんにちは', history: []);
    expect(reply.cards, isEmpty);
    // fallback でも prefill アクションは提示される。
    expect(reply.actions, isNotEmpty);
  });
}
