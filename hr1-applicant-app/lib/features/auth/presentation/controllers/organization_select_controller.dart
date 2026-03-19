import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/result/result.dart';
import '../providers/auth_providers.dart';

/// 企業選択の状態
class OrganizationSelectState {
  const OrganizationSelectState({
    this.isSubmitting = false,
    this.error,
    this.submitted = false,
  });

  final bool isSubmitting;
  final String? error;
  final bool submitted;
}

/// 企業選択コントローラー
class OrganizationSelectController
    extends AutoDisposeNotifier<OrganizationSelectState> {
  @override
  OrganizationSelectState build() => const OrganizationSelectState();

  /// 選択した企業に登録し、ユーザー情報を再取得
  Future<void> submit(Set<String> organizationIds) async {
    if (organizationIds.isEmpty) return;
    state = const OrganizationSelectState(isSubmitting: true);

    try {
      final client = Supabase.instance.client;
      final userId = client.auth.currentUser!.id;

      // 1件ずつ挿入（既存は無視）
      for (final orgId in organizationIds) {
        try {
          await client.from('user_organizations').insert({
            'user_id': userId,
            'organization_id': orgId,
          });
        } on PostgrestException catch (e) {
          // 23505 = unique_violation（既に登録済み）→ 無視
          if (e.code != '23505') rethrow;
        }
      }

      // ユーザー情報を再取得
      final authRepo = ref.read(authRepositoryProvider);
      final result = await authRepo.getCurrentUser();
      switch (result) {
        case Success(data: final user):
          ref.read(appUserProvider.notifier).setUser(user);
        case Failure():
          break;
      }

      state = const OrganizationSelectState(submitted: true);
    } on PostgrestException catch (e) {
      state = OrganizationSelectState(error: e.message);
    } catch (e) {
      state = const OrganizationSelectState(
        error: '通信エラーが発生しました。しばらくしてから再度お試しください',
      );
    }
  }
}

final organizationSelectControllerProvider =
    AutoDisposeNotifierProvider<
      OrganizationSelectController,
      OrganizationSelectState
    >(OrganizationSelectController.new);
