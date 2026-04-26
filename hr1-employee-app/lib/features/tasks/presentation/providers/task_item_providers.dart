import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/core/organization/organization_context.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/tasks/data/repositories/supabase_task_item_repository.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_item.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_item_page.dart';
import 'package:hr1_employee_app/features/tasks/domain/repositories/task_item_repository.dart';

final taskItemRepositoryProvider = Provider<TaskItemRepository>((ref) {
  return SupabaseTaskItemRepository(
    ref.watch(supabaseClientProvider),
    activeOrganizationId: ref.watch(activeOrganizationIdProvider),
  );
});

/// 担当者候補（同じ組織のメンバー）。応募者ロールは除外。
final assigneeCandidatesProvider = FutureProvider.autoDispose<List<TaskUser>>((
  ref,
) {
  return ref.watch(taskItemRepositoryProvider).fetchAssigneeCandidates();
});

/// `DateTime.now()` を分単位で丸めてメモ化（毎秒 rebuild させないため）。
final taskClockProvider = Provider.autoDispose<DateTime>((ref) {
  final now = DateTime.now();
  return DateTime(now.year, now.month, now.day, now.hour, now.minute);
});

final taskTodayProvider = Provider.autoDispose<DateTime>((ref) {
  final now = ref.watch(taskClockProvider);
  return DateTime(now.year, now.month, now.day);
});

final currentTaskUserProvider = Provider<TaskUser?>((ref) {
  final user = ref.watch(appUserProvider);
  if (user == null) return null;
  return TaskUser.fromProfile(
    id: user.id,
    displayName: user.displayName ?? user.email,
  );
});

/// `null` = すべて。
final taskSourceFilterProvider = StateProvider.autoDispose<TaskSource?>(
  (_) => null,
);

/// 担当者フィルタ。空集合 = 全員、それ以外は `assignee_id IN (...)`。
/// 初期値は現在のログインユーザの id。display_name 等の変化では rebuild
/// されないよう `.select((u) => u?.id)` で id 変化のみ監視（手動選択を温存）。
class TaskAssigneeFilterController extends AutoDisposeNotifier<Set<String>> {
  @override
  Set<String> build() {
    final myId = ref.watch(currentTaskUserProvider.select((u) => u?.id));
    return myId == null ? const <String>{} : Set.unmodifiable(<String>{myId});
  }

  void replace(Set<String> next) {
    state = Set.unmodifiable(next);
  }
}

final taskAssigneeFilterProvider =
    AutoDisposeNotifierProvider<TaskAssigneeFilterController, Set<String>>(
      TaskAssigneeFilterController.new,
    );

/// チェック済みだが commit 前のタスク ID。タブ切替で消えないよう非 autoDispose。
final pendingTaskIdsProvider = StateProvider<Set<String>>((_) => <String>{});

/// `Set<String>` は record 等価比較が効かないため `assignees` は family key
/// に含めず内部で `ref.watch` する。
final taskCountsProvider = FutureProvider.autoDispose
    .family<TaskItemCounts, TaskSource?>((ref, source) async {
      final repo = ref.watch(taskItemRepositoryProvider);
      final assignees = ref.watch(taskAssigneeFilterProvider);
      return repo.fetchCounts(source: source, assignees: assignees);
    });

/// 通知タップ等、bundle 未ロードの状況で単発取得したい場合のフォールバック。
final taskByIdProvider = FutureProvider.autoDispose.family<TaskItem?, String>((
  ref,
  id,
) async {
  final repo = ref.watch(taskItemRepositoryProvider);
  return repo.fetchById(id);
});

class TaskDetailBundle {
  const TaskDetailBundle({required this.byId});

  final Map<String, TaskItem> byId;

  static const empty = TaskDetailBundle(byId: <String, TaskItem>{});

  TaskItem? operator [](String id) => byId[id];
}

/// 詳細画面の親 / サブ / 関連を 1 RTT で hydrate する。
/// 詳細 controller を `watch` しない: 楽観更新ごとに refetch されてしまうため。
final taskDetailBundleProvider = FutureProvider.autoDispose
    .family<TaskDetailBundle, String>((ref, taskId) async {
      final repo = ref.watch(taskItemRepositoryProvider);
      final root = await repo.fetchById(taskId);
      if (root == null) return TaskDetailBundle.empty;
      final ids = <String>{
        if (root.parent != null) root.parent!,
        ...root.subtasks,
        for (final r in root.relations) r.id,
      };
      if (ids.isEmpty) return TaskDetailBundle.empty;
      final fetched = await repo.fetchByIds(ids.toList(growable: false));
      return TaskDetailBundle(byId: {for (final t in fetched) t.id: t});
    });
