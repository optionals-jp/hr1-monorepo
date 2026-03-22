import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/payslips/data/repositories/supabase_payslip_repository.dart';
import 'package:hr1_employee_app/features/payslips/domain/entities/payslip.dart';

/// リポジトリプロバイダー
final payslipRepositoryProvider = Provider<SupabasePayslipRepository>((ref) {
  final user = ref.watch(appUserProvider);
  return SupabasePayslipRepository(
    ref.watch(supabaseClientProvider),
    overrideUserId: user?.id,
  );
});

/// 給与明細一覧プロバイダー
final payslipsProvider = FutureProvider.autoDispose<List<Payslip>>((ref) async {
  final repo = ref.watch(payslipRepositoryProvider);
  return repo.getPayslips();
});

/// 年別給与明細プロバイダー
final payslipsByYearProvider = FutureProvider.autoDispose
    .family<List<Payslip>, int>((ref, year) async {
      final repo = ref.watch(payslipRepositoryProvider);
      return repo.getPayslips(year: year);
    });

/// 利用可能年プロバイダー
final payslipAvailableYearsProvider = FutureProvider.autoDispose<List<int>>((
  ref,
) async {
  final repo = ref.watch(payslipRepositoryProvider);
  return repo.getAvailableYears();
});

/// 選択年プロバイダー
final selectedYearProvider =
    AutoDisposeNotifierProvider<SelectedYearNotifier, int>(
      SelectedYearNotifier.new,
    );

class SelectedYearNotifier extends AutoDisposeNotifier<int> {
  @override
  int build() => DateTime.now().year;

  void setYear(int year) {
    state = year;
  }
}
