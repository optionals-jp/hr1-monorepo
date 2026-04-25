import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hr1_employee_app/features/portal/presentation/screens/widgets/home_announcements.dart';
import 'package:hr1_employee_app/features/portal/presentation/screens/widgets/home_bulletin_board.dart';
import 'package:hr1_employee_app/features/portal/presentation/screens/widgets/home_hero.dart';
import 'package:hr1_employee_app/features/portal/presentation/screens/widgets/home_quick_actions.dart';
import 'package:hr1_employee_app/features/portal/presentation/screens/widgets/home_suggestions.dart';
import 'package:hr1_employee_app/features/portal/presentation/screens/widgets/home_today_schedule.dart';
import 'package:hr1_employee_app/features/portal/presentation/screens/widgets/home_today_tasks.dart';
import 'package:hr1_shared/hr1_shared.dart';

/// 社内ポータル画面 — ホーム画面の新デザイン。
///
/// ヒーロー部分は単一の `SliverPersistentHeader(pinned: true)` で実装され、
/// expanded 時は挨拶 / AI 入力 / コンパクト勤怠を表示、collapse すると
/// AppBar 高さのコンパクト勤怠バーだけが残る。
///
/// AnimationController はこの画面で所有し、ヒーロー widget へ共有する。
class PortalScreen extends ConsumerStatefulWidget {
  const PortalScreen({super.key});

  @override
  ConsumerState<PortalScreen> createState() => _PortalScreenState();
}

class _PortalScreenState extends ConsumerState<PortalScreen>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  late final AnimationController _gradientController;

  @override
  void initState() {
    super.initState();
    _gradientController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 20),
    )..repeat();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _gradientController.dispose();
    super.dispose();
  }

  /// バックグラウンド時はアニメーションを停止しバッテリー消費を抑える。
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.resumed:
        if (!_gradientController.isAnimating) {
          _gradientController.repeat();
        }
      case AppLifecycleState.paused:
      case AppLifecycleState.inactive:
      case AppLifecycleState.detached:
      case AppLifecycleState.hidden:
        _gradientController.stop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final mediaQuery = MediaQuery.of(context);
    final safeAreaTop = mediaQuery.padding.top;
    final scaler = mediaQuery.textScaler;

    // 密度設定で AppBar 高が変わるため AppBarTheme を優先的に参照、
    // フォールバックで kToolbarHeight。
    final appBarTheme = Theme.of(context).appBarTheme;
    final toolbarHeight = appBarTheme.toolbarHeight ?? kToolbarHeight;

    // collapsed 状態の高さ — AppBar 同等。
    final minExtent = safeAreaTop + toolbarHeight;

    // expanded 状態の高さ — _UpperContent の自然高 + 10px の青背景 reserve。
    //
    // _UpperContent の構造（下部 padding は 0）:
    //   safeAreaTop          — ステータスバー余白
    //   + sm (8)             — 上余白
    //   + 40                 — greeting 行
    //   + md (16)            — gap
    //   + aiCardHeight       — AI card (画面幅で Wrap 行数が変動)
    //   + md (16)            — gap
    //   + 100                — 大時計勤怠 (status row + display 52pt 時計 + 詳細)
    //
    // compact 勤怠は upper の下端領域と重ねて配置するため、maxExtent には
    // compact 高さを加えない（上部領域 + 10px reserve のみ）。
    //
    // AI card の Wrap チップ折り返し行数を画面幅から推定。狭い画面では多めに
    // 取り、estimate が下回って overflow が起きないようにする。
    final screenWidth = mediaQuery.size.width;
    // 4 種チップを最大 5 行まで想定（極端に狭い端末や日本語フォントで
    // chip 幅が大きく出るケースの safety margin）。
    final wrapRows = screenWidth < 340 ? 5 : (screenWidth < 380 ? 4 : 3);
    // AI card: 上下 padding 10*2 + SizedBox 4 + アイコン行 22 + SizedBox 14 +
    // Wrap (各 chip 28 + runSpacing 8)
    final aiCardHeight =
        20 + 4 + 22 + 14 + (wrapRows * 28 + (wrapRows - 1) * 8);
    final upperContent = scaler.scale(
      40 + AppSpacing.md + aiCardHeight + AppSpacing.md + 100,
    );
    final upperNatural = safeAreaTop + AppSpacing.sm + upperContent;
    const blueSpaceReserve = 30.0;
    final maxExtent = upperNatural + blueSpaceReserve;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(
        statusBarColor: Colors.transparent,
      ),
      child: CommonScaffold(
        backgroundColor: AppColors.surface(context),
        body: CustomScrollView(
          slivers: [
            SliverPersistentHeader(
              pinned: true,
              delegate: _HeroDelegate(
                animation: _gradientController,
                safeAreaTop: safeAreaTop,
                maxExtent: maxExtent,
                minExtent: minExtent,
              ),
            ),
            const SliverToBoxAdapter(child: HomeSuggestionsSection()),
            const SliverToBoxAdapter(child: HomeQuickActions()),
            const SliverToBoxAdapter(child: HomeBulletinBoard()),
            const SliverToBoxAdapter(child: HomeTodaySchedule()),
            const SliverToBoxAdapter(child: HomeTodayTasks()),
            const SliverToBoxAdapter(child: HomeAnnouncements()),
            const SliverToBoxAdapter(child: SizedBox(height: AppSpacing.xxl)),
          ],
        ),
      ),
    );
  }
}

/// ヒーロー collapsing header の SliverPersistentHeaderDelegate。
class _HeroDelegate extends SliverPersistentHeaderDelegate {
  _HeroDelegate({
    required this.animation,
    required this.safeAreaTop,
    required double maxExtent,
    required double minExtent,
  }) : _maxExtent = maxExtent,
       _minExtent = minExtent;

  final Animation<double> animation;
  final double safeAreaTop;
  final double _maxExtent;
  final double _minExtent;

  @override
  double get maxExtent => _maxExtent;

  @override
  double get minExtent => _minExtent;

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return HomeHeroContent(
      animation: animation,
      shrinkOffset: shrinkOffset,
      maxExtent: _maxExtent,
      minExtent: _minExtent,
      safeAreaTop: safeAreaTop,
    );
  }

  @override
  bool shouldRebuild(covariant _HeroDelegate oldDelegate) {
    return oldDelegate.animation != animation ||
        oldDelegate.safeAreaTop != safeAreaTop ||
        oldDelegate._maxExtent != _maxExtent ||
        oldDelegate._minExtent != _minExtent;
  }
}
