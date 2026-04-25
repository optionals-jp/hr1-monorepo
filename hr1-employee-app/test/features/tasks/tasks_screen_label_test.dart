import 'package:flutter_test/flutter_test.dart';
import 'package:hr1_employee_app/features/tasks/domain/entities/task_item.dart';
import 'package:hr1_employee_app/features/tasks/presentation/widgets/task_assignee_chip_label.dart';

const _alice = TaskUser(
  id: 'u-alice',
  name: 'Alice',
  avatar: 'A',
  argb: 0xFF0F6CBD,
);
const _bob = TaskUser(id: 'u-bob', name: 'Bob', avatar: 'B', argb: 0xFF6B46C1);
const _carol = TaskUser(
  id: 'u-carol',
  name: 'Carol',
  avatar: 'C',
  argb: 0xFFB10E1C,
);

void main() {
  group('taskAssigneeChipLabel', () {
    test('empty set returns 「全員」', () {
      expect(taskAssigneeChipLabel(const {}, const []), '全員');
    });

    test('single user returns that name', () {
      expect(taskAssigneeChipLabel({_bob.id}, const [_alice, _bob]), 'Bob');
    });

    test('two users: first inserted + 「他1名」', () {
      final assignees = <String>{_bob.id, _alice.id};
      expect(taskAssigneeChipLabel(assignees, const [_alice, _bob]), 'Bob 他1名');
    });

    test('three users: first inserted + 「他2名」', () {
      final assignees = <String>{_carol.id, _alice.id, _bob.id};
      expect(
        taskAssigneeChipLabel(assignees, const [_alice, _bob, _carol]),
        'Carol 他2名',
      );
    });

    test('candidates not yet loaded: fallback by count', () {
      expect(
        taskAssigneeChipLabel({'u-unknown1', 'u-unknown2'}, const []),
        '2名選択中',
      );
    });
  });
}
