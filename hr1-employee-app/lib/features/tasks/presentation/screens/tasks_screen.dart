import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/notifications/presentation/providers/notification_providers.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_item.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_item_page.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_meta.dart';
import 'package:hr1_employee_app/features/tasks/presentation/controllers/task_item_list_controller.dart';
import 'package:hr1_employee_app/features/tasks/presentation/providers/task_item_providers.dart';
import 'package:hr1_employee_app/features/tasks/presentation/widgets/task_assignee_chip_label.dart';
import 'package:hr1_employee_app/features/tasks/presentation/screens/task_new_sheet.dart';
import 'package:hr1_employee_app/features/tasks/presentation/widgets/task_card.dart';
import 'package:hr1_employee_app/features/tasks/presentation/widgets/task_chips.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';

/// 31 タスク一覧 — list mode per the `Flutter実装指示書_31タスク一覧.md` handoff.
class TasksScreen extends HookConsumerWidget {
  const TasksScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tabController = useTabController(initialLength: 2);
    final source = ref.watch(taskSourceFilterProvider);
    final countsAsync = ref.watch(taskCountsProvider(source));
    final counts = countsAsync.valueOrNull ?? TaskItemCounts.zero;
    final user = ref.watch(appUserProvider);

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.dark.copyWith(
        statusBarColor: Colors.transparent,
      ),
      child: CommonScaffold(
        backgroundColor: AppColors.surface(context),
        appBar: AppBar(
          titleSpacing: AppSpacing.screenHorizontal,
          title: Row(
            children: [
              OrgIcon(
                initial: (user?.activeOrganizationName ?? 'H').substring(0, 1),
                size: 32,
              ),
              const SizedBox(width: 10),
              Text(
                'タスク',
                style: AppTextStyles.title1.copyWith(letterSpacing: -0.2),
              ),
            ],
          ),
          centerTitle: false,
          actions: [
            IconButton(
              icon: Consumer(
                builder: (context, ref, _) {
                  final countAsync = ref.watch(unreadNotificationCountProvider);
                  final count = countAsync.valueOrNull ?? 0;
                  return Stack(
                    clipBehavior: Clip.none,
                    children: [
                      AppIcons.notification(
                        color: AppColors.textPrimary(context),
                        size: 22,
                      ),
                      if (count > 0)
                        Positioned(
                          right: -6,
                          top: -4,
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 4,
                              vertical: 1,
                            ),
                            decoration: const BoxDecoration(
                              color: AppColors.error,
                              shape: BoxShape.circle,
                            ),
                            constraints: const BoxConstraints(
                              minWidth: 16,
                              minHeight: 16,
                            ),
                            child: Center(
                              child: Text(
                                count > 99 ? '99+' : '$count',
                                style: AppTextStyles.caption2.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                  height: 1.0,
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  );
                },
              ),
              onPressed: () => context.push(AppRoutes.notifications),
            ),
            GestureDetector(
              onTap: () => context.push(AppRoutes.profileFullscreen),
              child: Padding(
                padding: const EdgeInsets.only(
                  right: AppSpacing.screenHorizontal,
                  left: AppSpacing.xs,
                ),
                child: UserAvatar(
                  initial: (user?.displayName ?? user?.email ?? 'U').substring(
                    0,
                    1,
                  ),
                  size: 32,
                  imageUrl: user?.avatarUrl,
                ),
              ),
            ),
          ],
        ),
        floatingActionButton: FloatingActionButton(
          onPressed: () => TaskNewSheet.show(context, ref),
          backgroundColor: AppColors.brand,
          foregroundColor: Colors.white,
          elevation: 2,
          child: const Icon(Icons.add_rounded),
        ),
        body: NestedScrollView(
          headerSliverBuilder: (context, innerBoxIsScrolled) => [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.screenHorizontal,
                  AppSpacing.sm,
                  AppSpacing.screenHorizontal,
                  AppSpacing.xs,
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: KpiTile(
                        label: '超過',
                        value: '${counts.overdue}',
                        valueColor: AppColors.danger,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: KpiTile(
                        label: '今日',
                        value: '${counts.todayCount}',
                        valueColor: AppColors.brand,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: _FilterTriggerRow(
                onSourceTap: () => _SourceFilterSheet.show(context, ref),
                onAssigneeTap: () => _AssigneeFilterSheet.show(context, ref),
              ),
            ),
            SliverPersistentHeader(
              pinned: true,
              delegate: _TaskTabBarDelegate(
                TabBar(
                  controller: tabController,
                  isScrollable: true,
                  tabAlignment: TabAlignment.start,
                  indicatorColor: AppColors.brand,
                  indicatorWeight: 2,
                  indicatorSize: TabBarIndicatorSize.tab,
                  labelColor: AppColors.brand,
                  unselectedLabelColor: AppColors.textSecondary(context),
                  labelStyle: AppTextStyles.body2.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                  unselectedLabelStyle: AppTextStyles.body2.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                  labelPadding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.sm,
                  ),
                  // 区切り線は Stack 側で画面幅いっぱいに描画するため、
                  // TabBar 本体の divider は無効化する。
                  dividerHeight: 0,
                  splashFactory: NoSplash.splashFactory,
                  overlayColor: WidgetStateProperty.all(Colors.transparent),
                  tabs: [
                    Tab(text: 'アクティブ · ${counts.active}'),
                    Tab(text: '完了 · ${counts.done}'),
                  ],
                ),
              ),
            ),
          ],
          body: TabBarView(
            controller: tabController,
            children: [
              _TaskListView(showDone: false, source: source),
              _TaskListView(showDone: true, source: source),
            ],
          ),
        ),
      ),
    );
  }
}

/// アクティブ / 完了タブ内部のタスク一覧ビュー。
/// `(showDone, source)` で paginated controller を引き、`ListView.builder` で
/// 遅延描画する。スクロール末尾近くで `loadMore()` をトリガし、引き寄せで
/// `refresh()` する。
class _TaskListView extends ConsumerStatefulWidget {
  const _TaskListView({required this.showDone, required this.source});

  final bool showDone;
  final TaskSource? source;

  @override
  ConsumerState<_TaskListView> createState() => _TaskListViewState();
}

class _TaskListViewState extends ConsumerState<_TaskListView> {
  TaskListKey get _key => (showDone: widget.showDone, source: widget.source);

  @override
  Widget build(BuildContext context) {
    final pageAsync = ref.watch(taskItemListControllerProvider(_key));
    return pageAsync.when(
      skipLoadingOnReload: true,
      loading: () => const LoadingIndicator(),
      error: (_, _) => ErrorState(
        onRetry: () => ref.invalidate(taskItemListControllerProvider(_key)),
      ),
      data: (page) {
        if (page.items.isEmpty) {
          return RefreshIndicator(
            onRefresh: () => ref
                .read(taskItemListControllerProvider(_key).notifier)
                .refresh(),
            child: ListView(
              padding: const EdgeInsets.only(top: 80),
              children: [
                EmptyState(
                  icon: Icon(
                    Icons.task_alt_rounded,
                    size: 48,
                    color: AppColors.textTertiary(context),
                  ),
                  title: '該当するタスクはありません',
                ),
              ],
            ),
          );
        }
        return _PaginatedTaskList(
          listKey: _key,
          page: page,
          showDone: widget.showDone,
        );
      },
    );
  }
}

/// 期限 bucket 見出しか TaskCard かを表す flat row entry。
sealed class _Row {
  const _Row();
}

class _BucketHeaderRow extends _Row {
  const _BucketHeaderRow(this.label, this.count);
  final String label;
  final int count;
}

class _TaskCardRow extends _Row {
  const _TaskCardRow(this.task);
  final TaskItem task;
}

class _LoadMoreRow extends _Row {
  const _LoadMoreRow();
}

/// `page.items` を bucket 単位の見出し + カードの flat list に展開する。
/// items は `(due ASC NULLS LAST, id DESC)` で整列されているので 1 パスで
/// bucket 境界が検出できる。最後に `hasMore` ならローディング sentinel を
/// 1 行追加する。
List<_Row> _buildRows(List<TaskItem> items, DateTime today, bool hasMore) {
  final rows = <_Row>[];
  String? currentBucket;
  int? headerIndex;
  int currentCount = 0;
  for (final t in items) {
    final bucket = TaskMeta.dueBucket(t.due, now: today);
    if (bucket != currentBucket) {
      if (headerIndex != null) {
        rows[headerIndex] = _BucketHeaderRow(currentBucket!, currentCount);
      }
      rows.add(_BucketHeaderRow(bucket, 0));
      headerIndex = rows.length - 1;
      currentBucket = bucket;
      currentCount = 0;
    }
    rows.add(_TaskCardRow(t));
    currentCount++;
  }
  if (headerIndex != null) {
    rows[headerIndex] = _BucketHeaderRow(currentBucket!, currentCount);
  }
  if (hasMore) rows.add(const _LoadMoreRow());
  return rows;
}

class _PaginatedTaskList extends ConsumerStatefulWidget {
  const _PaginatedTaskList({
    required this.listKey,
    required this.page,
    required this.showDone,
  });

  final TaskListKey listKey;
  final TaskItemPage page;
  final bool showDone;

  @override
  ConsumerState<_PaginatedTaskList> createState() => _PaginatedTaskListState();
}

class _PaginatedTaskListState extends ConsumerState<_PaginatedTaskList> {
  // スクロール末尾近くに来たら loadMore を呼ぶための Notification handler。
  bool _onScrollNotification(ScrollNotification n) {
    if (n.metrics.axis != Axis.vertical) return false;
    if (n.metrics.pixels >= n.metrics.maxScrollExtent - 200 &&
        widget.page.hasMore) {
      // build 中の setState を避けるため microtask で次フレームに遅らせる。
      Future.microtask(() {
        ref
            .read(taskItemListControllerProvider(widget.listKey).notifier)
            .loadMore();
      });
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    final today = ref.watch(taskTodayProvider);
    final pendingIds = ref.watch(pendingTaskIdsProvider);
    final rows = _buildRows(widget.page.items, today, widget.page.hasMore);
    return RefreshIndicator(
      onRefresh: () => ref
          .read(taskItemListControllerProvider(widget.listKey).notifier)
          .refresh(),
      child: NotificationListener<ScrollNotification>(
        onNotification: _onScrollNotification,
        child: ListView.builder(
          padding: const EdgeInsets.only(top: AppSpacing.xs, bottom: 80),
          itemCount: rows.length,
          itemBuilder: (context, i) {
            final row = rows[i];
            return switch (row) {
              _BucketHeaderRow() => _BucketHeader(
                label: row.label,
                count: row.count,
              ),
              _TaskCardRow() => TaskCard(
                task: row.task,
                forceChecked: pendingIds.contains(row.task.id),
                onTap: () =>
                    context.push(AppRoutes.taskDetail, extra: row.task.id),
                onToggleDone: () => _handleToggleDone(context, ref, row.task),
              ),
              _LoadMoreRow() => const Padding(
                padding: EdgeInsets.symmetric(vertical: 16),
                child: Center(child: LoadingIndicator(size: 20)),
              ),
            };
          },
        ),
      ),
    );
  }

  void _handleToggleDone(BuildContext context, WidgetRef ref, TaskItem task) {
    final controller = ref.read(
      taskItemListControllerProvider(widget.listKey).notifier,
    );
    final isDone = task.status == TaskStatus.done;
    if (isDone) {
      // 完了済みを未完了に戻すのは即時反映。誤タップのリスクは小さい。
      controller.scheduleToggleDone(task.id, delay: Duration.zero);
      return;
    }
    controller.scheduleToggleDone(task.id);
    CommonSnackBar.show(
      context,
      'タスクを完了しました: ${task.title}',
      actionLabel: '元に戻す',
      onAction: () => controller.cancelPendingToggle(task.id),
    );
  }
}

class _BucketHeader extends StatelessWidget {
  const _BucketHeader({required this.label, required this.count});

  final String label;
  final int count;

  @override
  Widget build(BuildContext context) {
    final color = label == '期限超過'
        ? AppColors.danger
        : AppColors.textSecondary(context);
    final labelStyle = AppTextStyles.label1.copyWith(color: color);
    final countStyle = AppTextStyles.label1.copyWith(
      color: color.withValues(alpha: 0.7),
    );
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        AppSpacing.md,
        AppSpacing.screenHorizontal,
        AppSpacing.xs,
      ),
      child: Row(
        children: [
          Text(label, style: labelStyle),
          const SizedBox(width: AppSpacing.xs),
          Text('· $count', style: countStyle),
        ],
      ),
    );
  }
}

/// 種別フィルタ + 担当者フィルタの chip を横一列に並べる行。
/// どちらも YouTube Studio 風の「選択中スタイル」で常時表示し、タップで
/// 各々のシートが開く。
class _FilterTriggerRow extends ConsumerWidget {
  const _FilterTriggerRow({
    required this.onSourceTap,
    required this.onAssigneeTap,
  });

  final VoidCallback onSourceTap;
  final VoidCallback onAssigneeTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final source = ref.watch(taskSourceFilterProvider);
    final assignees = ref.watch(taskAssigneeFilterProvider);
    // 候補ロード前は ID から名前を引けないので、それに合わせた fallback を
    // ラベルで使う。ロード完了で chip が rebuild され正規名に置き換わる。
    final candidates =
        ref.watch(assigneeCandidatesProvider).valueOrNull ?? const <TaskUser>[];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        AppSpacing.xs,
        AppSpacing.screenHorizontal,
        AppSpacing.sm,
      ),
      child: Row(
        children: [
          _FilterChip(
            // 未選択時は「すべて」、選択時はその種別ラベル。
            // どちらも常に「選択中スタイル」(active=true)で表示する。
            label: source == null ? 'すべて' : TaskMeta.sourceLabel(source),
            accent: source == null ? null : taskSourceColor(source),
            active: true,
            onTap: onSourceTap,
          ),
          const SizedBox(width: 6),
          _AssigneeFilterChip(
            assignees: assignees,
            candidates: candidates,
            onTap: onAssigneeTap,
          ),
        ],
      ),
    );
  }
}

/// YouTube Studio 風のフィルタトリガ chip。
/// 未選択時は薄いグレーで「すべて」、選択時はアクセント色を帯び、左に色
/// ドット、右に下向き chevron を表示する。タップでシートを開く。
class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.accent,
    required this.active,
    required this.onTap,
    this.leading,
  });

  final String label;
  final Color? accent;
  final bool active;
  final VoidCallback onTap;

  /// アクセントドットの代わりに表示する任意の widget（アバター等）。
  /// 指定するとドットはレンダリングされない。
  final Widget? leading;

  @override
  Widget build(BuildContext context) {
    final fg = active
        ? (accent ?? AppColors.brand)
        : AppColors.textSecondary(context);
    final bg = active
        ? (accent ?? AppColors.brand).withValues(alpha: 0.10)
        : AppColors.surface(context);
    final borderColor = active
        ? (accent ?? AppColors.brand).withValues(alpha: 0.4)
        : AppColors.border(context);
    final base = AppTextStyles.label1;
    return Material(
      color: bg,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: borderColor),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (leading != null) ...[
                leading!,
                const SizedBox(width: 6),
              ] else if (active) ...[
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: accent ?? AppColors.brand,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
              ],
              Text(
                label,
                style: base.copyWith(fontWeight: FontWeight.w600, color: fg),
              ),
              const SizedBox(width: 4),
              Icon(Icons.expand_more_rounded, size: 16, color: fg),
            ],
          ),
        ),
      ),
    );
  }
}

/// 担当者フィルタ chip。選択ユーザがいればその先頭ユーザのアバターを leading
/// として表示し、ラベルは [taskAssigneeChipLabel] を使う。
class _AssigneeFilterChip extends StatelessWidget {
  const _AssigneeFilterChip({
    required this.assignees,
    required this.candidates,
    required this.onTap,
  });

  final Set<String> assignees;
  final List<TaskUser> candidates;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    TaskUser? firstSelected;
    if (assignees.isNotEmpty) {
      final byId = {for (final u in candidates) u.id: u};
      for (final id in assignees) {
        final u = byId[id];
        if (u != null) {
          firstSelected = u;
          break;
        }
      }
    }
    return _FilterChip(
      label: taskAssigneeChipLabel(assignees, candidates),
      accent: null,
      active: true,
      leading: firstSelected != null
          ? UserAvatar(
              initial: firstSelected.avatar,
              color: Color(firstSelected.argb),
              size: 16,
            )
          : null,
      onTap: onTap,
    );
  }
}

/// 種別フィルタを開くヘルパ。共通コンポーネント [CommonOptionSheet] を使う。
class _SourceFilterSheet {
  _SourceFilterSheet._();

  static Future<void> show(BuildContext context, WidgetRef ref) {
    final current = ref.read(taskSourceFilterProvider);
    return CommonOptionSheet.show<TaskSource?>(
      context: context,
      title: '種別',
      options: [
        const CommonOption(value: null, label: 'すべて'),
        for (final s in TaskMeta.userSelectableSources)
          CommonOption(value: s, label: TaskMeta.sourceLabel(s)),
      ],
      selected: current,
      onSelect: (v) => ref.read(taskSourceFilterProvider.notifier).state = v,
    );
  }
}

/// 担当者フィルタを開くヘルパ。共通コンポーネント [CommonMultiOptionSheet]
/// を使う複数選択。候補（同一組織のメンバー）を 1 度ロードしてから開く。
class _AssigneeFilterSheet {
  _AssigneeFilterSheet._();

  static Future<void> show(BuildContext context, WidgetRef ref) async {
    // 候補が未ロードのまま空リストでシートを開かないよう、まず future を await。
    final candidates = await ref.read(assigneeCandidatesProvider.future);
    if (!context.mounted) return;
    if (candidates.isEmpty) {
      // 候補が見つからない時に黙って何もしないとタップが効いてないように
      // 見えるので、SnackBar で明示する。
      CommonSnackBar.show(context, '担当者候補が見つかりません');
      return;
    }
    final current = ref.read(taskAssigneeFilterProvider);
    return CommonMultiOptionSheet.show<String>(
      context: context,
      title: '担当者',
      searchable: true,
      searchHint: '名前で検索',
      options: [
        for (final user in candidates)
          CommonOption(
            value: user.id,
            label: user.name,
            leading: UserAvatar(
              initial: user.avatar,
              color: Color(user.argb),
              size: 32,
            ),
            labelStyle: AppTextStyles.label1,
          ),
      ],
      selected: current,
      onChange: (next) =>
          ref.read(taskAssigneeFilterProvider.notifier).replace(next),
    );
  }
}

/// [TabBar] を [NestedScrollView] のヘッダ内で pinned に保持するためのデリゲート。
class _TaskTabBarDelegate extends SliverPersistentHeaderDelegate {
  _TaskTabBarDelegate(this.tabBar);

  final TabBar tabBar;

  @override
  double get minExtent => tabBar.preferredSize.height;

  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    // タブの下線（区切り線）は画面幅いっぱいに、選択中の下線（インジケータ）
    // は画面両端から 20px インセットした領域内に描画する。
    // - 下段: 画面全幅の 1px 区切り線（Positioned + ColoredBox）
    // - 上段: TabBar 本体を 20px の水平パディングで内側に寄せる。
    //   TabBar 標準のインジケータ（2px）はこの padded 領域内のタブ下に
    //   描画されるので、画面両端から常に 20px 以上のクリアランスを保つ。
    return ColoredBox(
      color: AppColors.surface(context),
      child: Stack(
        children: [
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            height: 1,
            child: ColoredBox(color: AppColors.border(context)),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.screenHorizontal,
            ),
            child: tabBar,
          ),
        ],
      ),
    );
  }

  @override
  bool shouldRebuild(covariant _TaskTabBarDelegate oldDelegate) =>
      oldDelegate.tabBar != tabBar;
}
