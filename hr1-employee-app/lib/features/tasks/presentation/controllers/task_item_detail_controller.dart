import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_item.dart';
import 'package:hr1_employee_app/features/tasks/domain/repositories/task_item_repository.dart';
import 'package:hr1_employee_app/features/tasks/presentation/controllers/task_item_list_controller.dart';
import 'package:hr1_employee_app/features/tasks/presentation/providers/task_item_providers.dart';

class TaskItemDetailController
    extends AutoDisposeFamilyAsyncNotifier<TaskItem?, String> {
  TaskItemRepository get _repo => ref.read(taskItemRepositoryProvider);

  @override
  Future<TaskItem?> build(String arg) => _repo.fetchById(arg);

  Future<void> toggleChecklistItem(String itemId) async {
    final current = state.valueOrNull;
    if (current == null) return;
    state = AsyncData(current.withChecklistToggled(itemId));
    try {
      final updated = await _repo.toggleChecklistItem(arg, itemId);
      state = AsyncData(updated);
      _invalidateAfterMutation();
    } catch (_) {
      state = AsyncData(current);
      rethrow;
    }
  }

  Future<void> updateStatus(TaskStatus status) async {
    final current = state.valueOrNull;
    if (current == null) return;
    state = AsyncData(current.copyWith(status: status));
    try {
      final updated = await _repo.updateStatus(arg, status);
      state = AsyncData(updated);
      _invalidateAfterMutation();
    } catch (_) {
      state = AsyncData(current);
      rethrow;
    }
  }

  Future<void> addRelation(TaskRelation rel) async {
    final current = state.valueOrNull;
    if (current == null) return;
    state = AsyncData(current.withRelationAdded(rel));
    try {
      final updated = await _repo.addRelation(arg, rel);
      state = AsyncData(updated);
      // DB トリガが reciprocal な行を `rel.id` 側にも作るため、相手側も invalidate。
      _invalidateAfterMutation(reciprocalIds: [rel.id]);
    } catch (_) {
      state = AsyncData(current);
      rethrow;
    }
  }

  Future<void> removeRelation(String targetId) async {
    final current = state.valueOrNull;
    if (current == null) return;
    state = AsyncData(current.withRelationRemoved(targetId));
    try {
      final updated = await _repo.removeRelation(arg, targetId);
      state = AsyncData(updated);
      _invalidateAfterMutation(reciprocalIds: [targetId]);
    } catch (_) {
      state = AsyncData(current);
      rethrow;
    }
  }

  Future<void> updateDue({required String? due}) async {
    final current = state.valueOrNull;
    if (current == null) return;
    state = AsyncData(current.copyWith(due: due));
    try {
      final updated = await _repo.updateDue(arg, due: due);
      state = AsyncData(updated);
      _invalidateAfterMutation();
    } catch (_) {
      state = AsyncData(current);
      rethrow;
    }
  }

  Future<void> updateAssignee(TaskUser? assignee) async {
    final current = state.valueOrNull;
    if (current == null) return;
    state = AsyncData(current.copyWith(assignee: assignee));
    try {
      final updated = await _repo.updateAssignee(arg, assignee);
      state = AsyncData(updated);
      _invalidateAfterMutation();
    } catch (_) {
      state = AsyncData(current);
      rethrow;
    }
  }

  Future<void> addSubtask(TaskItem subtask) async {
    final current = state.valueOrNull;
    if (current == null) return;
    state = AsyncData(
      current.copyWith(subtasks: [...current.subtasks, subtask.id]),
    );
    try {
      final updated = await _repo.addSubtask(arg, subtask);
      state = AsyncData(updated);
      _invalidateAfterMutation();
    } catch (_) {
      state = AsyncData(current);
      rethrow;
    }
  }

  Future<void> addComment(String text) async {
    final current = state.valueOrNull;
    if (current == null) return;
    final me = ref.read(currentTaskUserProvider);
    if (me == null) {
      throw StateError('addComment requires an authenticated user');
    }
    final optimistic = TaskComment(
      id: 'c-${DateTime.now().microsecondsSinceEpoch}',
      user: me,
      text: text,
      createdAt: DateTime.now(),
    );
    state = AsyncData(current.withCommentAdded(optimistic));
    try {
      final updated = await _repo.addComment(arg, text);
      state = AsyncData(updated);
      _invalidateAfterMutation();
    } catch (_) {
      state = AsyncData(current);
      rethrow;
    }
  }

  Future<void> updateDesc(String desc) async {
    final current = state.valueOrNull;
    if (current == null) return;
    state = AsyncData(current.copyWith(desc: desc));
    try {
      final updated = await _repo.updateDesc(arg, desc);
      state = AsyncData(updated);
      _invalidateAfterMutation();
    } catch (_) {
      state = AsyncData(current);
      rethrow;
    }
  }

  /// `reciprocalIds` は relation の双方向更新で必要（相手側 task の詳細 /
  /// bundle も併せて invalidate する）。
  void _invalidateAfterMutation({List<String> reciprocalIds = const []}) {
    ref.invalidate(taskItemListControllerProvider);
    ref.invalidate(taskCountsProvider);
    ref.invalidate(taskDetailBundleProvider(arg));
    for (final id in reciprocalIds) {
      ref.invalidate(taskDetailBundleProvider(id));
      ref.invalidate(taskItemDetailControllerProvider(id));
    }
  }
}

final taskItemDetailControllerProvider =
    AutoDisposeAsyncNotifierProvider.family<
      TaskItemDetailController,
      TaskItem?,
      String
    >(TaskItemDetailController.new);
