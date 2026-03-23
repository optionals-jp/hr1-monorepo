import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/features/service_requests/domain/entities/service_request.dart';
import 'package:hr1_employee_app/features/service_requests/presentation/providers/service_request_providers.dart';

/// サービスリクエスト作成コントローラー
final serviceRequestControllerProvider =
    AutoDisposeNotifierProvider<ServiceRequestController, AsyncValue<void>>(
      ServiceRequestController.new,
    );

class ServiceRequestController extends AutoDisposeNotifier<AsyncValue<void>> {
  @override
  AsyncValue<void> build() => const AsyncData(null);

  /// リクエストを送信
  Future<bool> submit({
    required String userId,
    required ServiceRequestType type,
    required String title,
    required String description,
  }) async {
    state = const AsyncLoading();
    try {
      final repo = ref.read(serviceRequestRepositoryProvider);
      await repo.createRequest(
        userId: userId,
        type: type,
        title: title,
        description: description,
      );
      ref.invalidate(serviceRequestsProvider);
      state = const AsyncData(null);
      return true;
    } catch (e, st) {
      state = AsyncError(e, st);
      return false;
    }
  }
}
