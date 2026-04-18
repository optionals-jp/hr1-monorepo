import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/core/organization/organization_context.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/faq/data/repositories/supabase_faq_repository.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// FAQ リポジトリプロバイダー
final faqRepositoryProvider = Provider<SupabaseFaqRepository>((ref) {
  final user = ref.watch(appUserProvider);
  return SupabaseFaqRepository(
    ref.watch(supabaseClientProvider),
    activeOrganizationId: ref.watch(activeOrganizationIdProvider),
    overrideUserId: user?.id,
  );
});

/// 社員向けFAQ一覧プロバイダー
final employeeFaqsProvider = FutureProvider.autoDispose<List<FaqItem>>((
  ref,
) async {
  final repo = ref.watch(faqRepositoryProvider);
  return repo.getEmployeeFaqs();
});
