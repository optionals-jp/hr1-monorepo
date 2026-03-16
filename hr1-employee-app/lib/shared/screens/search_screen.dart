import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_spacing.dart';
import '../../core/constants/app_text_styles.dart';
import '../../core/router/app_router.dart';
import '../../features/employees/domain/entities/employee_contact.dart';
import '../widgets/search_box.dart';
import '../widgets/user_avatar.dart';

/// 全画面検索画面 — Teams / Outlook モバイルスタイル
class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  /// GoRouter 経由で検索画面を表示
  static void show(BuildContext context) {
    context.push(AppRoutes.search);
  }

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  final _recentSearches = <String>[
    '有給休暇',
    '勤怠修正',
    '社内規定',
  ];

  @override
  void initState() {
    super.initState();
    // 画面表示後にキーボードを自動表示
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _focusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // 検索バー + キャンセルボタン
            Padding(
              padding: const EdgeInsets.fromLTRB(
                AppSpacing.screenHorizontal,
                AppSpacing.sm,
                AppSpacing.screenHorizontal,
                AppSpacing.sm,
              ),
              child: Row(
                children: [
                  Expanded(
                    child: SearchBox(
                      controller: _controller,
                      focusNode: _focusNode,
                      onSubmitted: _onSearch,
                      onClear: () => setState(() {}),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  GestureDetector(
                    onTap: () => Navigator.of(context).pop(),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.xs,
                        vertical: AppSpacing.sm,
                      ),
                      child: Text(
                        'キャンセル',
                        style: AppTextStyles.regular12.copyWith(
                          color: AppColors.brandPrimary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // コンテンツ
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  _buildAvatarCarousel(theme),
                  _buildRecentSearches(theme),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Fluent 2 iOS Avatar Carousel — よく連絡する人の横スクロール
  Widget _buildAvatarCarousel(ThemeData theme) {
    final contacts = [
      const EmployeeContact(id: '1', name: '田中 太郎', initial: '田', position: '部長', department: '営業部', color: Color(0xFF0F6CBD), email: 'tanaka@example.com', workStatus: WorkStatus.working),
      const EmployeeContact(id: '2', name: '佐藤 花子', initial: '佐', position: '課長', department: '人事部', color: Color(0xFF0E7A0B), email: 'sato@example.com', workStatus: WorkStatus.onBreak),
      const EmployeeContact(id: '3', name: '鈴木 一郎', initial: '鈴', position: '主任', department: '開発部', color: Color(0xFF8764B8), email: 'suzuki@example.com', workStatus: WorkStatus.working),
      const EmployeeContact(id: '4', name: '高橋 美咲', initial: '高', position: '係長', department: '総務部', color: Color(0xFFBC4B09), email: 'takahashi@example.com'),
      const EmployeeContact(id: '5', name: '伊藤 健太', initial: '伊', position: '主任', department: '企画部', color: Color(0xFF115EA3), email: 'ito@example.com', workStatus: WorkStatus.working),
      const EmployeeContact(id: '6', name: '渡辺 真理', initial: '渡', position: '課長', department: '経理部', color: Color(0xFFB10E1C), email: 'watanabe@example.com'),
      const EmployeeContact(id: '7', name: '山本 翔太', initial: '山', position: '部長', department: '開発部', color: Color(0xFF0E7A0B), email: 'yamamoto@example.com', workStatus: WorkStatus.onBreak),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.screenHorizontal,
            AppSpacing.lg,
            AppSpacing.screenHorizontal,
            AppSpacing.sm,
          ),
          child: Text(
            'よく連絡する人',
            style: AppTextStyles.regular11.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        SizedBox(
          height: 120,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.screenHorizontal,
            ),
            itemCount: contacts.length,
            separatorBuilder: (_, __) =>
                const SizedBox(width: AppSpacing.lg),
            itemBuilder: (context, index) {
              final contact = contacts[index];
              return GestureDetector(
                onTap: () {
                  context.pushReplacement(
                    AppRoutes.employeeDetail,
                    extra: contact,
                  );
                },
                child: SizedBox(
                  width: 80,
                  child: Column(
                    children: [
                      UserAvatar(
                        initial: contact.initial,
                        color: contact.color,
                        size: 72,
                        presence: _toPresence(contact.workStatus),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        contact.name.split(' ').first,
                        style: AppTextStyles.medium12.copyWith(
                          color: theme.colorScheme.onSurface,
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                      ),
                      Text(
                        '${contact.department} ${contact.position}',
                        style: AppTextStyles.medium12.copyWith(
                          color: theme.colorScheme.onSurface
                              .withValues(alpha: 0.5),
                          fontSize: 10,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildRecentSearches(ThemeData theme) {
    if (_recentSearches.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.screenHorizontal,
            AppSpacing.md,
            AppSpacing.screenHorizontal,
            AppSpacing.sm,
          ),
          child: Text(
            '最近の検索',
            style: AppTextStyles.regular11.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        ..._recentSearches.map((query) => InkWell(
              onTap: () {
                _controller.text = query;
                _onSearch(query);
              },
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.screenHorizontal,
                  vertical: 12,
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.history_rounded,
                      size: 20,
                      color: theme.colorScheme.onSurface
                          .withValues(alpha: 0.4),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Text(query, style: AppTextStyles.regular12),
                    ),
                    Icon(
                      Icons.north_west_rounded,
                      size: 16,
                      color: theme.colorScheme.onSurface
                          .withValues(alpha: 0.3),
                    ),
                  ],
                ),
              ),
            )),
      ],
    );
  }

  PresenceStatus _toPresence(WorkStatus status) {
    switch (status) {
      case WorkStatus.working:
        return PresenceStatus.available;
      case WorkStatus.onBreak:
        return PresenceStatus.away;
      case WorkStatus.offline:
        return PresenceStatus.offline;
    }
  }

  void _onSearch(String query) {
    if (query.trim().isEmpty) return;
    // TODO: 検索処理を実装
  }
}
