import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/features/employees/domain/entities/employee_contact.dart';
import 'package:hr1_employee_app/features/employees/presentation/providers/employee_providers.dart';

/// 組織内の全社員を取得するプロバイダー
final employeeListProvider = FutureProvider.autoDispose<List<EmployeeContact>>((
  ref,
) async {
  final repo = ref.watch(employeeRepositoryProvider);
  return repo.getEmployees();
});

/// 部署一覧を取得するプロバイダー
final departmentListProvider = FutureProvider.autoDispose<List<String>>((
  ref,
) async {
  final repo = ref.watch(employeeRepositoryProvider);
  return repo.getDepartments();
});

/// 役職一覧を取得するプロバイダー
final positionListProvider = FutureProvider.autoDispose<List<String>>((
  ref,
) async {
  final repo = ref.watch(employeeRepositoryProvider);
  return repo.getPositions();
});
