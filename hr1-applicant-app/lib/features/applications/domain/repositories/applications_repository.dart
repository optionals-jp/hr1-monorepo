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
}
