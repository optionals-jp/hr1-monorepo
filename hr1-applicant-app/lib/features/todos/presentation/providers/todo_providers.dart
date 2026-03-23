import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_applicant_app/features/todos/data/repositories/supabase_todo_repository.dart';
import 'package:hr1_applicant_app/features/todos/domain/entities/todo.dart';
import 'package:hr1_applicant_app/features/todos/domain/repositories/todo_repository.dart';

/// やることリポジトリプロバイダー
final todoRepositoryProvider = Provider<TodoRepository>((ref) {
  return SupabaseTodoRepository(Supabase.instance.client);
});

/// 現在のフィルタ
final todoFilterProvider = StateProvider<TodoFilter>(
  (ref) => TodoFilter.incomplete,
);

/// 未完了のやること
final incompleteTodosProvider = FutureProvider.autoDispose<List<Todo>>((
  ref,
) async {
  final repo = ref.watch(todoRepositoryProvider);
  return repo.getIncompleteTodos();
});

/// 重要なやること
final importantTodosProvider = FutureProvider.autoDispose<List<Todo>>((
  ref,
) async {
  final repo = ref.watch(todoRepositoryProvider);
  return repo.getImportantTodos();
});

/// すべてのやること
final allTodosProvider = FutureProvider.autoDispose<List<Todo>>((ref) async {
  final repo = ref.watch(todoRepositoryProvider);
  return repo.getTodos(includeCompleted: true);
});

/// 未完了のやること数（バッジ用）
final incompleteTodoCountProvider = FutureProvider.autoDispose<int>((
  ref,
) async {
  final todos = await ref.watch(incompleteTodosProvider.future);
  return todos.length;
});

/// やること詳細
final todoDetailProvider = FutureProvider.autoDispose.family<Todo?, String>((
  ref,
  id,
) async {
  final repo = ref.watch(todoRepositoryProvider);
  return repo.getTodo(id);
});
