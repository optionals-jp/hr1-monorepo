import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/features/employees/domain/entities/employee_contact.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';

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
  final _recentSearches = <String>['有給休暇', '勤怠修正', '社内規定'];
  List<EmployeeContact> _searchResults = [];
  bool _isSearching = false;

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
                        style: AppTextStyles.caption1.copyWith(
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
              child: _isSearching
                  ? const Center(child: CircularProgressIndicator())
                  : _searchResults.isNotEmpty
                  ? _buildSearchResults(theme)
                  : ListView(
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

  Widget _buildSearchResults(ThemeData theme) {
    return ListView.separated(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
      itemCount: _searchResults.length,
      separatorBuilder: (_, __) => Divider(
        height: 1,
        indent: AppSpacing.screenHorizontal + 48 + AppSpacing.md,
        color: theme.dividerColor,
      ),
      itemBuilder: (context, index) {
        final contact = _searchResults[index];
        return InkWell(
          onTap: () {
            context.pushReplacement(AppRoutes.employeeDetail, extra: contact);
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.screenHorizontal,
              vertical: AppSpacing.sm,
            ),
            child: Row(
              children: [
                UserAvatar(
                  initial: contact.initial,
                  color: contact.color,
                  size: 48,
                  imageUrl: contact.avatarUrl,
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        contact.name,
                        style: AppTextStyles.caption1.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (contact.department.isNotEmpty ||
                          contact.position.isNotEmpty)
                        Text(
                          [
                            contact.department,
                            contact.position,
                          ].where((s) => s.isNotEmpty).join(' / '),
                          style: AppTextStyles.caption2.copyWith(
                            color: AppColors.textSecondary(theme.brightness),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  /// Fluent 2 iOS Avatar Carousel — よく連絡する人の横スクロール
  Widget _buildAvatarCarousel(ThemeData theme) {
    final contacts = [
      const EmployeeContact(
        id: '1',
        name: '田中 太郎',
        initial: '田',
        position: '部長',
        department: '営業部',
        color: Color(0xFF0F6CBD),
        email: 'tanaka@example.com',
        workStatus: WorkStatus.working,
      ),
      const EmployeeContact(
        id: '2',
        name: '佐藤 花子',
        initial: '佐',
        position: '課長',
        department: '人事部',
        color: Color(0xFF0E7A0B),
        email: 'sato@example.com',
        workStatus: WorkStatus.onBreak,
      ),
      const EmployeeContact(
        id: '3',
        name: '鈴木 一郎',
        initial: '鈴',
        position: '主任',
        department: '開発部',
        color: AppColors.purple,
        email: 'suzuki@example.com',
        workStatus: WorkStatus.working,
      ),
      const EmployeeContact(
        id: '4',
        name: '高橋 美咲',
        initial: '高',
        position: '係長',
        department: '総務部',
        color: Color(0xFFBC4B09),
        email: 'takahashi@example.com',
      ),
      const EmployeeContact(
        id: '5',
        name: '伊藤 健太',
        initial: '伊',
        position: '主任',
        department: '企画部',
        color: Color(0xFF115EA3),
        email: 'ito@example.com',
        workStatus: WorkStatus.working,
      ),
      const EmployeeContact(
        id: '6',
        name: '渡辺 真理',
        initial: '渡',
        position: '課長',
        department: '経理部',
        color: Color(0xFFB10E1C),
        email: 'watanabe@example.com',
      ),
      const EmployeeContact(
        id: '7',
        name: '山本 翔太',
        initial: '山',
        position: '部長',
        department: '開発部',
        color: Color(0xFF0E7A0B),
        email: 'yamamoto@example.com',
        workStatus: WorkStatus.onBreak,
      ),
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
            style: AppTextStyles.caption2.copyWith(
              color: AppColors.textSecondary(theme.brightness),
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
            separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.lg),
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
                        style: AppTextStyles.caption1.copyWith(
                          color: theme.colorScheme.onSurface,
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        textAlign: TextAlign.center,
                      ),
                      Text(
                        '${contact.department} ${contact.position}',
                        style: AppTextStyles.caption2.copyWith(
                          fontWeight: FontWeight.w500,
                          color: AppColors.textSecondary(theme.brightness),
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
            style: AppTextStyles.caption2.copyWith(
              color: AppColors.textSecondary(theme.brightness),
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        ..._recentSearches.map(
          (query) => InkWell(
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
                    color: AppColors.textSecondary(theme.brightness),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(child: Text(query, style: AppTextStyles.caption1)),
                  Icon(
                    Icons.north_west_rounded,
                    size: 16,
                    color: AppColors.textTertiary(theme.brightness),
                  ),
                ],
              ),
            ),
          ),
        ),
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

  static const _avatarColors = [
    Color(0xFF0F6CBD),
    Color(0xFF0E7A0B),
    Color(0xFFBC4B09),
    Color(0xFF115EA3),
    Color(0xFFB10E1C),
  ];

  void _onSearch(String query) async {
    if (query.trim().isEmpty) return;
    setState(() => _isSearching = true);
    try {
      final client = Supabase.instance.client;
      final userId = client.auth.currentUser?.id;
      if (userId == null) return;
      final orgData = await client
          .from('user_organizations')
          .select('organization_id')
          .eq('user_id', userId)
          .limit(1)
          .single();
      final orgId = orgData['organization_id'] as String;

      final results = await client
          .from('user_organizations')
          .select(
            'user_id, profiles(id, display_name, email, department, position, avatar_url)',
          )
          .eq('organization_id', orgId)
          .or(
            'profiles.display_name.ilike.%$query%,profiles.department.ilike.%$query%,profiles.position.ilike.%$query%',
          );

      final contacts = (results as List)
          .where((r) => r['profiles'] != null)
          .toList()
          .asMap()
          .entries
          .map((entry) {
            final p = entry.value['profiles'];
            final name =
                p['display_name'] as String? ?? p['email'] as String? ?? '';
            return EmployeeContact(
              id: p['id'] as String,
              name: name,
              initial: name.isNotEmpty ? name[0] : '?',
              position: p['position'] as String? ?? '',
              department: p['department'] as String? ?? '',
              color: _avatarColors[entry.key % _avatarColors.length],
              email: p['email'] as String?,
              avatarUrl: p['avatar_url'] as String?,
            );
          })
          .toList();

      setState(() {
        _searchResults = contacts;
        _isSearching = false;
      });
    } catch (e) {
      setState(() => _isSearching = false);
    }
  }
}
