import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:hr1_employee_app/features/tasks/presentation/screens/task_detail_screen.dart';
import 'package:hr1_employee_app/features/tasks/presentation/screens/tasks_screen.dart';

Widget _host(Widget child) => ProviderScope(
  child: MaterialApp(home: Scaffold(body: child)),
);

void _usePhoneViewport(WidgetTester tester) {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(390, 844);
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

void main() {
  testWidgets('31 TasksScreen renders without layout exceptions', (
    tester,
  ) async {
    _usePhoneViewport(tester);
    await tester.pumpWidget(_host(const TasksScreen()));
    await tester.pump();
    expect(tester.takeException(), isNull);
    expect(find.text('タスク'), findsOneWidget);
  });

  testWidgets('32 TaskDetailScreen (biz) renders without layout exceptions', (
    tester,
  ) async {
    _usePhoneViewport(tester);
    await tester.pumpWidget(_host(const TaskDetailScreen(taskId: '#101')));
    await tester.pump();
    expect(tester.takeException(), isNull);
  });

  testWidgets('32 TaskDetailScreen (dev Story #202) renders', (tester) async {
    _usePhoneViewport(tester);
    await tester.pumpWidget(_host(const TaskDetailScreen(taskId: '#202')));
    await tester.pump();
    expect(tester.takeException(), isNull);
  });

  testWidgets('32 TaskDetailScreen (dev Bug #208 with repro) renders', (
    tester,
  ) async {
    _usePhoneViewport(tester);
    await tester.pumpWidget(_host(const TaskDetailScreen(taskId: '#208')));
    await tester.pump();
    expect(tester.takeException(), isNull);
  });
}
