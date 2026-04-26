import 'package:flutter/material.dart';
import 'package:hr1_shared/hr1_shared.dart';
import 'package:intl/intl.dart';

import '../../domain/entities/ai_card.dart';

/// 取引先情報カード Widget。
///
/// 全体を薄いグレーのインナーカード（残業サマリと同じトークン）に統合し、
/// 上段の企業ヘッダ部だけステータス由来の淡いグラデーションを敷く。
class ClientInfoCardView extends StatelessWidget {
  const ClientInfoCardView({super.key, required this.data});

  final ClientInfoCardData data;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _CompanyStatsCard(data: data),
        if (data.documents.isNotEmpty) ...[
          const SizedBox(height: AppSpacing.md),
          Text(
            '関連資料 (${data.documents.length})',
            style: AppTextStyles.label1.copyWith(
              color: AppColors.textSecondary(context),
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: AppSpacing.xs),
          for (final doc in data.documents)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: _DocumentRow(document: doc),
            ),
        ],
      ],
    );
  }
}

/// 企業ヘッダ + 商談サマリを一体化したカード。
class _CompanyStatsCard extends StatelessWidget {
  const _CompanyStatsCard({required this.data});

  final ClientInfoCardData data;

  @override
  Widget build(BuildContext context) {
    final tone = _StageTone.fromStage(data.dealStage);
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surfaceTertiary(context),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border(context), width: 0.5),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _CompanyHeader(data: data, tone: tone),
          Container(height: 1, color: AppColors.divider(context)),
          _DealStats(data: data),
        ],
      ),
    );
  }
}

class _CompanyHeader extends StatelessWidget {
  const _CompanyHeader({required this.data, required this.tone});

  final ClientInfoCardData data;
  final _StageTone tone;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [tone.gradientTint(context), Colors.transparent],
        ),
      ),
      child: Row(
        children: [
          OrgIcon(initial: data.companyName.characters.first, size: 40),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  data.companyName,
                  style: AppTextStyles.body1.copyWith(
                    color: AppColors.textPrimary(context),
                    fontWeight: FontWeight.w700,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  '${data.industry}・担当: ${data.contactName}',
                  style: AppTextStyles.footnote.copyWith(
                    color: AppColors.textSecondary(context),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          _StageChip(stage: data.dealStage, tone: tone),
        ],
      ),
    );
  }
}

class _StageChip extends StatelessWidget {
  const _StageChip({required this.stage, required this.tone});

  final String stage;
  final _StageTone tone;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: tone.chipColor,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        stage,
        style: AppTextStyles.caption1.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _DealStats extends StatelessWidget {
  const _DealStats({required this.data});

  final ClientInfoCardData data;

  @override
  Widget build(BuildContext context) {
    final yenFmt = NumberFormat.decimalPattern('ja_JP');
    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.md,
      ),
      child: Row(
        children: [
          Expanded(
            child: _Stat(
              label: '商談額',
              value: '¥${_formatYen(data.dealAmountYen, yenFmt)}',
            ),
          ),
          Expanded(
            child: _Stat(label: '確度', value: '${data.dealConfidencePercent}%'),
          ),
          Expanded(
            child: _Stat(
              label: 'クローズ予定',
              value: DateFormat('M/d').format(data.dealCloseDate),
            ),
          ),
        ],
      ),
    );
  }

  /// 1,000,000 単位を「M」表記で短縮（例: ¥18,400,000 → ¥18.4M）。
  String _formatYen(int yen, NumberFormat fmt) {
    if (yen >= 1000000) {
      final m = yen / 1000000;
      return '${m.toStringAsFixed(m == m.roundToDouble() ? 0 : 1)}M';
    }
    return fmt.format(yen);
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: AppTextStyles.footnote.copyWith(
            color: AppColors.textSecondary(context),
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: AppTextStyles.body1.copyWith(
            color: AppColors.textPrimary(context),
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

/// 商談ステージに応じた配色トークン。
class _StageTone {
  const _StageTone._({required this.chipColor});

  final Color chipColor;

  /// グレー背景に重ねる用の、薄めたステータス色。
  /// チップ色をそのまま敷くと主張が強すぎるため `surfaceTertiary` に滲ませる。
  Color gradientTint(BuildContext context) =>
      AppColors.tintOnSurfaceTertiary(context, chipColor);

  factory _StageTone.fromStage(String stage) {
    if (stage.contains('受注') || stage.contains('成約')) {
      return const _StageTone._(chipColor: AppColors.success);
    }
    if (stage.contains('失注')) {
      return const _StageTone._(chipColor: AppColors.error);
    }
    // 提案中・商談中・検討中などの進行中ステージ。
    return const _StageTone._(chipColor: AppColors.warningFilled);
  }
}

class _DocumentRow extends StatelessWidget {
  const _DocumentRow({required this.document});

  final ClientDocument document;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: AppColors.surfaceTertiary(context),
        borderRadius: AppRadius.radius80,
      ),
      child: Row(
        children: [
          _FileIcon(fileName: document.fileName, isNew: document.isNew),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  document.fileName,
                  style: AppTextStyles.body2.copyWith(
                    color: AppColors.textPrimary(context),
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  '${document.fileSizeLabel}・${document.authorName}・${_relativeDate(document.uploadedAt)}',
                  style: AppTextStyles.caption2.copyWith(
                    color: AppColors.textSecondary(context),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          AppIcons.export(size: 14, color: AppColors.textSecondary(context)),
        ],
      ),
    );
  }

  String _relativeDate(DateTime dt) {
    final now = DateTime.now();
    final diff = now.difference(dt);
    if (diff.inDays == 0) return '昨日 ${DateFormat('HH:mm').format(dt)}';
    if (diff.inDays < 7) return '${diff.inDays}日前';
    return DateFormat('M/d').format(dt);
  }
}

class _FileIcon extends StatelessWidget {
  const _FileIcon({required this.fileName, required this.isNew});

  final String fileName;
  final bool isNew;

  @override
  Widget build(BuildContext context) {
    final ext = fileName.split('.').last.toUpperCase();
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          width: 36,
          height: 44,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: AppColors.error.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(4),
            border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
          ),
          child: Text(
            ext.length > 4 ? ext.substring(0, 4) : ext,
            style: AppTextStyles.caption2.copyWith(
              color: AppColors.error,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        if (isNew)
          Positioned(
            top: -6,
            right: -6,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
              decoration: BoxDecoration(
                color: AppColors.warningFilled,
                borderRadius: BorderRadius.circular(3),
              ),
              child: Text(
                'NEW',
                style: AppTextStyles.caption2.copyWith(
                  color: Colors.white,
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
      ],
    );
  }
}
