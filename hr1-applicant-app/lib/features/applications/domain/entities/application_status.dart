/// 応募ステータス（大分類）
enum ApplicationStatus {
  /// 選考中（ステップが進行中）
  active('active', '選考中'),

  /// 内定
  offered('offered', '内定'),

  /// 内定承諾
  offerAccepted('offer_accepted', '内定承諾'),

  /// 内定辞退
  offerDeclined('offer_declined', '内定辞退'),

  /// 不採用
  rejected('rejected', '不採用'),

  /// 辞退
  withdrawn('withdrawn', '辞退');

  const ApplicationStatus(this.value, this.label);

  /// DB / JSON で使用する値
  final String value;

  /// 表示用ラベル
  final String label;

  /// 進行中かどうか
  bool get isActive => this == active;

  /// 内定への応答が可能かどうか
  bool get canRespondToOffer => this == offered;

  /// DB値から変換
  static ApplicationStatus fromString(String value) {
    return ApplicationStatus.values.firstWhere(
      (e) => e.value == value,
      orElse: () => ApplicationStatus.active,
    );
  }
}
