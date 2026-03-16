import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/entities/task.dart';
import '../../domain/repositories/task_repository.dart';
import '../providers/task_providers.dart';

/// タスクリスト管理コントローラー
///
/// フィルタに応じたタスク一覧の取得と、CRUD操作を提供する。
/// Screenはこのコントローラーを通じてのみビジネスロジックを実行する。
class TaskListController extends AutoDisposeAsyncNotifier<List<Task>> {
  TaskRepository get _repo => ref.read(taskRepositoryProvider);

  @override
  Future<List<Task>> build() async {
    final filter = ref.watch(taskFilterProvider);
    return switch (filter) {
      TaskFilter.myDay => _repo.getMyDayTasks(),
      TaskFilter.important => _repo.getImportantTasks(),
      TaskFilter.planned => _repo.getPlannedTasks(),
      TaskFilter.all => _repo.getTasks(includeCompleted: true),
    };
  }

  /// タスク追加
  Future<void> addTask(String title) async {
    final filter = ref.read(taskFilterProvider);
    final now = DateTime.now();
    final todayStr =
        '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';

    await _repo.createTask(Task(
      id: '',
      userId: '',
      organizationId: '',
      title: title,
      isMyDay: filter == TaskFilter.myDay,
      myDayDate:
          filter == TaskFilter.myDay ? DateTime.parse(todayStr) : null,
      isImportant: filter == TaskFilter.important,
      dueDate:
          filter == TaskFilter.planned ? DateTime.parse(todayStr) : null,
      createdAt: now,
      updatedAt: now,
    ));
    ref.invalidateSelf();
  }

  /// タスク完了/未完了の切り替え
  Future<void> toggleComplete(String taskId, bool isCompleted) async {
    await _repo.toggleComplete(taskId, !isCompleted);
    ref.invalidateSelf();
  }

  /// 重要フラグの切り替え
  Future<void> toggleImportant(String taskId, bool isImportant) async {
    await _repo.toggleImportant(taskId, !isImportant);
    ref.invalidateSelf();
  }

  /// タスク削除
  Future<void> deleteTask(String id) async {
    await _repo.deleteTask(id);
    ref.invalidateSelf();
  }
}

final taskListControllerProvider =
    AutoDisposeAsyncNotifierProvider<TaskListController, List<Task>>(
  TaskListController.new,
);

/// タスク詳細管理コントローラー
class TaskDetailController extends AutoDisposeFamilyAsyncNotifier<Task?, String> {
  TaskRepository get _repo => ref.read(taskRepositoryProvider);

  @override
  Future<Task?> build(String arg) async {
    return _repo.getTask(arg);
  }

  /// タスク更新
  Future<void> updateTask(Task task) async {
    await _repo.updateTask(task);
    ref.invalidateSelf();
    // リスト側も更新
    ref.invalidate(taskListControllerProvider);
  }

  /// ステップ追加
  Future<void> addStep(String taskId, String title) async {
    await _repo.createStep(TaskStep(
      id: '',
      taskId: taskId,
      title: title,
      createdAt: DateTime.now(),
    ));
    ref.invalidate(taskStepsProvider(taskId));
  }

  /// ステップ完了切り替え
  Future<void> toggleStepComplete(String stepId, bool isCompleted) async {
    await _repo.toggleStepComplete(stepId, !isCompleted);
    ref.invalidate(taskStepsProvider(arg));
  }

  /// ステップ削除
  Future<void> deleteStep(String stepId) async {
    await _repo.deleteStep(stepId);
    ref.invalidate(taskStepsProvider(arg));
  }
}

final taskDetailControllerProvider = AutoDisposeAsyncNotifierProvider.family<
    TaskDetailController, Task?, String>(
  TaskDetailController.new,
);
