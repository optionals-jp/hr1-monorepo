import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/core/organization/organization_context.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/shifts/data/repositories/supabase_shift_repository.dart';
import 'package:hr1_employee_app/features/shifts/domain/entities/shift_request.dart';

/// リポジトリプロバイダー
final shiftRepositoryProvider = Provider<SupabaseShiftRepository>((ref) {
  final user = ref.watch(appUserProvider);
  return SupabaseShiftRepository(
    ref.watch(supabaseClientProvider),
    activeOrganizationId: ref.watch(activeOrganizationIdProvider),
    overrideUserId: user?.id,
  );
});

/// シフト希望プロバイダー（月単位）
final shiftRequestsProvider = FutureProvider.autoDispose
    .family<List<ShiftRequest>, ({int year, int month})>((ref, params) async {
      final repo = ref.watch(shiftRepositoryProvider);
      return repo.getMyRequests(params.year, params.month);
    });

/// 確定シフトプロバイダー（月単位）
final shiftSchedulesProvider = FutureProvider.autoDispose
    .family<List<ShiftSchedule>, ({int year, int month})>((ref, params) async {
      final repo = ref.watch(shiftRepositoryProvider);
      return repo.getMySchedules(params.year, params.month);
    });
