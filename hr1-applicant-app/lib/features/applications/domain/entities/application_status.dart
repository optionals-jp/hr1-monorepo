/// 応募ステータス（大分類）
enum ApplicationStatus {
  /// 選考中（ステップが進行中）
  active('選考中'),

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
  bool get isActive => this == active;
}
