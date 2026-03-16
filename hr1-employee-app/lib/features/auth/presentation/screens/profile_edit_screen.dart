import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_spacing.dart';
import '../../../../core/constants/app_text_styles.dart';
import '../../../../core/router/app_router.dart';
import '../../../../shared/widgets/user_avatar.dart';
import '../providers/auth_providers.dart';

/// プロフィール編集画面 — Teams 設定画面スタイル
class ProfileEditScreen extends ConsumerStatefulWidget {
  const ProfileEditScreen({super.key});

  @override
  ConsumerState<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

class _ProfileEditScreenState extends ConsumerState<ProfileEditScreen> {
  @override
  Widget build(BuildContext context) {
    final user = ref.watch(appUserProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('プロフィール編集'),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.xl),
        children: [
          // アバター（タップで変更）
          Center(
            child: GestureDetector(
              onTap: () {
                // TODO: アバター画像の変更
              },
              child: Stack(
                children: [
                  UserAvatar(
                    initial: user?.displayName?.substring(0, 1) ?? '?',
                    color: AppColors.brandPrimary,
                    size: 96,
                    imageUrl: user?.avatarUrl,
                  ),
                  Positioned(
                    right: 0,
                    bottom: 0,
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: AppColors.brandPrimary,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: theme.scaffoldBackgroundColor,
                          width: 3,
                        ),
                      ),
                      child: const Icon(Icons.camera_alt_rounded, size: 16, color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: AppSpacing.xxl),

          // 基本情報セクション
          _SectionHeader(title: '基本情報'),
          _GroupedSection(
            children: [
              _EditableRow(
                icon: Icons.person_outline_rounded,
                label: '表示名',
                value: user?.displayName ?? '未設定',
                onTap: () => _showEditDialog(
                  title: '表示名',
                  initialValue: user?.displayName ?? '',
                  onSave: (value) {
                    // TODO: 表示名の更新
                  },
                ),
              ),
              _EditableRow(
                icon: Icons.email_outlined,
                label: 'メールアドレス',
                value: user?.email ?? '未設定',
              ),
              _EditableRow(
                icon: Icons.business_rounded,
                label: '部署',
                value: user?.department ?? '未設定',
                onTap: () => _showEditDialog(
                  title: '部署',
                  initialValue: user?.department ?? '',
                  onSave: (value) {
                    // TODO: 部署の更新
                  },
                ),
              ),
              _EditableRow(
                icon: Icons.badge_outlined,
                label: '役職',
                value: user?.position ?? '未設定',
                onTap: () => _showEditDialog(
                  title: '役職',
                  initialValue: user?.position ?? '',
                  onSave: (value) {
                    // TODO: 役職の更新
                  },
                ),
              ),
            ],
          ),

          const SizedBox(height: AppSpacing.xxl),

          // スキルセクション
          _SectionHeader(title: 'スキル'),
          _GroupedSection(
            children: [
              _EditableRow(
                icon: Icons.psychology_outlined,
                label: 'スキル・専門分野',
                value: '編集する',
                onTap: () {
                  context.push(AppRoutes.skillsEdit);
                },
              ),
              _EditableRow(
                icon: Icons.workspace_premium_outlined,
                label: '資格・認定',
                value: '編集する',
                onTap: () {
                  context.push(AppRoutes.certificationsEdit);
                },
              ),
            ],
          ),

          const SizedBox(height: AppSpacing.xxl),

          // 経歴セクション
          _SectionHeader(title: '経歴'),
          _GroupedSection(
            children: [
              _EditableRow(
                icon: Icons.work_outline_rounded,
                label: 'プロジェクト経歴',
                value: '編集する',
                onTap: () {
                  // TODO: プロジェクト経歴編集画面
                },
              ),
              _EditableRow(
                icon: Icons.swap_horiz_rounded,
                label: '異動歴',
                value: '編集する',
                onTap: () {
                  // TODO: 異動歴編集画面
                },
              ),
            ],
          ),

          const SizedBox(height: AppSpacing.xxxl),
        ],
      ),
    );
  }

  void _showEditDialog({
    required String title,
    required String initialValue,
    required ValueChanged<String> onSave,
  }) {
    final controller = TextEditingController(text: initialValue);
    final theme = Theme.of(context);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: controller,
          autofocus: true,
          style: AppTextStyles.bodySmall,
          decoration: InputDecoration(
            hintText: '$titleを入力',
            hintStyle: AppTextStyles.bodySmall.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
            ),
            filled: true,
            fillColor: theme.brightness == Brightness.dark
                ? theme.colorScheme.surfaceContainerHighest
                : const Color(0xFFEFEFEF),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide.none,
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('キャンセル'),
          ),
          TextButton(
            onPressed: () {
              onSave(controller.text.trim());
              Navigator.pop(ctx);
            },
            child: Text(
              '保存',
              style: TextStyle(
                color: AppColors.brandPrimary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// セクションヘッダー
class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal + 4,
        0,
        AppSpacing.screenHorizontal,
        AppSpacing.sm,
      ),
      child: Text(
        title,
        style: AppTextStyles.caption.copyWith(
          color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
          fontWeight: FontWeight.w600,
          letterSpacing: 0.3,
        ),
      ),
    );
  }
}

/// iOS スタイルのグループ化セクション
class _GroupedSection extends StatelessWidget {
  const _GroupedSection({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: AppSpacing.screenHorizontal),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: isDark
            ? Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.2), width: 0.5)
            : null,
        boxShadow: isDark
            ? null
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 3,
                  offset: const Offset(0, 1),
                ),
              ],
      ),
      child: Column(
        children: [
          for (var i = 0; i < children.length; i++) ...[
            children[i],
            if (i < children.length - 1)
              Divider(height: 0.5, indent: 52, color: theme.colorScheme.outlineVariant),
          ],
        ],
      ),
    );
  }
}

/// 編集可能な行
class _EditableRow extends StatelessWidget {
  const _EditableRow({
    required this.icon,
    required this.label,
    required this.value,
    this.onTap,
  });

  final IconData icon;
  final String label;
  final String value;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isEditable = onTap != null;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
        child: Row(
          children: [
            Icon(icon, size: 22, color: theme.colorScheme.onSurface.withValues(alpha: 0.55)),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: AppTextStyles.caption.copyWith(
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    value,
                    style: AppTextStyles.bodySmall.copyWith(
                      color: isEditable && value == '編集する'
                          ? AppColors.brandPrimary
                          : theme.colorScheme.onSurface,
                    ),
                  ),
                ],
              ),
            ),
            if (isEditable)
              Icon(
                Icons.chevron_right_rounded,
                size: 20,
                color: theme.colorScheme.onSurface.withValues(alpha: 0.3),
              ),
          ],
        ),
      ),
    );
  }
}
