import 'package:hr1_shared/hr1_shared.dart';

/// メッセージスレッド（参加者単位）
class MessageThread {
  const MessageThread({
    required this.id,
    required this.organizationId,
    required this.participantId,
    required this.participantType,
    this.title,
    required this.createdAt,
    required this.updatedAt,
    this.participantName,
    this.latestMessage,
    this.unreadCount = 0,
  });

  final String id;
  final String organizationId;
  final String participantId;
  final String participantType; // "applicant" | "employee"
  final String? title;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? participantName;
  final Message? latestMessage;
  final int unreadCount;

  factory MessageThread.fromJson(Map<String, dynamic> json) {
    final participant = json['participant'] as Map<String, dynamic>?;

    return MessageThread(
      id: json['id'] as String,
      organizationId: json['organization_id'] as String,
      participantId: json['participant_id'] as String,
      participantType: json['participant_type'] as String? ?? 'employee',
      title: json['title'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
      participantName:
          participant?['display_name'] as String? ??
          participant?['email'] as String?,
    );
  }

  MessageThread copyWith({Message? latestMessage, int? unreadCount}) {
    return MessageThread(
      id: id,
      organizationId: organizationId,
      participantId: participantId,
      participantType: participantType,
      title: title,
      createdAt: createdAt,
      updatedAt: updatedAt,
      participantName: participantName,
      latestMessage: latestMessage ?? this.latestMessage,
      unreadCount: unreadCount ?? this.unreadCount,
    );
  }
}
