import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task.dart';
import 'package:hr1_employee_app/features/tasks/domain/repositories/task_repository.dart';

/// Supabase タスクリポジトリ実装
class SupabaseTaskRepository implements TaskRepository {
  SupabaseTaskRepository(this._client);

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
  Future<List<Task>> getTasks({bool includeCompleted = false}) async {
    var query = _client.from('employee_tasks').select().eq('user_id', _userId);

    if (!includeCompleted) {
      query = query.eq('is_completed', false);
    }

    final response = await query
        .order('sort_order')
        .order('created_at')
        .limit(200);
    return response.map((e) => Task.fromJson(e)).toList();
  }

  @override
  Future<List<Task>> getMyDayTasks() async {
    final today = DateTime.now();
    final todayStr =
        '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';

    final response = await _client
        .from('employee_tasks')
        .select()
        .eq('user_id', _userId)
        .eq('is_my_day', true)
        .eq('my_day_date', todayStr)
        .order('sort_order')
        .order('created_at')
        .limit(200);

    return response.map((e) => Task.fromJson(e)).toList();
  }

  @override
  Future<List<Task>> getImportantTasks() async {
    final response = await _client
        .from('employee_tasks')
        .select()
        .eq('user_id', _userId)
        .eq('is_important', true)
        .eq('is_completed', false)
        .order('sort_order')
        .order('created_at')
        .limit(200);

    return response.map((e) => Task.fromJson(e)).toList();
  }

  @override
  Future<List<Task>> getPlannedTasks() async {
    final response = await _client
        .from('employee_tasks')
        .select()
        .eq('user_id', _userId)
        .eq('is_completed', false)
        .not('due_date', 'is', null)
        .order('due_date')
        .order('created_at')
        .limit(200);

    return response.map((e) => Task.fromJson(e)).toList();
  }

  @override
  Future<Task?> getTask(String id) async {
    final response = await _client
        .from('employee_tasks')
        .select()
        .eq('id', id)
        .eq('user_id', _userId)
        .maybeSingle();

    if (response == null) return null;

    final steps = await getSteps(id);
    return Task.fromJson(response, steps: steps);
  }

  @override
  Future<Task> createTask(Task task) async {
    final orgId = await _getOrganizationId();

    final data = task.toJson();
    data['user_id'] = _userId;
    data['organization_id'] = orgId;

    final response = await _client
        .from('employee_tasks')
        .insert(data)
        .select()
        .single();

    return Task.fromJson(response);
  }

  @override
  Future<Task> updateTask(Task task) async {
    final response = await _client
        .from('employee_tasks')
        .update(task.toJson())
        .eq('id', task.id)
        .eq('user_id', _userId)
        .select()
        .single();

    return Task.fromJson(response);
  }

  @override
  Future<void> deleteTask(String id) async {
    await _client
        .from('employee_tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', _userId);
  }

  @override
  Future<void> toggleComplete(String id, bool isCompleted) async {
    await _client
        .from('employee_tasks')
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
        .from('employee_tasks')
        .update({'is_important': isImportant})
        .eq('id', id)
        .eq('user_id', _userId);
  }

  @override
  Future<void> toggleMyDay(String id, bool isMyDay) async {
    final today = DateTime.now();
    final todayStr =
        '${today.year}-${today.month.toString().padLeft(2, '0')}-${today.day.toString().padLeft(2, '0')}';

    await _client
        .from('employee_tasks')
        .update({
          'is_my_day': isMyDay,
          'my_day_date': isMyDay ? todayStr : null,
        })
        .eq('id', id)
        .eq('user_id', _userId);
  }

  @override
  Future<List<TaskStep>> getSteps(String taskId) async {
    final response = await _client
        .from('employee_task_steps')
        .select()
        .eq('task_id', taskId)
        .order('sort_order')
        .order('created_at')
        .limit(200);

    return response.map((e) => TaskStep.fromJson(e)).toList();
  }

  @override
  Future<TaskStep> createStep(TaskStep step) async {
    final response = await _client
        .from('employee_task_steps')
        .insert(step.toJson())
        .select()
        .single();

    return TaskStep.fromJson(response);
  }

  @override
  Future<void> updateStep(TaskStep step) async {
    await _client
        .from('employee_task_steps')
        .update({
          'title': step.title,
          'is_completed': step.isCompleted,
          'sort_order': step.sortOrder,
        })
        .eq('id', step.id);
  }

  @override
  Future<void> deleteStep(String id) async {
    await _client.from('employee_task_steps').delete().eq('id', id);
  }

  @override
  Future<void> toggleStepComplete(String id, bool isCompleted) async {
    await _client
        .from('employee_task_steps')
        .update({'is_completed': isCompleted})
        .eq('id', id);
  }
}
