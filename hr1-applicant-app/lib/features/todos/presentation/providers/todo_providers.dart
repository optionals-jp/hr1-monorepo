import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../data/repositories/supabase_todo_repository.dart';
import '../../domain/entities/todo.dart';
import '../../domain/repositories/todo_repository.dart';

/// やることリポジトリプロバイダー
final todoRepositoryProvider = Provider<TodoRepository>((ref) {
  return SupabaseTodoRepository(Supabase.instance.client);
});

/// 現在のフィルタ
final todoFilterProvider = StateProvider<TodoFilter>(
  (ref) => TodoFilter.incomplete,
);

/// 未完了のやること
final incompleteTodosProvider = FutureProvider<List<Todo>>((ref) async {
  final repo = ref.watch(todoRepositoryProvider);
  return repo.getIncompleteTodos();
});

/// 重要なやること
final importantTodosProvider = FutureProvider<List<Todo>>((ref) async {
  final repo = ref.watch(todoRepositoryProvider);
  return repo.getImportantTodos();
});

/// すべてのやること
final allTodosProvider = FutureProvider<List<Todo>>((ref) async {
  final repo = ref.watch(todoRepositoryProvider);
  return repo.getTodos(includeCompleted: true);
});

/// 未完了のやること数（バッジ用）
final incompleteTodoCountProvider = FutureProvider<int>((ref) async {
  final todos = await ref.watch(incompleteTodosProvider.future);
  return todos.length;
});

/// やること詳細
final todoDetailProvider = FutureProvider.family<Todo?, String>((
  ref,
  id,
) async {
  final repo = ref.watch(todoRepositoryProvider);
  return repo.getTodo(id);
});
