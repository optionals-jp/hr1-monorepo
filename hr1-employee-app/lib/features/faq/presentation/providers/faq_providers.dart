import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../data/repositories/supabase_faq_repository.dart';
import '../../domain/entities/faq_item.dart';

/// FAQ リポジトリプロバイダー
final faqRepositoryProvider = Provider<SupabaseFaqRepository>((ref) {
  final user = ref.watch(appUserProvider);
  return SupabaseFaqRepository(
    ref.watch(supabaseClientProvider),
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
