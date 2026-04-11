import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_employee_app/features/business_cards/data/repositories/supabase_business_card_repository.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_activity.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_card.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_company.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_contact.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_deal.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_todo.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/crm_pipeline_stage.dart';
import 'package:hr1_employee_app/features/business_cards/domain/repositories/business_card_repository.dart';

/// リポジトリプロバイダー
final bcRepositoryProvider = Provider<BusinessCardRepository>((ref) {
  return SupabaseBusinessCardRepository(Supabase.instance.client);
});

// ==========================================================
// 企業
// ==========================================================

/// 企業一覧
final bcCompaniesProvider = FutureProvider.autoDispose<List<BcCompany>>((
  ref,
) async {
  final repo = ref.watch(bcRepositoryProvider);
  return repo.getCompanies();
});

/// 企業検索
final bcCompanySearchProvider = FutureProvider.autoDispose
    .family<List<BcCompany>, String>((ref, query) async {
      final repo = ref.watch(bcRepositoryProvider);
      return repo.getCompanies(query: query);
    });

/// 企業詳細
final bcCompanyDetailProvider = FutureProvider.autoDispose
    .family<BcCompany?, String>((ref, id) async {
      final repo = ref.watch(bcRepositoryProvider);
      return repo.getCompany(id);
    });

// ==========================================================
// 連絡先
// ==========================================================

/// 連絡先一覧
final bcContactsProvider = FutureProvider.autoDispose<List<BcContact>>((
  ref,
) async {
  final repo = ref.watch(bcRepositoryProvider);
  return repo.getContacts();
});

/// 連絡先検索
final bcContactSearchProvider = FutureProvider.autoDispose
    .family<List<BcContact>, String>((ref, query) async {
      final repo = ref.watch(bcRepositoryProvider);
      return repo.getContacts(query: query);
    });

/// 企業別連絡先
final bcContactsByCompanyProvider = FutureProvider.autoDispose
    .family<List<BcContact>, String>((ref, companyId) async {
      final repo = ref.watch(bcRepositoryProvider);
      return repo.getContacts(companyId: companyId);
    });

/// 連絡先詳細
final bcContactDetailProvider = FutureProvider.autoDispose
    .family<BcContact?, String>((ref, id) async {
      final repo = ref.watch(bcRepositoryProvider);
      return repo.getContact(id);
    });

// ==========================================================
// 商談
// ==========================================================

/// 商談一覧
final bcDealsProvider = FutureProvider.autoDispose<List<BcDeal>>((ref) async {
  final repo = ref.watch(bcRepositoryProvider);
  return repo.getDeals();
});

/// 企業別商談
final bcDealsByCompanyProvider = FutureProvider.autoDispose
    .family<List<BcDeal>, String>((ref, companyId) async {
      final repo = ref.watch(bcRepositoryProvider);
      return repo.getDeals(companyId: companyId);
    });

/// 連絡先別商談
final bcDealsByContactProvider = FutureProvider.autoDispose
    .family<List<BcDeal>, String>((ref, contactId) async {
      final repo = ref.watch(bcRepositoryProvider);
      return repo.getDeals(contactId: contactId);
    });

/// 商談詳細
final bcDealDetailProvider = FutureProvider.autoDispose.family<BcDeal?, String>(
  (ref, id) async {
    final repo = ref.watch(bcRepositoryProvider);
    return repo.getDeal(id);
  },
);

// ==========================================================
// パイプラインステージ
// ==========================================================

/// 自テナントのデフォルトパイプラインのステージ一覧
final crmPipelineStagesProvider =
    FutureProvider.autoDispose<List<CrmPipelineStage>>((ref) async {
      final repo = ref.watch(bcRepositoryProvider);
      return repo.getPipelineStages();
    });

/// stage_id → ステージ名 (label) を解決するヘルパー
String resolveStageLabel(String? stageId, List<CrmPipelineStage> stages) {
  if (stageId == null) return '—';
  for (final s in stages) {
    if (s.id == stageId) return s.name;
  }
  return '—';
}

// ==========================================================
// 活動
// ==========================================================

/// 企業別活動
final bcActivitiesByCompanyProvider = FutureProvider.autoDispose
    .family<List<BcActivity>, String>((ref, companyId) async {
      final repo = ref.watch(bcRepositoryProvider);
      return repo.getActivities(companyId: companyId);
    });

/// 連絡先別活動
final bcActivitiesByContactProvider = FutureProvider.autoDispose
    .family<List<BcActivity>, String>((ref, contactId) async {
      final repo = ref.watch(bcRepositoryProvider);
      return repo.getActivities(contactId: contactId);
    });

/// 商談別活動
final bcActivitiesByDealProvider = FutureProvider.autoDispose
    .family<List<BcActivity>, String>((ref, dealId) async {
      final repo = ref.watch(bcRepositoryProvider);
      return repo.getActivities(dealId: dealId);
    });

// ==========================================================
// TODO
// ==========================================================

/// 自分のCRM TODO（未完了）
final bcMyTodosProvider = FutureProvider.autoDispose<List<BcTodo>>((ref) async {
  final repo = ref.watch(bcRepositoryProvider);
  return repo.getMyTodos();
});

/// 全CRM TODO
final bcAllTodosProvider = FutureProvider.autoDispose<List<BcTodo>>((
  ref,
) async {
  final repo = ref.watch(bcRepositoryProvider);
  return repo.getTodos();
});

// ==========================================================
// 名刺画像
// ==========================================================

/// 連絡先別名刺画像
final bcCardsByContactProvider = FutureProvider.autoDispose
    .family<List<BcCard>, String>((ref, contactId) async {
      final repo = ref.watch(bcRepositoryProvider);
      return repo.getCards(contactId: contactId);
    });
