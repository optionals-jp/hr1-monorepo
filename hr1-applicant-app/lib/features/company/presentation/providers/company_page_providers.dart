import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_applicant_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_applicant_app/features/auth/presentation/providers/organization_context_provider.dart';
import 'package:hr1_applicant_app/features/company/data/repositories/supabase_company_repository.dart';
import 'package:hr1_applicant_app/features/company/domain/entities/company_page_config.dart';
import 'package:hr1_applicant_app/features/company/domain/repositories/company_repository.dart';

/// CompanyRepository プロバイダー
final companyRepositoryProvider = Provider<CompanyRepository>((ref) {
  return SupabaseCompanyRepository(ref.watch(supabaseClientProvider));
});

/// 現在の企業のページ設定を取得
/// autoDispose により、画面を離れるたびにキャッシュが破棄され、
/// ホームタブに戻るたびに最新データを取得する
final companyPageConfigProvider =
    FutureProvider.autoDispose<CompanyPageConfig?>((ref) async {
      final org = ref.watch(currentOrganizationProvider);
      if (org == null) return null;
      final repo = ref.watch(companyRepositoryProvider);
      return repo.getPageConfig(org.id);
    });
