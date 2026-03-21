import 'package:supabase_flutter/supabase_flutter.dart';
import '../../domain/entities/todo.dart';
import '../../domain/repositories/todo_repository.dart';

/// Supabase やることリポジトリ実装
class SupabaseTodoRepository implements TodoRepository {
  SupabaseTodoRepository(this._client);

  final SupabaseClient _client;

  String get _userId => _client.auth.currentUser!.id;

  Future<String> _getOrganizationId() async {
    final userOrg = await _client
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', _userId)
        .limit(1)
        .single();
    return userOrg['organization_id'] as String;
  }

  @override
  Future<List<Todo>> getTodos({bool includeCompleted = false}) async {
    var query = _client.from('applicant_todos').select().eq('user_id', _userId);

    if (!includeCompleted) {
      query = query.eq('is_completed', false);
    }

    final response = await query
        .order('sort_order')
        .order('created_at')
        .limit(200);
    return response.map((e) => Todo.fromJson(e)).toList();
  }

  @override
  Future<List<Todo>> getIncompleteTodos() async {
    final response = await _client
        .from('applicant_todos')
        .select()
        .eq('user_id', _userId)
        .eq('is_completed', false)
        .order('sort_order')
        .order('created_at')
        .limit(200);

    return response.map((e) => Todo.fromJson(e)).toList();
  }

  @override
  Future<List<Todo>> getImportantTodos() async {
    final response = await _client
        .from('applicant_todos')
        .select()
        .eq('user_id', _userId)
        .eq('is_important', true)
        .eq('is_completed', false)
        .order('sort_order')
        .order('created_at')
        .limit(200);

    return response.map((e) => Todo.fromJson(e)).toList();
  }

  @override
  Future<Todo?> getTodo(String id) async {
    final response = await _client
        .from('applicant_todos')
        .select()
        .eq('id', id)
        .eq('user_id', _userId)
        .maybeSingle();

    if (response == null) return null;
    return Todo.fromJson(response);
  }

  @override
  Future<Todo> createTodo(Todo todo) async {
    final orgId = await _getOrganizationId();

    final data = todo.toJson();
    data['user_id'] = _userId;
    data['organization_id'] = orgId;

    final response = await _client
        .from('applicant_todos')
        .insert(data)
        .select()
        .single();

    return Todo.fromJson(response);
  }

  @override
  Future<Todo> updateTodo(Todo todo) async {
    final response = await _client
        .from('applicant_todos')
        .update(todo.toJson())
        .eq('id', todo.id)
        .eq('user_id', _userId)
        .select()
        .single();

    return Todo.fromJson(response);
  }

  @override
  Future<void> deleteTodo(String id) async {
    await _client
        .from('applicant_todos')
        .delete()
        .eq('id', id)
        .eq('user_id', _userId);
  }

  @override
  Future<void> toggleComplete(String id, bool isCompleted) async {
    await _client
        .from('applicant_todos')
        .update({
          'is_completed': isCompleted,
          'completed_at': isCompleted ? DateTime.now().toIso8601String() : null,
        })
        .eq('id', id)
        .eq('user_id', _userId);
  }

  @override
  Future<void> toggleImportant(String id, bool isImportant) async {
    await _client
        .from('applicant_todos')
        .update({'is_important': isImportant})
        .eq('id', id)
        .eq('user_id', _userId);
  }
}
