import '../entities/interview.dart';

/// 面接リポジトリの抽象インターフェース
abstract class InterviewsRepository {
  /// 面接IDから面接情報を取得
  Future<Interview?> getInterview(String interviewId);

  /// スロットを確定（application_id をセットして予約）
  Future<void> confirmSlot({
    required String slotId,
    required String applicationId,
  });
}
