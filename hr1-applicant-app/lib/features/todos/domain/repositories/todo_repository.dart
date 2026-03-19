import '../entities/todo.dart';

/// TODO リポジトリインターフェース
abstract class TodoRepository {
  /// すべてのTODOを取得
  Future<List<Todo>> getTodos({bool includeCompleted = false});

  /// 未完了のTODOを取得
  Future<List<Todo>> getIncompleteTodos();

  /// 重要なTODOを取得
  Future<List<Todo>> getImportantTodos();

  /// TODO IDで取得
  Future<Todo?> getTodo(String id);

  /// TODO作成
  Future<Todo> createTodo(Todo todo);

  /// TODO更新
  Future<Todo> updateTodo(Todo todo);

  /// TODO削除
  Future<void> deleteTodo(String id);

  /// TODO完了/未完了の切り替え
  Future<void> toggleComplete(String id, bool isCompleted);

  /// 重要フラグの切り替え
  Future<void> toggleImportant(String id, bool isImportant);
}
