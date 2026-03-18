import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../data/repositories/supabase_interviews_repository.dart';
import '../../domain/entities/interview.dart';
import '../../domain/repositories/interviews_repository.dart';

/// InterviewsRepository プロバイダー
final interviewsRepositoryProvider = Provider<InterviewsRepository>((ref) {
  return SupabaseInterviewsRepository(ref.watch(supabaseClientProvider));
});

/// 面接IDから面接情報を取得
final interviewDetailProvider = FutureProvider.autoDispose
    .family<Interview?, String>((ref, interviewId) async {
      final repo = ref.watch(interviewsRepositoryProvider);
      return repo.getInterview(interviewId);
    });

/// 選択中のスロットIDを管理
final selectedSlotProvider = StateProvider.autoDispose.family<String?, String>(
  (ref, interviewId) => null,
);
