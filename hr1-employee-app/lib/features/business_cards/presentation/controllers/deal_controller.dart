import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
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

  Future<BcDeal> createDeal(Map<String, dynamic> data) async {
    final repo = ref.read(bcRepositoryProvider);
    final deal = await repo.createDeal(data);
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
