import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/features/business_cards/domain/entities/bc_activity.dart';
import 'package:hr1_employee_app/features/business_cards/presentation/providers/business_card_providers.dart';

/// 活動（メモ・電話・メール・アポ等）登録コントローラー。
///
/// Repository 呼び出しと、関連先（contact / company / deal）に紐づく
/// 一覧 Provider の invalidate をここに集約する。
final activityControllerProvider =
    AutoDisposeNotifierProvider<ActivityController, void>(
      ActivityController.new,
    );

class ActivityController extends AutoDisposeNotifier<void> {
  @override
  void build() {}

  Future<void> createActivity({
    required ActivityType type,
    required String title,
    String? description,
    DateTime? activityDate,
    String? companyId,
    String? contactId,
    String? dealId,
  }) async {
    final repo = ref.read(bcRepositoryProvider);
    await repo.createActivity({
      'activity_type': type.name,
      'title': title.trim(),
      'description': (description == null || description.trim().isEmpty)
          ? null
          : description.trim(),
      'activity_date': activityDate?.toIso8601String(),
      'company_id': companyId,
      'contact_id': contactId,
      'deal_id': dealId,
    });

    if (contactId != null) {
      ref.invalidate(bcActivitiesByContactProvider(contactId));
    }
    if (companyId != null) {
      ref.invalidate(bcActivitiesByCompanyProvider(companyId));
    }
    if (dealId != null) {
      ref.invalidate(bcActivitiesByDealProvider(dealId));
    }
  }
}
