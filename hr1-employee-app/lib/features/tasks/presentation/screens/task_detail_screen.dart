import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_item.dart';
import 'package:hr1_employee_app/features/tasks/presentation/controllers/task_item_detail_controller.dart';
import 'package:hr1_employee_app/features/tasks/presentation/widgets/task_action_bar.dart';
import 'package:hr1_employee_app/features/tasks/presentation/widgets/task_attachments_block.dart';
import 'package:hr1_employee_app/features/tasks/presentation/widgets/task_checklist_block.dart';
import 'package:hr1_employee_app/features/tasks/presentation/widgets/task_comments_block.dart';
import 'package:hr1_employee_app/features/tasks/presentation/widgets/task_description_block.dart';
import 'package:hr1_employee_app/features/tasks/presentation/widgets/task_detail_header.dart';
import 'package:hr1_employee_app/features/tasks/presentation/widgets/task_related_link.dart';
import 'package:hr1_employee_app/features/tasks/presentation/widgets/task_relations_block.dart';
import 'package:hr1_employee_app/features/tasks/presentation/widgets/task_subtasks_block.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';

/// 32 タスク詳細 / 36 開発タスク詳細 (shared — 36 passes `taskId: "#202"`).
///
/// レイアウト:
/// - AppBar
/// - NestedScrollView
///   - headerSliverBuilder: `TaskDetailHeader`（非 pinned）+ TabBar (pinned)
///   - body: TabBarView (概要 / サブタスク / 関連タスク / コメント)
/// - TaskActionBar（画面下部固定、タブ切替で消えない）
///
/// 各セクション widget は `widgets/` 配下に抽出済み。本画面はそれらを
/// タブ単位に並べる薄いオーケストレータ。
class TaskDetailScreen extends HookConsumerWidget {
  const TaskDetailScreen({super.key, this.taskId});

  final String? taskId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final id = taskId ?? '';
    final taskAsync = ref.watch(taskItemDetailControllerProvider(id));
    final tabController = useTabController(initialLength: 4);

    return CommonScaffold(
      backgroundColor: AppColors.surface(context),
      appBar: AppBar(
        elevation: 0,
        titleSpacing: 0,
        actions: [
          IconButton(
            icon: Icon(
              Icons.more_horiz_rounded,
              color: AppColors.textSecondary(context),
            ),
            onPressed: null,
          ),
        ],
      ),
      body: taskAsync.when(
        loading: () => const LoadingIndicator(),
        error: (_, _) => ErrorState(
          onRetry: () => ref.invalidate(taskItemDetailControllerProvider(id)),
        ),
        data: (task) {
          if (task == null) {
            return const ErrorState(message: 'タスクが見つかりません');
          }
          return SafeArea(
            top: false,
            child: Column(
              children: [
                Expanded(
                  child: NestedScrollView(
                    headerSliverBuilder: (context, innerBoxIsScrolled) => [
                      SliverToBoxAdapter(child: TaskDetailHeader(task: task)),
                      SliverPersistentHeader(
                        pinned: true,
                        delegate: _TaskDetailTabBarDelegate(
                          TabBar(
                            controller: tabController,
                            isScrollable: true,
                            tabAlignment: TabAlignment.start,
                            indicatorColor: AppColors.brand,
                            indicatorWeight: 2,
                            indicatorSize: TabBarIndicatorSize.tab,
                            labelColor: AppColors.brand,
                            unselectedLabelColor: AppColors.textSecondary(
                              context,
                            ),
                            labelStyle: AppTextStyles.body2.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                            unselectedLabelStyle: AppTextStyles.body2.copyWith(
                              fontWeight: FontWeight.w500,
                            ),
                            labelPadding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.sm,
                            ),
                            // 区切り線は Stack 側で画面幅いっぱいに描画する
                            // ため、TabBar 本体の divider は無効化する。
                            dividerHeight: 0,
                            splashFactory: NoSplash.splashFactory,
                            overlayColor: WidgetStateProperty.all(
                              Colors.transparent,
                            ),
                            tabs: const [
                              Tab(text: '概要'),
                              Tab(text: 'サブタスク'),
                              Tab(text: '関連タスク'),
                              Tab(text: 'コメント'),
                            ],
                          ),
                        ),
                      ),
                    ],
                    body: TabBarView(
                      controller: tabController,
                      children: [
                        _OverviewTab(task: task),
                        _SubtasksTab(task: task),
                        _RelationsTab(task: task),
                        _CommentsTab(task: task),
                      ],
                    ),
                  ),
                ),
                TaskActionBar(task: task),
              ],
            ),
          );
        },
      ),
    );
  }
}

/// 概要タブ — 全セクションを縦に並べて表示する。
class _OverviewTab extends StatelessWidget {
  const _OverviewTab({required this.task});

  final TaskItem task;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.only(bottom: 20),
      children: [
        TaskDescriptionBlock(task: task),
        if (task.relatedName != null) TaskRelatedLink(task: task),
        TaskSubtasksBlock(task: task),
        TaskRelationsBlock(task: task),
        TaskChecklistBlock(task: task),
        TaskAttachmentsBlock(task: task),
        TaskCommentsBlock(task: task),
      ],
    );
  }
}

class _SubtasksTab extends StatelessWidget {
  const _SubtasksTab({required this.task});

  final TaskItem task;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.only(bottom: 20),
      children: [TaskSubtasksBlock(task: task)],
    );
  }
}

class _RelationsTab extends StatelessWidget {
  const _RelationsTab({required this.task});

  final TaskItem task;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.only(bottom: 20),
      children: [TaskRelationsBlock(task: task)],
    );
  }
}

class _CommentsTab extends StatelessWidget {
  const _CommentsTab({required this.task});

  final TaskItem task;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.only(bottom: 20),
      children: [TaskCommentsBlock(task: task)],
    );
  }
}

/// pinned な TabBar を `NestedScrollView.headerSliverBuilder` で扱うための
/// デリゲート。区切り線は画面全幅、選択中インジケータは画面両端から
/// 20px インセットされた領域内に描かれる。
class _TaskDetailTabBarDelegate extends SliverPersistentHeaderDelegate {
  _TaskDetailTabBarDelegate(this.tabBar);

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
  bool shouldRebuild(covariant _TaskDetailTabBarDelegate oldDelegate) =>
      oldDelegate.tabBar != tabBar;
}
