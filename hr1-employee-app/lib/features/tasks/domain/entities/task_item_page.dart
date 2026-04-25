import 'package:hr1_employee_app/features/tasks/domain/entities/task_item.dart';

/// `offset` は次回 `loadMore()` で渡すべき開始位置（= 現在ロード済み件数）。
class TaskItemPage {
  const TaskItemPage({
    required this.items,
    required this.hasMore,
    required this.offset,
  });

  final List<TaskItem> items;
  final bool hasMore;
  final int offset;

  static const empty = TaskItemPage(items: [], hasMore: false, offset: 0);

  TaskItemPage append(TaskItemPage next) => TaskItemPage(
    items: [...items, ...next.items],
    hasMore: next.hasMore,
    offset: offset + next.items.length,
  );
}

class TaskItemCounts {
  const TaskItemCounts({
    required this.active,
    required this.done,
    required this.overdue,
    required this.todayCount,
  });

  final int active;
  final int done;
  final int overdue;
  final int todayCount;

  static const zero = TaskItemCounts(
    active: 0,
    done: 0,
    overdue: 0,
    todayCount: 0,
  );
}
