import '../entities/application.dart';
import '../entities/job.dart';

/// 応募リポジトリの抽象インターフェース
abstract class ApplicationsRepository {
  /// 企業IDに紐づく応募一覧を取得
  List<Application> getApplications(String organizationId);

  /// 応募IDから応募情報を取得
  Application? getApplication(String applicationId);

  /// 企業IDに紐づく求人一覧を取得
  List<Job> getJobs(String organizationId);

  /// 求人IDから求人情報を取得
  Job? getJob(String jobId);

  /// 企業IDに紐づく応募一覧を非同期取得
  Future<List<Application>> getApplicationsAsync(String organizationId);

  /// 応募IDから応募情報を非同期取得
  Future<Application?> getApplicationAsync(String applicationId);

  /// 企業IDに紐づく求人一覧を非同期取得
  Future<List<Job>> getJobsAsync(String organizationId);

  /// 求人IDから求人情報を非同期取得
  Future<Job?> getJobAsync(String jobId);

  /// 求人に応募する
  Future<Application> applyAsync({
    required String jobId,
    required String applicantId,
    required String organizationId,
  });
}
