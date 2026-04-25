import 'package:flutter_test/flutter_test.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_item.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_item_page.dart';
import 'package:hr1_employee_app/features/tasks/domain/repositories/task_item_repository.dart';
import 'package:hr1_employee_app/features/tasks/presentation/controllers/task_item_detail_controller.dart';
import 'package:hr1_employee_app/features/tasks/presentation/providers/task_item_providers.dart';

const _alice = TaskUser(
  id: 'u-alice',
  name: 'Alice',
  avatar: 'A',
  argb: 0xFF0F6CBD,
);

const _bob = TaskUser(id: 'u-bob', name: 'Bob', avatar: 'B', argb: 0xFF6B46C1);

/// テスト用 fixture。Supabase 移行で `TaskMockData` が消えたため、テストは
/// プロダクトコードと独立した固定値を組み立てる。
TaskItem _makeFixtureTask({
  String id = 't-101',
  int seq = 1,
  List<TaskChecklistItem> checklist = const [],
  List<TaskRelation> relations = const [],
  String? due = '2026-04-25',
}) => TaskItem(
  id: id,
  seq: seq,
  type: DevTaskType.task,
  title: 'fixture task',
  desc: 'description',
  priority: TaskPriority.mid,
  status: TaskStatus.todo,
  source: TaskSource.self,
  assigner: _alice,
  assignee: _bob,
  due: due,
  checklist: checklist,
  relations: relations,
);

/// repo 側で例外を投げるフェイクで optimistic update の rollback を検証する。
class _ThrowingRepository implements TaskItemRepository {
  _ThrowingRepository(this._source);

  final TaskItem _source;

  @override
  Future<TaskItem?> fetchById(String id) async => _source;

  @override
  Future<TaskItemPage> fetchPage({
    required bool showDone,
    TaskSource? source,
    Set<String> assignees = const {},
    int offset = 0,
    int limit = 30,
  }) async => TaskItemPage(items: [_source], hasMore: false, offset: 1);

  @override
  Future<TaskItemCounts> fetchCounts({
    TaskSource? source,
    Set<String> assignees = const {},
  }) async => TaskItemCounts.zero;

  @override
  Future<List<TaskItem>> fetchByIds(List<String> ids) async =>
      ids.contains(_source.id) ? [_source] : const [];

  @override
  Future<List<TaskItem>> searchByTitle({
    required String query,
    Set<String> excludeIds = const {},
    int limit = 50,
  }) async => const [];

  @override
  Future<TaskItem> toggleChecklistItem(String taskId, String itemId) async {
    throw StateError('simulated failure');
  }

  @override
  Future<TaskItem> updateStatus(String id, TaskStatus status) async =>
      throw UnimplementedError();

  @override
  Future<TaskItem> create(TaskItem task) async => throw UnimplementedError();

  @override
  Future<TaskItem> addRelation(String taskId, TaskRelation rel) async {
    throw StateError('simulated failure');
  }

  @override
  Future<TaskItem> removeRelation(String taskId, String targetId) async {
    throw StateError('simulated failure');
  }

  @override
  Future<TaskItem> updateDue(String taskId, {required String? due}) async {
    throw StateError('simulated failure');
  }

  @override
  Future<TaskItem> updateAssignee(String taskId, TaskUser? assignee) async {
    throw StateError('simulated failure');
  }

  @override
  Future<TaskItem> updateDesc(String taskId, String desc) async {
    throw StateError('simulated failure');
  }

  @override
  Future<TaskItem> addSubtask(String parentId, TaskItem subtask) async {
    throw StateError('simulated failure');
  }

  @override
  Future<TaskItem> addComment(String taskId, String text) async {
    throw StateError('simulated failure');
  }
}

void main() {
  test(
    'TaskItemDetailController.toggleChecklistItem rolls back on repo failure',
    () async {
      final original = _makeFixtureTask(
        checklist: const [
          TaskChecklistItem(id: 'c1', label: 'first', done: false),
        ],
      );
      final container = ProviderContainer(
        overrides: [
          taskItemRepositoryProvider.overrideWithValue(
            _ThrowingRepository(original),
          ),
        ],
      );
      addTearDown(container.dispose);

      final before = await container.read(
        taskItemDetailControllerProvider(original.id).future,
      );
      final firstItemId = before!.checklist.first.id;
      final originalDone = before.checklist.first.done;

      final notifier = container.read(
        taskItemDetailControllerProvider(original.id).notifier,
      );
      await expectLater(
        notifier.toggleChecklistItem(firstItemId),
        throwsA(isA<StateError>()),
      );

      final after = container
          .read(taskItemDetailControllerProvider(original.id))
          .requireValue!;
      expect(
        after.checklist.firstWhere((c) => c.id == firstItemId).done,
        originalDone,
        reason: 'rollback should restore original checklist state',
      );
    },
  );

  test(
    'TaskItemDetailController.addRelation rolls back on repo failure',
    () async {
      final original = _makeFixtureTask(
        relations: const [
          TaskRelation(id: 't-200', kind: RelationKind.relatesTo),
        ],
      );
      final container = ProviderContainer(
        overrides: [
          taskItemRepositoryProvider.overrideWithValue(
            _ThrowingRepository(original),
          ),
        ],
      );
      addTearDown(container.dispose);

      await container.read(
        taskItemDetailControllerProvider(original.id).future,
      );
      final notifier = container.read(
        taskItemDetailControllerProvider(original.id).notifier,
      );
      final originalRels = original.relations.map((r) => r.id).toSet();
      const newTargetId = 't-999';

      await expectLater(
        notifier.addRelation(
          const TaskRelation(id: newTargetId, kind: RelationKind.relatesTo),
        ),
        throwsA(isA<StateError>()),
      );

      final after = container
          .read(taskItemDetailControllerProvider(original.id))
          .requireValue!;
      expect(
        after.relations.map((r) => r.id).toSet(),
        originalRels,
        reason: 'rollback should restore relations to the original set',
      );
    },
  );

  test(
    'TaskItemDetailController.updateDue rolls back on repo failure',
    () async {
      final original = _makeFixtureTask();
      final container = ProviderContainer(
        overrides: [
          taskItemRepositoryProvider.overrideWithValue(
            _ThrowingRepository(original),
          ),
        ],
      );
      addTearDown(container.dispose);

      await container.read(
        taskItemDetailControllerProvider(original.id).future,
      );
      final notifier = container.read(
        taskItemDetailControllerProvider(original.id).notifier,
      );

      await expectLater(
        notifier.updateDue(due: null),
        throwsA(isA<StateError>()),
      );

      final after = container
          .read(taskItemDetailControllerProvider(original.id))
          .requireValue!;
      expect(after.due, original.due, reason: 'due should roll back');
    },
  );
}
