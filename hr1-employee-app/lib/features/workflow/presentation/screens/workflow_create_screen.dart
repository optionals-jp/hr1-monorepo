import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/core/constants/constants.dart';
import 'package:hr1_employee_app/features/workflow/domain/entities/workflow_request.dart';
import 'package:hr1_employee_app/features/workflow/presentation/controllers/workflow_controller.dart';
import 'package:hr1_employee_app/shared/widgets/widgets.dart';
import 'package:intl/intl.dart';

/// ワークフロー申請作成画面
class WorkflowCreateScreen extends ConsumerStatefulWidget {
  const WorkflowCreateScreen({super.key, required this.type});

  final WorkflowRequestType type;

  @override
  ConsumerState<WorkflowCreateScreen> createState() =>
      _WorkflowCreateScreenState();
}

class _WorkflowCreateScreenState extends ConsumerState<WorkflowCreateScreen> {
  final _formKey = GlobalKey<FormState>();
  final _reasonController = TextEditingController();

  // 有給休暇
  LeaveType _leaveType = LeaveType.paidLeave;
  DateTime? _startDate;
  DateTime? _endDate;

  // 残業
  DateTime? _overtimeDate;
  final _estimatedHoursController = TextEditingController();
  final _taskDescriptionController = TextEditingController();

  // 出張
  final _destinationController = TextEditingController();
  final _purposeController = TextEditingController();

  // 経費
  String _expenseCategory = '交通費';
  final _amountController = TextEditingController();
  final _descriptionController = TextEditingController();

  final _dateFormat = DateFormat('yyyy-MM-dd');

  @override
  void dispose() {
    _reasonController.dispose();
    _estimatedHoursController.dispose();
    _taskDescriptionController.dispose();
    _destinationController.dispose();
    _purposeController.dispose();
    _amountController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _pickDate({
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

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final success = await ref
        .read(workflowControllerProvider.notifier)
        .submit(
          type: widget.type,
          reason: _reasonController.text,
          leaveType: _leaveType,
          startDate: _startDate,
          endDate: _endDate,
          overtimeDate: _overtimeDate,
          estimatedHours: _estimatedHoursController.text,
          taskDescription: _taskDescriptionController.text,
          destination: _destinationController.text,
          purpose: _purposeController.text,
          expenseCategory: _expenseCategory,
          amount: _amountController.text,
          description: _descriptionController.text,
        );

    if (!mounted) return;
    if (success) {
      CommonSnackBar.show(context, '申請を送信しました');
      Navigator.pop(context);
    } else {
      CommonSnackBar.error(context, '申請の送信に失敗しました');
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isSubmitting = ref.watch(workflowControllerProvider);

    return CommonScaffold(
      appBar: AppBar(
        title: Text(widget.type.label, style: AppTextStyles.headline),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.screenHorizontal),
          children: [
            ..._buildTypeFields(theme),
            const SizedBox(height: AppSpacing.xl),
            Text(
              '申請理由',
              style: AppTextStyles.body2.copyWith(
                color: AppColors.textSecondary(theme.brightness),
              ),
            ),
            const SizedBox(height: AppSpacing.sm),
            TextFormField(
              controller: _reasonController,
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
            onPressed: _submit,
            loading: isSubmitting,
            child: const Text('申請する'),
          ),
        ),
      ),
    );
  }

  List<Widget> _buildTypeFields(ThemeData theme) {
    switch (widget.type) {
      case WorkflowRequestType.paidLeave:
        return _buildPaidLeaveFields(theme);
      case WorkflowRequestType.overtime:
        return _buildOvertimeFields(theme);
      case WorkflowRequestType.businessTrip:
        return _buildBusinessTripFields(theme);
      case WorkflowRequestType.expense:
        return _buildExpenseFields(theme);
    }
  }

  List<Widget> _buildPaidLeaveFields(ThemeData theme) {
    return [
      Text(
        '休暇種別',
        style: AppTextStyles.body2.copyWith(
          color: AppColors.textSecondary(theme.brightness),
        ),
      ),
      const SizedBox(height: AppSpacing.sm),
      DropdownButtonFormField<LeaveType>(
        initialValue: _leaveType,
        items: LeaveType.values
            .map((t) => DropdownMenuItem(value: t, child: Text(t.label)))
            .toList(),
        onChanged: (value) {
          if (value != null) setState(() => _leaveType = value);
        },
      ),
      const SizedBox(height: AppSpacing.lg),
      _DateField(
        label: '開始日',
        value: _startDate,
        dateFormat: _dateFormat,
        onTap: () => _pickDate(
          current: _startDate,
          onPicked: (d) => setState(() => _startDate = d),
        ),
      ),
      if (_leaveType == LeaveType.paidLeave) ...[
        const SizedBox(height: AppSpacing.lg),
        _DateField(
          label: '終了日',
          value: _endDate,
          dateFormat: _dateFormat,
          onTap: () => _pickDate(
            current: _endDate,
            onPicked: (d) => setState(() => _endDate = d),
          ),
        ),
      ],
      const SizedBox(height: AppSpacing.lg),
      Text(
        '日数: ${_leaveType.days}日',
        style: AppTextStyles.body2.copyWith(fontWeight: FontWeight.w600),
      ),
    ];
  }

  List<Widget> _buildOvertimeFields(ThemeData theme) {
    return [
      _DateField(
        label: '日付',
        value: _overtimeDate,
        dateFormat: _dateFormat,
        onTap: () => _pickDate(
          current: _overtimeDate,
          onPicked: (d) => setState(() => _overtimeDate = d),
        ),
      ),
      const SizedBox(height: AppSpacing.lg),
      Text(
        '予定時間（時間）',
        style: AppTextStyles.body2.copyWith(
          color: AppColors.textSecondary(theme.brightness),
        ),
      ),
      const SizedBox(height: AppSpacing.sm),
      TextFormField(
        controller: _estimatedHoursController,
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
          color: AppColors.textSecondary(theme.brightness),
        ),
      ),
      const SizedBox(height: AppSpacing.sm),
      TextFormField(
        controller: _taskDescriptionController,
        maxLines: 2,
        decoration: const InputDecoration(hintText: '作業内容を入力してください'),
      ),
    ];
  }

  List<Widget> _buildBusinessTripFields(ThemeData theme) {
    return [
      Text(
        '行先',
        style: AppTextStyles.body2.copyWith(
          color: AppColors.textSecondary(theme.brightness),
        ),
      ),
      const SizedBox(height: AppSpacing.sm),
      TextFormField(
        controller: _destinationController,
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
        value: _startDate,
        dateFormat: _dateFormat,
        onTap: () => _pickDate(
          current: _startDate,
          onPicked: (d) => setState(() => _startDate = d),
        ),
      ),
      const SizedBox(height: AppSpacing.lg),
      _DateField(
        label: '終了日',
        value: _endDate,
        dateFormat: _dateFormat,
        onTap: () => _pickDate(
          current: _endDate,
          onPicked: (d) => setState(() => _endDate = d),
        ),
      ),
      const SizedBox(height: AppSpacing.lg),
      Text(
        '目的',
        style: AppTextStyles.body2.copyWith(
          color: AppColors.textSecondary(theme.brightness),
        ),
      ),
      const SizedBox(height: AppSpacing.sm),
      TextFormField(
        controller: _purposeController,
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

  List<Widget> _buildExpenseFields(ThemeData theme) {
    return [
      Text(
        'カテゴリ',
        style: AppTextStyles.body2.copyWith(
          color: AppColors.textSecondary(theme.brightness),
        ),
      ),
      const SizedBox(height: AppSpacing.sm),
      DropdownButtonFormField<String>(
        initialValue: _expenseCategory,
        items: [
          '交通費',
          '宿泊費',
          'その他',
        ].map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
        onChanged: (value) {
          if (value != null) setState(() => _expenseCategory = value);
        },
      ),
      const SizedBox(height: AppSpacing.lg),
      Text(
        '金額（円）',
        style: AppTextStyles.body2.copyWith(
          color: AppColors.textSecondary(theme.brightness),
        ),
      ),
      const SizedBox(height: AppSpacing.sm),
      TextFormField(
        controller: _amountController,
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
          color: AppColors.textSecondary(theme.brightness),
        ),
      ),
      const SizedBox(height: AppSpacing.sm),
      TextFormField(
        controller: _descriptionController,
        maxLines: 2,
        decoration: const InputDecoration(hintText: '経費の詳細を入力してください'),
      ),
    ];
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
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTextStyles.body2.copyWith(
            color: AppColors.textSecondary(theme.brightness),
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
              border: Border.all(color: AppColors.border(theme.brightness)),
              borderRadius: BorderRadius.circular(AppSpacing.inputRadius),
            ),
            child: Text(
              value != null ? dateFormat.format(value!) : '日付を選択',
              style: AppTextStyles.body1.copyWith(
                color: value != null
                    ? theme.colorScheme.onSurface
                    : AppColors.textTertiary(theme.brightness),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
