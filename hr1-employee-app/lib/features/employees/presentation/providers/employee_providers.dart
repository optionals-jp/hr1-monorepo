import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/core/organization/organization_context.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/employees/data/repositories/supabase_employee_repository.dart';

/// 社員リポジトリプロバイダー
final employeeRepositoryProvider = Provider<SupabaseEmployeeRepository>((ref) {
  final user = ref.watch(appUserProvider);
  return SupabaseEmployeeRepository(
    ref.watch(supabaseClientProvider),
    activeOrganizationId: ref.watch(activeOrganizationIdProvider),
    overrideUserId: user?.id,
  );
});
