import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../data/repositories/supabase_shift_repository.dart';
import '../../domain/entities/shift_request.dart';

/// リポジトリプロバイダー
final shiftRepositoryProvider = Provider<SupabaseShiftRepository>((ref) {
  final user = ref.watch(appUserProvider);
  return SupabaseShiftRepository(
    ref.watch(supabaseClientProvider),
    overrideUserId: user?.id,
  );
});

/// シフト希望プロバイダー（月単位）
final shiftRequestsProvider =
    FutureProvider.family<List<ShiftRequest>, ({int year, int month})>((
      ref,
      params,
    ) async {
      final repo = ref.watch(shiftRepositoryProvider);
      return repo.getMyRequests(params.year, params.month);
    });

/// 確定シフトプロバイダー（月単位）
final shiftSchedulesProvider =
    FutureProvider.family<List<ShiftSchedule>, ({int year, int month})>((
      ref,
      params,
    ) async {
      final repo = ref.watch(shiftRepositoryProvider);
      return repo.getMySchedules(params.year, params.month);
    });
