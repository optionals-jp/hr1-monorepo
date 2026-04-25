import 'dart:async';

import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_item.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_item_page.dart';
import 'package:hr1_employee_app/features/tasks/domain/repositories/task_item_repository.dart';
import 'package:hr1_employee_app/features/tasks/presentation/providers/task_item_providers.dart';

typedef TaskListKey = ({bool showDone, TaskSource? source});

class TaskItemListController
    extends AutoDisposeFamilyAsyncNotifier<TaskItemPage, TaskListKey> {
  TaskItemRepository get _repo => ref.read(taskItemRepositoryProvider);

  static const _pageSize = 30;

  final Map<String, Timer> _pendingTimers = {};

  /// 古い in-flight loadMore() の結果を破棄するための世代カウンタ。
  int _gen = 0;

  @override
  Future<TaskItemPage> build(TaskListKey arg) async {
    // `Set<String>` は record 等価比較が効かないため family key には含めず
    // ここで watch する。loadMore / refresh は build 中ではないので read。
    final assignees = ref.watch(taskAssigneeFilterProvider);
    // タブ切替で再フェッチしないよう keepAlive。30 秒で expire。
    final link = ref.keepAlive();
    final expireTimer = Timer(const Duration(seconds: 30), link.close);
    ref.onDispose(() {
      expireTimer.cancel();
      for (final t in _pendingTimers.values) {
        t.cancel();
      }
      _pendingTimers.clear();
    });
    return _repo.fetchPage(
      showDone: arg.showDone,
      source: arg.source,
      assignees: assignees,
      offset: 0,
      limit: _pageSize,
    );
  }

  Future<void> loadMore() async {
    final current = state.valueOrNull;
    if (current == null || !current.hasMore) return;
    if (state is AsyncLoading) return;
    final myGen = ++_gen;
    state = AsyncLoading<TaskItemPage>().copyWithPrevious(state);
    try {
      final next = await _repo.fetchPage(
        showDone: arg.showDone,
        source: arg.source,
        assignees: ref.read(taskAssigneeFilterProvider),
        offset: current.offset,
        limit: _pageSize,
      );
      if (myGen != _gen) return;
      state = AsyncData(current.append(next));
    } catch (e, st) {
      if (myGen != _gen) return;
      state = AsyncError<TaskItemPage>(e, st).copyWithPrevious(state);
    }
  }

  /// pull-to-refresh で呼ぶ。`copyWithPrevious` で旧データを残し、
  /// `skipLoadingOnReload` と組み合わせてリストが消えないようにする。
  Future<void> refresh() async {
    final myGen = ++_gen;
    state = AsyncLoading<TaskItemPage>().copyWithPrevious(state);
    try {
      final fresh = await _repo.fetchPage(
        showDone: arg.showDone,
        source: arg.source,
        assignees: ref.read(taskAssigneeFilterProvider),
        offset: 0,
        limit: _pageSize,
      );
      if (myGen != _gen) return;
      state = AsyncData(fresh);
    } catch (e, st) {
      if (myGen != _gen) return;
      state = AsyncError<TaskItemPage>(e, st).copyWithPrevious(state);
    }
  }

  /// チェック後 [delay] でコミット。pendingTaskIdsProvider に ID を入れて
  /// UI 側でチェック済み + 取り消し可能として描画する。
  void scheduleToggleDone(
    String id, {
    Duration delay = const Duration(seconds: 3),
  }) {
    _pendingTimers[id]?.cancel();
    final pending = ref.read(pendingTaskIdsProvider.notifier);
    pending.update((s) => {...s, id});
    _pendingTimers[id] = Timer(delay, () async {
      _pendingTimers.remove(id);
      pending.update((s) => s.where((e) => e != id).toSet());
      await _commitToggle(id);
    });
  }

  void cancelPendingToggle(String id) {
    final timer = _pendingTimers.remove(id);
    timer?.cancel();
    final pending = ref.read(pendingTaskIdsProvider.notifier);
    pending.update((s) => s.where((e) => e != id).toSet());
  }

  Future<void> _commitToggle(String id) async {
    final current = state.valueOrNull;
    if (current == null) return;
    TaskItem? target;
    for (final t in current.items) {
      if (t.id == id) {
        target = t;
        break;
      }
    }
    if (target == null) return;
    final nextStatus = target.status == TaskStatus.done
        ? TaskStatus.todo
        : TaskStatus.done;
    final updated = await _repo.updateStatus(id, nextStatus);
    // 更新後の done 状態がタブ条件と一致しなければ一覧から外す（タブ間移動）。
    final shouldRemove = (updated.status == TaskStatus.done) != arg.showDone;
    final newItems = <TaskItem>[];
    for (final t in current.items) {
      if (t.id == id) {
        if (!shouldRemove) newItems.add(updated);
      } else {
        newItems.add(t);
      }
    }
    state = AsyncData(
      TaskItemPage(
        items: newItems,
        hasMore: current.hasMore,
        offset: shouldRemove ? current.offset - 1 : current.offset,
      ),
    );
    ref.invalidate(taskCountsProvider);
  }

  Future<void> add(TaskItem task) async {
    final saved = await _repo.create(task);
    final current = state.valueOrNull;
    if (current == null) {
      await refresh();
      ref.invalidate(taskCountsProvider);
      return;
    }
    final matchesTab = (saved.status == TaskStatus.done) == arg.showDone;
    final matchesSource = arg.source == null || saved.source == arg.source;
    if (matchesTab && matchesSource) {
      state = AsyncData(
        TaskItemPage(
          items: [saved, ...current.items],
          hasMore: current.hasMore,
          offset: current.offset + 1,
        ),
      );
    }
    ref.invalidate(taskCountsProvider);
  }

  /// 詳細画面側の楽観更新を一覧キャッシュにも反映する。
  void replaceItem(TaskItem updated) {
    final current = state.valueOrNull;
    if (current == null) return;
    final inList = current.items.any((t) => t.id == updated.id);
    if (!inList) return;
    final shouldRemove = (updated.status == TaskStatus.done) != arg.showDone;
    final newItems = <TaskItem>[];
    for (final t in current.items) {
      if (t.id == updated.id) {
        if (!shouldRemove) newItems.add(updated);
      } else {
        newItems.add(t);
      }
    }
    state = AsyncData(
      TaskItemPage(
        items: newItems,
        hasMore: current.hasMore,
        offset: shouldRemove ? current.offset - 1 : current.offset,
      ),
    );
  }
}

final taskItemListControllerProvider =
    AutoDisposeAsyncNotifierProvider.family<
      TaskItemListController,
      TaskItemPage,
      TaskListKey
    >(TaskItemListController.new);
