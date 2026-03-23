import 'package:hr1_employee_app/features/tasks/domain/entities/task.dart';

/// タスクリポジトリインターフェース
abstract class TaskRepository {
  /// すべてのタスクを取得
  Future<List<Task>> getTasks({bool includeCompleted = false});

  /// My Day タスクを取得
  Future<List<Task>> getMyDayTasks();

  /// 重要タスクを取得
  Future<List<Task>> getImportantTasks();

  /// 計画済み（期限付き）タスクを取得
  Future<List<Task>> getPlannedTasks();

  /// タスクIDで取得（ステップ含む）
  Future<Task?> getTask(String id);

  /// タスク作成
  Future<Task> createTask(Task task);

  /// タスク更新
  Future<Task> updateTask(Task task);

  /// タスク削除
  Future<void> deleteTask(String id);

  /// タスク完了/未完了の切り替え
  Future<void> toggleComplete(String id, bool isCompleted);

  /// 重要フラグの切り替え
  Future<void> toggleImportant(String id, bool isImportant);

  /// My Day の切り替え
  Future<void> toggleMyDay(String id, bool isMyDay);

  /// ステップの取得
  Future<List<TaskStep>> getSteps(String taskId);

  /// ステップの作成
  Future<TaskStep> createStep(TaskStep step);

  /// ステップの更新
  Future<void> updateStep(TaskStep step);

  /// ステップの削除
  Future<void> deleteStep(String id);

  /// ステップの完了切り替え
  Future<void> toggleStepComplete(String id, bool isCompleted);
}
