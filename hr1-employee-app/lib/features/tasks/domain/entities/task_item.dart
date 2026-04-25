enum TaskPriority { urgent, high, mid, low }

enum TaskStatus { backlog, todo, inprogress, review, qa, done }

enum TaskSource { crm, project, workflow, mention, dev, self }

enum DevTaskType { epic, story, task, bug, subtask }

enum RelationKind { blocks, blockedBy, relatesTo, duplicates, duplicatedBy }

class TaskUser {
  const TaskUser({
    required this.id,
    required this.name,
    required this.avatar,
    required this.argb,
  });

  /// Supabase `profiles` 行（または相当する dict）から TaskUser を組み立てる。
  /// `avatarColorHex` は `#RRGGBB` 形式。null / 空のときは `displayName` の
  /// ハッシュから決定論的に色を割り当てる。
  factory TaskUser.fromProfile({
    required String id,
    String? displayName,
    String? avatarColorHex,
  }) {
    final trimmed = displayName?.trim();
    final name = trimmed != null && trimmed.isNotEmpty ? trimmed : id;
    final avatar = (displayName == null || displayName.isEmpty)
        ? (name.isNotEmpty ? name.substring(0, 1) : 'U')
        : displayName.substring(0, 1);
    final argb = avatarColorHex != null && avatarColorHex.length == 7
        ? 0xFF000000 | int.parse(avatarColorHex.substring(1), radix: 16)
        : _argbFromName(name);
    return TaskUser(id: id, name: name, avatar: avatar, argb: argb);
  }

  final String id;
  final String name;
  final String avatar;

  /// アバター背景色の ARGB 値。UI 側で `Color(argb)` に変換する。
  /// domain 層を Flutter 非依存に保つためのトレードオフ。
  final int argb;

  /// 名前文字列から決定論的に ARGB を割り当てる（profile.avatar_color が
  /// 未設定のときのフォールバック）。
  static int _argbFromName(String name) {
    if (name.isEmpty) return _avatarPalette[0];
    final hash = name.codeUnits.fold<int>(
      0,
      (acc, c) => (acc * 31 + c) & 0x7fffffff,
    );
    return _avatarPalette[hash % _avatarPalette.length];
  }

  static const List<int> _avatarPalette = [
    0xFF0F6CBD,
    0xFF6B46C1,
    0xFF1F8B4C,
    0xFFC8430E,
    0xFF9B1C1C,
    0xFFA66A00,
    0xFF1F6FEB,
    0xFFD946EF,
    0xFF14B8A6,
    0xFF6B7280,
  ];
}

class TaskChecklistItem {
  const TaskChecklistItem({
    required this.id,
    required this.label,
    required this.done,
  });

  final String id;
  final String label;
  final bool done;
}

class TaskAttachment {
  const TaskAttachment({
    required this.id,
    required this.name,
    required this.sizeBytes,
    this.mimeType,
    this.storagePath,
  });

  final String id;
  final String name;
  final int sizeBytes;
  final String? mimeType;
  final String? storagePath;
}

class TaskRelation {
  const TaskRelation({required this.id, required this.kind});

  final String id;
  final RelationKind kind;
}

class TaskComment {
  const TaskComment({
    required this.id,
    required this.user,
    required this.text,
    required this.createdAt,
  });

  final String id;
  final TaskUser user;
  final String text;
  final DateTime createdAt;
}

class TaskItem {
  const TaskItem({
    required this.id,
    required this.seq,
    required this.type,
    required this.title,
    required this.desc,
    required this.priority,
    required this.status,
    required this.source,
    required this.assigner,
    this.assignee,
    this.reporter,
    this.due,
    this.relatedName,
    this.parent,
    this.sprint,
    this.sp,
    this.labels = const [],
    this.branch,
    this.prNum,
    this.env,
    this.repro = const [],
    this.checklist = const [],
    this.attachments = const [],
    this.subtasks = const [],
    this.relations = const [],
    this.comments = const [],
    this.commentCount = 0,
  });

  final String id;

  /// 企業ごとに `#1` から始まる人間可読な連番キー。
  /// DB 側でトリガが採番するため、ドメインに到達する時点では必ず非 NULL。
  /// UI では `'#${task.seq}'` のように表示する（uuid `id` はユーザに見せない）。
  final int seq;

  final DevTaskType type;
  final String title;
  final String desc;
  final TaskPriority priority;
  final TaskStatus status;
  final TaskSource source;
  final TaskUser assigner;
  final TaskUser? assignee;
  final TaskUser? reporter;

  /// ISO yyyy-MM-dd
  final String? due;

  final String? relatedName;

  final String? parent;
  final String? sprint;
  final int? sp;
  final List<String> labels;

  final String? branch;
  final int? prNum;
  final String? env;
  final List<String> repro;

  final List<TaskChecklistItem> checklist;
  final List<TaskAttachment> attachments;
  final List<String> subtasks;
  final List<TaskRelation> relations;
  final List<TaskComment> comments;

  final int commentCount;

  TaskUser get owner => assignee ?? assigner;

  /// 全フィールドを named optional で受け付ける `copyWith`。
  /// `clearAssignee` / `clearDue` 等は `Object _sentinel = ...` パターンで
  /// 「明示 null」と「未指定」を区別する。
  TaskItem copyWith({
    String? id,
    int? seq,
    DevTaskType? type,
    String? title,
    String? desc,
    TaskPriority? priority,
    TaskStatus? status,
    TaskSource? source,
    TaskUser? assigner,
    Object? assignee = _sentinel,
    Object? reporter = _sentinel,
    Object? due = _sentinel,
    Object? relatedName = _sentinel,
    Object? parent = _sentinel,
    Object? sprint = _sentinel,
    Object? sp = _sentinel,
    List<String>? labels,
    Object? branch = _sentinel,
    Object? prNum = _sentinel,
    Object? env = _sentinel,
    List<String>? repro,
    List<TaskChecklistItem>? checklist,
    List<TaskAttachment>? attachments,
    List<String>? subtasks,
    List<TaskRelation>? relations,
    List<TaskComment>? comments,
    int? commentCount,
  }) => TaskItem(
    id: id ?? this.id,
    seq: seq ?? this.seq,
    type: type ?? this.type,
    title: title ?? this.title,
    desc: desc ?? this.desc,
    priority: priority ?? this.priority,
    status: status ?? this.status,
    source: source ?? this.source,
    assigner: assigner ?? this.assigner,
    assignee: identical(assignee, _sentinel)
        ? this.assignee
        : assignee as TaskUser?,
    reporter: identical(reporter, _sentinel)
        ? this.reporter
        : reporter as TaskUser?,
    due: identical(due, _sentinel) ? this.due : due as String?,
    relatedName: identical(relatedName, _sentinel)
        ? this.relatedName
        : relatedName as String?,
    parent: identical(parent, _sentinel) ? this.parent : parent as String?,
    sprint: identical(sprint, _sentinel) ? this.sprint : sprint as String?,
    sp: identical(sp, _sentinel) ? this.sp : sp as int?,
    labels: labels ?? this.labels,
    branch: identical(branch, _sentinel) ? this.branch : branch as String?,
    prNum: identical(prNum, _sentinel) ? this.prNum : prNum as int?,
    env: identical(env, _sentinel) ? this.env : env as String?,
    repro: repro ?? this.repro,
    checklist: checklist ?? this.checklist,
    attachments: attachments ?? this.attachments,
    subtasks: subtasks ?? this.subtasks,
    relations: relations ?? this.relations,
    comments: comments ?? this.comments,
    commentCount: commentCount ?? this.commentCount,
  );

  TaskItem withChecklistToggled(String itemId) {
    final next = [
      for (final c in checklist)
        if (c.id == itemId)
          TaskChecklistItem(id: c.id, label: c.label, done: !c.done)
        else
          c,
    ];
    return copyWith(checklist: next);
  }

  /// 関連タスクを追加。同じ target id が既にあれば kind を上書きする。
  /// 自己参照（id == this.id）は domain 不変条件として禁止。
  TaskItem withRelationAdded(TaskRelation rel) {
    assert(rel.id != id, 'A task cannot be related to itself');
    final without = relations.where((r) => r.id != rel.id);
    return copyWith(relations: [...without, rel]);
  }

  /// 関連タスクを削除。target id が見つからなければ no-op。
  TaskItem withRelationRemoved(String targetId) {
    final next = relations.where((r) => r.id != targetId).toList();
    if (next.length == relations.length) return this;
    return copyWith(relations: next);
  }

  TaskItem withCommentAdded(TaskComment comment) => copyWith(
    comments: [...comments, comment],
    commentCount: commentCount + 1,
  );
}

const Object _sentinel = Object();
