import '../../domain/entities/interview.dart';
import '../../domain/entities/interview_slot.dart';
import '../../domain/repositories/interviews_repository.dart';

/// InterviewsRepository のモック実装
class MockInterviewsRepository implements InterviewsRepository {
  @override
  Future<Interview?> getInterview(String interviewId) async {
    return _mockInterviews.where((i) => i.id == interviewId).firstOrNull;
  }
}

// --- モックデータ ---

final _mockInterviews = [
  Interview(
    id: 'interview-001',
    applicationId: 'app-002',
    status: InterviewStatus.scheduling,
    location: 'オンライン（Google Meet）',
    notes: '面接は約45分を予定しています。\n技術的な質問とカルチャーフィットの確認を行います。',
    slots: [
      InterviewSlot(
        id: 'slot-001',
        startAt: DateTime(2026, 3, 15, 10, 0),
        endAt: DateTime(2026, 3, 15, 11, 0),
      ),
      InterviewSlot(
        id: 'slot-002',
        startAt: DateTime(2026, 3, 16, 14, 0),
        endAt: DateTime(2026, 3, 16, 15, 0),
      ),
      InterviewSlot(
        id: 'slot-003',
        startAt: DateTime(2026, 3, 18, 10, 0),
        endAt: DateTime(2026, 3, 18, 11, 0),
      ),
      InterviewSlot(
        id: 'slot-004',
        startAt: DateTime(2026, 3, 19, 16, 0),
        endAt: DateTime(2026, 3, 19, 17, 0),
      ),
    ],
  ),
];
