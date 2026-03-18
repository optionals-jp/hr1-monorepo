import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';

/// 通知の種類
enum NotificationType {
  surveyRequest('survey_request', 'サーベイ依頼', Icons.poll_outlined, Color(0xFF8764B8)),
  taskAssigned('task_assigned', 'タスク割り当て', Icons.task_alt_rounded, AppColors.brandPrimary),
  recruitmentUpdate('recruitment_update', '採用フロー更新', Icons.work_outline_rounded, AppColors.warning),
  attendanceReminder('attendance_reminder', '勤怠リマインド', Icons.schedule_rounded, AppColors.brandPrimary),
  messageReceived('message_received', 'メッセージ受信', Icons.chat_bubble_outline_rounded, AppColors.success),
  announcement('announcement', 'お知らせ', Icons.campaign_outlined, AppColors.brandPrimary),
  general('general', 'その他', Icons.notifications_outlined, AppColors.brandLight);

  const NotificationType(this.value, this.label, this.icon, this.color);
  final String value;
  final String label;
  final IconData icon;
  final Color color;

  static NotificationType fromValue(String value) {
    return NotificationType.values.firstWhere(
      (e) => e.value == value,
      orElse: () => NotificationType.general,
    );
  }
}

/// 通知エンティティ
class NotificationItem {
  NotificationItem({
    required this.id,
    required this.organizationId,
    required this.userId,
    required this.type,
    required this.title,
    this.body,
    this.isRead = false,
    this.readAt,
    this.actionUrl,
    this.metadata,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String organizationId;
  final String userId;
  final NotificationType type;
  final String title;
  final String? body;
  final bool isRead;
  final DateTime? readAt;
  final String? actionUrl;
  final Map<String, dynamic>? metadata;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      id: json['id'] as String,
      organizationId: json['organization_id'] as String,
      userId: json['user_id'] as String,
      type: NotificationType.fromValue(json['type'] as String),
      title: json['title'] as String,
      body: json['body'] as String?,
      isRead: json['is_read'] as bool? ?? false,
      readAt: json['read_at'] != null ? DateTime.parse(json['read_at'] as String) : null,
      actionUrl: json['action_url'] as String?,
      metadata: json['metadata'] as Map<String, dynamic>?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  NotificationItem copyWith({bool? isRead, DateTime? readAt}) {
    return NotificationItem(
      id: id,
      organizationId: organizationId,
      userId: userId,
      type: type,
      title: title,
      body: body,
      isRead: isRead ?? this.isRead,
      readAt: readAt ?? this.readAt,
      actionUrl: actionUrl,
      metadata: metadata,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }
}
