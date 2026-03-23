import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_applicant_app/features/todos/domain/entities/todo.dart';
import 'package:hr1_applicant_app/features/todos/domain/repositories/todo_repository.dart';
import 'package:hr1_applicant_app/features/todos/presentation/providers/todo_providers.dart';

/// やることリスト管理コントローラー
///
/// フィルタに応じたやること一覧の取得と、CRUD操作を提供する。
class TodoListController extends AutoDisposeAsyncNotifier<List<Todo>> {
  TodoRepository get _repo => ref.read(todoRepositoryProvider);

  @override
  Future<List<Todo>> build() async {
    final filter = ref.watch(todoFilterProvider);
    return switch (filter) {
      TodoFilter.incomplete => _repo.getIncompleteTodos(),
      TodoFilter.important => _repo.getImportantTodos(),
      TodoFilter.all => _repo.getTodos(includeCompleted: true),
    };
  }

  /// やること追加
  Future<void> addTodo(
    String title, {
    String? note,
    DateTime? dueDate,
    bool isImportant = false,
  }) async {
    final filter = ref.read(todoFilterProvider);
    final now = DateTime.now();

    await _repo.createTodo(
      Todo(
        id: '',
        userId: '',
        organizationId: '',
        title: title,
        note: note,
        dueDate: dueDate,
        isImportant: isImportant || filter == TodoFilter.important,
        createdAt: now,
        updatedAt: now,
      ),
    );
    _invalidateAll();
  }

  /// やること完了/未完了の切り替え
  Future<void> toggleComplete(String todoId, bool isCompleted) async {
    await _repo.toggleComplete(todoId, !isCompleted);
    _invalidateAll();
  }

  /// 重要フラグの切り替え
  Future<void> toggleImportant(String todoId, bool isImportant) async {
    await _repo.toggleImportant(todoId, !isImportant);
    _invalidateAll();
  }

  /// やること更新
  Future<void> updateTodo(Todo todo) async {
    await _repo.updateTodo(todo);
    _invalidateAll();
  }

  /// やること削除
  Future<void> deleteTodo(String id) async {
    await _repo.deleteTodo(id);
    _invalidateAll();
  }

  void _invalidateAll() {
    ref.invalidateSelf();
    ref.invalidate(incompleteTodosProvider);
    ref.invalidate(importantTodosProvider);
    ref.invalidate(allTodosProvider);
    ref.invalidate(incompleteTodoCountProvider);
  }
}

final todoListControllerProvider =
    AutoDisposeAsyncNotifierProvider<TodoListController, List<Todo>>(
      TodoListController.new,
    );
