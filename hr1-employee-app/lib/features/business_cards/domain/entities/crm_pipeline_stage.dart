/// CRM パイプラインのステージ定義
///
/// crm_pipelines / crm_pipeline_stages テーブルから取得し、
/// crm_deals.stage_id (FK) で参照される。
class CrmPipelineStage {
  const CrmPipelineStage({
    required this.id,
    required this.pipelineId,
    required this.name,
    required this.color,
    required this.probabilityDefault,
    required this.sortOrder,
  });

  final String id;
  final String pipelineId;
  final String name;
  final String color;
  final int probabilityDefault;
  final int sortOrder;

  factory CrmPipelineStage.fromJson(Map<String, dynamic> json) {
    return CrmPipelineStage(
      id: json['id'] as String,
      pipelineId: json['pipeline_id'] as String,
      name: json['name'] as String,
      color: (json['color'] as String?) ?? '#3b82f6',
      probabilityDefault: (json['probability_default'] as int?) ?? 0,
      sortOrder: (json['sort_order'] as int?) ?? 0,
    );
  }
}
