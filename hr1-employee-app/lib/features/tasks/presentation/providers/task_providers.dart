import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../data/repositories/supabase_task_repository.dart';
import '../../domain/entities/task.dart';
import '../../domain/repositories/task_repository.dart';

/// タスクリポジトリプロバイダー
final taskRepositoryProvider = Provider<TaskRepository>((ref) {
  return SupabaseTaskRepository(Supabase.instance.client);
});

/// 現在のフィルタ
final taskFilterProvider = StateProvider<TaskFilter>((ref) => TaskFilter.myDay);

/// My Day タスク
final myDayTasksProvider = FutureProvider<List<Task>>((ref) async {
  final repo = ref.watch(taskRepositoryProvider);
  return repo.getMyDayTasks();
});

/// 重要タスク
final importantTasksProvider = FutureProvider<List<Task>>((ref) async {
  final repo = ref.watch(taskRepositoryProvider);
  return repo.getImportantTasks();
});

/// 計画済みタスク
final plannedTasksProvider = FutureProvider<List<Task>>((ref) async {
  final repo = ref.watch(taskRepositoryProvider);
  return repo.getPlannedTasks();
});

/// すべてのタスク
final allTasksProvider = FutureProvider<List<Task>>((ref) async {
  final repo = ref.watch(taskRepositoryProvider);
  return repo.getTasks(includeCompleted: true);
});

/// 完了済みタスク数
final completedTaskCountProvider = FutureProvider<int>((ref) async {
  final tasks = await ref.watch(allTasksProvider.future);
  return tasks.where((t) => t.isCompleted).length;
});

/// 現在のフィルタに応じたタスクリスト
final filteredTasksProvider = FutureProvider<List<Task>>((ref) async {
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
  }
});

/// タスク詳細
final taskDetailProvider = FutureProvider.family<Task?, String>((
  ref,
  id,
) async {
  final repo = ref.watch(taskRepositoryProvider);
  return repo.getTask(id);
});

/// タスクステップ
final taskStepsProvider = FutureProvider.family<List<TaskStep>, String>((
  ref,
  taskId,
) async {
  final repo = ref.watch(taskRepositoryProvider);
  return repo.getSteps(taskId);
});
