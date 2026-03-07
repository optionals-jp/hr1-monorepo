import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../data/repositories/supabase_interviews_repository.dart';
import '../../domain/entities/interview.dart';

/// InterviewsRepository プロバイダー
final interviewsRepositoryProvider =
    Provider<SupabaseInterviewsRepository>((ref) {
  return SupabaseInterviewsRepository(Supabase.instance.client);
});

/// 面接IDから面接情報を取得
final interviewDetailProvider =
    FutureProvider.family<Interview?, String>((ref, interviewId) async {
  final repo = ref.watch(interviewsRepositoryProvider);
  return repo.getInterviewAsync(interviewId);
});

/// 選択中のスロットIDを管理
final selectedSlotProvider =
    StateProvider.autoDispose.family<String?, String>((ref, interviewId) => null);
