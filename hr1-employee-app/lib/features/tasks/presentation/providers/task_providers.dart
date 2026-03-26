import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_employee_app/features/tasks/data/repositories/supabase_task_repository.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task.dart';
import 'package:hr1_employee_app/features/tasks/domain/repositories/task_repository.dart';

/// タスクリポジトリプロバイダー
final taskRepositoryProvider = Provider<TaskRepository>((ref) {
  return SupabaseTaskRepository(Supabase.instance.client);
});

/// 現在のフィルタ
final taskFilterProvider = StateProvider<TaskFilter>((ref) => TaskFilter.myDay);

/// My Day タスク
final myDayTasksProvider = FutureProvider.autoDispose<List<Task>>((ref) async {
  final repo = ref.watch(taskRepositoryProvider);
  return repo.getMyDayTasks();
});

/// 重要タスク
final importantTasksProvider = FutureProvider.autoDispose<List<Task>>((
  ref,
) async {
  final repo = ref.watch(taskRepositoryProvider);
  return repo.getImportantTasks();
});

/// 計画済みタスク
final plannedTasksProvider = FutureProvider.autoDispose<List<Task>>((
  ref,
) async {
  final repo = ref.watch(taskRepositoryProvider);
  return repo.getPlannedTasks();
});

/// すべてのタスク
final allTasksProvider = FutureProvider.autoDispose<List<Task>>((ref) async {
  final repo = ref.watch(taskRepositoryProvider);
  return repo.getTasks(includeCompleted: true);
});

/// CRMタスク
final crmTasksProvider = FutureProvider.autoDispose<List<Task>>((ref) async {
  final repo = ref.watch(taskRepositoryProvider);
  return repo.getCrmTasks();
});

/// 完了済みタスク数
final completedTaskCountProvider = FutureProvider.autoDispose<int>((ref) async {
  final tasks = await ref.watch(allTasksProvider.future);
  return tasks.where((t) => t.isCompleted).length;
});

/// 現在のフィルタに応じたタスクリスト
final filteredTasksProvider = FutureProvider.autoDispose<List<Task>>((
  ref,
) async {
  final filter = ref.watch(taskFilterProvider);
  switch (filter) {
    case TaskFilter.myDay:
      return ref.watch(myDayTasksProvider.future);
    case TaskFilter.important:
      return ref.watch(importantTasksProvider.future);
    case TaskFilter.planned:
      return ref.watch(plannedTasksProvider.future);
    case TaskFilter.all:
      return ref.watch(allTasksProvider.future);
    case TaskFilter.crm:
      return ref.watch(crmTasksProvider.future);
  }
});

/// タスク詳細
final taskDetailProvider = FutureProvider.autoDispose.family<Task?, String>((
  ref,
  id,
) async {
  final repo = ref.watch(taskRepositoryProvider);
  return repo.getTask(id);
});

/// タスクステップ
final taskStepsProvider = FutureProvider.autoDispose
    .family<List<TaskStep>, String>((ref, taskId) async {
      final repo = ref.watch(taskRepositoryProvider);
      return repo.getSteps(taskId);
    });
