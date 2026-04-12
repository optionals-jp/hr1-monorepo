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
    this.senderName,
    this.senderRole,
  });

  final String id;
  final String threadId;
  final String senderId;
  final String content;
  final DateTime? readAt;
  final DateTime createdAt;
  final DateTime? editedAt;
  final String? senderName;
  final String? senderRole;

  bool get isRead => readAt != null;
  bool get isEdited => editedAt != null;

  factory Message.fromJson(Map<String, dynamic> json) {
    final sender = json['sender'] as Map<String, dynamic>?;
    return Message(
      id: json['id'] as String,
      threadId: json['thread_id'] as String,
      senderId: json['sender_id'] as String,
      content: json['content'] as String,
      readAt: json['read_at'] != null
          ? DateTime.parse(json['read_at'] as String)
          : null,
      createdAt: DateTime.parse(json['created_at'] as String),
      editedAt: json['edited_at'] != null
          ? DateTime.parse(json['edited_at'] as String)
          : null,
      senderName: sender?['display_name'] as String?,
      senderRole: sender?['role'] as String?,
    );
  }

  Message copyWith({String? content, DateTime? editedAt}) {
    return Message(
      id: id,
      threadId: threadId,
      senderId: senderId,
      content: content ?? this.content,
      readAt: readAt,
      createdAt: createdAt,
      editedAt: editedAt ?? this.editedAt,
      senderName: senderName,
      senderRole: senderRole,
    );
  }
}
