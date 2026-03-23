import 'package:hr1_applicant_app/features/applications/domain/entities/application.dart';
import 'package:hr1_applicant_app/features/applications/domain/entities/job.dart';

/// 応募リポジトリの抽象インターフェース
abstract class ApplicationsRepository {
  /// 企業IDと応募者IDに紐づく応募一覧を取得
  Future<List<Application>> getApplications(
    String organizationId,
    String applicantId,
  );

  /// 応募IDから応募情報を取得
  Future<Application?> getApplication(String applicationId);

  /// 企業IDに紐づく求人一覧を取得
  Future<List<Job>> getJobs(String organizationId);

  /// 求人IDから求人情報を取得
  Future<Job?> getJob(String jobId);

  /// 求人に応募する
  Future<Application> apply({
    required String jobId,
    required String applicantId,
    required String organizationId,
  });

  /// 選考ステップを完了し、次のステップを自動的に開始する
  Future<void> completeStep(String stepId, String applicationId);
}
