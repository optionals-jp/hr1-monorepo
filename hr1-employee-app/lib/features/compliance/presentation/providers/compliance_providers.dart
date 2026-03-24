import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/compliance/data/repositories/supabase_compliance_repository.dart';
import 'package:hr1_employee_app/features/compliance/domain/entities/compliance_alert.dart';

final complianceRepositoryProvider = Provider<SupabaseComplianceRepository>((
  ref,
) {
  final user = ref.watch(appUserProvider);
  return SupabaseComplianceRepository(
    ref.watch(supabaseClientProvider),
    overrideUserId: user?.id,
  );
});

final myComplianceAlertsProvider =
    FutureProvider.autoDispose<List<ComplianceAlert>>((ref) {
      return ref.watch(complianceRepositoryProvider).getMyAlerts();
    });
