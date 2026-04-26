import 'package:hr1_employee_app/features/workflow/domain/entities/workflow_request.dart';

/// AI 応答メッセージに添付されるカード。
///
/// Widget 側は同名衝突を避けるため `〜CardView` サフィックスで定義する
/// （データ = `〜CardData`、UI = `〜CardView`）。
sealed class AiCardData {
  const AiCardData();
}

/// 残業時間サマリカード。
class OvertimeSummaryCardData extends AiCardData {
  const OvertimeSummaryCardData({
    required this.weeklyHours,
    required this.monthlyLimitHours,
    required this.monthlyAccumulatedHours,
    required this.previousWeekDeltaHours,
    required this.dailyBreakdown,
  });

  final double weeklyHours;
  final double monthlyLimitHours;
  final double monthlyAccumulatedHours;
  final double previousWeekDeltaHours;
  final List<DailyOvertimeEntry> dailyBreakdown;

  double get monthlyRemainingHours =>
      monthlyLimitHours - monthlyAccumulatedHours;
}

class DailyOvertimeEntry {
  const DailyOvertimeEntry({
    required this.dayLabel,
    required this.hours,
    this.isToday = false,
  });

  final String dayLabel;
  final double hours;
  final bool isToday;
}

/// 取引先情報カード。
class ClientInfoCardData extends AiCardData {
  const ClientInfoCardData({
    required this.companyName,
    required this.industry,
    required this.contactName,
    required this.dealStage,
    required this.dealAmountYen,
    required this.dealConfidencePercent,
    required this.dealCloseDate,
    required this.documents,
  });

  final String companyName;
  final String industry;
  final String contactName;
  final String dealStage;
  final int dealAmountYen;
  final int dealConfidencePercent;
  final DateTime dealCloseDate;
  final List<ClientDocument> documents;
}

class ClientDocument {
  const ClientDocument({
    required this.fileName,
    required this.fileSizeLabel,
    required this.authorName,
    required this.uploadedAt,
    this.isNew = false,
  });

  final String fileName;
  final String fileSizeLabel;
  final String authorName;
  final DateTime uploadedAt;
  final bool isNew;
}

/// ワークフロー提案カード（有給申請等）。
class WorkflowSuggestionCardData extends AiCardData {
  const WorkflowSuggestionCardData({
    required this.workflowType,
    required this.balanceDays,
    required this.steps,
    required this.approverName,
    this.notes,
  });

  final WorkflowRequestType workflowType;

  /// 残日数（有給休暇の場合のみ意味を持つ）。
  final double balanceDays;

  /// 「申請の流れ」番号付きステップ。
  final List<String> steps;

  /// 自動送信される承認者名。
  final String approverName;

  /// 注意書き（オレンジ背景で表示）。
  final String? notes;
}
