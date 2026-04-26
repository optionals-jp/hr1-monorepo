import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_deal.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/providers/business_card_providers.dart';

/// 商談リストコントローラー
final dealListControllerProvider =
    AutoDisposeAsyncNotifierProvider<DealListController, List<BcDeal>>(
      DealListController.new,
    );

class DealListController extends AutoDisposeAsyncNotifier<List<BcDeal>> {
  @override
  FutureOr<List<BcDeal>> build() async {
    final repo = ref.watch(bcRepositoryProvider);
    return repo.getDeals();
  }

  /// 商談を新規登録する。Screen からは raw 入力を受け取り、
  /// 金額のパースや日付整形・assigned_to の解決はここで行う。
  Future<BcDeal> createDeal({
    required String title,
    String? amountInput,
    String? stageId,
    DateTime? expectedCloseDate,
    String? description,
    String? companyId,
    String? contactId,
  }) async {
    final user = ref.read(appUserProvider);
    if (user == null) {
      throw StateError('createDeal requires an authenticated user');
    }
    final amount = amountInput == null || amountInput.isEmpty
        ? null
        : int.tryParse(amountInput.replaceAll(',', ''));

    final repo = ref.read(bcRepositoryProvider);
    final deal = await repo.createDeal({
      'title': title.trim(),
      'amount': amount,
      'stage_id': stageId,
      'expected_close_date': expectedCloseDate
          ?.toIso8601String()
          .split('T')
          .first,
      'description': (description == null || description.trim().isEmpty)
          ? null
          : description.trim(),
      'company_id': companyId,
      'contact_id': contactId,
      'assigned_to': user.id,
    });
    ref.invalidate(bcDealsProvider);
    ref.invalidateSelf();
    return deal;
  }

  Future<void> updateDeal(String id, Map<String, dynamic> data) async {
    final repo = ref.read(bcRepositoryProvider);
    await repo.updateDeal(id, data);
    ref.invalidate(bcDealsProvider);
    ref.invalidateSelf();
  }

  Future<void> deleteDeal(String id) async {
    final repo = ref.read(bcRepositoryProvider);
    await repo.deleteDeal(id);
    ref.invalidate(bcDealsProvider);
    ref.invalidateSelf();
  }
}

/// 商談詳細コントローラー
final dealDetailControllerProvider =
    AutoDisposeAsyncNotifierProviderFamily<
      DealDetailController,
      BcDeal?,
      String
    >(DealDetailController.new);

class DealDetailController
    extends AutoDisposeFamilyAsyncNotifier<BcDeal?, String> {
  @override
  FutureOr<BcDeal?> build(String arg) async {
    final repo = ref.watch(bcRepositoryProvider);
    return repo.getDeal(arg);
  }

  Future<void> updateDeal(Map<String, dynamic> data) async {
    final repo = ref.read(bcRepositoryProvider);
    await repo.updateDeal(arg, data);
    ref.invalidate(bcDealsProvider);
    ref.invalidateSelf();
  }
}
