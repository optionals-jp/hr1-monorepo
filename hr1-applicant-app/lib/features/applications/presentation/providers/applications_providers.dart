import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../auth/presentation/providers/auth_providers.dart';
import '../../../auth/presentation/providers/organization_context_provider.dart';
import '../../data/repositories/supabase_applications_repository.dart';
import '../../domain/entities/application.dart';
import '../../domain/entities/job.dart';

/// ApplicationsRepository プロバイダー
final applicationsRepositoryProvider =
    Provider<SupabaseApplicationsRepository>((ref) {
  return SupabaseApplicationsRepository(Supabase.instance.client);
});

/// 現在の企業に対する応募一覧（現在のユーザーのみ）
final applicationsProvider = FutureProvider<List<Application>>((ref) async {
  final currentOrg = ref.watch(currentOrganizationProvider);
  final currentUser = ref.watch(appUserProvider);
  if (currentOrg == null || currentUser == null) return [];
  final repo = ref.watch(applicationsRepositoryProvider);
  return repo.getApplicationsAsync(currentOrg.id, currentUser.id);
});

/// 応募IDから応募情報を取得
final applicationDetailProvider =
    FutureProvider.family<Application?, String>((ref, applicationId) async {
  final repo = ref.watch(applicationsRepositoryProvider);
  return repo.getApplicationAsync(applicationId);
});

/// 現在の企業の求人一覧
final jobsProvider = FutureProvider<List<Job>>((ref) async {
  final currentOrg = ref.watch(currentOrganizationProvider);
  if (currentOrg == null) return [];
  final repo = ref.watch(applicationsRepositoryProvider);
  return repo.getJobsAsync(currentOrg.id);
});

/// 求人IDから求人情報を取得
final jobDetailProvider =
    FutureProvider.family<Job?, String>((ref, jobId) async {
  final repo = ref.watch(applicationsRepositoryProvider);
  return repo.getJobAsync(jobId);
});
