import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../domain/entities/employee_skill.dart';
import '../providers/skills_providers.dart';

/// スキル編集画面
class SkillsEditScreen extends ConsumerStatefulWidget {
  const SkillsEditScreen({super.key});

  @override
  ConsumerState<SkillsEditScreen> createState() => _SkillsEditScreenState();
}

class _SkillsEditScreenState extends ConsumerState<SkillsEditScreen> {
  final _addController = TextEditingController();
  bool _isAdding = false;

  @override
  void dispose() {
    _addController.dispose();
    super.dispose();
  }

  Future<void> _addSkill([String? selectedName]) async {
    final name = (selectedName ?? _addController.text).trim();
    if (name.isEmpty) return;

    setState(() => _isAdding = true);
    try {
      await ref.read(skillsRepositoryProvider).addSkill(name);
      _addController.clear();
      ref.invalidate(mySkillsProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('エラー: $e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isAdding = false);
    }
  }

  Future<void> _deleteSkill(EmployeeSkill skill) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('スキルの削除'),
        content: Text('「${skill.name}」を削除しますか？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('キャンセル'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text('削除', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      await ref.read(skillsRepositoryProvider).deleteSkill(skill.id);
      ref.invalidate(mySkillsProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('エラー: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final skillsAsync = ref.watch(mySkillsProvider);
    final mastersAsync = ref.watch(skillMastersProvider);
    final theme = Theme.of(context);

    final masterNames = mastersAsync.valueOrNull?.map((m) => m.name).toList() ?? [];

    return Scaffold(
      appBar: AppBar(
        title: const Text('スキル・専門分野'),
      ),
      body: Column(
        children: [
          // 追加フォーム
          Container(
            padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
            child: Row(
              children: [
                Expanded(
                  child: Autocomplete<String>(
                    key: ValueKey(masterNames.length),
                    optionsBuilder: (textEditingValue) {
                      if (textEditingValue.text.isEmpty) return const [];
                      final query = textEditingValue.text.toLowerCase();
                      return masterNames
                          .where((name) => name.toLowerCase().contains(query));
                    },
                    onSelected: (name) => _addSkill(name),
                    fieldViewBuilder: (ctx, controller, focusNode, onSubmitted) {
                      _addController.text = controller.text;
                      controller.addListener(() {
                        _addController.text = controller.text;
                      });
                      return Container(
                        height: 40,
                        decoration: BoxDecoration(
                          color: theme.brightness == Brightness.dark
                              ? theme.colorScheme.surfaceContainerHighest
                              : const Color(0xFFEFEFEF),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: TextField(
                          controller: controller,
                          focusNode: focusNode,
                          style: AppTextStyles.bodySmall,
                          textInputAction: TextInputAction.done,
                          onSubmitted: (_) => _addSkill(),
                          decoration: InputDecoration(
                            hintText: 'スキルを検索・追加',
                            hintStyle: AppTextStyles.bodySmall.copyWith(
                              color: theme.colorScheme.onSurface
                                  .withValues(alpha: 0.4),
                            ),
                            prefixIcon: Icon(
                              Icons.search_rounded,
                              size: 20,
                              color: theme.colorScheme.onSurface
                                  .withValues(alpha: 0.4),
                            ),
                            prefixIconConstraints: const BoxConstraints(
                              minWidth: 40,
                            ),
                            border: InputBorder.none,
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 10,
                            ),
                            isDense: true,
                          ),
                        ),
                      );
                    },
                    optionsViewBuilder: (ctx, onSelected, options) {
                      return Align(
                        alignment: Alignment.topLeft,
                        child: Material(
                          elevation: 4,
                          borderRadius: BorderRadius.circular(12),
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(maxHeight: 200),
                            child: ListView.builder(
                              padding: EdgeInsets.zero,
                              shrinkWrap: true,
                              itemCount: options.length,
                              itemBuilder: (ctx2, index) {
                                final option = options.elementAt(index);
                                return InkWell(
                                  onTap: () => onSelected(option),
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 14, vertical: 10),
                                    child: Text(option,
                                        style: AppTextStyles.bodySmall),
                                  ),
                                );
                              },
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                SizedBox(
                  width: 40,
                  height: 40,
                  child: IconButton(
                    onPressed: _isAdding ? null : () => _addSkill(),
                    style: IconButton.styleFrom(
                      backgroundColor: AppColors.brandPrimary,
                      foregroundColor: Colors.white,
                    ),
                    icon: _isAdding
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child:
                                CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.add_rounded, size: 22),
                  ),
                ),
              ],
            ),
          ),

          // スキル一覧
          Expanded(
            child: skillsAsync.when(
              loading: () =>
                  const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('エラー: $e')),
              data: (skills) {
                if (skills.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.psychology_outlined,
                          size: 48,
                          color: theme.colorScheme.onSurface
                              .withValues(alpha: 0.25),
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          'スキルが登録されていません',
                          style: AppTextStyles.bodySmall.copyWith(
                            color: theme.colorScheme.onSurface
                                .withValues(alpha: 0.45),
                          ),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.screenHorizontal,
                  ),
                  itemCount: skills.length,
                  itemBuilder: (context, index) {
                    final skill = skills[index];
                    return _SkillTile(
                      skill: skill,
                      onDelete: () => _deleteSkill(skill),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class _SkillTile extends StatelessWidget {
  const _SkillTile({required this.skill, required this.onDelete});

  final EmployeeSkill skill;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: theme.brightness == Brightness.dark
            ? Border.all(
                color: theme.colorScheme.outline.withValues(alpha: 0.2),
                width: 0.5)
            : null,
        boxShadow: theme.brightness == Brightness.dark
            ? null
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 3,
                  offset: const Offset(0, 1),
                ),
              ],
      ),
      child: Row(
        children: [
          Icon(
            Icons.psychology_outlined,
            size: 20,
            color: AppColors.brandPrimary.withValues(alpha: 0.7),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(skill.name, style: AppTextStyles.bodySmall),
          ),
          GestureDetector(
            onTap: onDelete,
            child: Icon(
              Icons.close_rounded,
              size: 18,
              color: theme.colorScheme.onSurface.withValues(alpha: 0.35),
            ),
          ),
        ],
      ),
    );
  }
}
