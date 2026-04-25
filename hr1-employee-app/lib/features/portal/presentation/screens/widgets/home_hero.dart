import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:hr1_employee_app/core/router/app_router.dart';
import 'package:hr1_employee_app/features/attendance/domain/entities/attendance_record.dart';
import 'package:hr1_employee_app/features/attendance/presentation/controllers/attendance_controller.dart';
import 'package:hr1_employee_app/features/attendance/presentation/providers/attendance_providers.dart';
import 'package:hr1_employee_app/features/auth/presentation/providers/auth_providers.dart';
import 'package:hr1_employee_app/features/notifications/presentation/providers/notification_providers.dart';
import 'package:hr1_employee_app/features/portal/presentation/screens/widgets/home_clock_provider.dart';
import 'package:hr1_shared/hr1_shared.dart';
import 'package:intl/intl.dart';

// ─── ヒーロー背景: メッシュ風グラデのパレット ───────────────────────

/// ベース層の 2 色（左上: 中明度ロイヤルブルー → 右下: 暗ネイビー）。
const _heroBaseTop = Color(0xFF2A4FB0);
const _heroBaseBottom = Color(0xFF152C6E);

/// 各 blob の色（明・中・深・アクセント）。すべて青基調。
const _heroBlobLight = Color(0xFF6F8BE5);
const _heroBlobMid = Color(0xFF4F6FD0);
const _heroBlobDeep = Color(0xFF1F3F8C);
const _heroBlobAccent = Color(0xFF4F9FD0);

const _heroChipBg = Color(0x33FFFFFF);
const _heroChipBorder = Color(0x4DFFFFFF);
const _heroAiCardBg = Color(0x26FFFFFF);

/// 白ボタン上のテキスト色として使うヒーロー領域のブランドカラー（深いブルー）。
const _heroIndigo = Color(0xFF1A3FA0);

/// 漂う色 blob 1 つ分の定数パラメータ。
class _HeroBlob {
  const _HeroBlob({
    required this.color,
    required this.speedX,
    required this.speedY,
    required this.phaseX,
    required this.phaseY,
    required this.amplitudeX,
    required this.amplitudeY,
    required this.radius,
    required this.alpha,
  });

  final Color color;
  final double speedX;
  final double speedY;
  final double phaseX;
  final double phaseY;
  final double amplitudeX;
  final double amplitudeY;
  final double radius;
  final double alpha;
}

const _heroBlobs = <_HeroBlob>[
  _HeroBlob(
    color: _heroBlobLight,
    speedX: 1.0,
    speedY: 0.7,
    phaseX: 0.0,
    phaseY: 1.047,
    amplitudeX: 0.6,
    amplitudeY: 0.5,
    radius: 0.85,
    alpha: 0.5,
  ),
  _HeroBlob(
    color: _heroBlobMid,
    speedX: 0.8,
    speedY: 1.3,
    phaseX: 1.571,
    phaseY: 0.3,
    amplitudeX: 0.55,
    amplitudeY: 0.5,
    radius: 0.9,
    alpha: 0.5,
  ),
  _HeroBlob(
    color: _heroBlobDeep,
    speedX: 1.3,
    speedY: 0.9,
    phaseX: 2.618,
    phaseY: 3.142,
    amplitudeX: 0.7,
    amplitudeY: 0.5,
    radius: 0.85,
    alpha: 0.4,
  ),
  _HeroBlob(
    color: _heroBlobAccent,
    speedX: 0.6,
    speedY: 1.1,
    phaseX: 3.142,
    phaseY: 0.785,
    amplitudeX: 0.5,
    amplitudeY: 0.55,
    radius: 0.95,
    alpha: 0.5,
  ),
];

/// アンビエントなメッシュ風青グラデを描画する layer。
class _HeroBackground extends StatelessWidget {
  const _HeroBackground({required this.animation});

  final Animation<double> animation;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: animation,
      builder: (context, _) {
        final theta = animation.value * 2 * math.pi;
        return RepaintBoundary(
          child: Stack(
            fit: StackFit.expand,
            children: [
              const Positioned.fill(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [_heroBaseTop, _heroBaseBottom],
                    ),
                  ),
                ),
              ),
              for (final blob in _heroBlobs)
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: RadialGradient(
                        center: Alignment(
                          math.sin(theta * blob.speedX + blob.phaseX) *
                              blob.amplitudeX,
                          math.cos(theta * blob.speedY + blob.phaseY) *
                              blob.amplitudeY,
                        ),
                        radius: blob.radius,
                        colors: [
                          blob.color.withValues(alpha: blob.alpha),
                          blob.color.withValues(alpha: blob.alpha * 0.4),
                          blob.color.withValues(alpha: 0.0),
                        ],
                        stops: const [0.0, 0.5, 1.0],
                      ),
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}

/// ホーム画面のヒーロー — 単一の SliverPersistentHeader に格納される collapsing
/// header の中身。
///
/// レイアウト:
/// - 背景: [_HeroBackground] を [maxExtent] サイズで固定描画。境界の色不連続を
///   同一 widget で物理解消
/// - 上部 content: `Positioned(top: -shrinkOffset, height: maxExtent)` で配置。
///   _UpperContent の natural 高さ + 10px reserve に maxExtent を合わせるため、
///   下部の青背景は 10px 程度に抑えられる。挨拶 / AI 入力カード（Wrap チップ）/
///   大時計勤怠ステータスを含む
/// - コンパクト勤怠: `bottom: 0` で sliver 下端に固定。expanded 時は opacity 0
///   で非表示、collapsed に近づくにつれフェードイン。AppBar 高さに収まる
///   1 行レイアウト。expanded 時は upper の下端領域と重なるが、opacity 0 で
///   見えないので問題ない
class HomeHeroContent extends ConsumerWidget {
  const HomeHeroContent({
    super.key,
    required this.animation,
    required this.shrinkOffset,
    required this.maxExtent,
    required this.minExtent,
    required this.safeAreaTop,
  });

  final Animation<double> animation;
  final double shrinkOffset;
  final double maxExtent;
  final double minExtent;
  final double safeAreaTop;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(appUserProvider);
    final displayName = user?.displayName ?? '匠';
    final initial = displayName.substring(0, 1);

    final scrollRange = maxExtent - minExtent;
    final clamped = shrinkOffset.clamp(0.0, scrollRange);
    // 0..1 の進捗。expanded=0、collapsed=1。
    final progress = scrollRange > 0 ? (clamped / scrollRange) : 0.0;

    return ClipRect(
      child: Stack(
        clipBehavior: Clip.hardEdge,
        children: [
          // 背景グラデは maxExtent サイズで描画。sliver が縮んでも背景の blob
          // 位置が圧縮されない。
          Positioned(
            left: 0,
            right: 0,
            top: 0,
            height: maxExtent,
            child: _HeroBackground(animation: animation),
          ),
          // 上部コンテンツ — sliver 全域 (maxExtent) を覆う SizedBox + Padding。
          // shrinkOffset 分だけ上方向へスライド。下部 10px は UpperContent の
          // 自然高と maxExtent の差分が現れる「青の余白」として残る。
          Positioned(
            left: 0,
            right: 0,
            top: -clamped,
            height: maxExtent,
            child: Opacity(
              // 0.5 を超えたあたりで急速に消える（残像で compact と被らない）。
              opacity: (1.0 - progress * 1.6).clamp(0.0, 1.0),
              child: _UpperContent(
                safeAreaTop: safeAreaTop,
                initial: initial,
                displayName: displayName,
              ),
            ),
          ),
          // コンパクト勤怠 — sliver 下端に常時固定。expanded 時は upper の下端
          // 領域と重なるが、opacity 0 で見えない。後半でフェードイン。
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            height: minExtent,
            child: IgnorePointer(
              ignoring: progress < 0.5,
              child: Opacity(
                // 0.4 以降で線形に増える。0.5 前後で大時計とコンパクトが crossfade。
                opacity: ((progress - 0.4) / 0.6).clamp(0.0, 1.0),
                child: _CompactAttendanceBar(safeAreaTop: safeAreaTop),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// expanded 時に表示される上部コンテンツ（挨拶 + AI 入力 + 大時計勤怠）。
class _UpperContent extends StatelessWidget {
  const _UpperContent({
    required this.safeAreaTop,
    required this.initial,
    required this.displayName,
  });

  final double safeAreaTop;
  final String initial;
  final String displayName;

  @override
  Widget build(BuildContext context) {
    return Padding(
      // 下部 padding は意図的に 0 — 大時計の下に余白が入ると expanded ヒーロー
      // の青背景が無駄に広がる。下部の 10px 程度の余白は portal_screen 側の
      // maxExtent で別途確保する。
      padding: EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        safeAreaTop + AppSpacing.sm,
        AppSpacing.screenHorizontal,
        0,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          _GreetingRow(initial: initial, displayName: displayName),
          const SizedBox(height: AppSpacing.md),
          _AiPromptCard(onTap: () => context.push(AppRoutes.search)),
          const SizedBox(height: AppSpacing.md),
          const _ExpandedAttendance(),
        ],
      ),
    );
  }
}

class _GreetingRow extends ConsumerWidget {
  const _GreetingRow({required this.initial, required this.displayName});

  final String initial;
  final String displayName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Row(
      children: [
        UserAvatar(initial: initial, size: 36, color: Colors.white24),
        const SizedBox(width: AppSpacing.sm),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'こんにちは、$displayNameさん',
                style: AppTextStyles.caption1.copyWith(
                  color: Colors.white.withValues(alpha: 0.85),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                '今日はどんなことを？',
                style: AppTextStyles.headline.copyWith(color: Colors.white),
              ),
            ],
          ),
        ),
        IconButton(
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
          icon: Consumer(
            builder: (context, ref, _) {
              final countAsync = ref.watch(unreadNotificationCountProvider);
              final count = countAsync.valueOrNull ?? 0;
              return Stack(
                clipBehavior: Clip.none,
                children: [
                  AppIcons.notification(size: 24, color: Colors.white),
                  if (count > 0)
                    Positioned(
                      right: -4,
                      top: -2,
                      child: Container(
                        width: 10,
                        height: 10,
                        decoration: BoxDecoration(
                          color: AppColors.warning,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 1.5),
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
          onPressed: () => context.push(AppRoutes.notifications),
        ),
        IconButton(
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
          icon: AppIcons.messageText(size: 24, color: Colors.white),
          onPressed: () => context.push(AppRoutes.messages),
        ),
      ],
    );
  }
}

/// AI 入力プロンプトカード。チップは横スクロールで textScaler の影響を受けない。
class _AiPromptCard extends StatelessWidget {
  const _AiPromptCard({required this.onTap});

  final VoidCallback onTap;

  static const _prompts = ['有給を申請', '今週の残業時間は？', '田中さんを探して', '出張規程は？'];

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: _heroAiCardBg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: _heroChipBorder),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 4),
            Row(
              children: [
                AppIcons.star(size: 18, color: Colors.white),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    '申請・検索・依頼を聞いてみる',
                    style: AppTextStyles.body1.copyWith(
                      color: Colors.white.withValues(alpha: 0.9),
                    ),
                  ),
                ),
                AppIcons.send(size: 22, color: Colors.white),
              ],
            ),
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final prompt in _prompts) _PromptChip(label: prompt),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _PromptChip extends StatelessWidget {
  const _PromptChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: _heroChipBg,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: _heroChipBorder),
      ),
      child: Text(
        label,
        style: AppTextStyles.caption1.copyWith(
          color: Colors.white,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}

/// expanded 状態でホーム上部に表示される大時計勤怠ステータス。
/// `display 48pt` の大きな時計と「出勤・休憩」詳細、退勤ボタンを含む。
class _ExpandedAttendance extends ConsumerWidget {
  const _ExpandedAttendance();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final workState = ref.watch(workStateProvider);
    final record = ref.watch(todayRecordProvider).valueOrNull;
    final punchState = ref.watch(attendanceControllerProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            _StatusDot(workState: workState),
            const SizedBox(width: 8),
            Text(
              _expandedStatusLine(workState),
              style: AppTextStyles.caption1.copyWith(color: Colors.white),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // 1Hz の clock 更新は Consumer でこの Text だけ局所化。
                  Consumer(
                    builder: (context, ref, _) {
                      final clockAsync = ref.watch(homeClockProvider);
                      final now = clockAsync.valueOrNull ?? DateTime.now();
                      return Text(
                        DateFormat('HH:mm:ss').format(now),
                        style: AppTextStyles.display.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _expandedDetailLine(record, workState),
                    style: AppTextStyles.caption1.copyWith(
                      color: Colors.white.withValues(alpha: 0.8),
                    ),
                  ),
                ],
              ),
            ),
            _AttendanceActionButton(
              workState: workState,
              loading: punchState.isLoading,
              onPunch: (action) =>
                  ref.read(attendanceControllerProvider.notifier).punch(action),
              compact: false,
            ),
          ],
        ),
      ],
    );
  }

  String _expandedStatusLine(WorkState state) {
    switch (state) {
      case WorkState.notStarted:
        return '未出勤・本日の打刻はまだありません';
      case WorkState.working:
        return '勤務中・オフィス（本社）';
      case WorkState.onBreak:
        return '休憩中・オフィス（本社）';
      case WorkState.finished:
        return 'お疲れ様でした・退勤済み';
    }
  }

  String _expandedDetailLine(AttendanceRecord? record, WorkState state) {
    if (record == null) {
      final now = DateTime.now();
      final weekday = ['月', '火', '水', '木', '金', '土', '日'][now.weekday - 1];
      return '${now.month}月${now.day}日（$weekday）';
    }
    final clockIn = record.clockIn != null
        ? DateFormat('HH:mm').format(record.clockIn!.toLocal())
        : '--:--';
    if (state == WorkState.finished && record.clockOut != null) {
      final clockOut = DateFormat('HH:mm').format(record.clockOut!.toLocal());
      return '出勤 $clockIn・退勤 $clockOut';
    }
    return '出勤 $clockIn・休憩 ${record.breakMinutes}分';
  }
}

/// AppBar 高さに収まるコンパクト勤怠バー。
/// `[UserAvatar] ............. [● 勤務中] [09:14:32] [退勤]` の 1 行構成。
/// 左端はユーザーアバター、右側に勤務状態・時計・退勤ボタンを並べる。
class _CompactAttendanceBar extends ConsumerWidget {
  const _CompactAttendanceBar({required this.safeAreaTop});

  final double safeAreaTop;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(appUserProvider);
    final userInitial = (user?.displayName ?? user?.email ?? 'U').substring(
      0,
      1,
    );
    final workState = ref.watch(workStateProvider);
    final punchState = ref.watch(attendanceControllerProvider);

    return Padding(
      padding: EdgeInsets.fromLTRB(
        AppSpacing.screenHorizontal,
        safeAreaTop,
        AppSpacing.screenHorizontal,
        0,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // 左: ユーザーアバター + チャットアイコン
          UserAvatar(initial: userInitial, size: 32, imageUrl: user?.avatarUrl),
          const SizedBox(width: 4),
          IconButton(
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 40, minHeight: 40),
            icon: AppIcons.messageText(size: 22, color: Colors.white),
            onPressed: () => context.push(AppRoutes.messages),
          ),
          const Spacer(),
          // 右: 勤務状態 + 時計 + ボタン
          _StatusDot(workState: workState),
          const SizedBox(width: 6),
          Text(
            _stateLabel(workState),
            style: AppTextStyles.label1.copyWith(color: Colors.white),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(width: 8),
          // 1Hz の clock 更新は Consumer でこの Text だけ局所化。
          // 時計は AppBar 内でも視認性を保つため title2 (22pt) を使用。
          Consumer(
            builder: (context, ref, _) {
              final clockAsync = ref.watch(homeClockProvider);
              final now = clockAsync.valueOrNull ?? DateTime.now();
              return Text(
                DateFormat('HH:mm:ss').format(now),
                style: AppTextStyles.title1.copyWith(
                  color: Colors.white,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              );
            },
          ),
          const SizedBox(width: AppSpacing.sm),
          _AttendanceActionButton(
            workState: workState,
            loading: punchState.isLoading,
            onPunch: (action) =>
                ref.read(attendanceControllerProvider.notifier).punch(action),
            compact: true,
          ),
        ],
      ),
    );
  }

  String _stateLabel(WorkState state) {
    switch (state) {
      case WorkState.notStarted:
        return '未出勤';
      case WorkState.working:
        return '勤務中';
      case WorkState.onBreak:
        return '休憩中';
      case WorkState.finished:
        return '退勤済み';
    }
  }
}

class _StatusDot extends StatelessWidget {
  const _StatusDot({required this.workState});

  final WorkState workState;

  @override
  Widget build(BuildContext context) {
    final color = switch (workState) {
      WorkState.working => AppColors.success,
      WorkState.onBreak => AppColors.warning,
      WorkState.finished => Colors.white54,
      WorkState.notStarted => Colors.white54,
    };
    return Container(
      width: 8,
      height: 8,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
    );
  }
}

class _AttendanceActionButton extends StatelessWidget {
  const _AttendanceActionButton({
    required this.workState,
    required this.loading,
    required this.onPunch,
    required this.compact,
  });

  final WorkState workState;
  final bool loading;
  final void Function(String action) onPunch;

  /// `true` で compact (高 32) AppBar 用、`false` で expanded (高 40) 大時計用。
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final (label, action, fg) = switch (workState) {
      WorkState.notStarted => ('出勤', 'clock_in', _heroIndigo),
      WorkState.working => ('退勤', 'clock_out', _heroIndigo),
      WorkState.onBreak => ('休憩終了', 'break_end', _heroIndigo),
      WorkState.finished => ('完了', '', AppColors.textTertiary(context)),
    };

    final disabled = workState == WorkState.finished;
    final height = compact ? 32.0 : 40.0;
    final minWidth = compact ? 64.0 : 80.0;
    final hPadding = compact ? 14.0 : 18.0;

    return SizedBox(
      height: height,
      child: CommonButton(
        onPressed: disabled || loading ? null : () => onPunch(action),
        loading: loading,
        enabled: !disabled,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.white,
          foregroundColor: fg,
          disabledBackgroundColor: Colors.white.withValues(alpha: 0.4),
          disabledForegroundColor: Colors.white.withValues(alpha: 0.6),
          minimumSize: Size(minWidth, height),
          padding: EdgeInsets.symmetric(horizontal: hPadding),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(compact ? 8 : 10),
          ),
          textStyle: compact
              ? AppTextStyles.caption1.copyWith(fontWeight: FontWeight.w700)
              : AppTextStyles.label1,
        ),
        child: Text(label),
      ),
    );
  }
}
