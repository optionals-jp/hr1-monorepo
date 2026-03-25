import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_contact.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/providers/business_card_providers.dart';

/// 連絡先リストコントローラー
final contactListControllerProvider =
    AutoDisposeAsyncNotifierProvider<ContactListController, List<BcContact>>(
  ContactListController.new,
);

class ContactListController
    extends AutoDisposeAsyncNotifier<List<BcContact>> {
  @override
  FutureOr<List<BcContact>> build() async {
    final repo = ref.watch(bcRepositoryProvider);
    return repo.getContacts();
  }

  Future<void> search(String query) async {
    final repo = ref.read(bcRepositoryProvider);
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => repo.getContacts(query: query));
  }

  Future<void> deleteContact(String id) async {
    final repo = ref.read(bcRepositoryProvider);
    await repo.deleteContact(id);
    ref.invalidate(bcContactsProvider);
    ref.invalidateSelf();
  }
}

/// 連絡先詳細コントローラー
final contactDetailControllerProvider = AutoDisposeAsyncNotifierProviderFamily<
    ContactDetailController, BcContact?, String>(
  ContactDetailController.new,
);

class ContactDetailController
    extends AutoDisposeFamilyAsyncNotifier<BcContact?, String> {
  @override
  FutureOr<BcContact?> build(String arg) async {
    final repo = ref.watch(bcRepositoryProvider);
    return repo.getContact(arg);
  }

  Future<void> updateContact(Map<String, dynamic> data) async {
    final repo = ref.read(bcRepositoryProvider);
    await repo.updateContact(arg, data);
    ref.invalidate(bcContactsProvider);
    ref.invalidateSelf();
  }
}
