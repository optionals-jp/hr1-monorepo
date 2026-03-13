import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../auth/presentation/providers/organization_context_provider.dart';
import '../../data/repositories/supabase_company_repository.dart';
import '../../domain/entities/company_page_config.dart';

/// CompanyRepository プロバイダー
final companyRepositoryProvider = Provider<SupabaseCompanyRepository>((ref) {
  return SupabaseCompanyRepository(Supabase.instance.client);
});

/// 現在の企業のページ設定を取得
/// autoDispose により、画面を離れるたびにキャッシュが破棄され、
/// ホームタブに戻るたびに最新データを取得する
final companyPageConfigProvider =
    FutureProvider.autoDispose<CompanyPageConfig?>((ref) async {
  final org = ref.watch(currentOrganizationProvider);
  if (org == null) return null;
  final repo = ref.watch(companyRepositoryProvider);
  return repo.getPageConfigAsync(org.id);
});
