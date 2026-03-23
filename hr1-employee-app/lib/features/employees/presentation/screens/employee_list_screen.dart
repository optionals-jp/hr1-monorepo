import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';
import 'package:hr1_employee_app/features/employees/domain/entities/employee_contact.dart';
import 'package:hr1_employee_app/features/employees/presentation/providers/employee_list_providers.dart';

class EmployeeListScreen extends HookConsumerWidget {
  const EmployeeListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final searchController = useTextEditingController();
    final query = useValueListenable(searchController).text.trim();
    final selectedDepartment = useState<String?>(null);
    final employeesAsync = ref.watch(employeeListProvider);
    final departmentsAsync = ref.watch(departmentListProvider);

    return CommonScaffold(
      appBar: AppBar(title: const Text('社員名簿')),
      body: employeesAsync.when(
        data: (employees) => _Body(
          employees: employees,
          departments: departmentsAsync.valueOrNull ?? [],
          query: query,
          selectedDepartment: selectedDepartment.value,
          onDepartmentSelected: (dept) {
            selectedDepartment.value = selectedDepartment.value == dept
                ? null
                : dept;
          },
          searchController: searchController,
        ),
        loading: () => const LoadingIndicator(),
        error: (e, _) =>
            ErrorState(onRetry: () => ref.invalidate(employeeListProvider)),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({
    required this.employees,
    required this.departments,
    required this.query,
    required this.selectedDepartment,
    required this.onDepartmentSelected,
    required this.searchController,
  });

  final List<EmployeeContact> employees;
  final List<String> departments;
  final String query;
  final String? selectedDepartment;
  final ValueChanged<String> onDepartmentSelected;
  final TextEditingController searchController;

  @override
  Widget build(BuildContext context) {
    final filtered = employees.where((e) {
      if (selectedDepartment != null && e.department != selectedDepartment) {
        return false;
      }
      if (query.isNotEmpty) {
        final q = query.toLowerCase();
        return e.name.toLowerCase().contains(q) ||
            e.department.toLowerCase().contains(q) ||
            e.position.toLowerCase().contains(q);
      }
      return true;
    }).toList();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.screenHorizontal,
            AppSpacing.sm,
            AppSpacing.screenHorizontal,
            AppSpacing.sm,
          ),
          child: SearchBox(
            controller: searchController,
            hintText: '名前・部署・役職で検索',
          ),
        ),
        if (departments.isNotEmpty)
          SizedBox(
            height: 40,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.screenHorizontal,
              ),
              itemCount: departments.length,
              separatorBuilder: (_, __) => const SizedBox(width: AppSpacing.sm),
              itemBuilder: (context, index) {
                final dept = departments[index];
                final isSelected = dept == selectedDepartment;
                return FilterChip(
                  selected: isSelected,
                  label: Text(dept),
                  labelStyle: AppTextStyles.caption2.copyWith(
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                  ),
                  onSelected: (_) => onDepartmentSelected(dept),
                  showCheckmark: false,
                );
              },
            ),
          ),
        const SizedBox(height: AppSpacing.sm),
        Expanded(
          child: filtered.isEmpty
              ? EmptyState(
                  icon: Icon(
                    Icons.people_outline_rounded,
                    size: 48,
                    color: AppColors.textTertiary(Theme.of(context).brightness),
                  ),
                  title: '社員が見つかりません',
                  description: '検索条件を変更してください',
                )
              : ListView.separated(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.screenHorizontal,
                    vertical: AppSpacing.sm,
                  ),
                  itemCount: filtered.length,
                  separatorBuilder: (_, __) =>
                      const SizedBox(height: AppSpacing.sm),
                  itemBuilder: (context, index) {
                    return _EmployeeCard(employee: filtered[index]);
                  },
                ),
        ),
      ],
    );
  }
}

class _EmployeeCard extends StatelessWidget {
  const _EmployeeCard({required this.employee});

  final EmployeeContact employee;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GestureDetector(
      onTap: () => context.push(AppRoutes.employeeDetail, extra: employee),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(12),
          border: theme.brightness == Brightness.dark
              ? Border.all(
                  color: AppColors.border(theme.brightness),
                  width: 0.5,
                )
              : null,
          boxShadow: theme.brightness == Brightness.dark
              ? null
              : AppShadows.shadow4,
        ),
        child: Row(
          children: [
            UserAvatar(
              initial: employee.initial,
              color: employee.color,
              size: 44,
              imageUrl: employee.avatarUrl,
              presence: _toPresence(employee.workStatus),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    employee.name,
                    style: AppTextStyles.caption1.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    [
                      employee.department,
                      employee.position,
                    ].where((s) => s.isNotEmpty).join(' / '),
                    style: AppTextStyles.caption2.copyWith(
                      color: AppColors.textSecondary(theme.brightness),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right_rounded,
              size: 20,
              color: AppColors.textTertiary(theme.brightness),
            ),
          ],
        ),
      ),
    );
  }
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
