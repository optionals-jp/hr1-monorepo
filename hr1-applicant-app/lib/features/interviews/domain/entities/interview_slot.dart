/// 面接の候補日時スロット
class InterviewSlot {
  const InterviewSlot({
    required this.id,
    required this.startAt,
    required this.endAt,
    this.isSelected = false,
  });

  final String id;
  final DateTime startAt;
  final DateTime endAt;

  /// 応募者が選択したかどうか
  final bool isSelected;

  /// 所要時間（分）
  int get durationMinutes => endAt.difference(startAt).inMinutes;

  factory InterviewSlot.fromJson(Map<String, dynamic> json) {
    return InterviewSlot(
      id: json['id'] as String,
      startAt: DateTime.parse(json['start_at'] as String),
      endAt: DateTime.parse(json['end_at'] as String),
      isSelected: json['is_selected'] as bool? ?? false,
    );
  }
}
