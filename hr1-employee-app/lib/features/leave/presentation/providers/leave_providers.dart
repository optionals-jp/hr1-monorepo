import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/leave/data/repositories/supabase_leave_repository.dart';
import 'package:hr1_employee_app/features/leave/domain/entities/leave_balance.dart';

/// リポジトリプロバイダー
final leaveRepositoryProvider = Provider<SupabaseLeaveRepository>((ref) {
  final user = ref.watch(appUserProvider);
  return SupabaseLeaveRepository(
    ref.watch(supabaseClientProvider),
    overrideUserId: user?.id,
  );
});

/// 全年度の残日数プロバイダー
final leaveBalancesProvider = FutureProvider.autoDispose<List<LeaveBalance>>((
  ref,
) async {
  final repo = ref.watch(leaveRepositoryProvider);
  return repo.getBalances();
});

/// 当年度の残日数プロバイダー
final currentLeaveBalanceProvider = FutureProvider.autoDispose<LeaveBalance?>((
  ref,
) async {
  final repo = ref.watch(leaveRepositoryProvider);
  return repo.getCurrentBalance();
});
