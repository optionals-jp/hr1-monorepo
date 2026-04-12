import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_applicant_app/features/applications/presentation/providers/applications_providers.dart';
import 'package:hr1_applicant_app/features/todos/presentation/providers/todo_providers.dart';

/// 内定応答コントローラー（承諾 / 辞退）
class OfferResponseController extends AutoDisposeNotifier<void> {
  @override
  void build() {}

  /// 内定を承諾する
  Future<void> accept({required String applicationId}) async {
    final repo = ref.read(applicationsRepositoryProvider);
    await repo.respondToOffer(applicationId, accept: true);

    ref.invalidate(applicationsProvider);
    ref.invalidate(applicationDetailProvider(applicationId));
    ref.invalidate(allTodosProvider);
  }

  /// 内定を辞退する
  Future<void> decline({required String applicationId}) async {
    final repo = ref.read(applicationsRepositoryProvider);
    await repo.respondToOffer(applicationId, accept: false);

    ref.invalidate(applicationsProvider);
    ref.invalidate(applicationDetailProvider(applicationId));
  }
}

/// 内定応答コントローラープロバイダー
final offerResponseControllerProvider =
    AutoDisposeNotifierProvider<OfferResponseController, void>(
      OfferResponseController.new,
    );
