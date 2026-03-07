import '../entities/interview.dart';

/// 面接リポジトリの抽象インターフェース
abstract class InterviewsRepository {
  /// 面接IDから面接情報を取得
  Interview? getInterview(String interviewId);
}
