import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/service_requests/data/repositories/supabase_service_request_repository.dart';
import 'package:hr1_employee_app/features/service_requests/domain/entities/service_request.dart';

/// リポジトリプロバイダー
final serviceRequestRepositoryProvider =
    Provider<SupabaseServiceRequestRepository>((ref) {
      return SupabaseServiceRequestRepository(
        ref.watch(supabaseClientProvider),
      );
    });

/// サービスリクエスト一覧プロバイダー
final serviceRequestsProvider =
    FutureProvider.autoDispose<List<ServiceRequest>>((ref) async {
      final user = ref.watch(appUserProvider);
      if (user == null) return [];
      final repo = ref.watch(serviceRequestRepositoryProvider);
      return repo.getRequests(user.id);
    });
