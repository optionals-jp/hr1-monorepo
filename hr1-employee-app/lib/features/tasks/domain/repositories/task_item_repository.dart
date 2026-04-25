import 'package:hr1_employee_app/features/tasks/domain/entities/task_item.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_item_page.dart';

abstract class TaskItemRepository {
  /// ソート順は `(due ASC NULLS LAST, id DESC)`。`updated_at` を除くのは、
  /// ステータス更新で順序が大きく動いてページ drift が起きるのを抑えるため。
  Future<TaskItemPage> fetchPage({
    required bool showDone,
    TaskSource? source,
    Set<String> assignees = const {},
    int offset = 0,
    int limit = 30,
  });

  Future<TaskItemCounts> fetchCounts({
    TaskSource? source,
    Set<String> assignees = const {},
  });

  /// 詳細画面の親 / サブ / 関連を 1 RTT で hydrate するための一括取得。
  Future<List<TaskItem>> fetchByIds(List<String> ids);

  /// クエリが空のときは空リストを返す（候補を露出しない方針）。
  /// `excludeIds` はクライアント側でフィルタ（URL 上限回避）。
  Future<List<TaskItem>> searchByTitle({
    required String query,
    Set<String> excludeIds = const {},
    int limit = 50,
  });

  Future<TaskItem?> fetchById(String id);

  Future<TaskItem> updateStatus(String id, TaskStatus status);

  Future<TaskItem> toggleChecklistItem(String taskId, String itemId);

  Future<TaskItem> create(TaskItem task);

  /// 同じ `rel.id` が既にあれば kind を上書きする。reciprocal は DB trigger。
  Future<TaskItem> addRelation(String taskId, TaskRelation rel);

  Future<TaskItem> removeRelation(String taskId, String targetId);

  /// `due` に null を渡すと期限を解除する。
  Future<TaskItem> updateDue(String taskId, {required String? due});

  /// null で未割り当て。
  Future<TaskItem> updateAssignee(String taskId, TaskUser? assignee);

  Future<TaskItem> updateDesc(String taskId, String desc);

  /// 親 [parentId] の `subtasks` 一覧末尾に新しい [subtask] の ID を追記する。
  Future<TaskItem> addSubtask(String parentId, TaskItem subtask);

  /// 投稿者は現在のログインユーザ、`createdAt` はサーバ側で確定する。
  Future<TaskItem> addComment(String taskId, String text);
}
