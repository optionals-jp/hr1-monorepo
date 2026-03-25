import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_company.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/providers/business_card_providers.dart';

/// 企業リストコントローラー
final companyListControllerProvider =
    AutoDisposeAsyncNotifierProvider<CompanyListController, List<BcCompany>>(
  CompanyListController.new,
);

class CompanyListController
    extends AutoDisposeAsyncNotifier<List<BcCompany>> {
  @override
  FutureOr<List<BcCompany>> build() async {
    final repo = ref.watch(bcRepositoryProvider);
    return repo.getCompanies();
  }

  Future<void> search(String query) async {
    final repo = ref.read(bcRepositoryProvider);
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => repo.getCompanies(query: query));
  }

  Future<BcCompany> createCompany(Map<String, dynamic> data) async {
    final repo = ref.read(bcRepositoryProvider);
    final company = await repo.createCompany(data);
    ref.invalidate(bcCompaniesProvider);
    ref.invalidateSelf();
    return company;
  }

  Future<void> deleteCompany(String id) async {
    final repo = ref.read(bcRepositoryProvider);
    await repo.deleteCompany(id);
    ref.invalidate(bcCompaniesProvider);
    ref.invalidateSelf();
  }
}

/// 企業詳細コントローラー
final companyDetailControllerProvider = AutoDisposeAsyncNotifierProviderFamily<
    CompanyDetailController, BcCompany?, String>(
  CompanyDetailController.new,
);

class CompanyDetailController
    extends AutoDisposeFamilyAsyncNotifier<BcCompany?, String> {
  @override
  FutureOr<BcCompany?> build(String arg) async {
    final repo = ref.watch(bcRepositoryProvider);
    return repo.getCompany(arg);
  }

  Future<void> updateCompany(Map<String, dynamic> data) async {
    final repo = ref.read(bcRepositoryProvider);
    await repo.updateCompany(arg, data);
    ref.invalidate(bcCompaniesProvider);
    ref.invalidateSelf();
  }
}
