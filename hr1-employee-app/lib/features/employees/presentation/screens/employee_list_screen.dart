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
    final selectedPosition = useState<String?>(null);
    final employeesAsync = ref.watch(employeeListProvider);
    final departmentsAsync = ref.watch(departmentListProvider);
    final positionsAsync = ref.watch(positionListProvider);

    return CommonScaffold(
      appBar: AppBar(title: const Text('社員名簿')),
      body: employeesAsync.when(
        data: (employees) => _Body(
          employees: employees,
          departments: departmentsAsync.valueOrNull ?? [],
          positions: positionsAsync.valueOrNull ?? [],
          query: query,
          selectedDepartment: selectedDepartment.value,
          selectedPosition: selectedPosition.value,
          onDepartmentSelected: (dept) {
            selectedDepartment.value = selectedDepartment.value == dept
                ? null
                : dept;
          },
          onPositionSelected: (pos) {
            selectedPosition.value = selectedPosition.value == pos ? null : pos;
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
    required this.positions,
    required this.query,
    required this.selectedDepartment,
    required this.selectedPosition,
    required this.onDepartmentSelected,
    required this.onPositionSelected,
    required this.searchController,
  });

  final List<EmployeeContact> employees;
  final List<String> departments;
  final List<String> positions;
  final String query;
  final String? selectedDepartment;
  final String? selectedPosition;
  final ValueChanged<String> onDepartmentSelected;
  final ValueChanged<String> onPositionSelected;
  final TextEditingController searchController;

  @override
  Widget build(BuildContext context) {
    final filtered = employees.where((e) {
      if (selectedDepartment != null && e.department != selectedDepartment) {
        return false;
      }
      if (selectedPosition != null && e.position != selectedPosition) {
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
        Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.screenHorizontal,
          ),
          child: Row(
            children: [
              if (departments.isNotEmpty)
                _FilterChipButton(
                  label: '部署',
                  selectedValue: selectedDepartment,
                  options: departments,
                  onSelected: onDepartmentSelected,
                ),
              if (departments.isNotEmpty && positions.isNotEmpty)
                const SizedBox(width: AppSpacing.sm),
              if (positions.isNotEmpty)
                _FilterChipButton(
                  label: '役職',
                  selectedValue: selectedPosition,
                  options: positions,
                  onSelected: onPositionSelected,
                ),
            ],
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        Expanded(
          child: filtered.isEmpty
              ? EmptyState(
                  icon: Icon(
                    Icons.people_outline_rounded,
                    size: 48,
                    color: AppColors.textTertiary(context),
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

class _FilterChipButton extends StatelessWidget {
  const _FilterChipButton({
    required this.label,
    required this.selectedValue,
    required this.options,
    required this.onSelected,
  });

  final String label;
  final String? selectedValue;
  final List<String> options;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    final hasSelection = selectedValue != null;

    return GestureDetector(
      onTap: () => _showModal(context),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: hasSelection
              ? AppColors.brand.withValues(alpha: 0.08)
              : AppColors.surface(context),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: hasSelection ? AppColors.brand : AppColors.border(context),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              selectedValue ?? label,
              style: AppTextStyles.caption2.copyWith(
                color: hasSelection
                    ? AppColors.brand
                    : AppColors.textSecondary(context),
                fontWeight: hasSelection ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
            const SizedBox(width: 2),
            Icon(
              Icons.keyboard_arrow_down_rounded,
              size: 16,
              color: hasSelection
                  ? AppColors.brand
                  : AppColors.textSecondary(context),
            ),
          ],
        ),
      ),
    );
  }

  void _showModal(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  AppSpacing.screenHorizontal,
                  AppSpacing.lg,
                  AppSpacing.screenHorizontal,
                  AppSpacing.sm,
                ),
                child: Row(
                  children: [
                    Text(
                      '$labelを選択',
                      style: AppTextStyles.headline.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const Spacer(),
                    if (selectedValue != null)
                      GestureDetector(
                        onTap: () {
                          onSelected(selectedValue!);
                          Navigator.pop(context);
                        },
                        child: Text(
                          'クリア',
                          style: AppTextStyles.caption1.copyWith(
                            color: AppColors.brand,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const Divider(height: 1),
              ConstrainedBox(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(context).size.height * 0.5,
                ),
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: options.length,
                  itemBuilder: (context, index) {
                    final option = options[index];
                    final isSelected = option == selectedValue;
                    return ListTile(
                      title: Text(
                        option,
                        style: AppTextStyles.caption1.copyWith(
                          fontWeight: isSelected
                              ? FontWeight.w600
                              : FontWeight.w400,
                          color: isSelected
                              ? AppColors.brand
                              : AppColors.textPrimary(context),
                        ),
                      ),
                      trailing: isSelected
                          ? const Icon(
                              Icons.check_rounded,
                              color: AppColors.brand,
                              size: 20,
                            )
                          : null,
                      onTap: () {
                        onSelected(option);
                        Navigator.pop(context);
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _EmployeeCard extends StatelessWidget {
  const _EmployeeCard({required this.employee});

  final EmployeeContact employee;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push(AppRoutes.employeeDetail, extra: employee),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
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
                      color: AppColors.textSecondary(context),
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
              color: AppColors.textTertiary(context),
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
