import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/core/organization/organization_context.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/wiki/data/repositories/supabase_wiki_repository.dart';
import 'package:hr1_employee_app/features/wiki/domain/entities/wiki_page.dart';

final wikiRepositoryProvider = Provider<SupabaseWikiRepository>((ref) {
  final user = ref.watch(appUserProvider);
  return SupabaseWikiRepository(
    ref.watch(supabaseClientProvider),
    activeOrganizationId: ref.watch(activeOrganizationIdProvider),
    overrideUserId: user?.id,
  );
});

final wikiPagesProvider = FutureProvider.autoDispose<List<WikiPage>>((
  ref,
) async {
  final repo = ref.watch(wikiRepositoryProvider);
  return repo.getPublishedPages();
});
