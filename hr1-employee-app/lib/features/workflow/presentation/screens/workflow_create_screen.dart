import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/features/workflow/domain/entities/workflow_request.dart';
import 'package:hr1_employee_app/features/workflow/presentation/controllers/workflow_controller.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';
import 'package:intl/intl.dart';

class WorkflowCreateScreen extends HookConsumerWidget {
  const WorkflowCreateScreen({super.key, required this.type});

  final WorkflowRequestType type;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final formKey = useMemoized(GlobalKey<FormState>.new);
    final reasonController = useTextEditingController();

    final leaveType = useState(LeaveType.paidLeave);
    final startDate = useState<DateTime?>(null);
    final endDate = useState<DateTime?>(null);

    final overtimeDate = useState<DateTime?>(null);
    final estimatedHoursController = useTextEditingController();
    final taskDescriptionController = useTextEditingController();

    final destinationController = useTextEditingController();
    final purposeController = useTextEditingController();

    final expenseCategory = useState('交通費');
    final amountController = useTextEditingController();
    final descriptionController = useTextEditingController();

    final dateFormat = useMemoized(() => DateFormat('yyyy-MM-dd'));

    final isSubmitting = ref.watch(workflowControllerProvider);

    Future<void> pickDate({
      required DateTime? current,
      required ValueChanged<DateTime> onPicked,
    }) async {
      final now = DateTime.now();
      final picked = await showDatePicker(
        context: context,
        initialDate: current ?? now,
        firstDate: now.subtract(const Duration(days: 365)),
        lastDate: now.add(const Duration(days: 365)),
      );
      if (picked != null) {
        onPicked(picked);
      }
    }

    Future<void> submit() async {
      if (!formKey.currentState!.validate()) return;

      final success = await ref
          .read(workflowControllerProvider.notifier)
          .submit(
            type: type,
            reason: reasonController.text,
            leaveType: leaveType.value,
            startDate: startDate.value,
            endDate: endDate.value,
            overtimeDate: overtimeDate.value,
            estimatedHours: estimatedHoursController.text,
            taskDescription: taskDescriptionController.text,
            destination: destinationController.text,
            purpose: purposeController.text,
            expenseCategory: expenseCategory.value,
            amount: amountController.text,
            description: descriptionController.text,
          );

      if (!context.mounted) return;
      if (success) {
        CommonSnackBar.show(context, '申請を送信しました');
        Navigator.pop(context);
      } else {
        CommonSnackBar.error(context, '申請の送信に失敗しました');
      }
    }

    List<Widget> buildPaidLeaveFields() {
      return [
        Text(
          '休暇種別',
          style: AppTextStyles.body2.copyWith(
            color: AppColors.textSecondary(context),
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        DropdownButtonFormField<LeaveType>(
          initialValue: leaveType.value,
          items: LeaveType.values
              .map((t) => DropdownMenuItem(value: t, child: Text(t.label)))
              .toList(),
          onChanged: (value) {
            if (value != null) leaveType.value = value;
          },
        ),
        const SizedBox(height: AppSpacing.lg),
        _DateField(
          label: '開始日',
          value: startDate.value,
          dateFormat: dateFormat,
          onTap: () => pickDate(
            current: startDate.value,
            onPicked: (d) => startDate.value = d,
          ),
        ),
        if (leaveType.value == LeaveType.paidLeave) ...[
          const SizedBox(height: AppSpacing.lg),
          _DateField(
            label: '終了日',
            value: endDate.value,
            dateFormat: dateFormat,
            onTap: () => pickDate(
              current: endDate.value,
              onPicked: (d) => endDate.value = d,
            ),
          ),
        ],
        const SizedBox(height: AppSpacing.lg),
        Text(
          '日数: ${leaveType.value.days}日',
          style: AppTextStyles.body2.copyWith(fontWeight: FontWeight.w600),
        ),
      ];
    }

    List<Widget> buildOvertimeFields() {
      return [
        _DateField(
          label: '日付',
          value: overtimeDate.value,
          dateFormat: dateFormat,
          onTap: () => pickDate(
            current: overtimeDate.value,
            onPicked: (d) => overtimeDate.value = d,
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        Text(
          '予定時間（時間）',
          style: AppTextStyles.body2.copyWith(
            color: AppColors.textSecondary(context),
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        TextFormField(
          controller: estimatedHoursController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(hintText: '例: 2'),
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return '予定時間を入力してください';
            }
            if (int.tryParse(value) == null) {
              return '数値を入力してください';
            }
            return null;
          },
        ),
        const SizedBox(height: AppSpacing.lg),
        Text(
          '作業内容',
          style: AppTextStyles.body2.copyWith(
            color: AppColors.textSecondary(context),
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        TextFormField(
          controller: taskDescriptionController,
          maxLines: 2,
          decoration: const InputDecoration(hintText: '作業内容を入力してください'),
        ),
      ];
    }

    List<Widget> buildBusinessTripFields() {
      return [
        Text(
          '行先',
          style: AppTextStyles.body2.copyWith(
            color: AppColors.textSecondary(context),
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        TextFormField(
          controller: destinationController,
          decoration: const InputDecoration(hintText: '例: 大阪本社'),
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return '行先を入力してください';
            }
            return null;
          },
        ),
        const SizedBox(height: AppSpacing.lg),
        _DateField(
          label: '開始日',
          value: startDate.value,
          dateFormat: dateFormat,
          onTap: () => pickDate(
            current: startDate.value,
            onPicked: (d) => startDate.value = d,
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        _DateField(
          label: '終了日',
          value: endDate.value,
          dateFormat: dateFormat,
          onTap: () => pickDate(
            current: endDate.value,
            onPicked: (d) => endDate.value = d,
          ),
        ),
        const SizedBox(height: AppSpacing.lg),
        Text(
          '目的',
          style: AppTextStyles.body2.copyWith(
            color: AppColors.textSecondary(context),
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        TextFormField(
          controller: purposeController,
          maxLines: 2,
          decoration: const InputDecoration(hintText: '出張の目的を入力してください'),
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return '目的を入力してください';
            }
            return null;
          },
        ),
      ];
    }

    List<Widget> buildExpenseFields() {
      return [
        Text(
          'カテゴリ',
          style: AppTextStyles.body2.copyWith(
            color: AppColors.textSecondary(context),
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        DropdownButtonFormField<String>(
          initialValue: expenseCategory.value,
          items: [
            '交通費',
            '宿泊費',
            'その他',
          ].map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
          onChanged: (value) {
            if (value != null) expenseCategory.value = value;
          },
        ),
        const SizedBox(height: AppSpacing.lg),
        Text(
          '金額（円）',
          style: AppTextStyles.body2.copyWith(
            color: AppColors.textSecondary(context),
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        TextFormField(
          controller: amountController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(hintText: '例: 5000'),
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return '金額を入力してください';
            }
            if (int.tryParse(value) == null) {
              return '数値を入力してください';
            }
            return null;
          },
        ),
        const SizedBox(height: AppSpacing.lg),
        Text(
          '説明',
          style: AppTextStyles.body2.copyWith(
            color: AppColors.textSecondary(context),
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        TextFormField(
          controller: descriptionController,
          maxLines: 2,
          decoration: const InputDecoration(hintText: '経費の詳細を入力してください'),
        ),
      ];
    }

    List<Widget> buildTypeFields() {
      switch (type) {
        case WorkflowRequestType.paidLeave:
          return buildPaidLeaveFields();
        case WorkflowRequestType.overtime:
          return buildOvertimeFields();
        case WorkflowRequestType.businessTrip:
          return buildBusinessTripFields();
        case WorkflowRequestType.expense:
          return buildExpenseFields();
      }
    }

    return CommonScaffold(
      appBar: AppBar(title: Text(type.label, style: AppTextStyles.headline)),
      body: Form(
        key: formKey,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
          children: [
            ...buildTypeFields(),
            const SizedBox(height: AppSpacing.xl),
            Text(
              '申請理由',
              style: AppTextStyles.body2.copyWith(
                color: AppColors.textSecondary(context),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            TextFormField(
              controller: reasonController,
              maxLines: 3,
              decoration: const InputDecoration(hintText: '理由を入力してください'),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return '理由を入力してください';
                }
                return null;
              },
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(
            AppSpacing.screenHorizontal,
            AppSpacing.sm,
            AppSpacing.screenHorizontal,
            AppSpacing.md,
          ),
          child: CommonButton(
            onPressed: submit,
            loading: isSubmitting,
            child: const Text('申請する'),
          ),
        ),
      ),
    );
  }
}

class _DateField extends StatelessWidget {
  const _DateField({
    required this.label,
    required this.value,
    required this.dateFormat,
    required this.onTap,
  });

  final String label;
  final DateTime? value;
  final DateFormat dateFormat;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTextStyles.body2.copyWith(
            color: AppColors.textSecondary(context),
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        GestureDetector(
          onTap: onTap,
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(
              horizontal: AppSpacing.md,
              vertical: AppSpacing.md,
            ),
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.border(context)),
              borderRadius: BorderRadius.circular(AppSpacing.inputRadius),
            ),
            child: Text(
              value != null ? dateFormat.format(value!) : '日付を選択',
              style: AppTextStyles.body1.copyWith(
                color: value != null
                    ? AppColors.textPrimary(context)
                    : AppColors.textTertiary(context),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
