import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_item.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_meta.dart';
import 'package:hr1_employee_app/features/tasks/presentation/controllers/task_item_detail_controller.dart';
import 'package:hr1_employee_app/features/tasks/presentation/providers/task_item_providers.dart';
import 'package:hr1_employee_app/features/tasks/presentation/widgets/task_chips.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';

/// 関連タスクを既存のタスクから選んで紐付けるためのハーフシート。
///
/// `task` の relations に新しい [TaskRelation] を追加する。提出は楽観更新で
/// [TaskItemDetailController.addRelation] を呼ぶ。
class TaskRelationLinkSheet {
  TaskRelationLinkSheet._();

  static Future<void> show(
    BuildContext context,
    WidgetRef ref, {
    required TaskItem task,
  }) {
    return CommonSheet.show(
      context: context,
      title: '関連タスクを紐付け',
      heightFactor: 0.75,
      child: _LinkForm(task: task),
    );
  }
}

/// 候補タスクをフィルタする pure function。UI から切り離してテスト可能にする。
/// 自身および既に relations に含まれる id を除外し、`query` が空でなければ
/// id か title に部分一致するもののみ返す。
List<TaskItem> filterRelationCandidates({
  required List<TaskItem> all,
  required String currentTaskId,
  required Set<String> existingRelationIds,
  required String query,
}) {
  final q = query.trim().toLowerCase();
  return all
      .where((t) {
        if (t.id == currentTaskId) return false;
        if (existingRelationIds.contains(t.id)) return false;
        if (q.isEmpty) return true;
        return t.id.toLowerCase().contains(q) ||
            t.title.toLowerCase().contains(q);
      })
      .toList(growable: false);
}

class _LinkForm extends ConsumerStatefulWidget {
  const _LinkForm({required this.task});

  final TaskItem task;

  @override
  ConsumerState<_LinkForm> createState() => _LinkFormState();
}

class _LinkFormState extends ConsumerState<_LinkForm> {
  final _searchController = TextEditingController();
  RelationKind _kind = RelationKind.relatesTo;
  String? _selectedTargetId;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final targetId = _selectedTargetId;
    if (targetId == null) {
      CommonSnackBar.error(context, '紐付けるタスクを選択してください');
      return;
    }
    setState(() => _submitting = true);
    final messenger = ScaffoldMessenger.of(context);
    final navigator = Navigator.of(context);
    try {
      await ref
          .read(taskItemDetailControllerProvider(widget.task.id).notifier)
          .addRelation(TaskRelation(id: targetId, kind: _kind));
      if (!mounted) return;
      navigator.pop();
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(
            content: Text('関連タスクを紐付けました'),
            duration: Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
          ),
        );
    } catch (_) {
      if (!mounted) return;
      setState(() => _submitting = false);
      CommonSnackBar.error(context, '紐付けに失敗しました');
    }
  }

  @override
  Widget build(BuildContext context) {
    // 自分自身 + 既存関連を除外。サーバ検索の `excludeIds` に渡す。
    final excludeIds = <String>{
      widget.task.id,
      for (final r in widget.task.relations) r.id,
    };
    final searchKey = (query: _searchController.text, excludeIds: excludeIds);
    final candidatesAsync = ref.watch(taskTitleSearchProvider(searchKey));

    // 候補タスクのリストは画面端いっぱいに表示し、選択中行のハイライトを
    // 端まで届かせるため、外側の Padding は vertical のみにする。
    // 端揃えが必要な要素（kind selector, 検索ボックス, 提出ボタン）は
    // 個別に horizontal padding を適用する。
    const horizontalPadding = EdgeInsets.symmetric(
      horizontal: AppSpacing.screenHorizontal,
    );
    return Padding(
      padding: const EdgeInsets.only(top: AppSpacing.sm, bottom: AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: horizontalPadding,
            child: Text(
              '関係',
              style: AppTextStyles.caption2.copyWith(
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary(context),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Padding(
            padding: horizontalPadding,
            child: Wrap(
              spacing: AppSpacing.xs,
              runSpacing: AppSpacing.xs,
              children: [
                for (final k in TaskMeta.relationKindOrder)
                  CommonSelectPill(
                    label: TaskMeta.relationLabel(k),
                    color: taskRelationColor(context, k),
                    selected: _kind == k,
                    onTap: () => setState(() => _kind = k),
                  ),
              ],
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Padding(
            padding: horizontalPadding,
            child: Text(
              'タスクを選択',
              style: AppTextStyles.caption2.copyWith(
                fontWeight: FontWeight.w600,
                color: AppColors.textSecondary(context),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          Padding(
            padding: horizontalPadding,
            child: SearchBox(
              controller: _searchController,
              hintText: 'タスク ID またはタイトル',
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Expanded(
            child: candidatesAsync.when(
              loading: () => _searchController.text.trim().isEmpty
                  // 検索ワード未入力時は何も出さない（候補露出を避ける）。
                  ? const SizedBox.shrink()
                  : const LoadingIndicator(),
              error: (_, _) => ErrorState(
                onRetry: () =>
                    ref.invalidate(taskTitleSearchProvider(searchKey)),
              ),
              data: (candidates) {
                if (_searchController.text.trim().isEmpty) {
                  return Center(
                    child: Text(
                      'タイトル / ID で検索してください',
                      style: AppTextStyles.caption2.copyWith(
                        color: AppColors.textSecondary(context),
                      ),
                    ),
                  );
                }
                if (candidates.isEmpty) {
                  return Center(
                    child: EmptyState(
                      icon: Icon(
                        Icons.task_alt_rounded,
                        size: 40,
                        color: AppColors.textTertiary(context),
                      ),
                      title: '紐付け可能なタスクが見つかりません',
                    ),
                  );
                }
                return ListView.separated(
                  itemCount: candidates.length,
                  separatorBuilder: (_, _) =>
                      Divider(height: 1, color: AppColors.border(context)),
                  itemBuilder: (context, i) {
                    final t = candidates[i];
                    final selected = _selectedTargetId == t.id;
                    return _CandidateRow(
                      task: t,
                      selected: selected,
                      onTap: () => setState(() => _selectedTargetId = t.id),
                    );
                  },
                );
              },
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Padding(
            padding: horizontalPadding,
            child: CommonButton(
              onPressed: _submit,
              loading: _submitting,
              enabled: !_submitting && _selectedTargetId != null,
              child: const Text('紐付ける'),
            ),
          ),
        ],
      ),
    );
  }
}

class _CandidateRow extends StatelessWidget {
  const _CandidateRow({
    required this.task,
    required this.selected,
    required this.onTap,
  });

  final TaskItem task;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        // 行コンテンツは画面端から 20px インセット、ハイライトは画面端まで
        // 広がるよう Container の color を使う（InkWell の splash も全幅）。
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.screenHorizontal,
          vertical: AppSpacing.sm + 2,
        ),
        color: selected
            ? AppColors.brand.withValues(alpha: 0.06)
            : Colors.transparent,
        child: Row(
          children: [
            Icon(
              selected
                  ? Icons.check_circle_rounded
                  : Icons.radio_button_unchecked_rounded,
              size: 20,
              color: selected
                  ? AppColors.brand
                  : AppColors.textTertiary(context),
            ),
            const SizedBox(width: AppSpacing.sm),
            TaskIdText(id: '#${task.seq}'),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Text(
                task.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AppTextStyles.body2.copyWith(
                  fontWeight: FontWeight.w500,
                  color: AppColors.textPrimary(context),
                ),
              ),
            ),
            const SizedBox(width: AppSpacing.xs + 2),
            StatusChip(status: task.status, dense: true),
          ],
        ),
      ),
    );
  }
}
