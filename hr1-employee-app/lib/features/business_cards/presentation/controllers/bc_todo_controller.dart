import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
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

  /// CRM TODO を新規登録する。Screen からは raw 入力を受け取り、
  /// 期限日整形・assigned_to の解決はここで行う。
  Future<BcTodo> createTodo({
    required String title,
    String? description,
    DateTime? dueDate,
    String? companyId,
    String? contactId,
    String? dealId,
  }) async {
    final user = ref.read(appUserProvider);
    if (user == null) {
      throw StateError('createTodo requires an authenticated user');
    }
    final repo = ref.read(bcRepositoryProvider);
    final todo = await repo.createTodo({
      'title': title.trim(),
      'description': (description == null || description.trim().isEmpty)
          ? null
          : description.trim(),
      'due_date': dueDate?.toIso8601String().split('T').first,
      'assigned_to': user.id,
      'company_id': companyId,
      'contact_id': contactId,
      'deal_id': dealId,
    });
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
