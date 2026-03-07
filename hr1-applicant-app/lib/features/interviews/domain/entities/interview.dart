import 'interview_slot.dart';

/// 面接の状態
enum InterviewStatus {
  /// 日程調整中（候補日選択待ち）
  scheduling('日程調整中'),

  /// 確定済み
  confirmed('確定済み'),

  /// 完了
  completed('完了'),

  /// キャンセル
  cancelled('キャンセル');

  const InterviewStatus(this.label);
  final String label;
}

/// 面接情報
class Interview {
  const Interview({
    required this.id,
    required this.applicationId,
    required this.status,
    required this.slots,
    this.confirmedSlotId,
    this.location,
    this.meetingUrl,
    this.notes,
  });

  final String id;
  final String applicationId;
  final InterviewStatus status;

  /// 候補日時のリスト
  final List<InterviewSlot> slots;

  /// 確定したスロットID
  final String? confirmedSlotId;

  /// 面接場所
  final String? location;

  /// オンライン面接URL
  final String? meetingUrl;

  /// 備考
  final String? notes;

  /// 確定した日時スロット
  InterviewSlot? get confirmedSlot =>
      confirmedSlotId != null
          ? slots.where((s) => s.id == confirmedSlotId).firstOrNull
          : null;

  factory Interview.fromJson(Map<String, dynamic> json) {
    return Interview(
      id: json['id'] as String,
      applicationId: json['application_id'] as String,
      status: InterviewStatus.values.firstWhere(
        (s) => s.name == json['status'],
        orElse: () => InterviewStatus.scheduling,
      ),
      slots: (json['slots'] as List<dynamic>?)
              ?.map(
                  (e) => InterviewSlot.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      confirmedSlotId: json['confirmed_slot_id'] as String?,
      location: json['location'] as String?,
      meetingUrl: json['meeting_url'] as String?,
      notes: json['notes'] as String?,
    );
  }
}
