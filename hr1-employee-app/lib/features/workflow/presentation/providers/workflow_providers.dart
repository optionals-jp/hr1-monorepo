import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/core/organization/organization_context.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/workflow/data/repositories/supabase_workflow_repository.dart';
import 'package:hr1_employee_app/features/workflow/domain/entities/workflow_request.dart';

/// リポジトリプロバイダー
final workflowRepositoryProvider = Provider<SupabaseWorkflowRepository>((ref) {
  final user = ref.watch(appUserProvider);
  return SupabaseWorkflowRepository(
    ref.watch(supabaseClientProvider),
    activeOrganizationId: ref.watch(activeOrganizationIdProvider),
    overrideUserId: user?.id,
  );
});

/// 自分の申請一覧プロバイダー
final workflowRequestsProvider =
    FutureProvider.autoDispose<List<WorkflowRequest>>((ref) async {
      final repo = ref.watch(workflowRepositoryProvider);
      return repo.getMyRequests();
    });

/// ステータスで絞り込んだ申請一覧プロバイダー
final workflowRequestsByStatusProvider = FutureProvider.autoDispose
    .family<List<WorkflowRequest>, WorkflowRequestStatus?>((ref, status) async {
      final repo = ref.watch(workflowRepositoryProvider);
      return repo.getMyRequests(status: status);
    });
