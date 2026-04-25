import 'package:hr1_employee_app/features/tasks/domain/entities/task_item.dart';

/// Pure-domain metadata helpers for task enums. UI concerns (colors) live in
/// `presentation/theme/task_colors.dart` so the domain layer has no Flutter
/// dependencies.
class TaskMeta {
  TaskMeta._();

  static String priorityLabel(TaskPriority p) => switch (p) {
    TaskPriority.urgent => '緊急',
    TaskPriority.high => '高',
    TaskPriority.mid => '中',
    TaskPriority.low => '低',
  };

  static String sourceLabel(TaskSource s) => switch (s) {
    TaskSource.crm => 'クライアント',
    TaskSource.project => 'プロジェクト',
    TaskSource.workflow => 'ワークフロー',
    TaskSource.mention => 'メンション',
    TaskSource.dev => '開発',
    TaskSource.self => '自分で追加',
  };

  /// ユーザーが UI から選択可能なソース。`mention` はメッセージ等から自動
  /// 生成される想定で、現状はタスク化フローが無いため候補から除外する。
  /// ※ 既存データ（mention で記録された task_items）は表示時 [sourceLabel]
  /// が引かれるので、enum 値自体は残す。
  static const List<TaskSource> userSelectableSources = [
    TaskSource.crm,
    TaskSource.project,
    TaskSource.workflow,
    TaskSource.dev,
    TaskSource.self,
  ];

  static String statusLabel(TaskStatus s) => switch (s) {
    TaskStatus.backlog => 'Backlog',
    TaskStatus.todo => 'Todo',
    TaskStatus.inprogress => 'In Progress',
    TaskStatus.review => 'In Review',
    TaskStatus.qa => 'QA',
    TaskStatus.done => 'Done',
  };

  static String relationLabel(RelationKind k) => switch (k) {
    RelationKind.blocks => 'blocks',
    RelationKind.blockedBy => 'blocked by',
    RelationKind.relatesTo => 'relates to',
    RelationKind.duplicates => 'duplicates',
    RelationKind.duplicatedBy => 'duplicated by',
  };

  /// `DevTypeIcon` の四角アイコン内に表示する 1 文字。
  static String typeGlyph(DevTaskType t) => switch (t) {
    DevTaskType.epic => 'E',
    DevTaskType.story => 'S',
    DevTaskType.task => 'T',
    DevTaskType.bug => 'B',
    DevTaskType.subtask => '·',
  };

  /// `_RelationsBlock` でグルーピング表示する際の固定順。追加順より優先する。
  static const List<RelationKind> relationKindOrder = [
    RelationKind.blocks,
    RelationKind.blockedBy,
    RelationKind.relatesTo,
    RelationKind.duplicates,
    RelationKind.duplicatedBy,
  ];

  /// Buckets a task's ISO due date (`yyyy-MM-dd`) into a list-group label.
  /// [now] は基準日（時刻 0:00 想定）。呼び出し側で `taskTodayProvider` 経由で
  /// 分単位丸め済みの値を渡すことで、provider の rebuild 揺らぎを防ぐ。
  static String dueBucket(String? iso, {required DateTime now}) {
    if (iso == null) return '未設定';
    final today = formatIso(now);
    final tomorrow = formatIso(now.add(const Duration(days: 1)));
    final weekEnd = formatIso(now.add(const Duration(days: 4)));
    if (iso.compareTo(today) < 0) return '期限超過';
    if (iso == today) return '今日';
    if (iso == tomorrow) return '明日';
    if (iso.compareTo(weekEnd) <= 0) return '今週';
    return '今後';
  }

  /// `yyyy-MM-dd` ISO 文字列をローカルタイムゾーンの DateTime（時刻 0:00）に
  /// パース。フォーマットが不正なら null。
  static DateTime? parseIso(String? iso) {
    if (iso == null || iso.length < 10) return null;
    return DateTime.tryParse(iso.substring(0, 10));
  }

  /// DateTime をローカルタイムゾーンで `yyyy-MM-dd` 形式にフォーマット。
  static String formatIso(DateTime d) =>
      '${d.year.toString().padLeft(4, '0')}-'
      '${d.month.toString().padLeft(2, '0')}-'
      '${d.day.toString().padLeft(2, '0')}';

  static const List<String> bucketOrder = [
    '期限超過',
    '今日',
    '明日',
    '今週',
    '今後',
    '未設定',
  ];
}
