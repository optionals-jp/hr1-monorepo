import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../data/repositories/supabase_service_request_repository.dart';
import '../../domain/entities/service_request.dart';

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
