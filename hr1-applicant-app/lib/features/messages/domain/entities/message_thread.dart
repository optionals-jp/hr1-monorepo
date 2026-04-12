import 'package:hr1_shared/hr1_shared.dart';

/// メッセージスレッド（応募単位）
class MessageThread {
  const MessageThread({
    required this.id,
    required this.organizationId,
    this.applicationId,
    this.title,
    required this.createdAt,
    required this.updatedAt,
    this.jobTitle,
    this.organizationName,
    this.latestMessage,
    this.unreadCount = 0,
  });

  final String id;
  final String organizationId;
  final String? applicationId;
  final String? title;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? jobTitle;
  final String? organizationName;
  final Message? latestMessage;
  final int unreadCount;

  factory MessageThread.fromJson(Map<String, dynamic> json) {
    return MessageThread(
      id: json['id'] as String,
      organizationId: json['organization_id'] as String,
      applicationId: json['application_id'] as String?,
      title: json['title'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
      jobTitle: json['job_title'] as String?,
      organizationName: json['organization_name'] as String?,
    );
  }

  MessageThread copyWith({Message? latestMessage, int? unreadCount}) {
    return MessageThread(
      id: id,
      organizationId: organizationId,
      applicationId: applicationId,
      title: title,
      createdAt: createdAt,
      updatedAt: updatedAt,
      jobTitle: jobTitle,
      organizationName: organizationName,
      latestMessage: latestMessage ?? this.latestMessage,
      unreadCount: unreadCount ?? this.unreadCount,
    );
  }
}
