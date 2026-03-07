/// 応募ステータス
enum ApplicationStatus {
  /// 書類選考中
  screening('書類選考中'),

  /// フォーム回答待ち
  formPending('フォーム回答待ち'),

  /// 面接日程調整中
  interviewScheduling('面接日程調整中'),

  /// 面接予定
  interviewScheduled('面接予定'),

  /// 面接完了
  interviewCompleted('面接完了'),

  /// 内定
  offered('内定'),

  /// 不採用
  rejected('不採用'),

  /// 辞退
  withdrawn('辞退');

  const ApplicationStatus(this.label);

  /// 表示用ラベル
  final String label;

  /// 進行中かどうか
  bool get isActive => this != rejected && this != withdrawn;

  /// アクションが必要かどうか
  bool get requiresAction =>
      this == formPending || this == interviewScheduling;
}
