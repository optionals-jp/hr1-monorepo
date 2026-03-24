import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';
import 'package:hr1_employee_app/features/skills/domain/entities/employee_skill.dart';
import 'package:hr1_employee_app/features/skills/presentation/controllers/skills_controller.dart';
import 'package:hr1_employee_app/features/skills/presentation/providers/skills_providers.dart';

/// スキル編集画面
class SkillsEditScreen extends ConsumerWidget {
  const SkillsEditScreen({super.key});

  Future<void> _addSkill(
    BuildContext context,
    WidgetRef ref,
    String name,
  ) async {
    if (name.isEmpty) return;

    ref.read(skillIsAddingProvider.notifier).state = true;
    try {
      await ref.read(skillsControllerProvider.notifier).addSkill(name);
    } catch (e) {
      if (context.mounted) CommonSnackBar.error(context, 'エラー: $e');
    } finally {
      ref.read(skillIsAddingProvider.notifier).state = false;
    }
  }

  Future<void> _deleteSkill(
    BuildContext context,
    WidgetRef ref,
    EmployeeSkill skill,
  ) async {
    final confirmed = await CommonDialog.confirm(
      context: context,
      title: 'スキルの削除',
      message: '「${skill.name}」を削除しますか？',
      confirmLabel: '削除',
      isDestructive: true,
    );
    if (!confirmed) return;

    try {
      await ref.read(skillsControllerProvider.notifier).deleteSkill(skill.id);
    } catch (e) {
      if (context.mounted) CommonSnackBar.error(context, 'エラー: $e');
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final skillsAsync = ref.watch(skillsControllerProvider);
    final mastersAsync = ref.watch(skillMastersProvider);
    final isAdding = ref.watch(skillIsAddingProvider);
    final masterNames =
        mastersAsync.valueOrNull?.map((m) => m.name).toList() ?? [];

    return CommonScaffold(
      appBar: AppBar(title: const Text('スキル・専門分野')),
      body: Column(
        children: [
          MasterSearchBar(
            masterNames: masterNames,
            onAdd: (name) => _addSkill(context, ref, name),
            hintText: 'スキルを検索・追加',
            isAdding: isAdding,
          ),
          Expanded(
            child: skillsAsync.when(
              loading: () => const LoadingIndicator(),
              error: (e, _) => const ErrorState(),
              data: (skills) {
                if (skills.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.psychology_outlined,
                          size: 48,
                          color: AppColors.textTertiary(context),
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          'スキルが登録されていません',
                          style: AppTextStyles.caption1.copyWith(
                            color: AppColors.textSecondary(context),
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
                      onDelete: () => _deleteSkill(context, ref, skill),
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
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.surface(context),
        borderRadius: BorderRadius.circular(12),
        border: AppColors.isDark(context)
            ? Border.all(color: AppColors.border(context), width: 0.5)
            : null,
        boxShadow: AppShadows.of4(context),
      ),
      child: Row(
        children: [
          Icon(
            Icons.psychology_outlined,
            size: 20,
            color: AppColors.brand.withValues(alpha: 0.7),
          ),
          const SizedBox(width: 12),
          Expanded(child: Text(skill.name, style: AppTextStyles.caption1)),
          GestureDetector(
            onTap: onDelete,
            child: Icon(
              Icons.close_rounded,
              size: 18,
              color: AppColors.textTertiary(context),
            ),
          ),
        ],
      ),
    );
  }
}
