import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_applicant_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_applicant_app/features/auth/presentation/providers/organization_context_provider.dart';
import 'package:hr1_applicant_app/features/applications/data/repositories/supabase_applications_repository.dart';
import 'package:hr1_applicant_app/features/applications/domain/entities/application.dart';
import 'package:hr1_applicant_app/features/applications/domain/entities/application_status.dart';
import 'package:hr1_applicant_app/features/applications/domain/entities/job.dart';
import 'package:hr1_applicant_app/features/applications/domain/repositories/applications_repository.dart';

/// ApplicationsRepository プロバイダー
final applicationsRepositoryProvider = Provider<ApplicationsRepository>((ref) {
  return SupabaseApplicationsRepository(ref.watch(supabaseClientProvider));
});

/// 現在の企業に対する応募一覧（現在のユーザーのみ）
final applicationsProvider = FutureProvider.autoDispose<List<Application>>((
  ref,
) async {
  final currentOrg = ref.watch(currentOrganizationProvider);
  final currentUser = ref.watch(appUserProvider);
  if (currentOrg == null || currentUser == null) return [];
  final repo = ref.watch(applicationsRepositoryProvider);
  return repo.getApplications(currentOrg.id, currentUser.id);
});

/// 応募IDから応募情報を取得
final applicationDetailProvider = FutureProvider.autoDispose
    .family<Application?, String>((ref, applicationId) async {
      final repo = ref.watch(applicationsRepositoryProvider);
      return repo.getApplication(applicationId);
    });

/// 現在の企業の求人一覧
final jobsProvider = FutureProvider.autoDispose<List<Job>>((ref) async {
  final currentOrg = ref.watch(currentOrganizationProvider);
  if (currentOrg == null) return [];
  final repo = ref.watch(applicationsRepositoryProvider);
  return repo.getJobs(currentOrg.id);
});

/// 求人IDから求人情報を取得
final jobDetailProvider = FutureProvider.autoDispose.family<Job?, String>((
  ref,
  jobId,
) async {
  final repo = ref.watch(applicationsRepositoryProvider);
  return repo.getJob(jobId);
});

/// 進行中の応募一覧（対応必要を優先、日付降順）
final inProgressApplicationsProvider =
    FutureProvider.autoDispose<List<Application>>((ref) async {
      final applications = await ref.watch(applicationsProvider.future);
      final inProgress =
          applications
              .where(
                (a) =>
                    a.status == ApplicationStatus.active ||
                    a.status == ApplicationStatus.offered,
              )
              .toList()
            ..sort((a, b) {
              if (a.requiresAction && !b.requiresAction) return -1;
              if (!a.requiresAction && b.requiresAction) return 1;
              return b.appliedAt.compareTo(a.appliedAt);
            });
      return inProgress;
    });

/// 完了済みの応募一覧（日付降順）
final completedApplicationsProvider =
    FutureProvider.autoDispose<List<Application>>((ref) async {
      final applications = await ref.watch(applicationsProvider.future);
      final completed =
          applications
              .where(
                (a) =>
                    a.status != ApplicationStatus.active &&
                    a.status != ApplicationStatus.offered,
              )
              .toList()
            ..sort((a, b) => b.appliedAt.compareTo(a.appliedAt));
      return completed;
    });

/// 未応募かつ募集中の求人一覧
final availableJobsProvider = FutureProvider.autoDispose<List<Job>>((
  ref,
) async {
  final applications = await ref.watch(applicationsProvider.future);
  final jobs = await ref.watch(jobsProvider.future);
  final appliedJobIds = applications.map((a) => a.jobId).toSet();
  return jobs.where((j) => !appliedJobIds.contains(j.id) && j.isOpen).toList();
});
