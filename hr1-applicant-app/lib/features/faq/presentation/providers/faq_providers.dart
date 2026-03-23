import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_applicant_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_applicant_app/features/auth/presentation/providers/organization_context_provider.dart';
import 'package:hr1_applicant_app/features/faq/data/repositories/supabase_faq_repository.dart';
import 'package:hr1_applicant_app/features/faq/domain/entities/faq_item.dart';

/// FAQ リポジトリプロバイダー
final faqRepositoryProvider = Provider<SupabaseFaqRepository>((ref) {
  return SupabaseFaqRepository(ref.watch(supabaseClientProvider));
});

/// 応募者向けFAQ一覧プロバイダー
final applicantFaqsProvider = FutureProvider.autoDispose<List<FaqItem>>((
  ref,
) async {
  final org = ref.watch(currentOrganizationProvider);
  if (org == null) return [];
  final repo = ref.watch(faqRepositoryProvider);
  return repo.getApplicantFaqs(org.id);
});
