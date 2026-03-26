import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_todo.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/providers/business_card_providers.dart';

/// CRM TODOコントローラー
final bcTodoControllerProvider =
    AutoDisposeAsyncNotifierProvider<BcTodoController, List<BcTodo>>(
      BcTodoController.new,
    );

class BcTodoController extends AutoDisposeAsyncNotifier<List<BcTodo>> {
  @override
  FutureOr<List<BcTodo>> build() async {
    final repo = ref.watch(bcRepositoryProvider);
    return repo.getMyTodos();
  }

  Future<BcTodo> createTodo(Map<String, dynamic> data) async {
    final repo = ref.read(bcRepositoryProvider);
    final todo = await repo.createTodo(data);
    ref.invalidate(bcMyTodosProvider);
    ref.invalidateSelf();
    return todo;
  }

  Future<void> toggleComplete(String id, bool isCompleted) async {
    final repo = ref.read(bcRepositoryProvider);
    await repo.toggleTodoComplete(id, !isCompleted);
    ref.invalidate(bcMyTodosProvider);
    ref.invalidateSelf();
  }

  Future<void> deleteTodo(String id) async {
    final repo = ref.read(bcRepositoryProvider);
    await repo.deleteTodo(id);
    ref.invalidate(bcMyTodosProvider);
    ref.invalidateSelf();
  }
}
