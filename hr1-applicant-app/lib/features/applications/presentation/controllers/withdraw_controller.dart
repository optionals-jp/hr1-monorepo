import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_applicant_app/features/applications/presentation/providers/applications_providers.dart';

/// 応募辞退コントローラー
class WithdrawController extends AutoDisposeNotifier<void> {
  @override
  void build() {}

  /// 応募を辞退する
  Future<void> withdraw({required String applicationId}) async {
    final repo = ref.read(applicationsRepositoryProvider);
    await repo.withdraw(applicationId);

    ref.invalidate(applicationsProvider);
    ref.invalidate(applicationDetailProvider(applicationId));
  }
}

/// 応募辞退コントローラープロバイダー
final withdrawControllerProvider =
    AutoDisposeNotifierProvider<WithdrawController, void>(
      WithdrawController.new,
    );
