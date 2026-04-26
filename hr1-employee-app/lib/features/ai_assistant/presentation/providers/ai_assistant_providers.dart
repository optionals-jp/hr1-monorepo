import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/repositories/mock_ai_assistant_repository.dart';
import '../../domain/repositories/ai_assistant_repository.dart';

/// AI アシスタントの Repository。
///
/// 本実装フェーズでは Edge Function 経由の `SupabaseAiAssistantRepository`
/// に差し替える。 [AiAssistantRepository] の契約を維持する限り、Controller /
/// Screen / Widget には変更が及ばない。
final aiAssistantRepositoryProvider = Provider<AiAssistantRepository>((ref) {
  return const MockAiAssistantRepository();
});
