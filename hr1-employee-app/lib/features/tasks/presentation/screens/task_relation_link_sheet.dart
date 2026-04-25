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
/// `showModalBottomSheet` を **同期的に** 呼ぶ。modal barrier がフレーム内で
/// 出現するため、二重タップで複数枚開くバグは構造的に発生しない。候補は
/// シート内 `initState` で fetch し、loading/error/data の 3 状態で描画する。
/// 視覚構造は [CommonOptionSheet] と揃える（drag handle / title / divider /
/// header / search / list）。
class TaskRelationLinkSheet {
  TaskRelationLinkSheet._();

  static Future<void> show(
    BuildContext context,
    WidgetRef ref, {
    required TaskItem task,
  }) {
    // commit 後の SnackBar は pop で disposed になるシート context ではなく、
    // 外側 (呼び出し元) の context を closure で握って表示する。`_Sheet` 内の
    // context は pop 後に mounted=false になるため使えない。
    Future<void> apply(String targetId, RelationKind kind) async {
      try {
        await ref
            .read(taskItemDetailControllerProvider(task.id).notifier)
            .addRelation(TaskRelation(id: targetId, kind: kind));
        if (!context.mounted) return;
        CommonSnackBar.show(context, '関連タスクを紐付けました');
      } catch (_) {
        if (!context.mounted) return;
        CommonSnackBar.error(context, '紐付けに失敗しました');
      }
    }

    return showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      // useSafeArea: false にすると内側で `MediaQuery.removePadding(removeTop:
      // true)` が適用されて padding.top = 0 になり、Dynamic Island/notch の
      // クリアランス計算が壊れる。
      useSafeArea: true,
      isScrollControlled: true,
      useRootNavigator: true,
      builder: (_) => _Sheet(task: task, onApply: apply),
    );
  }
}

typedef _ApplyFn = Future<void> Function(String targetId, RelationKind kind);

class _Sheet extends ConsumerStatefulWidget {
  const _Sheet({required this.task, required this.onApply});

  final TaskItem task;
  final _ApplyFn onApply;

  @override
  ConsumerState<_Sheet> createState() => _SheetState();
}

class _SheetState extends ConsumerState<_Sheet> {
  final _searchController = TextEditingController();
  RelationKind _kind = RelationKind.relatesTo;
  String _query = '';
  late Future<List<TaskItem>> _candidatesFuture;
  // タップ後 pop する間の連打や、addRelation 完了前の二重投入を抑止する。
  bool _dispatched = false;

  @override
  void initState() {
    super.initState();
    _candidatesFuture = _loadCandidates();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<List<TaskItem>> _loadCandidates() {
    final excludeIds = <String>{
      widget.task.id,
      for (final r in widget.task.relations) r.id,
    };
    return ref
        .read(taskItemRepositoryProvider)
        .searchByTitle(query: '', excludeIds: excludeIds);
  }

  void _handleSelect(String targetId) {
    if (_dispatched) return;
    _dispatched = true;
    final kind = _kind;
    Navigator.of(context).pop();
    // pop 後の SnackBar 表示は外側 context に closure で寄せる。
    widget.onApply(targetId, kind);
  }

  List<TaskItem> _filter(List<TaskItem> all) {
    final q = _query.trim().toLowerCase();
    if (q.isEmpty) return all;
    return all
        .where((t) {
          final hay = '#${t.seq} ${t.title}'.toLowerCase();
          return hay.contains(q);
        })
        .toList(growable: false);
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        // Dynamic Island 直下にカードが張り付かないよう余白を引く。
        const topClearance = AppSpacing.xxl;
        final maxHeight = constraints.maxHeight - topClearance;
        return ConstrainedBox(
          constraints: BoxConstraints(maxHeight: maxHeight),
          child: SafeArea(
            // top は route 側 SafeArea で処理済み。bottom のみここで処理。
            top: false,
            child: Container(
              margin: const EdgeInsetsDirectional.fromSTEB(
                AppSpacing.sm,
                0,
                AppSpacing.sm,
                AppSpacing.sm,
              ),
              clipBehavior: Clip.antiAlias,
              decoration: BoxDecoration(
                color: AppColors.surface(context),
                borderRadius: BorderRadius.circular(20),
              ),
              // 子の InkWell が ripple を描けるよう Material を被せる。
              child: Material(
                type: MaterialType.transparency,
                child: Column(
                  mainAxisSize: MainAxisSize.max,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const _DragHandle(),
                    Padding(
                      padding: const EdgeInsetsDirectional.fromSTEB(
                        AppSpacing.xl,
                        0,
                        AppSpacing.xl,
                        AppSpacing.md,
                      ),
                      child: Semantics(
                        header: true,
                        child: Text(
                          '関連タスクを紐付け',
                          style: AppTextStyles.headline.copyWith(
                            color: AppColors.textPrimary(context),
                          ),
                        ),
                      ),
                    ),
                    Container(height: 1, color: AppColors.divider(context)),
                    _KindChips(
                      selected: _kind,
                      onSelect: (k) => setState(() => _kind = k),
                    ),
                    Padding(
                      padding: const EdgeInsetsDirectional.fromSTEB(
                        AppSpacing.xl,
                        AppSpacing.md,
                        AppSpacing.xl,
                        AppSpacing.sm,
                      ),
                      child: SearchBox(
                        controller: _searchController,
                        hintText: '#番号 またはタイトル',
                        onChanged: (v) => setState(() => _query = v),
                        onClear: () => setState(() => _query = ''),
                      ),
                    ),
                    Expanded(
                      child: FutureBuilder<List<TaskItem>>(
                        future: _candidatesFuture,
                        builder: (context, snapshot) {
                          if (snapshot.hasError) {
                            return ErrorState(
                              onRetry: () => setState(() {
                                _candidatesFuture = _loadCandidates();
                              }),
                            );
                          }
                          if (!snapshot.hasData) {
                            return const LoadingIndicator();
                          }
                          final filtered = _filter(snapshot.data!);
                          if (filtered.isEmpty) {
                            return Center(
                              child: EmptyState(
                                icon: Icon(
                                  Icons.task_alt_rounded,
                                  size: 40,
                                  color: AppColors.textTertiary(context),
                                ),
                                title: snapshot.data!.isEmpty
                                    ? '紐付け可能なタスクがありません'
                                    : '該当する候補はありません',
                              ),
                            );
                          }
                          return ListView.builder(
                            padding: EdgeInsets.zero,
                            itemCount: filtered.length,
                            itemBuilder: (context, i) {
                              final t = filtered[i];
                              return _CandidateRow(
                                task: t,
                                onTap: () => _handleSelect(t.id),
                              );
                            },
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _DragHandle extends StatelessWidget {
  const _DragHandle();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Center(
        child: Container(
          width: 32,
          height: 4,
          decoration: BoxDecoration(
            color: AppColors.border(context),
            borderRadius: BorderRadius.circular(2),
          ),
        ),
      ),
    );
  }
}

class _KindChips extends StatelessWidget {
  const _KindChips({required this.selected, required this.onSelect});

  final RelationKind selected;
  final ValueChanged<RelationKind> onSelect;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsetsDirectional.fromSTEB(
        AppSpacing.xl,
        AppSpacing.md,
        AppSpacing.xl,
        0,
      ),
      child: Wrap(
        spacing: AppSpacing.xs,
        runSpacing: AppSpacing.xs,
        children: [
          for (final k in TaskMeta.relationKindOrder)
            CommonSelectPill(
              label: TaskMeta.relationLabel(k),
              color: taskRelationColor(context, k),
              selected: selected == k,
              onTap: () => onSelect(k),
            ),
        ],
      ),
    );
  }
}

class _CandidateRow extends StatelessWidget {
  const _CandidateRow({required this.task, required this.onTap});

  final TaskItem task;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: ConstrainedBox(
        // 大きい text scale でも 44px のタップ領域を維持。
        constraints: const BoxConstraints(minHeight: 44),
        child: Padding(
          padding: const EdgeInsetsDirectional.symmetric(
            horizontal: AppSpacing.xl,
            vertical: 10,
          ),
          child: Row(
            children: [
              TaskIdText(id: '#${task.seq}'),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  task.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: AppTextStyles.body2.copyWith(
                    color: AppColors.textPrimary(context),
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.xs + 2),
              StatusChip(status: task.status),
            ],
          ),
        ),
      ),
    );
  }
}
