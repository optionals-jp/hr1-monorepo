import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/features/workflow/domain/entities/workflow_request.dart';
import 'package:hr1_employee_app/features/workflow/presentation/providers/workflow_providers.dart';
import 'package:intl/intl.dart';

final _dateFormat = DateFormat('yyyy-MM-dd');

/// ワークフロー申請コントローラー
class WorkflowController extends AutoDisposeNotifier<bool> {
  @override
  bool build() => false; // isSubmitting

  Map<String, dynamic> _buildRequestData({
    required WorkflowRequestType type,
    LeaveType? leaveType,
    DateTime? startDate,
    DateTime? endDate,
    DateTime? overtimeDate,
    String? estimatedHours,
    String? taskDescription,
    String? destination,
    String? purpose,
    String? expenseCategory,
    String? amount,
    String? description,
  }) {
    switch (type) {
      case WorkflowRequestType.paidLeave:
        final lt = leaveType ?? LeaveType.paidLeave;
        return {
          'leave_type': lt.dbValue,
          'start_date': startDate != null ? _dateFormat.format(startDate) : '',
          if (lt == LeaveType.paidLeave)
            'end_date': endDate != null ? _dateFormat.format(endDate) : '',
          'days': lt.days,
        };
      case WorkflowRequestType.overtime:
        return {
          'date': overtimeDate != null ? _dateFormat.format(overtimeDate) : '',
          'estimated_hours': int.tryParse(estimatedHours ?? '') ?? 0,
          'task_description': taskDescription ?? '',
        };
      case WorkflowRequestType.businessTrip:
        return {
          'destination': destination ?? '',
          'start_date': startDate != null ? _dateFormat.format(startDate) : '',
          'end_date': endDate != null ? _dateFormat.format(endDate) : '',
          'purpose': purpose ?? '',
        };
      case WorkflowRequestType.expense:
        return {
          'category': expenseCategory ?? '',
          'amount': int.tryParse(amount ?? '') ?? 0,
          'description': description ?? '',
        };
    }
  }

  Future<bool> submit({
    required WorkflowRequestType type,
    required String reason,
    LeaveType? leaveType,
    DateTime? startDate,
    DateTime? endDate,
    DateTime? overtimeDate,
    String? estimatedHours,
    String? taskDescription,
    String? destination,
    String? purpose,
    String? expenseCategory,
    String? amount,
    String? description,
  }) async {
    state = true;
    try {
      final requestData = _buildRequestData(
        type: type,
        leaveType: leaveType,
        startDate: startDate,
        endDate: endDate,
        overtimeDate: overtimeDate,
        estimatedHours: estimatedHours,
        taskDescription: taskDescription,
        destination: destination,
        purpose: purpose,
        expenseCategory: expenseCategory,
        amount: amount,
        description: description,
      );
      final repo = ref.read(workflowRepositoryProvider);
      await repo.createRequest(
        type: type,
        requestData: requestData,
        reason: reason,
      );
      ref.invalidate(workflowRequestsProvider);
      return true;
    } catch (_) {
      return false;
    } finally {
      state = false;
    }
  }

  /// 申請を取消
  Future<bool> cancel(String id) async {
    state = true;
    try {
      final repo = ref.read(workflowRepositoryProvider);
      await repo.cancelRequest(id);
      ref.invalidate(workflowRequestsProvider);
      return true;
    } catch (_) {
      return false;
    } finally {
      state = false;
    }
  }
}

final workflowControllerProvider =
    AutoDisposeNotifierProvider<WorkflowController, bool>(
      WorkflowController.new,
    );
