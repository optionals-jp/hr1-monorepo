/// メッセージ添付ファイル
class MessageAttachment {
  const MessageAttachment({
    required this.id,
    required this.storagePath,
    required this.fileName,
    required this.mimeType,
    required this.byteSize,
    this.width,
    this.height,
  });

  final String id;
  final String storagePath;
  final String fileName;
  final String mimeType;
  final int byteSize;
  final int? width;
  final int? height;

  bool get isImage => mimeType.startsWith('image/');

  factory MessageAttachment.fromJson(Map<String, dynamic> json) {
    return MessageAttachment(
      id: json['id'].toString(),
      storagePath: json['storage_path'] as String,
      fileName: json['file_name'] as String,
      mimeType: json['mime_type'] as String,
      byteSize: (json['byte_size'] as num).toInt(),
      width: json['width'] == null ? null : (json['width'] as num).toInt(),
      height: json['height'] == null ? null : (json['height'] as num).toInt(),
    );
  }
}

/// メッセージリアクション集計
class MessageReactionSummary {
  const MessageReactionSummary({
    required this.emoji,
    required this.userIds,
    required this.count,
  });

  final String emoji;
  final List<String> userIds;
  final int count;

  bool reactedBy(String userId) => userIds.contains(userId);

  factory MessageReactionSummary.fromJson(Map<String, dynamic> json) {
    final rawUsers = json['user_ids'];
    final users = rawUsers is List
        ? rawUsers.map((e) => e.toString()).toList()
        : <String>[];
    return MessageReactionSummary(
      emoji: json['emoji'] as String,
      userIds: users,
      count: (json['count'] as num?)?.toInt() ?? users.length,
    );
  }
}

/// メッセージ
class Message {
  const Message({
    required this.id,
    required this.threadId,
    required this.senderId,
    required this.content,
    this.readAt,
    required this.createdAt,
    this.editedAt,
    this.deletedAt,
    this.parentMessageId,
    this.senderName,
    this.senderRole,
    this.senderAvatarUrl,
    this.attachments = const [],
    this.reactions = const [],
    this.mentionedUserIds = const [],
    this.replyCount = 0,
  });

  final String id;
  final String threadId;
  final String senderId;
  final String content;
  final DateTime? readAt;
  final DateTime createdAt;
  final DateTime? editedAt;
  final DateTime? deletedAt;
  final String? parentMessageId;
  final String? senderName;
  final String? senderRole;
  final String? senderAvatarUrl;
  final List<MessageAttachment> attachments;
  final List<MessageReactionSummary> reactions;
  final List<String> mentionedUserIds;
  final int replyCount;

  bool get isRead => readAt != null;
  bool get isEdited => editedAt != null;
  bool get isDeleted => deletedAt != null;
  bool get hasAttachments => attachments.isNotEmpty;

  factory Message.fromJson(Map<String, dynamic> json) {
    final sender = json['sender'] as Map<String, dynamic>?;
    final senderName =
        (json['sender_display_name'] as String?) ??
        (sender?['display_name'] as String?);
    final senderRole =
        (json['sender_role'] as String?) ?? (sender?['role'] as String?);
    final senderAvatar =
        (json['sender_avatar_url'] as String?) ??
        (sender?['avatar_url'] as String?);

    final rawAttachments = json['attachments'];
    final attachments = rawAttachments is List
        ? rawAttachments
              .whereType<Map<String, dynamic>>()
              .map(MessageAttachment.fromJson)
              .toList()
        : <MessageAttachment>[];

    final rawReactions = json['reactions'];
    final reactions = rawReactions is List
        ? rawReactions
              .whereType<Map<String, dynamic>>()
              .map(MessageReactionSummary.fromJson)
              .toList()
        : <MessageReactionSummary>[];

    final rawMentions = json['mentions'];
    final mentionedUserIds = rawMentions is List
        ? rawMentions
              .whereType<Map<String, dynamic>>()
              .map((m) => m['user_id']?.toString())
              .whereType<String>()
              .toList()
        : <String>[];

    return Message(
      id: json['id'] as String,
      threadId: json['thread_id'] as String,
      senderId: json['sender_id'] as String,
      content: (json['content'] as String?) ?? '',
      readAt: json['read_at'] != null
          ? DateTime.parse(json['read_at'] as String)
          : null,
      createdAt: DateTime.parse(json['created_at'] as String),
      editedAt: json['edited_at'] != null
          ? DateTime.parse(json['edited_at'] as String)
          : null,
      deletedAt: json['deleted_at'] != null
          ? DateTime.parse(json['deleted_at'] as String)
          : null,
      parentMessageId: json['parent_message_id'] as String?,
      senderName: senderName,
      senderRole: senderRole,
      senderAvatarUrl: senderAvatar,
      attachments: attachments,
      reactions: reactions,
      mentionedUserIds: mentionedUserIds,
      replyCount: (json['reply_count'] as num?)?.toInt() ?? 0,
    );
  }

  Message copyWith({
    String? content,
    DateTime? editedAt,
    DateTime? deletedAt,
    List<MessageAttachment>? attachments,
    List<MessageReactionSummary>? reactions,
  }) {
    return Message(
      id: id,
      threadId: threadId,
      senderId: senderId,
      content: content ?? this.content,
      readAt: readAt,
      createdAt: createdAt,
      editedAt: editedAt ?? this.editedAt,
      deletedAt: deletedAt ?? this.deletedAt,
      parentMessageId: parentMessageId,
      senderName: senderName,
      senderRole: senderRole,
      senderAvatarUrl: senderAvatarUrl,
      attachments: attachments ?? this.attachments,
      reactions: reactions ?? this.reactions,
      mentionedUserIds: mentionedUserIds,
      replyCount: replyCount,
    );
  }
}
