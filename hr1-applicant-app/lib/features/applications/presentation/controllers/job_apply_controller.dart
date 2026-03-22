import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_applicant_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_applicant_app/features/auth/presentation/providers/organization_context_provider.dart';
import '../providers/applications_providers.dart';

/// 求人応募コントローラー
class JobApplyController extends AutoDisposeNotifier<void> {
  @override
  void build() {}

  /// 求人に応募する
  Future<void> apply({required String jobId}) async {
    final org = ref.read(currentOrganizationProvider);
    if (org == null) return;

    final user = ref.read(appUserProvider);
    if (user == null) return;

    final repo = ref.read(applicationsRepositoryProvider);
    await repo.apply(
      jobId: jobId,
      applicantId: user.id,
      organizationId: org.id,
    );

    ref.invalidate(applicationsProvider);
  }
}

/// 求人応募コントローラープロバイダー
final jobApplyControllerProvider =
    AutoDisposeNotifierProvider<JobApplyController, void>(
      JobApplyController.new,
    );
