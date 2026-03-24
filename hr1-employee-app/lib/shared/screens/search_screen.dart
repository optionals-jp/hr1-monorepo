import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/features/employees/domain/entities/employee_contact.dart';
import 'package:hr1_employee_app/features/employees/presentation/providers/employee_providers.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';

class SearchScreen extends HookConsumerWidget {
  const SearchScreen({super.key});

  static void show(BuildContext context) {
    context.push(AppRoutes.search);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final controller = useTextEditingController();
    final focusNode = useFocusNode();
    final recentSearches = useRef(<String>['有給休暇', '勤怠修正', '社内規定']);
    final searchResults = useState<List<EmployeeContact>>([]);
    final isSearching = useState(false);

    useEffect(() {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        focusNode.requestFocus();
      });
      return null;
    }, []);

    Future<void> onSearch(String query) async {
      if (query.trim().isEmpty) return;
      isSearching.value = true;
      try {
        final repo = ref.read(employeeRepositoryProvider);
        final contacts = await repo.searchEmployees(query);
        searchResults.value = contacts;
        isSearching.value = false;
      } catch (e) {
        isSearching.value = false;
      }
    }

    Widget buildSearchResults() {
      return ListView.separated(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
        itemCount: searchResults.value.length,
        separatorBuilder: (_, __) => Divider(
          height: 1,
          indent: AppSpacing.screenHorizontal + 48 + AppSpacing.md,
          color: AppColors.divider(context),
        ),
        itemBuilder: (context, index) {
          final contact = searchResults.value[index];
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
                              color: AppColors.textSecondary(context),
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

    Widget buildAvatarCarousel() {
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
                color: AppColors.textSecondary(context),
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
                            color: AppColors.textPrimary(context),
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
                            color: AppColors.textSecondary(context),
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

    Widget buildRecentSearches() {
      if (recentSearches.value.isEmpty) return const SizedBox.shrink();

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
                color: AppColors.textSecondary(context),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          ...recentSearches.value.map(
            (query) => InkWell(
              onTap: () {
                controller.text = query;
                onSearch(query);
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
                      color: AppColors.textSecondary(context),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(child: Text(query, style: AppTextStyles.caption1)),
                    Icon(
                      Icons.north_west_rounded,
                      size: 16,
                      color: AppColors.textTertiary(context),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      );
    }

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
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
                      controller: controller,
                      focusNode: focusNode,
                      onSubmitted: onSearch,
                      onClear: () => searchResults.value = [],
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
                          color: AppColors.brand,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            Expanded(
              child: isSearching.value
                  ? const Center(child: LoadingIndicator())
                  : searchResults.value.isNotEmpty
                  ? buildSearchResults()
                  : ListView(
                      padding: EdgeInsets.zero,
                      children: [
                        buildAvatarCarousel(),
                        buildRecentSearches(),
                      ],
                    ),
            ),
          ],
        ),
      ),
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
}
